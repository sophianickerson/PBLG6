import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignIn from './pages/SignIn';
import Pacientes from './pages/pacientes';
import PacienteData from './pages/pacientedata';
import ProtectedRoute from './pages/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* SignIn page as the default route */}
        <Route path="/" element={<SignIn />} />

        {/* Wrap the Protected Routes */}
        <Route
          path="/pacientes"
          element={
            <ProtectedRoute>
              {/* You can wrap routes in a React Fragment instead of a div */}
              <React.Fragment>
                <Pacientes />
              </React.Fragment>
            </ProtectedRoute>
          }
        />

        {/* Dynamic route for individual patient data */}
        <Route
          path="/pacientes/:id"
          element={
            <ProtectedRoute>
              <PacienteData />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
