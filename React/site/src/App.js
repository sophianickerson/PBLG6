import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignIn from './pages/SignIn';
import Pacientes from './pages/pacientes';
import PacienteData from './pages/pacientedata';
import Historico from './pages/Historico'; // Import the new Historico page
import Relatorio from './pages/Relatorio'; // Import the new Relatorio page
import ProtectedRoute from './pages/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* SignIn page as the default route */}
        <Route path="/" element={<SignIn />} />

        {/* Protected Routes for Pacientes */}
        <Route
          path="/pacientes"
          element={
            <ProtectedRoute>
              <Pacientes />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes for Individual Patient Data */}
        <Route
          path="/pacientes/:id"
          element={
            <ProtectedRoute>
              <PacienteData />
            </ProtectedRoute>
          }
        />

        {/* Protected Route for Patient's Histórico */}
        <Route
          path="/pacientes/:id/historico"
          element={
            <ProtectedRoute>
              <Historico />
            </ProtectedRoute>
          }
        />

        {/* Protected Route for Patient's Relatório */}
        <Route
          path="/pacientes/:id/relatorio"
          element={
            <ProtectedRoute>
              <Relatorio />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
