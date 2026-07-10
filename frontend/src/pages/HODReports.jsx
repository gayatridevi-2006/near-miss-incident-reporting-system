import React, { useState, useEffect } from 'react';
import { generateReport, exportReportExcel } from '../api/reports';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { 
  FileText, 
  Download, 
  Printer, 
  Search, 
  Calendar, 
  MapPin,
  RefreshCw,
  Eye
} from 'lucide-react';

const HODReports = () => {
  const { user } = useAuth();

  // Filters state
  const [reportType, setReportType] = useState('Near Miss Incident Report');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [priority, setPriority] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [location, setLocation] = useState('');

  // Report results state
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown options
  const reportTypes = [
    'Near Miss Incident Report',
    'Open Incidents Report',
    'Closed Incidents Report',
    'Corrective Action Report',
    'Monthly Department Safety Report',
    'Investigation Report'
  ];

  const handleGenerateReport = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const params = {
        report_type: reportType,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status: status || undefined,
        severity: severity || undefined,
        priority: priority || undefined,
        incident_type: incidentType || undefined,
        location: location || undefined
      };
      
      const response = await generateReport(params);
      setReportData(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate safety report data.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    // Generate query string
    const queryParams = new URLSearchParams({
      report_type: reportType,
      start_date: startDate,
      end_date: endDate,
      status,
      severity,
      priority,
      incident_type: incidentType,
      location
    }).toString();
    
    const token = localStorage.getItem('near_miss_token');
    // Open in a new tab to trigger CSV file download, attaching token as URL parameter or via helper
    // Since it's a download, we can trigger it with a window.open or window.location
    // For JWT authorization on simple GETs, we can pass it as a query param, or perform Axios download:
    downloadCSV(queryParams);
  };

  const downloadCSV = async (queryString) => {
    try {
      const response = await exportReportExcel(queryString);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `safety_report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Failed to export CSV report.');
    }
  };

  const handleExportPDF = () => {
    const queryParams = new URLSearchParams({
      report_type: reportType,
      start_date: startDate,
      end_date: endDate,
      status,
      severity,
      priority,
      incident_type: incidentType,
      location
    }).toString();
    
    // We can open the HTML print view endpoint in a new tab
    const token = localStorage.getItem('near_miss_token');
    const url = `${client.defaults.baseURL}/hod/reports/export/pdf?${queryParams}&token=${token}`;
    // Let's create an iframe or open window. To handle @jwt_required in URL, we can write a clean window open
    // or let the user click print on our React UI which is perfectly formatted too!
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title="Safety & Management Reports" />
        
        <div style={{ padding: '2rem', backgroundColor: '#FFFFFF', minHeight: 'calc(100vh - var(--navbar-height))' }} className="no-print-padding">
          
          {/* Filter Card */}
          <div className="glass-card no-print" style={{ padding: '2rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} />
              <span>Report Query Filters</span>
            </h2>

            <form onSubmit={handleGenerateReport} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', fontSize: '0.85rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 'bold' }}>Report Title *</label>
                <select style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  {reportTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 'bold' }}>Start Date</label>
                <input type="date" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 'bold' }}>End Date</label>
                <input type="date" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 'bold' }}>Incident Status</label>
                <select style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">-- All Statuses --</option>
                  <option value="Pending">Pending Review</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Forwarded">Forwarded</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Corrective Action Assigned">Corrective Action Assigned</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 'bold' }}>Potential Severity</label>
                <select style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="">-- All Severities --</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 'bold' }}>Priority</label>
                <select style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="">-- All Priorities --</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 'bold' }}>Location</label>
                <input type="text" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="e.g. Battery-4" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 'bold' }}>Incident Type</label>
                <select style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
                  <option value="">-- All Types --</option>
                  <option value="Unsafe Act">Unsafe Act</option>
                  <option value="Unsafe Condition">Unsafe Condition</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => {
                  setStartDate(''); setEndDate(''); setStatus(''); setSeverity(''); setPriority(''); setIncidentType(''); setLocation(''); setReportData(null);
                }} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <RefreshCw size={14} />
                  <span>Reset</span>
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Search size={14} />
                  <span>Preview Report</span>
                </button>
              </div>

            </form>
          </div>

          {error && (
            <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '1rem', borderRadius: '4px', marginBottom: '2rem', fontWeight: '600' }} className="no-print">
              {error}
            </div>
          )}

          {/* Action Row for Previewed Report */}
          {reportData && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem' }} className="no-print">
              <button onClick={handleExportExcel} className="btn" style={{ backgroundColor: 'var(--primary-blue)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                <Download size={16} />
                <span>Export Excel</span>
              </button>
              <button onClick={handlePrint} className="btn" style={{ backgroundColor: 'var(--success-green)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                <Printer size={16} />
                <span>Print Report</span>
              </button>
            </div>
          )}

          {/* Print-friendly Report Preview */}
          {reportData && (
            <div className="print-report-card" style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              padding: '2.5rem',
              borderRadius: '4px',
              fontFamily: 'Arial, sans-serif'
            }}>
              {/* Vizag Steel ERP Header */}
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '3px double var(--primary-blue)', paddingBottom: '10px', marginBottom: '20px' }}>
                <svg viewBox="0 0 100 100" style={{ width: '70px', height: '70px', marginRight: '20px' }}>
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#2E7D32" strokeWidth="4" />
                  <circle cx="50" cy="50" r="39" fill="none" stroke="#2E7D32" strokeWidth="1.5" />
                  <rect x="42" y="32" width="16" height="30" fill="none" stroke="#2E7D32" strokeWidth="4" />
                  <line x1="36" y1="32" x2="64" y2="32" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
                  <line x1="36" y1="62" x2="64" y2="62" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="50" cy="47" r="16" fill="#2E7D32" />
                  <rect x="47" y="38" width="6" height="18" fill="#FFFFFF" rx="1" />
                </svg>
                <div style={{ flexGrow: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-blue)', margin: 0 }}>
                    RASHTRIYA ISPAT NIGAM LIMITED (RINL)
                  </h3>
                  <span style={{ fontSize: '0.9rem', color: 'var(--success-green)', fontWeight: 'bold' }}>
                    VIZAG STEEL PLANT - SAFETY DEPARTMENT
                  </span>
                </div>
              </div>

              {/* Report Title */}
              <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#000000', textAlign: 'center', margin: '1.5rem 0', textTransform: 'uppercase' }}>
                {reportData.report_type}
              </h2>

              {/* Metadata details table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.85rem' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9', width: '25%' }}>Department Name:</td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{reportData.department_name}</td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9', width: '25%' }}>Generated Date & Time:</td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{new Date(reportData.generated_at).toLocaleString()} UTC</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Generated By (HOD):</td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{reportData.generated_by}</td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Record Count:</td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{reportData.incidents?.length || 0} items</td>
                  </tr>
                </tbody>
              </table>

              {/* Incidents Table */}
              <div className="table-container" style={{ border: '1px solid #999' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--primary-blue)', color: 'white', fontWeight: 'bold' }}>
                      <th style={{ border: '1px solid #999', padding: '0.6rem', textAlign: 'left' }}>Ref Number</th>
                      <th style={{ border: '1px solid #999', padding: '0.6rem', textAlign: 'left' }}>Incident Title</th>
                      <th style={{ border: '1px solid #999', padding: '0.6rem', textAlign: 'left' }}>Type</th>
                      <th style={{ border: '1px solid #999', padding: '0.6rem', textAlign: 'left' }}>Location</th>
                      <th style={{ border: '1px solid #999', padding: '0.6rem', textAlign: 'left' }}>Reported Date</th>
                      <th style={{ border: '1px solid #999', padding: '0.6rem', textAlign: 'left' }}>Severity</th>
                      <th style={{ border: '1px solid #999', padding: '0.6rem', textAlign: 'left' }}>Priority</th>
                      <th style={{ border: '1px solid #999', padding: '0.6rem', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.incidents?.length > 0 ? (
                      reportData.incidents.map((inc) => (
                        <tr key={inc.id} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ border: '1px solid #999', padding: '0.6rem', fontWeight: 'bold' }}>{inc.incident_number}</td>
                          <td style={{ border: '1px solid #999', padding: '0.6rem' }}>{inc.title}</td>
                          <td style={{ border: '1px solid #999', padding: '0.6rem' }}>{inc.incident_type || inc.unsafe_act_or_condition}</td>
                          <td style={{ border: '1px solid #999', padding: '0.6rem' }}>{inc.location}</td>
                          <td style={{ border: '1px solid #999', padding: '0.6rem' }}>{inc.reported_at ? new Date(inc.reported_at).toLocaleDateString() : ''}</td>
                          <td style={{ border: '1px solid #999', padding: '0.6rem' }}>{inc.severity || inc.potential_severity || 'Low'}</td>
                          <td style={{ border: '1px solid #999', padding: '0.6rem' }}>{inc.priority || 'Low'}</td>
                          <td style={{ border: '1px solid #999', padding: '0.6rem' }}>{inc.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" style={{ border: '1px solid #999', padding: '2rem', textAlign: 'center', color: '#777' }}>
                          No matching incidents found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Report Footer */}
              <div style={{ borderTop: '1px solid var(--primary-blue)', paddingHeight: '10px', marginTop: '40px', textAlign: 'center', fontSize: '0.75rem', color: '#666', paddingTop: '10px' }}>
                RINL - Vizag Steel Plant Near Miss Incident Reporting & Management System. Confidentially Generated. Page 1 of 1.
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HODReports;
