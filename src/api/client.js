/**
 * api/client.js
 * ─────────────────────────────────────────────────────────────
 * Satu-satunya file yang boleh menghubungi backend dari frontend.
 * Frontend TIDAK boleh koneksi langsung ke Supabase.
 * Semua request harus melalui helper ini.
 * ─────────────────────────────────────────────────────────────
 */

function getBaseUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  // Dynamic local IP detection (otomatis mendeteksi IP saat pindah WiFi)
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:8000`;
}

export const BASE_URL = getBaseUrl();

function getToken() {
  return localStorage.getItem('auth_token') || '';
}

function buildHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420', // Bypass Ngrok warning page
    ...extra
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * GET request ke backend.
 * @param {string} path - path endpoint, contoh: '/api/cameras'
 * @returns {Promise<any>} JSON response dari backend
 */
export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

/**
 * POST request ke backend.
 * @param {string} path - path endpoint
 * @param {object} body - body JSON yang akan dikirim
 */
export async function apiPost(path, body = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

/**
 * PUT request ke backend.
 * @param {string} path - path endpoint
 * @param {object} body - body JSON yang akan dikirim
 */
export async function apiPut(path, body = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

/**
 * DELETE request ke backend.
 * @param {string} path - path endpoint
 */
export async function apiDelete(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

/**
 * Helper untuk mendapatkan URL stream MJPEG per kamera.
 * @param {string} cameraId - camera_id, atau kosong untuk kamera pertama
 * Dipakai langsung di <img src={getMjpegUrl('cam_01')} />
 */
export function getMjpegUrl(cameraId) {
  if (cameraId) return `${BASE_URL}/api/stream/${cameraId}`;
  return `${BASE_URL}/api/stream`;
}

/**
 * Helper untuk mendapatkan URL WebSocket backend.
 * Single WebSocket channel untuk semua kamera (setiap message punya camera_id).
 */
export function getWebSocketUrl() {
  const wsBase = BASE_URL.replace(/^http/, 'ws');
  return `${wsBase}/ws`;
}
