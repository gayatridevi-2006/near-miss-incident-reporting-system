import client from './client';

export const generateReport = (params) => {
  return client.get('/hod/reports', { params });
};

export const exportReportExcel = (queryString) => {
  return client.get(`/hod/reports/export/excel?${queryString}`, { responseType: 'blob' });
};

export const getReportsData = (params) => {
  return client.get('/analytics/reports', { params });
};
