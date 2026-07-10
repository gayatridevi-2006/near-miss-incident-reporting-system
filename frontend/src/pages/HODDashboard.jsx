import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getHODDashboard } from '../api/hod';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  Users,
  Eye,
  FileText,
  Briefcase
} from 'lucide-react';

const HODDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await getHODDashboard();
      setData(response.data);
    } catch (err) {
      console.error("Error fetching HOD dashboard data", err);
      setError('Could not load department safety dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--primary-blue)', fontWeight: '700' }}>Loading Department Safety Control...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title="HOD Safety Operations Console" />
        
        <div className="page-body fade-in" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', minHeight: 'calc(100vh - var(--navbar-height))' }}>
          
          {/* Welcome Alert banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            padding: '1.5rem 2rem',
            backgroundColor: 'var(--light-blue)',
            borderLeft: '4px solid var(--primary-blue)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px'
          }}>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--primary-blue)', marginBottom: '0.25rem' }}>
                DEPARTMENT: {user?.department || 'Steel Operations'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>
                Safety Officer submissions, registrations, and investigation workflows are restricted to your department.
              </p>
            </div>
            
            <button 
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--success-green)', borderColor: 'var(--success-green)' }}
              onClick={() => navigate('/hod-reports')}
            >
              <FileText size={16} />
              <span>Generate Safety Reports</span>
            </button>
          </div>

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

          {/* KPIs Row */}
          {data?.kpis && (
            <div className="kpi-grid" style={{ marginBottom: '2.5rem' }}>
              <StatCard 
                title="Total Pending Incidents" 
                value={data.kpis.total_pending_incidents} 
                icon={AlertTriangle} 
                color="#1976D2" 
              />
              <StatCard 
                title="Under Investigation" 
                value={data.kpis.incidents_under_investigation} 
                icon={Clock} 
                color="#0D47A1" 
              />
              <StatCard 
                title="Corrective Actions Pending" 
                value={data.kpis.corrective_actions_pending} 
                icon={TrendingUp} 
                color="#E65100" 
              />
              <StatCard 
                title="Closed Incidents" 
                value={data.kpis.closed_incidents} 
                icon={CheckCircle} 
                color="#2E7D32" 
              />
            </div>
          )}

          {/* Split Table Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
            
            {/* 1. Pending Incidents Forwarded by Safety Officer */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} />
                  <span>Forwarded Near Miss Reports</span>
                </h3>
                <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                  Action Needed
                </span>
              </div>
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Ref ID</th>
                      <th>Title</th>
                      <th>Severity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recent_incidents?.filter(i => i.status !== 'Closed').length > 0 ? (
                      data.recent_incidents.filter(i => i.status !== 'Closed').map((inc) => (
                        <tr key={inc.id}>
                          <td style={{ fontWeight: 'bold' }}>{inc.incident_number}</td>
                          <td>{inc.title}</td>
                          <td><StatusBadge type="severity" value={inc.potential_severity} /></td>
                          <td>
                            <Link to={`/hod-incidents/${inc.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Eye size={12} />
                              <span>Manage</span>
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                          No pending incident reports forwarded to your department.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Pending Registration Requests */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} />
                  <span>Pending Department Registrations</span>
                </h3>
                <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                  Approval Req.
                </span>
              </div>
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Name</th>
                      <th>Role Requested</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.pending_registrations?.length > 0 ? (
                      data.pending_registrations.map((req) => (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 'bold' }}>{req.employee_id}</td>
                          <td>{req.full_name}</td>
                          <td>{req.user_type}</td>
                          <td>
                            <Link to="/hod-approvals" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', backgroundColor: 'var(--success-green)', color: 'white', border: 'none', borderRadius: '4px' }}>
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                          No pending registration requests for your department.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Corrective Actions & Closure Progress Rows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
            
            {/* 3. Recent Corrective Actions (CAPA progress tracking) */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} />
                <span>Corrective Action Plans (CAPA) Monitor</span>
              </h3>
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Incident</th>
                      <th>Assigned To</th>
                      <th>Target Date</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recent_corrective_actions?.length > 0 ? (
                      data.recent_corrective_actions.map((act) => (
                        <tr key={act.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 'bold' }}>{act.incident_number}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{act.incident_title}</span>
                            </div>
                          </td>
                          <td>{act.assigned_to_name}</td>
                          <td>{act.target_completion_date ? new Date(act.target_completion_date).toLocaleDateString() : 'N/A'}</td>
                          <td>
                            <span className={`badge badge-${act.action_status === 'Completed' ? 'resolved' : act.action_status === 'In Progress' ? 'investigating' : 'pending'}`}>
                              {act.action_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                          No active corrective actions assigned.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Recently Closed Incidents (Audit read-only history) */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} />
                <span>Closed Incident Logs</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                {data?.recently_closed_incidents?.length > 0 ? (
                  data.recently_closed_incidents.map((inc) => (
                    <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{inc.incident_number}</span>
                        <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)' }}>{inc.title}</p>
                      </div>
                      <Link to={`/hod-incidents/${inc.id}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>
                        Details
                      </Link>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No closed incident logs in your department.
                  </p>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default HODDashboard;
