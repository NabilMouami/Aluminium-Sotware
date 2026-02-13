// services/reportsService.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_BASE });

const buildParams = (filters = {}) => {
  const params = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.granularity) params.granularity = filters.granularity;
  if (filters.limit) params.limit = filters.limit;
  return params;
};

export const reportsService = {
  getDashboard: (f) =>
    api.get("/reports/dashboard", { params: buildParams(f) }),
  getRevenueOverTime: (f) =>
    api.get("/reports/revenue-over-time", { params: buildParams(f) }),
  getPaymentStatus: (f) =>
    api.get("/reports/payment-status", { params: buildParams(f) }),
  getClientStats: (f) =>
    api.get("/reports/clients", { params: buildParams(f) }),
  getProductStats: (f) =>
    api.get("/reports/products", { params: buildParams(f) }),
  getComparison: (f) =>
    api.get("/reports/comparison", { params: buildParams(f) }),
  getTVA: (f) => api.get("/reports/tva", { params: buildParams(f) }),
  getBLConversion: (f) =>
    api.get("/reports/bl-conversion", { params: buildParams(f) }),
};
