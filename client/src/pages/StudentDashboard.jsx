import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [record, setRecord] = useState([]);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [regRes, recRes] = await Promise.all([
          API.get('/me/registrations'),
          API.get('/me/record')
        ]);
        setRegistrations(regRes.data);
        setRecord(recRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    }
    fetchData();
  }, []);

  const totalCredits = record.reduce((sum, item) => sum + (item.grade !== 'F' ? (item.courseId?.credits || 0) : 0), 0);

  return (
    <div style={{ minHeight: '100vh', padding: '30px 40px', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#122666', color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '28px' }}>Student Dashboard</h1>
          <p style={{ color: '#cbd5e1', fontSize: '15px', margin: 0 }}>Welcome, <strong style={{ color: '#ffffff' }}>{user.name}</strong> (ID: {user.studentId})</p>
        </div>
        <button
          onClick={handleLogout}
          style={{ padding: '8px 18px', backgroundColor: '#e53e3e', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
        >
          Logout
        </button>
      </div>

      <p style={{ color: '#cbd5e1', fontSize: '16px' }}><strong style={{ color: '#ffffff' }}>Total Earned Credits:</strong> {totalCredits}</p>

      {/* Current Term Registrations */}
      <h2 style={{ color: '#ffffff', marginTop: '28px' }}>Current Term Registrations</h2>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', borderColor: '#2e438c', backgroundColor: '#ffffff', color: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
        <thead style={{ backgroundColor: '#e2e8f0', color: '#0f172a' }}>
          <tr>
            <th>Course</th><th>Section</th><th>Day & Time</th><th>Room</th><th>Instructor</th><th>Add/Drop Status</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg) => (
            <tr key={reg._id}>
              <td>{reg.offeringId?.courseId?.code} - {reg.offeringId?.courseId?.title}</td>
              <td>{reg.offeringId?.section}</td>
              <td>{reg.offeringId?.day} {reg.offeringId?.startTime}-{reg.offeringId?.endTime}</td>
              <td>{reg.offeringId?.room}</td>
              <td>{reg.offeringId?.instructor}</td>
              <td>
                <span style={{ color: reg.offeringId?.addDropOpen ? 'green' : 'gray' }}>
                  {reg.offeringId?.addDropOpen ? 'Open' : 'Closed'}
                </span>
              </td>
              <td>
                {reg.offeringId?.addDropOpen && (
                  <button onClick={() => setSelectedOffering(reg.offeringId)}>Request Add/Drop</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Academic Record */}
      <h2 style={{ color: '#ffffff', marginTop: '36px' }}>Academic Record</h2>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', borderColor: '#2e438c', backgroundColor: '#ffffff', color: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
        <thead style={{ backgroundColor: '#e2e8f0', color: '#0f172a' }}>
          <tr><th>Term</th><th>Course Code</th><th>Title</th><th>Grade</th><th>Status</th></tr>
        </thead>
        <tbody>
          {record.map((item) => (
            <tr key={item._id} style={{ backgroundColor: item.grade === 'F' ? '#ffe6e6' : 'transparent' }}>
              <td>{item.term}</td>
              <td>{item.courseId?.code}</td>
              <td>{item.courseId?.title}</td>
              <td><strong>{item.grade}</strong></td>
              <td>
                {item.grade === 'F' ? (
                  <span style={{ color: 'red', fontWeight: 'bold' }}>⚠️ Retake required</span>
                ) : (
                  <span style={{ color: 'green' }}>Passed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add/Drop Modal */}
      {selectedOffering && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', maxWidth: '550px' }}>
            <h3>Add/Drop Request Instructions</h3>
            <ol style={{ textAlign: 'left', lineHeight: '1.6' }}>
              <li><a href="/add-drop-request-form.pdf" download style={{ fontWeight: 'bold' }}>Download and open the Add/Drop Request form</a></li>
              <li>Fill in your student ID, name, term, and the course code and section you wish to add or drop.</li>
              <li>State the reason for the request and sign the form.</li>
              <li>Email the completed form as an attachment to your advisor at <strong>{selectedOffering.advisorEmail || 'advisor@university.edu'}</strong>, using the subject line: <br/><code>Add/Drop Request - {user.studentId} - {selectedOffering.courseId?.code}</code></li>
              <li>Your advisor will confirm by email once the change is made.</li>
            </ol>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <a href={`mailto:${selectedOffering.advisorEmail || 'advisor@university.edu'}?subject=${encodeURIComponent(`Add/Drop Request - ${user.studentId} - ${selectedOffering.courseId?.code}`)}`} style={{ padding: '8px 16px', background: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>✉️ Open Email Client</a>
              <button onClick={() => setSelectedOffering(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

