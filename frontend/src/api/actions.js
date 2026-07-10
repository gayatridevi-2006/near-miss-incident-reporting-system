import client from './client';

export const getActionItems = () => {
  return client.get('/actions');
};

export const proposeAction = (data) => {
  return client.post('/actions', data);
};

export const updateActionStatus = (actionId, data) => {
  return client.put(`/actions/${actionId}/status`, data);
};

export const approveAction = (actionId) => {
  return client.put(`/actions/${actionId}/approve`);
};
