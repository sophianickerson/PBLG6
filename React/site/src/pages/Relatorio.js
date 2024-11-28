import React, { useEffect, useState, useRef } from 'react';
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const Relatorio = () => {
  const { id } = useParams(); // Capture patient ID from URL
  const [patientName, setPatientName] = useState(""); // Patient's name
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]); // List of sessions
  const [selectedSession, setSelectedSession] = useState(null); // Selected session
  const [comments, setComments] = useState([]); // Therapist's comments
  const [newComment, setNewComment] = useState("");
  const [sessionMetrics, setSessionMetrics] = useState(null); // Session metrics
  const [loading, setLoading] = useState(false);
  const [flexData, setFlexData] = useState([]);
  const [emgData, setEmgData] = useState([]);
  const flexChartRef = useRef(null); // Ref for Flex chart
  const emgChartRef = useRef(null); // Ref for EMG chart

  // Fetch patient name
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
        console.error("Error fetching patient data:", error);
        setPatientName("Erro ao buscar nome");
      }
    };

    fetchPatientName();
  }, [id]);

  // Fetch all sessions for the patient
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch(`http://localhost:8000/pacientes/${id}/historico`);
        const data = await response.json();
        setSessions(data);
      } catch (error) {
        console.error("Erro ao buscar sessões:", error);
      }
    };

    fetchSessions();
  }, [id]);

  const fetchSessionDetails = async (session_id) => {
    try {
      setLoading(true);
  
      // Busca métricas da sessão
      const responseMetrics = await fetch(
        `http://localhost:8000/pacientes/${id}/sessao/${session_id}`
      );
      const dataMetrics = await responseMetrics.json();
      setSessionMetrics(dataMetrics || {});
  
      // Busca comentários da sessão
      const responseComments = await fetch(
        `http://localhost:8000/pacientes/${id}/sessao/${session_id}/comentarios`
      );
      if (responseComments.ok) {
        const commentsData = await responseComments.json();
        setComments(commentsData || []); // Garante que 'comments' seja uma lista
      } else {
        console.error("Erro ao buscar comentários:", responseComments.statusText);
        setComments([]); // Define como lista vazia em caso de erro
      }

      const responseFlex = await fetch(`http://localhost:8000/pacientes/${id}/sessao/${session_id}/flex`);
      const flexData = await responseFlex.json();
      setFlexData(flexData);

      const responseEmg = await fetch(`http://localhost:8000/pacientes/${id}/sessao/${session_id}/emg`);
      const emgData = await responseEmg.json();
      setEmgData(emgData);
  
      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar detalhes da sessão:", error);
      setLoading(false);
      setComments([]); // Define como lista vazia em caso de falha
    }
  };
  

  // Save a new comment
  const saveComment = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/pacientes/${id}/sessao/${selectedSession.session_id}/comentarios`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: newComment }),
        }
      );
      if (response.ok) {
        setComments((prevComments) => [
          ...prevComments,
          { comment: newComment, timestamp: new Date().toISOString() },
        ]);
        setNewComment("");
      } else {
        alert("Erro ao salvar comentário.");
      }
    } catch (error) {
      console.error("Erro ao salvar comentário:", error);
    }
  };

  const deleteComment = async (timestamp) => {
    try {
      const response = await fetch(
        `http://localhost:8000/pacientes/${id}/sessao/${selectedSession.session_id}/comentarios/${timestamp}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        setComments((prevComments) =>
          prevComments.filter((comment) => comment.timestamp !== timestamp)
        );
      } else {
        alert("Erro ao excluir comentário.");
      }
    } catch (error) {
      console.error("Erro ao excluir comentário:", error);
    }
  };
  

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" },
    },
    scales: {
      x: {
        title: { display: true, text: "Tempo (s)" },
        type: "linear",
        ticks: { autoSkip: false },
      },
      y: {
        title: { display: true, text: "Valor" },
      },
    },
  };

  const generateSessionPDF = () => {
    if (!selectedSession || !sessionMetrics) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório da Sessão", 10, 10);

    doc.setFontSize(14);
    doc.text(`Paciente: ${patientName}`, 10, 20);
    doc.text(`Data da Sessão: ${sessionMetrics.date || "Não especificada"}`, 10, 30);

    doc.text(`Máximo de EMG: ${sessionMetrics.max_emg}`, 10, 40);
    doc.text(`Máximo de Flex: ${sessionMetrics.max_flex}`, 10, 50);
    doc.text(
      `Top 5 Valores de Flex: ${sessionMetrics.top_flex_values?.join(", ") || "N/A"}`,
      10,
      60
    );
    doc.text(`Duração da Sessão: ${sessionMetrics.duration} segundos`, 10, 70);

    doc.setFontSize(12);
    doc.text("Comentários:", 10, 80);
    comments.forEach((comment, index) => {
      doc.text(
        `${index + 1}. ${comment.comment} (${new Date(comment.timestamp).toLocaleString()})`,
        10,
        90 + index * 10
      );
    });

    // Add Flex Chart
    const flexChart = flexChartRef.current;
    if (flexChart) {
      const flexImg = flexChart.toBase64Image();
      doc.addImage(flexImg, "JPEG", 10, 120, 180, 60);
    }

    // Add EMG Chart
    const emgChart = emgChartRef.current;
    if (emgChart) {
      const emgImg = emgChart.toBase64Image();
      doc.addImage(emgImg, "JPEG", 10, 190, 180, 60);
    }

    doc.save(`relatorio_sessao_${selectedSession.session_id}.pdf`);
  };

  const generateAllSessionsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Todas as Sessões", 10, 10);

    doc.setFontSize(14);
    doc.text(`Paciente: ${patientName}`, 10, 20);

    sessions.forEach((session, index) => {
      doc.text(`Sessão ${index + 1}:`, 10, 30 + index * 40);

      if (selectedSession?.session_id === session.session_id && sessionMetrics) {
        doc.text(`Máximo de EMG: ${sessionMetrics.max_emg}`, 10, 50 + index * 40);
        doc.text(`Máximo de Flex: ${sessionMetrics.max_flex}`, 10, 60 + index * 40);
        doc.text(
          `Top 5 Valores de Flex: ${sessionMetrics.top_flex_values?.join(", ") || "N/A"}`,
          10,
          70 + index * 40
        );
        doc.text(`Duração: ${sessionMetrics.duration} segundos`, 10, 80 + index * 40);

        doc.setFontSize(12);
    doc.text("Comentários:", 10, 80);
    comments.forEach((comment, index) => {
      doc.text(
        `${index + 1}. ${comment.comment} (${new Date(comment.timestamp).toLocaleString()})`,
        10,
        90 + index * 10
      );
    });

    // Add Flex Chart
    const flexChart = flexChartRef.current;
    if (flexChart) {
      const flexImg = flexChart.toBase64Image();
      doc.addImage(flexImg, "JPEG", 10, 120, 180, 60);
    }

    // Add EMG Chart
    const emgChart = emgChartRef.current;
    if (emgChart) {
      const emgImg = emgChart.toBase64Image();
      doc.addImage(emgImg, "JPEG", 10, 190, 180, 60);
    }
      }
    });

    doc.save("relatorio_todas_sessoes.pdf");
  };

  return (
    <div style={{ padding: '20px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '40px', left: '20px' }}>
        <button
          onClick={() => navigate(-1)}
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

      <div style={{ padding: "20px" }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
          Relatório - {patientName}
        </h1>

        <div style={{ marginTop: "20px" }}>
          <h3>Sessões:</h3>
          {sessions.length === 0 ? (
            <p>Nenhuma sessão encontrada.</p>
          ) : (
            sessions.map((session, index) => (
              <div
                key={session.session_id}
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  marginBottom: "10px",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSelectedSession(session);
                  fetchSessionDetails(session.session_id);
                }}
              >
                Sessão {index + 1}
              </div>
            ))
          )}
        </div>

        {selectedSession && sessionMetrics && (
          <div style={{ marginTop: "20px" }}>
            <h3>Detalhes da sessão:</h3>
            {loading ? (
              <p>Carregando métricas...</p>
            ) : (
              <>
                <p>Máximo de EMG: {sessionMetrics.max_emg}</p>
                <p>Máximo de Flex: {sessionMetrics.max_flex}</p>
                <p>Top 5 Valores de Flex: {sessionMetrics.top_flex_values?.join(", ")}</p>
                <p>Duração da Sessão: {sessionMetrics.duration} segundos</p>

                <div style={{ height: "300px", overflowX: "auto", marginBottom: "20px" }}>
                  <h4>Gráfico Flex Sensor:</h4>
                  {flexData.length > 0 ? (
                    <Line
                      ref={flexChartRef}
                      data={{
                        labels: flexData.map((_, i) => i),
                        datasets: [
                          {
                            label: "Flex Sensor",
                            data: flexData,
                            borderColor: "rgba(75, 192, 192, 1)",
                            backgroundColor: "rgba(75, 192, 192, 0.2)",
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  ) : (
                    <p>Carregando gráfico de Flex...</p>
                  )}
                </div>

                <div style={{ height: "300px", overflowX: "auto", marginBottom: "20px" }}>
                  <h4>Gráfico EMG Sensor:</h4>
                  {emgData.length > 0 ? (
                    <Line
                      ref={emgChartRef}
                      data={{
                        labels: emgData.map((_, i) => i),
                        datasets: [
                          {
                            label: "EMG Sensor",
                            data: emgData,
                            borderColor: "rgba(255, 99, 132, 1)",
                            backgroundColor: "rgba(255, 99, 132, 0.2)",
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  ) : (
                    <p>Carregando gráfico de EMG...</p>
                  )}
                </div>

                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicione seus comentários..."
                  rows="4"
                  style={{ width: "100%", marginBottom: "10px" }}
                ></textarea>
                <button onClick={saveComment}>Salvar Comentário</button>

                <h4>Comentários:</h4>
                {comments.map((comment, index) => (
                  <div key={index} style={{ 
                    marginBottom: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    }}>
                    <p style={{ margin: 0}}>
                      {comment.comment} -{" "}
                      <span style={{ fontSize: "0.8em", color: "gray" }}>
                        {new Date(comment.timestamp).toLocaleString()}
                      </span>
                    </p>

                    <button
                        onClick={() => deleteComment(comment.timestamp)}
                        style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "black",
                            cursor: "pointer",
                            fontSize: "0.7em",
                        }}
                    >
                        ✖   
                    </button>

                  </div>
                ))}

                <button
                  onClick={generateSessionPDF}
                  style={{
                    marginTop: "10px",
                    padding: "10px 20px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Gerar PDF da Sessão
                </button>
              </>
            )}
          </div>
        )}

        <button
          onClick={generateAllSessionsPDF}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Gerar PDF de Todas as Sessões
        </button>
      </div>
    </div>
  );
};

export default Relatorio;
