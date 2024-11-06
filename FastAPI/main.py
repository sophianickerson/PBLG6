from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials, db, initialize_app
import firebase_admin

app = FastAPI()

# Allow CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],  # This allows all HTTP methods
    allow_headers=["*"],
)

# Initialize Firebase Admin SDK with credentials
cred = credentials.Certificate("/Users/sophianickerson/Downloads/mango.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://mango-ced7f-default-rtdb.firebaseio.com/'
})

# Pydantic model for patient data
class Patient(BaseModel):
    nome: str
    idade: int
    sexo: str

# FastAPI endpoint to get the list of patients for the album
@app.get("/pacientes")
async def get_patients_data():
    try:
        # Reference to Firebase database
        ref = db.reference('patients')
        patients = ref.get()

        if not patients:
            raise HTTPException(status_code=404, detail="No patients found")

        patients_list = [{'id': key, **value} for key, value in patients.items()]  # Convert dict to list of patients
        return patients_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading patient data from Firebase: {str(e)}")

# FastAPI endpoint to serve specific patient's data from Firebase based on ID
@app.get("/pacientes/{id}")
async def get_patient_data(id: str):
    try:
        ref = db.reference(f'patients/{id}')
        patient = ref.get()

        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        return patient
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading patient data from Firebase: {str(e)}")

# FastAPI endpoint to serve graph data for a specific patient
@app.get("/pacientes/{id}/data")
async def get_patient_graph_data(id: str):
    try:
        ref = db.reference(f'patients/{id}/ecg_data')
        ecg_data = ref.get()

        if not ecg_data:
            raise HTTPException(status_code=404, detail="ECG data not found")

        # Assuming data includes both time and voltage
        ref_time = db.reference(f'patients/{id}/time')
        time_data = ref_time.get()

        if not time_data:
            raise HTTPException(status_code=404, detail="Time data not found")

        graph_data = [{'Time': t, 'Voltage': v} for t, v in zip(time_data, ecg_data)]
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading ECG data from Firebase: {str(e)}")

# Create a new patient
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

# Mock do banco de dados de usuários
fake_users_db = {
    "user": {
        "username": "user",
        "password": "password",
        "token": "mysecrettoken"
    }
}

class SignInRequest(BaseModel):
    username: str
    password: str

# Endpoint de login
@app.post("/signin")
async def sign_in(request: SignInRequest):
    user = fake_users_db.get(request.username)
    if not user or user["password"] != request.password:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return {"token": user["token"]}

# Endpoint para excluir um paciente
@app.delete("/pacientes/{id}")
async def delete_patient(id: str):
    try:
        ref = db.reference(f'patients/{id}')
        if not ref.get():
            raise HTTPException(status_code=404, detail="Patient not found")
        ref.delete()
        return {"message": "Patient deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting patient: {str(e)}")
    

from typing import List

class EmgData(BaseModel):
    data: List[int]  # Recebe uma lista de valores de EMG

@app.post("/emg")
async def receive_emg_data(data: EmgData):
    try:
        # Processa os dados ou salva em banco de dados
        print(f"Dados de EMG recebidos: {data.data}")
        return {"message": "Dados do EMG recebidos com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar dados do EMG: {str(e)}")

