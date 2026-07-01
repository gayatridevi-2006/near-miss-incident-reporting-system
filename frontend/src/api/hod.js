import client from './client';

export const getHODIncidents = () => {
  return client.get('/hod/incidents');
};

export const getHODIncidentById = (incidentId) => {
  return client.get(`/hod/incidents/${incidentId}`);
};

export const submitInvestigation = (incidentId, data) => {
  return client.post(`/hod/incidents/${incidentId}/investigation`, data);
};

export const assignCAPA = (incidentId, data) => {
  return client.post(`/hod/incidents/${incidentId}/capa`, data);
};

export const getHODDashboard = () => {
  return client.get('/hod/dashboard');
};

export const assignAction = (incidentId, data) => {
  return client.post(`/hod/incidents/${incidentId}/assign-action`, data);
};

export const verifyClosure = (incidentId, data) => {
  return client.post(`/hod/incidents/${incidentId}/verify-closure`, data);
};
