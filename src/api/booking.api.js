import api from './axios';

export const getBookings = async ({ page = 1, limit = 10, search = '', status = '' } = {}) => {
  const response = await api.get('/api/bookings', {
    params: { page, limit, search, status }
  });
  return response.data;
};

export const getBookingById = async (id) => {
  const response = await api.get(`/api/bookings/${id}`);
  return response.data;
};

export const createBooking = async (bookingData) => {
  const response = await api.post('/api/bookings', bookingData);
  return response.data;
};

export const updateBooking = async (id, bookingData) => {
  const response = await api.put(`/api/bookings/${id}`, bookingData);
  return response.data;
};

export const deleteBooking = async (id) => {
  const response = await api.delete(`/api/bookings/${id}`);
  return response.data;
};
