import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
});

// Auth
export const loginAdmin = async (email, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  });
  if (response.data.data.user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  localStorage.setItem('adminToken', response.data.data.accessToken);
  return response.data.data;
};

export const logoutAdmin = () => {
  localStorage.removeItem('adminToken');
};

// Dashboard
export const getDashboardStats = async () => {
  const response = await axios.get(`${API_URL}/admin/dashboard`, {
    headers: getHeaders(),
  });
  return response.data.data;
};

// Settings
export const getSettings = async () => {
  const response = await axios.get(`${API_URL}/admin/settings`, {
    headers: getHeaders(),
  });
  return response.data.data;
};

export const updateSettings = async (settings) => {
  const response = await axios.patch(`${API_URL}/admin/settings`, settings, {
    headers: getHeaders(),
  });
  return response.data.data;
};

// Articles
export const getArticles = async (page = 1) => {
  const response = await axios.get(`${API_URL}/admin/articles?page=${page}&limit=20`, {
    headers: getHeaders(),
  });
  return response.data;
};

export const featureArticle = async (articleId) => {
  const response = await axios.patch(
    `${API_URL}/admin/articles/${articleId}/feature`,
    { isFeatured: true },
    { headers: getHeaders() }
  );
  return response.data;
};

// Users
export const getUsers = async (page = 1) => {
  const response = await axios.get(`${API_URL}/admin/users?page=${page}&limit=20`, {
    headers: getHeaders(),
  });
  return response.data;
};

export const blockUser = async (userId, reason) => {
  const response = await axios.patch(
    `${API_URL}/admin/users/${userId}/block`,
    { isBlocked: true, reason },
    { headers: getHeaders() }
  );
  return response.data;
};

// Analytics
export const getAnalytics = async () => {
  const response = await axios.get(`${API_URL}/admin/analytics`, {
    headers: getHeaders(),
  });
  return response.data.data;
};

// Logs
export const getActivityLogs = async (limit = 50) => {
  const response = await axios.get(`${API_URL}/admin/logs?limit=${limit}`, {
    headers: getHeaders(),
  });
  return response.data;
};
