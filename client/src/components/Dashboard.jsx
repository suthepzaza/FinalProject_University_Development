import { useNavigate } from 'react-router-dom';
export default function Dashboard({ title, error, children }) {
  const navigate = useNavigate();
  function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }
  return <main><header><h1>{title}</h1><button onClick={logout}>Logout</button></header>
    {error && <p role="alert" className="error">{error}</p>}{children}</main>;
}
