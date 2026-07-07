import api from './axios';

export const getTemplates = async ({ activeOnly = false } = {}) => {
  const response = await api.get('/api/templates', {
    params: { activeOnly }
  });
  return response.data;
};

export const getTemplateById = async (id) => {
  const response = await api.get(`/api/templates/${id}`);
  return response.data;
};

export const createTemplate = async (templateData) => {
  const response = await api.post('/api/templates', templateData);
  return response.data;
};

export const updateTemplate = async (id, templateData) => {
  const response = await api.put(`/api/templates/${id}`, templateData);
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await api.delete(`/api/templates/${id}`);
  return response.data;
};
