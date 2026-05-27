import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor для добавления токена ко всем запросам
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("auth-storage");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // Zustand persist: { state: { token, user, ... }, version?: number }
      const token = parsed?.state?.token ?? parsed?.token;
      if (token && typeof token === "string") {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Failed to parse auth storage:", error);
    }
  }
  return config;
});

// При 403 (Forbidden) — недостаточно прав: выходим и перенаправляем на логин
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      localStorage.removeItem("auth-storage");
      const loginPath = window.location.pathname.includes("/login") ? "" : "/login";
      if (loginPath) {
        window.location.href = loginPath + "?reason=forbidden";
      }
    }
    return Promise.reject(error);
  }
);

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
  lookupClient: (phone: string) =>
    api.get("/admin/clients/lookup", { params: { phone } }),
  createBooking: (data: {
    phone: string;
    clientName?: string;
    serviceIds: number[];
    date: string;
    slotStart: string;
    carId?: number;
    carBrand?: string;
    carModel?: string;
    notes?: string;
    confirmImmediately?: boolean;
  }) => api.post("/admin/bookings", data),
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
  updateStatus: (id: number, status: "pending" | "confirmed" | "completed" | "cancelled") =>
    api.patch(`/bookings/${id}`, { status }),
  cancel: (id: number) => api.patch(`/bookings/${id}/cancel`),
};

// Services API
export const servicesAPI = {
  getAll: (includeInactive = true) =>
    api.get("/services", { params: { includeInactive } }),
  getCategories: () => api.get("/services/categories"),
  createCategory: (name: string) => api.post("/services/categories", { name }),
  deleteCategory: (id: number) => api.delete(`/services/categories/${id}`),
  create: (data: {
    name: string;
    description?: string;
    price: number;
    duration: number;
    category: string;
    isActive?: boolean;
  }) => api.post("/services", data),
  update: (id: number, data: any) => api.patch(`/services/${id}`, data),
  delete: (id: number) => api.delete(`/services/${id}`),
};

export default api;
