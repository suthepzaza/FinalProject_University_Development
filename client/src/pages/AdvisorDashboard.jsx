import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function AdvisorDashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [activeTab, setActiveTab] = useState('offerings'); // 'offerings' | 'registration'
  const [term, setTerm] = useState('2026-1');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ==========================================
  // TAB 1: OFFERINGS STATE
  // ==========================================
  const [offerings, setOfferings] = useState([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  const [showAddOfferingModal, setShowAddOfferingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'closed'
  const [newOffering, setNewOffering] = useState({
    code: '',
    title: '',
    section: '1',
    day: 'Monday',
    startTime: '09:00',
    endTime: '12:00',
    room: 'Room 401',
    instructor: currentUser.name || 'Dr. Advisor',
    seats: 30
  });

  // ==========================================
  // TAB 2: STUDENT REGISTRATION & RULES STATE
  // ==========================================
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentRecord, setStudentRecord] = useState([]);
  const [studentRegistrations, setStudentRegistrations] = useState([]);
  const [eligibilityData, setEligibilityData] = useState({ eligible: [], excluded: [] });
  const [loadingStudentData, setLoadingStudentData] = useState(false);

  // ------------------------------------------
  // INITIAL LOAD
  // ------------------------------------------
  useEffect(() => {
    fetchOfferings();
    fetchStudents();
  }, [term]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ------------------------------------------
  // OFFERINGS API CALLS
  // ------------------------------------------
  const fetchOfferings = async () => {
    try {
      setLoadingOfferings(true);
      setError('');
      const res = await API.get(`/offerings?term=${term}`);
      setOfferings(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load course offerings');
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handleCreateOffering = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    try {
      await API.post('/offerings', {
        ...newOffering,
        term,
        seats: Number(newOffering.seats)
      });
      setSuccessMessage(`Opened section ${newOffering.section} for ${newOffering.code} successfully.`);
      setShowAddOfferingModal(false);
      setNewOffering({
        code: '',
        title: '',
        section: '1',
        day: 'Monday',
        startTime: '09:00',
        endTime: '12:00',
        room: 'Room 401',
        instructor: currentUser.name || 'Dr. Advisor',
        seats: 30
      });
      fetchOfferings();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create course offering');
    }
  };

  const handleToggleAddDrop = async (offering) => {
    setError('');
    setSuccessMessage('');
    try {
      const offeringId = offering._id || offering.id;
      const newStatus = !offering.addDropOpen;
      await API.patch(`/offerings/${offeringId}`, { addDropOpen: newStatus });
      setSuccessMessage(`Add/Drop window for ${offering.courseId?.code || offering.code || 'course'} is now ${newStatus ? 'OPEN' : 'CLOSED'}.`);
      fetchOfferings();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update Add/Drop status');
    }
  };

  const handleDeleteOffering = async (offeringId) => {
    if (!window.confirm('Are you sure you want to remove this course offering?')) return;
    setError('');
    setSuccessMessage('');
    try {
      await API.delete(`/offerings/${offeringId}`);
      setSuccessMessage('Offering removed.');
      fetchOfferings();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete offering');
    }
  };

  // ------------------------------------------
  // REGISTRATION & RULES ENGINE API CALLS
  // ------------------------------------------
  const fetchStudents = async () => {
    try {
      const res = await API.get('/users?role=student');
      setStudents(res.data);
    } catch (err) {
      try {
        const fallbackRes = await API.get('/students');
        setStudents(fallbackRes.data);
      } catch (e) {
        console.error('Failed to load students list', e);
      }
    }
  };

  const handleSelectStudent = async (studentId) => {
    setSelectedStudentId(studentId);
    if (!studentId) {
      setStudentRecord([]);
      setStudentRegistrations([]);
      setEligibilityData({ eligible: [], excluded: [] });
      return;
    }

    try {
      setLoadingStudentData(true);
      setError('');

      const [recordRes, eligibleRes] = await Promise.all([
        API.get(`/students/${studentId}/record`),
        API.get(`/students/${studentId}/eligible?term=${term}`)
      ]);

      setStudentRecord(recordRes.data || []);

      if (Array.isArray(eligibleRes.data)) {
        const eligible = eligibleRes.data.filter((item) => item.isEligible !== false);
        const excluded = eligibleRes.data.filter((item) => item.isEligible === false);
        setEligibilityData({ eligible, excluded });
      } else {
        setEligibilityData({
          eligible: eligibleRes.data.eligible || [],
          excluded: eligibleRes.data.excluded || []
        });
      }

      try {
        const regRes = await API.get(`/registrations?studentId=${studentId}&term=${term}`);
        setStudentRegistrations(regRes.data || []);
      } catch {
        setStudentRegistrations([]);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load student eligibility data');
    } finally {
      setLoadingStudentData(false);
    }
  };

  const handleRegisterStudent = async (offeringId) => {
    if (!selectedStudentId) return;
    setError('');
    setSuccessMessage('');
    try {
      await API.post('/registrations', {
        studentId: selectedStudentId,
        offeringId: offeringId,
        term: term
      });
      setSuccessMessage('Student registered successfully for the course.');
      handleSelectStudent(selectedStudentId);
      fetchOfferings();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to register student');
    }
  };

  const handleRemoveRegistration = async (registrationId) => {
    if (!window.confirm('Remove this course from student registration?')) return;
    setError('');
    setSuccessMessage('');
    try {
      await API.delete(`/registrations/${registrationId}`);
      setSuccessMessage('Course removed from student registration.');
      handleSelectStudent(selectedStudentId);
      fetchOfferings();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to remove registration');
    }
  };

  const totalEarnedCredits = studentRecord.reduce(
    (sum, r) => sum + (r.grade !== 'F' && r.grade !== 'W' ? (r.courseId?.credits || r.credits || 3) : 0),
    0
  );

  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'AD';
  };

  // Metrics
  const totalCapacity = offerings.reduce((sum, o) => sum + (o.seats || 30), 0);
  const totalTakenSeats = offerings.reduce((sum, o) => sum + (o.seatsTaken || 0), 0);
  const openWindowsCount = offerings.filter(o => o.addDropOpen).length;

  // Filter offerings
  const filteredOfferings = offerings.filter((off) => {
    const code = (off.courseId?.code || off.code || '').toLowerCase();
    const title = (off.courseId?.title || off.title || '').toLowerCase();
    const instructor = (off.instructor || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || code.includes(q) || title.includes(q) || instructor.includes(q);

    if (statusFilter === 'open') return matchesSearch && off.addDropOpen;
    if (statusFilter === 'closed') return matchesSearch && !off.addDropOpen;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#122666] text-slate-100 font-sans antialiased">
      {/* Top Navbar Header */}
      <header className="border-b border-slate-700/60 bg-[#0d1c4f]/80 backdrop-blur-md sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Branding & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none flex items-center gap-2">
                  Academic Advisor Dashboard
                  <span className="hidden sm:inline-flex text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Rules Engine
                  </span>
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Term offerings, prerequisite engine validation, and student registration
                </p>
              </div>
            </div>

            {/* Term Switcher, User Pill & Logout */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Term Selector */}
              <div className="relative">
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs sm:text-sm font-semibold rounded-lg focus:ring-blue-400 focus:border-blue-400 block px-3 py-1.5 transition-colors cursor-pointer"
                >
                  <option value="2026-1" className="text-gray-900">Term 2026-1</option>
                  <option value="2026-2" className="text-gray-900">Term 2026-2</option>
                </select>
              </div>

              {/* Current User Pill */}
              <div className="hidden md:flex items-center space-x-3 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-bold text-xs">
                  {getInitials(currentUser.name, currentUser.email)}
                </div>
                <div className="text-left text-xs leading-tight">
                  <p className="font-semibold text-white">{currentUser.name || currentUser.email}</p>
                  <p className="text-cyan-300 font-bold uppercase tracking-wider text-[10px]">
                    Role: Advisor
                  </p>
                </div>
              </div>

              {/* Logout Button */}
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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Metric Summary Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offerings</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{offerings.length}</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">● Term {term} active</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Advisees</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{students.length}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enrolled students</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Seats</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalCapacity}</h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">{totalTakenSeats} seats reserved</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Add/Drop Windows</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{openWindowsCount}</h3>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Sections currently open</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </section>

        {/* Dismissible Alert Banners */}
        {error && (
          <div className="flex items-center p-4 text-sm text-red-800 rounded-xl bg-red-50 border border-red-200 shadow-sm animate-fade-in" role="alert">
            <svg className="flex-shrink-0 inline w-5 h-5 mr-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 font-medium">{error}</div>
            <button
              onClick={() => setError('')}
              className="ml-auto -mx-1.5 -my-1.5 bg-red-50 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1.5 hover:bg-red-100 inline-flex items-center justify-center h-8 w-8"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center p-4 text-sm text-green-800 rounded-xl bg-green-50 border border-green-200 shadow-sm animate-fade-in" role="alert">
            <svg className="flex-shrink-0 inline w-5 h-5 mr-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 font-medium">{successMessage}</div>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-auto -mx-1.5 -my-1.5 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-100 inline-flex items-center justify-center h-8 w-8"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* View Switcher Tabs Bar */}
        <div className="inline-flex p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('offerings')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'offerings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📚 Course Offerings</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/20 text-white">
              {offerings.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('registration')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'registration'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🎓 Register Students & Rules Engine</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: COURSE OFFERINGS MANAGEMENT                       */}
        {/* ======================================================== */}
        {activeTab === 'offerings' && (
          <div className="bg-white dark:bg-gray-800 relative shadow-xl sm:rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Flowbite Action Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 sm:p-5 gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {/* Search Box & Status Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by course code, title, or instructor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 transition-colors placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="shrink-0">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-8 transition-colors cursor-pointer"
                  >
                    <option value="all">All Windows</option>
                    <option value="open">Window Open ({openWindowsCount})</option>
                    <option value="closed">Window Closed ({offerings.length - openWindowsCount})</option>
                  </select>
                </div>
              </div>

              {/* Open Course Offering Button (Flowbite Primary Action) */}
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddOfferingModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2.5 transition-all shadow-sm hover:shadow"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Open Course Offering</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Course</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Section</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Schedule & Room</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Instructor</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Live Seats</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Add/Drop Status</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loadingOfferings ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          <p className="font-medium">Loading course offerings...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOfferings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <p className="font-medium text-gray-600 dark:text-gray-300">
                            {searchQuery ? 'No course offerings match your filter.' : `No course offerings created for Term ${term} yet.`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOfferings.map((off) => {
                      const courseCode = off.courseId?.code || off.code;
                      const courseTitle = off.courseId?.title || off.title;
                      const seatsTotal = off.seats || 30;
                      const seatsTaken = off.seatsTaken || 0;
                      const seatsRemaining = seatsTotal - seatsTaken;
                      const isFull = seatsRemaining <= 0;

                      return (
                        <tr key={off._id || off.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {courseCode}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {courseTitle}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Sec {off.section}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900 dark:text-white font-medium flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {off.day} {off.startTime} - {off.endTime}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              📍 {off.room}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {off.instructor}
                          </td>
                          <td className="px-6 py-4">
                            <div className={`font-bold ${isFull ? 'text-red-600' : 'text-blue-600 dark:text-blue-400'}`}>
                              {seatsTaken} / {seatsTotal} taken
                            </div>
                            <span className={`text-xs font-semibold ${isFull ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {isFull ? 'Full (0 remaining)' : `${seatsRemaining} seats remaining`}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {off.addDropOpen ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Window Open
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                Window Closed
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleToggleAddDrop(off)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border shadow-sm ${
                                  off.addDropOpen
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                }`}
                              >
                                {off.addDropOpen ? 'Close Window' : 'Open Window'}
                              </button>
                              <button
                                onClick={() => handleDeleteOffering(off._id || off.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-lg transition-colors border border-red-200 dark:border-red-800 shadow-sm"
                                title="Remove Offering"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Remove</span>
                              </button>
                            </div>
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

        {/* ======================================================== */}
        {/* TAB 2: STUDENT REGISTRATION & RULES ENGINE               */}
        {/* ======================================================== */}
        {activeTab === 'registration' && (
          <div className="space-y-6">
            {/* Student Selector Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Select Student to Advise & Register
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    The registration rules engine will evaluate prerequisite eligibility in real time
                  </p>
                </div>
              </div>

              <div className="min-w-[320px]">
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleSelectStudent(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 transition-colors cursor-pointer"
                >
                  <option value="">-- Choose a Student --</option>
                  {students.map((st) => (
                    <option key={st._id || st.id} value={st._id || st.id}>
                      {st.name} ({st.studentId || 'No ID'}) - {st.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedStudentId ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-dashed border-gray-300 dark:border-gray-700 shadow-sm">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  No Student Selected
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1">
                  Please choose a student from the dropdown above to inspect their academic record, active enrollments, and eligible course offerings.
                </p>
              </div>
            ) : loadingStudentData ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
                <svg className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Analyzing student eligibility, past grades, and timetable clash rules...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 2-Column Summary Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Card 1: Past Academic Record */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📜</span>
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          Past Academic Record
                        </h4>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Earned: {totalEarnedCredits} Credits
                      </span>
                    </div>

                    <div className="overflow-y-auto max-h-56 p-1">
                      {studentRecord.length === 0 ? (
                        <p className="p-6 text-center text-sm text-gray-400">
                          No previous course records found.
                        </p>
                      ) : (
                        <table className="w-full text-xs text-left text-gray-500 dark:text-gray-400">
                          <thead className="text-[11px] uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-4 py-2 font-semibold">Term</th>
                              <th className="px-4 py-2 font-semibold">Course</th>
                              <th className="px-4 py-2 font-semibold text-center">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {studentRecord.map((rec) => (
                              <tr key={rec._id || rec.id} className={rec.grade === 'F' ? 'bg-red-50/50 dark:bg-red-950/20' : ''}>
                                <td className="px-4 py-2 font-medium">{rec.term}</td>
                                <td className="px-4 py-2 font-semibold text-gray-900 dark:text-white">
                                  {rec.courseId?.code || rec.code} - {rec.courseId?.title || rec.title}
                                </td>
                                <td className="px-4 py-2 text-center font-bold">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${rec.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                                    {rec.grade} {rec.grade === 'F' && '⚠️'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Current Term Registrations */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📅</span>
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          Current Term Registrations ({term})
                        </h4>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {studentRegistrations.length} Enrolled
                      </span>
                    </div>

                    <div className="overflow-y-auto max-h-56 p-1">
                      {studentRegistrations.length === 0 ? (
                        <p className="p-6 text-center text-sm text-gray-400">
                          Not registered in any courses for {term} yet.
                        </p>
                      ) : (
                        <table className="w-full text-xs text-left text-gray-500 dark:text-gray-400">
                          <thead className="text-[11px] uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-4 py-2 font-semibold">Course</th>
                              <th className="px-4 py-2 font-semibold">Sec</th>
                              <th className="px-4 py-2 font-semibold">Time</th>
                              <th className="px-4 py-2 font-semibold text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {studentRegistrations.map((reg) => (
                              <tr key={reg._id || reg.id}>
                                <td className="px-4 py-2 font-bold text-gray-900 dark:text-white">
                                  {reg.offeringId?.courseId?.code || reg.courseCode}
                                </td>
                                <td className="px-4 py-2 font-medium">Sec {reg.offeringId?.section || reg.section}</td>
                                <td className="px-4 py-2">{reg.offeringId?.day} {reg.offeringId?.startTime}</td>
                                <td className="px-4 py-2 text-center">
                                  <button
                                    onClick={() => handleRemoveRegistration(reg._id || reg.id)}
                                    className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded transition-colors"
                                  >
                                    Drop
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>

                {/* RULES ENGINE SECTION (Section 6) */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6 space-y-6">
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">⚙️</span>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Available Course Offerings & Rules Engine
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Evaluates: <strong>Offered This Term</strong>, <strong>Not Already Passed</strong>, <strong>Retake Priority (F)</strong>, <strong>Seats Available</strong>, and <strong>No Timetable Clashes</strong>.
                    </p>
                  </div>

                  {/* 1. ELIGIBLE COURSES */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <span>✅</span> Eligible Courses (Ready to Register)
                      </h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {eligibilityData.eligible.length} Available
                      </span>
                    </div>

                    {eligibilityData.eligible.length === 0 ? (
                      <p className="p-4 text-xs bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-500 dark:text-gray-400 text-center">
                        No courses currently eligible for registration for this student.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs text-left text-gray-500 dark:text-gray-400">
                          <thead className="text-[11px] uppercase bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-b border-emerald-100 dark:border-emerald-800">
                            <tr>
                              <th className="px-4 py-2.5 font-semibold">Course</th>
                              <th className="px-4 py-2.5 font-semibold">Section</th>
                              <th className="px-4 py-2.5 font-semibold">Schedule & Room</th>
                              <th className="px-4 py-2.5 font-semibold">Seats Remaining</th>
                              <th className="px-4 py-2.5 font-semibold text-center">Flags</th>
                              <th className="px-4 py-2.5 font-semibold text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {[...eligibilityData.eligible]
                              .sort((a, b) => (b.isRetake ? 1 : 0) - (a.isRetake ? 1 : 0))
                              .map((item) => {
                                const off = item.offering || item;
                                const courseCode = off.courseId?.code || off.code;
                                const courseTitle = off.courseId?.title || off.title;
                                const seatsRemaining = (off.seats || 30) - (off.seatsTaken || 0);

                                return (
                                  <tr
                                    key={off._id || off.id}
                                    className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors ${
                                      item.isRetake ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                                    }`}
                                  >
                                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                                      {courseCode} - {courseTitle}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                        Sec {off.section}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                      {off.day} {off.startTime}-{off.endTime} ({off.room})
                                    </td>
                                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                                      {seatsRemaining} seats left
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {item.isRetake && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                          ⚠️ Retake required
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => handleRegisterStudent(off._id || off.id)}
                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all focus:ring-4 focus:ring-emerald-300"
                                      >
                                        Register
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 2. EXCLUDED / BLOCKED COURSES */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <span>🚫</span> Excluded / Blocked Offerings
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Academic justification provided per Section 6 rubric
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {eligibilityData.excluded.length} Blocked
                      </span>
                    </div>

                    {eligibilityData.excluded.length === 0 ? (
                      <p className="p-4 text-xs bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-500 dark:text-gray-400 text-center">
                        No offerings are currently blocked or excluded.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 opacity-90">
                        <table className="w-full text-xs text-left text-gray-500 dark:text-gray-400">
                          <thead className="text-[11px] uppercase bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-4 py-2.5 font-semibold">Course</th>
                              <th className="px-4 py-2.5 font-semibold">Section</th>
                              <th className="px-4 py-2.5 font-semibold">Schedule</th>
                              <th className="px-4 py-2.5 font-semibold">Reason for Exclusion</th>
                              <th className="px-4 py-2.5 font-semibold text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {eligibilityData.excluded.map((item, idx) => {
                              const off = item.offering || item;
                              const courseCode = off.courseId?.code || off.code;
                              const courseTitle = off.courseId?.title || off.title;

                              return (
                                <tr key={idx} className="bg-gray-50/50 dark:bg-gray-800/50">
                                  <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                                    {courseCode} - {courseTitle}
                                  </td>
                                  <td className="px-4 py-3">Sec {off.section || '—'}</td>
                                  <td className="px-4 py-3">
                                    {off.day ? `${off.day} ${off.startTime}-${off.endTime}` : '—'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                      item.reason?.toLowerCase().includes('clash')
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                        : item.reason?.toLowerCase().includes('passed')
                                        ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                    }`}>
                                      🛑 {item.reason || 'Not eligible for term'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center text-gray-400 font-semibold">
                                    Blocked
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE OFFERING FLOWBITE MODAL */}
      {showAddOfferingModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full p-6 space-y-4 animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Open New Course Offering ({term})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Create a section and allocate classroom capacity
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOfferingModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateOffering} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-900 dark:text-white">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSC220"
                    value={newOffering.code}
                    onChange={(e) => setNewOffering({ ...newOffering, code: e.target.value.toUpperCase() })}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-1 text-xs font-medium text-gray-900 dark:text-white">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Web Development II"
                    value={newOffering.title}
                    onChange={(e) => setNewOffering({ ...newOffering, title: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-900 dark:text-white">
                    Section Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOffering.section}
                    onChange={(e) => setNewOffering({ ...newOffering, section: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-900 dark:text-white">
                    Total Seats *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newOffering.seats}
                    onChange={(e) => setNewOffering({ ...newOffering, seats: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-900 dark:text-white">
                    Day *
                  </label>
                  <select
                    value={newOffering.day}
                    onChange={(e) => setNewOffering({ ...newOffering, day: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 cursor-pointer"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-900 dark:text-white">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newOffering.startTime}
                    onChange={(e) => setNewOffering({ ...newOffering, startTime: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-900 dark:text-white">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newOffering.endTime}
                    onChange={(e) => setNewOffering({ ...newOffering, endTime: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-900 dark:text-white">
                    Room / Lab *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lab 3 / Room 401"
                    value={newOffering.room}
                    onChange={(e) => setNewOffering({ ...newOffering, room: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-900 dark:text-white">
                    Instructor *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOffering.instructor}
                    onChange={(e) => setNewOffering({ ...newOffering, instructor: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddOfferingModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:ring-4 focus:ring-blue-300 transition-all"
                >
                  <span>Open Offering</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
