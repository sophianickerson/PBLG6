import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './pacientes.css';

const Pacientes = () => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]); // Pacientes filtrados pela pesquisa
  const [searchTerm, setSearchTerm] = useState(""); // Termo de busca
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({
    nome: '',
    idade: '',
    sexo: '',
    CPF: '',
  });
  const [isConsentChecked, setIsConsentChecked] = useState(false); // Estado para o checkbox

  // Função para buscar pacientes do backend
  const fetchPatients = async () => {
    try {
      const response = await axios.get('http://localhost:8000/pacientes');
      setPatients(response.data);
      setFilteredPatients(response.data); // Inicialmente, exibe todos os pacientes
    } catch (error) {
      console.error('Error fetching patients data', error);
    }
  };

  useEffect(() => {
    fetchPatients(); // Busca pacientes quando o componente é montado
  }, []);

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!isConsentChecked) {
      alert("Você deve aceitar o termo de consentimento antes de criar um paciente.");
      return;
    }
    try {
      const response = await axios.post('http://localhost:8000/pacientes', newPatient);
      if (response.status === 200) {
        setShowModal(false); // Fecha o modal após a criação do paciente
        setNewPatient({ nome: '', idade: '', sexo: '', CPF: '' }); // Redefine o formulário
        setIsConsentChecked(false); // Reseta o checkbox
        fetchPatients(); // Rebusca todos os pacientes para atualizar a lista
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

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term === "") {
      setFilteredPatients(patients); // Reseta a lista ao limpar a busca
    } else {
      setFilteredPatients(
        patients.filter((patient) =>
          patient.nome.toLowerCase().includes(term.toLowerCase())
        )
      );
    }
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
      setFilteredPatients(filteredPatients.filter(patient => patient.id !== selectedPatient.id));
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
          value={searchTerm}
          onChange={handleSearchChange} // Atualiza a lógica de busca
        />
        <button onClick={() => setShowModal(true)} className="create-new-button">
          Adicionar
        </button>
      </div>

      <div className="album">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="patient-card">
            <button
              className="delete-button"
              onClick={() => openDeleteModal(patient)}
            >
              &times;
            </button>
            <img
              src={'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'}
              alt={patient.nome}
              className="patient-photo"
            />
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
              <div>
                <input
                  type="checkbox"
                  id="consent"
                  checked={isConsentChecked}
                  onChange={(e) => setIsConsentChecked(e.target.checked)}
                />
                <label htmlFor="consent">Aceito o termo de consentimento</label>
                <div style={{marginTop: "10px"}}>
                  <a
                    href="https://docs.google.com/document/d/1PbrS7raVjbDVq6f7jQyAI2KxRoSNAao3m3h3AWzgnQs/edit?tab=t.0"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "#007bff" }}
                  >
                    Ler o termo de consentimento
                  </a>
                </div>
              </div>
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
