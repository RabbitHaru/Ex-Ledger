// 인증 유틸리티
export const getToken = () => localStorage.getItem('access_token');
export const setToken = (token: string) => localStorage.setItem('access_token', token);
export const removeToken = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
};
export const getRefreshToken = () => localStorage.getItem('refresh_token');
export const setRefreshToken = (token: string) => localStorage.setItem('refresh_token', token);
export const isAuthenticated = () => !!getToken();
export const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};
export const logout = (showModal = true) => {
    removeToken();
    if (showModal) {
        window.dispatchEvent(new CustomEvent('mfa-session-expired'));
    } else {
        window.location.href = '/login';
    }
};
