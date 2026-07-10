import React, { useState, useEffect } from 'react';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  resetPassword, 
  activateUser, 
  deactivateUser, 
  archiveUser 
} from '../api/users';
import { getDepartments } from '../api/departments';
import Navbar from '../components/Navbar';
import { 
  Users, 
  Plus, 
  Edit, 
  Power, 
  PowerOff, 
  Search,
  X,
  AlertTriangle,
  Mail,
  Briefcase,
  Copy,
  Check,
  Trash2,
  Archive,
  Key,
  MoreVertical,
  Eye
} from 'lucide-react';

const UserManagement = () => {
  const generateTempPassword = (userRole, empId) => {
    const rolePrefixes = {
      'Employee': 'Emp',
      'Trainee': 'Train',
      'Intern': 'Intern',
      'Contractor': 'Cont',
      'Safety_Officer': 'Safe',
      'Safety Officer': 'Safe',
      'HOD': 'HOD',
      'Admin': 'Admin',
      'Administrator': 'Admin'
    };
    const prefix = rolePrefixes[userRole] || 'Emp';
    
    // Extract digits from empId
    const digits = empId.replace(/\D/g, '');
    let suffix = '1234';
    if (digits.length >= 4) {
      suffix = digits.slice(-4);
    } else if (digits.length > 0) {
      suffix = digits.padStart(4, '0');
    }
    return `${prefix}@${suffix}`;
  };

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };
  
  // Form states
  const [currentUserId, setCurrentUserId] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [role, setRole] = useState('Employee');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('Active');
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(false);
  const [popupCredentials, setPopupCredentials] = useState({ employeeId: '', temporaryPassword: '' });
  const [activeDropdownUserId, setActiveDropdownUserId] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.actions-dropdown-container')) {
        setActiveDropdownUserId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const [usersRes, deptsRes] = await Promise.all([
        getAllUsers(),
        getDepartments()
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error("Error loading user administration data from API, using simulated fallback", err);
      const mockDepts = [
        { id: 1, name: 'Steel Melting Shop', code: 'SMS', status: 'Active' },
        { id: 2, name: 'Blast Furnace', code: 'BF', status: 'Active' },
        { id: 3, name: 'Coke Ovens', code: 'CO', status: 'Active' },
        { id: 4, name: 'Rolling Mills', code: 'RM', status: 'Active' },
        { id: 5, name: 'Safety & Environment', code: 'SE', status: 'Active' }
      ];
      const mockUsers = [
        { id: 1, employee_id: 'emp001', name: 'Rajesh Kumar', email: 'rajesh@steelplant.gov.in', role: 'Employee', department_id: 1, department: 'Steel Melting Shop', department_code: 'SMS', status: 'Active', first_login: true },
        { id: 2, employee_id: 'hod001', name: 'Dr. Amit Patel', email: 'amit.patel@steelplant.gov.in', role: 'HOD', department_id: 2, department: 'Blast Furnace', department_code: 'BF', status: 'Active', first_login: false },
        { id: 3, employee_id: 'safe001', name: 'Sanjay Singh', email: 'sanjay.safety@steelplant.gov.in', role: 'Safety_Officer', department_id: 5, department: 'Safety & Environment', department_code: 'SE', status: 'Active', first_login: false },
        { id: 4, employee_id: 'admin001', name: 'Systems Admin', email: 'admin@steelplant.gov.in', role: 'Admin', department_id: 5, department: 'Safety & Environment', department_code: 'SE', status: 'Active', first_login: false }
      ];
      setUsers(mockUsers);
      setDepartments(mockDepts);
      setSuccessMessage('Loaded simulated user registry (offline mode).');
    } finally {
      setLoading(false);
    }
  };
  const validateForm = (isEdit = false) => {
    const trimmedEmpId = employeeId.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMobile = mobileNumber.trim();
    
    if (!trimmedEmpId || !trimmedName || !trimmedEmail || !departmentId) {
      setFormError('All required fields must be completed.');
      return false;
    }
    
    if (trimmedMobile) {
      const mobileRegex = /^\+?[0-9]{10,15}$/;
      if (!mobileRegex.test(trimmedMobile)) {
        setFormError('Invalid mobile number format. Should be 10-15 digits.');
        return false;
      }
    }

    // Email regex check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setFormError('Invalid email format.');
      return false;
    }

    // Uniqueness checks (Client-side helper warning)
    const duplicateEmp = users.some(u => 
      u.employee_id.toLowerCase() === trimmedEmpId.toLowerCase() && u.id !== currentUserId
    );
    if (duplicateEmp) {
      setFormError('Employee ID already registered.');
      return false;
    }

    const duplicateEmail = users.some(u => 
      u.email.toLowerCase() === trimmedEmail.toLowerCase() && u.id !== currentUserId
    );
    if (duplicateEmail) {
      setFormError('Email address already registered.');
      return false;
    }

    setFormError('');
    return true;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    setSubmitting(true);
    setFormError('');
    setSuccessMessage('');
    try {
      const response = await createUser({
        employee_id: employeeId.trim(),
        name: name.trim(),
        email: email.trim(),
        role: role,
        department_id: Number(departmentId),
        mobile_number: mobileNumber.trim()
      });
      
      const { user: newUser, email_sent, temporary_password } = response.data;
      setUsers(prev => [...prev, newUser].sort((a,b) => a.name.localeCompare(b.name)));
      
      if (email_sent === false) {
        setPopupCredentials({
          employeeId: newUser.employee_id,
          temporaryPassword: temporary_password
        });
        setIsAddOpen(false);
        setIsPopupOpen(true);
      } else {
        setSuccessMessage("Credentials have been sent successfully.");
        setIsAddOpen(false);
        resetForm();
      }
    } catch (err) {
      console.error("Error creating user, simulating in UI", err);
      const simulatedId = Date.now();
      const selectedDept = departments.find(d => d.id === Number(departmentId));
      const simulatedTempPassword = generateTempPassword(role, employeeId);
      
      const newUser = {
        id: simulatedId,
        employee_id: employeeId.trim(),
        name: name.trim(),
        email: email.trim(),
        role: role,
        department_id: Number(departmentId),
        department: selectedDept ? selectedDept.name : '',
        department_code: selectedDept ? selectedDept.code : '',
        mobile_number: mobileNumber.trim(),
        status: 'Active',
        first_login: true
      };

      setUsers(prev => [...prev, newUser].sort((a,b) => a.name.localeCompare(b.name)));
      
      setPopupCredentials({
        employeeId: newUser.employee_id,
        temporaryPassword: simulatedTempPassword
      });
      setIsAddOpen(false);
      setIsPopupOpen(true);
      setSuccessMessage("Credentials have been sent successfully (Simulated).");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user) => {
    setCurrentUserId(user.id);
    setEmployeeId(user.employee_id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setDepartmentId(user.department_id || '');
    setStatus(user.status);
    setPassword(''); // keep blank unless resetting
    setFormError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    setSubmitting(true);
    setFormError('');
    setSuccessMessage('');
    const payload = {
      name: name.trim(),
      email: email.trim(),
      role: role,
      department_id: Number(departmentId),
      status: status
    };
    if (password) {
      payload.password = password;
    }

    try {
      const response = await updateUser(currentUserId, payload);
      if (response && response.data) {
        setUsers(prev => prev.map(u => u.id === currentUserId ? response.data : u).sort((a,b) => a.name.localeCompare(b.name)));
        setSuccessMessage('User profile updated successfully.');
      } else {
        throw new Error("No data returned");
      }
    } catch (err) {
      console.error("Error updating user, simulating in UI", err);
      const dept = departments.find(d => d.id === Number(departmentId));
      setUsers(prev => prev.map(u => u.id === currentUserId ? { 
        ...u, 
        name: payload.name,
        email: payload.email,
        role: payload.role,
        department_id: payload.department_id,
        department: dept ? dept.name : u.department,
        department_code: dept ? dept.code : u.department_code,
        status: payload.status
      } : u).sort((a,b) => a.name.localeCompare(b.name)));
      setSuccessMessage('User profile updated successfully (Simulated).');
    } finally {
      setIsEditOpen(false);
      setSubmitting(false);
      resetForm();
    }
  };

  const handleToggleStatus = (user, newStatus) => {
    const title = newStatus === 'Inactive' ? 'Deactivate User Account' : 'Activate User Account';
    const confirmationMsg = `Are you sure you want to ${newStatus === 'Inactive' ? 'deactivate' : 'activate'} the account of "${user.name}" (${user.employee_id})?`;
    
    showConfirm(title, confirmationMsg, async () => {
      setSuccessMessage('');
      setError('');
      try {
        let response;
        if (newStatus === 'Active') {
          response = await activateUser(user.id);
        } else {
          response = await deactivateUser(user.id);
        }
        if (response && response.data) {
          setUsers(prev => prev.map(u => u.id === user.id ? response.data : u));
          setSuccessMessage(`User account status updated to ${newStatus} successfully.`);
        } else {
          throw new Error("No data returned");
        }
      } catch (err) {
        console.error("Error toggling status, simulating in UI", err);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        setSuccessMessage(`User account status updated to ${newStatus} successfully (Simulated).`);
      }
    });
  };

  const handleDeleteUser = (user) => {
    const confirmationMsg = `Are you sure you want to delete the user account for "${user.name}" (${user.employee_id})? This action cannot be undone.`;
    
    showConfirm('Delete User Account', confirmationMsg, async () => {
      setSuccessMessage('');
      setError('');
      try {
        await deleteUser(user.id);
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setSuccessMessage("User deleted successfully.");
      } catch (err) {
        console.error("Error deleting user, simulating in UI", err);
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setSuccessMessage("User deleted successfully (Simulated).");
      }
    });
  };

  const handleArchiveUser = (user) => {
    const confirmationMsg = `Are you sure you want to archive the account of "${user.name}" (${user.employee_id})?`;
    
    showConfirm('Archive User Account', confirmationMsg, async () => {
      setSuccessMessage('');
      setError('');
      try {
        const response = await archiveUser(user.id);
        if (response && response.data) {
          setUsers(prev => prev.map(u => u.id === user.id ? response.data : u));
          setSuccessMessage("User archived successfully.");
        } else {
          throw new Error("No data returned");
        }
      } catch (err) {
        console.error("Error archiving user, simulating in UI", err);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'Archived' } : u));
        setSuccessMessage("User archived successfully (Simulated).");
      }
    });
  };

  const handleResetPassword = (user) => {
    const confirmationMsg = `Are you sure you want to reset the password for "${user.name}" (${user.employee_id})?`;
    
    showConfirm('Reset User Password', confirmationMsg, async () => {
      setSuccessMessage('');
      setError('');
      try {
        const response = await resetPassword(user.id);
        if (response && response.data) {
          const { email_sent, temporary_password } = response.data;
          
          if (email_sent === false) {
            setPopupCredentials({
              employeeId: user.employee_id,
              temporaryPassword: temporary_password
            });
            setIsPopupOpen(true);
            setSuccessMessage("Credentials have been sent successfully.");
          } else {
            setSuccessMessage("Password reset successfully. New credentials emailed.");
          }
        } else {
          throw new Error("No data returned");
        }
      } catch (err) {
        console.error("Error resetting password, simulating in UI", err);
        const simulatedPassword = generateTempPassword(user.role, user.employee_id);
        setPopupCredentials({
          employeeId: user.employee_id,
          temporaryPassword: simulatedPassword
        });
        setIsPopupOpen(true);
        setSuccessMessage("Credentials have been sent successfully (Simulated).");
      }
    });
  };

  const resetForm = () => {
    setCurrentUserId(null);
    setEmployeeId('');
    setName('');
    setEmail('');
    setPassword('');
    setMobileNumber('');
    setRole('Employee');
    setDepartmentId('');
    setStatus('Active');
    setFormError('');
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'All' ? u.status !== 'Archived' : u.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (userRole) => {
    switch (userRole) {
      case 'Admin': return 'var(--severity-high)';
      case 'Safety_Officer': return 'var(--primary-blue)';
      case 'HOD': return 'var(--status-pending)';
      default: return 'var(--text-muted)';
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--primary-blue)', fontWeight: '700' }}>Loading Users Registry...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <style>{`
        .compact-cell {
          padding: 0.4rem 0.6rem !important;
          vertical-align: middle !important;
          font-size: 0.825rem !important;
        }
        .compact-row {
          height: 38px !important;
        }
        .dropdown-item {
          transition: background-color 0.2s ease;
        }
        .dropdown-item:hover {
          background-color: #F5F5F5 !important;
        }
      `}</style>
      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title="Steel Plant Users & Role Administration" />
        
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

          {successMessage && (
            <div style={{
              backgroundColor: '#E8F5E9',
              border: '1px solid #C8E6C9',
              color: '#2E7D32',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '2rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{successMessage}</span>
              <button 
                onClick={() => setSuccessMessage('')}
                style={{ background: 'none', border: 'none', color: '#2E7D32', cursor: 'pointer', fontWeight: 'bold' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Search, Filter, and Action Header */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
              
              <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px', maxWidth: '700px' }}>
                {/* Search field */}
                <div style={{ position: 'relative', flex: 2 }}>
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search by name, employee ID, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>

                {/* Role select filter */}
                <select 
                  className="form-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="All">All Roles</option>
                  <option value="Employee">Employee</option>
                  <option value="Safety_Officer">Safety Officer</option>
                  <option value="HOD">HOD</option>
                  <option value="Admin">Admin</option>
                  <option value="Trainee">Trainee</option>
                  <option value="Intern">Intern</option>
                  <option value="Contractor">Contractor</option>
                </select>

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
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Add user button */}
              <button 
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  // Default department to the first active department if available
                  const activeDepts = departments.filter(d => d.status === 'Active');
                  if (activeDepts.length > 0) {
                    setDepartmentId(activeDepts[0].id.toString());
                  }
                  setIsAddOpen(true);
                }}
              >
                <Plus size={16} />
                <span>Add User Account</span>
              </button>
            </div>
          </div>

          {/* User List Table */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
                <Users size={18} color="var(--primary-blue)" />
                <span>Registered Plant Users & Roles</span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Total: {filteredUsers.length} accounts found
              </span>
            </div>

            <div className="table-container">
              <table className="custom-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr className="compact-row">
                    <th className="compact-cell">Employee Details</th>
                    <th className="compact-cell">Email Address</th>
                    <th className="compact-cell">Department</th>
                    <th className="compact-cell">System Role</th>
                    <th className="compact-cell">Status</th>
                    <th className="compact-cell" style={{ width: '80px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="compact-row">
                        <td className="compact-cell">
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.2' }}>{u.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>ID: {u.employee_id}</div>
                        </td>
                        <td className="compact-cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-primary)' }}>
                            <Mail size={12} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.8rem' }}>{u.email}</span>
                          </div>
                        </td>
                        <td className="compact-cell" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                          {u.department ? `${u.department} (${u.department_code})` : 'Unassigned'}
                        </td>
                        <td className="compact-cell">
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: getRoleBadgeColor(u.role)
                          }}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="compact-cell">
                          <span className={
                            u.status === 'Active' 
                              ? 'badge badge-resolved' 
                              : u.status === 'Archived' 
                                ? 'badge badge-assigned' 
                                : 'badge badge-closed'
                          } style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}>
                            {u.status}
                          </span>
                        </td>
                        <td className="compact-cell" style={{ textAlign: 'center', width: '80px', position: 'relative' }}>
                          <div className="actions-dropdown-container" style={{ display: 'inline-block' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownUserId(activeDropdownUserId === u.id ? null : u.id);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#555555',
                                transition: 'background-color 0.2s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEEEEE'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              title="Actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {activeDropdownUserId === u.id && (
                              <div style={{
                                position: 'absolute',
                                right: '10px',
                                top: '80%',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #CCCCCC',
                                borderRadius: '4px',
                                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
                                zIndex: 100,
                                minWidth: '160px',
                                padding: '0.4rem 0',
                                textAlign: 'left',
                              }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("View action clicked for", u.employee_id);
                                    setViewUser(u);
                                    setIsViewOpen(true);
                                    setActiveDropdownUserId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 1rem',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    color: '#333333',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                  }}
                                  className="dropdown-item"
                                >
                                  <Eye size={12} />
                                  <span>View Details</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Edit action clicked for", u.employee_id);
                                    handleOpenEdit(u);
                                    setActiveDropdownUserId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 1rem',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    color: '#333333',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                  }}
                                  className="dropdown-item"
                                >
                                  <Edit size={12} />
                                  <span>Edit</span>
                                </button>
                                {u.status === 'Active' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log("Deactivate action clicked for", u.employee_id);
                                      handleToggleStatus(u, 'Inactive');
                                      setActiveDropdownUserId(null);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem 1rem',
                                      border: 'none',
                                      background: 'none',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      color: '#C62828',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                    }}
                                    className="dropdown-item"
                                  >
                                    <PowerOff size={12} />
                                    <span>Deactivate</span>
                                  </button>
                                ) : (
                                  u.status !== 'Archived' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("Activate action clicked for", u.employee_id);
                                        handleToggleStatus(u, 'Active');
                                        setActiveDropdownUserId(null);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem 1rem',
                                        border: 'none',
                                        background: 'none',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        color: '#2E7D32',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                      }}
                                      className="dropdown-item"
                                    >
                                      <Power size={12} />
                                      <span>Activate</span>
                                    </button>
                                  )
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Reset Password action clicked for", u.employee_id);
                                    handleResetPassword(u);
                                    setActiveDropdownUserId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 1rem',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    color: '#333333',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                  }}
                                  className="dropdown-item"
                                >
                                  <Key size={12} />
                                  <span>Reset Password</span>
                                </button>
                                {u.status !== 'Archived' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log("Archive action clicked for", u.employee_id);
                                      handleArchiveUser(u);
                                      setActiveDropdownUserId(null);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem 1rem',
                                      border: 'none',
                                      background: 'none',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      color: '#333333',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                    }}
                                    className="dropdown-item"
                                  >
                                    <Archive size={12} />
                                    <span>Archive User</span>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Delete action clicked for", u.employee_id);
                                    handleDeleteUser(u);
                                    setActiveDropdownUserId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 1rem',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    color: '#C62828',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                  }}
                                  className="dropdown-item"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete User</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No user accounts match the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
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
            maxWidth: '550px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', fontWeight: '700' }}>Register New User Profile</h3>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="E.g., emp123"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="E.g., Rajesh Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Official Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="name@steelplant.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="E.g., 9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Assigned Department</label>
                  <select 
                    className="form-select"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id} disabled={d.status !== 'Active'}>
                        {d.name} ({d.code}) {d.status === 'Inactive' ? '- [Inactive]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <select 
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="Employee">Employee</option>
                    <option value="Safety_Officer">Safety Officer</option>
                    <option value="HOD">Head of Department (HOD)</option>
                    <option value="Admin">Administrator</option>
                    <option value="Trainee">Trainee</option>
                    <option value="Intern">Intern</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>
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
                  {submitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Delivery Failure backup credentials popup */}
      {isPopupOpen && (
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
              <h3 style={{ fontSize: '1.1rem', color: '#2E7D32', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={18} color="#2E7D32" />
                <span>Credentials Backup Required</span>
              </h3>
              <button 
                onClick={() => {
                  setIsPopupOpen(false);
                  resetForm();
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              backgroundColor: '#FFF3E0',
              border: '1px solid #FFE0B2',
              color: '#E65100',
              padding: '0.75rem 1rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              marginBottom: '1.5rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} />
              <span>Email service is unavailable. Please securely communicate the temporary password to the user.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#F5F5F5', padding: '1.25rem', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Employee ID:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{popupCredentials.employeeId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Temporary Password:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--text-primary)', backgroundColor: '#E0F2F1', padding: '0.2rem 0.5rem', borderRadius: '2px' }}>{popupCredentials.temporaryPassword}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn"
                onClick={() => {
                  const textToCopy = `Employee ID: ${popupCredentials.employeeId}\nTemporary Password: ${popupCredentials.temporaryPassword}`;
                  navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    })
                    .catch(err => {
                      console.error('Failed to copy text: ', err);
                    });
                }}
                style={{
                  backgroundColor: copied ? '#2E7D32' : 'var(--primary-blue)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setIsPopupOpen(false);
                  resetForm();
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
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
            maxWidth: '550px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', fontWeight: '700' }}>Modify User Profile</h3>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Employee ID (Disabled)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={employeeId}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Full Name {['Employee', 'Trainee', 'Intern', 'Contractor'].includes(role) && ' (Read-only for Employees)'}
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={['Employee', 'Trainee', 'Intern', 'Contractor'].includes(role)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Email Address {['Employee', 'Trainee', 'Intern', 'Contractor'].includes(role) && ' (Read-only for Employees)'}
                  </label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={['Employee', 'Trainee', 'Intern', 'Contractor'].includes(role)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reset Password (Optional)</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Leave blank to keep current"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Assigned Department</label>
                  <select 
                    className="form-select"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code}) {d.status === 'Inactive' ? '- [Inactive]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <select 
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="Employee">Employee</option>
                    <option value="Safety_Officer">Safety Officer</option>
                    <option value="HOD">Head of Department (HOD)</option>
                    <option value="Admin">Administrator</option>
                    <option value="Trainee">Trainee</option>
                    <option value="Intern">Intern</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Account Status</label>
                <select 
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
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
      {/* View User Modal */}
      {isViewOpen && viewUser && (
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
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} />
                <span>User Profile Details</span>
              </h3>
              <button 
                onClick={() => {
                  setIsViewOpen(false);
                  setViewUser(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #F0F0F0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Employee ID:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewUser.employee_id}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #F0F0F0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Full Name:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewUser.name}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #F0F0F0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Official Email:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewUser.email}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #F0F0F0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Mobile Number:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewUser.mobile_number || 'N/A'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #F0F0F0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Department:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewUser.department || 'N/A'} ({viewUser.department_code || 'N/A'})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #F0F0F0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>System Role:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewUser.role}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #F0F0F0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Account Status:</span>
                <span>
                  <span className={
                    viewUser.status === 'Active' 
                      ? 'badge badge-resolved' 
                      : viewUser.status === 'Archived' 
                        ? 'badge badge-assigned' 
                        : 'badge badge-closed'
                  } style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}>
                    {viewUser.status}
                  </span>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setIsViewOpen(false);
                  setViewUser(null);
                }}
              >
                Close
              </button>
            </div>
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
                  backgroundColor: confirmModal.title.toLowerCase().includes('delete') ? '#C62828' : 'var(--primary-blue)',
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

export default UserManagement;
