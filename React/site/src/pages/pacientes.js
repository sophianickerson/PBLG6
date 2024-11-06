import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './pacientes.css';

const Pacientes = () => {
  const [patients, setPatients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({
    nome: '',
    idade: '',
    sexo: '',
  });

  // Função para buscar pacientes do backend
  const fetchPatients = async () => {
    try {
      const response = await axios.get('http://localhost:8000/pacientes');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients data', error);
    }
  };

  useEffect(() => {
    fetchPatients(); // Busca pacientes quando o componente é montado
  }, []);

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/pacientes', newPatient);
      
      if (response.status === 200) {
        // Atualiza a lista de pacientes com o novo paciente criado
        setShowModal(false);  // Fecha o modal após a criação do paciente
        setNewPatient({ nome: '', idade: '', sexo: '', photoUrl: '' }); // Redefine o formulário

        // Rebusca todos os pacientes para atualizar a lista
        fetchPatients();
      } else {
        console.error('Failed to create patient:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating new patient:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPatient({
      ...newPatient,
      [name]: value,
    });
  };

  const openDeleteModal = (patient) => {
    setSelectedPatient(patient);
    setShowModal(true);
  };

  const closeDeleteModal = () => {
    setShowModal(false);
    setSelectedPatient(null);
  };

  const handleDeletePatient = async () => {
    try {
      await axios.delete(`http://localhost:8000/pacientes/${selectedPatient.id}`);
      setPatients(patients.filter(patient => patient.id !== selectedPatient.id));
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting patient', error);
    }
  };

  return (
    <div>
      <h2>Pacientes</h2>
      
      <div className="search-and-create">
        <input
          type="text"
          placeholder="Pesquisar..."
          className="search-bar"
          onChange={(e) => {
            // Lógica de busca
          }}
        />
        <button onClick={() => setShowModal(true)} className="create-new-button">
          Adicionar
        </button>
      </div>

      <div className="album">
        {patients.map(patient => (
          <div key={patient.id} className="patient-card">
            <button
              className="delete-button"
              onClick={() => openDeleteModal(patient)}
            >
              &times;
            </button>
            <img src={'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'} alt={patient.nome} className="patient-photo" />
            <h3>{patient.nome}</h3>
            <Link to={`/pacientes/${patient.id}`}>Ver Perfil</Link>
          </div>
        ))}
      </div>

      {/* Modal para criar um novo paciente */}
      {showModal && !selectedPatient && (
        <div className="modal">
          <div className="modal-content">
            <h3>Criar novo perfil</h3>
            <form onSubmit={handleCreatePatient}>
              <label>Nome:</label>
              <input
                type="text"
                name="nome"
                placeholder="Nome"
                value={newPatient.nome}
                onChange={handleInputChange}
                required
              />
              <label>Idade:</label>
              <input
                type="number"
                name="idade"
                placeholder="Idade"
                value={newPatient.idade}
                onChange={handleInputChange}
                required
              />
              <label>Sexo:</label>
              <input
                type="text"
                name="sexo"
                placeholder="Sexo"
                value={newPatient.sexo}
                onChange={handleInputChange}
                required
              />
              <div className="modal-buttons">
                <button type="submit">Criar</button>
                <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showModal && selectedPatient && (
        <div className="modal">
          <div className="modal-content">
            <h3>Confirmar exclusão</h3>
            <p>Tem certeza de que deseja apagar o perfil de {selectedPatient?.nome}?</p>
            <div className="modal-buttons">
              <button onClick={closeDeleteModal}>Cancelar</button>
              <button onClick={handleDeletePatient} className="confirm-delete-button">Apagar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pacientes;
