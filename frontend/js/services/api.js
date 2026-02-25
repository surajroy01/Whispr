/**
 * API Service
 * Handles all HTTP requests to the backend
 */

const API_BASE = "https://whispr-8aln.onrender.com";

const getToken = () => localStorage.getItem('token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` })
});

const handleResponse = async (resPromise) => {
  const res = await resPromise;   // 🔥 THIS LINE FIXES EVERYTHING

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.message || 'Request failed');

  return data;
};
// Auth
export const authAPI = {
  register: (username, email, password) =>
    fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ username, email, password })
    }).then(handleResponse),

  login: (email, password) =>
    fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password })
    }).then(handleResponse),

  changePassword: (currentPassword, newPassword) =>
    fetch(`${API_BASE}/api/auth/change-password`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ currentPassword, newPassword })
    }).then(handleResponse),

  forgotPassword: (email) =>
    fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email })
    }).then(handleResponse),

  resetPassword: (token, email, newPassword) =>
    fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ token, email, newPassword })
    }).then(handleResponse)
};

// Users
export const userAPI = {
  getProfile: () =>
    fetch(`${API_BASE}/api/users/me`, { headers: headers() }).then(handleResponse),

  updateProfile: (data) => {
    const formData = new FormData();
    if (data.username) formData.append('username', data.username);
    if (data.bio !== undefined) formData.append('bio', data.bio);
    if (data.profilePicture) formData.append('profilePicture', data.profilePicture);
    return fetch(`${API_BASE}/api/users/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData
    }).then(handleResponse);
  },

  search: (q) =>
    fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(q)}`, {
      headers: headers()
    }).then(handleResponse),

  getById: (id) =>
    fetch(`${API_BASE}/api/users/${id}`, { headers: headers() }).then(handleResponse)
};

// Friends
export const friendAPI = {
  getFriends: () =>
    fetch(`${API_BASE}/api/friends`, { headers: headers() }).then(handleResponse),

  getRequests: () =>
    fetch(`${API_BASE}/api/friends/requests`, { headers: headers() }).then(handleResponse),

  sendRequest: (recipientId) =>
    fetch(`${API_BASE}/api/friends/request`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ recipientId })
    }).then(handleResponse),

  acceptRequest: (id) =>
    fetch(`${API_BASE}/api/friends/${id}/accept`, {
      method: 'PUT',
      headers: headers()
    }).then(handleResponse),

  declineRequest: (id) =>
    fetch(`${API_BASE}/api/friends/${id}/decline`, {
      method: 'PUT',
      headers: headers()
    }).then(handleResponse),

   blockUser: async (userId) => {
  const token = localStorage.getItem('token');

  return handleResponse(
    fetch(`${API_BASE}/api/friends/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ userIdToBlock: userId })
    })
  );
},

unblockUser: async (userId) => {
  const token = localStorage.getItem('token');

  return handleResponse(
    fetch(`${API_BASE}/api/friends/unblock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ userIdToUnblock: userId })
    })
  );
},
};

// Messages
export const messageAPI = {
  getMessages: (userId) =>
    fetch(`${API_BASE}/api/messages/${userId}`, { headers: headers() }).then(handleResponse)
};

// Groups
export const groupAPI = {
  getGroups: () =>
    fetch(`${API_BASE}/api/groups`, { headers: headers() }).then(handleResponse),

  getGroup: (id) =>
    fetch(`${API_BASE}/api/groups/${id}`, { headers: headers() }).then(handleResponse),

  createGroup: (name, description, memberIds) =>
    fetch(`${API_BASE}/api/groups`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name, description, memberIds: memberIds || [] })
    }).then(handleResponse),

  getMessages: (groupId) =>
    fetch(`${API_BASE}/api/groups/${groupId}/messages`, {
      headers: headers()
    }).then(handleResponse)
};

// GIPHY
export const giphyAPI = {
  search: (q, limit = 10) =>
    fetch(`${API_BASE}/api/giphy/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
      headers: headers()
    }).then(handleResponse)
};
