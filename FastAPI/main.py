from fastapi import FastAPI, WebSocket, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials, db, initialize_app
from bleak import BleakClient, BleakScanner
from collections import Counter
import logging
import json
from datetime import datetime, timezone, timedelta
import asyncio
import uuid


app = FastAPI()

# Allow CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin SDK with credentials
cred = credentials.Certificate("/Users/sophianickerson/Downloads/mango.json")
initialize_app(cred, {'databaseURL': 'https://mango-ced7f-default-rtdb.firebaseio.com/'})

# Timezone for Brasília
brasilia_timezone = timezone(timedelta(hours=-3))

# Logger for debugging
logger = logging.getLogger("uvicorn.error")

# Pydantic models
class Patient(BaseModel):
    nome: str
    idade: int
    sexo: str

class SensorData(BaseModel):
    session_id: str
    flex_measurement: float
    emg_measurement: float
    time_of_reading: str

# Utility functions
def create_session_id():
    return str(uuid.uuid4())

def sanitize_path(session_id: str) -> str:
    """Replace invalid characters in session ID for Firebase paths."""
    return session_id.replace(":", "_").replace(".", "_").replace("-", "_")

def parse_sensor_data(data):
    """Parse received sensor data to extract flex and EMG values."""
    try:
        parts = data.split('|')
        flex_part = parts[0].split(':')[1].strip().split()[0]
        emg_part = parts[1].split(':')[1].strip().split()[0]
        flex_value = float(flex_part)
        emg_value = float(emg_part)
        return flex_value, emg_value
    except (IndexError, ValueError):
        print("Error parsing sensor data")
        return None, None

# WebSocket endpoint
@app.websocket("/ws/{id}")
async def websocket_endpoint(websocket: WebSocket, id: str):
    await websocket.accept()
    print(f"WebSocket connected for patient ID: {id}")

    esp32_name = "Mango"
    characteristic_uuid = "ABCD1234-5678-90AB-CDEF-1234567890AB"

    session_id = sanitize_path(create_session_id())  # Generate session ID per WebSocket connection
    print(f"Session ID: {session_id}")

    try:
        print("Scanning for ESP32...")
        devices = await BleakScanner.discover()
        esp32_device = next((d for d in devices if d.name == esp32_name), None)

        if not esp32_device:
            print(f"Device '{esp32_name}' not found.")
            await websocket.close()
            return

        print(f"Found ESP32: {esp32_device.name} [{esp32_device.address}]")

        async with BleakClient(esp32_device.address) as client:
            if not client.is_connected:
                print("Failed to connect to ESP32.")
                await websocket.close()
                return

            print("Connected to ESP32. Starting data reception.")

            while True:
                try:
                    sensor_data = await client.read_gatt_char(characteristic_uuid)
                    sensor_data = sensor_data.decode("utf-8").strip()

                    if sensor_data:
                        print(f"Received: {sensor_data}")
                        flex_value, emg_value = parse_sensor_data(sensor_data)

                        if flex_value is not None and emg_value is not None:
                            save_to_firebase(id, flex_value, emg_value, session_id)
                            await websocket.send_json({"flex": flex_value, "emg": emg_value})
                        else:
                            print("Invalid data format received from ESP32.")
                except Exception as e:
                    print(f"Error during data reception: {e}")
                    break
    except Exception as e:
        print(f"Error in BLE connection: {e}")
    finally:
        print("WebSocket disconnected")
        await websocket.close()

def save_to_firebase(id, flex_value, emg_value, session_id: str):
    """Save sensor data to Firebase using a unique key for each entry."""
    timestamp = datetime.now(brasilia_timezone).strftime('%Y-%m-%d_%H-%M-%S')
    data_entry = {
        "flex_measurement": flex_value,
        "emg_measurement": emg_value,
        "time_of_reading": timestamp.replace("_", ":").replace("-", "/"),
    }

    # Append data using push()
    ref = db.reference(f"patients/{id}/sensor_data/{session_id}")
    ref.push(data_entry)  # Push creates a unique key for each entry


# REST API Endpoints
@app.get("/pacientes")
async def get_patients_data():
    try:
        ref = db.reference('patients')
        patients = ref.get()

        if not patients:
            raise HTTPException(status_code=404, detail="No patients found")

        patients_list = [{'id': key, **value} for key, value in patients.items()]
        return patients_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading patient data: {str(e)}")

@app.get("/pacientes/{id}")
async def get_patient_data(id: str):
    try:
        logger.info(f"Fetching data for patient ID: {id}")
        ref = db.reference(f'patients/{id}')
        patient = ref.get()

        if not patient:
            logger.error(f"No data found for patient ID: {id}")
            raise HTTPException(status_code=404, detail="Paciente não encontrado")

        logger.info(f"Data retrieved for patient ID: {id}: {patient}")
        return patient
    except Exception as e:
        logger.error(f"Error fetching patient data for ID {id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar dados do paciente: {str(e)}")

@app.post("/pacientes")
async def create_patient(patient: Patient):
    try:
        ref = db.reference('patients')
        new_patient_ref = ref.push({
            "nome": patient.nome,
            "idade": patient.idade,
            "sexo": patient.sexo,
        })
        return {"message": "Patient created successfully!", "patient": patient.dict(), "id": new_patient_ref.key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating patient: {str(e)}")

@app.delete("/pacientes/{id}")
async def delete_patient(id: str):
    """
    Delete a patient and all associated data from Firebase by ID.
    """
    try:
        logger.info(f"Deleting patient with ID: {id}")

        # Referência ao paciente no Firebase
        ref = db.reference(f'patients/{id}')
        patient_data = ref.get()

        # Verifica se o paciente existe antes de tentar deletar
        if not patient_data:
            logger.error(f"Patient with ID {id} not found")
            raise HTTPException(status_code=404, detail="Paciente não encontrado")

        # Exclui o nó do paciente
        ref.delete()
        logger.info(f"Patient with ID {id} deleted successfully")
        return {"message": f"Paciente com ID {id} foi deletado com sucesso"}
    except Exception as e:
        logger.error(f"Error deleting patient with ID {id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar paciente: {str(e)}")


@app.post("/save-sensor-data/{id}")
async def save_sensor_data(id: str, data: SensorData, session_id):
    try:
        ref = db.reference(f"patients/{id}/sensor_data/{session_id}")
        ref.push({
            "flex_measurement": data.flex_measurement,
            "emg_measurement": data.emg_measurement,
            "time_of_reading": data.time_of_reading
        })
        return {"message": "Data saved successfully"}
    except Exception as e:
        logger.error(f"Error saving data: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving data: {str(e)}")
    
@app.get("/pacientes/{id}/historico")
async def get_historico(id: str):
    """
    Fetch the historical session data for a given patient.
    """
    try:
        logger.info(f"Fetching historical data for patient ID: {id}")
        
        # Access the patient's sessions in the database
        ref = db.reference(f"patients/{id}/sensor_data")
        session_data = ref.get()

        if not session_data:
            logger.error(f"No session data found for patient ID: {id}")
            raise HTTPException(status_code=404, detail="Nenhum dado de sessão encontrado")

        # Log the structure of the retrieved data
        logger.info(f"Retrieved session data for patient {id}: {session_data}")

        # Process each session to calculate max values
        historico = []
        for session_id, readings in session_data.items():
            logger.info(f"Processing session: {session_id} with readings: {readings}")
            
            if isinstance(readings, dict):
                flex_values = [reading.get("flex_measurement", 0) for reading in readings.values() if isinstance(reading, dict)]
                emg_values = [reading.get("emg_measurement", 0) for reading in readings.values() if isinstance(reading, dict)]

                historico.append({
                    "session_id": session_id,
                    "max_flex": max(flex_values, default=0),
                    "max_emg": max(emg_values, default=0),
                })
            else:
                logger.warning(f"Invalid session readings format for session: {session_id}")

        logger.info(f"Prepared historical data: {historico}")
        return historico

    except Exception as e:
        logger.error(f"Error fetching historical data for patient {id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching historical data: {str(e)}")

@app.get("/pacientes/{id}/sensor_data/{session_id}")
async def get_session_details(id: str, session_id: str):
    """
    Fetch details for a specific session of a patient.
    """
    try:
        logger.info(f"Fetching session details for patient ID {id}, session ID {session_id}")
        ref = db.reference(f"patients/{id}/sensor_data/{session_id}")
        session_data = ref.get()

        if not session_data:
            logger.error(f"No data found for session {session_id}")
            raise HTTPException(status_code=404, detail="Sessão não encontrada")

        # Extract metrics
        flex_values = [reading.get("flex_measurement", 0) for reading in session_data.values()]
        emg_values = [reading.get("emg_measurement", 0) for reading in session_data.values()]

        session_date = list(session_data.values())[0]["time_of_reading"].split("T")[0]

        # Calculate metrics
        max_flex = max(flex_values, default=0)
        max_emg = max(emg_values, default=0)
        duration = len(flex_values) * 2  # Assuming 2 seconds per reading, adjust as necessary

        from collections import Counter
        top_flex_values = [item[0] for item in Counter(flex_values).most_common(5)]

        session_details = {
            "max_flex": max_flex,
            "max_emg": max_emg,
            "duration": duration,
            "top_flex_values": top_flex_values,
            "date": session_date,
        }

        logger.info(f"Session details for {session_id}: {session_details}")
        return session_details

    except Exception as e:
        logger.error(f"Error fetching session details for patient {id}, session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar detalhes da sessão: {str(e)}")

@app.post("/pacientes/{id}/sessao/{session_id}")
async def save_session_data(id: str, session_id: str, data: SensorData):
    """
    Save sensor data for a specific session of a given patient.
    """
    try:
        logger.info(f"Saving data for patient ID {id}, session ID {session_id}")
        ref = db.reference(f"patients/{id}/sensor_data/{session_id}")
        ref.push(data.dict())  # Push the data to the session in Firebase
        return {"message": "Data saved successfully"}
    except Exception as e:
        logger.error(f"Error saving data for patient {id}, session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving session data: {str(e)}")


@app.get("/pacientes/{id}/sessao/{session_id}/comentarios")
async def get_comments(id: str, session_id: str):
    try:
        ref = db.reference(f"patients/{id}/sessions/{session_id}/comments")
        comments = ref.get()
        if not comments:
            return []
        return list(comments.values())
    except Exception as e:
        logger.error(f"Error fetching comments for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar comentários.")

@app.post("/pacientes/{id}/sessao/{session_id}/comentarios")
async def add_comment(id: str, session_id: str, comment: dict):
    try:
        ref = db.reference(f"patients/{id}/sessions/{session_id}/comments")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ref.push({
            "comment": comment["comment"],
            "timestamp": timestamp,
        })
        return {"message": "Comentário salvo com sucesso!"}
    except Exception as e:
        logger.error(f"Error saving comment for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao salvar comentário.")

@app.get("/pacientes/{id}/sessao/{session_id}/flex")
async def get_session_flex(id: str, session_id: str):
    try:
        ref = db.reference(f"patients/{id}/sensor_data/{session_id}")
        sensor_data = ref.get()

        if not sensor_data:
            raise HTTPException(status_code=404, detail="Dados de Flex não encontrados")

        # Extraia apenas os valores de Flex
        flex_values = [entry["flex_measurement"] for entry in sensor_data.values() if "flex_measurement" in entry]

        return flex_values
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar dados de Flex: {str(e)}")
    
@app.get("/pacientes/{id}/sessao/{session_id}/emg")
async def get_session_emg(id: str, session_id: str):
    try:
        ref = db.reference(f"patients/{id}/sensor_data/{session_id}")
        sensor_data = ref.get()

        if not sensor_data:
            raise HTTPException(status_code=404, detail="Dados de EMG não encontrados")

        # Extraia apenas os valores de EMG
        emg_values = [entry["emg_measurement"] for entry in sensor_data.values() if "emg_measurement" in entry]

        return emg_values
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar dados de EMG: {str(e)}")

@app.delete("/pacientes/{id}/sessao/{session_id}/comentarios/{timestamp}")
async def delete_comment(id: str, session_id: str, timestamp: str):
    try:
        ref = db.reference(f"patients/{id}/sessions/{session_id}/comments")
        comments = ref.get()
        if not comments:
            raise HTTPException(status_code=404, detail="Comentário não encontrado")

        # Find and remove the comment with the given timestamp
        for key, value in comments.items():
            if value.get("timestamp") == timestamp:
                ref.child(key).delete()
                return {"message": "Comentário deletado com sucesso"}
        
        raise HTTPException(status_code=404, detail="Comentário não encontrado")
    except Exception as e:
        logger.error(f"Erro ao deletar comentário: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar comentário.")

