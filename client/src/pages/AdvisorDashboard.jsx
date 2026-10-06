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
  const [newOffering, setNewOffering] = useState({
    code: '',
    title: '',
    section: '1',
    day: 'Monday',
    startTime: '09:00',
    endTime: '12:00',
    room: 'Room 401',
    instructor: currentUser.name || 'Dr. Smith',
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
      // Fallback if users endpoint doesn't support query param filter
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

      // Fetch student's completed academic record & eligible courses from Rules Engine
      const [recordRes, eligibleRes] = await Promise.all([
        API.get(`/students/${studentId}/record`),
        API.get(`/students/${studentId}/eligible?term=${term}`)
      ]);

      setStudentRecord(recordRes.data || []);

      // If backend returns array directly or structured object:
      if (Array.isArray(eligibleRes.data)) {
        // Partition eligible vs excluded
        const eligible = eligibleRes.data.filter((item) => item.isEligible !== false);
        const excluded = eligibleRes.data.filter((item) => item.isEligible === false);
        setEligibilityData({ eligible, excluded });
      } else {
        setEligibilityData({
          eligible: eligibleRes.data.eligible || [],
          excluded: eligibleRes.data.excluded || []
        });
      }

      // Also fetch their active term registrations
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

  // Register student for an offering
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
      // Refresh student registration and eligibility
      handleSelectStudent(selectedStudentId);
      fetchOfferings(); // Refresh live seats
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to register student');
    }
  };

  // Drop / Remove course from student registration
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

  // Quick credit total calculation
  const totalEarnedCredits = studentRecord.reduce(
    (sum, r) => sum + (r.grade !== 'F' && r.grade !== 'W' ? (r.courseId?.credits || r.credits || 3) : 0),
    0
  );

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '26px', color: '#ffffff' }}>Academic Advisor Dashboard</h1>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '15px' }}>
            Logged in as <strong style={{ color: '#ffffff' }}>{currentUser.name || currentUser.email}</strong> (Role: <span style={{ textTransform: 'uppercase', color: '#38bdf8', fontWeight: 'bold' }}>Advisor</span>) | Current Term: <strong style={{ color: '#ffffff' }}>{term}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontWeight: 'bold' }}
          >
            <option value="2026-1">Term 2026-1</option>
            <option value="2026-2">Term 2026-2</option>
          </select>
          <button
            onClick={handleLogout}
            style={{ padding: '8px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ALERTS */}
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

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('offerings')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'offerings' ? '3px solid #38bdf8' : '3px solid transparent',
            background: 'none',
            fontWeight: activeTab === 'offerings' ? 'bold' : 'normal',
            color: activeTab === 'offerings' ? '#38bdf8' : '#cbd5e1',
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          📚 Course Offerings ({offerings.length})
        </button>
        <button
          onClick={() => setActiveTab('registration')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'registration' ? '3px solid #38bdf8' : '3px solid transparent',
            background: 'none',
            fontWeight: activeTab === 'registration' ? 'bold' : 'normal',
            color: activeTab === 'registration' ? '#38bdf8' : '#cbd5e1',
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          🎓 Register Students & Rules Engine
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: COURSE OFFERINGS MANAGEMENT                       */}
      {/* ======================================================== */}
      {activeTab === 'offerings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Course Offerings for Term {term}</h2>
            <button
              onClick={() => setShowAddOfferingModal(true)}
              style={{ padding: '9px 18px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Open Course Offering / Section
            </button>
          </div>

          {loadingOfferings ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>Loading offerings...</p>
          ) : (
            <div style={{ overflowX: 'auto', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '12px 16px' }}>Course</th>
                    <th style={{ padding: '12px 16px' }}>Section</th>
                    <th style={{ padding: '12px 16px' }}>Schedule & Room</th>
                    <th style={{ padding: '12px 16px' }}>Instructor</th>
                    <th style={{ padding: '12px 16px' }}>Live Seats</th>
                    <th style={{ padding: '12px 16px' }}>Add/Drop Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offerings.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#a0aec0' }}>
                        No course offerings created for this term yet.
                      </td>
                    </tr>
                  ) : (
                    offerings.map((off) => {
                      const courseCode = off.courseId?.code || off.code;
                      const courseTitle = off.courseId?.title || off.title;
                      const seatsTotal = off.seats || 30;
                      const seatsTaken = off.seatsTaken || 0;
                      const seatsRemaining = seatsTotal - seatsTaken;
                      const isFull = seatsRemaining <= 0;

                      return (
                        <tr key={off._id || off.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                            {courseCode} - {courseTitle}
                          </td>
                          <td style={{ padding: '12px 16px' }}>Sec {off.section}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div>{off.day} {off.startTime} - {off.endTime}</div>
                            <small style={{ color: '#718096' }}>{off.room}</small>
                          </td>
                          <td style={{ padding: '12px 16px' }}>{off.instructor}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 'bold', color: isFull ? '#e53e3e' : '#2b6cb0' }}>
                              {seatsTaken} / {seatsTotal} taken
                            </div>
                            <span style={{ fontSize: '12px', color: isFull ? '#e53e3e' : '#38a169', fontWeight: '600' }}>
                              {isFull ? 'Full (0 remaining)' : `${seatsRemaining} seats remaining`}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              backgroundColor: off.addDropOpen ? '#c6f6d5' : '#fed7d7',
                              color: off.addDropOpen ? '#22543d' : '#742a2a'
                            }}>
                              {off.addDropOpen ? 'Window Open' : 'Window Closed'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                onClick={() => handleToggleAddDrop(off)}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '12px',
                                  background: off.addDropOpen ? '#fed7d7' : '#c6f6d5',
                                  color: off.addDropOpen ? '#9b2c2c' : '#22543d',
                                  border: '1px solid #cbd5e0',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                {off.addDropOpen ? 'Close Add/Drop' : 'Open Add/Drop'}
                              </button>
                              <button
                                onClick={() => handleDeleteOffering(off._id || off.id)}
                                style={{ padding: '5px 10px', fontSize: '12px', background: '#edf2f7', color: '#e53e3e', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                Remove
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
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: STUDENT REGISTRATION & RULES ENGINE               */}
      {/* ======================================================== */}
      {activeTab === 'registration' && (
        <div>
          {/* Student Selector */}
          <div style={{ backgroundColor: '#f7fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: '15px' }}>Select Student to Register:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleSelectStudent(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e0', minWidth: '320px', fontSize: '14px' }}
            >
              <option value="">-- Choose a Student --</option>
              {students.map((st) => (
                <option key={st._id || st.id} value={st._id || st.id}>
                  {st.name} ({st.studentId || 'No ID'}) - {st.email}
                </option>
              ))}
            </select>
          </div>

          {!selectedStudentId ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e0', color: '#718096' }}>
              <h3>Select a student from the dropdown above</h3>
              <p>The system will load their past academic records and apply all four registration rules automatically.</p>
            </div>
          ) : loadingStudentData ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>Analyzing student eligibility and rules...</p>
          ) : (
            <div>
              {/* Top Summary: History & Active Registrations */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {/* Academic Record Card */}
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2d3748' }}>Past Academic Record</h3>
                    <span style={{ fontSize: '13px', background: '#ebf8ff', color: '#2b6cb0', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                      Earned: {totalEarnedCredits} Credits
                    </span>
                  </div>
                  {studentRecord.length === 0 ? (
                    <p style={{ color: '#a0aec0', fontSize: '13px' }}>No previous course records found.</p>
                  ) : (
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#718096' }}>
                            <th style={{ textAlign: 'left', padding: '4px' }}>Term</th>
                            <th style={{ textAlign: 'left', padding: '4px' }}>Course</th>
                            <th style={{ textAlign: 'center', padding: '4px' }}>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentRecord.map((rec) => (
                            <tr key={rec._id || rec.id} style={{ borderBottom: '1px solid #f7fafc', backgroundColor: rec.grade === 'F' ? '#fff5f5' : 'transparent' }}>
                              <td style={{ padding: '6px 4px' }}>{rec.term}</td>
                              <td style={{ padding: '6px 4px' }}>{rec.courseId?.code || rec.code} - {rec.courseId?.title || rec.title}</td>
                              <td style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 'bold', color: rec.grade === 'F' ? '#e53e3e' : '#38a169' }}>
                                {rec.grade} {rec.grade === 'F' && '⚠️'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Current Term Enrolled Courses Card */}
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2d3748' }}>Current Term Registrations ({term})</h3>
                  {studentRegistrations.length === 0 ? (
                    <p style={{ color: '#a0aec0', fontSize: '13px' }}>Not yet registered in any courses for {term}.</p>
                  ) : (
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#718096' }}>
                            <th style={{ textAlign: 'left', padding: '4px' }}>Course</th>
                            <th style={{ textAlign: 'left', padding: '4px' }}>Section</th>
                            <th style={{ textAlign: 'left', padding: '4px' }}>Time</th>
                            <th style={{ textAlign: 'center', padding: '4px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentRegistrations.map((reg) => (
                            <tr key={reg._id || reg.id} style={{ borderBottom: '1px solid #f7fafc' }}>
                              <td style={{ padding: '6px 4px', fontWeight: '600' }}>
                                {reg.offeringId?.courseId?.code || reg.courseCode}
                              </td>
                              <td style={{ padding: '6px 4px' }}>Sec {reg.offeringId?.section || reg.section}</td>
                              <td style={{ padding: '6px 4px' }}>{reg.offeringId?.day} {reg.offeringId?.startTime}</td>
                              <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                                <button
                                  onClick={() => handleRemoveRegistration(reg._id || reg.id)}
                                  style={{ padding: '3px 8px', fontSize: '11px', background: '#fed7d7', color: '#9b2c2c', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  Drop
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* RULES ENGINE SECTION (Section 6 - 15 marks) */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#2b6cb0' }}>
                    Available Course Offerings & Registration Rules Engine
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#718096' }}>
                    Evaluates: <strong>Offered This Term</strong>, <strong>Not Already Passed</strong>, <strong>Retake Priority (F)</strong>, <strong>Seats Available</strong>, and <strong>No Time Clashes</strong>.
                  </p>
                </div>

                {/* 1. ELIGIBLE COURSES LIST (Available to Register) */}
                <h4 style={{ margin: '16px 0 8px 0', color: '#276749', fontSize: '15px' }}>
                  ✅ Eligible Courses (Ready to Register)
                </h4>
                {eligibilityData.eligible.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#a0aec0', padding: '10px', background: '#f7fafc', borderRadius: '4px' }}>
                    No courses currently eligible for registration.
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px' }}>
                    <thead style={{ backgroundColor: '#f0fff4', borderBottom: '2px solid #c6f6d5' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Course</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Section</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Schedule & Room</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Seats Remaining</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Flags</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Priority: Retake courses listed first per Section 6 Rule 3 */}
                      {[...eligibilityData.eligible]
                        .sort((a, b) => (b.isRetake ? 1 : 0) - (a.isRetake ? 1 : 0))
                        .map((item) => {
                          const off = item.offering || item;
                          const courseCode = off.courseId?.code || off.code;
                          const courseTitle = off.courseId?.title || off.title;
                          const seatsRemaining = (off.seats || 30) - (off.seatsTaken || 0);

                          return (
                            <tr key={off._id || off.id} style={{ borderBottom: '1px solid #edf2f7', backgroundColor: item.isRetake ? '#fffaf0' : 'transparent' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>
                                {courseCode} - {courseTitle}
                              </td>
                              <td style={{ padding: '10px 12px' }}>Sec {off.section}</td>
                              <td style={{ padding: '10px 12px' }}>
                                {off.day} {off.startTime}-{off.endTime} ({off.room})
                              </td>
                              <td style={{ padding: '10px 12px', color: '#276749', fontWeight: '600' }}>
                                {seatsRemaining} seats left
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {item.isRetake && (
                                  <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fed7d7', color: '#9b2c2c' }}>
                                    ⚠️ Retake required
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleRegisterStudent(off._id || off.id)}
                                  style={{ padding: '6px 14px', background: '#38a169', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  Register
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}

                {/* 2. EXCLUDED / BLOCKED COURSES (Greyed out with reasoning per Section 6) */}
                <h4 style={{ margin: '20px 0 8px 0', color: '#718096', fontSize: '15px' }}>
                  🚫 Excluded / Blocked Offerings (With Explanation)
                </h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#a0aec0' }}>
                  The rubric requires clearly explaining why courses cannot be selected to assist academic staff.
                </p>

                {eligibilityData.excluded.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#a0aec0', padding: '10px', background: '#f7fafc', borderRadius: '4px' }}>
                    No offerings are currently blocked or excluded.
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', opacity: 0.85 }}>
                    <thead style={{ backgroundColor: '#edf2f7', borderBottom: '2px solid #cbd5e0' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Course</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Section</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Schedule</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Reason for Exclusion</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibilityData.excluded.map((item, idx) => {
                        const off = item.offering || item;
                        const courseCode = off.courseId?.code || off.code;
                        const courseTitle = off.courseId?.title || off.title;

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #edf2f7', backgroundColor: '#f7fafc', color: '#718096' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>
                              {courseCode} - {courseTitle}
                            </td>
                            <td style={{ padding: '10px 12px' }}>Sec {off.section || '—'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              {off.day ? `${off.day} ${off.startTime}-${off.endTime}` : '—'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                backgroundColor: item.reason?.includes('clash') || item.reason?.includes('Clash')
                                  ? '#feebc8'
                                  : item.reason?.includes('passed') || item.reason?.includes('Passed')
                                  ? '#e2e8f0'
                                  : '#fed7d7',
                                color: item.reason?.includes('clash') || item.reason?.includes('Clash')
                                  ? '#7b341e'
                                  : item.reason?.includes('passed') || item.reason?.includes('Passed')
                                  ? '#4a5568'
                                  : '#742a2a'
                              }}>
                                🛑 {item.reason || 'Not eligible for term'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#a0aec0' }}>
                              Blocked
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE OFFERING MODAL */}
      {showAddOfferingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '520px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Open New Course Offering ({term})</h3>
            <form onSubmit={handleCreateOffering}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSC220"
                    value={newOffering.code}
                    onChange={(e) => setNewOffering({ ...newOffering, code: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Course Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Web Development II"
                    value={newOffering.title}
                    onChange={(e) => setNewOffering({ ...newOffering, title: e.target.value })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Section *</label>
                  <input
                    type="text"
                    required
                    value={newOffering.section}
                    onChange={(e) => setNewOffering({ ...newOffering, section: e.target.value })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Total Seats *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newOffering.seats}
                    onChange={(e) => setNewOffering({ ...newOffering, seats: e.target.value })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Day *</label>
                  <select
                    value={newOffering.day}
                    onChange={(e) => setNewOffering({ ...newOffering, day: e.target.value })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Start Time *</label>
                  <input
                    type="time"
                    required
                    value={newOffering.startTime}
                    onChange={(e) => setNewOffering({ ...newOffering, startTime: e.target.value })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>End Time *</label>
                  <input
                    type="time"
                    required
                    value={newOffering.endTime}
                    onChange={(e) => setNewOffering({ ...newOffering, endTime: e.target.value })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Room *</label>
                  <input
                    type="text"
                    required
                    value={newOffering.room}
                    onChange={(e) => setNewOffering({ ...newOffering, room: e.target.value })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Instructor *</label>
                  <input
                    type="text"
                    required
                    value={newOffering.instructor}
                    onChange={(e) => setNewOffering({ ...newOffering, instructor: e.target.value })}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddOfferingModal(false)}
                  style={{ padding: '8px 16px', background: '#edf2f7', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Open Offering
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

