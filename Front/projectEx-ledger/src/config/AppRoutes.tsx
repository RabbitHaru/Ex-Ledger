import { Routes, Route } from "react-router-dom";
import RootLayout from "../components/layout/RootLayout";
import AuthLayout from "../components/layout/AuthLayout";
import { ProtectedRoute } from "../components/pages/common/ProtectedRoute";

// Common Pages
import LandingPage from "../components/pages/common/LandingPage";

// Auth Pages
import LoginPage from "../components/pages/auth/LoginPage";
import SignupPage from "../components/pages/auth/SignupPage";
import MFASetup from "../components/pages/auth/MFASetup";

// Admin System Pages
import AdminLogList from "../components/pages/admin/system/AdminLogList";
import SystemHealth from "../components/pages/admin/system/SystemHealth";
import AdminDashboard from "../pages/integratedadmin/AdminDashboard";
import ReconciliationList from "../pages/integratedadmin/ReconciliationList";
import SellerDashboard from "../components/pages/remittance/SellerDashboard";
import ReconciliationDetail from '../pages/integratedadmin/ReconciliationDetail';
import ClientManagement from "../pages/integratedadmin/ClientManagement";
import MySettlementList from "../components/pages/settlement/MySettlementList";
import RemittanceManagement from "../pages/integratedadmin/RemittanceManagement";

const AppRoutes = () => {
    return (
        <Routes>
            {/* 누구나 접근 가능한 기본 렌딩 페이지 */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/list" element={<ReconciliationList />} />
         <Route path="/admin/settlement/:id" element={<ReconciliationDetail />} />
         <Route path="/pages/admin/settlement" element={<ReconciliationList />} />
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/client" element={<ClientManagement />} />
            <Route path="/list" element={<MySettlementList />} />
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
             <Route path="/remittance" element={<RemittanceManagement/>} />
      {/* 인증 불필요 라우트 */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/mfa" element={<MFASetup />} />
      </Route>

      {/* 보안/인증 필요 라우트 */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RootLayout />}>
          {/* 일반 로그인 사용자 접근 가능 (User, Company Admin, Integrated Admin) */}

          <Route
            path="/settlement"
            element={<div className="p-4">Settlement</div>}
          />

          {/* 관리자(Admin) 전용 라우트 */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["ROLE_COMPANY_ADMIN", "ROLE_INTEGRATED_ADMIN"]}
              />
            }
          >
            <Route path="/admin/logs" element={<AdminLogList />} />
            <Route path="/admin/health" element={<SystemHealth />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRoutes;
