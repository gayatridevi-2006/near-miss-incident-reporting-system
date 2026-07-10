import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getRegistrationRequests, approveRegistrationRequest, rejectRegistrationRequest } from '../api/registration';
import { useAuth } from '../context/AuthContext';
import { Users, CheckCircle, XCircle, FileText, Check, X, AlertTriangle, MessageSquare } from 'lucide-react';

const HODRegistrationApproval = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState(''); // 'Approve' or 'Reject'
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch only Pending registration requests
      const response = await getRegistrationRequests({ status: 'Pending' });
      setRequests(response.data || []);
    } catch (err) {
      console.error("Error fetching registration requests", err);
      setError(err.response?.data?.message || 'Failed to load registration requests.');
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (req, type) => {
    setSelectedReq(req);
    setActionType(type);
    setRemarks('');
    setModalError('');
    setSuccessMessage('');
  };

  const closeActionModal = () => {
    setSelectedReq(null);
    setActionType('');
    setRemarks('');
    setModalError('');
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setSuccessMessage('');

    if (actionType === 'Reject' && !remarks.trim()) {
      setModalError('Rejection remarks are mandatory.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { remarks: remarks.trim() };
      if (actionType === 'Approve') {
        await approveRegistrationRequest(selectedReq.request_id, payload);
      } else {
        await rejectRegistrationRequest(selectedReq.request_id, payload);
      }
      
      // Update list
      setRequests(requests.filter(r => r.request_id !== selectedReq.request_id));
      const message = `Registration request for ${selectedReq.full_name} (${selectedReq.employee_id}) has been ${actionType.toLowerCase()}d successfully.`;
      closeActionModal();
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error(err);
      setModalError(err.response?.data?.message || `Failed to ${actionType.toLowerCase()} registration request.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--primary-blue)', fontWeight: '700' }}>Loading Registration Requests Registry...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title={`HOD Approvals - Department: ${user?.department || 'N/A'}`} />

        <div className="page-body fade-in">
          
          {error && (
            <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '1rem', borderRadius: '4px', marginBottom: '2rem', fontWeight: '600' }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{ backgroundColor: '#E8F5E9', border: '1px solid #C8E6C9', color: '#2E7D32', padding: '1rem', borderRadius: '4px', marginBottom: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-blue)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Users size={24} />
              Pending Registration Requests
            </h2>
            <div style={{ backgroundColor: 'var(--light-blue)', color: 'var(--primary-blue)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700' }}>
              {requests.length} Pending Approval
            </div>
          </div>

          <div className="glass-card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            {requests.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle size={48} style={{ color: 'var(--success-green)', marginBottom: '1rem' }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>All Caught Up!</h3>
                <p>There are no pending user registration requests for your department.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-light-gray)', borderBottom: '2px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem' }}>Employee/Trainee ID</th>
                    <th style={{ padding: '1rem' }}>Applicant Name</th>
                    <th style={{ padding: '1rem' }}>Email</th>
                    <th style={{ padding: '1rem' }}>Mobile Number</th>
                    <th style={{ padding: '1rem' }}>User Type</th>
                    <th style={{ padding: '1rem' }}>Date Requested</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.request_id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', transition: 'var(--transition-fast)' }}>
                      <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{req.employee_id}</td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{req.full_name}</td>
                      <td style={{ padding: '1rem' }}>{req.email}</td>
                      <td style={{ padding: '1rem' }}>{req.mobile_number}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          backgroundColor: req.user_type === 'Employee' ? '#E3F2FD' : req.user_type === 'Trainee' ? '#FFF3E0' : '#EDE7F6',
                          color: req.user_type === 'Employee' ? '#1565C0' : req.user_type === 'Trainee' ? '#E65100' : '#5E35B1',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}>
                          {req.user_type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => openActionModal(req, 'Approve')}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--success-green)' }}
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => openActionModal(req, 'Reject')}
                          className="btn btn-danger"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          <X size={14} />
                          Reject
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

      {/* APPROVAL / REJECTION ACTION MODAL */}
      {selectedReq && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{
                color: actionType === 'Approve' ? 'var(--success-green)' : '#D32F2F',
                fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0
              }}>
                {actionType === 'Approve' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                Confirm Registration {actionType}
              </h3>
              <button onClick={closeActionModal} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            {modalError && (
              <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                {modalError}
              </div>
            )}

            <div style={{ backgroundColor: 'var(--bg-light-gray)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Applicant:</strong> {selectedReq.full_name} ({selectedReq.employee_id})</p>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Designation:</strong> {selectedReq.user_type}</p>
              <p style={{ margin: 0 }}><strong>Email:</strong> {selectedReq.email}</p>
            </div>

            <form onSubmit={handleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {actionType === 'Approve' ? 'HOD Remarks (Optional)' : 'Rejection Reason / Remarks (Mandatory)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <MessageSquare size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  <textarea
                    className="form-input"
                    rows={4}
                    style={{ paddingLeft: '2.25rem', resize: 'vertical' }}
                    placeholder={actionType === 'Approve' ? 'e.g. Approved and verified' : 'e.g. Invalid Employee ID. Please contact HOD.'}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    required={actionType === 'Reject'}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={closeActionModal} className="btn btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={actionType === 'Approve' ? 'btn btn-primary' : 'btn btn-danger'}
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default HODRegistrationApproval;
