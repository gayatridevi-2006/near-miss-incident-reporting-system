import React, { useState, useEffect } from 'react';
import { getDepartments, createDepartment, updateDepartment } from '../api/departments';
import Navbar from '../components/Navbar';
import { 
  Building, 
  Plus, 
  Edit, 
  Power, 
  PowerOff, 
  Search,
  X,
  AlertTriangle
} from 'lucide-react';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Form states
  const [currentDeptId, setCurrentDeptId] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptStatus, setDeptStatus] = useState('Active');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await getDepartments();
      setDepartments(response.data);
    } catch (err) {
      console.error("Error fetching departments", err);
      setError('Could not retrieve departments database.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const trimmedName = deptName.trim();
    const trimmedCode = deptCode.trim();
    
    if (!trimmedName || !trimmedCode) {
      setFormError('All fields are required.');
      return false;
    }
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setFormError('Department name must be between 2 and 100 characters.');
      return false;
    }
    if (trimmedCode.length < 2 || trimmedCode.length > 10) {
      setFormError('Department code must be between 2 and 10 characters.');
      return false;
    }
    
    // Client-side uniqueness check
    const duplicateName = departments.some(d => 
      d.name.toLowerCase() === trimmedName.toLowerCase() && d.id !== currentDeptId
    );
    if (duplicateName) {
      setFormError('Another department with this name already exists.');
      return false;
    }

    const duplicateCode = departments.some(d => 
      d.code.toLowerCase() === trimmedCode.toLowerCase() && d.id !== currentDeptId
    );
    if (duplicateCode) {
      setFormError('Another department with this code already exists.');
      return false;
    }

    setFormError('');
    return true;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const response = await createDepartment({
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase()
      });
      setDepartments(prev => [...prev, response.data].sort((a,b) => a.name.localeCompare(b.name)));
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error creating department", err);
      setFormError(err.response?.data?.message || 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (dept) => {
    setCurrentDeptId(dept.id);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptStatus(dept.status);
    setFormError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const response = await updateDepartment(currentDeptId, {
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        status: deptStatus
      });
      setDepartments(prev => prev.map(d => d.id === currentDeptId ? response.data : d).sort((a,b) => a.name.localeCompare(b.name)));
      setIsEditOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error updating department", err);
      setFormError(err.response?.data?.message || 'Failed to update department.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = (dept, newStatus) => {
    const action = newStatus === 'Inactive' ? 'deactivate' : 'activate';
    setConfirmModal({
      isOpen: true,
      title: `${newStatus === 'Inactive' ? 'Deactivate' : 'Activate'} Department`,
      message: `Are you sure you want to ${action} the department "${dept.name}" (${dept.code})?`,
      onConfirm: async () => {
        setError('');
        try {
          const response = await updateDepartment(dept.id, {
            name: dept.name,
            code: dept.code,
            status: newStatus
          });
          setDepartments(prev => prev.map(d => d.id === dept.id ? response.data : d));
        } catch (err) {
          console.error("Error toggling department status", err);
          setError(err.response?.data?.message || `Failed to ${action} department.`);
        }
      }
    });
  };

  const resetForm = () => {
    setCurrentDeptId(null);
    setDeptName('');
    setDeptCode('');
    setDeptStatus('Active');
    setFormError('');
  };

  const filteredDepts = departments.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--primary-blue)', fontWeight: '700' }}>Loading Department Registry...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title="Department Management & Configuration" />
        
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

          {/* Search, Filter, and Action Header */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
              
              <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px', maxWidth: '600px' }}>
                {/* Search field */}
                <div style={{ position: 'relative', flex: 2 }}>
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search by department name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>

                {/* Status select filter */}
                <select 
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Add button */}
              <button 
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setIsAddOpen(true);
                }}
              >
                <Plus size={16} />
                <span>Add Department</span>
              </button>
            </div>
          </div>

          {/* Department List Grid */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
                <Building size={18} color="var(--primary-blue)" />
                <span>Steel Plant Departments Register</span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Total: {filteredDepts.length} departments found
              </span>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Department Code</th>
                    <th>Department Name</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepts.length > 0 ? (
                    filteredDepts.map((dept) => (
                      <tr key={dept.id}>
                        <td style={{ fontWeight: '700', color: 'var(--primary-blue)' }}>{dept.code}</td>
                        <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{dept.name}</td>
                        <td>
                          <span className={dept.status === 'Active' ? 'badge badge-resolved' : 'badge badge-closed'}>
                            {dept.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{new Date(dept.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleOpenEdit(dept)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              <Edit size={12} />
                              <span>Edit</span>
                            </button>
                            
                            {dept.status === 'Active' ? (
                              <button
                                onClick={() => handleToggleStatus(dept, 'Inactive')}
                                className="btn btn-danger"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <PowerOff size={12} />
                                <span>Deactivate</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(dept, 'Active')}
                                className="btn btn-primary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Power size={12} />
                                <span>Activate</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No departments match the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Department Modal */}
      {isAddOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div className="glass-card" style={{
            backgroundColor: '#FFFFFF',
            padding: '2.5rem',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', fontWeight: '700' }}>Register New Department</h3>
              <button 
                onClick={() => setIsAddOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{
                backgroundColor: '#FFEBEE',
                border: '1px solid #FFCDD2',
                color: '#C62828',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <AlertTriangle size={14} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">Department Code (2-10 chars)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="E.g., SMS, BF, RM"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Department Name (2-100 chars)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="E.g., Steel Melting Shop, Blast Furnace"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {isEditOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div className="glass-card" style={{
            backgroundColor: '#FFFFFF',
            padding: '2.5rem',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', fontWeight: '700' }}>Modify Department Registry</h3>
              <button 
                onClick={() => setIsEditOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{
                backgroundColor: '#FFEBEE',
                border: '1px solid #FFCDD2',
                color: '#C62828',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <AlertTriangle size={14} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Department Code (2-10 chars)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department Name (2-100 chars)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Registry Status</label>
                <select 
                  className="form-select"
                  value={deptStatus}
                  onChange={(e) => setDeptStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 210
        }}>
          <div className="glass-card" style={{
            backgroundColor: '#FFFFFF',
            padding: '2rem',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            width: '100%',
            maxWidth: '450px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} color="var(--status-pending)" />
                <span>{confirmModal.title}</span>
              </h3>
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              {confirmModal.message}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ 
                  backgroundColor: 'var(--primary-blue)',
                  color: '#FFFFFF'
                }}
                onClick={() => {
                  setConfirmModal({ ...confirmModal, isOpen: false });
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentManagement;
