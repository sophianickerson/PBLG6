import React, { useEffect, useState, useRef } from "react";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import confetti from "canvas-confetti";
import { useParams } from "react-router-dom";
import { RadialGauge } from "canvas-gauges"; // Importando o velocímetro
import Burger from "./Burger";
import Menu from "./Menu";
import "./menu.css";
import "./pacientedata.css";

Chart.register(...registerables);

const DashboardGame = () => {
  const { id } = useParams(); // Captura o ID do paciente da URL
  const [isGameActive, setIsGameActive] = useState(false);
  const [webSocket, setWebSocket] = useState(null); // WebSocket para comunicação
  const [forceData, setForceData] = useState([]); // Dados do gráfico de extensão
  const [emgData, setEmgData] = useState([]); // Dados do gráfico de EMG
  const [timeStamps, setTimeStamps] = useState([]); // Eixo X (tempo)
  const [session_id, setSessionId] = useState(null); // ID da sessão atual no Firebase
  const [menuOpen, setMenuOpen] = useState(false); // Controle do menu lateral
  const [patientName, setPatientName] = useState(""); // Nome do paciente

  const canvasRef = useRef(null);
  const gaugeRef = useRef(null); // Referência ao velocímetro

  const larguraTela = window.innerWidth / 2; // Metade direita da tela
  const alturaTela = 750; // Altura fixa do canvas
  const objetoPosY = useRef(alturaTela); // Posição inicial do foguete
  const objetoTamanho = 200;

  const normalizeValue = (value) => {
    return alturaTela - (alturaTela * ((value - 0.2) / (1.0 - 0.5))); // Normaliza valores de 0.5V a 1.0V
  };

  useEffect(() => {
    if (!isGameActive || !id || !session_id) return;

    const socket = new WebSocket(`ws://localhost:8000/ws/${id}`);
    setWebSocket(socket);

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      const { flex, emg } = data;
  
      const time = new Date().toISOString();
  
      const dataToSave = {
          flex_measurement: flex,
          emg_measurement: emg,
          time_of_reading: time,
      };
  
      try {
          await saveDataToFirebase(id, session_id, dataToSave); // Use await for saving data
      } catch (error) {
          console.error("Error saving data:", error);
      }
  
      // Update the graph data and rocket position
      setForceData((prev) => [...prev.slice(-50), flex]);
      setEmgData((prev) => [...prev.slice(-50), emg]);
      setTimeStamps((prev) => [...prev.slice(-50), time]);
  
      if (gaugeRef.current) {
          gaugeRef.current.value = flex;
      }
  
      const targetY = normalizeValue(flex);
      objetoPosY.current += (targetY - objetoPosY.current) * 0.1; // Smooth movement of the rocket
  };  

    socket.onclose = () => console.log("WebSocket closed");

    return () => {
      socket.close();
    };
  }, [isGameActive, id, session_id]);

  const saveDataToFirebase = async (id, session_id, data) => {
    try {
      const response = await fetch(`http://localhost:8000/save-sensor-data/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              session_id,
              ...data,
          }),
      });

      if (!response.ok) {
          throw new Error("Failed to save data");
      }

      console.log("Data saved successfully!");
  } catch (error) {
      console.error("Error saving data to backend:", error);
  }
    fetch(
      `https://mango-ced7f-default-rtdb.firebaseio.com/patients/${id}/sensor_data/${session_id}.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    )
      .then((response) => {
        if (response.ok) {
          console.log("Data saved successfully!");
        } else {
          console.error("Error saving data.");
        }
      })
      .catch((error) => {
        console.error("Error saving data to Firebase:", error);
      });
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 350,
      spread: 100,
      origin: { x: 0.75, y: 0.5 },
      resize: true,
      useWorker: true,
    });
  };

  useEffect(() => {
    const fetchPatientName = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/pacientes/${id}`
        );
        const data = await response.json();

        if (data && data.nome) {
          setPatientName(data.nome); // Set the patient's name
        } else {
          setPatientName("Nome não encontrado"); // Fallback if "nome" is not found
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        setPatientName("Erro ao buscar nome");
      }
    };

    fetchPatientName();
  }, [id]);

  useEffect(() => {
    if (!isGameActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const fundo = new Image();
    fundo.src = "/imagens/fundo.jpg";

    const objeto = new Image();
    objeto.src = "/imagens/objeto.png";

    const fantasma = new Image();
    fantasma.src = '/imagens/fantasma.png'

    const atualizarTela = () => {
      ctx.clearRect(0, 0, larguraTela, alturaTela);

      if (fundo.complete) {
        ctx.drawImage(fundo, 0, 0, larguraTela, alturaTela);
      }

      // Draw the rocket at the updated position
      if (objeto.complete) {
        ctx.drawImage(
          objeto,
          larguraTela / 2 - objetoTamanho / 2,
          objetoPosY.current,
          objetoTamanho,
          objetoTamanho
        );
      }

      if (isGameActive) {
        requestAnimationFrame(atualizarTela);
      }
    };

    fundo.onload = () => {
      objeto.onload = atualizarTela;
    };

    return () => {
      ctx.clearRect(0, 0, larguraTela, alturaTela);
    };
  }, [isGameActive, larguraTela]);

  useEffect(() => {
    // Configura o velocímetro ao montar o componente
    gaugeRef.current = new RadialGauge({
      renderTo: "gaugeCanvas",
      width: 150,
      height: 150,
      units: "Voltage (V)",
      minValue: 0.5,
      maxValue: 0.75,
      majorTicks: ["0.5", "0.6", "0.7", "0.8", "0.9", "1.0"],
      minorTicks: 5,
      strokeTicks: true,
      colorPlate: "#fff",
      needleType: "arrow",
      needleWidth: 2,
      animationDuration: 50,
    }).draw();
  }, []);

  const handleStartGame = () => {
    if (!session_id) {
      const newSessionId = new Date().toISOString().replace(/:/g, "-"); // Generate a unique session ID
      setSessionId(newSessionId); // Save the sessionId in state
    }
    setIsGameActive(true); // Start the game
  };
  
  const handleEndGame = () => {
    setIsGameActive(false);
    if (webSocket) {
      webSocket.close();
      console.log("WebSocket connection closed.");
    }
    triggerConfetti(); // Trigger confetti when game stops
  };

  return (
    <div id="outer-container">
      {/* Menu Component with open state controlled by Burger */}
      <Menu
        open={menuOpen}
        setOpen={setMenuOpen}
        pageWrapId={"page-wrap"}
        outerContainerId={"outer-container"}
      />

      <main id="page-wrap" style={{ padding: "10px" }}>
        <header
          style={{
            backgroundColor: "#ADD8E6",
            color: "black",
            padding: "12px",
            fontSize: "20px",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Dashboard - {patientName}
        </header>

        <div style={{ marginRight: "10px" }}>
          {/* Burger Menu Button */}
          <div style={{ zIndex: 10 }}>
            <Burger open={menuOpen} setOpen={setMenuOpen} />
          </div>
        </div>

        <div style={{ display: "flex", height: "100vh" }}>
          {/* Gráficos */}
          <div style={{ width: "50%", padding: "10px" }}>
            <h3>Dados de Flexão</h3>
            <Line
              data={{
                labels: timeStamps,
                datasets: [
                  {
                    label: "Flex Sensor Data",
                    data: forceData.map ((voltage) => 400 * voltage -100),
                    borderColor: "rgba(75,192,192,1)",
                    backgroundColor: "rgba(75,192,192,0.2)",
                    borderWidth: 2,
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                scales: {
                  x: { title: { display: true, text: "Tempo (s)" } },
                  y: { title: { display: true, text: "Amplitude (°)" } },
                },
              }}
            />
            <h3>Dados de EMG</h3>
            <Line
              data={{
                labels: timeStamps,
                datasets: [
                  {
                    label: "EMG Data",
                    data: emgData,
                    borderColor: "rgba(255,99,132,1)",
                    backgroundColor: "rgba(255,99,132,0.2)",
                    borderWidth: 2,
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                scales: {
                  x: { title: { display: true, text: "Tempo (s)" } },
                  y: { title: { display: true, text: "Voltagem (V)" } },
                },
              }}
            />
          </div>

          {/* Jogo */}
          <div style={{ width: "50%", position: "relative" }}>
            {/* Botões */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
              }}
            >
              <button
                onClick={handleStartGame}
                disabled={isGameActive}
                style={{ marginRight: "10px" }}
              >
                Start 
              </button>
              <button onClick={handleEndGame} disabled={!isGameActive}>
                End 
              </button>
            </div>

            {/* Canvas do Jogo */}
            <canvas
              ref={canvasRef}
              width={larguraTela}
              height={alturaTela}
              style={{
                display: "block",
                border: "1px solid black",
                margin: "0 auto",
              }}
            ></canvas>

            <div
              style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
              }}
            >
              <canvas id="gaugeCanvas"></canvas>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardGame;