import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Timetable from './Timetable';
import SetupWizard from './SetupWizard';
import { TeachersGrid, RoomsGrid, SubjectsGrid, TAGrid } from './DataEntryGrids';

function Sidebar() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="glass-panel sidebar">
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>NeuroTime AI</h2>
      
      <Link to="/" style={{textDecoration: 'none'}}>
        <div className={`sidebar-item ${path === '/' ? 'active' : ''}`}>Timetable Engine</div>
      </Link>
      <Link to="/teachers" style={{textDecoration: 'none'}}>
        <div className={`sidebar-item ${path === '/teachers' ? 'active' : ''}`}>Teachers</div>
      </Link>
      <Link to="/rooms" style={{textDecoration: 'none'}}>
        <div className={`sidebar-item ${path === '/rooms' ? 'active' : ''}`}>Rooms</div>
      </Link>
      <Link to="/subjects" style={{textDecoration: 'none'}}>
        <div className={`sidebar-item ${path === '/subjects' ? 'active' : ''}`}>Subjects</div>
      </Link>
      <Link to="/tas" style={{textDecoration: 'none'}}>
        <div className={`sidebar-item ${path === '/tas' ? 'active' : ''}`}>Teaching Assistants</div>
      </Link>
      <Link to="/settings" style={{textDecoration: 'none'}}>
        <div className={`sidebar-item ${path === '/settings' ? 'active' : ''}`}>Constraints & Settings</div>
      </Link>
    </div>
  );
}

function DataEntryPlaceholder({ title }) {
  return (
    <div className="glass-panel">
      <h2>{title}</h2>
      <p style={{marginTop: '1rem', color: 'var(--text-muted)'}}>
        Data entry grid for {title.toLowerCase()} will go here.
      </p>
    </div>
  )
}

function UniversityAuthWall({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);
  
  // Replace with your actual college domain e.g., @stanford.edu
  const REQUIRED_DOMAIN = "@college.edu"; 

  const handleLogin = (e) => {
    e.preventDefault();
    if (email.endsWith(REQUIRED_DOMAIN)) {
      // In a real app, this department string would come from JWT or university roles.
      const dept = email.split('@')[0];
      setDepartmentId(dept);
      setIsAuthenticated(true);
      setError('');
    } else {
      setError(`Access Denied! You must use a valid university credential (${REQUIRED_DOMAIN})`);
    }
  };

  if (isAuthenticated && !setupComplete) {
    return <SetupWizard departmentId={departmentId} onComplete={() => setSetupComplete(true)} />;
  }

  if (isAuthenticated && setupComplete) {
    // Clone children to inject departmentId
    return React.cloneElement(children, { departmentId });
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>NeuroTime AI</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Secure University Gateway</p>
        
        {error && <div style={{ color: 'var(--acc-red)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <input 
              type="email" 
              className="input-field" 
              placeholder={`Enter your university email`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

function MainApp({ departmentId }) {
  return (
    <Router>
      <div className="app-container">
        <div className="dashboard-grid">
          <Sidebar />
          
          <main>
            <Routes>
              <Route path="/" element={<Timetable departmentId={departmentId} />} />
              <Route path="/teachers" element={<TeachersGrid departmentId={departmentId} />} />
              <Route path="/rooms" element={<RoomsGrid departmentId={departmentId} />} />
              <Route path="/subjects" element={<SubjectsGrid departmentId={departmentId} />} />
              <Route path="/tas" element={<TAGrid departmentId={departmentId} />} />
              <Route path="/settings" element={<SetupWizard departmentId={departmentId} onComplete={() => alert('Settings Saved!')} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <UniversityAuthWall>
      <MainApp />
    </UniversityAuthWall>
  );
}
