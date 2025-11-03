import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import DailyFigures from './pages/DailyFigures';
import Wages from './pages/Wages';
import FixedCosts from './pages/FixedCosts';
import VAT from './pages/VAT';
import Sundries from './pages/Sundries';
import './App.css';

function ProtectedApp() {
  const [selectedYear, setSelectedYear] = useState('2024-25');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>P&L Dashboard</h1>
          <div className="header-controls">
            <div className="year-selector">
              <label>Financial Year: </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="2024-25">2024/25</option>
              </select>
            </div>
            <div className="user-menu">
              <span className="user-email">{currentUser?.email}</span>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <Link to="/" className="nav-link">Dashboard</Link>
        <Link to="/daily" className="nav-link">Daily Figures</Link>
        <Link to="/wages" className="nav-link">Wages</Link>
        <Link to="/fixed" className="nav-link">Fixed Costs</Link>
        <Link to="/vat" className="nav-link">VAT</Link>
        <Link to="/sundries" className="nav-link">Sundries</Link>
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard year={selectedYear} />} />
          <Route path="/daily" element={<DailyFigures year={selectedYear} />} />
          <Route path="/wages" element={<Wages year={selectedYear} />} />
          <Route path="/fixed" element={<FixedCosts year={selectedYear} />} />
          <Route path="/vat" element={<VAT year={selectedYear} />} />
          <Route path="/sundries" element={<Sundries year={selectedYear} />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>VAT No: GB 434001941</p>
        <p>Financial Year: 1st October - 30th September</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <ProtectedApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
