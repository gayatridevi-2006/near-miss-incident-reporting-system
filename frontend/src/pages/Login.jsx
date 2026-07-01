import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, RefreshCw, Eye, EyeOff, FileText, Hand, Shield, LogIn, RotateCcw, ShieldCheck, Code, Users, UserCheck, Key } from 'lucide-react';
import styles from './Login.module.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Generate random 5-character alphanumeric captcha
  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // Exclude lookalikes like 0, O, 1, I
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaValue(result);
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter Employee ID and Password');
      return;
    }
    if (!captchaInput) {
      setError('Please enter the captcha code shown');
      return;
    }
    if (captchaInput.trim().toUpperCase() !== captchaValue) {
      setError('Incorrect Captcha code. Please try again.');
      generateCaptcha();
      return;
    }

    setError('');
    setSubmitting(true);
    
    const result = await login(username, password);
    setSubmitting(false);
    
    if (result.success) {
      const storedUser = localStorage.getItem('near_miss_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.first_login) {
          navigate('/first-login-change-password');
          return;
        }
      }
      navigate('/dashboard');
    } else {
      setError(result.error || 'Authentication failed. Please check credentials.');
      generateCaptcha();
    }
  };

  const handleReset = () => {
    setUsername('');
    setPassword('');
    setCaptchaInput('');
    setError('');
    generateCaptcha();
  };

  // Auto-fill demo credentials helper
  const handleAutofill = (userVal, passVal) => {
    setUsername(userVal);
    setPassword(passVal);
    setError('');
  };

  return (
    <div className={styles.pageContainer}>
      
      {/* 1. HEADER */}
      <header className={styles.header}>
        {/* Vizag Steel Plant Logo (Sharp high-quality Vector) */}
        <div className={styles.headerLogoLeft} title="VIZAG STEEL Logo">
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {/* Outer circles */}
            <circle cx="50" cy="50" r="44" fill="none" stroke="#2E7D32" strokeWidth="3.5" />
            <circle cx="50" cy="50" r="39" fill="none" stroke="#2E7D32" strokeWidth="1.5" />
            {/* Ladle / Letter I symbol inside */}
            <rect x="42" y="32" width="16" height="30" fill="none" stroke="#2E7D32" strokeWidth="4" />
            <line x1="36" y1="32" x2="64" y2="32" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
            <line x1="36" y1="62" x2="64" y2="62" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
            <circle cx="50" cy="47" r="16" fill="#2E7D32" />
            {/* Inner white 'I' symbol shape */}
            <rect x="47" y="38" width="6" height="18" fill="#FFFFFF" rx="1" />
            <rect x="43" y="38" width="14" height="3" fill="#FFFFFF" rx="0.5" />
            <rect x="43" y="53" width="14" height="3" fill="#FFFFFF" rx="0.5" />
            {/* Seal Texts */}
            <text x="50" y="80" fontFamily="Segoe UI, sans-serif" fontSize="10.5" fontWeight="900" fill="#2E7D32" textAnchor="middle">VIZAG</text>
            <text x="50" y="89" fontFamily="Segoe UI, sans-serif" fontSize="9" fontWeight="900" fill="#2E7D32" textAnchor="middle">STEEL</text>
            <text x="50" y="97" fontFamily="Segoe UI, sans-serif" fontSize="7" fontWeight="bold" fill="#1565C0" textAnchor="middle">Pride of Steel</text>
          </svg>
        </div>

        {/* Center Title exactly as shown */}
        <div className={styles.headerTextCenter}>
          <h1 className={styles.headerTitle}>RINL – VIZAG STEEL PLANT</h1>
          <h2 className={styles.headerSubtitle}>NEAR MISS INCIDENT REPORTING SYSTEM</h2>
          <p className={styles.headerTagline}>A Step Towards Zero Harm Workplace</p>
        </div>

        {/* THINK SAFETY FIRST Board */}
        <div className={styles.headerLogoRight} title="THINK SAFETY FIRST">
          <svg viewBox="0 0 120 70" width="100%" height="100%">
            <rect x="2" y="2" width="116" height="66" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
            <rect x="2" y="2" width="116" height="22" fill="#2E7D32" />
            <text x="60" y="18" fontFamily="Impact, Arial Black, sans-serif" fontSize="16" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">THINK</text>
            <text x="60" y="44" fontFamily="Impact, Arial Black, sans-serif" fontSize="20" fontWeight="bold" fill="#000000" textAnchor="middle">SAFETY</text>
            <text x="60" y="62" fontFamily="Impact, Arial Black, sans-serif" fontSize="18" fontWeight="bold" fill="#000000" textAnchor="middle">FIRST</text>
          </svg>
        </div>
      </header>

      {/* 2. MAIN LAYOUT (Split Left 55% / Right 45%) */}
      <main className={styles.mainContent}>
        
        {/* Left Section (55%) */}
        <section className={styles.leftPanel}>
          <div className={styles.bgImageContainer}>
            <div className={styles.bgImageOverlay}></div>
            
            <div className={styles.leftPanelContent}>
              {/* Slogans */}
              <div className={styles.sloganBlock}>
                <h3 className={styles.sloganLine1}>SEE IT. REPORT IT.</h3>
                <h3 className={styles.sloganLine2}>STOP IT.</h3>
                <div className={styles.sloganLine}></div>
                <p className={styles.sloganSub}>Prevent Today, Protect Tomorrow</p>
              </div>

              {/* Four Larger White Cards with Shadow and Descriptions */}
              <div className={styles.safetyCircleRow}>
                {/* Card 1 */}
                <div className={styles.safetyCard}>
                  <div className={`${styles.cardIconWrapper} ${styles.iconSee}`}>
                    <Eye size={26} />
                  </div>
                  <span className={`${styles.cardTitle} ${styles.cardTitleSee}`}>SEE</span>
                  <span className={styles.cardDesc}>Observe Hazard</span>
                </div>

                {/* Card 2 */}
                <div className={styles.safetyCard}>
                  <div className={`${styles.cardIconWrapper} ${styles.iconReport}`}>
                    <FileText size={26} />
                  </div>
                  <span className={`${styles.cardTitle} ${styles.cardTitleReport}`}>REPORT</span>
                  <span className={styles.cardDesc}>Report Immediately</span>
                </div>

                {/* Card 3 */}
                <div className={styles.safetyCard}>
                  <div className={`${styles.cardIconWrapper} ${styles.iconStop}`}>
                    <Hand size={26} />
                  </div>
                  <span className={`${styles.cardTitle} ${styles.cardTitleStop}`}>STOP</span>
                  <span className={styles.cardDesc}>Prevent Incident</span>
                </div>

                {/* Card 4 */}
                <div className={styles.safetyCard}>
                  <div className={`${styles.cardIconWrapper} ${styles.iconSafe}`}>
                    <Shield size={26} />
                  </div>
                  <span className={`${styles.cardTitle} ${styles.cardTitleSafe}`}>SAFE</span>
                  <span className={styles.cardDesc}>Work Safely</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Green Strip at Bottom */}
          <div className={styles.bottomStrip}>
            <ShieldCheck size={20} />
            Safety is everyone's responsibility.
          </div>
        </section>

        {/* Right Section (45%) */}
        <section className={styles.rightPanel}>
          <div className={styles.loginCard}>
            <h3 className={styles.loginCardTitle}>EMPLOYEE LOGIN</h3>
            <div className={styles.titleUnderline}></div>

            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Employee ID */}
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Employee ID</label>
                <div className={styles.inputWrapper}>
                  <User size={18} className={styles.inputIcon} />
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Enter Employee ID"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password with Show/Hide toggle */}
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Password</label>
                <div className={styles.inputWrapper}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className={styles.formInput}
                    placeholder="Enter Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Captcha */}
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Security Verification (Captcha)</label>
                <div className={styles.captchaContainer}>
                  <div className={styles.captchaImage} title="Captcha Code">
                    {captchaValue}
                  </div>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className={styles.refreshButton}
                    title="Refresh Captcha"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <input
                    type="text"
                    className={styles.captchaInput}
                    placeholder="Enter Code"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    maxLength={5}
                    required
                  />
                </div>
              </div>

              {/* Buttons (LOGIN in green, RESET in grey) */}
              <div className={styles.buttonGroup}>
                <button
                  type="submit"
                  className={styles.loginBtn}
                  disabled={submitting}
                >
                  <LogIn size={18} />
                  {submitting ? 'VERIFYING...' : 'LOGIN'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className={styles.resetBtn}
                  disabled={submitting}
                >
                  <RotateCcw size={18} />
                  RESET
                </button>
              </div>

              {/* Forgot Password */}
              <div style={{ textAlign: 'center' }}>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Please contact the IT & ERP Helpdesk to reset your password.");
                  }}
                  className={styles.forgotPasswordLink}
                >
                  Forgot Password?
                </a>
              </div>

              {/* New User? Create Account */}
              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <a
                  href="/register"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/register');
                  }}
                  className={styles.registerLink}
                >
                  New User? Create Account
                </a>
              </div>
            </form>

            {/* Development-Only Demo Accounts Auto-Fill Console */}
            <div className={styles.demoContainer}>
              <div className={styles.demoHeader}>
                <Users size={16} />
                <span>Demo Access Accounts (Auto-Fill)</span>
              </div>
              <div className={styles.demoButtonsRow}>
                <button
                  type="button"
                  onClick={() => handleAutofill('employee', 'emp123')}
                  className={`${styles.demoBtn} ${styles.demoBtnEmployee}`}
                  title="Autofill Employee"
                >
                  <User size={14} />
                  <span>Employee</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAutofill('safety', 'safe123')}
                  className={`${styles.demoBtn} ${styles.demoBtnSafety}`}
                  title="Autofill Safety Officer"
                >
                  <ShieldCheck size={14} />
                  <span>Safety</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAutofill('hod', 'hod123')}
                  className={`${styles.demoBtn} ${styles.demoBtnHOD}`}
                  title="Autofill HOD"
                >
                  <UserCheck size={14} />
                  <span>HOD</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAutofill('admin', 'admin123')}
                  className={`${styles.demoBtn} ${styles.demoBtnAdmin}`}
                  title="Autofill Admin"
                >
                  <Key size={14} />
                  <span>Admin</span>
                </button>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* 3. FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <ShieldCheck size={16} />
          <span>© RINL – Vizag Steel Plant. All Rights Reserved.</span>
        </div>
        
        <div className={styles.footerCenter}>
          <div className={styles.footerCenterTitle}>Rashtriya Ispat Nigam Limited (RINL)</div>
          <div className={styles.footerCenterSub}>Visakhapatnam Steel Plant</div>
        </div>
        
        <div className={styles.footerRight}>
          <Code size={16} />
          <span>Developed by IT & ERP Department</span>
        </div>
      </footer>

    </div>
  );
};

export default Login;
