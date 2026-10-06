import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

// Helper to get registered accounts list from localStorage
function getStoredUsers() {
  try {
    const raw = localStorage.getItem('registered_users');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading registered users', e);
  }
  // Default test accounts per course specification (Section 10)
  return [
    {
      name: 'System Admin',
      email: 'admin@stamford.edu',
      password: 'password123',
      role: 'admin',
      studentId: ''
    },
    {
      name: 'Dr. Advisor',
      email: 'advisor@stamford.edu',
      password: 'password123',
      role: 'advisor',
      studentId: ''
    }
  ];
}

// Helper to save a new user to registered list
function saveStoredUser(newUser) {
  const users = getStoredUsers();
  // Check if already exists
  const existingIdx = users.findIndex(
    (u) => u.email.toLowerCase() === newUser.email.toLowerCase()
  );
  if (existingIdx >= 0) {
    users[existingIdx] = newUser;
  } else {
    users.push(newUser);
  }
  localStorage.setItem('registered_users', JSON.stringify(users));
}

export default function LoginPage({ initialSignUp = false }) {
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (isSignUp) {
      // ==========================================
      // SIGN UP FLOW
      // ==========================================
      // 1. Check local list for duplicates
      const storedUsers = getStoredUsers();
      if (storedUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
        setError('This email is already registered. Please log in instead.');
        setLoading(false);
        return;
      }

      const role = cleanEmail.includes('admin')
        ? 'admin'
        : cleanEmail.includes('advisor')
        ? 'advisor'
        : 'student';

      // Generate random numeric 6-digit ID
      const randomId = Math.floor(100000 + Math.random() * 900000).toString();

      const newAccount = {
        name: name.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        password,
        role,
        studentId: randomId
      };

      try {
        // Attempt backend registration
        const res = await API.post('/auth/register', newAccount);
        if (res.data?.studentId) {
          newAccount.studentId = res.data.studentId;
        }
      } catch (err) {
        // If server says duplicate email or validation failed, show the error!
        if (err.response && err.response.data?.error) {
          setError(err.response.data.error);
          setLoading(false);
          return;
        }
        console.warn('Backend unavailable, persisting registration locally.');
      }

      // Persist the newly signed up account
      saveStoredUser(newAccount);

      // Remember email for next time
      localStorage.setItem('remembered_email', cleanEmail);

      setSuccess('Account created successfully! Logging you in...');

      // Store active session for the newly registered user
      localStorage.setItem('token', 'auth_token_' + Date.now());
      localStorage.setItem(
        'user',
        JSON.stringify({
          name: newAccount.name,
          email: newAccount.email,
          role: newAccount.role,
          studentId: newAccount.studentId
        })
      );

      setTimeout(() => {
        if (newAccount.role === 'admin') navigate('/admin');
        else if (newAccount.role === 'advisor') navigate('/advisor');
        else navigate('/student');
      }, 700);

      setLoading(false);
    } else {
      // ==========================================
      // LOGIN FLOW (STRICT VALIDATION)
      // ==========================================
      // Save email to remember it next time
      localStorage.setItem('remembered_email', cleanEmail);
      let loginSuccess = false;

      // 1. First try Live Backend if reachable
      try {
        const res = await API.post('/auth/login', { email: cleanEmail, password });
        if (res.data?.token) {
          localStorage.setItem('token', res.data.token);
          if (res.data.user) {
            localStorage.setItem('user', JSON.stringify(res.data.user));
            const role = res.data.user.role;
            loginSuccess = true;
            if (role === 'admin') return navigate('/admin');
            if (role === 'advisor') return navigate('/advisor');
            return navigate('/student');
          }
        }
      } catch (err) {
        // If the backend returned a 401 or 400 (Invalid credentials), reject immediately!
        if (err.response && (err.response.status === 401 || err.response.status === 400)) {
          setError(err.response.data?.error || err.response.data?.message || 'Invalid email or password.');
          setLoading(false);
          return;
        }
      }

      // 2. Local registered user verification (if backend is offline)
      if (!loginSuccess) {
        const storedUsers = getStoredUsers();
        const foundUser = storedUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );

        if (!foundUser) {
          // Reject: user has never registered!
          setError('No account found with this email. Please sign up first.');
          setLoading(false);
          return;
        }

        if (foundUser.password !== password) {
          // Reject: incorrect password!
          setError('Incorrect password. Please check your credentials.');
          setLoading(false);
          return;
        }

        // Credentials matched!
        localStorage.setItem('token', 'auth_token_' + Date.now());
        localStorage.setItem(
          'user',
          JSON.stringify({
            name: foundUser.name,
            email: foundUser.email,
            role: foundUser.role,
            studentId: foundUser.studentId
          })
        );

        if (foundUser.role === 'admin') navigate('/admin');
        else if (foundUser.role === 'advisor') navigate('/advisor');
        else navigate('/student');
      }

      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#122666',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      {/* Central Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px 32px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          boxSizing: 'border-box'
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            marginTop: 0,
            marginBottom: '20px',
            color: '#00072D',
            fontSize: '24px',
            fontWeight: 'bold'
          }}
        >
          {isSignUp ? 'Create an Account' : 'Course Registration Login'}
        </h2>

        {error && (
          <p
            style={{
              color: '#e53e3e',
              backgroundColor: '#fff5f5',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '14px',
              border: '1px solid #fed7d7',
              marginTop: 0,
              marginBottom: '18px'
            }}
          >
            {error}
          </p>
        )}

        {success && (
          <p
            style={{
              color: '#276749',
              backgroundColor: '#f0fff4',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '14px',
              border: '1px solid #c6f6d5',
              marginTop: 0,
              marginBottom: '18px'
            }}
          >
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#2d3748'
                }}
              >
                Full Name:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Sami Parilti"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  boxSizing: 'border-box',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e0',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#2d3748'
              }}
            >
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="e.g. 2407080009@stamford.edu"
              style={{
                width: '100%',
                padding: '10px 12px',
                boxSizing: 'border-box',
                borderRadius: '6px',
                border: '1px solid #cbd5e0',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#2d3748'
              }}
            >
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              style={{
                width: '100%',
                padding: '10px 12px',
                boxSizing: 'border-box',
                borderRadius: '6px',
                border: '1px solid #cbd5e0',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#00072D',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>
      </div>

      {/* Under-the-Bubble Link */}
      <div style={{ marginTop: '18px', textAlign: 'center' }}>
        <p style={{ color: '#ffffff', fontSize: '14px', margin: 0 }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={handleToggleMode}
            style={{
              background: 'none',
              border: 'none',
              color: '#63b3ed',
              fontWeight: 'bold',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '14px',
              padding: '2px 4px'
            }}
          >
            {isSignUp ? 'Log in here' : 'Sign up here'}
          </button>
        </p>
      </div>
    </div>
  );
}
