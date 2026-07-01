import client from './client';

export const getSafetyOfficerIncidents = () => {
  return client.get('/incidents');
};

export const reviewIncident = (incidentId, data) => {
  return client.post(`/incidents/${incidentId}/review`, data);
};
