import axios from 'axios';
import { getToken, removeToken, getRefreshToken, setToken, setRefreshToken, logout } from './auth';

const http = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

http.interceptors.request.use((config) => {
    const token = getToken();
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

http.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // MFA 세션 만료 에러 처리
        if (error.response?.data?.message?.includes("MFA_SESSION_EXPIRED")) {
            logout();
            return Promise.reject(error);
        }

        // MFA 미설정 에러 처리 (금융 작업 접근 시)
        if (error.response?.data?.message?.includes("MFA_SETUP_REQUIRED")) {
            window.location.href = '/auth/mfa';
            return Promise.reject(error);
        }

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return http(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const rt = getRefreshToken();
            if (!rt) {
                removeToken();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Must not use 'http' instance here to avoid infinite loops
                const { data } = await axios.post(`${http.defaults.baseURL}/auth/refresh`, { refreshToken: rt });

                if (data && data.data) {
                    const { accessToken, refreshToken } = data.data;
                    setToken(accessToken);
                    if (refreshToken) setRefreshToken(refreshToken);

                    http.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
                    originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;

                    processQueue(null, accessToken);
                    return http(originalRequest);
                }
            } catch (err) {
                processQueue(err, null);
                removeToken();
                window.location.href = '/login';
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default http;
