import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, Code, LogIn, RotateCcw, Shield, HelpCircle, Briefcase, FileText } from 'lucide-react';
import styles from './Login.module.css'; // Reuse Login layout styles for consistency

const Register = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [userType, setUserType] = useState('Employee');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [departments, setDepartments] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch active departments for dropdown
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/api/departments');
        // Filter active departments
        const activeDepts = (response.data || []).filter(d => d.status === 'Active');
        setDepartments(activeDepts);
      } catch (err) {
        console.error("Error fetching departments", err);
      }
    };
    fetchDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!employeeId || !fullName || !email || !mobileNumber || !departmentId || !userType || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employee_id: employeeId,
        full_name: fullName,
        email: email,
        mobile_number: mobileNumber,
        department_id: parseInt(departmentId, 10),
        user_type: userType,
        password: password
      };
      
      const response = await axios.post('/api/auth/register-request', payload);
      setSuccessMsg(response.data.message || 'Your registration request has been submitted successfully and is awaiting HOD approval.');
    } catch (err) {
      console.error("Registration request error", err);
      setError(err.response?.data?.message || 'Failed to submit registration request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmployeeId('');
    setFullName('');
    setEmail('');
    setMobileNumber('');
    setDepartmentId('');
    setUserType('Employee');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  if (successMsg) {
    return (
      <div className={styles.pageContainer}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.headerLogoLeft}>
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#2E7D32" strokeWidth="3.5" />
              <circle cx="50" cy="50" r="39" fill="none" stroke="#2E7D32" strokeWidth="1.5" />
              <rect x="42" y="32" width="16" height="30" fill="none" stroke="#2E7D32" strokeWidth="4" />
              <line x1="36" y1="32" x2="64" y2="32" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
              <line x1="36" y1="62" x2="64" y2="62" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
              <circle cx="50" cy="47" r="16" fill="#2E7D32" />
              <rect x="47" y="38" width="6" height="18" fill="#FFFFFF" rx="1" />
              <rect x="43" y="38" width="14" height="3" fill="#FFFFFF" rx="0.5" />
              <rect x="43" y="53" width="14" height="3" fill="#FFFFFF" rx="0.5" />
              <text x="50" y="80" fontFamily="Segoe UI, sans-serif" fontSize="10.5" fontWeight="900" fill="#2E7D32" textAnchor="middle">VIZAG</text>
              <text x="50" y="89" fontFamily="Segoe UI, sans-serif" fontSize="9" fontWeight="900" fill="#2E7D32" textAnchor="middle">STEEL</text>
              <text x="50" y="97" fontFamily="Segoe UI, sans-serif" fontSize="7" fontWeight="bold" fill="#1565C0" textAnchor="middle">Pride of Steel</text>
            </svg>
          </div>
          <div className={styles.headerTextCenter}>
            <h1 className={styles.headerTitle}>RINL – VIZAG STEEL PLANT</h1>
            <h2 className={styles.headerSubtitle}>NEAR MISS INCIDENT REPORTING SYSTEM</h2>
            <p className={styles.headerTagline}>A Step Towards Zero Harm Workplace</p>
          </div>
          <div className={styles.headerLogoRight}>
            <svg viewBox="0 0 120 70" width="100%" height="100%">
              <rect x="2" y="2" width="116" height="66" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
              <rect x="2" y="2" width="116" height="22" fill="#2E7D32" />
              <text x="60" y="18" fontFamily="Impact, Arial Black, sans-serif" fontSize="16" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">THINK</text>
              <text x="60" y="44" fontFamily="Impact, Arial Black, sans-serif" fontSize="20" fontWeight="bold" fill="#000000" textAnchor="middle">SAFETY</text>
              <text x="60" y="62" fontFamily="Impact, Arial Black, sans-serif" fontSize="18" fontWeight="bold" fill="#000000" textAnchor="middle">FIRST</text>
            </svg>
          </div>
        </header>

        {/* MAIN LAYOUT */}
        <main className={styles.mainContent} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5', padding: '2rem 1rem' }}>
          <div className={styles.loginCard} style={{ maxWidth: '540px', textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: '#2E7D32', marginBottom: '1.5rem' }}>
              <ShieldCheck size={64} />
            </div>
            <h3 className={styles.loginCardTitle} style={{ color: '#2E7D32' }}>REQUEST SUBMITTED</h3>
            <div className={styles.titleUnderline} style={{ backgroundColor: '#2E7D32' }}></div>
            
            <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#333333', marginBottom: '2.5rem', fontWeight: '600' }}>
              {successMsg}
            </p>
            
            <button
              onClick={() => navigate('/login')}
              className={styles.loginBtn}
              style={{ width: '100%', margin: '0 auto', maxWidth: '300px' }}
            >
              <LogIn size={18} />
              Return to Login
            </button>
          </div>
        </main>

        {/* FOOTER */}
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
  }

  return (
    <div className={styles.pageContainer}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLogoLeft}>
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#2E7D32" strokeWidth="3.5" />
            <circle cx="50" cy="50" r="39" fill="none" stroke="#2E7D32" strokeWidth="1.5" />
            <rect x="42" y="32" width="16" height="30" fill="none" stroke="#2E7D32" strokeWidth="4" />
            <line x1="36" y1="32" x2="64" y2="32" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
            <line x1="36" y1="62" x2="64" y2="62" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
            <circle cx="50" cy="47" r="16" fill="#2E7D32" />
            <rect x="47" y="38" width="6" height="18" fill="#FFFFFF" rx="1" />
            <rect x="43" y="38" width="14" height="3" fill="#FFFFFF" rx="0.5" />
            <rect x="43" y="53" width="14" height="3" fill="#FFFFFF" rx="0.5" />
            <text x="50" y="80" fontFamily="Segoe UI, sans-serif" fontSize="10.5" fontWeight="900" fill="#2E7D32" textAnchor="middle">VIZAG</text>
            <text x="50" y="89" fontFamily="Segoe UI, sans-serif" fontSize="9" fontWeight="900" fill="#2E7D32" textAnchor="middle">STEEL</text>
            <text x="50" y="97" fontFamily="Segoe UI, sans-serif" fontSize="7" fontWeight="bold" fill="#1565C0" textAnchor="middle">Pride of Steel</text>
          </svg>
        </div>
        <div className={styles.headerTextCenter}>
          <h1 className={styles.headerTitle}>RINL – VIZAG STEEL PLANT</h1>
          <h2 className={styles.headerSubtitle}>NEAR MISS INCIDENT REPORTING SYSTEM</h2>
          <p className={styles.headerTagline}>A Step Towards Zero Harm Workplace</p>
        </div>
        <div className={styles.headerLogoRight}>
          <svg viewBox="0 0 120 70" width="100%" height="100%">
            <rect x="2" y="2" width="116" height="66" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
            <rect x="2" y="2" width="116" height="22" fill="#2E7D32" />
            <text x="60" y="18" fontFamily="Impact, Arial Black, sans-serif" fontSize="16" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">THINK</text>
            <text x="60" y="44" fontFamily="Impact, Arial Black, sans-serif" fontSize="20" fontWeight="bold" fill="#000000" textAnchor="middle">SAFETY</text>
            <text x="60" y="62" fontFamily="Impact, Arial Black, sans-serif" fontSize="18" fontWeight="bold" fill="#000000" textAnchor="middle">FIRST</text>
          </svg>
        </div>
      </header>

      {/* MAIN CONTENT split layout like Login, but registration card takes right side */}
      <main className={styles.mainContent}>
        {/* Left Side (Safety awareness info) */}
        <section className={styles.leftPanel}>
          <div className={styles.bgImageContainer}>
            <div className={styles.bgImageOverlay}></div>
            <div className={styles.leftPanelContent}>
              <div className={styles.sloganBlock}>
                <h3 className={styles.sloganLine1}>SECURE REGISTER</h3>
                <h3 className={styles.sloganLine2}>WORK SAFE.</h3>
                <div className={styles.sloganLine}></div>
                <p className={styles.sloganSub}>Enterprise Safety Access Portal</p>
              </div>
              
              <div className={styles.safetyCircleRow}>
                <div className={styles.safetyCard}>
                  <div className={`${styles.cardIconWrapper} ${styles.iconSee}`}>
                    <User size={26} />
                  </div>
                  <span className={`${styles.cardTitle} ${styles.cardTitleSee}`}>REGISTER</span>
                  <span className={styles.cardDesc}>Submit Request</span>
                </div>
                <div className={styles.safetyCard}>
                  <div className={`${styles.cardIconWrapper} ${styles.iconReport}`}>
                    <Briefcase size={26} />
                  </div>
                  <span className={`${styles.cardTitle} ${styles.cardTitleReport}`}>HOD REVIEW</span>
                  <span className={styles.cardDesc}>Verification Process</span>
                </div>
                <div className={styles.safetyCard}>
                  <div className={`${styles.cardIconWrapper} ${styles.iconStop}`}>
                    <Shield size={26} />
                  </div>
                  <span className={`${styles.cardTitle} ${styles.cardTitleStop}`}>ACTIVATE</span>
                  <span className={styles.cardDesc}>Secure Account</span>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.bottomStrip}>
            <ShieldCheck size={20} />
            Registration requests are verified by department Heads.
          </div>
        </section>

        {/* Right Side - Registration Request Form */}
        <section className={styles.rightPanel} style={{ padding: '1.5rem 1rem' }}>
          <div className={styles.loginCard} style={{ maxWidth: '580px', padding: '1.75rem 2rem' }}>
            <h3 className={styles.loginCardTitle}>CREATE ACCOUNT</h3>
            <div className={styles.titleUnderline}></div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              
              {/* Employee ID */}
              <div className={styles.formGroup} style={{ marginBottom: '0.5rem' }}>
                <label className={styles.fieldLabel}>Employee / Trainee / Contractor ID</label>
                <div className={styles.inputWrapper}>
                  <User size={18} className={styles.inputIcon} />
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Enter ID (e.g. EMP12345)"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Full Name */}
              <div className={styles.formGroup} style={{ marginBottom: '0.5rem' }}>
                <label className={styles.fieldLabel}>Full Name</label>
                <div className={styles.inputWrapper}>
                  <FileText size={18} className={styles.inputIcon} />
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Enter Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email & Mobile Row */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className={styles.formGroup} style={{ flex: '1', minWidth: '200px', marginBottom: '0.5rem' }}>
                  <label className={styles.fieldLabel}>Official Email</label>
                  <div className={styles.inputWrapper}>
                    <Mail size={18} className={styles.inputIcon} />
                    <input
                      type="email"
                      className={styles.formInput}
                      placeholder="email@vizagsteel.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={styles.formGroup} style={{ flex: '1', minWidth: '200px', marginBottom: '0.5rem' }}>
                  <label className={styles.fieldLabel}>Mobile Number</label>
                  <div className={styles.inputWrapper}>
                    <Phone size={18} className={styles.inputIcon} />
                    <input
                      type="tel"
                      className={styles.formInput}
                      placeholder="Enter 10-digit Mobile"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      maxLength={15}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Department & User Type Row */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className={styles.formGroup} style={{ flex: '1', minWidth: '200px', marginBottom: '0.5rem' }}>
                  <label className={styles.fieldLabel}>Department</label>
                  <select
                    className={styles.formInput}
                    style={{ paddingLeft: '0.75rem', height: '42px' }}
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup} style={{ flex: '1', minWidth: '200px', marginBottom: '0.5rem' }}>
                  <label className={styles.fieldLabel}>User Type</label>
                  <select
                    className={styles.formInput}
                    style={{ paddingLeft: '0.75rem', height: '42px' }}
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                    required
                  >
                    <option value="Employee">Employee</option>
                    <option value="Trainee">Trainee</option>
                    <option value="Intern">Intern</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>
              </div>

              {/* Password Fields Row */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className={styles.formGroup} style={{ flex: '1', minWidth: '200px', marginBottom: '0.5rem' }}>
                  <label className={styles.fieldLabel}>Password</label>
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input
                      type={showPassword ? "text" : "password"}
                      className={styles.formInput}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.passwordToggle}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup} style={{ flex: '1', minWidth: '200px', marginBottom: '0.5rem' }}>
                  <label className={styles.fieldLabel}>Confirm Password</label>
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className={styles.formInput}
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={styles.passwordToggle}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className={styles.buttonGroup} style={{ marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className={styles.loginBtn}
                  disabled={loading}
                  style={{ flex: '2' }}
                >
                  <ShieldCheck size={18} />
                  {loading ? 'SUBMITTING...' : 'SUBMIT REGISTRATION'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className={styles.resetBtn}
                  disabled={loading}
                  style={{ flex: '1' }}
                >
                  <RotateCcw size={18} />
                  RESET
                </button>
              </div>

              {/* Back to Login link */}
              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/login');
                  }}
                  className={styles.registerLink}
                >
                  Already have an account? Login here
                </a>
                <br />
                <a
                  href="/account-status"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/account-status');
                  }}
                  className={styles.registerLink}
                  style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: '0.9' }}
                >
                  Check Registration Request Status
                </a>
              </div>

            </form>
          </div>
        </section>
      </main>

      {/* FOOTER */}
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

export default Register;
