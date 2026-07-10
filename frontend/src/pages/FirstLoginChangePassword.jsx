import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { firstLoginChangePassword } from '../api/authentication';
import { Lock, Eye, EyeOff, ShieldAlert, Check, X } from 'lucide-react';

const FirstLoginChangePassword = () => {
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { updateUserData } = useAuth();
  const navigate = useNavigate();

  // Password criteria validators
  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isMatch = newPassword === confirmPassword && newPassword !== '';

  const isPasswordStrong = hasMinLen && hasUpper && hasLower && hasDigit && hasSpecial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tempPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (!isPasswordStrong) {
      setError('Password does not meet the safety requirements.');
      return;
    }
    if (!isMatch) {
      setError('Confirm password does not match.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await firstLoginChangePassword({
        temporary_password: tempPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      const { access_token, user: userData, message } = response.data;
      
      // Update local storage and authentication context with refreshed credentials
      localStorage.setItem('near_miss_token', access_token);
      updateUserData(userData);

      setSuccess(message || 'Password changed successfully. Redirecting...');
      setTimeout(() => {
        if (userData && userData.role === 'HOD') {
          navigate('/hod-dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update password. Please check temporary credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCriterion = (label, met) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: met ? 'var(--success-green)' : '#C62828', marginBottom: '0.2rem' }}>
      {met ? <Check size={12} /> : <X size={12} />}
      <span>{label}</span>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F5F7FA',
      padding: '1rem'
    }}>
      <div className="glass-card" style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-color)',
        padding: '2.5rem',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {/* Vizag Steel Vector Emblem */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <svg viewBox="0 0 100 100" width="60" height="60">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#2E7D32" strokeWidth="4" />
            <circle cx="50" cy="50" r="39" fill="none" stroke="#2E7D32" strokeWidth="1.5" />
            <rect x="42" y="32" width="16" height="30" fill="none" stroke="#2E7D32" strokeWidth="4" />
            <line x1="36" y1="32" x2="64" y2="32" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
            <line x1="36" y1="62" x2="64" y2="62" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
            <circle cx="50" cy="47" r="16" fill="#2E7D32" />
            <rect x="47" y="38" width="6" height="18" fill="#FFFFFF" rx="1" />
          </svg>
        </div>

        <h2 style={{ fontSize: '1.25rem', textAlign: 'center', color: 'var(--primary-blue)', marginBottom: '0.25rem', fontWeight: 'bold' }}>
          FIRST LOGIN SECURITY CONFIGURATION
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem', fontWeight: '600' }}>
          Please update your temporary password to access your dashboard.
        </p>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ padding: '0.75rem', backgroundColor: '#E8F5E9', border: '1px solid #C8E6C9', color: 'var(--success-green)', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>Temporary Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                style={{ width: '100%', padding: '0.6rem 2.2rem 0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.875rem' }}
                placeholder="Enter Temporary Password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                required
              />
              <Lock size={16} style={{ position: 'absolute', right: '10px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                style={{ width: '100%', padding: '0.6rem 2.2rem 0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.875rem' }}
                placeholder="Enter New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Validation checklist */}
          <div style={{ backgroundColor: 'var(--bg-light-gray)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>PASSWORD SECURITY CRITERIA:</span>
            {renderCriterion('At least 8 characters long', hasMinLen)}
            {renderCriterion('At least one uppercase letter (A-Z)', hasUpper)}
            {renderCriterion('At least one lowercase letter (a-z)', hasLower)}
            {renderCriterion('At least one numeric digit (0-9)', hasDigit)}
            {renderCriterion('At least one special character (!@#$%^&*)', hasSpecial)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>Confirm Password</label>
            <input
              type="password"
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: MetConfirmBorder(isMatch), borderRadius: '4px', fontSize: '0.875rem' }}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn"
            disabled={submitting || !isPasswordStrong || !isMatch}
            style={{
              backgroundColor: 'var(--success-green)',
              color: '#FFFFFF',
              padding: '0.75rem',
              fontWeight: '700',
              border: 'none',
              borderRadius: '4px',
              cursor: (submitting || !isPasswordStrong || !isMatch) ? 'not-allowed' : 'pointer',
              opacity: (submitting || !isPasswordStrong || !isMatch) ? 0.6 : 1,
              marginTop: '0.5rem'
            }}
          >
            {submitting ? 'UPDATING ACCOUNT...' : 'CHANGE PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Helper style calculation
const MetConfirmBorder = (met) => {
  if (met) return '1px solid var(--success-green)';
  return '1px solid var(--border-color)';
};

export default FirstLoginChangePassword;
