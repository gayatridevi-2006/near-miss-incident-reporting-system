import client from './client';

export const getRegistrationRequests = (params) => {
  return client.get('/auth/registration-requests', { params });
};

export const approveRegistrationRequest = (requestId, data) => {
  return client.post(`/auth/registration-requests/${requestId}/approve`, data);
};

export const rejectRegistrationRequest = (requestId, data) => {
  return client.post(`/auth/registration-requests/${requestId}/reject`, data);
};
