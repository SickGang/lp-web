import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth-storage");
  if (token) {
    try {
      const { state } = JSON.parse(token);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch (error) {
      console.error("Failed to parse token:", error);
    }
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (phone: string, password: string) =>
    api.post("/auth/login-password", { phone, password }),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get("/admin/dashboard-stats"),
  getUpcomingBookings: (limit?: number) =>
    api.get("/admin/upcoming-bookings", { params: { limit } }),
  getBookingsByDate: (date: string) =>
    api.get("/admin/bookings-by-date", { params: { date } }),
};

// Users API
export const usersAPI = {
  getAll: (role?: string) => api.get("/users", { params: { role } }),
  getOne: (id: number) => api.get(`/users/${id}`),
  updateRole: (id: number, role: string) =>
    api.patch(`/users/${id}/role`, { role }),
  delete: (id: number) => api.delete(`/users/${id}`),
  getStats: () => api.get("/users/stats"),
};

// Chemicals API
export const chemicalsAPI = {
  getAll: () => api.get("/chemicals"),
  getOne: (id: number) => api.get(`/chemicals/${id}`),
  create: (data: any) => api.post("/chemicals", data),
  update: (id: number, data: any) => api.put(`/chemicals/${id}`, data),
  delete: (id: number) => api.delete(`/chemicals/${id}`),
  getLowStock: () => api.get("/chemicals/low-stock"),
  getUsageHistory: (params?: {
    chemicalId?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => api.get("/chemicals/usage-history", { params }),
  getUsageStats: (startDate: string, endDate: string) =>
    api.get("/chemicals/usage-stats", { params: { startDate, endDate } }),
  recordUsage: (data: {
    chemicalId: number;
    quantity: number;
    bookingId?: number;
    notes?: string;
    recordedBy: number;
  }) => api.post("/chemicals/record-usage", data),
};

// Bookings API
export const bookingsAPI = {
  getAll: () => api.get("/bookings"),
  getOne: (id: number) => api.get(`/bookings/${id}`),
  create: (data: any) => api.post("/bookings", data),
  cancel: (id: number) => api.patch(`/bookings/${id}/cancel`),
};

export default api;
