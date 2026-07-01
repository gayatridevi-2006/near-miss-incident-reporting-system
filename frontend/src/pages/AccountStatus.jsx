import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, ShieldCheck, Code, LogIn, RotateCcw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import styles from './Login.module.css'; // Cohesive Layout

const AccountStatus = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestDetails, setRequestDetails] = useState(null);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRequestDetails(null);

    if (!employeeId || !email) {
      setError('Please fill in both Employee ID and Email.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('/api/auth/registration-requests/status', {
        params: {
          employee_id: employeeId,
          email: email
        }
      });
      setRequestDetails(response.data);
    } catch (err) {
      console.error("Error fetching status", err);
      setError(err.response?.data?.message || 'No registration request found matching these credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmployeeId('');
    setEmail('');
    setError('');
    setRequestDetails(null);
  };

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

      {/* MAIN CONTENT split layout */}
      <main className={styles.mainContent}>
        {/* Left Side (Safety awareness info) */}
        <section className={styles.leftPanel}>
          <div className={styles.bgImageContainer}>
            <div className={styles.bgImageOverlay}></div>
            <div className={styles.leftPanelContent}>
              <div className={styles.sloganBlock}>
                <h3 className={styles.sloganLine1}>REQUEST STATUS</h3>
                <h3 className={styles.sloganLine2}>TRACK IT.</h3>
                <div className={styles.sloganLine}></div>
                <p className={styles.sloganSub}>Check your account approval status</p>
              </div>
              
              <div className={styles.safetyCircleRow} style={{ marginTop: '5rem' }}>
                <div className={styles.safetyCard}>
                  <div className={`${styles.cardIconWrapper} ${styles.iconSee}`}>
                    <CheckCircle size={26} fill="none" />
                  </div>
                  <span className={`${styles.cardTitle} ${styles.cardTitleSee}`}>APPROVED</span>
                  <span className={styles.cardDesc}>Ready to log in</span>
                </div>
                <div className={styles.safetyCard}>
                  <div className={`${styles.cardIconWrapper} ${styles.iconStop}`}>
                    <AlertTriangle size={26} />
                  </div>
                  <span className={`${styles.cardTitle} ${styles.cardTitleStop}`}>PENDING</span>
                  <span className={styles.cardDesc}>Awaiting HOD action</span>
                </div>
                <div className={styles.safetyCard}>
                  <div className={`${styles.cardIconWrapper} ${styles.iconSafe}`}>
                    <XCircle size={26} />
                  </div>
                  <span className={`${styles.cardTitle} ${styles.cardTitleSafe}`}>REJECTED</span>
                  <span className={styles.cardDesc}>Check HOD remarks</span>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.bottomStrip}>
            <ShieldCheck size={20} />
            HODs review and authorize new access requests.
          </div>
        </section>

        {/* Right Side - Request Status Check */}
        <section className={styles.rightPanel}>
          <div className={styles.loginCard} style={{ maxWidth: '500px', padding: '2.5rem 2.25rem' }}>
            <h3 className={styles.loginCardTitle}>CHECK STATUS</h3>
            <div className={styles.titleUnderline}></div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            {!requestDetails ? (
              <form onSubmit={handleSubmit}>
                {/* Employee ID */}
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Employee / Trainee ID</label>
                  <div className={styles.inputWrapper}>
                    <User size={18} className={styles.inputIcon} />
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Enter Employee / Trainee ID"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Registered Email</label>
                  <div className={styles.inputWrapper}>
                    <Mail size={18} className={styles.inputIcon} />
                    <input
                      type="email"
                      className={styles.formInput}
                      placeholder="Enter Official Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className={styles.buttonGroup}>
                  <button
                    type="submit"
                    className={styles.loginBtn}
                    disabled={loading}
                    style={{ flex: '2' }}
                  >
                    {loading ? 'CHECKING...' : 'CHECK STATUS'}
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

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <a
                    href="/login"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/login');
                    }}
                    className={styles.registerLink}
                  >
                    Return to Login
                  </a>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                {/* Status Indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '6px',
                  backgroundColor: requestDetails.request_status === 'Approved' ? '#E8F5E9' : requestDetails.request_status === 'Rejected' ? '#FFEBEE' : '#FFF3E0',
                  border: `1px solid ${requestDetails.request_status === 'Approved' ? '#C8E6C9' : requestDetails.request_status === 'Rejected' ? '#FFCDD2' : '#FFE0B2'}`,
                  color: requestDetails.request_status === 'Approved' ? '#2E7D32' : requestDetails.request_status === 'Rejected' ? '#C62828' : '#E65100'
                }}>
                  {requestDetails.request_status === 'Approved' && <CheckCircle size={32} />}
                  {requestDetails.request_status === 'Rejected' && <XCircle size={32} />}
                  {requestDetails.request_status === 'Pending' && <AlertTriangle size={32} />}
                  
                  <div>
                    <h4 style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem', color: 'inherit' }}>
                      Status: {requestDetails.request_status}
                    </h4>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'inherit', fontWeight: '500' }}>
                      {requestDetails.request_status === 'Approved' && "Your account is activated and ready for use."}
                      {requestDetails.request_status === 'Pending' && "Awaiting verification by the Head of Department."}
                      {requestDetails.request_status === 'Rejected' && "Your registration request has been rejected."}
                    </p>
                  </div>
                </div>

                {/* Details Table */}
                <div style={{ border: '1px solid #E0E0E0', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '700', backgroundColor: '#F8F9FA', width: '40%', color: '#555' }}>Applicant Name</td>
                        <td style={{ padding: '0.75rem', color: '#333' }}>{requestDetails.full_name}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '700', backgroundColor: '#F8F9FA', color: '#555' }}>ID Number</td>
                        <td style={{ padding: '0.75rem', color: '#333' }}>{requestDetails.employee_id}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '700', backgroundColor: '#F8F9FA', color: '#555' }}>Department</td>
                        <td style={{ padding: '0.75rem', color: '#333' }}>{requestDetails.department_name}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '700', backgroundColor: '#F8F9FA', color: '#555' }}>Designated Role</td>
                        <td style={{ padding: '0.75rem', color: '#333' }}>{requestDetails.user_type}</td>
                      </tr>
                      {requestDetails.hod_remarks && (
                        <tr>
                          <td style={{ padding: '0.75rem', fontWeight: '700', backgroundColor: '#F8F9FA', color: '#555' }}>HOD Remarks</td>
                          <td style={{ padding: '0.75rem', color: '#B71C1C', fontWeight: '600' }}>{requestDetails.hod_remarks}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Back button */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => navigate('/login')}
                    className={styles.loginBtn}
                    style={{ flex: '1' }}
                  >
                    <LogIn size={18} />
                    Go to Login
                  </button>
                  <button
                    onClick={() => setRequestDetails(null)}
                    className={styles.resetBtn}
                    style={{ flex: '1' }}
                  >
                    <RotateCcw size={18} />
                    Query Another
                  </button>
                </div>

              </div>
            )}
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

export default AccountStatus;
