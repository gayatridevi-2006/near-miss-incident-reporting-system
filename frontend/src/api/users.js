import client from './client';

export const getAllUsers = () => {
  return client.get('/auth/users');
};

export const createUser = (data) => {
  return client.post('/auth/users', data);
};

export const updateUser = (userId, data) => {
  return client.put(`/auth/users/${userId}`, data);
};

export const deleteUser = (userId) => {
  return client.delete(`/auth/users/${userId}`);
};

export const resetPassword = (userId) => {
  return client.post(`/auth/users/${userId}/reset-password`);
};

export const activateUser = (userId) => {
  return client.post(`/auth/users/${userId}/activate`);
};

export const deactivateUser = (userId) => {
  return client.post(`/auth/users/${userId}/deactivate`);
};

export const archiveUser = (userId) => {
  return client.post(`/auth/users/${userId}/archive`);
};
