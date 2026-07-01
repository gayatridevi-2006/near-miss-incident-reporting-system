import client from './client';

export const getIncidents = () => {
  return client.get('/incidents');
};

export const getIncidentById = (incidentId) => {
  return client.get(`/incidents/${incidentId}`);
};

export const createIncident = (data) => {
  return client.post('/incidents', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const updateIncidentStatus = (incidentId, data) => {
  return client.put(`/incidents/${incidentId}/status`, data);
};
