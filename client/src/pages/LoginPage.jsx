import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  async function login(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await API.post('/auth/login', { email: email.trim().toLowerCase(), password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/' + data.user.role);
    } catch (error) { setError(error.response?.data?.error || 'Unable to sign in'); }
    finally { setLoading(false); }
  }
  return <main><h1>Course Registration System</h1><form onSubmit={login}>
    <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
    <button disabled={loading}>{loading ? 'Signing in?' : 'Login'}</button>
    {error && <p className="error" role="alert">{error}</p>}
  </form><p>Contact the administrator for an account.</p></main>;
}
