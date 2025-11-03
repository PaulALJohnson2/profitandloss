import React, { useState, useEffect } from 'react';
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
import YearOnYear from './pages/YearOnYear';
import NewYearModal from './components/NewYearModal';
import { getCurrentFiscalYear, isPastFiscalYearEnd } from './utils/fiscalYearUtils';
import { getAllYears, checkYearExists } from './firebase/firestoreService';
import './App.css';

function ProtectedApp() {
  const [selectedYear, setSelectedYear] = useState('2024-25');
  const [availableYears, setAvailableYears] = useState(['2024-25']);
  const [showNewYearModal, setShowNewYearModal] = useState(false);
  const [isLoadingYears, setIsLoadingYears] = useState(true);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Load available years and check for new year needed
  useEffect(() => {
    const loadYearsAndCheckNewYear = async () => {
      if (!currentUser) return;

      try {
        setIsLoadingYears(true);

        // Get all available years
        const yearsResult = await getAllYears(currentUser.uid);
        if (yearsResult.success && yearsResult.data.length > 0) {
          setAvailableYears(yearsResult.data);

          // Only set the most recent year as selected if selectedYear isn't already in the list
          if (!yearsResult.data.includes(selectedYear)) {
            setSelectedYear(yearsResult.data[0]);
          }

          // Check if we're past the fiscal year end for the most recent year
          const mostRecentYear = yearsResult.data[0];
          if (isPastFiscalYearEnd(mostRecentYear)) {
            // Check if the next fiscal year exists
            const currentFiscalYear = getCurrentFiscalYear();
            const yearExistsResult = await checkYearExists(currentUser.uid, currentFiscalYear);

            if (yearExistsResult.success && !yearExistsResult.exists) {
              // Show modal to create new year
              setShowNewYearModal(true);
            }
          }
        }
      } catch (error) {
        console.error('Error loading years:', error);
      } finally {
        setIsLoadingYears(false);
      }
    };

    loadYearsAndCheckNewYear();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleYearCreated = (newYear) => {
    setAvailableYears(prev => [newYear, ...prev]);
    setSelectedYear(newYear);
    setShowNewYearModal(false);
    // Navigate to daily figures page with form open
    navigate('/daily', { state: { openForm: true } });
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
                disabled={isLoadingYears}
              >
                {availableYears.map(year => {
                  const [startYear, endYear] = year.split('-');
                  return (
                    <option key={year} value={year}>
                      {startYear}/{endYear}
                    </option>
                  );
                })}
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
        <Link to="/year-on-year" className="nav-link">Year-on-Year</Link>
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard year={selectedYear} />} />
          <Route path="/daily" element={<DailyFigures year={selectedYear} />} />
          <Route path="/wages" element={<Wages year={selectedYear} />} />
          <Route path="/fixed" element={<FixedCosts year={selectedYear} />} />
          <Route path="/vat" element={<VAT year={selectedYear} />} />
          <Route path="/sundries" element={<Sundries year={selectedYear} />} />
          <Route path="/year-on-year" element={<YearOnYear year={selectedYear} />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>VAT No: GB 434001941</p>
        <p>Financial Year: 1st October - 30th September</p>
      </footer>

      {showNewYearModal && (
        <NewYearModal
          currentYear={selectedYear}
          userId={currentUser.uid}
          onYearCreated={handleYearCreated}
          onClose={() => setShowNewYearModal(false)}
        />
      )}
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
