import React, { useState } from 'react';
import { getApiUrl } from './config';

const mockData = {
  1: { // Monday
    1: { sub: 'ADA (T)', room: '608', type: 'theory' },
    2: { sub: 'ADA (T)', room: '608', type: 'theory' },
    3: { sub: 'OS', room: '502', type: 'theory' },
    4: { sub: 'I IOT', room: '619', type: 'theory' },
    5: { sub: 'FP', room: '619', type: 'theory' },
    6: { sub: 'OS LAB', room: '502', type: 'lab' },
    7: { sub: 'OS LAB', room: '502', type: 'lab' },
    8: { sub: 'OS', room: '502', type: 'theory' },
  },
  2: { // Tuesday
    1: { sub: 'I IOT', room: '502', type: 'theory' },
    2: { sub: 'OS', room: '502', type: 'theory' },
    3: { sub: 'FP', room: '502', type: 'theory' },
    4: { sub: 'P&S', room: '502', type: 'theory' },
    5: { sub: 'OE(NPTEL-619)', room: 'Ch Amarendra', type: 'theory' },
    6: { sub: 'PROB.SOLV', room: 'MVN SRUTHAKEERTHI', type: 'lab' },
    7: { sub: 'PROB.SOLV', room: 'MVN SRUTHAKEERTHI', type: 'lab' },
    8: { sub: 'ADA', room: '608', type: 'theory' },
  }
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Timetable({ departmentId }) {
  const [generating, setGenerating] = useState(false);
  const [schedule, setSchedule] = useState(() => {
    // Load last saved timetable for this department
    try {
      const saved = localStorage.getItem(`timetable_${departmentId}`);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isDraft, setIsDraft]     = useState(false);  // true = generated but not yet saved
  const [saveMsg, setSaveMsg]     = useState('');

  const handleGenerate = () => {
    setGenerating(true);
    const API_URL = getApiUrl();
    const session = JSON.parse(sessionStorage.getItem('vims_session') || 'null');
    const token = session?.access_token || '';
    fetch(`${API_URL}/generate?solverType=ortools`, {
        method: 'POST',
        headers: {
          'X-Department-ID': departmentId,
          'Bypass-Tunnel-Reminder': 'true',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.status === 'success' && data.schedule) {
            const grid = {};
            data.schedule.forEach(item => {
                const dayStr = item.day + 1;
                const p = item.period + 1;
                if (!grid[dayStr]) grid[dayStr] = {};
                grid[dayStr][p] = { 
                    sub: item.subject_name || `Sub ${item.subject_id}`, 
                    room: item.room_name || `Rm ${item.room_id}`, 
                    type: item.type ? item.type.toLowerCase() : 'theory',
                    mappingId: item.mapping_id
                };
            });
            // Calculate colSpans for consecutive same-mapping slots (lab blocks)
            Object.keys(grid).forEach(day => {
                const PERIOD_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
                PERIOD_SLOTS.forEach(p => {
                    const cell = grid[day][p];
                    if (!cell) return;
                    // Count consecutive periods with same mappingId
                    let span = 1;
                    while (
                        grid[day][p + span] &&
                        grid[day][p + span].mappingId === cell.mappingId
                    ) {
                        grid[day][p + span]._skip = true; // mark as merged
                        span++;
                    }
                    if (span > 1) cell._colSpan = span;
                });
            });
            setSchedule(grid);
            setIsDraft(true);   // mark as unsaved draft
            setSaveMsg('');
        } else {
            console.error("Solver error data:", data);
            alert('Failed to generate schedule. Check constraints! Ensure that you have adequate rooms, teachers, and your requested hours don\'t exceed period availability.');
            setSchedule(null);
        }
        setGenerating(false);
    })
    .catch(err => {
        console.error("Fetch error:", err);
        alert('Server unreachable or error in generation AI!');
        setGenerating(false);
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem(`timetable_${departmentId}`, JSON.stringify(schedule));
      setIsDraft(false);
      setSaveMsg('✅ Timetable saved successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('❌ Failed to save. Try again.');
    }
  };

  const handleRegenerate = () => {
    setIsDraft(false);
    setSchedule(null);
    setSaveMsg('');
    setTimeout(() => handleGenerate(), 100);
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <h2>Department: {departmentId.toUpperCase()}</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {isDraft
              ? <span style={{color:'#f59e0b'}}>⚠️ Unsaved draft — click Save to confirm</span>
              : schedule ? '✅ Saved timetable' : 'AI Computed Timetable'
            }
          </p>
        </div>

        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
          {saveMsg && (
            <span style={{ fontSize:'0.85rem', color: saveMsg.startsWith('✅') ? '#22c55e' : 'var(--acc-red)' }}>
              {saveMsg}
            </span>
          )}

          {/* Re-generate — always available */}
          <button
            className="btn"
            style={{ background:'rgba(124,58,237,0.15)', color:'var(--primary)', border:'1px solid var(--primary)' }}
            onClick={schedule ? handleRegenerate : handleGenerate}
            disabled={generating}
          >
            {generating ? '⏳ Generating...' : '🔮 Generate AI Timetable'}
          </button>

          {/* Save — only visible when there is an unsaved draft */}
          {isDraft && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              style={{ background:'#22c55e', border:'none', fontWeight:700 }}
            >
              💾 Save Timetable
            </button>
          )}
        </div>
      </div>

      {(schedule || generating) ? (
        <div className="timetable-wrapper">
          <table className="timetable">
            <thead>
              <tr>
                <th>Day/Hour</th>
                <th>1 <br/><span style={{fontSize: '10px'}}>8:15-9:05</span></th>
                <th>2 <br/><span style={{fontSize: '10px'}}>9:05-09:55</span></th>
                <th style={{width: '40px'}}>Break<br/><span style={{fontSize: '10px'}}>09:55-10:10</span></th>
                <th>3 <br/><span style={{fontSize: '10px'}}>10:10-11:00</span></th>
                <th>4 <br/><span style={{fontSize: '10px'}}>11:00-11:50</span></th>
                <th>5 <br/><span style={{fontSize: '10px'}}>11:50-12:40</span></th>
                <th style={{width: '40px'}}>Lunch<br/><span style={{fontSize: '10px'}}>12:40-1:40</span></th>
                <th>6 <br/><span style={{fontSize: '10px'}}>1:40-2:30</span></th>
                <th>7 <br/><span style={{fontSize: '10px'}}>2:30-3:20</span></th>
                <th>8 <br/><span style={{fontSize: '10px'}}>3:20-4:30</span></th>
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIdx) => {
                const dayData = schedule ? schedule[dayIdx + 1] || {} : {};

                const renderCell = (period) => {
                  const cell = dayData[period];
                  if (cell?._skip) return null; // already merged into previous cell
                  const isLab = cell?.type === 'lab' || cell?.type === 'practical';
                  const colSpan = cell?._colSpan || 1;
                  return (
                    <td
                      key={period}
                      colSpan={colSpan}
                      className={`slot-cell ${isLab ? 'cell-lab' : 'cell-theory'}`}
                      style={isLab && colSpan > 1 ? {
                        background: 'rgba(124,58,237,0.18)',
                        borderLeft: '3px solid var(--primary)',
                        borderRight: '3px solid var(--primary)'
                      } : {}}
                    >
                      {cell ? (
                        <div className="slot-content">
                          <span className="subject-tag">
                            {cell.sub}
                            {colSpan > 1 && (
                              <span style={{
                                fontSize:'10px', marginLeft:'5px',
                                background: isLab ? 'rgba(124,58,237,0.3)' : 'rgba(59,130,246,0.3)',
                                color: isLab ? '#a78bfa' : '#93c5fd',
                                borderRadius:'4px', padding:'1px 5px', fontWeight:700, letterSpacing:'0.5px'
                              }}>
                                {isLab ? '(L)' : '(T)'}
                              </span>
                            )}
                          </span>
                          <span className="room-tag">{cell.room}</span>
                        </div>
                      ) : (
                        <div className="slot-content">
                          <span style={{ color: 'var(--border)' }}>—</span>
                        </div>
                      )}
                    </td>
                  );
                };

                return (
                  <tr key={day}>
                    <th>{day}</th>
                    {renderCell(1)}
                    {renderCell(2)}
                    {dayIdx === 0 ? <td rowSpan={6} className="break-col">BREAK</td> : null}
                    {renderCell(3)}
                    {renderCell(4)}
                    {renderCell(5)}
                    {dayIdx === 0 ? <td rowSpan={6} className="break-col">LUNCH</td> : null}
                    {renderCell(6)}
                    {renderCell(7)}
                    {renderCell(8)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Click "Generate AI Timetable" to trigger the solver engine.</p>
        </div>
      )}
    </div>
  );
}
