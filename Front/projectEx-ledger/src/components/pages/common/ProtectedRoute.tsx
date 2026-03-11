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
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (token) {
        const payload = parseJwt(token);
        const authorities: string = payload?.auth || '';
        const userRoles = authorities.split(',');
        const isApproved: boolean = payload?.isApproved ?? true;

        if (allowedRoles && allowedRoles.length > 0) {
            const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
            if (!hasRequiredRole) {
                return <Navigate to="/" replace />;
            }
        }

        // 기업 관련 기능이면서 아직 승인되지 않은 경우
        const isCorporateFunction = allowedRoles?.some(r => r.includes('COMPANY'));
        if (isCorporateFunction && !isApproved && !userRoles.includes('ROLE_INTEGRATED_ADMIN')) {
            // 여기서는 페이지 내부에서 '승인 대기' UI를 띄워주는 것이 UX상 좋으므로 통과 시키고,
            // 실제 데이터 처리(POST 등) 시 백엔드에서 막아줌. 
            // 만약 접근 자체를 막고 싶다면 아래처럼 리다이렉트 가능:
            // return <Navigate to="/pending" replace />;
        }
    }

    // 자식 라우트 컴포넌트를 렌더링하기 위해 Outlet을 사용합니다.
    return <Outlet />;
};
