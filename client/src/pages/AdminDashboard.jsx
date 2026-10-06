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

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.studentId && u.studentId.toLowerCase().includes(query));
    return matchesRole && matchesSearch;
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;

  // Open Create Modal
  const openCreateModal = () => {
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
    setShowCreateModal(true);
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
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create user');
    }
  };

  // Open Edit Modal
  const openEditModal = (user) => {
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
    setShowEditModal(true);
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
      setShowEditModal(false);
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
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete user');
      setShowDeleteModal(false);
    }
  };

  // Toggle user active status (soft-delete recommendation from Section 5.2)
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '26px', color: '#ffffff' }}>Administrator Dashboard</h1>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '15px' }}>
            Logged in as <strong style={{ color: '#ffffff' }}>{currentUser.name || currentUser.email}</strong> (Role: <span style={{ textTransform: 'uppercase', color: '#38bdf8', fontWeight: 'bold' }}>{currentUser.role || 'Admin'}</span>)
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{ padding: '8px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Logout
        </button>
      </header>

      {/* Alert Messages */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fff5f5', borderLeft: '4px solid #e53e3e', color: '#c53030', marginBottom: '16px', borderRadius: '4px' }}>
          <strong>Error: </strong> {error}
        </div>
      )}
      {successMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fff4', borderLeft: '4px solid #38a169', color: '#276749', marginBottom: '16px', borderRadius: '4px' }}>
          <strong>Success: </strong> {successMessage}
        </div>
      )}

      {/* Controls: Search, Filter, Create */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Role Filter */}
          <div>
            <label style={{ marginRight: '6px', fontWeight: 'bold', fontSize: '14px', color: '#cbd5e1' }}>Filter by Role:</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#fff', color: '#1a202c' }}
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="advisor">Advisors</option>
              <option value="admin">Administrators</option>
            </select>
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Search name, email, or student ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e0', minWidth: '280px', background: '#fff', color: '#1a202c' }}
          />
        </div>

        <button
          onClick={openCreateModal}
          style={{ padding: '9px 18px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Create New User
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading user accounts...</p>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', color: '#1e293b' }}>
            <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 'bold' }}>Name</th>
                <th style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 'bold' }}>Email</th>
                <th style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 'bold' }}>Role</th>
                <th style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 'bold' }}>Student ID</th>
                <th style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 'bold' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#0f172a', fontWeight: 'bold' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#a0aec0' }}>
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = (u._id || u.id) === (currentUser._id || currentUser.id) || u.email === currentUser.email;
                  const isActive = u.active !== false;

                  return (
                    <tr key={u._id || u.id} style={{ borderBottom: '1px solid #edf2f7', backgroundColor: !isActive ? '#fffaf0' : 'transparent' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                        {u.name || '—'} {isCurrent && <span style={{ fontSize: '11px', color: '#3182ce', marginLeft: '4px' }}>(You)</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: u.role === 'admin' ? '#feebc8' : u.role === 'advisor' ? '#bee3f8' : '#c6f6d5',
                          color: u.role === 'admin' ? '#7b341e' : u.role === 'advisor' ? '#2b6cb0' : '#22543d'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{u.studentId || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: isActive ? '#38a169' : '#dd6b20', fontWeight: 'bold' }}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => openEditModal(u)}
                            style={{ padding: '5px 10px', fontSize: '12px', background: '#edf2f7', color: '#2d3748', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            title="Toggle active status"
                            style={{ padding: '5px 10px', fontSize: '12px', background: '#f7fafc', color: isActive ? '#c05621' : '#2f855a', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            {isActive ? 'Mark Inactive' : 'Activate'}
                          </button>
                          <button
                            onClick={() => openDeleteModal(u)}
                            disabled={isCurrent}
                            title={isCurrent ? 'Cannot delete your own account' : 'Delete user account'}
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              background: isCurrent ? '#cbd5e0' : '#fed7d7',
                              color: isCurrent ? '#718096' : '#9b2c2c',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isCurrent ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Delete
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
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Create New User Account</h3>
            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                >
                  <option value="student">Student</option>
                  <option value="advisor">Academic Advisor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {formData.role === 'student' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Student ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 6480001"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', background: '#edf2f7', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Edit User Details</h3>
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                >
                  <option value="student">Student</option>
                  <option value="advisor">Academic Advisor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {formData.role === 'student' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Student ID</label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Change Password (leave empty to keep unchanged)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <label htmlFor="activeCheck" style={{ fontSize: '14px' }}>Account is Active</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: '8px 16px', background: '#edf2f7', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#e53e3e' }}>Confirm Account Deletion</h3>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#4a5568' }}>
              Are you sure you want to permanently delete the account for <strong>{selectedUser.name || selectedUser.email}</strong>?
            </p>
            <p style={{ fontSize: '13px', color: '#718096', backgroundColor: '#f7fafc', padding: '10px', borderRadius: '4px' }}>
              ℹ️ <strong>Note:</strong> If this student or advisor has existing course or registration history, consider marking them as <em>Inactive</em> instead to maintain historical integrity.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: '8px 16px', background: '#edf2f7', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                style={{ padding: '8px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

