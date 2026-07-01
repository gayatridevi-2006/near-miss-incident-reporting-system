import React, { useState, useEffect } from 'react';
import { getAllUsers } from '../api/users';
import { getDepartments, createDepartment } from '../api/departments';
import { getEmployeeDashboard } from '../api/dashboard';
import Navbar from '../components/Navbar';
import { 
  Users, 
  Building, 
  Activity, 
  Plus, 
  Mail
} from 'lucide-react';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Department Form State
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [submittingDept, setSubmittingDept] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, dashboardRes] = await Promise.all([
        getAllUsers(),
        getDepartments(),
        getEmployeeDashboard()
      ]);
      
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      if (dashboardRes.data.audit_logs) {
        setAuditLogs(dashboardRes.data.audit_logs);
      }
    } catch (err) {
      console.error("Error loading admin data", err);
      setError('Could not load administrative console data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!deptName || !deptCode) return;

    setSubmittingDept(true);
    try {
      const response = await createDepartment({
        name: deptName,
        code: deptCode.toUpperCase()
      });
      setDepartments(prev => [...prev, response.data].sort((a,b) => a.name.localeCompare(b.name)));
      setDeptName('');
      setDeptCode('');
      alert('Department added successfully!');
    } catch (err) {
      console.error("Error creating department", err);
      alert(err.response?.data?.message || 'Failed to add department.');
    } finally {
      setSubmittingDept(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--primary-blue)', fontWeight: '700' }}>Loading Administrator Panels...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title="System Administration & Audit Controls" />
        
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            {/* User Directory */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
                <Users size={18} color="var(--primary-blue)" />
                <span>Steel Plant User Directory</span>
              </h3>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{u.first_name} {u.last_name}</td>
                        <td>{u.username}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Mail size={12} color="var(--text-muted)" />
                            <span>{u.email}</span>
                          </div>
                        </td>
                        <td>{u.department || 'None'}</td>
                        <td>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: u.role === 'Admin' ? 'var(--severity-high)' : u.role === 'Safety_Officer' ? 'var(--primary-blue)' : u.role === 'HOD' ? 'var(--status-pending)' : 'var(--text-muted)'
                          }}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Department Setup */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
                  <Building size={18} color="var(--primary-blue)" />
                  <span>Configure Departments</span>
                </h3>

                <form onSubmit={handleCreateDept}>
                  <div className="form-group">
                    <label className="form-label">Department Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="E.g., Plate Mill, Cold Rolling Mill"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Department Code</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="E.g., PM, CRM"
                      value={deptCode}
                      onChange={(e) => setDeptCode(e.target.value)}
                      maxLength={10}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={submittingDept}
                  >
                    <Plus size={14} />
                    <span>{submittingDept ? 'Adding...' : 'Add Department'}</span>
                  </button>
                </form>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Active Departments ({departments.length})
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}>
                    {departments.map(d => (
                      <span 
                        key={d.id} 
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--light-blue)',
                          border: '1px solid var(--border-hover)',
                          color: 'var(--primary-blue)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}
                      >
                        {d.name} ({d.code})
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Full audit logs view */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
              <Activity size={18} color="var(--primary-blue)" />
              <span>Full System Operations Audit Trail</span>
            </h3>

            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={{ fontWeight: '700', color: 'var(--primary-blue)' }}>{log.action}</td>
                        <td>{log.username}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{log.details}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.ip_address}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No audit logs captured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
