// api.js — Frontend API client
// const BASE = 'http://localhost:4000/api';
const BASE = 'https://inventory-planner-api.onrender.com/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  getSession: () => request('/session'),

  clearSession: () => request('/session', { method: 'DELETE' }),

  uploadFile: (file, config = {}) => {
    const form = new FormData();
    form.append('file', file);
    form.append('capacityMode', config.capacityMode || 'manufacturing');
    form.append('allocationStrategy', config.allocationStrategy || 'strict_priority');
    if (config.productPriority) {
      form.append('productPriority', JSON.stringify(config.productPriority));
    }
    return request('/upload', { method: 'POST', body: form });
  },

  recalculate: (config = {}) =>
    request('/recalculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }),

  getResults: () => request('/results'),

  getValidation: () => request('/validation'),
};
