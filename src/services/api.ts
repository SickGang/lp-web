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

function isAuthRequest(config: { url?: string } | undefined): boolean {
  const url = config?.url ?? "";
  return url.includes("/auth/");
}

function clearSessionAndNotify(reason: "unauthorized" | "forbidden") {
  if (reason === "forbidden") {
    sessionStorage.setItem("auth-logout-reason", "forbidden");
  } else {
    sessionStorage.removeItem("auth-logout-reason");
  }
  localStorage.removeItem("auth-storage");
  window.dispatchEvent(new Event("lp-auth-session-expired"));
}

// 401/403 — сброс сессии и экран логина (кроме запросов /auth/*)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (
      !isAuthRequest(error.config) &&
      (status === 401 || status === 403)
    ) {
      clearSessionAndNotify(status === 403 ? "forbidden" : "unauthorized");
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
  getEmployees: () => api.get("/admin/employees"),
  createEmployee: (data: { name: string }) => api.post("/admin/employees", data),
  deleteEmployee: (id: number) => api.delete(`/admin/employees/${id}`),
  listClients: (search?: string) =>
    api.get("/admin/clients", { params: search ? { search } : {} }),
  lookupClient: (phone: string) =>
    api.get("/admin/clients/lookup", { params: { phone } }),
  createBooking: (data: {
    userId?: number;
    guestOnly?: boolean;
    phone?: string;
    clientName?: string;
    serviceIds: number[];
    date: string;
    slotStart: string;
    carId?: number;
    carBrand?: string;
    carModel?: string;
    catalogClass?: string;
    notes?: string;
    employeeId?: number | null;
    confirmImmediately?: boolean;
    boxId?: number;
  }) => api.post("/admin/bookings", data),
  getBooking: (id: number) => api.get(`/admin/bookings/${id}`),
  closeBooking: (
    id: number,
    data: {
      additionalItems: Array<{
        serviceId?: number;
        name: string;
        price: number;
      }>;
      finalTotal?: number;
      paidAmount: number;
      paymentStatus:
        | "UNPAID"
        | "PAID_CASH"
        | "PAID_CARD"
        | "PAID_DEPOSIT"
        | "PARTIAL";
      closeNote?: string;
    },
  ) => api.post(`/admin/bookings/${id}/close`, data),
  updateBookingPayment: (
    id: number,
    data: {
      paidAmount: number;
      paymentStatus:
        | "PAID_CASH"
        | "PAID_CARD"
        | "PAID_DEPOSIT"
        | "PARTIAL";
      note?: string;
    },
  ) => api.post(`/admin/bookings/${id}/update-payment`, data),
  getDeposit: (params: { phone?: string; userId?: number } | string) =>
    api.get("/admin/deposits", {
      params:
        typeof params === "string" ? { phone: params } : params,
    }),
  deposit: (data: {
    phone?: string;
    userId?: number;
    amount: number;
    note?: string;
  }) => api.post("/admin/deposits", data),
  adjustDeposit: (data: {
    phone?: string;
    userId?: number;
    delta: number;
    note: string;
  }) => api.post("/admin/deposits/adjust", data),
  getReports: (from: string, to: string) =>
    api.get("/admin/reports", { params: { from, to } }),
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

// Stock / production API (legacy path /chemicals)
export type StockTrackingMode = "PER_CHECK" | "PER_PERIOD";

export const stockAPI = {
  getAll: (trackingMode?: StockTrackingMode) =>
    api.get("/chemicals", {
      params: trackingMode ? { trackingMode } : {},
    }),
  getOne: (id: number) => api.get(`/chemicals/${id}`),
  create: (data: {
    name: string;
    brand?: string;
    category: string;
    unit: string;
    trackingMode?: StockTrackingMode;
    pricePerUnit: number;
    currentStock: number;
    minStock?: number;
    description?: string;
  }) => api.post("/chemicals", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/chemicals/${id}`, data),
  delete: (id: number) => api.delete(`/chemicals/${id}`),
  getLowStock: (trackingMode?: StockTrackingMode) =>
    api.get("/chemicals/low-stock", {
      params: trackingMode ? { trackingMode } : {},
    }),
  getUsageHistory: (params?: {
    chemicalId?: number;
    trackingMode?: StockTrackingMode;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => api.get("/chemicals/usage-history", { params }),
  getUsageStats: (
    startDate: string,
    endDate: string,
    trackingMode?: StockTrackingMode,
  ) =>
    api.get("/chemicals/usage-stats", {
      params: {
        startDate,
        endDate,
        ...(trackingMode ? { trackingMode } : {}),
      },
    }),
  recordUsage: (data: {
    chemicalId: number;
    quantity: number;
    bookingId?: number;
    notes?: string;
    recordedBy: number;
  }) => api.post("/chemicals/record-usage", data),
};

/** @deprecated use stockAPI */
export const chemicalsAPI = stockAPI;

// Bookings API
export const bookingsAPI = {
  getAll: () => api.get("/bookings"),
  getOne: (id: number) => api.get(`/bookings/${id}`),
  create: (data: any) => api.post("/bookings", data),
  updateStatus: (
    id: number,
    status: "pending" | "confirmed" | "completed" | "cancelled",
    employeeId?: number | null,
  ) =>
    api.patch(`/bookings/${id}`, {
      status,
      ...(employeeId === undefined ? {} : { employeeId }),
    }),
  assignEmployee: (id: number, employeeId: number | null) =>
    api.patch(`/bookings/${id}`, { employeeId }),
  cancel: (id: number) => api.patch(`/bookings/${id}/cancel`),
};

// Services API
export const servicesAPI = {
  getAll: (
    includeInactive = true,
    pricing?: {
      carId?: number;
      carBrand?: string;
      carModel?: string;
      catalogClass?: string;
    },
  ) =>
    api.get("/services", {
      params: {
        includeInactive,
        ...(pricing?.carId != null ? { carId: pricing.carId } : {}),
        ...(pricing?.carBrand ? { carBrand: pricing.carBrand } : {}),
        ...(pricing?.carModel ? { carModel: pricing.carModel } : {}),
        ...(pricing?.catalogClass ? { catalogClass: pricing.catalogClass } : {}),
      },
    }),
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
    useClassPricing?: boolean;
    classPrices?: Record<string, number>;
  }) => api.post("/services", data),
  update: (id: number, data: any) => api.patch(`/services/${id}`, data),
  delete: (id: number) => api.delete(`/services/${id}`),
};

export default api;
