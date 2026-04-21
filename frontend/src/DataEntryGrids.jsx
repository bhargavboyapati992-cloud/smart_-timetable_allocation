import React, { useState, useEffect } from 'react';

function getAuthHeaders(departmentId, extra = {}) {
    const session = JSON.parse(sessionStorage.getItem('vims_session') || 'null');
    const token = session?.access_token || '';
    return {
        'X-Department-ID': departmentId,
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...extra,
    };
}

function BaseGrid({ title, endpoint, fields, departmentId }) {
    const [data, setData] = useState([]);
    const [formData, setFormData] = useState({});
    const [editId, setEditId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const API_URL = import.meta.env.VITE_API_URL || 'https://entering-pork-tables-river.trycloudflare.com';

    const loadData = () => {
        fetch(`${API_URL}/${endpoint}/`, { headers: getAuthHeaders(departmentId) })
            .then(res => res.json())
            .then(res => setData(Array.isArray(res) ? res : []))
            .catch(console.error);
    };

    useEffect(() => { loadData(); }, [departmentId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...formData, department_id: departmentId };
        const method = editId ? 'PUT' : 'POST';
        const url_suffix = editId ? `/${editId}` : '/';

        fetch(`${API_URL}/${endpoint}${url_suffix}`, {
            method,
            headers: getAuthHeaders(departmentId),
            body: JSON.stringify(payload),
        })
            .then(res => res.json())
            .then(() => {
                setFormData({});
                setEditId(null);
                loadData();
            });
    };

    const handleDelete = (id) => {
        if (!window.confirm('Are you sure you want to remove this item?')) return;
        fetch(`${API_URL}/${endpoint}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(departmentId),
        }).then(() => loadData());
    };

    const startEdit = (row) => {
        setFormData(row);
        setEditId(row.id);
        setOpenMenuId(null);
    };

    return (
        <div className="glass-panel" onClick={() => setOpenMenuId(null)}>
            <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>{title}</h2>

            {/* ── Entry Form ── */}
            <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}
                onClick={e => e.stopPropagation()}
            >
                {fields.map(f => (
                    <div className="form-group" key={f.name} style={{ minWidth: '200px', flex: 1 }}>
                        <label>{f.label}</label>
                        {f.type === 'select' ? (
                            <select
                                className="input-field"
                                value={formData[f.name] || ''}
                                onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                                required={!f.optional}
                            >
                                <option value="">-- Select --</option>
                                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        ) : (
                            <input
                                type={f.type || 'text'}
                                className="input-field"
                                value={formData[f.name] || ''}
                                onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                                required={!f.optional}
                            />
                        )}
                    </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '1rem', gap: '0.5rem' }}>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ background: editId ? '#eab308' : 'var(--primary)' }}
                    >
                        {editId ? '💾 Update' : '+ Add New'}
                    </button>
                    {editId && (
                        <button
                            type="button"
                            className="btn"
                            onClick={() => { setEditId(null); setFormData({}); }}
                            style={{ background: 'rgba(255,255,255,0.1)' }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* ── Data Table ── */}
            <div style={{ overflowX: 'auto' }}>
                <table className="timetable" style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            {fields.map(f => <th key={f.name}>{f.label}</th>)}
                            <th style={{ width: '52px' }} />
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(row => (
                            <tr key={row.id}>
                                {fields.map(f => (
                                    <td key={f.name} style={{ background: 'rgba(15,23,42,0.3)' }}>
                                        {row[f.name]}
                                    </td>
                                ))}

                                {/* ── Three-dot menu cell ── */}
                                <td
                                    style={{
                                        background: 'rgba(15,23,42,0.3)',
                                        textAlign: 'center',
                                        position: 'relative',
                                    }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    {/* Trigger button */}
                                    <button
                                        type="button"
                                        title="Options"
                                        style={{
                                            padding: '0.25rem 0.55rem',
                                            background: 'transparent',
                                            border: '1px solid transparent',
                                            borderRadius: '6px',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            fontSize: '1.4rem',
                                            lineHeight: 1,
                                            transition: 'background 0.2s, color 0.2s',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                            e.currentTarget.style.color = '#e2e8f0';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = '#94a3b8';
                                        }}
                                        onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                                    >
                                        ⋮
                                    </button>

                                    {/* Dropdown */}
                                    {openMenuId === row.id && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                right: '8px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: '#1e293b',
                                                border: '1px solid rgba(99,102,241,0.35)',
                                                borderRadius: '10px',
                                                boxShadow: '0 8px 30px rgba(0,0,0,0.55)',
                                                zIndex: 9999,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                minWidth: '140px',
                                            }}
                                        >
                                            {/* Edit option */}
                                            <button
                                                onClick={() => startEdit(row)}
                                                style={{
                                                    padding: '0.65rem 1rem',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                                                    borderRadius: '10px 10px 0 0',
                                                    color: '#e2e8f0',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.18)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                ✏️&nbsp; Edit
                                            </button>

                                            {/* Remove option */}
                                            <button
                                                onClick={() => { setOpenMenuId(null); handleDelete(row.id); }}
                                                style={{
                                                    padding: '0.65rem 1rem',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '0 0 10px 10px',
                                                    color: '#f87171',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.12)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                🗑️&nbsp; Remove
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={fields.length + 1}
                                    style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center' }}
                                >
                                    No data found. Add entries using the form above.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function TeachersGrid({ departmentId }) {
    return (
        <BaseGrid
            title="Faculty Management"
            departmentId={departmentId}
            endpoint="teachers"
            fields={[{ name: 'name', label: 'Teacher Name' }]}
        />
    );
}

export function RoomsGrid({ departmentId }) {
    return (
        <BaseGrid
            title="Locations & Rooms"
            departmentId={departmentId}
            endpoint="rooms"
            fields={[
                { name: 'name', label: 'Room Name/Number' },
                { name: 'room_type', label: 'Type', type: 'select', options: ['Classroom', 'Lab', 'Library'] },
                { name: 'capacity', label: 'Capacity', type: 'number' },
            ]}
        />
    );
}

export function SubjectsGrid({ departmentId }) {
    return (
        <BaseGrid
            title="Subjects & Curriculum"
            departmentId={departmentId}
            endpoint="subjects"
            fields={[
                { name: 'name', label: 'Subject Name' },
                { name: 'type', label: 'Type', type: 'select', options: ['Theory', 'Lab'] },
                { name: 'hours_per_week', label: 'Required Hours/Week', type: 'number' },
                { name: 'semester', label: 'Semester' },
            ]}
        />
    );
}

export function TAGrid({ departmentId }) {
    return (
        <BaseGrid
            title="Teaching Assistants"
            departmentId={departmentId}
            endpoint="tas"
            fields={[{ name: 'name', label: 'TA Name' }]}
        />
    );
}
