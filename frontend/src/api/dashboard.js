import client from './client';

export const getEmployeeDashboard = (params) => {
  return client.get('/analytics/dashboard', { params });
};

export const getManagementSummary = (params) => {
  return client.get('/analytics/summary', { params });
};

export const getManagementNotifications = (params) => {
  return client.get('/analytics/notifications', { params });
};
