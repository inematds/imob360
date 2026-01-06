import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (data: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    cnpj: string;
    creci: string;
    phone: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
};

// Properties API
export const propertiesApi = {
  list: async (params?: Record<string, any>) => {
    const response = await api.get('/properties', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/properties', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/properties/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/properties/${id}`);
    return response.data;
  },
  searchByMap: async (bounds: { north: number; south: number; east: number; west: number }) => {
    const response = await api.post('/properties/search/map', bounds);
    return response.data;
  },
};

// Leads API
export const leadsApi = {
  list: async (params?: Record<string, any>) => {
    const response = await api.get('/leads', { params });
    return response.data;
  },
  kanban: async () => {
    const response = await api.get('/leads/kanban');
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/leads', data);
    return response.data;
  },
  updateStage: async (id: string, stage: string, extra?: any) => {
    const response = await api.patch(`/leads/${id}/stage`, { stage, ...extra });
    return response.data;
  },
  assign: async (id: string, assignedToId: string) => {
    const response = await api.patch(`/leads/${id}/assign`, { assignedToId });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },
};

// Visits API
export const visitsApi = {
  list: async (params?: Record<string, any>) => {
    const response = await api.get('/visits', { params });
    return response.data;
  },
  calendar: async (start: string, end: string, brokerId?: string) => {
    const response = await api.get('/visits/calendar', { params: { start, end, brokerId } });
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/visits/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/visits', data);
    return response.data;
  },
  updateStatus: async (id: string, data: any) => {
    const response = await api.patch(`/visits/${id}/status`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/visits/${id}`);
    return response.data;
  },
};

// Contracts API
export const contractsApi = {
  list: async (params?: Record<string, any>) => {
    const response = await api.get('/contracts', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/contracts/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/contracts', data);
    return response.data;
  },
  activate: async (id: string) => {
    const response = await api.post(`/contracts/${id}/activate`);
    return response.data;
  },
  sign: async (id: string) => {
    const response = await api.post(`/contracts/${id}/sign`);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/contracts/${id}`);
    return response.data;
  },
};

// People API
export const peopleApi = {
  list: async (params?: Record<string, any>) => {
    const response = await api.get('/people', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/people/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/people', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/people/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/people/${id}`);
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  stats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
  activity: async () => {
    const response = await api.get('/dashboard/activity');
    return response.data;
  },
  charts: async (period?: number) => {
    const response = await api.get('/dashboard/charts', { params: { period } });
    return response.data;
  },
};

// Features API
export const featuresApi = {
  list: async () => {
    const response = await api.get('/features');
    return response.data;
  },
  status: async () => {
    const response = await api.get('/features/status');
    return response.data;
  },
  enable: async (featureId: string, config?: any) => {
    const response = await api.post(`/features/${featureId}/enable`, { config });
    return response.data;
  },
  disable: async (featureId: string) => {
    const response = await api.post(`/features/${featureId}/disable`);
    return response.data;
  },
  updateConfig: async (featureId: string, config: any) => {
    const response = await api.patch(`/features/${featureId}/config`, { config });
    return response.data;
  },
};

// Settings API
export const settingsApi = {
  get: async () => {
    const response = await api.get('/settings');
    return response.data;
  },
  updateCompany: async (data: any) => {
    const response = await api.put('/settings/company', data);
    return response.data;
  },
  updatePreferences: async (settings: any) => {
    const response = await api.patch('/settings/preferences', { settings });
    return response.data;
  },
  getTeam: async () => {
    const response = await api.get('/settings/team');
    return response.data;
  },
  inviteUser: async (data: any) => {
    const response = await api.post('/settings/team/invite', data);
    return response.data;
  },
  getIntegrations: async () => {
    const response = await api.get('/settings/integrations');
    return response.data;
  },
  getBilling: async () => {
    const response = await api.get('/settings/billing');
    return response.data;
  },
};

// Payments API
export const paymentsApi = {
  listRent: async (params?: Record<string, any>) => {
    const response = await api.get('/payments/rent', { params });
    return response.data;
  },
  registerPayment: async (id: string, data: any) => {
    const response = await api.post(`/payments/rent/${id}/pay`, data);
    return response.data;
  },
  generateBoleto: async (id: string) => {
    const response = await api.post(`/payments/rent/${id}/boleto`);
    return response.data;
  },
  generatePix: async (id: string) => {
    const response = await api.post(`/payments/rent/${id}/pix`);
    return response.data;
  },
  getSummary: async (month?: number, year?: number) => {
    const response = await api.get('/payments/summary', { params: { month, year } });
    return response.data;
  },
  getOverdue: async () => {
    const response = await api.get('/payments/overdue');
    return response.data;
  },
};

export default api;
