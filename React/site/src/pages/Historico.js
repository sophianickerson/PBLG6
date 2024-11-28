import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const Historico = () => {
  const { id } = useParams(); // Capture patient ID from URL
  const navigate = useNavigate(); // Hook for navigation
  const [patientName, setPatientName] = useState(""); // Patient's name
  const [chartDataFlex, setChartDataFlex] = useState(null); // Bar chart data for Flex
  const [chartDataEMG, setChartDataEMG] = useState(null); // Bar chart data for EMG

  // Fetch the patient's name
  useEffect(() => {
    const fetchPatientName = async () => {
      try {
        const response = await fetch(`http://localhost:8000/pacientes/${id}`);
        const data = await response.json();

        if (data && data.nome) {
          setPatientName(data.nome); // Set the patient's name
        } else {
          setPatientName("Nome não encontrado");
        }
      } catch (error) {
        console.error("Error fetching patient name:", error);
        setPatientName("Erro ao buscar nome");
      }
    };

    fetchPatientName();
  }, [id]);

  // Fetch historical data from the backend
  useEffect(() => {
    const fetchHistorico = async () => {
      try {
        const response = await fetch(`http://localhost:8000/pacientes/${id}/historico`);
        const data = await response.json();

        if (response.ok) {
          // Prepare data for Flex chart
          const sessionIds = data.map((_, index) => `Teste ${index + 1}`);
          const maxFlexValues = data.map((session) => session.max_flex);

          setChartDataFlex({
            labels: sessionIds,
            datasets: [
              {
                label: "Max Flex Measurement",
                data: maxFlexValues,
                backgroundColor: "rgba(75, 192, 192, 0.6)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
              },
            ],
          });

          // Prepare data for EMG chart
          const maxEMGValues = data.map((session) => session.max_emg);

          setChartDataEMG({
            labels: sessionIds,
            datasets: [
              {
                label: "Max EMG Measurement",
                data: maxEMGValues,
                backgroundColor: "rgba(255, 99, 132, 0.6)",
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 1,
              },
            ],
          });
        } else {
          console.error("Failed to fetch historico data:", data.detail);
        }
      } catch (error) {
        console.error("Error fetching historico data:", error);
      }
    };

    fetchHistorico();
  }, [id]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Session IDs",
        },
      },
      y: {
        title: {
          display: true,
          text: "Maximum Measurement",
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ padding: "20px", position: "relative" }}>
      {/* Back Button */}
      <div style={{ position: "absolute", top: "40px", left: "20px" }}>
        <button
          onClick={() => navigate(-1)} // Go back to the previous page
          style={{
            backgroundColor: "#ADD8E6",
            color: "black",
            border: "none",
            padding: "10px 20px",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Voltar
        </button>
      </div>

      {/* Title */}
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>
        Histórico - {patientName}
      </h1>

      {/* Bar Chart for Max Flex Measurement */}
      <div style={{ marginBottom: "40px" }}>
        <h2>Máximo Flex Sensor por Sessão</h2>
        {chartDataFlex ? (
          <Bar data={chartDataFlex} options={chartOptions} />
        ) : (
          <p>Carregando gráfico de Flex...</p>
        )}
      </div>

      {/* Bar Chart for Max EMG Measurement */}
      <div style={{ marginBottom: "40px" }}>
        <h2>Máximo EMG por Sessão</h2>
        {chartDataEMG ? (
          <Bar data={chartDataEMG} options={chartOptions} />
        ) : (
          <p>Carregando gráfico de EMG...</p>
        )}
      </div>
    </div>
  );
};

export default Historico;
