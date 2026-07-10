import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHODIncidentById, submitInvestigation, assignAction, verifyClosure } from '../api/hod';
import { getAllUsers } from '../api/users';
import { getDepartments } from '../api/departments';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import { 
  ShieldAlert, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle,
  FileText,
  Activity,
  ArrowLeft,
  Calendar,
  AlertOctagon,
  FileSpreadsheet
} from 'lucide-react';

const HODIncidentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Investigation form states
  const [probableCause, setProbableCause] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [severity, setSeverity] = useState('Low');
  const [priority, setPriority] = useState('Low');
  const [investigationRemarks, setInvestigationRemarks] = useState('');

  // CAPA assignment form states
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedDept, setAssignedDept] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [capaRemarks, setCapaRemarks] = useState('');
  const [capaDescription, setCapaDescription] = useState('');

  // Closure states
  const [verificationRemarks, setVerificationRemarks] = useState('');
  const [supportingDocPath, setSupportingDocPath] = useState('');

  useEffect(() => {
    fetchIncidentDetails();
    fetchUsersAndDepts();
  }, [id]);

  const fetchIncidentDetails = async () => {
    try {
      const response = await getHODIncidentById(id);
      const data = response.data;
      setIncident(data);
      
      // Auto-fill forms if already populated
      setProbableCause(data.probable_cause || '');
      setRootCause(data.root_cause || '');
      setImmediateAction(data.immediate_action || '');
      setPreventiveAction(data.preventive_action || '');
      setSeverity(data.severity || data.potential_severity || 'Low');
      setPriority(data.priority || 'Low');
      setInvestigationRemarks(data.investigation_remarks || '');
      setVerificationRemarks(data.verification_remarks || '');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch incident details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersAndDepts = async () => {
    try {
      // HOD's users
      const usersResponse = await getAllUsers();
      setEmployees(usersResponse.data);
      
      // All departments
      const deptsResponse = await getDepartments();
      setDepartments(deptsResponse.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveInvestigation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!probableCause || !rootCause || !immediateAction || !preventiveAction || !severity || !priority) {
      setError('All mandatory investigation fields are required.');
      return;
    }

    try {
      const response = await submitInvestigation(id, {
        probable_cause: probableCause,
        root_cause: rootCause,
        immediate_action: immediateAction,
        preventive_action: preventiveAction,
        severity,
        priority,
        investigation_remarks: investigationRemarks
      });
      setSuccess('Investigation details saved successfully.');
      fetchIncidentDetails();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save investigation details.');
    }
  };

  const handleAssignCAPA = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!assignedTo || !assignedDept || !targetDate) {
      setError('Responsible employee, department, and target completion date are required.');
      return;
    }

    try {
      await assignAction(id, {
        assigned_to: assignedTo,
        assigned_department: assignedDept,
        target_completion_date: targetDate,
        implementation_remarks: capaRemarks,
        corrective_action: capaDescription
      });
      setSuccess('Corrective Action (CAPA) assigned successfully.');
      // Reset CAPA form
      setCapaDescription('');
      setCapaRemarks('');
      setTargetDate('');
      fetchIncidentDetails();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to assign corrective action.');
    }
  };

  const handleCloseIncident = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!verificationRemarks) {
      setError('Verification remarks are required to close this incident.');
      return;
    }

    try {
      await verifyClosure(id, {
        verification_remarks: verificationRemarks,
        supporting_document_path: supportingDocPath
      });
      setSuccess('Incident has been verified and officially closed.');
      fetchIncidentDetails();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to close incident.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--primary-blue)', fontWeight: '700' }}>Loading Incident Detail...</p>
      </div>
    );
  }

  const isClosed = incident?.status === 'Closed';

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title={`Incident: ${incident?.incident_number}`} />
        
        <div style={{ padding: '2rem', backgroundColor: '#FFFFFF', minHeight: 'calc(100vh - var(--navbar-height))' }}>
          
          {/* Back button and status badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <button onClick={() => navigate('/hod-dashboard')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <ArrowLeft size={16} />
              <span>Back to Console</span>
            </button>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status:</span>
              <StatusBadge type="status" value={incident?.status} />
            </div>
          </div>

          {error && (
            <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '1rem', borderRadius: '4px', marginBottom: '2.5rem', fontWeight: '600' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ backgroundColor: '#E8F5E9', border: '1px solid #C8E6C9', color: 'var(--success-green)', padding: '1rem', borderRadius: '4px', marginBottom: '2.5rem', fontWeight: '600' }}>
              {success}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2.5rem' }}>
            
            {/* Left Column: Details, History, Photograph */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              
              {/* Incident Specifications */}
              <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                  Incident Overview Specifications
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.875rem' }}>
                  <div>
                    <p style={{ margin: '0.4rem 0' }}><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Title:</span> {incident?.title}</p>
                    <p style={{ margin: '0.4rem 0' }}><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Department:</span> {incident?.department_name} ({incident?.department_code})</p>
                    <p style={{ margin: '0.4rem 0' }}><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Location:</span> {incident?.location}</p>
                    <p style={{ margin: '0.4rem 0' }}><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Equipment:</span> {incident?.equipment_involved || 'None'}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0.4rem 0' }}><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Type:</span> {incident?.unsafe_act_or_condition}</p>
                    <p style={{ margin: '0.4rem 0' }}><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Reported By:</span> {incident?.reporter_name}</p>
                    <p style={{ margin: '0.4rem 0' }}><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Reported Date:</span> {incident?.reported_at ? new Date(incident.reported_at).toLocaleDateString() : 'N/A'}</p>
                    <p style={{ margin: '0.4rem 0' }}><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Initial Severity:</span> <StatusBadge type="severity" value={incident?.potential_severity} /></p>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-light-gray)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.875rem' }}>
                  <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Description:</span>
                  <p style={{ whiteSpace: 'pre-line', color: 'var(--text-primary)' }}>{incident?.description}</p>
                </div>
              </div>

              {/* Photograph/Supporting Doc preview */}
              {incident?.photograph_path && (
                <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                    Uploaded Photograph / Document
                  </h2>
                  <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--bg-light-gray)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <FileSpreadsheet size={20} color="var(--primary-blue)" />
                    <span><b>Document Path:</b> {incident.photograph_path}</span>
                  </div>
                </div>
              )}

              {/* Safety Officer Review Panel */}
              {incident?.reviews && incident.reviews.length > 0 && (
                <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                    Safety Officer Review Notes
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {incident.reviews.map((rev) => (
                      <div key={rev.review_id} style={{ borderLeft: '4px solid var(--safety-orange)', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-light-gray)', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--primary-blue)', marginBottom: '0.25rem' }}>
                          <span>Reviewer: {rev.reviewer_name}</span>
                          <span>{new Date(rev.review_date).toLocaleDateString()}</span>
                        </div>
                        <p style={{ margin: '0.25rem 0', fontStyle: 'italic' }}>"{rev.comments}"</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status Outcome: <b>{rev.review_status}</b></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Log Timeline */}
              {incident?.audit_logs && incident.audit_logs.length > 0 && (
                <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                    Incident History & Audit Trails
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {incident.audit_logs.map((log) => (
                      <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.5rem 0', borderBottom: '1px dashed var(--border-color)' }}>
                        <div>
                          <b style={{ color: 'var(--text-primary)' }}>{log.action}</b>
                          <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }}>{log.details}</span>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Workflow Steps (Investigation, CAPA, Closure) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              
              {/* Step 1: Investigation Form */}
              <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                  Step 1: Incident Investigation Form
                </h2>
                
                <form onSubmit={handleSaveInvestigation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Probable Cause *</label>
                    <textarea rows="2" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Detail potential failure points" value={probableCause} onChange={(e) => setProbableCause(e.target.value)} disabled={isClosed} required />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Root Cause Analysis (RCA) *</label>
                    <textarea rows="3" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="5-Why or Fishbone root cause description" value={rootCause} onChange={(e) => setRootCause(e.target.value)} disabled={isClosed} required />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Immediate Action Taken *</label>
                    <textarea rows="2" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Containment / mitigation actions" value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} disabled={isClosed} required />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Preventive Action *</label>
                    <textarea rows="2" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Long-term preventive setup" value={preventiveAction} onChange={(e) => setPreventiveAction(e.target.value)} disabled={isClosed} required />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontWeight: 'bold' }}>Severity *</label>
                      <select style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={severity} onChange={(e) => setSeverity(e.target.value)} disabled={isClosed} required>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontWeight: 'bold' }}>Priority *</label>
                      <select style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={priority} onChange={(e) => setPriority(e.target.value)} disabled={isClosed} required>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Investigation Remarks (Optional)</label>
                    <textarea rows="2" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="HOD logs or safety findings" value={investigationRemarks} onChange={(e) => setInvestigationRemarks(e.target.value)} disabled={isClosed} />
                  </div>

                  {!isClosed && (
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--success-green)', borderColor: 'var(--success-green)', padding: '0.6rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                      SAVE INVESTIGATION
                    </button>
                  )}
                </form>
              </div>

              {/* Step 2: Corrective Action Assignment Form */}
              <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                  Step 2: Assign Corrective Action (CAPA)
                </h2>
                
                <form onSubmit={handleAssignCAPA} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Corrective Action Description</label>
                    <textarea rows="2" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Enter CAPA instruction" value={capaDescription} onChange={(e) => setCapaDescription(e.target.value)} disabled={isClosed} required />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Responsible Employee *</label>
                    <select style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={isClosed} required>
                      <option value="">-- Select Department Employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Responsible Department *</label>
                    <select style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={assignedDept} onChange={(e) => setAssignedDept(e.target.value)} disabled={isClosed} required>
                      <option value="">-- Select Department --</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Due Date / Target Completion Date *</label>
                    <input type="date" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} disabled={isClosed} required />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Implementation Remarks</label>
                    <textarea rows="2" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Add execution notes..." value={capaRemarks} onChange={(e) => setCapaRemarks(e.target.value)} disabled={isClosed} />
                  </div>

                  {!isClosed && (
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--primary-blue)', borderColor: 'var(--primary-blue)', padding: '0.6rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                      ASSIGN CORRECTIVE ACTION
                    </button>
                  )}
                </form>

                {/* Display current assigned action list */}
                {incident?.action_items && incident.action_items.length > 0 && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Active Tasks:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {incident.action_items.map((act) => (
                        <div key={act.id} style={{ border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '4px', backgroundColor: 'var(--bg-light-gray)', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'bold' }}>{act.assigned_to_name}</span>
                            <span className={`badge badge-${act.action_status === 'Completed' ? 'resolved' : 'pending'}`} style={{ fontSize: '0.65rem' }}>{act.action_status}</span>
                          </div>
                          <p style={{ margin: '0.2rem 0' }}>{act.description}</p>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Target: {act.target_completion_date ? new Date(act.target_completion_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Verification & Closure Form */}
              <div className="glass-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                  Step 3: Verification & Closure
                </h2>
                
                <form onSubmit={handleCloseIncident} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Verification Remarks *</label>
                    <textarea rows="3" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Specify verification notes and findings" value={verificationRemarks} onChange={(e) => setVerificationRemarks(e.target.value)} disabled={isClosed} required />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold' }}>Supporting Document Path (Reference)</label>
                    <input type="text" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="/uploads/documents/verified_file.pdf" value={supportingDocPath} onChange={(e) => setSupportingDocPath(e.target.value)} disabled={isClosed} />
                  </div>

                  {!isClosed && (
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--success-green)', borderColor: 'var(--success-green)', padding: '0.6rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                      VERIFY & CLOSE INCIDENT
                    </button>
                  )}

                  {isClosed && (
                    <div style={{ backgroundColor: 'var(--bg-light-gray)', border: '1px solid var(--success-green)', padding: '1rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--success-green)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={16} /> Closed Record (Read-Only)
                      </span>
                      <p style={{ margin: 0 }}>Closed Date: {incident.closed_date ? new Date(incident.closed_date).toLocaleString() : 'N/A'}</p>
                      <p style={{ margin: 0 }}>Closed By: {incident.closed_by_name || 'HOD'}</p>
                    </div>
                  )}
                </form>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default HODIncidentDetails;
