import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ConfirmEmail from './pages/auth/ConfirmEmail';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth/email" element={<ConfirmEmail />} />
        <Route path="/email" element={<ConfirmEmail />} />
        <Route path="*" element={<ConfirmEmail />} />
      </Routes>
    </Router>
  );
}

export default App;
