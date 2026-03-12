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
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('JWT Parse Error:', e);
        return null;
    }
};
export const logout = (showModal = true) => {
    removeToken();
    if (showModal) {
        window.dispatchEvent(new CustomEvent('mfa-session-expired'));
    } else {
        sessionStorage.setItem('logout_notice', '1');
        window.location.href = '/';
    }
};

export const hasRole = (role: string) => {
    const token = getToken();
    if (!token) return false;
    const payload = parseJwt(token);
    if (!payload?.auth) return false;
    const roles: string[] = payload.auth.split(',');
    return roles.includes(role);
};
