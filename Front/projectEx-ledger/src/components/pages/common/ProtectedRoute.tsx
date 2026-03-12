import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { isAuthenticated, parseJwt, getToken } from '../../../config/auth';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}



/**
 * 인증/권한 기반 라우트 보호 컴포넌트
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const location = useLocation();
    const token = getToken();
    const isAuth = isAuthenticated();

    if (!isAuth) {
        if (sessionStorage.getItem('logout_notice')) {
            return <Navigate to="/" replace />;
        }
        return <Navigate to="/login-required" state={{ from: location }} replace />;
    }

    if (token) {
        const payload = parseJwt(token);
        const authorities: string = payload?.auth || '';
        const userRoles = authorities.split(',');
        const isApproved: boolean = payload?.isApproved ?? true;

        if (allowedRoles && allowedRoles.length > 0) {
            const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
            if (!hasRequiredRole) {
                return <Navigate to="/unauthorized" replace />;
            }
        }

        // 정산 및 외환 거래 등 핵심 금융 기능이 필요한 경로들
        const financialPaths = [
            '/seller', 
            '/settlement', 
            '/wallet', 
            '/corporate', 
            '/remittance', 
            '/exchange', 
            '/list',
            '/admin/company/pending'
        ];
        
        const isRestrictedPath = financialPaths.some(path => location.pathname.startsWith(path));
        const isMyPage = location.pathname.startsWith('/mypage');
        
        // 기업 계정이면서 아직 승인되지 않은 경우, 핵심 금융 기능에 대해서만 정지 화면으로 보냄
        if (!isApproved && !userRoles.includes('ROLE_INTEGRATED_ADMIN') && isRestrictedPath && !isMyPage) {
             return <Navigate to="/pending-approval" replace />;
        }
    }

    // 자식 라우트 컴포넌트를 렌더링하기 위해 Outlet을 사용합니다.
    return <Outlet />;
};
