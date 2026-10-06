import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [record, setRecord] = useState([]);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'registrations' | 'record'
  const [searchQuery, setSearchQuery] = useState('');
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
        setRegistrations(regRes.data || []);
        setRecord(recRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    }
    fetchData();
  }, []);

  const totalCredits = record.reduce((sum, item) => sum + (item.grade !== 'F' && item.grade !== 'W' ? (item.courseId?.credits || item.credits || 3) : 0), 0);
  const passedCoursesCount = record.filter(r => r.grade !== 'F' && r.grade !== 'W').length;
  const anyAddDropOpen = registrations.some(r => r.offeringId?.addDropOpen);

  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'ST';
  };

  // Filter registrations by search query
  const filteredRegistrations = registrations.filter((reg) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const code = (reg.offeringId?.courseId?.code || reg.courseCode || '').toLowerCase();
    const title = (reg.offeringId?.courseId?.title || reg.courseTitle || '').toLowerCase();
    const instructor = (reg.offeringId?.instructor || '').toLowerCase();
    return code.includes(q) || title.includes(q) || instructor.includes(q);
  });

  // Filter record by search query
  const filteredRecord = record.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const code = (item.courseId?.code || item.code || '').toLowerCase();
    const title = (item.courseId?.title || item.title || '').toLowerCase();
    const term = (item.term || '').toLowerCase();
    return code.includes(q) || title.includes(q) || term.includes(q);
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

            {/* Current User Badge & Logout */}
            <div className="flex items-center space-x-4">
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Metric Summary Cards */}
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
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Courses Passed</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{passedCoursesCount}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed successfully</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Add/Drop Status</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {anyAddDropOpen ? 'Window Open' : 'Closed'}
              </h3>
              <p className={`text-xs font-medium mt-1 ${anyAddDropOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {anyAddDropOpen ? '● Advising requests open' : 'Window currently closed'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${anyAddDropOpen ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </section>

        {/* View Switcher Tabs & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="inline-flex p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              All Sections
            </button>
            <button
              onClick={() => setActiveTab('registrations')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'registrations'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Current Registrations ({registrations.length})
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'record'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Academic Record ({record.length})
            </button>
          </div>

          {/* Quick Search */}
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

        {/* SECTION 1: CURRENT TERM REGISTRATIONS */}
        {(activeTab === 'all' || activeTab === 'registrations') && (
          <div className="bg-white dark:bg-gray-800 relative shadow-xl sm:rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header / Title Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                  📚
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Current Term Registrations
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Courses currently enrolled in for the active semester
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
                {registrations.length} Enrolled Courses
              </span>
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
                    <th scope="col" className="px-6 py-3.5 font-semibold">Add/Drop Status</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="font-medium text-gray-600 dark:text-gray-300">
                            {searchQuery ? 'No matching registrations found.' : 'You have not registered in any courses for this term yet.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((reg) => {
                      const offering = reg.offeringId;
                      const courseCode = offering?.courseId?.code || reg.courseCode || 'N/A';
                      const courseTitle = offering?.courseId?.title || reg.courseTitle || 'Untitled Course';
                      const isOpen = offering?.addDropOpen;

                      return (
                        <tr key={reg._id} className="bg-white dark:bg-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {courseCode}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {courseTitle}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Sec {offering?.section || reg.section || '1'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900 dark:text-white font-medium flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {offering?.day} {offering?.startTime} - {offering?.endTime}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              📍 {offering?.room || 'TBA'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                            {offering?.instructor || 'Staff'}
                          </td>
                          <td className="px-6 py-4">
                            {isOpen ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Window Open
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                Closed
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isOpen ? (
                              <button
                                onClick={() => setSelectedOffering(offering)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800 shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Request Add/Drop</span>
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No actions</span>
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

        {/* SECTION 2: ACADEMIC RECORD / TRANSCRIPT */}
        {(activeTab === 'all' || activeTab === 'record') && (
          <div className="bg-white dark:bg-gray-800 relative shadow-xl sm:rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header / Title Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                  📜
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Academic Record & History
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cumulative course grades and credit verification
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                Total Earned: {totalCredits} Credits
              </span>
            </div>

            {/* Table */}
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
                  {filteredRecord.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="font-medium text-gray-600 dark:text-gray-300">
                            {searchQuery ? 'No matching course history found.' : 'No academic history recorded yet.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecord.map((item) => {
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
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Passed
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
      </main>

      {/* FLOWBITE ADD/DROP REQUEST MODAL */}
      {selectedOffering && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full p-6 space-y-5 animate-scale-up">
            {/* Modal Header */}
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

            {/* Course Context Pill */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-blue-900 dark:text-blue-300">Course Target: </span>
                <span className="text-blue-700 dark:text-blue-400">{selectedOffering.courseId?.code || 'Course'} - {selectedOffering.courseId?.title || ''}</span>
              </div>
              <span className="px-2 py-0.5 rounded font-bold bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-200">
                Sec {selectedOffering.section || '1'}
              </span>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 font-bold text-xs flex items-center justify-center">1</span>
                <p>
                  Download and complete the official university{' '}
                  <a href="/add-drop-request-form.pdf" download className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-700">
                    Add/Drop Request form (PDF)
                  </a>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 font-bold text-xs flex items-center justify-center">2</span>
                <p>
                  Fill in your student ID (<strong className="text-gray-900 dark:text-white">{user.studentId}</strong>), full name, term, and desired course section changes.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 font-bold text-xs flex items-center justify-center">3</span>
                <p>
                  Send an email to your academic advisor at{' '}
                  <strong className="text-gray-900 dark:text-white">{selectedOffering.advisorEmail || 'advisor@stamford.edu'}</strong> with the signed form attached.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setSelectedOffering(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <a
                href={`mailto:${selectedOffering.advisorEmail || 'advisor@stamford.edu'}?subject=${encodeURIComponent(`Add/Drop Request - ${user.studentId} - ${selectedOffering.courseId?.code}`)}`}
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
