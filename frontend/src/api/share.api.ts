import axios from 'axios';
import api from './axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// A bare client with no interceptors: a share-link visitor has no tokens, so the
// authenticated instance would try to refresh and bounce them to /login.
const publicApi = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export function getShareLink(projectId: string) {
  return api.get(`/projects/${projectId}/share`);
}

export function createShareLink(projectId: string, data?: { expiresInDays?: number | null }) {
  return api.post(`/projects/${projectId}/share`, data ?? {});
}

export function revokeShareLink(projectId: string) {
  return api.delete(`/projects/${projectId}/share`);
}

export function getPublicBoard(token: string) {
  return publicApi.get(`/public/boards/${token}`);
}
