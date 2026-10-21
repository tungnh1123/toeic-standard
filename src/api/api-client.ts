import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

export interface ApiEnvelope<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface RefreshTokenResponseData {
  accessToken: string;
  refreshToken: string;
}

export interface TokenStorageAdapter {
  getAccessToken: () => Promise<string | null> | string | null;
  getRefreshToken: () => Promise<string | null> | string | null;
  setTokens: (
    accessToken: string,
    refreshToken: string,
  ) => Promise<void> | void;
  clearTokens: () => Promise<void> | void;
  onAuthFailureRedirect: () => void;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _hasRetried?: boolean;
}

interface QueuedRequestPromise {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

const defaultBrowserTokenStorage: TokenStorageAdapter = {
  getAccessToken: (): string | null =>
    typeof window !== 'undefined' ? window.localStorage.getItem('access_token') : null,
  getRefreshToken: (): string | null =>
    typeof window !== 'undefined' ? window.localStorage.getItem('refresh_token') : null,
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('access_token', accessToken);
      window.localStorage.setItem('refresh_token', refreshToken);
    }
  },
  clearTokens: (): void => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('access_token');
      window.localStorage.removeItem('refresh_token');
    }
  },
  onAuthFailureRedirect: (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
};

let activeStorageAdapter: TokenStorageAdapter = defaultBrowserTokenStorage;

export function configureTokenStorage(adapter: TokenStorageAdapter): void {
  activeStorageAdapter = adapter;
}

const API_BASE_URL: string =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: QueuedRequestPromise[] = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((queued: QueuedRequestPromise): void => {
    if (error) {
      queued.reject(error);
    } else if (token) {
      queued.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const token = await activeStorageAdapter.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
);

apiClient.interceptors.response.use(
  <T>(response: AxiosResponse<ApiEnvelope<T>>): T => {
    const body = response.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return body.data;
    }
    return body as unknown as T;
  },
  async (error: AxiosError): Promise<unknown> => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._hasRetried &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      if (isRefreshing) {
        return new Promise<unknown>(
          (
            resolve: (value: unknown) => void,
            reject: (reason?: unknown) => void,
          ): void => {
            failedQueue.push({
              resolve: (newToken: string): void => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                resolve(apiClient(originalRequest));
              },
              reject: (err: unknown): void => {
                reject(err);
              },
            });
          },
        );
      }

      originalRequest._hasRetried = true;
      isRefreshing = true;

      try {
        const currentRefreshToken =
          await activeStorageAdapter.getRefreshToken();
        if (!currentRefreshToken) {
          throw new Error('Missing refresh token for rotation');
        }

        const refreshResponse = await axios.post<
          ApiEnvelope<RefreshTokenResponseData>
        >(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken: currentRefreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } =
          refreshResponse.data.data;

        await activeStorageAdapter.setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return await apiClient(originalRequest);
      } catch (refreshError: unknown) {
        processQueue(refreshError, null);
        await activeStorageAdapter.clearTokens();
        activeStorageAdapter.onAuthFailureRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data ?? error);
  },
);

