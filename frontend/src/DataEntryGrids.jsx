import React, { useState, useEffect } from 'react';

function BaseGrid({ title, endpoint, fields, departmentId }) {
    const [data, setData] = useState([]);
    const [formData, setFormData] = useState({});
    
    // Default config values passed to simplify structure
    const headers = { 'X-Department-ID': departmentId, 'Content-Type': 'application/json' };
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const loadData = () => {
        fetch(`${API_URL}/${endpoint}/`, { headers: { 'X-Department-ID': departmentId } })
            .then(res => res.json())
            .then(res => setData(res))
            .catch(console.error);
    }

    useEffect(() => { loadData(); }, [departmentId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...formData, department_id: departmentId };
        fetch(`${API_URL}/${endpoint}/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(() => {
            setFormData({});
            loadData();
        });
    }

    return (
        <div className="glass-panel">
            <h2 style={{color: 'var(--primary)', marginBottom: '1.5rem'}}>{title}</h2>
            
            <form onSubmit={handleSubmit} style={{display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap'}}>
                {fields.map(f => (
                    <div className="form-group" key={f.name} style={{minWidth: '200px', flex: 1}}>
                        <label>{f.label}</label>
                        {f.type === 'select' ? (
                            <select className="input-field" 
                                    value={formData[f.name] || ''} 
                                    onChange={e => setFormData({...formData, [f.name]: e.target.value})} required>
                                <option value="">--Select--</option>
                                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        ) : (
                            <input type={f.type || 'text'} className="input-field" 
                                   value={formData[f.name] || ''}
                                   onChange={e => setFormData({...formData, [f.name]: e.target.value})} required={!f.optional} />
                        )}
                    </div>
                ))}
                <div style={{display: 'flex', alignItems: 'flex-end', paddingBottom: '1rem'}}>
                    <button type="submit" className="btn btn-primary">+ Add New</button>
                </div>
            </form>

            <table className="timetable" style={{width: '100%'}}>
                <thead>
                    <tr>
                        {fields.map(f => <th key={f.name}>{f.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => (
                        <tr key={idx}>
                            {fields.map(f => <td key={f.name} style={{background: 'rgba(15,23,42,0.3)'}}>{row[f.name]}</td>)}
                        </tr>
                    ))}
                    {data.length === 0 && <tr><td colSpan={fields.length} style={{padding: '2rem', color: 'var(--text-muted)'}}>No data found. Enter some above.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

export function TeachersGrid({ departmentId }) {
    return <BaseGrid title="Faculty Management" departmentId={departmentId} endpoint="teachers" 
        fields={[
            { name: 'name', label: 'Teacher Name' }
        ]} />
}

export function RoomsGrid({ departmentId }) {
    return <BaseGrid title="Locations & Rooms" departmentId={departmentId} endpoint="rooms" 
        fields={[
            { name: 'name', label: 'Room Name/Number' },
            { name: 'room_type', label: 'Type', type: 'select', options: ['Classroom', 'Lab', 'Library'] },
            { name: 'capacity', label: 'Capacity', type: 'number' }
        ]} />
}

export function SubjectsGrid({ departmentId }) {
    return <BaseGrid title="Subjects & Curriculum" departmentId={departmentId} endpoint="subjects" 
        fields={[
            { name: 'name', label: 'Subject Name' },
            { name: 'type', label: 'Type', type: 'select', options: ['Theory', 'Lab'] },
            { name: 'hours_per_week', label: 'Required Hours/Week', type: 'number' },
            { name: 'semester', label: 'Semester' }
        ]} />
}

export function TAGrid({ departmentId }) {
    return <BaseGrid title="Teaching Assistants" departmentId={departmentId} endpoint="tas" 
        fields={[
            { name: 'name', label: 'TA Name' }
        ]} />
}
