import client from './client';

export const getDepartments = () => {
  return client.get('/departments');
};

export const createDepartment = (data) => {
  return client.post('/departments', data);
};

export const updateDepartment = (departmentId, data) => {
  return client.put(`/departments/${departmentId}`, data);
};
