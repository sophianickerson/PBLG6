import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SignIn.css';

const SignIn = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      // Ensure the request is a POST request
      const response = await axios.post('http://localhost:8000/signin', { username, password });
      if (response.data.token) {
        navigate('/pacientes');  // Redirect to another page on success
      }
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="sign-in-page">
      <form onSubmit={handleSignIn}>
        <h2>Entrar</h2>
        <input
          type="text"
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Entrar</button>
        {error && <p>{error}</p>}
      </form>
    </div>
  );
};

export default SignIn;
