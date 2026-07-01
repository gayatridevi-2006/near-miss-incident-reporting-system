import React, { useState, useEffect } from 'react';
import { getReportsData } from '../api/reports';
import { getDepartments } from '../api/departments';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Search, 
  Download, 
  Printer, 
  Building, 
  RefreshCw,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('Executive Summary Report');
  const [reportData, setReportData] = useState(null);
  const [departments, setDepartments] = useState([]);
  
  // Report query parameters
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    department_id: '',
    status: '',
    severity: '',
    incident_category: '',
    location: '',
    user_type: ''
  });

  useEffect(() => {
    fetchDepartments();
    handleFetchReport();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(response.data);
    } catch (err) {
      console.error("Error loading departments", err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleResetFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      department_id: '',
      status: '',
      severity: '',
      incident_category: '',
      location: '',
      user_type: ''
    });
  };

  const handleFetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { report_type: reportType };
      Object.keys(filters).forEach(key => {
        if (filters[key]) params[key] = filters[key];
      });

      const response = await getReportsData(params);
      setReportData(response.data);
    } catch (err) {
      console.error("Error generating report data", err);
      setError('Failed to query safety report. Please verify criteria.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    let headers = [];
    let rows = [];
    const filename = reportType.toLowerCase().replace(/ /g, '_');

    if (reportType === "Department Performance Report" && reportData.performance) {
      headers = ["Department Name", "Total Incidents", "Closed Incidents", "Closure Rate (%)", "Avg Resolution Time (Days)"];
      rows = reportData.performance.map(p => [
        p.department_name,
        p.total_incidents,
        p.closed_incidents,
        `${p.closure_rate}%`,
        `${p.avg_resolution_time} Days`
      ]);
    } else if (reportType === "Corrective Action Report" && reportData.corrective_actions) {
      headers = ["Incident Ref", "Action Description", "Status", "Responsible Person", "Target Date", "Closure Date"];
      rows = reportData.corrective_actions.map(ca => [
        ca.incident_number || ca.incident_id,
        ca.action_description,
        ca.action_status,
        ca.responsible_person_name || ca.responsible_person,
        ca.target_completion_date ? new Date(ca.target_completion_date).toLocaleDateString() : 'N/A',
        ca.completion_date ? new Date(ca.completion_date).toLocaleDateString() : 'N/A'
      ]);
    } else if (reportType === "User Activity Report" && reportData.users) {
      headers = ["Employee ID", "Name", "Email", "Role", "Department", "Status", "Incidents Reported", "Actions Completed"];
      rows = reportData.users.map(u => [
        u.employee_id,
        u.name,
        u.email,
        u.role,
        u.department,
        u.status,
        u.incidents_reported,
        u.actions_completed
      ]);
    } else if (reportType === "Registration Approval Report" && reportData.requests) {
      headers = ["Employee ID", "Name", "Email", "Department", "Role", "Status", "Date Requested"];
      rows = reportData.requests.map(r => [
        r.employee_id,
        `${r.first_name} ${r.last_name}`,
        r.email,
        r.department_name || r.department_id,
        r.role,
        r.request_status,
        r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'
      ]);
    } else if (reportData.incidents) {
      headers = ["Incident No.", "Title", "Department", "Location", "Status", "Severity", "Category", "Reported Date"];
      rows = reportData.incidents.map(inc => [
        inc.incident_number,
        inc.title,
        inc.department_code || inc.department_name,
        inc.location,
        inc.status,
        inc.potential_severity,
        inc.incident_type,
        inc.reported_date ? new Date(inc.reported_date).toLocaleDateString() : 'N/A'
      ]);
    }

    // Prepend safety header rows for official format
    const sheetData = [
      ["RASHTRIYA ISPAT NIGAM LIMITED (RINL)"],
      ["VIZAG STEEL PLANT - SAFETY PORTAL REPORT"],
      [`Report Type: ${reportType}`],
      [`Generated By: ${user?.name || 'Management User'} (${user?.role})`],
      [`Date Generated: ${new Date().toLocaleString()}`],
      [],
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Safety Report");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getActiveFiltersString = () => {
    const parts = [];
    if (filters.start_date) parts.push(`Start: ${filters.start_date}`);
    if (filters.end_date) parts.push(`End: ${filters.end_date}`);
    if (filters.department_id) {
      const name = departments.find(d => String(d.department_id) === String(filters.department_id))?.department_name;
      parts.push(`Dept: ${name || filters.department_id}`);
    }
    if (filters.status) parts.push(`Status: ${filters.status}`);
    if (filters.severity) parts.push(`Severity: ${filters.severity}`);
    if (filters.incident_category) parts.push(`Category: ${filters.incident_category}`);
    if (filters.location) parts.push(`Location: ${filters.location}`);
    if (filters.user_type) parts.push(`Role: ${filters.user_type}`);
    
    return parts.length > 0 ? parts.join(" | ") : "All plant data";
  };

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      {/* Dynamic inline styles to support local print override */}
      <style>{`
        @media print {
          body {
            background: #FFFFFF !important;
            color: #000000 !important;
          }
          aside, nav, header, button, .no-print, .navbar {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
          }
          .print-preview-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            display: block !important;
          }
        }
      `}</style>

      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title="Safety Reports Center" />

        <div className="page-body fade-in" style={{ padding: '1.5rem' }}>
          
          {/* Report Configuration and Selector Bar */}
          <div className="glass-card no-print" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--light-blue)', paddingBottom: '0.4rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <FileText size={16} />
              <span>Report Type & Filters Configuration</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: '700' }}>Select Report Type</label>
                <select 
                  style={{ padding: '0.45rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontWeight: 'bold', backgroundColor: 'var(--light-blue)', color: 'var(--primary-blue)' }} 
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="Executive Summary Report">Executive Summary Report</option>
                  <option value="Monthly Safety Report">Monthly Safety Report</option>
                  <option value="Department Performance Report">Department Performance Report</option>
                  <option value="Corrective Action Report">Corrective Action Report</option>
                  <option value="User Activity Report">User Activity Report</option>
                  <option value="Registration Approval Report">Registration Approval Report</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: '700' }}>Start Date</label>
                <input type="date" name="start_date" className="form-input" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={filters.start_date} onChange={handleFilterChange} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: '700' }}>End Date</label>
                <input type="date" name="end_date" className="form-input" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={filters.end_date} onChange={handleFilterChange} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: '700' }}>Department Scope</label>
                <select name="department_id" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={filters.department_id} onChange={handleFilterChange}>
                  <option value="">-- All Departments --</option>
                  {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: '700' }}>Incident Status</label>
                <select name="status" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={filters.status} onChange={handleFilterChange}>
                  <option value="">-- All Statuses --</option>
                  <option value="Pending">Pending Review</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Corrective Action Assigned">Corrective Action Assigned</option>
                  <option value="Implementation In Progress">Implementation In Progress</option>
                  <option value="Implementation Completed">Implementation Completed</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: '700' }}>Severity Level</label>
                <select name="severity" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={filters.severity} onChange={handleFilterChange}>
                  <option value="">-- All Severities --</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: '700' }}>Incident Category</label>
                <select name="incident_category" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={filters.incident_category} onChange={handleFilterChange}>
                  <option value="">-- All Categories --</option>
                  <option value="Unsafe Act">Unsafe Act</option>
                  <option value="Unsafe Condition">Unsafe Condition</option>
                  <option value="Both">Both</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: '700' }}>Location</label>
                <input type="text" name="location" placeholder="e.g. Steel Melt Shop" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={filters.location} onChange={handleFilterChange} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <button type="button" onClick={handleResetFilters} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                <RefreshCw size={14} />
                <span>Reset Criteria</span>
              </button>
              
              <button 
                type="button" 
                onClick={handleFetchReport} 
                disabled={loading}
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                <span>Fetch and Preview Report</span>
              </button>
            </div>
          </div>

          {error && (
            <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '1rem', borderRadius: '4px', marginBottom: '2rem', fontWeight: '600' }} className="no-print">
              {error}
            </div>
          )}

          {/* Report Preview Panel - Styled as a printable paper page */}
          {reportData && (
            <div className="glass-card print-preview-container" style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '2.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              
              {/* Document Header Controls */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <button 
                  onClick={handleExportExcel} 
                  className="btn" 
                  style={{ backgroundColor: 'var(--success-green)', color: '#FFF', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}
                >
                  <Download size={15} />
                  <span>Excel Export</span>
                </button>
                <button 
                  onClick={handlePrint} 
                  className="btn" 
                  style={{ backgroundColor: 'var(--primary-blue)', color: '#FFF', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}
                >
                  <Printer size={15} />
                  <span>Print / Save PDF</span>
                </button>
              </div>

              {/* Official RINL Branding Letterhead */}
              <div style={{ borderBottom: '3px double var(--primary-blue)', paddingBottom: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                <div style={{ flexGrow: 1 }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary-blue)', margin: 0, fontFamily: 'Inter, sans-serif' }}>
                    RASHTRIYA ISPAT NIGAM LIMITED (RINL)
                  </h2>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--success-green)', margin: '0.2rem 0 0', textTransform: 'uppercase' }}>
                    VIZAG STEEL PLANT - SAFETY PORTAL REPORT
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    <strong>Department Scope:</strong> {reportData.department_name}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Document:</strong> safety_rpt_{new Date(reportData.generated_at).toISOString().slice(0, 10)}</div>
                  <div><strong>Generated By:</strong> {reportData.generated_by} ({user?.role})</div>
                  <div><strong>Date:</strong> {new Date(reportData.generated_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Document Sub-title & Active Filter Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', backgroundColor: '#F8F9FA', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '1.1rem', fontWeight: '800' }}>
                  {reportType}
                </h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                  <strong>Report Filters applied:</strong> {getActiveFiltersString()}
                </div>
              </div>

              {/* Content Tables */}
              <div className="table-container" style={{ marginTop: '1rem', overflowX: 'auto' }}>
                
                {/* BRANCH 1: Department Performance Report */}
                {reportType === "Department Performance Report" && reportData.performance && (
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--primary-blue)', textAlign: 'left', backgroundColor: 'var(--light-blue)' }}>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Department Name</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Total Incident Reports</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Closed Incident Reports</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Closure Rate (%)</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Avg Resolution Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.performance.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{item.department_name}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.total_incidents}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.closed_incidents}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: item.closure_rate >= 80 ? 'var(--success-green)' : 'var(--safety-orange)' }}>
                            {item.closure_rate}%
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.avg_resolution_time} Days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* BRANCH 2: Corrective Action (CAPA) Report */}
                {reportType === "Corrective Action Report" && reportData.corrective_actions && (
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--primary-blue)', textAlign: 'left', backgroundColor: 'var(--light-blue)' }}>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Incident Ref</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Corrective & Preventive Action Description</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Responsible Person</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Target Date</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.corrective_actions.map((item, idx) => {
                        const isOverdue = item.action_status !== 'Completed' && new Date(item.target_completion_date) < new Date();
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem', fontWeight: '600' }}>{item.incident_number || `ID: ${item.incident_id}`}</td>
                            <td style={{ padding: '0.75rem' }}>{item.action_description}</td>
                            <td style={{ padding: '0.75rem' }}>{item.responsible_person_name || `ID: ${item.responsible_person}`}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: isOverdue ? '#D32F2F' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                              {new Date(item.target_completion_date).toLocaleDateString()}
                              {isOverdue && " (Overdue)"}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                color: item.action_status === 'Completed' ? 'var(--success-green)' : item.action_status === 'In Progress' ? 'var(--safety-orange)' : '#C62828',
                                backgroundColor: item.action_status === 'Completed' ? '#E8F5E9' : item.action_status === 'In Progress' ? '#FFF3E0' : '#FFEBEE'
                              }}>
                                {item.action_status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* BRANCH 3: User Activity Report */}
                {reportType === "User Activity Report" && reportData.users && (
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--primary-blue)', textAlign: 'left', backgroundColor: 'var(--light-blue)' }}>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Employee ID</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Full Name</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Email</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Designated Role</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Department</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Incidents Reported</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>CAPAs Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.users.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{item.employee_id}</td>
                          <td style={{ padding: '0.75rem' }}>{item.name}</td>
                          <td style={{ padding: '0.75rem' }}>{item.email}</td>
                          <td style={{ padding: '0.75rem' }}>{item.role}</td>
                          <td style={{ padding: '0.75rem' }}>{item.department}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>{item.incidents_reported}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--success-green)' }}>{item.actions_completed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* BRANCH 4: Registration Approval Report */}
                {reportType === "Registration Approval Report" && reportData.requests && (
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--primary-blue)', textAlign: 'left', backgroundColor: 'var(--light-blue)' }}>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Employee ID</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Full Name</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Email Address</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Department Name</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Role Requested</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Request Status</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Requested Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.requests.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{item.employee_id}</td>
                          <td style={{ padding: '0.75rem' }}>{item.first_name} {item.last_name}</td>
                          <td style={{ padding: '0.75rem' }}>{item.email}</td>
                          <td style={{ padding: '0.75rem' }}>{item.department_name || `ID: ${item.department_id}`}</td>
                          <td style={{ padding: '0.75rem' }}>{item.role}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              color: item.request_status === 'Approved' ? 'var(--success-green)' : item.request_status === 'Pending' ? 'var(--safety-orange)' : '#C62828',
                              backgroundColor: item.request_status === 'Approved' ? '#E8F5E9' : item.request_status === 'Pending' ? '#FFF3E0' : '#FFEBEE'
                            }}>
                              {item.request_status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* BRANCH 5: Incident-based Reports (Executive / Monthly) */}
                {reportType !== "Department Performance Report" && 
                 reportType !== "Corrective Action Report" && 
                 reportType !== "User Activity Report" && 
                 reportType !== "Registration Approval Report" && 
                 reportData.incidents && (
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--primary-blue)', textAlign: 'left', backgroundColor: 'var(--light-blue)' }}>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Incident Ref</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Incident Title</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Department</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Location</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Category</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Severity</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Reported Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.incidents.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{item.incident_number}</td>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>{item.title}</td>
                          <td style={{ padding: '0.75rem' }}>{item.department_code || item.department_name}</td>
                          <td style={{ padding: '0.75rem' }}>{item.location}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.incident_type}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              color: item.potential_severity === 'Critical' || item.potential_severity === 'High' ? '#C62828' : 'inherit',
                              backgroundColor: item.potential_severity === 'Critical' || item.potential_severity === 'High' ? '#FFEBEE' : 'transparent'
                            }}>
                              {item.potential_severity}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.status}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {item.reported_date ? new Date(item.reported_date).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

              </div>
              
              {/* Report Footer / Signature Area */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', fontSize: '0.8rem' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>Safety Officer Signature</p>
                  <div style={{ height: '40px' }}></div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Plant Safety Division</p>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>Executive Management Approver</p>
                  <div style={{ height: '40px' }}></div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Rashtriya Ispat Nigam Limited</p>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Reports;
