import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import confetti from 'canvas-confetti';

Chart.register(...registerables);

const PacienteData = () => {
  const [emgData, setEmgData] = useState([]);
  const [forceData, setForceData] = useState([]);
  const [blockPosition, setBlockPosition] = useState(300); // Posição inicial do bloco
  const [isGameActive, setIsGameActive] = useState(true); // Controle do estado do jogo

  // Configuração do gráfico de EMG
  const emgChartData = {
    labels: emgData.map((_, index) => index),
    datasets: [
      {
        label: 'EMG Data',
        data: emgData,
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 2,
        fill: false,
      },
    ],
  };

  // Configuração do gráfico de Força
  const forceChartData = {
    labels: forceData.map((_, index) => index),
    datasets: [
      {
        label: 'Force Data',
        data: forceData,
        borderColor: 'rgba(255,99,132,1)',
        backgroundColor: 'rgba(255,99,132,0.2)',
        borderWidth: 2,
        fill: true, // Preenchido embaixo da linha
      },
    ],
  };

  // Opções dos gráficos
  const chartOptions = {
    responsive: true,
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Tempo',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Amplitude do Sinal',
        },
      },
    },
  };

  // Função para simular dados de força aleatórios
  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(() => {
      const randomForceValue = Math.floor(Math.random() * 50); // Valor aleatório entre 0 e 50
      setForceData((prevData) => [...prevData.slice(-50), randomForceValue]);
      updateBlockPosition(randomForceValue); // Atualiza a posição do bloco com o valor aleatório
    }, 500); // Atualiza a cada 500ms

    // Parar o jogo após 30 segundos
    const timeout = setTimeout(() => {
      setIsGameActive(false); // Para o jogo
      clearInterval(interval); // Limpa o intervalo de atualização de dados

      // Ativa os confetes quando o jogo termina
      showConfetti();
    }, 10000); // 30000 ms = 30 segundos

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    }; // Limpa o intervalo e o timeout ao desmontar o componente
  }, [isGameActive]);

  // Função para atualizar a posição do bloco com base no valor de força simulada
  const updateBlockPosition = (forceValue) => {
    setBlockPosition(300 + forceValue * 2); // Ajusta a multiplicação conforme necessário para o efeito desejado
  };

  // Função para exibir confetes e estrelas
  const showConfetti = () => {
    const duration = 3 * 1000; // Duração dos confetes
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  return (
    <div>
      <h2>Dados do Paciente</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        {/* Gráfico de EMG */}
        <div style={{ width: '48%', height: '400px' }}>
          <Line data={emgChartData} options={chartOptions} />
        </div>
        {/* Gráfico de Força */}
        <div style={{ width: '48%', height: '400px' }}>
          <Line data={forceChartData} options={chartOptions} />
        </div>
      </div>
      
      {/* Jogo interativo */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <h3>Jogo Interativo de Progresso</h3>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '50px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${blockPosition}px`,
              width: '50px',
              height: '50px',
              backgroundColor: isGameActive ? '#007bff' : '#ccc', // Mudança de cor quando o jogo para
              transition: 'left 0.1s',
            }}
          ></div>
        </div>
        {!isGameActive && <p>O jogo terminou após 30 segundos.</p>}
      </div>
    </div>
  );
};

export default PacienteData;
