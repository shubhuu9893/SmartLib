import axios from 'axios';
import { auth } from '../firebase/config';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'unknown', cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.cause = cause;
  }
}

const client = axios.create({ baseURL: API_BASE_URL, timeout: 45000 });

client.interceptors.request.use(async (config) => {
  const user = auth?.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function messageFor(status, detail) {
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find what you were looking for.";
    case 502:
    case 503:
    case 504:
      return 'The service is temporarily unavailable. Please try again.';
    default:
      return status >= 500 ? 'Something went wrong on our side.' : 'Request failed.';
  }
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const { config, response } = error;

    if (response?.status === 401 && config && !config._retried && auth?.currentUser) {
      config._retried = true;
      try {
        const token = await auth.currentUser.getIdToken(true);
        config.headers.Authorization = `Bearer ${token}`;
        return client(config);
      } catch {
        /* fall through to unauthorized handling */
      }
    }

    if (response?.status === 401) {
      window.dispatchEvent(new CustomEvent('smartlib:unauthorized'));
    }

    if (!response) {
      return Promise.reject(
        new ApiError("Can't reach the SmartLib server. Check your connection or try again shortly.", {
          code: 'network',
          cause: error,
        }),
      );
    }

    return Promise.reject(
      new ApiError(messageFor(response.status, response.data?.detail), {
        status: response.status,
        code: `http_${response.status}`,
        cause: error,
      }),
    );
  },
);

const cache = new Map();
const inflight = new Map();

export async function cachedGet(url, { params, ttl = 5 * 60 * 1000, signal } = {}) {
  const key = `${url}?${new URLSearchParams(params || {}).toString()}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  if (inflight.has(key)) return inflight.get(key);

  const request = client
    .get(url, { params, signal })
    .then((res) => {
      cache.set(key, { data: res.data, expires: Date.now() + ttl });
      return res.data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

export function clearCache(prefix = '') {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function isAbort(error) {
  return axios.isCancel(error) || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
}

export default client;
