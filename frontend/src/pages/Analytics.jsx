import React, { useState, useEffect } from 'react';
import { getIncidentStats, getDepartmentStats, getMonthlyTrends } from '../api/management';
import { getDepartments } from '../api/departments';
import Navbar from '../components/Navbar';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, 
  AlertTriangle, 
  Building, 
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Users
} from 'lucide-react';

const COLORS = ['#1565C0', '#2E7D32', '#EF6C00', '#C62828', '#8E24AA', '#00ACC1', '#FDD835', '#00E676', '#FF1744', '#D500F9'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Datasets state
  const [incidentStats, setIncidentStats] = useState(null);
  const [departmentStats, setDepartmentStats] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [departments, setDepartments] = useState([]);
  
  // Filter state
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
    fetchAnalyticsData(filters);
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(response.data);
    } catch (err) {
      console.error("Error fetching departments", err);
    }
  };

  const fetchAnalyticsData = async (activeFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.keys(activeFilters).forEach(key => {
        if (activeFilters[key]) params[key] = activeFilters[key];
      });

      const [incStatsRes, deptStatsRes, trendsRes] = await Promise.all([
        getIncidentStats(params),
        getDepartmentStats(params),
        getMonthlyTrends(params)
      ]);

      setIncidentStats(incStatsRes.data);
      setDepartmentStats(deptStatsRes.data);
      setMonthlyTrends(trendsRes.data);
    } catch (err) {
      console.error("Error fetching analytics statistics", err);
      setError('Could not load plant safety analytics data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    fetchAnalyticsData(newFilters);
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      start_date: '',
      end_date: '',
      department_id: '',
      status: '',
      severity: '',
      incident_category: '',
      location: '',
      user_type: ''
    };
    setFilters(defaultFilters);
    fetchAnalyticsData(defaultFilters);
  };

  // Client-side SVG to PNG downloader for Recharts
  const downloadChartAsPNG = (chartId, title) => {
    const chartEl = document.getElementById(chartId);
    if (!chartEl) return;
    const svgEl = chartEl.querySelector('svg');
    if (!svgEl) return;

    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const DOMURL = window.URL || window.webkitURL || window;
    const url = DOMURL.createObjectURL(svgBlob);

    const image = new Image();
    const rect = svgEl.getBoundingClientRect();
    image.width = rect.width || 600;
    image.height = rect.height || 400;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      
      // Draw white background
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.drawImage(image, 0, 0);
      
      const png = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = png;
      downloadLink.download = `${title.toLowerCase().replace(/ /g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      DOMURL.revokeObjectURL(url);
    };
    image.src = url;
  };

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div className="main-content" style={{ width: '100%' }}>
        <Navbar title="Steel Plant Safety Analytics & Trends" />
        
        <div className="page-body fade-in" style={{ padding: '1.5rem' }}>
          
          {/* Query Filter Toolbar */}
          <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--primary-blue)', borderBottom: '2px solid var(--light-blue)', paddingBottom: '0.4rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <Filter size={16} />
              <span>Safety Statistics Filtering</span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.8rem' }}>
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
                <input type="text" name="location" placeholder="e.g. Blast Furnace" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={filters.location} onChange={handleFilterChange} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: '700' }}>Reporter Role</label>
                <select name="user_type" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={filters.user_type} onChange={handleFilterChange}>
                  <option value="">-- All Roles --</option>
                  <option value="Employee">Employee</option>
                  <option value="Trainee">Trainee</option>
                  <option value="Intern">Intern</option>
                  <option value="Contractor">Contractor</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" onClick={handleResetFilters} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                <RefreshCw size={14} />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>

          {error && (
            <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '1rem', borderRadius: '4px', marginBottom: '2rem', fontWeight: '600' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem' }}>
              <RefreshCw size={24} className="animate-spin" color="var(--primary-blue)" />
              <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>Updating Safety Data...</span>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(48%, 1fr))',
              gap: '2rem'
            }}>
              
              {/* CHART 1: Department-wise Incident Statistics */}
              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building size={16} />
                    <span>Department-wise Incident Statistics</span>
                  </h4>
                  <button onClick={() => downloadChartAsPNG("chart-dept-incidents", "Department-wise Incidents")} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Download size={12} />
                    <span>PNG</span>
                  </button>
                </div>
                <div id="chart-dept-incidents" style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentStats?.department_statistics || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="incidents" fill="#1565C0" name="Incidents Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 2: Monthly Incident Trends */}
              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={16} />
                    <span>Monthly Incident Trends</span>
                  </h4>
                  <button onClick={() => downloadChartAsPNG("chart-monthly-trends", "Monthly Incident Trends")} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Download size={12} />
                    <span>PNG</span>
                  </button>
                </div>
                <div id="chart-monthly-trends" style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends?.monthly_incident_trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="incidents" stroke="#2E7D32" strokeWidth={2.5} name="Total Incidents" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 3: Incident Status Distribution */}
              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BarChart3 size={16} />
                    <span>Incident Status Distribution</span>
                  </h4>
                  <button onClick={() => downloadChartAsPNG("chart-status-pie", "Incident Status Distribution")} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Download size={12} />
                    <span>PNG</span>
                  </button>
                </div>
                <div id="chart-status-pie" style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incidentStats?.status_distribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(incidentStats?.status_distribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 4: Incident Category Distribution */}
              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={16} />
                    <span>Incident Category Distribution (Act/Condition)</span>
                  </h4>
                  <button onClick={() => downloadChartAsPNG("chart-category-donut", "Incident Category Distribution")} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Download size={12} />
                    <span>PNG</span>
                  </button>
                </div>
                <div id="chart-category-donut" style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incidentStats?.category_distribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {(incidentStats?.category_distribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 5: Severity Distribution */}
              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={16} color="red" />
                    <span>Potential Severity Distribution</span>
                  </h4>
                  <button onClick={() => downloadChartAsPNG("chart-severity-bar", "Severity Distribution")} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Download size={12} />
                    <span>PNG</span>
                  </button>
                </div>
                <div id="chart-severity-bar" style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incidentStats?.severity_distribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#C62828" name="Incident Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 6: Top 10 Departments by Incident Count */}
              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building size={16} />
                    <span>Top 10 Departments by Incident Count</span>
                  </h4>
                  <button onClick={() => downloadChartAsPNG("chart-top-depts", "Top 10 Departments")} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Download size={12} />
                    <span>PNG</span>
                  </button>
                </div>
                <div id="chart-top-depts" style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={departmentStats?.top_10_departments || []}
                      margin={{ left: 20, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="department" type="category" tick={{ fontSize: 9 }} width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="incidents" fill="#EF6C00" name="Incidents Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 7: Corrective Action Completion Status by Department */}
              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BarChart3 size={16} />
                    <span>Corrective Action Completion (CAPA Status)</span>
                  </h4>
                  <button onClick={() => downloadChartAsPNG("chart-capa-stacked", "Corrective Actions Status")} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Download size={12} />
                    <span>PNG</span>
                  </button>
                </div>
                <div id="chart-capa-stacked" style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentStats?.corrective_action_stats || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Completed" stackId="a" fill="#2E7D32" />
                      <Bar dataKey="In Progress" stackId="a" fill="#EF6C00" />
                      <Bar dataKey="Pending" stackId="a" fill="#C62828" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 8: Monthly Open vs Closed Incidents */}
              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <TrendingUp size={16} />
                    <span>Monthly Open vs Closed Incident Trends</span>
                  </h4>
                  <button onClick={() => downloadChartAsPNG("chart-open-closed", "Monthly Open vs Closed")} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Download size={12} />
                    <span>PNG</span>
                  </button>
                </div>
                <div id="chart-open-closed" style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends?.monthly_open_closed_trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="open" stroke="#EF6C00" strokeWidth={2} name="Active Open" />
                      <Line type="monotone" dataKey="closed" stroke="#2E7D32" strokeWidth={2} name="Resolved Closed" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 9: Monthly User Registrations */}
              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={16} />
                    <span>Monthly New User Registrations</span>
                  </h4>
                  <button onClick={() => downloadChartAsPNG("chart-user-reg", "Monthly Registrations")} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Download size={12} />
                    <span>PNG</span>
                  </button>
                </div>
                <div id="chart-user-reg" style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends?.monthly_user_registrations || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="registrations" stroke="#8E24AA" strokeWidth={2} name="Registered Users" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 10: Department-wise Employee Reporting Activity */}
              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={16} />
                    <span>Department Employee Safety Reporting Activity</span>
                  </h4>
                  <button onClick={() => downloadChartAsPNG("chart-emp-activity", "Employee Reporting Activity")} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Download size={12} />
                    <span>PNG</span>
                  </button>
                </div>
                <div id="chart-emp-activity" style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentStats?.employee_reporting_activity || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="active_employees" fill="#00ACC1" name="Active Reporters Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Analytics;
