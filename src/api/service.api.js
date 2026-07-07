import api from './axios';

export const getServices = async ({ page = 1, limit = 50, search = '', activeOnly = false } = {}) => {
  const response = await api.get('/api/services', {
    params: { page, limit, search, activeOnly }
  });
  return response.data;
};

export const getServiceById = async (id) => {
  const response = await api.get(`/api/services/${id}`);
  return response.data;
};

export const createService = async (serviceData) => {
  const response = await api.post('/api/services', serviceData);
  return response.data;
};

export const updateService = async (id, serviceData) => {
  const response = await api.put(`/api/services/${id}`, serviceData);
  return response.data;
};

export const deleteService = async (id) => {
  const response = await api.delete(`/api/services/${id}`);
  return response.data;
};
