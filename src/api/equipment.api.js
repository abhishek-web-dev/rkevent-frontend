import api from './axios';

export const getEquipment = async () => {
  const response = await api.get('/api/equipment');
  return response.data;
};

export const createEquipment = async (gearData) => {
  const response = await api.post('/api/equipment', gearData);
  return response.data;
};
