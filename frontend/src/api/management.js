import client from './client';

export const getIncidentStats = (params) => {
  return client.get('/analytics/incident-stats', { params });
};

export const getDepartmentStats = (params) => {
  return client.get('/analytics/department-stats', { params });
};

export const getMonthlyTrends = (params) => {
  return client.get('/analytics/monthly-trends', { params });
};
