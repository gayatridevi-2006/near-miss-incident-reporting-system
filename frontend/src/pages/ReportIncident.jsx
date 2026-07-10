import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIncident } from '../api/incidents';
import { getDepartments } from '../api/departments';
import Navbar from '../components/Navbar';
import { Send, RotateCcw, X, ShieldAlert, Image, Calendar, MapPin, Tag, FileText, AlertTriangle } from 'lucide-react';

const ReportIncident = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const navigate = useNavigate();

  // Form Field States
  const [formData, setFormData] = useState({
    title: '',
    department_id: '',
    location: '',
    equipment_involved: '',
    incident_date: '',
    unsafe_act_or_condition: 'Unsafe Act',
    potential_severity: 'Low',
    description: ''
  });

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Validation Errors State
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    fetchDepartments();
    setDefaultDateTime();
  }, []);

  const setDefaultDateTime = () => {
    const now = new Date();
    // Format to YYYY-MM-DDTHH:MM local time
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
    setFormData(prev => ({ ...prev, incident_date: localISOTime }));
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await getDepartments();
      // Filter out inactive departments if status column exists
      const activeDepts = response.data.filter(d => d.status !== 'Inactive');
      setDepartments(activeDepts);
      if (activeDepts.length > 0) {
        setFormData(prev => ({ ...prev, department_id: activeDepts[0].id }));
      }
    } catch (err) {
      console.error("Error loading departments list", err);
      setSubmitError('Could not load departments list. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Run validation on fields
  const validateField = (name, value, file = null) => {
    let error = '';
    
    if (name === 'title') {
      if (!value.trim()) {
        error = 'Incident Title is required';
      } else if (value.trim().length < 5) {
        error = 'Title must be at least 5 characters';
      }
    }
    
    if (name === 'department_id') {
      if (!value) {
        error = 'Department selection is required';
      }
    }
    
    if (name === 'location') {
      if (!value.trim()) {
        error = 'Incident location/area is required';
      } else if (value.trim().length < 3) {
        error = 'Location description must be at least 3 characters';
      }
    }
    
    if (name === 'incident_date') {
      if (!value) {
        error = 'Date and time of incident is required';
      } else {
        const chosenDate = new Date(value);
        const now = new Date();
        if (chosenDate > now) {
          error = 'Date and time cannot be in the future';
        }
      }
    }
    
    if (name === 'description') {
      if (!value.trim()) {
        error = 'Near miss description is required';
      } else if (value.trim().length < 15) {
        error = 'Provide a more detailed description (min 15 characters)';
      }
    }

    if (name === 'photograph' && file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB
      
      if (!allowedTypes.includes(file.type)) {
        error = 'File must be an image (PNG, JPG, JPEG, WEBP, or GIF)';
      } else if (file.size > maxSizeBytes) {
        error = 'Image file size must be less than 5MB';
      }
    }

    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setTouched(prev => ({ ...prev, photograph: true }));
    
    if (!file) {
      setSelectedFile(null);
      setFilePreview(null);
      setErrors(prev => ({ ...prev, photograph: '' }));
      return;
    }

    const error = validateField('photograph', null, file);
    setErrors(prev => ({ ...prev, photograph: error }));

    if (!error) {
      setSelectedFile(file);
      // Create local URL preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      department_id: departments.length > 0 ? departments[0].id : '',
      location: '',
      equipment_involved: '',
      incident_date: '',
      unsafe_act_or_condition: 'Unsafe Act',
      potential_severity: 'Low',
      description: ''
    });
    setSelectedFile(null);
    setFilePreview(null);
    setErrors({});
    setTouched({});
    setSubmitError('');
    setDefaultDateTime();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    // Mark all fields as touched
    const allFields = ['title', 'department_id', 'location', 'incident_date', 'description'];
    const newTouched = {};
    allFields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    // Validate all fields
    const newErrors = {};
    allFields.forEach(field => {
      const err = validateField(field, formData[field]);
      if (err) newErrors[field] = err;
    });

    if (selectedFile) {
      const fileErr = validateField('photograph', null, selectedFile);
      if (fileErr) newErrors.photograph = fileErr;
    }

    setErrors(newErrors);

    // Check if there are any validation errors
    if (Object.keys(newErrors).some(key => newErrors[key])) {
      setSubmitError('Please correct the validation errors in the form before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('title', formData.title);
      formDataObj.append('department_id', formData.department_id);
      formDataObj.append('location', formData.location);
      formDataObj.append('equipment_involved', formData.equipment_involved || '');
      formDataObj.append('incident_date', formData.incident_date);
      formDataObj.append('unsafe_act_or_condition', formData.unsafe_act_or_condition);
      formDataObj.append('potential_severity', formData.potential_severity);
      formDataObj.append('description', formData.description);
      
      if (selectedFile) {
        formDataObj.append('photograph', selectedFile);
      }

      await createIncident(formDataObj);

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error("Error submitting incident", err);
      setSubmitError(err.response?.data?.message || 'A network error occurred while submitting the incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
      <div className="main-content" style={{ width: '100%', backgroundColor: '#FFFFFF' }}>
        <Navbar title="Steel Plant Safety Portal" />
        
        <div className="page-body fade-in" style={{ backgroundColor: '#FFFFFF', padding: '2rem 1.5rem' }}>
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CCCCCC',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderRadius: '4px'
          }}>
            
            {/* Government ERP Header Style - Light Blue Background with Dark Text & Blue Bottom Border */}
            <div style={{
              backgroundColor: '#E3F2FD',
              borderBottom: '3px solid #1976D2',
              padding: '1.25rem 2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <ShieldAlert size={28} color="#1976D2" style={{ flexShrink: 0 }} />
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#0D47A1', fontWeight: '800', margin: 0, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Near Miss Incident Reporting Form
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#1565C0', fontWeight: '600', margin: '0.2rem 0 0 0' }}>
                  SAFE-STEEL COMPLIANCE SYSTEM • MINISTRY OF STEEL & INDUSTRIAL COMPLIANCE
                </p>
              </div>
            </div>

            {/* Form Content container */}
            <div style={{ padding: '2rem' }}>
              
              {/* Notification Banner */}
              <div style={{
                backgroundColor: '#FFF8E1',
                borderLeft: '4px solid #FFB300',
                color: '#5D4037',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '1.5rem',
                borderRadius: '0 4px 4px 0'
              }}>
                <strong>Instructions:</strong> Please fill out this form accurately to report any near miss hazards or unsafe situations in the plant. Fields marked with an asterisk (<span style={{ color: '#D32F2F', fontWeight: 'bold' }}>*</span>) are mandatory.
              </div>

              {submitError && (
                <div style={{
                  backgroundColor: '#FFEBEE',
                  border: '1px solid #FFCDD2',
                  color: '#C62828',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertTriangle size={18} />
                  <span>{submitError}</span>
                </div>
              )}

              {success && (
                <div style={{
                  backgroundColor: '#E8F5E9',
                  border: '1px solid #C8E6C9',
                  color: '#1B5E20',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: '1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  textAlign: 'center'
                }}>
                  SUCCESS: Incident reported and saved successfully! Redirecting to Dashboard...
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                
                {/* Subject/Title */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#333333' }}>
                    Incident Title / Subject <span style={{ color: '#D32F2F' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      name="title"
                      className="form-input"
                      placeholder="Brief descriptive title (e.g., Gas leakage near furnace utility, Loose wiring on Crane-4)"
                      value={formData.title}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      style={{
                        borderColor: touched.title && errors.title ? '#D32F2F' : '#CCCCCC',
                        paddingLeft: '2.25rem'
                      }}
                      required
                    />
                    <FileText size={16} color="#777777" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                  {touched.title && errors.title && (
                    <div style={{ color: '#D32F2F', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.25rem' }}>{errors.title}</div>
                  )}
                </div>

                {/* Grid for Department & Date */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                  
                  {/* Plant Department */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#333333' }}>
                      Responsible Department <span style={{ color: '#D32F2F' }}>*</span>
                    </label>
                    <select
                      name="department_id"
                      className="form-select"
                      value={formData.department_id}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      style={{
                        borderColor: touched.department_id && errors.department_id ? '#D32F2F' : '#CCCCCC'
                      }}
                      required
                    >
                      {loading ? (
                        <option value="">Loading departments...</option>
                      ) : (
                        departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                        ))
                      )}
                    </select>
                    {touched.department_id && errors.department_id && (
                      <div style={{ color: '#D32F2F', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.25rem' }}>{errors.department_id}</div>
                    )}
                  </div>

                  {/* Incident Date & Time */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#333333' }}>
                      Date & Time of Incident <span style={{ color: '#D32F2F' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="datetime-local"
                        name="incident_date"
                        className="form-input"
                        value={formData.incident_date}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        style={{
                          borderColor: touched.incident_date && errors.incident_date ? '#D32F2F' : '#CCCCCC',
                          paddingLeft: '2.25rem'
                        }}
                        required
                      />
                      <Calendar size={16} color="#777777" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    {touched.incident_date && errors.incident_date && (
                      <div style={{ color: '#D32F2F', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.25rem' }}>{errors.incident_date}</div>
                    )}
                  </div>

                </div>

                {/* Grid for Location & Equipment */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                  
                  {/* Location */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#333333' }}>
                      Specific Location / Plant Area <span style={{ color: '#D32F2F' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        name="location"
                        className="form-input"
                        placeholder="E.g., SMS-1 Converter Area, Blast Furnace-3 Runner floor"
                        value={formData.location}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        style={{
                          borderColor: touched.location && errors.location ? '#D32F2F' : '#CCCCCC',
                          paddingLeft: '2.25rem'
                        }}
                        required
                      />
                      <MapPin size={16} color="#777777" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    {touched.location && errors.location && (
                      <div style={{ color: '#D32F2F', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.25rem' }}>{errors.location}</div>
                    )}
                  </div>

                  {/* Equipment Involved */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#333333' }}>
                      Equipment Involved (Optional)
                    </label>
                    <input
                      type="text"
                      name="equipment_involved"
                      className="form-input"
                      placeholder="E.g., Crane No. 5, Boiler B, Gas Valve 14"
                      value={formData.equipment_involved}
                      onChange={handleInputChange}
                    />
                  </div>

                </div>

                {/* Grid for Category & Severity */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                  
                  {/* Incident Category */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#333333' }}>
                      Incident Category / Occurrence Type <span style={{ color: '#D32F2F' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        name="unsafe_act_or_condition"
                        className="form-select"
                        value={formData.unsafe_act_or_condition}
                        onChange={handleInputChange}
                        style={{ paddingLeft: '2.25rem' }}
                      >
                        <option value="Unsafe Act">Unsafe Act (Human error/safety violation)</option>
                        <option value="Unsafe Condition">Unsafe Condition (Environmental/physical hazard)</option>
                        <option value="Both">Both Unsafe Act & Unsafe Condition</option>
                      </select>
                      <Tag size={16} color="#777777" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                    </div>
                  </div>

                  {/* Potential Severity */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#333333' }}>
                      Potential Severity / Hazard Level <span style={{ color: '#D32F2F' }}>*</span>
                    </label>
                    <select
                      name="potential_severity"
                      className="form-select"
                      value={formData.potential_severity}
                      onChange={handleInputChange}
                    >
                      <option value="Low">Low (No injury probability, minor hazard)</option>
                      <option value="Medium">Medium (Minor injury probability, low hazard)</option>
                      <option value="High">High (Serious injury probability, major hazard)</option>
                      <option value="Critical">Critical (Fatality/disability risk, extreme hazard)</option>
                    </select>
                  </div>

                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#333333' }}>
                    Near Miss Description & Observation <span style={{ color: '#D32F2F' }}>*</span>
                  </label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    placeholder="Provide details about the incident. What was observed? What could have happened if not corrected? What immediate safety action did you take (if any)?"
                    value={formData.description}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    style={{
                      borderColor: touched.description && errors.description ? '#D32F2F' : '#CCCCCC',
                      minHeight: '140px'
                    }}
                    required
                  />
                  {touched.description && errors.description && (
                    <div style={{ color: '#D32F2F', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.25rem' }}>{errors.description}</div>
                  )}
                </div>

                {/* Photograph Upload */}
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label" style={{ fontWeight: '700', color: '#333333' }}>
                    Upload Supporting Photograph (Optional)
                  </label>
                  
                  <div style={{
                    border: touched.photograph && errors.photograph ? '2px dashed #D32F2F' : '2px dashed #CCCCCC',
                    borderRadius: '4px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    backgroundColor: '#FAFAFA',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <Image size={32} color="#777777" style={{ marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.85rem', color: '#555555', margin: '0.25rem 0' }}>
                      Drag and drop your image here, or <strong>click to browse files</strong>
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#777777', margin: 0 }}>
                      Supports PNG, JPG, JPEG, WEBP, or GIF (Max size: 5MB)
                    </p>
                  </div>
                  
                  {touched.photograph && errors.photograph && (
                    <div style={{ color: '#D32F2F', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.25rem' }}>{errors.photograph}</div>
                  )}

                  {/* File Preview */}
                  {selectedFile && filePreview && (
                    <div style={{
                      marginTop: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem',
                      border: '1px solid #E0E0E0',
                      borderRadius: '4px',
                      backgroundColor: '#F5F5F5'
                    }}>
                      <img
                        src={filePreview}
                        alt="Preview"
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border: '1px solid #D3D3D3'
                        }}
                      />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#333333', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', margin: 0 }}>
                          {selectedFile.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#777777', margin: '0.2rem 0 0 0' }}>
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreview(null);
                          setErrors(prev => ({ ...prev, photograph: '' }));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#C62828',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Remove image"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Action Buttons (ERP Green Style) */}
                <div style={{
                  borderTop: '1px solid #DDDDDD',
                  paddingTop: '1.5rem',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '1rem'
                }}>
                  
                  {/* Cancel Button */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/dashboard')}
                    disabled={submitting}
                  >
                    <X size={16} />
                    <span>Cancel</span>
                  </button>

                  {/* Reset Button (Sage Green Theme) */}
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={submitting}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontWeight: '600',
                      fontFamily: 'inherit',
                      fontSize: '0.875rem',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      backgroundColor: '#E8F5E9',
                      color: '#2E7D32',
                      border: '1px solid #C8E6C9',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#C8E6C9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#E8F5E9';
                    }}
                  >
                    <RotateCcw size={16} />
                    <span>Reset Form</span>
                  </button>

                  {/* Submit Button (Solid Forest Green) */}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontWeight: '600',
                      fontFamily: 'inherit',
                      fontSize: '0.875rem',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      backgroundColor: '#2E7D32',
                      color: '#FFFFFF',
                      border: '1px solid #1B5E20',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1B5E20';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#2E7D32';
                    }}
                  >
                    <Send size={16} />
                    <span>{submitting ? 'Submitting Report...' : 'Submit Safety Report'}</span>
                  </button>

                </div>

              </form>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportIncident;
