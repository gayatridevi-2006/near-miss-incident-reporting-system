import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database } from 'lucide-react';

const Navbar = ({ title }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <header style={{
      height: 'var(--navbar-height)',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      {/* Brand Logo & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRight: '1px solid var(--border-color)', paddingRight: '1rem' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h20" />
            <path d="M5 20V8l4 3V8l4 3V8l4 3v9" />
            <path d="M17 20V4l4 1.5V20" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary-blue)', letterSpacing: '0.05em', lineHeight: '1.1' }}>SAFE-STEEL</span>
            <span style={{ fontSize: '0.6rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Govt. Enterprise</span>
          </div>
        </div>

        <h2 style={{ 
          fontSize: '1.1rem', 
          fontWeight: '700',
          color: 'var(--primary-blue)',
          fontFamily: 'Inter, sans-serif'
        }}>
          {title || 'Management System'}
        </h2>
      </div>

      {/* Stats / Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* System Status badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.7rem',
            color: 'var(--status-resolved)',
            backgroundColor: '#E8F5E9',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid #C8E6C9',
            fontWeight: '700'
          }}>
            <ShieldCheck size={12} />
            <span>SECURED (JWT)</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.7rem',
            color: 'var(--primary-blue)',
            backgroundColor: '#E3F2FD',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid #BBDEFB',
            fontWeight: '700'
          }}>
            <Database size={12} />
            <span>ERP CONNECT</span>
          </div>
        </div>

        {/* Date and Time */}
        <div style={{ 
          textAlign: 'right',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
            {formatDate(currentTime)}
          </div>
          <div style={{ fontSize: '0.7rem', marginTop: '0.05rem', color: 'var(--text-muted)' }}>
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
