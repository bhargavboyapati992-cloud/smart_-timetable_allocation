import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Timetable from './Timetable';
import SetupWizard from './SetupWizard';
import { TeachersGrid, RoomsGrid, SubjectsGrid, TAGrid } from './DataEntryGrids';
import { getApiUrl } from './config';

// Initialize API URL from localStorage or environment
const INITIAL_API_URL = getApiUrl();

// ── Auth Context ───────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const apiUrl = INITIAL_API_URL;
  const VERSION = "1.1.0"; // Updated version
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('vims_session')); } catch { return null; }
  });

  const login = (data) => {
    sessionStorage.setItem('vims_session', JSON.stringify(data));
    setSession(data);
  };
  const logout = () => {
    sessionStorage.removeItem('vims_session');
    setSession(null);
    fetch(`${apiUrl}/auth/logout`, { method: 'POST', headers: { 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' } }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ session, login, logout, isAuthenticated: !!session, apiUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── VIMS Login Page ────────────────────────────────────────────────────────────
// ── Connection Manager ────────────────────────────────────────────────────────
// ConnectionManager removed as URL is now permanent

// ── Shared link button style ───────────────────────────────────────────────────
const linkBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--primary)', fontSize: '0.8rem', textDecoration: 'underline', padding: 0
};

// ── Forgot Password Panel ─────────────────────────────────────────────────────
function ForgotPasswordPanel({ onBack }) {
  const [username, setUsername]   = useState('');
  const [newPass, setNewPass]     = useState('');
  const [confirm, setConfirm]     = useState('');
  const [msg, setMsg]             = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const { apiUrl } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ username, new_password: newPass, confirm_password: confirm }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Failed'); }
      else { setMsg(data.message); }
    } catch { setError('Server unreachable. Please check your network or update Server URL.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🔑 Reset Password</h3>
      <ConnectionError message={error} onUpdateUrl={() => onBack('connection')} />
      {msg   && <div style={{ color:'#22c55e',       background:'rgba(34,197,94,0.1)',  borderRadius:'8px', padding:'0.6rem 1rem', marginBottom:'0.75rem', fontSize:'0.85rem' }}>✅ {msg}</div>}
      {!msg && (
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          <div className="form-group">
            <label>Your Username</label>
            <input type="text" className="input-field" placeholder="e.g. hod_cse"
              value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" className="input-field" placeholder="Min. 6 characters"
              value={newPass} onChange={e => setNewPass(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" className="input-field" placeholder="Repeat new password"
              value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width:'100%' }}>
            {loading ? '⏳ Saving...' : '🔒 Set New Password'}
          </button>
        </form>
      )}
      <div style={{ textAlign:'center', marginTop:'1rem' }}>
        <button style={linkBtn} onClick={onBack}>← Back to Login</button>
      </div>
    </div>
  );
}

// ── Shared Error Component ───────────────────────────────────────────────────
function ConnectionError({ message }) {
  if (!message) return null;
  const isNetworkError = message.includes('Server unreachable') || message.includes('Cannot reach');
  
  return (
    <div style={{ 
      color:'var(--acc-red)', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
      borderRadius:'8px', padding:'0.75rem 1rem', marginBottom:'1.25rem', fontSize:'0.875rem' 
    }}>
      ⚠️ {message}
      {isNetworkError && (
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
          Tip: Ensure the local backend and Ngrok tunnel are running on the server.
        </p>
      )}
    </div>
  );
}

// ── Change Username Panel ──────────────────────────────────────────────────────
function ChangeUsernamePanel({ onBack }) {
  const [currentUser, setCurrentUser] = useState('');
  const [password, setPassword]       = useState('');
  const [newUser, setNewUser]         = useState('');
  const [msg, setMsg]                 = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  const { apiUrl } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/auth/change-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ current_username: currentUser, password, new_username: newUser }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Failed'); }
      else { setMsg(data.message); }
    } catch { setError('Server unreachable. Please ensure the local backend and Ngrok tunnel are running.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>✏️ Change Username</h3>
      <ConnectionError message={error} onUpdateUrl={() => onBack('connection')} />
      {msg   && <div style={{ color:'#22c55e',       background:'rgba(34,197,94,0.1)',  borderRadius:'8px', padding:'0.6rem 1rem', marginBottom:'0.75rem', fontSize:'0.85rem' }}>✅ {msg}</div>}
      {!msg && (
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          <div className="form-group">
            <label>Current Username</label>
            <input type="text" className="input-field" placeholder="Your existing username"
              value={currentUser} onChange={e => setCurrentUser(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Current Password</label>
            <input type="password" className="input-field" placeholder="Verify with your password"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>New Username</label>
            <input type="text" className="input-field" placeholder="Min. 3 characters"
              value={newUser} onChange={e => setNewUser(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width:'100%' }}>
            {loading ? '⏳ Saving...' : '✏️ Update Username'}
          </button>
        </form>
      )}
      <div style={{ textAlign:'center', marginTop:'1rem' }}>
        <button style={linkBtn} onClick={onBack}>← Back to Login</button>
      </div>
    </div>
  );
}

// ── Sign Up Panel ──────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '27612803804-1d8hv3t802b3j3a9knaoartkp6gnn0e3.apps.googleusercontent.com';

function SignUpPanel({ onSuccess, onSwitchToLogin }) {
  const { login, apiUrl } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername]       = useState('');
  const [deptId, setDeptId]           = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  // Load Google Identity Services script once
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogle();
    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(script); } catch(e) {}
    };
  }, []);

  const initGoogle = () => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      { theme: 'filled_black', size: 'large', width: 360, text: 'signup_with' }
    );
  };

  const handleGoogleCredential = async ({ credential }) => {
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Google sign-in failed'); return; }
      login(data);
    } catch { setError('Server unreachable. Please ensure the local backend and Ngrok tunnel are running.'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          username, password, confirm_password: confirm,
          department_id: deptId, display_name: displayName
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Signup failed'); return; }
      login(data);  // auto-login after signup
    } catch { setError('Server unreachable. Please ensure the local backend and Ngrok tunnel are running.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {/* Google button */}
      {GOOGLE_CLIENT_ID && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div id="google-signin-btn" style={{ width:'100%' }}></div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', margin:'1rem 0', color:'var(--text-muted)', fontSize:'0.75rem' }}>
            <hr style={{ flex:1, borderColor:'var(--border)' }} />or sign up with username<hr style={{ flex:1, borderColor:'var(--border)' }} />
          </div>
        </div>
      )}

      <ConnectionError message={error} onUpdateUrl={() => onSwitchToLogin('connection')} />

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" className="input-field" placeholder="e.g. Prof. Bhargav"
            value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Username <span style={{color:'var(--acc-red)'}}>*</span></label>
          <input type="text" className="input-field" placeholder="Min. 3 characters"
            value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Department ID <span style={{color:'var(--acc-red)'}}>*</span></label>
          <input type="text" className="input-field" placeholder="e.g. cse, ece, mech"
            value={deptId} onChange={e => setDeptId(e.target.value)} required />
        </div>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <div className="form-group" style={{ flex:1, margin:0 }}>
            <label>Password <span style={{color:'var(--acc-red)'}}>*</span></label>
            <input type="password" className="input-field" placeholder="Min. 6 chars"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="form-group" style={{ flex:1, margin:0 }}>
            <label>Confirm</label>
            <input type="password" className="input-field" placeholder="Repeat"
              value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width:'100%', marginTop:'0.25rem' }}>
          {loading ? '⏳ Creating account...' : '🚀 Create Account'}
        </button>
      </form>
    </div>
  );
}

// ── Login Page ─────────────────────────────────────────────────────────────────
function LoginPage() {
  const { login, apiUrl, setApiUrl } = useAuth();
  const [view, setView]           = useState('login'); // 'login' | 'signup' | 'forgot' | 'changeuser' | 'connection'
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [grid1, setGrid1]         = useState('');
  const [grid2, setGrid2]         = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [challenges, setChallenges] = useState({ grid_challenge_1: 'B3', grid_challenge_2: 'D5', grid_enabled: false });

  useEffect(() => {
    let retries = 0;
    const maxRetries = 3;

    const fetchChallenges = () => {
      fetch(`${apiUrl}/auth/challenges`, { 
        headers: { 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' } 
      })
        .then(r => r.json())
        .then(data => {
          setChallenges(data);
          setError('');
        })
        .catch(() => {
          if (retries < maxRetries) {
            retries++;
            setTimeout(fetchChallenges, 2000); // Retry every 2 seconds
          } else {
            setError('Cannot reach the server. Please ensure the local backend and Ngrok tunnel are running on your computer.');
          }
        });
    };

    fetchChallenges();
  }, [apiUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ username, password, grid_value_1: grid1, grid_value_2: grid2 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Login failed'); return; }
      login(data);
    } catch {
      setError('Cannot reach the server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding: '1rem' }}>
      <div className="glass-panel" style={{ width:'100%', maxWidth:'460px', position: 'relative' }}>
        
        {/* Status indicator - hidden settings trigger */}
        <div 
          style={{ 
            position: 'absolute', top: '1rem', right: '1.5rem', 
            display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem',
            cursor: 'default'
          }}
        >
          <div style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            background: challenges.grid_challenge_1 ? 'var(--acc-green)' : 'var(--acc-red)',
            boxShadow: challenges.grid_challenge_1 ? '0 0 8px var(--acc-green)' : 'none'
          }}></div>
          <span style={{ color: 'var(--text-muted)' }}>{challenges.grid_challenge_1 ? 'Engine Online' : 'Engine Offline'}</span>
        </div>

        {/* Header — always visible */}
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{
            width:'64px', height:'64px', borderRadius:'16px', margin:'0 auto 1rem',
            background:'linear-gradient(135deg, var(--primary), #a855f7)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px'
          }}>🏛️</div>
          <h1 style={{ color:'var(--primary)', fontSize:'1.6rem', marginBottom:'0.25rem' }}>VIMS Staff Portal</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>Timetable Allocation System — Authorised Access Only</p>
        </div>

        {/* ── Tab bar (Login / Sign Up) ── */}
        {(view === 'login' || view === 'signup') && (
          <div style={{ display:'flex', borderRadius:'10px', overflow:'hidden', border:'1px solid var(--border)', marginBottom:'1.5rem' }}>
            {['login','signup'].map(tab => (
              <button key={tab} onClick={() => setView(tab)}
                style={{
                  flex:1, padding:'0.6rem', border:'none', cursor:'pointer', fontWeight:600, fontSize:'0.9rem',
                  background: view === tab ? 'var(--primary)' : 'transparent',
                  color:      view === tab ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}>
                {tab === 'login' ? '🔓 Login' : '🚀 Sign Up'}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic panel */}
        {view === 'forgot'     && <ForgotPasswordPanel onBack={() => setView('login')} />}
        {view === 'changeuser' && <ChangeUsernamePanel onBack={() => setView('login')} />}
        {view === 'signup'     && <SignUpPanel onSwitchToLogin={() => setView('login')} />}

        {view === 'login' && (
          <>
            <div style={{ color: 'var(--acc-red)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div className="form-group">
                <label>Staff Username</label>
                <input type="text" className="input-field" placeholder="e.g. hod_cse"
                  value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input type="password" className="input-field" placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>

              {challenges.grid_enabled && (
                <div style={{ background:'rgba(124,58,237,0.08)', borderRadius:'10px', padding:'1rem', border:'1px solid rgba(124,58,237,0.2)' }}>
                  <p style={{ color:'var(--text-muted)', fontSize:'0.8rem', marginBottom:'0.75rem' }}>
                    🔐 Enter your grid card values as shown below
                  </p>
                  <div style={{ display:'flex', gap:'1rem' }}>
                    <div className="form-group" style={{ flex:1, margin:0 }}>
                      <label>Grid Cell <strong style={{color:'var(--primary)'}}>{challenges.grid_challenge_1}</strong></label>
                      <input type="text" className="input-field" placeholder="e.g. 7X"
                        value={grid1} onChange={e => setGrid1(e.target.value)} maxLength={4} style={{textTransform:'uppercase'}} />
                    </div>
                    <div className="form-group" style={{ flex:1, margin:0 }}>
                      <label>Grid Cell <strong style={{color:'var(--primary)'}}>{challenges.grid_challenge_2}</strong></label>
                      <input type="text" className="input-field" placeholder="e.g. P3"
                        value={grid2} onChange={e => setGrid2(e.target.value)} maxLength={4} style={{textTransform:'uppercase'}} />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary"
                style={{ width:'100%', marginTop:'0.5rem', padding:'0.85rem', fontSize:'1rem' }}
                disabled={loading}>
                {loading ? '⏳ Verifying...' : '🔓 Login'}
              </button>
            </form>

            {/* ── Links row ── */}
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'1.25rem' }}>
              <button style={linkBtn} onClick={() => setView('forgot')}>Forgot Password?</button>
              <button style={linkBtn} onClick={() => setView('changeuser')}>Change Username</button>
            </div>

            <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.75rem', marginTop:'1rem' }}>
              Restricted to authorised VIMS staff only.<br/>Contact IT admin for access issues.
            </p>
            <p style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:'0.6rem', marginTop:'0.5rem' }}>
              System Version: v1.0.8
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ departmentId, setDepartmentId }) {
  const location = useLocation();
  const path = location.pathname;
  const { session, logout } = useAuth();

  return (
    <div className="glass-panel sidebar">
      <h2 style={{ marginBottom:'0.25rem', color:'var(--primary)' }}>NeuroTime AI</h2>
      <p style={{ color:'var(--text-muted)', fontSize:'0.75rem', marginBottom:'1.5rem' }}>VIMS Timetable System</p>

      <Link to="/" style={{textDecoration:'none'}}>
        <div className={`sidebar-item ${path === '/' ? 'active' : ''}`}>📅 Timetable Engine</div>
      </Link>
      <Link to="/teachers" style={{textDecoration:'none'}}>
        <div className={`sidebar-item ${path === '/teachers' ? 'active' : ''}`}>👨‍🏫 Teachers</div>
      </Link>
      <Link to="/rooms" style={{textDecoration:'none'}}>
        <div className={`sidebar-item ${path === '/rooms' ? 'active' : ''}`}>🏫 Rooms</div>
      </Link>
      <Link to="/subjects" style={{textDecoration:'none'}}>
        <div className={`sidebar-item ${path === '/subjects' ? 'active' : ''}`}>📚 Subjects</div>
      </Link>
      <Link to="/tas" style={{textDecoration:'none'}}>
        <div className={`sidebar-item ${path === '/tas' ? 'active' : ''}`}>🧑‍💻 Teaching Assistants</div>
      </Link>
      <Link to="/settings" style={{textDecoration:'none'}}>
        <div className={`sidebar-item ${path === '/settings' ? 'active' : ''}`}>⚙️ Constraints & Settings</div>
      </Link>

      {/* User info + logout at bottom */}
      <div style={{ marginTop:'auto', paddingTop:'2rem', borderTop:'1px solid var(--border)', marginTop:'2rem' }}>
        <p style={{ color:'var(--text-muted)', fontSize:'0.75rem' }}>Logged in as</p>
        <p style={{ color:'var(--primary)', fontWeight:600, fontSize:'0.9rem' }}>{session?.display_name}</p>
        
        <div style={{ margin: '0.75rem 0' }}>
          <label style={{ display: 'block', color:'var(--text-muted)', fontSize:'0.7rem', marginBottom: '4px' }}>
            Active Department:
          </label>
          <input 
            type="text" 
            value={departmentId} 
            onChange={e => setDepartmentId(e.target.value)}
            className="input-field"
            style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }} 
          />
        </div>

        <button onClick={logout} className="btn" style={{
          width:'100%', background:'rgba(239,68,68,0.1)', color:'var(--acc-red)',
          border:'1px solid rgba(239,68,68,0.3)', padding:'0.4rem', borderRadius:'6px',
          cursor:'pointer', fontSize:'0.8rem'
        }}>
          🔒 Logout
        </button>
      </div>
    </div>
  );
}

// ── Main App (post-login) ──────────────────────────────────────────────────────
function MainApp() {
  const { session } = useAuth();
  const [departmentId, setDepartmentId] = useState(session?.department_id || '');

  return (
    <Router>
      <div className="app-container">
        <div className="dashboard-grid">
          <Sidebar departmentId={departmentId} setDepartmentId={setDepartmentId} />
          <main>
            <Routes>
              <Route path="/"          element={<Timetable departmentId={departmentId} />} />
              <Route path="/teachers"  element={<TeachersGrid departmentId={departmentId} />} />
              <Route path="/rooms"     element={<RoomsGrid departmentId={departmentId} />} />
              <Route path="/subjects"  element={<SubjectsGrid departmentId={departmentId} />} />
              <Route path="/tas"       element={<TAGrid departmentId={departmentId} />} />
              <Route path="/settings"  element={<SetupWizard departmentId={departmentId} onComplete={() => alert('Settings Saved!')} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

function AppRouter() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <MainApp /> : <LoginPage />;
}
