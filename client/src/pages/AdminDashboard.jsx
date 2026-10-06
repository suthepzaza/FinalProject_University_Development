import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pagination state (Flowbite table footer pattern)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer & Modal states
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    studentId: '',
    password: '',
    active: true
  });
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/users');
      setUsers(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole, searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.studentId && u.studentId.toLowerCase().includes(query));
    return matchesRole && matchesSearch;
  });

  // Pagination calculations
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalUsers);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Stats calculation for dashboard overview
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const advisorCount = users.filter((u) => u.role === 'advisor').length;
  const studentCount = users.filter((u) => u.role === 'student').length;
  const activeCount = users.filter((u) => u.active !== false).length;

  // Open Create Drawer
  const openCreateDrawer = () => {
    setFormData({
      name: '',
      email: '',
      role: 'student',
      studentId: '',
      password: '',
      active: true
    });
    setError('');
    setSuccessMessage('');
    setShowCreateDrawer(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        password: formData.password,
        active: formData.active
      };
      if (formData.role === 'student') {
        payload.studentId = formData.studentId;
      }
      await API.post('/users', payload);
      setSuccessMessage('User account created successfully.');
      setShowCreateDrawer(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create user');
    }
  };

  // Open Edit Drawer
  const openEditDrawer = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'student',
      studentId: user.studentId || '',
      password: '',
      active: user.active !== false
    });
    setError('');
    setSuccessMessage('');
    setShowEditDrawer(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError('');
    setSuccessMessage('');
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        active: formData.active
      };
      if (formData.role === 'student') {
        payload.studentId = formData.studentId;
      }
      if (formData.password) {
        payload.password = formData.password;
      }
      await API.patch(`/users/${selectedUser._id || selectedUser.id}`, payload);
      setSuccessMessage('User details updated successfully.');
      setShowEditDrawer(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update user');
    }
  };

  // Open Delete Modal
  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setError('');
    setSuccessMessage('');
    setShowDeleteModal(true);
  };

  // Submit Delete with rubric constraints
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    const userId = selectedUser._id || selectedUser.id;
    const currentId = currentUser._id || currentUser.id;

    // Check 1: Cannot delete own account
    if (userId === currentId || selectedUser.email === currentUser.email) {
      setError('Action blocked: You cannot delete your own admin account.');
      setShowDeleteModal(false);
      return;
    }

    // Check 2: Cannot leave system with zero admins
    if (selectedUser.role === 'admin' && adminCount <= 1) {
      setError('Action blocked: System must never be left with zero administrators.');
      setShowDeleteModal(false);
      return;
    }

    try {
      await API.delete(`/users/${userId}`);
      setSuccessMessage(`User "${selectedUser.name || selectedUser.email}" deleted successfully.`);
      setShowDeleteModal(false);
      setShowEditDrawer(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete user');
      setShowDeleteModal(false);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (user) => {
    const userId = user._id || user.id;
    const newStatus = !(user.active !== false);
    try {
      await API.patch(`/users/${userId}`, { active: newStatus });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to change user status');
    }
  };

  // Get user avatar initials
  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'U';
  };

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none flex items-center gap-2">
                  Administrator Dashboard
                  <span className="hidden sm:inline-flex text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Flowbite CRUD
                  </span>
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Manage university accounts, role permissions, and academic access
                </p>
              </div>
            </div>

            {/* Current User Badge & Logout */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-bold text-xs">
                  {getInitials(currentUser.name, currentUser.email)}
                </div>
                <div className="text-left text-xs leading-tight">
                  <p className="font-semibold text-white">{currentUser.name || currentUser.email}</p>
                  <p className="text-cyan-300 font-bold uppercase tracking-wider text-[10px]">
                    Role: {currentUser.role || 'Admin'}
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
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Users</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{users.length}</h3>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">● {activeCount} active</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Students</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{studentCount}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enrolled accounts</p>
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
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Advisors</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{advisorCount}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Course directors</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admins</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{adminCount}</h3>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">System security</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

        {/* Main Flowbite CRUD Table Card */}
        <div className="bg-white dark:bg-gray-800 relative shadow-xl sm:rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Flowbite Action Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 sm:p-5 gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {/* Search Input & Role Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
              {/* Search Box with Magnifier Icon */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email, or student ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5 transition-colors placeholder-gray-400"
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

              {/* Role Filter Dropdown */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="relative">
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 pr-8 transition-colors cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students ({studentCount})</option>
                    <option value="advisor">Advisors ({advisorCount})</option>
                    <option value="admin">Administrators ({adminCount})</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Create New User Button (Flowbite Primary Action) */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={openCreateDrawer}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2.5 transition-all shadow-sm hover:shadow"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add User</span>
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3.5 font-semibold">User</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Role</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Student ID</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Status</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium">Loading user accounts...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300">No users found</p>
                        <p className="text-xs text-gray-500">Try adjusting your search terms or filter selection.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const userId = u._id || u.id;
                    const isCurrent = userId === (currentUser._id || currentUser.id) || u.email === currentUser.email;
                    const isActive = u.active !== false;

                    return (
                      <tr
                        key={userId}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          !isActive ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''
                        }`}
                      >
                        {/* User Cell with Avatar */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : u.role === 'advisor'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {getInitials(u.name, u.email)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span>{u.name || 'Unnamed User'}</span>
                                {isCurrent && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.role === 'admin' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <span className="w-1.5 h-1.5 mr-1.5 bg-purple-600 rounded-full"></span>
                              Administrator
                            </span>
                          )}
                          {u.role === 'advisor' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <span className="w-1.5 h-1.5 mr-1.5 bg-blue-600 rounded-full"></span>
                              Academic Advisor
                            </span>
                          )}
                          {u.role === 'student' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 mr-1.5 bg-emerald-600 rounded-full"></span>
                              Student
                            </span>
                          )}
                        </td>

                        {/* Student ID */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.studentId ? (
                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                              {u.studentId}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Status (Dot Badge) */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
                              <span className="w-2 h-2 mr-1.5 bg-green-500 rounded-full"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <span className="w-2 h-2 mr-1.5 bg-amber-500 rounded-full"></span>
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions (Flowbite Inline Buttons) */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center space-x-1">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => openEditDrawer(u)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Edit user details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>

                            {/* Toggle Active Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isActive
                                  ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-700'
                                  : 'text-green-600 hover:bg-green-50 dark:hover:bg-gray-700'
                              }`}
                              title={isActive ? 'Deactivate account' : 'Activate account'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-15.536a9 9 0 0112.728 0M8.464 8.464a5 5 0 017.072 0" />
                              </svg>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => openDeleteModal(u)}
                              disabled={isCurrent}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isCurrent
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-gray-700'
                              }`}
                              title={isCurrent ? 'Cannot delete your own account' : 'Delete user'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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

          {/* Flowbite Table Footer & Pagination */}
          <nav
            className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-750"
            aria-label="Table navigation"
          >
            {/* Rows info & page size picker */}
            <div className="flex items-center space-x-3 text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">
              <span>
                Showing{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {totalUsers > 0 ? startIndex + 1 : 0}
                </span>
                -
                <span className="font-semibold text-gray-900 dark:text-white">
                  {endIndex}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{totalUsers}</span> users
              </span>

              <div className="hidden sm:flex items-center space-x-1.5 pl-2 border-l border-gray-300 dark:border-gray-600">
                <span className="text-xs">Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded p-1 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <ul className="inline-flex items-center -space-x-px text-sm">
              <li>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center justify-center h-8 px-3 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Prev</span>
                </button>
              </li>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = pageNum === currentPage;
                return (
                  <li key={pageNum}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`flex items-center justify-center h-8 px-3 leading-tight border transition-colors ${
                        isActive
                          ? 'text-white bg-blue-600 border-blue-600 font-semibold'
                          : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  </li>
                );
              })}

              <li>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="flex items-center justify-center h-8 px-3 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </main>

      {/* ======================================================== */}
      {/* FLOWBITE CREATE USER DRAWER (Slide-over from right)     */}
      {/* ======================================================== */}
      {showCreateDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Backdrop */}
          <div
            onClick={() => setShowCreateDrawer(false)}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Container */}
          <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-md md:max-w-lg bg-white dark:bg-gray-800 shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h5 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    New User Account
                  </h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Add a new student, academic advisor, or administrator.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateDrawer(false)}
                  className="text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-700 dark:hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Body / Form */}
              <form id="createUserForm" onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@stamford.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer"
                  >
                    <option value="student">Student</option>
                    <option value="advisor">Academic Advisor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {formData.role === 'student' && (
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                      Student ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2407080009"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                    />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Numeric university ID used for course registration & lookup.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  />
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="ml-2.5 text-sm font-medium text-gray-900 dark:text-gray-300">
                      Account is active and permitted to log in
                    </span>
                  </label>
                </div>
              </form>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3 bg-gray-50/50 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateDrawer(false)}
                  className="py-2.5 px-5 text-sm font-medium text-gray-700 focus:outline-none bg-white rounded-lg border border-gray-300 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="createUserForm"
                  className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors shadow-sm"
                >
                  Create User
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOWBITE UPDATE USER DRAWER (Slide-over from right)     */}
      {/* ======================================================== */}
      {showEditDrawer && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Backdrop */}
          <div
            onClick={() => setShowEditDrawer(false)}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Container */}
          <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-md md:max-w-lg bg-white dark:bg-gray-800 shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h5 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Update User Details
                  </h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Editing profile for <strong className="text-gray-700 dark:text-gray-300">{selectedUser.name || selectedUser.email}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditDrawer(false)}
                  className="text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-700 dark:hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Body / Form */}
              <form id="editUserForm" onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer"
                  >
                    <option value="student">Student</option>
                    <option value="advisor">Academic Advisor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {formData.role === 'student' && (
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                      Student ID
                    </label>
                    <input
                      type="text"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                    Reset Password <span className="text-xs font-normal text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Leave empty to keep current password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Provide a new password only if you wish to reset it for this user.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="ml-2.5 text-sm font-medium text-gray-900 dark:text-gray-300">
                      Account is active and permitted to log in
                    </span>
                  </label>
                </div>
              </form>

              {/* Drawer Footer with Update, Delete, and Cancel */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => openDeleteModal(selectedUser)}
                  className="text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 font-medium rounded-lg text-sm px-4 py-2.5 inline-flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowEditDrawer(false)}
                    className="py-2.5 px-4 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="editUserForm"
                    className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOWBITE DELETE CONFIRMATION MODAL                       */}
      {/* ======================================================== */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl text-center border border-gray-200 dark:border-gray-700">
            {/* Warning Icon */}
            <div className="w-14 h-14 mx-auto mb-4 text-red-600 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
              Delete User Account?
            </h3>

            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to permanently delete{' '}
              <strong className="text-gray-800 dark:text-gray-200">{selectedUser.name || selectedUser.email}</strong>?
            </p>

            <div className="p-3 mb-5 text-xs text-left bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg">
              ℹ️ <strong>Recommendation:</strong> If this account has associated academic history, consider marking them as <em>Inactive</em> instead to maintain records integrity.
            </div>

            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="py-2.5 px-5 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
              >
                No, cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 transition-colors shadow-sm"
              >
                Yes, delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
