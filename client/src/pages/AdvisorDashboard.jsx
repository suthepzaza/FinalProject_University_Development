import { useCallback, useEffect, useState } from 'react';
import API from '../api';
import Dashboard from '../components/Dashboard';
import AcademicHistory from '../components/AcademicHistory';
const blank = { code: '', title: '', section: '1', day: 'Monday', startTime: '09:00', endTime: '12:00', room: '', instructor: '', seats: 30, addDropOpen: false, addDropClosesAt: '' };
export default function AdvisorDashboard() {
  const [term, setTerm] = useState('2026-1');
  const [finalized, setFinalized] = useState(false);
  const [offerings, setOfferings] = useState([]);
  const [students, setStudents] = useState([]);
  const [student, setStudent] = useState('');
  const [records, setRecords] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [rules, setRules] = useState({ eligible: [], excluded: [] });
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [offers, people, status] = await Promise.all([API.get('/offerings', { params: { term } }), API.get('/students'), API.get('/terms/' + term)]);
      setOfferings(offers.data); setStudents(people.data); setFinalized(status.data.finalized);
      if (student) {
        const [history, eligible, enrolled] = await Promise.all([
          API.get('/students/' + student + '/record'), API.get('/students/' + student + '/eligible', { params: { term } }),
          API.get('/registrations', { params: { studentId: student, term } })
        ]);
        setRecords(history.data); setRules(eligible.data); setRegistrations(enrolled.data);
      } else { setRecords([]); setRules({ eligible: [], excluded: [] }); setRegistrations([]); }
    } catch (error) { setError(error.response?.data?.error || 'Failed to load dashboard'); }
    finally { setLoading(false); }
  }, [term, student]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);
  async function action(callback) {
    setError(''); setSaving(true);
    try { await callback(); await load(); }
    catch (error) { setError(error.response?.data?.error || 'Change failed'); }
    finally { setSaving(false); }
  }
  async function save(event) {
    event.preventDefault();
    await action(async () => {
      const data = { ...form, seats: Number(form.seats), term, addDropClosesAt: form.addDropClosesAt ? form.addDropClosesAt + 'T16:59:59.999Z' : null };
      if (editing) await API.patch('/offerings/' + editing, data);
      else await API.post('/offerings', data);
      setEditing(null); setForm(blank);
    });
  }
  function field(key) { return { value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) }; }
  return <Dashboard title="Advisor dashboard" error={error}>
    <label>Term<input pattern="20[0-9]{2}-[1-3]" value={term} onChange={e => setTerm(e.target.value)} /></label>
    <p>Registration status: {finalized ? 'Finalized' : 'Open'}</p>
    <button disabled={finalized || saving || loading} onClick={() => {
      if (window.confirm('Finalize this term? Further registrations and removals will be blocked.')) action(() => API.post('/terms/' + term + '/finalize'));
    }}>Finalize term</button>
    <h2>{editing ? 'Edit section' : 'Open a course section'}</h2><form onSubmit={save}>
      <label>Course code<input required disabled={!!editing} {...field('code')} /></label><label>Title<input required disabled={!!editing} {...field('title')} /></label>
      <label>Section<input required {...field('section')} /></label>
      <label>Day<select {...field('day')}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day}>{day}</option>)}</select></label>
      <label>Start<input type="time" required {...field('startTime')} /></label><label>End<input type="time" required {...field('endTime')} /></label>
      <label>Room<input required {...field('room')} /></label><label>Instructor<input required {...field('instructor')} /></label>
      <label>Seats<input type="number" min="0" step="1" required {...field('seats')} /></label>
      <label><input type="checkbox" checked={form.addDropOpen} onChange={e => setForm({ ...form, addDropOpen: e.target.checked })} /> Add/drop open</label>
      <label>Closing date<input type="date" required={form.addDropOpen} {...field('addDropClosesAt')} /></label>
      <button disabled={saving}>Save section</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
    </form>
    <h2>Sections offered</h2>{loading && <p>Loading?</p>}
    <table><thead><tr><th>Course / section</th><th>Day and time</th><th>Room / instructor</th><th>Taken / remaining</th><th>Add/drop</th><th>Actions</th></tr></thead><tbody>
      {offerings.map(o => <tr key={o._id}><td>{o.code} ? {o.title}, Section {o.section}</td><td>{o.day} {o.startTime}?{o.endTime}</td><td>{o.room} / {o.instructor}</td><td>{o.enrolled} / {o.seats - o.enrolled}</td><td>{o.addDropOpen ? 'Open' : 'Closed'} {o.addDropClosesAt?.slice(0, 10)}</td><td>
        <button onClick={() => { setEditing(o._id); setForm({ ...blank, ...o, addDropClosesAt: o.addDropClosesAt?.slice(0, 10) || '' }); }}>Edit</button>
        <button disabled={saving} onClick={() => { if (window.confirm('Remove section?')) action(() => API.delete('/offerings/' + o._id)); }}>Remove</button>
      </td></tr>)}
    </tbody></table>
    <h2>Register a student</h2><label>Student<select value={student} onChange={e => setStudent(e.target.value)}><option value="">Select student</option>{students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.studentId})</option>)}</select></label>
    {student && <><AcademicHistory records={records} /><h3>Current registration</h3>
      <ul>{registrations.map(r => <li key={r._id}>{r.offeringId?.code} Section {r.offeringId?.section} <button disabled={saving || finalized || loading} onClick={() => { if (window.confirm('Remove registration?')) action(() => API.delete('/registrations/' + r._id)); }}>Remove</button></li>)}</ul>
      <h3>Course eligibility</h3><table><thead><tr><th>Course</th><th>Section / schedule</th><th>Decision</th><th>Register</th></tr></thead><tbody>
        {[...rules.eligible, ...rules.excluded].map(result => <tr key={result.offering._id} className={result.reason ? 'excluded' : ''}>
          <td>{result.offering.code} ? {result.offering.title}</td><td>{result.offering.section} / {result.offering.day} {result.offering.startTime}?{result.offering.endTime}</td>
          <td>{result.reason || (result.isRetake ? 'Retake required' : 'Eligible')}</td><td><button disabled={!result.isEligible || saving || loading || finalized} onClick={() => action(() => API.post('/registrations', { studentId: student, offeringId: result.offering._id, term }))}>Register</button></td>
        </tr>)}
      </tbody></table></>}
  </Dashboard>;
}
