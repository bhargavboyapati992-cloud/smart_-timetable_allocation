import React, { useState, useEffect } from 'react';

export default function SetupWizard({ onComplete, departmentId }) {
    const [config, setConfig] = useState({
        department_id: departmentId,
        days_per_week: 6,
        periods_per_day: 7,
        max_consecutive_classes: 3
    });

    const [loading, setLoading] = useState(false);
    
    const API_URL = import.meta.env.VITE_API_URL || 'https://weak-jokes-guess.loca.lt';
    
    useEffect(() => {
        // Fetch existing config if any
        fetch(`${API_URL}/config/`, {
            headers: { 'X-Department-ID': departmentId, 'Bypass-Tunnel-Reminder': 'true' }
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.days_per_week) {
                setConfig(data);
                // Assume if it fetched successfully with data, maybe they don't *need* setup,
                // but we let them edit it or just click continue.
            }
        }).catch(err => console.log('No existing config'));
    }, [departmentId]);

    const handleSave = (e) => {
        e.preventDefault();
        setLoading(true);
        fetch(`${API_URL}/config/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Department-ID': departmentId,
                'Bypass-Tunnel-Reminder': 'true'
            },
            body: JSON.stringify(config)
        })
        .then(res => res.json())
        .then(data => {
            setLoading(false);
            onComplete();
        })
        .catch(err => {
            alert("Error saving configuration! Ensure the backend is running.");
            setLoading(false);
        });
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '500px' }}>
                <h2 style={{color: 'var(--primary)', marginBottom: '1rem'}}>Hello, {departmentId}!</h2>
                <h3 style={{marginBottom: '0.5rem'}}>Initial System Configuration</h3>
                <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem'}}>
                    Please define the global constraints for your department schedule. This is asked only once.
                </p>

                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label>Working Days per Week</label>
                        <input type="number" min="1" max="7" className="input-field" 
                               value={config.days_per_week} 
                               onChange={e => setConfig({...config, days_per_week: parseInt(e.target.value)})} />
                    </div>
                    <div className="form-group">
                        <label>Total Periods per Day</label>
                        <input type="number" min="1" max="12" className="input-field" 
                               value={config.periods_per_day} 
                               onChange={e => setConfig({...config, periods_per_day: parseInt(e.target.value)})} />
                    </div>
                    <div className="form-group">
                        <label>Max Consecutive Classes per Faculty</label>
                        <input type="number" min="1" max="8" className="input-field" 
                               value={config.max_consecutive_classes} 
                               onChange={e => setConfig({...config, max_consecutive_classes: parseInt(e.target.value)})} />
                    </div>
                    
                    <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '1rem'}} disabled={loading}>
                        {loading ? 'Saving...' : 'Save & Enter Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
}
