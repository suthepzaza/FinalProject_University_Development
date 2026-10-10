import { useCallback, useEffect, useState } from 'react';
import API from '../api';
import Dashboard from '../components/Dashboard';
const blank = { name: '', email: '', role: 'student', studentId: '', password: '', advisorId: '', active: true };
export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('all');
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try { setUsers((await API.get('/users')).data); }
    catch (error) { setError(error.response?.data?.error || 'Failed to load users'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);
  function field(key) { return { value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) }; }
  async function save(event) {
    event.preventDefault(); setError(''); setSaving(true);
    const data = { ...form, advisorId: form.role === 'student' ? form.advisorId || null : null };
    if (!data.password) delete data.password;
    if (data.role !== 'student') delete data.studentId;
    try {
      if (editing) await API.patch('/users/' + editing, data);
      else await API.post('/users', data);
      setEditing(null); setForm(blank); await load();
    } catch (error) { setError(error.response?.data?.error || 'Failed to save account'); }
    finally { setSaving(false); }
  }
  async function remove(user) {
    if (!window.confirm('Delete ' + user.name + '?')) return;
    try { await API.delete('/users/' + user._id); await load(); }
    catch (error) { setError(error.response?.data?.error || 'Failed to delete account'); }
  }
  return <Dashboard title="Admin dashboard" error={error}>
    <h2>{editing ? 'Edit account' : 'Create account'}</h2><form onSubmit={save}>
      <label>Name<input required {...field('name')} /></label>
      <label>Email<input type="email" required {...field('email')} /></label>
      <label>Role<select {...field('role')}><option>student</option><option>advisor</option><option>admin</option></select></label>
      {form.role === 'student' && <><label>Student ID<input required {...field('studentId')} /></label>
        <label>Advisor<select {...field('advisorId')}><option value="">Unassigned</option>{users.filter(u => u.role === 'advisor' && u.active).map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></label></>}
      <label>{editing ? 'New password (optional)' : 'Initial password'}<input type="password" minLength={8} required={!editing} {...field('password')} /></label>
      <label><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
      <button disabled={saving}>Save account</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
    </form>
    <h2>Users</h2><label>Filter role<select value={role} onChange={e => setRole(e.target.value)}><option value="all">All</option><option>student</option><option>advisor</option><option>admin</option></select></label>
    {loading ? <p>Loading?</p> : <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Student ID</th><th>Active</th><th>Actions</th></tr></thead>
      <tbody>{users.filter(u => role === 'all' || u.role === role).map(u => <tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.studentId}</td><td>{u.active ? 'Yes' : 'No'}</td><td>
        <button onClick={() => { setEditing(u._id); setForm({ ...blank, ...u, advisorId: u.advisorId || '', password: '' }); }}>Edit</button><button onClick={() => remove(u)}>Delete</button>
      </td></tr>)}</tbody></table>}
  </Dashboard>;
}
