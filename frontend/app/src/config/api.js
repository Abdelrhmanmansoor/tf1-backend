import axios from 'axios';

const API_URL = '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in all requests
});

// ==================== TOKEN REFRESH LOCKING ====================
// Use Promise-based locking instead of boolean flag to prevent race conditions
let refreshPromise = null;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ==================== CSRF TOKEN MANAGEMENT ====================
// Helper function to get CSRF token from cookie or generate new one
const getCSRFToken = async () => {
  // First check if CSRF token exists in cookies (set by server)
  const cookies = document.cookie.split(';').map(c => c.trim());
  const csrfCookie = cookies.find(c => c.startsWith('XSRF-TOKEN='));
  
  if (csrfCookie) {
    return csrfCookie.split('=')[1];
  }
  
  // If no token in cookie, request one from server
  try {
    const response = await axios.get(`${API_URL}/auth/csrf-token`, { withCredentials: true });
    return response.data?.token || response.data?.csrfToken;
  } catch (err) {
    console.warn('Failed to fetch CSRF token:', err);
    return null;
  }
};

api.interceptors.request.use(
  async (config) => {
    // Get token from sessionStorage (cleared when tab closes)
    // NOT from localStorage (persistent and XSS vulnerable)
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
      const csrfToken = await getCSRFToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    // Refresh token is now in httpOnly cookie, sent automatically
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // تحقق إذا كان الخطأ 401 (unauthorized) فقط - وليس من الشبكة أو من الـ timeout
    if (error.response?.status === 401 && !originalRequest._retry && error.response) {
      // Only refresh token once, queue other requests
      if (!refreshPromise) {
        refreshPromise = new Promise(async (resolve, reject) => {
          try {
            const response = await axios.post(`${API_URL}/auth/refresh-token`, {}, {
              withCredentials: true // Include cookies for refresh
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;
            
            // Store new access token in sessionStorage (memory-based, cleared on tab close)
            if (accessToken) {
              sessionStorage.setItem('accessToken', accessToken);
              api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            }
            
            // Refresh token is in httpOnly cookie, handled automatically by browser
            if (newRefreshToken) {
              sessionStorage.setItem('refreshToken', newRefreshToken);
            }

            processQueue(null, accessToken);
            resolve(accessToken);
          } catch (err) {
            // Token refresh failed - لا تسجل خروج، فقط رفع الخطأ
            console.warn('Token refresh failed, user may be logged out:', err);
            // فقط سجل خروج إذا كان الخطأ من الـ authentication نفسه
            if (err.response?.status === 401 || err.response?.status === 403) {
              sessionStorage.removeItem('accessToken');
              sessionStorage.removeItem('refreshToken');
              sessionStorage.removeItem('user');
              window.location.href = '/login';
            }
            processQueue(err, null);
            reject(err);
          } finally {
            refreshPromise = null; // Release lock for next refresh
          }
        });
      }

      // Wait for refresh to complete
      try {
        const token = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        originalRequest._retry = true; // Mark as retried
        return api(originalRequest);
      } catch (err) {
        console.warn('Failed to refresh token, request will fail');
        return Promise.reject(err);
      }
    }

    // إذا كان الخطأ من الشبكة أو من الـ timeout، لا تسجل خروج
    if (!error.response) {
      // Network error or timeout - لا تسجل خروج
      console.warn('Network error:', error.message);
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  logout: () => {
    // Clear local session storage
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    
    // Call logout endpoint to clear cookies server-side
    return api.post('/auth/logout');
  },
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
};

export const matchService = {
  getMatches: (filters = {}) => api.get('/matches', { params: filters }),
  getMatch: (id) => api.get(`/matches/${id}`),
  createMatch: (data) => api.post('/matches', data),
  joinMatch: (id) => api.post(`/matches/${id}/join`),
  leaveMatch: (id) => api.post(`/matches/${id}/leave`),
  getMyMatches: () => api.get('/matches/my-matches'),
  getRegions: () => api.get('/matches/regions'),
  
  // Social Features
  getFriends: () => api.get('/matches/api/social/friends'),
  getFriendRequests: () => api.get('/matches/api/social/friends/requests'),
  getFriendSuggestions: () => api.get('/matches/api/social/friends/suggestions'),
  getFriendsInMatch: (matchId) => api.get(`/matches/api/social/matches/${matchId}/friends`),
  sendFriendRequest: (friendId) => api.post('/matches/api/social/friends/request', { friendId }),
  acceptFriendRequest: (friendshipId) => api.post(`/matches/api/social/friends/${friendshipId}/accept`),
  getActivityFeed: (limit = 50) => api.get('/matches/api/social/feed', { params: { limit } }),
  getRecommendations: (limit = 20) => api.get('/matches/api/social/recommendations', { params: { limit } }),
  
  // Analytics Features
  getUserAnalytics: (userId) => api.get(`/matches/api/analytics/user${userId ? `/${userId}` : ''}`),
  getUserPerformance: (userId) => api.get(`/matches/api/analytics/performance${userId ? `/${userId}` : ''}`),
  getMatchStats: (matchId) => api.get(`/matches/api/analytics/match/${matchId}`),
  getLeaderboard: (type = 'points') => api.get('/matches/api/analytics/leaderboard', { params: { type } }),
  getTrendingMatches: () => api.get('/matches/api/analytics/trending'),
  getPlatformStats: () => api.get('/matches/api/analytics/platform'),
};

export const profileService = {
  getOptions: () => api.get('/profile/options'),
  getPlayerProfile: () => api.get('/profile/player'),
  updatePlayerProfile: (data) => api.patch('/profile/player', data),
  getCoachProfile: () => api.get('/profile/coach'),
  updateCoachProfile: (data) => api.patch('/profile/coach', data),
};

export const notificationService = {
  getNotifications: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread/count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const jobService = {
  getJobs: (filters = {}) => api.get('/jobs', { params: filters }),
  getJob: (id) => api.get(`/jobs/${id}`),
  applyToJob: (id, data) => api.post(`/jobs/${id}/apply`, data),
  getMyApplications: () => api.get('/jobs/my-applications'),
  withdrawApplication: (id) => api.delete(`/jobs/applications/${id}/withdraw`),
  
  // Club-specific endpoints
  getJobApplications: (jobId) => api.get(`/jobs/${jobId}/applications`),
  updateApplicationStatus: (applicationId, status, additionalData = {}) => 
    api.put(`/jobs/applications/${applicationId}/status`, { status, ...additionalData }),
  sendMessageToApplicant: (applicationId, message, messageAr) => 
    api.post(`/jobs/applications/${applicationId}/message`, { message, messageAr }),
  downloadResume: (applicationId, attachmentIndex) => 
    api.get(`/jobs/applications/${applicationId}/download/${attachmentIndex}`, { responseType: 'blob' }),
};

export default api;
