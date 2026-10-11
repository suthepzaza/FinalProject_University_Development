import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [record, setRecord] = useState([]);
  const [advisorEmail, setAdvisorEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'registrations' | 'record'
  const [searchQuery, setSearchQuery] = useState('');

  // Academic record view & sorting controls
  const [selectedYear, setSelectedYear] = useState('all');
  const [recordSortOrder, setRecordSortOrder] = useState('year-desc'); // 'year-desc' | 'year-asc' | 'grade-desc' | 'code-asc'
  const [recordViewMode, setRecordViewMode] = useState('grouped'); // 'grouped' | 'table'

  // Dark mode option
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [regRes, recRes, profileRes] = await Promise.all([
        API.get('/me/registrations'),
        API.get('/me/record'),
        API.get('/me/profile')
      ]);
      setRegistrations(regRes.data || []);
      setRecord(recRes.data || []);
      setAdvisorEmail(profileRes.data?.advisorId?.email || '');
    } catch (err) {
      setStatusMessage({
        text: err.response?.data?.error || 'Failed to load your dashboard. Please refresh the page.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const totalCredits = record.reduce((sum, item) => sum + (item.grade !== 'F' && item.grade !== 'W' ? (item.courseId?.credits || item.credits || 3) : 0), 0);
  const retakeCount = record.filter(r => r.grade === 'F').length;
  const anyAddDropOpen = registrations.some(r => r.offeringId?.addDropOpen);
  // Add/drop requests go to the student's assigned advisor; the section's advisor is the fallback
  const requestEmail = advisorEmail || selectedOffering?.advisorEmail || 'advisor@stamford.edu';
  const requestSubject = `Add/Drop Request - ${user.studentId} - ${selectedOffering?.courseId?.code || selectedOffering?.code || ''}`;

  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'ST';
  };

  // Filter registrations by search query
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const code = (reg.offeringId?.courseId?.code || reg.courseCode || '').toLowerCase();
      const title = (reg.offeringId?.courseId?.title || reg.courseTitle || '').toLowerCase();
      const instructor = (reg.offeringId?.instructor || '').toLowerCase();
      return code.includes(q) || title.includes(q) || instructor.includes(q);
    });
  }, [registrations, searchQuery]);

  // Dynamic list of unique academic years from records
  const availableYears = useMemo(() => {
    const set = new Set();
    record.forEach(item => {
      if (item.term) {
        const year = item.term.split('-')[0];
        if (year) set.add(year);
      }
    });
    return Array.from(set).sort().reverse();
  }, [record]);

  // Filtered & sorted academic records
  const processedRecords = useMemo(() => {
    let list = record.filter((item) => {
      const code = (item.courseId?.code || item.code || '').toLowerCase();
      const title = (item.courseId?.title || item.title || '').toLowerCase();
      const term = (item.term || '').toLowerCase();
      const matchesSearch = !searchQuery || code.includes(searchQuery.toLowerCase()) || title.includes(searchQuery.toLowerCase()) || term.includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedYear !== 'all') {
        const itemYear = item.term ? item.term.split('-')[0] : '';
        return itemYear === selectedYear;
      }
      return true;
    });

    const gradePoints = { 'A': 4, 'B+': 3.5, 'B': 3, 'C+': 2.5, 'C': 2, 'D+': 1.5, 'D': 1, 'F': 0, 'W': -1 };

    list.sort((a, b) => {
      if (recordSortOrder === 'year-desc') {
        return (b.term || '').localeCompare(a.term || '');
      }
      if (recordSortOrder === 'year-asc') {
        return (a.term || '').localeCompare(b.term || '');
      }
      if (recordSortOrder === 'grade-desc') {
        return (gradePoints[b.grade] ?? 0) - (gradePoints[a.grade] ?? 0);
      }
      if (recordSortOrder === 'code-asc') {
        const codeA = a.courseId?.code || a.code || '';
        const codeB = b.courseId?.code || b.code || '';
        return codeA.localeCompare(codeB);
      }
      return 0;
    });

    return list;
  }, [record, searchQuery, selectedYear, recordSortOrder]);

  // Records grouped by term: { "2024-1": [...], "2024-2": [...] }
  const recordsByTerm = useMemo(() => {
    const map = {};
    processedRecords.forEach(item => {
      const term = item.term || 'Other';
      if (!map[term]) map[term] = [];
      map[term].push(item);
    });

    const sortedTerms = Object.keys(map).sort((a, b) => {
      return recordSortOrder === 'year-asc' ? a.localeCompare(b) : b.localeCompare(a);
    });

    return sortedTerms.map(term => ({
      term,
      courses: map[term],
      totalCredits: map[term].reduce((acc, c) => acc + (c.grade !== 'F' && c.grade !== 'W' ? (c.courseId?.credits || c.credits || 3) : 0), 0)
    }));
  }, [processedRecords, recordSortOrder]);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#140413]' : 'bg-[#6D1E61]'} text-slate-100 font-sans antialiased transition-colors duration-200`}>
      <header className={`border-b ${isDark ? 'border-purple-950/60 bg-[#1e071c]/90' : 'border-purple-950/30 bg-[#4E1546]/85'} backdrop-blur-md sticky top-0 z-30 shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none flex items-center gap-2">
                  Student Dashboard
                  <span className="hidden sm:inline-flex text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Student Portal
                  </span>
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Course registrations, class schedules, and academic record
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4">
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
                    <span className="text-xs font-semibold hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                    <span className="text-xs font-semibold hidden sm:inline">Dark</span>
                  </>
                )}
              </button>

              <div className="hidden md:flex items-center space-x-3 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-bold text-xs">
                  {getInitials(user.name, user.email)}
                </div>
                <div className="text-left text-xs leading-tight">
                  <p className="font-semibold text-white">{user.name || user.email}</p>
                  <p className="text-cyan-300 font-bold uppercase tracking-wider text-[10px]">
                    ID: {user.studentId || 'N/A'} (Student)
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:ring-4 focus:ring-red-500/30 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading && (
          <div className="p-3 rounded-xl text-sm font-medium bg-white/10 text-slate-200 border border-white/10">
            Loading your registration and academic record...
          </div>
        )}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between shadow-lg border transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                : 'bg-red-500/20 text-red-200 border-red-500/40'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{statusMessage.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs hover:underline opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Earned Credits</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalCredits}</h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">● Degree progress</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Courses</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{registrations.length}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enrolled this term</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Retake Required</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{retakeCount}</h3>
              <p className={`text-xs font-medium mt-1 ${retakeCount ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {retakeCount ? 'Course(s) graded F' : 'No failed courses'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Course Status</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {anyAddDropOpen ? 'Add/Drop Open' : 'Add/Drop Closed'}
              </h3>
              <p className={`text-xs font-medium mt-1 ${anyAddDropOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {anyAddDropOpen ? '● Requests accepted for some courses' : 'Term 2026-1 in session'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${anyAddDropOpen ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="inline-flex p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              All Sections
            </button>
            <button
              onClick={() => setActiveTab('registrations')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'registrations'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              My Registrations ({registrations.length})
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'record'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Academic Record ({record.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Filter courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-sm rounded-lg focus:ring-blue-400 focus:border-blue-400 block w-full pl-10 p-2.5 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-300 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* CURRENT TERM REGISTRATIONS SECTION */}
        {(activeTab === 'all' || activeTab === 'registrations') && (
          <div className="bg-white dark:bg-gray-800 relative shadow-xl sm:rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                  📚
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Current Term Enrolled Classes
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Courses you are currently registered for in Term 2026-1
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {registrations.length} registered classes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Course Code</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Course Title</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Section</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Instructor</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Schedule & Room</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold text-center">Add/Drop Status</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold text-center">Add/Drop Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No matching registrations found.' : 'You have not registered in any courses for this term yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((registration) => {
                      const offering = registration.offeringId || {};
                      const isOpen = offering.addDropOpen;
                      const code = offering.courseId?.code || registration.courseCode || 'N/A';
                      const title = offering.courseId?.title || registration.courseTitle || 'Course';

                      return (
                        <tr key={registration._id} className="bg-white dark:bg-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                            {code}
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">
                            {title}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                              Sec {offering.section || '1'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                            {offering.instructor || 'Staff'}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="text-gray-900 dark:text-white font-medium">
                              {offering.day} {offering.startTime} - {offering.endTime}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">
                              {offering.room}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isOpen ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                  Add/Drop: Open
                                </span>
                                {offering.addDropClosesAt && (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                                    Closes {offering.addDropClosesAt.slice(0, 10)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                Add/Drop: Closed
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isOpen ? (
                              <button
                                onClick={() => setSelectedOffering(offering)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                              >
                                Request add/drop
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Not available</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACADEMIC RECORD & HISTORY WITH YEAR SORT & GROUPING */}
        {(activeTab === 'all' || activeTab === 'record') && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-lg">
                  📜
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Academic Record & History
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Completed courses and grades, grouped by term
                  </p>
                </div>
              </div>

              {/* Sorting & Grouping Controls */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Year Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Filter Year:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Years</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>Year {year}</option>
                    ))}
                  </select>
                </div>

                {/* Sort Order Dropdown */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Sort:
                  </label>
                  <select
                    value={recordSortOrder}
                    onChange={(e) => setRecordSortOrder(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="year-desc">Year (Newest First)</option>
                    <option value="year-asc">Year (Oldest First)</option>
                    <option value="grade-desc">Grade (Highest First)</option>
                    <option value="code-asc">Course Code (A-Z)</option>
                  </select>
                </div>

                {/* View Mode Toggle: Grouped vs Table */}
                <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-700">
                  <button
                    type="button"
                    onClick={() => setRecordViewMode('grouped')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      recordViewMode === 'grouped'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                    }`}
                  >
                    Group by Term
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordViewMode('table')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      recordViewMode === 'table'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                    }`}
                  >
                    Flat Table
                  </button>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Total: {totalCredits} Credits
                </span>
              </div>
            </div>

            {/* GROUPED BY TERM VIEW */}
            {recordViewMode === 'grouped' ? (
              recordsByTerm.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                  No academic history found for the selected criteria.
                </div>
              ) : (
                recordsByTerm.map(({ term, courses, totalCredits: termCredits }) => (
                  <div
                    key={term}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
                  >
                    <div className="bg-gradient-to-r from-purple-900/10 to-blue-900/10 dark:from-purple-950/40 dark:to-blue-950/40 px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                          📅 Term {term}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          {courses.length} Courses
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Earned in {term}: {termCredits} Credits
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th scope="col" className="px-6 py-3 font-semibold">Term</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Course Code</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Course Title</th>
                            <th scope="col" className="px-6 py-3 font-semibold text-center">Grade</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {courses.map((item) => {
                            const isF = item.grade === 'F';
                            const code = item.courseId?.code || item.code;
                            const title = item.courseId?.title || item.title;

                            return (
                              <tr
                                key={item._id}
                                className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors ${
                                  isF ? 'bg-red-50/40 dark:bg-red-950/20' : 'bg-white dark:bg-gray-800'
                                }`}
                              >
                                <td className="px-6 py-3.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                    {item.term}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5 font-bold text-gray-900 dark:text-white">
                                  {code}
                                </td>
                                <td className="px-6 py-3.5 text-gray-900 dark:text-white">
                                  {title}
                                </td>
                                <td className="px-6 py-3.5 text-center">
                                  <span
                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${
                                      isF
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                    }`}
                                  >
                                    {item.grade}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5">
                                  {isF ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                                      ⚠️ Retake required
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      ✓ Passed
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* FLAT TABLE VIEW */
              <div className="bg-white dark:bg-gray-800 relative shadow-xl sm:rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3.5 font-semibold">Term</th>
                        <th scope="col" className="px-6 py-3.5 font-semibold">Course Code</th>
                        <th scope="col" className="px-6 py-3.5 font-semibold">Course Title</th>
                        <th scope="col" className="px-6 py-3.5 font-semibold text-center">Grade</th>
                        <th scope="col" className="px-6 py-3.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {processedRecords.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            No academic history recorded yet.
                          </td>
                        </tr>
                      ) : (
                        processedRecords.map((item) => {
                          const isF = item.grade === 'F';
                          const code = item.courseId?.code || item.code;
                          const title = item.courseId?.title || item.title;

                          return (
                            <tr
                              key={item._id}
                              className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors ${
                                isF ? 'bg-red-50/40 dark:bg-red-950/20' : 'bg-white dark:bg-gray-800'
                              }`}
                            >
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                  {item.term}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                {code}
                              </td>
                              <td className="px-6 py-4 text-gray-900 dark:text-white">
                                {title}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                                    isF
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                  }`}
                                >
                                  {item.grade}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {isF ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                                    ⚠️ Retake required
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    ✓ Passed
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add/Drop request modal */}
      {selectedOffering && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Add/Drop Request
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Official course change procedure
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOffering(null)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-blue-900 dark:text-blue-300">Course Target: </span>
                <span className="text-blue-700 dark:text-blue-400">{selectedOffering.courseId?.code || 'Course'} - {selectedOffering.courseId?.title || ''}</span>
                {selectedOffering.addDropClosesAt && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                    Add/Drop closes on: {selectedOffering.addDropClosesAt.slice(0, 10)}
                  </div>
                )}
              </div>
              <span className="px-2 py-0.5 rounded font-bold bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-200">
                Sec {selectedOffering.section || '1'}
              </span>
            </div>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 font-bold text-xs flex items-center justify-center">1</span>
                <p>
                  Download and open the{' '}
                  <a href="/add-drop-request-form.pdf" download className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-700">
                    Add/Drop Request form (PDF)
                  </a>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 font-bold text-xs flex items-center justify-center">2</span>
                <p>
                  Fill in your student ID (<strong className="text-gray-900 dark:text-white">{user.studentId}</strong>), name, term, and the course code and section you wish to add or drop.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 font-bold text-xs flex items-center justify-center">3</span>
                <p>State the reason for the request and sign the form.</p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 font-bold text-xs flex items-center justify-center">4</span>
                <p>
                  Email the completed form as an attachment to your advisor at{' '}
                  <strong className="text-gray-900 dark:text-white">{requestEmail}</strong>, using the subject line:{' '}
                  <code className="block mt-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs">{requestSubject}</code>
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 font-bold text-xs flex items-center justify-center">5</span>
                <p>Your advisor will confirm by email once the change is made.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setSelectedOffering(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <a
                href={`mailto:${requestEmail}?subject=${encodeURIComponent(requestSubject)}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:ring-4 focus:ring-blue-300 transition-all"
              >
                <span>✉️ Open Email Client</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
