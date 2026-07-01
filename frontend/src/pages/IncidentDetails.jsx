import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIncidentById, updateIncidentStatus } from '../api/incidents';
import { getAllUsers } from '../api/users';
import { proposeAction, approveAction } from '../api/actions';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import { 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  Activity, 
  CheckSquare, 
  ShieldAlert,
  ArrowLeft,
  CheckCircle,
  Plus
} from 'lucide-react';

const IncidentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isSafetyOfficer, isHOD, isAdmin } = useAuth();
  
  const [incident, setIncident] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // CAPA Propose Form State
  const [showCapaForm, setShowCapaForm] = useState(false);
  const [capaDescription, setCapaDescription] = useState('');
  const [capaType, setCapaType] = useState('Corrective');
  const [capaAssignee, setCapaAssignee] = useState('');
  const [capaTargetDate, setCapaTargetDate] = useState('');
  const [capaSubmitting, setCapaSubmitting] = useState(false);

  useEffect(() => {
    fetchIncidentDetails();
    if (isSafetyOfficer || isHOD || isAdmin) {
      fetchUsers();
    }
  }, [id]);

  const fetchIncidentDetails = async () => {
    setLoading(true);
    try {
      const response = await getIncidentById(id);
      setIncident(response.data);
    } catch (err) {
      console.error("Error fetching incident details", err);
      setError('Could not retrieve incident details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await getAllUsers();
      setUsers(response.data);
      if (response.data.length > 0) {
        setCapaAssignee(response.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching users list", err);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const response = await updateIncidentStatus(id, { status: newStatus });
      setIncident(response.data);
    } catch (err) {
      console.error("Error updating status", err);
      setError(err.response?.data?.message || 'Failed to update incident status.');
    }
  };

  const handleProposeCapa = async (e) => {
    e.preventDefault();
    if (!capaDescription || !capaType || !capaTargetDate) {
      alert("Please fill in all CAPA fields.");
      return;
    }

    setCapaSubmitting(true);
    try {
      await proposeAction({
        incident_id: id,
        description: capaDescription,
        action_type: capaType,
        assigned_to_id: capaAssignee || null,
        target_date: capaTargetDate
      });
      
      // Reset form and reload details
      setCapaDescription('');
      setShowCapaForm(false);
      fetchIncidentDetails();
    } catch (err) {
      console.error("Error proposing CAPA action", err);
      alert(err.response?.data?.message || "Failed to propose action item.");
    } finally {
      setCapaSubmitting(false);
    }
  };

  const handleApproveAction = async (actionId) => {
    try {
      await approveAction(actionId);
      fetchIncidentDetails();
    } catch (err) {
      console.error("Error approving action closure", err);
      alert(err.response?.data?.message || "Failed to approve action closure.");
    }
  };

  const getWorkflowProgress = (status) => {
    const statuses = ['Pending', 'Under_Investigation', 'Action_Proposed', 'Resolved', 'Closed'];
    return statuses.indexOf(status);
  };

  const canManage = isSafetyOfficer || isHOD || isAdmin;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--primary-blue)', fontWeight: '700' }}>Loading Incident Details...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="main-content">
        <Navbar title="Incident Review" />
        <div className="page-body">
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <p style={{ color: 'var(--severity-high)', marginBottom: '1.5rem', fontWeight: '700' }}>{error || 'Incident not found'}</p>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = getWorkflowProgress(incident.status);

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title={`Incident Review: ${incident.incident_number}`} />
        
        <div className="page-body fade-in">
          {/* Back btn */}
          <button 
            className="btn btn-secondary" 
            style={{ marginBottom: '1.5rem' }}
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          {/* Workflow Progress Bar */}
          <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', textTransform: 'uppercase', fontWeight: '700' }}>
              Safety Workflow Stage
            </h4>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative'
            }}>
              {/* Progress Line */}
              <div style={{
                position: 'absolute',
                left: '4%',
                right: '4%',
                top: '50%',
                height: '4px',
                background: '#E0E0E0',
                zIndex: 1,
                transform: 'translateY(-50%)'
              }} />
              <div style={{
                position: 'absolute',
                left: '4%',
                width: `${(currentStep / 4) * 92}%`,
                top: '50%',
                height: '4px',
                background: 'var(--primary-blue)',
                zIndex: 2,
                transform: 'translateY(-50%)',
                transition: 'width 0.4s ease'
              }} />

              {['Reported', 'Investigating', 'CAPA Active', 'Resolved', 'Closed'].map((label, index) => {
                const isActive = index <= currentStep;
                const isCurrent = index === currentStep;
                return (
                  <div key={label} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    zIndex: 3,
                    width: '16.6%'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isActive ? 'var(--primary-blue)' : '#FFFFFF',
                      border: isActive ? '4px solid #FFFFFF' : '2px solid var(--border-color)',
                      outline: isCurrent ? '2px solid var(--primary-blue)' : 'none',
                      transition: 'all 0.3s ease'
                    }} />
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: isActive ? 'var(--primary-blue)' : 'var(--text-secondary)',
                      fontWeight: isActive ? '700' : '500'
                    }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '2rem'
          }}>
            {/* Left Column: Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Core Incident Details Card */}
              <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary-blue)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {incident.incident_number}
                    </span>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-blue)', marginBottom: '0.5rem', marginTop: '0.2rem', fontWeight: '800' }}>{incident.title}</h2>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <StatusBadge type="severity" value={incident.potential_severity} />
                      <StatusBadge type="status" value={incident.status} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    <div>Reported on {new Date(incident.reported_at).toLocaleDateString()}</div>
                    <div style={{ marginTop: '0.2rem' }}>By: {incident.reporter_name}</div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-light-gray)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ fontSize: '0.8rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>Plant Department</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '600', marginTop: '0.25rem' }}>{incident.department_name}</div>
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>Specific Location</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '600', marginTop: '0.25rem' }}>{incident.location}</div>
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>Unsafe Act/Condition</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '600', marginTop: '0.25rem' }}>{incident.unsafe_act_or_condition}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-blue)', marginBottom: '0.5rem', fontWeight: '700' }}>Incident Description</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                    {incident.description}
                  </p>
                </div>

                {incident.photograph_path && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-blue)', marginBottom: '0.5rem', fontWeight: '700' }}>Supporting Photograph</h4>
                    <img 
                      src={incident.photograph_path.startsWith('http') ? incident.photograph_path : `http://localhost:5000/static/uploads/${incident.photograph_path}`}
                      alt="Supporting Evidence" 
                      style={{
                        maxWidth: '100%',
                        maxHeight: '350px',
                        objectFit: 'contain',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        display: 'block'
                      }} 
                    />
                  </div>
                )}

                {incident.equipment_involved && (
                  <div>
                    <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '700' }}>Equipment Involved</h5>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-blue)', fontWeight: '700' }}>{incident.equipment_involved}</div>
                  </div>
                )}
              </div>

              {/* CAPA action list card */}
              <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
                    <CheckSquare size={18} color="var(--primary-blue)" />
                    <span>Corrective & Preventive Actions (CAPA)</span>
                  </h3>
                  {canManage && incident.status !== 'Closed' && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => setShowCapaForm(!showCapaForm)}
                    >
                      <Plus size={12} />
                      <span>Propose CAPA</span>
                    </button>
                  )}
                </div>

                {/* Inline CAPA form */}
                {showCapaForm && (
                  <form onSubmit={handleProposeCapa} className="glass-card" style={{
                    marginBottom: '1.5rem',
                    backgroundColor: 'var(--bg-light-gray)',
                    borderColor: 'var(--border-hover)',
                    borderRadius: '4px'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-blue)', marginBottom: '1rem', fontWeight: '700' }}>Propose Preventive Safety Action</h4>
                    
                    <div className="form-group">
                      <label className="form-label">Action Description</label>
                      <textarea 
                        className="form-input"
                        placeholder="Detail the CAPA steps (e.g. Clean oil spillage, replace broken handrail, repair control lock)"
                        value={capaDescription}
                        onChange={(e) => setCapaDescription(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Action Type</label>
                        <select 
                          className="form-select"
                          value={capaType}
                          onChange={(e) => setCapaType(e.target.value)}
                        >
                          <option value="Corrective">Corrective</option>
                          <option value="Preventive">Preventive</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Assignee</label>
                        <select 
                          className="form-select"
                          value={capaAssignee}
                          onChange={(e) => setCapaAssignee(e.target.value)}
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Target Date</label>
                        <input 
                          type="date"
                          className="form-input"
                          value={capaTargetDate}
                          onChange={(e) => setCapaTargetDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setShowCapaForm(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={capaSubmitting}
                      >
                        {capaSubmitting ? 'Submitting...' : 'Assign CAPA'}
                      </button>
                    </div>
                  </form>
                )}

                {/* List of actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {incident.action_items && incident.action_items.length > 0 ? (
                    incident.action_items.map((action) => (
                      <div key={action.id} style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '1rem',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>{action.action_type}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>{action.description}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', fontWeight: '500' }}>
                            <span>Assignee: <strong>{action.assigned_to_name || 'Unassigned'}</strong></span>
                            <span>Target Date: <strong>{new Date(action.target_date).toLocaleDateString()}</strong></span>
                            <span>Status: <strong style={{ color: action.status === 'Approved' ? 'var(--status-resolved)' : 'var(--status-pending)' }}>{action.status.replace('_', ' ')}</strong></span>
                          </div>
                          {action.closure_remarks && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary-blue)', backgroundColor: 'var(--light-blue)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', border: '1px solid var(--border-hover)', fontWeight: '500' }}>
                              <strong>Closure Remarks:</strong> {action.closure_remarks}
                            </div>
                          )}
                        </div>

                        {/* Sign-off Actions for HOD/Admin */}
                        {action.status === 'Completed' && (isHOD || isAdmin) && (
                          <button
                            onClick={() => handleApproveAction(action.id)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            <CheckCircle size={12} />
                            <span>Approve Closure</span>
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem', fontWeight: '500' }}>
                      No Corrective or Preventive Actions proposed yet.
                    </p>
                  )}
                </div>

              </div>
            </div>

            {/* Right Column: Safety Operations & Auditing */}
            <div>
              {canManage && (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontWeight: '700' }}>
                    Safety Audit Controls
                  </h3>

                  {incident.status === 'Pending' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleStatusUpdate('Under_Investigation')}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Activity size={16} />
                      <span>Start Safety Audit</span>
                    </button>
                  )}

                  {incident.status === 'Resolved' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleStatusUpdate('Closed')}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <CheckCircle size={16} />
                      <span>Close Incident File</span>
                    </button>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                      <strong>Status Transition Guidelines:</strong>
                    </div>
                    <ul style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: '500' }}>
                      <li><strong>Under Investigation</strong>: Flagged when Safety Officer initializes inspection.</li>
                      <li><strong>Action Proposed</strong>: Triggers when CAPA tasks are proposed.</li>
                      <li><strong>Resolved</strong>: Automatically flags when all CAPAs are approved.</li>
                      <li><strong>Closed</strong>: Explicitly signed off by the HOD/Admin.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;
