import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function LoginPage() {
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('Contact your administrator to reset your password.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // Manage Remember Me preference
    if (rememberMe) {
      localStorage.setItem('remembered_email', cleanEmail);
    } else {
      localStorage.removeItem('remembered_email');
    }

    try {
      const { data } = await API.post('/auth/login', { email: cleanEmail, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/' + data.user.role);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`min-h-screen ${isDark ? 'bg-[#140413]' : 'bg-[#6D1E61]'} flex flex-col items-center justify-center px-4 py-8 antialiased transition-colors duration-200 relative`}>
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setIsDark(!isDark)}
          type="button"
          className="p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-1.5 border border-white/10"
          title="Toggle Dark Option"
        >
          {isDark ? (
            <>
              <svg className="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold">Light</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              <span className="text-xs font-semibold">Dark</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center mb-6 text-2xl font-semibold text-white tracking-tight">
        <div className="p-2 mr-3 bg-blue-600 rounded-xl shadow-md flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        </div>
        <span>Stamford Portal</span>
      </div>

      {/* Main Flowbite Form Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 p-8 sm:p-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Course Registration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sign in with your university account
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="flex items-center p-3.5 mb-5 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200 dark:bg-gray-700 dark:text-red-400 dark:border-red-800" role="alert">
            <svg className="flex-shrink-0 inline w-4 h-4 mr-2.5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium flex-1">{error}</span>
          </div>
        )}

        {/* Success Alert Banner */}
        {success && (
          <div className="flex items-center p-3.5 mb-5 text-sm text-green-800 rounded-lg bg-green-50 border border-green-200 dark:bg-gray-700 dark:text-green-400 dark:border-green-800" role="alert">
            <svg className="flex-shrink-0 inline w-4 h-4 mr-2.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium flex-1">{success}</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Email Address Input */}
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@stamford.edu"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>
          </div>

          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
              />
              <label htmlFor="remember" className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                Remember me
              </label>
            </div>
            <a
              href="#forgot-password"
              onClick={handleForgotPassword}
              className="font-medium text-blue-600 hover:underline dark:text-blue-400 text-sm"
            >
              Forgot password?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-3 text-center transition duration-150 ease-in-out dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              'Log In'
            )}
          </button>

          <p className="text-sm text-center text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
            Accounts are created by the administrator.
          </p>
        </form>
      </div>
    </section>
  );
}
