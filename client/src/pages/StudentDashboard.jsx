import { useEffect, useState } from 'react';
import API from '../api';
import Dashboard from '../components/Dashboard';
import AcademicHistory from '../components/AcademicHistory';
export default function StudentDashboard() {
  const [term, setTerm] = useState('2026-1');
  const [registrations, setRegistrations] = useState([]);
  const [records, setRecords] = useState([]);
  const [profile, setProfile] = useState(null);
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;

    Promise.all([API.get('/me/registrations', { params: { term } }), API.get('/me/record'), API.get('/me/profile')])
      .then(([registration, history, student]) => { if (active) { setRegistrations(registration.data); setRecords(history.data); setProfile(student.data); } })
      .catch(error => { if (active) setError(error.response?.data?.error || 'Failed to load dashboard'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [term]);
  const email = profile?.advisorId?.email || request?.advisorEmail;
  const subject = 'Add/Drop Request - ' + profile?.studentId + ' - ' + request?.code;
  return <Dashboard title="Student dashboard" error={error}>
    <p>{profile?.name} ? {profile?.studentId}</p>{profile?.advisorId && <p>Advisor: {profile.advisorId.name} ({profile.advisorId.email})</p>}
    <label>Term<input value={term} onChange={e => { setTerm(e.target.value); setLoading(true); setRequest(null); setError(''); }} /></label>
    {loading ? <p>Loading?</p> : <><h2>Current registration</h2><table><thead><tr><th>Course</th><th>Section</th><th>Day / time</th><th>Room</th><th>Instructor</th><th>Add/drop</th></tr></thead><tbody>
      {registrations.map(r => { const o = r.offeringId; return o && <tr key={r._id}><td>{o.code} ? {o.title}</td><td>{o.section}</td><td>{o.day} {o.startTime}?{o.endTime}</td><td>{o.room}</td><td>{o.instructor}</td><td>
        {o.addDropOpen ? 'Open' : 'Closed'} {o.addDropClosesAt && '(Closes ' + o.addDropClosesAt.slice(0, 10) + ')'}
        {o.addDropOpen && <button onClick={() => setRequest(o)}>Request add/drop</button>}
      </td></tr>; })}
    </tbody></table>{!registrations.length && <p>No courses registered for this term.</p>}<AcademicHistory records={records} /></>}
    {request && <section><h2>Add/drop request: {request.code}</h2><a href="/add-drop-request-form.pdf" download>Download Add/Drop Request form</a>
      <ol><li>Download and open the Add/Drop Request form.</li><li>Fill in your student ID, name, term, and the course code and section you wish to add or drop.</li>
        <li>State the reason for the request and sign the form.</li><li>Email the completed form as an attachment to your advisor at {email}, using the subject line: <strong>{subject}</strong>.</li>
        <li>Your advisor will confirm by email once the change is made.</li></ol>
      <a href={'mailto:' + email + '?subject=' + encodeURIComponent(subject)}>Email advisor</a><button onClick={() => setRequest(null)}>Close</button>
    </section>}
  </Dashboard>;
}
