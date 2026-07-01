import React, { useState, useEffect } from 'react';
import { getActionItems, updateActionStatus, approveAction } from '../api/actions';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { 
  CheckSquare, 
  Clock, 
  CheckCircle,
  Play,
  Send,
  X
} from 'lucide-react';

const ActionItems = () => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { isHOD, isAdmin } = useAuth();
  
  // State for updating status modal/form
  const [activeActionId, setActiveActionId] = useState(null);
  const [newStatus, setNewStatus] = useState('Completed');
  const [closureRemarks, setClosureRemarks] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchActionItems();
  }, []);

  const fetchActionItems = async () => {
    setLoading(true);
    try {
      const response = await getActionItems();
      setActions(response.data);
    } catch (err) {
      console.error("Error retrieving CAPA action items", err);
      setError('Could not load Corrective and Preventive Actions (CAPA).');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAction = async (actionId) => {
    try {
      await updateActionStatus(actionId, { status: 'In_Progress' });
      fetchActionItems();
    } catch (err) {
      console.error("Error starting action item", err);
      alert('Failed to update status to In Progress.');
    }
  };

  const handleSubmitClosure = async (e) => {
    e.preventDefault();
    if (!closureRemarks) {
      alert("Please provide completion details/remarks.");
      return;
    }

    setUpdating(true);
    try {
      await updateActionStatus(activeActionId, {
        status: newStatus,
        closure_remarks: closureRemarks
      });
      setActiveActionId(null);
      setClosureRemarks('');
      fetchActionItems();
    } catch (err) {
      console.error("Error closing action", err);
      alert('Failed to submit CAPA closure.');
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveAction = async (actionId) => {
    try {
      await approveAction(actionId);
      fetchActionItems();
    } catch (err) {
      console.error("Error approving closure", err);
      alert('Failed to approve safety action closure.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'var(--status-resolved)';
      case 'Completed': return 'var(--primary-blue)';
      case 'In_Progress': return 'var(--status-pending)';
      default: return 'var(--text-muted)';
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--primary-blue)', fontWeight: '700' }}>Loading CAPA Log...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title="CAPA Safety Action Board" />
        
        <div className="page-body fade-in">
          {error && (
            <div style={{
              backgroundColor: '#FFEBEE',
              border: '1px solid #FFCDD2',
              color: '#C62828',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '2rem',
              fontWeight: '600'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: activeActionId ? '2fr 1.2fr' : '1fr', gap: '2rem' }}>
            
            {/* Action Items List */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
                  <CheckSquare size={18} color="var(--primary-blue)" />
                  <span>Corrective & Preventive Action (CAPA) Log</span>
                </h3>
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Incident Context</th>
                      <th>CAPA Description</th>
                      <th>Type</th>
                      <th>Assignee</th>
                      <th>Target Date</th>
                      <th>Status</th>
                      <th>Operations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.length > 0 ? (
                      actions.map((act) => (
                        <tr key={act.id}>
                          <td>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{act.incident_title}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{act.incident_number || `ID: #${act.incident_id}`}</div>
                          </td>
                          <td style={{ maxWidth: '280px', color: 'var(--text-primary)', fontWeight: '500' }}>{act.description}</td>
                          <td>
                            <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>{act.action_type}</span>
                          </td>
                          <td style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{act.assigned_to_name || 'Unassigned'}</td>
                          <td style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{new Date(act.target_date).toLocaleDateString()}</td>
                          <td>
                            <span style={{ 
                              color: getStatusColor(act.status), 
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              <Clock size={12} />
                              <span>{act.status.replace('_', ' ')}</span>
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {/* Employee/Assignee action buttons */}
                              {act.status === 'Pending' && (
                                <button
                                  onClick={() => handleStartAction(act.id)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', borderColor: 'var(--status-pending)' }}
                                >
                                  <Play size={10} color="var(--status-pending)" />
                                  <span style={{ color: 'var(--status-pending)' }}>Start</span>
                                </button>
                              )}

                              {(act.status === 'Pending' || act.status === 'In_Progress') && (
                                <button
                                  onClick={() => {
                                    setActiveActionId(act.id);
                                    setNewStatus('Completed');
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }}
                                >
                                  <span>Update</span>
                                </button>
                              )}

                              {/* HOD / Admin approval button */}
                              {act.status === 'Completed' && (isHOD || isAdmin) && (
                                <button
                                  onClick={() => handleApproveAction(act.id)}
                                  className="btn btn-primary"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }}
                                >
                                  <CheckCircle size={10} />
                                  <span>Approve Closure</span>
                                </button>
                              )}

                              {act.status === 'Approved' && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Fully Resolved</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No CAPA tasks logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Closure Update Form panel */}
            {activeActionId && (
              <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--primary-blue)', fontWeight: '700' }}>Submit Closure Details</h4>
                  <button 
                    onClick={() => setActiveActionId(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSubmitClosure}>
                  <div className="form-group">
                    <label className="form-label">Task Status</label>
                    <select
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="In_Progress">Still In Progress</option>
                      <option value="Completed">Completed (Ready for sign-off)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Closure Remarks & Validation Action</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Detail what safety action was implemented to close this hazard. (e.g. Swapped broken extension cords, posted warning signs, cleaned spill)"
                      value={closureRemarks}
                      onChange={(e) => setClosureRemarks(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={updating}
                  >
                    <Send size={14} />
                    <span>{updating ? 'Submitting...' : 'Confirm Update'}</span>
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionItems;
