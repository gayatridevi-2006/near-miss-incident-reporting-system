import client from './client';

export const login = (username, password, captcha_input, captcha_answer) => {
  return client.post('/auth/login', { username, password, captcha_input, captcha_answer });
};

export const logout = () => {
  return client.post('/auth/logout');
};

export const getProfile = () => {
  return client.get('/auth/profile');
};

export const updateProfile = (data) => {
  return client.put('/auth/profile', data);
};

export const changePassword = (data) => {
  return client.post('/auth/change-password', data);
};

export const firstLoginChangePassword = (data) => {
  return client.post('/auth/first-login-change-password', data);
};

export const registerUser = (data) => {
  return client.post('/auth/register', data);
};
