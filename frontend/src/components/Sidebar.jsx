import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  CheckSquare, 
  BarChart3, 
  Users, 
  LogOut,
  Building,
  User,
  UserCheck
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout, isHOD, isSafetyOfficer, isAdmin, isGeneralManager, isPlantHead, isSeniorManagement, isManagementUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'Admin': return 'System Administrator';
      case 'Safety_Officer': return 'Safety Officer';
      case 'HOD': return 'Head of Department';
      case 'General_Manager': return 'General Manager';
      case 'Plant_Head': return 'Plant Head';
      case 'Senior_Management': return 'Senior Management';
      default: return role || 'Employee';
    }
  };

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1.25rem',
    color: isActive ? 'var(--primary-blue)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--light-blue)' : 'transparent',
    borderLeft: isActive ? '4px solid var(--primary-blue)' : '4px solid transparent',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: isActive ? '700' : '500',
    transition: 'all 0.15s ease'
  });

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--bg-light-gray)',
      borderRight: '1px solid var(--border-color)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.75rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={24} color="var(--primary-blue)" />
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '800', 
            color: 'var(--primary-blue)',
            fontFamily: 'Inter, sans-serif'
          }}>SAFE-STEEL</h1>
        </div>
        <span style={{ 
          fontSize: '0.675rem', 
          color: 'var(--text-muted)', 
          letterSpacing: '0.05em',
          fontWeight: '700'
        }}>NEAR MISS IMS (ERP)</span>
      </div>

      {/* User profile brief */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(0,0,0,0.02)'
      }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User Account'}
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--primary-blue)', 
          marginTop: '0.15rem',
          fontWeight: '600'
        }}>
          {getRoleLabel(user?.role)}
        </div>
        {user?.department && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem', 
            fontSize: '0.7rem', 
            color: 'var(--text-secondary)',
            marginTop: '0.4rem'
          }}>
            <Building size={12} />
            <span>{user.department}</span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
        <NavLink to={isHOD ? "/hod-dashboard" : "/dashboard"} style={linkStyle} end>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        {!(isGeneralManager || isPlantHead || isSeniorManagement) && (
          <NavLink to="/report" style={linkStyle}>
            <AlertTriangle size={18} />
            <span>Report Near Miss</span>
          </NavLink>
        )}

        {!(isGeneralManager || isPlantHead || isSeniorManagement) && (
          <NavLink to="/actions" style={linkStyle}>
            <CheckSquare size={18} />
            <span>CAPA Actions</span>
          </NavLink>
        )}

        <NavLink to="/profile" style={linkStyle}>
          <User size={18} />
          <span>My Profile</span>
        </NavLink>

        {/* HOD Approvals for HOD role */}
        {isHOD && (
          <NavLink to="/hod/approvals" style={linkStyle}>
            <UserCheck size={18} />
            <span>HOD Approvals</span>
          </NavLink>
        )}

        {/* Roles with analytics and reports access */}
        {(isAdmin || isSafetyOfficer || isHOD || isGeneralManager || isPlantHead || isSeniorManagement) && (
          <>
            <NavLink to="/analytics" style={linkStyle}>
              <BarChart3 size={18} />
              <span>Analytics Panel</span>
            </NavLink>
            <NavLink to="/reports" style={linkStyle}>
              <BarChart3 size={18} />
              <span>Safety Reports</span>
            </NavLink>
          </>
        )}

        {/* Admins only */}
        {isAdmin && (
          <>
            <NavLink to="/admin/departments" style={linkStyle}>
              <Building size={18} />
              <span>Departments Admin</span>
            </NavLink>
            <NavLink to="/admin/users" style={linkStyle}>
              <Users size={18} />
              <span>Users Management</span>
            </NavLink>
            <NavLink to="/admin" style={linkStyle}>
              <Users size={18} />
              <span>Admin Settings</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Logout Area */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderTop: '1px solid var(--border-color)'
      }}>
        <button 
          onClick={handleLogout}
          className="btn btn-danger"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
