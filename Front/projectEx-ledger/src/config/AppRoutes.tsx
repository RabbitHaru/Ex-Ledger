import { Routes, Route } from "react-router-dom";
import CommonLayout from "../components/layout/CommonLayout";
import AuthLayout from "../components/layout/AuthLayout";
import NotFound from "../pages/error/NotFound";
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
import ExchangeDashboard from "../components/pages/remittance/ExchangeDashboard";
import ReconciliationDetail from "../pages/integratedadmin/ReconciliationDetail";
import ClientManagement from "../pages/integratedadmin/ClientManagement";
import MySettlementList from "../components/pages/settlement/MySettlementList";
import RemittanceManagement from "../pages/integratedadmin/RemittanceManagement";
import TransactionHistory from "../components/dashboard/TransactionHistory";
import RemittanceTracking from "../components/pages/remittance/Tracking/RemittanceTracking";
import ExchangePage from "../components/widgets/finance/ExchangePage";
import SettlementDashboard from "../components/pages/settlement/SettlementDashboard";
import MyPage from "../components/pages/user/MyPage";

// Company
import CompanyJoin from "../pages/company/CompanyJoin";
import CompanyMemberManagement from "../pages/company/PendingUsers";
import CompanyReview from "../pages/integratedadmin/CompanyReview";
import SellerDashboard from "../components/widgets/finance/SellerDashboard";
import WalletOverview from "../components/pages/wallet/WalletOverview";
import PersonalHistory from "../components/pages/history/PersonalHistory";
import CorporateWallet from "../components/pages/wallet/CorporateWallet";

// Resource Pages
import { TermsPage, PrivacyPage, NoticePage, OperationPolicyPage } from "../components/pages/resources/ResourcePages";
import AdminBroadcast from "../components/pages/admin/AdminBroadcast";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<CommonLayout />}>
        {/* 1. 누구나 접근 가능한 기본 라우트 (비로그인 허용) */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/exchange" element={<ExchangePage />} />
        <Route path="/finance" element={<LandingPage />} />
        <Route path="/pages/remittance/Tracking" element={<RemittanceTracking />} />

        {/* 리소스/정보 페이지 */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/policy" element={<OperationPolicyPage />} />

        {/* 2. 인증 불필요 라우트 (로그인/회원가입 등) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/mfa" element={<MFASetup />} />
        </Route>

        {/* 3. 보안/인증 필요 라우트 영역 */}
        <Route element={<ProtectedRoute />}>
          {/* ----- 일반 로그인 사용자 공통 (User, Company User, Company Admin) ----- */}
          <Route element={<ProtectedRoute allowedRoles={["ROLE_USER", "USER", "ROLE_COMPANY_USER", "COMPANY_USER", "ROLE_COMPANY_ADMIN", "COMPANY_ADMIN"]} />}>
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/company/join" element={<CompanyJoin />} />
            <Route path="/list" element={<MySettlementList />} />
            <Route path="/settlement" element={<SettlementDashboard />} />
            <Route path="/mypage" element={<MyPage />} />
              <Route path="/wallet/overview" element={<WalletOverview />} />
              <Route path="/seller/history" element={<PersonalHistory />} />

            <Route path="/wallet/overview" element={<WalletOverview />} />
            <Route path="/seller/history" element={<PersonalHistory />} />
            <Route path="/corporate/wallet" element={<CorporateWallet />} />
          </Route>

          {/* ----- 기업 관리자(Company Admin) 전용 라우트 ----- */}
          <Route element={<ProtectedRoute allowedRoles={["ROLE_COMPANY_ADMIN", "COMPANY_ADMIN"]} />}>
            <Route path="/admin/company/pending" element={<CompanyMemberManagement />} />
              <Route path="/corporate/wallet" element={<CorporateWallet />} />
          </Route>

          {/* ----- 최고 관리자(Integrated Admin) 전용 라우트 ----- */}
          <Route element={<ProtectedRoute allowedRoles={["ROLE_INTEGRATED_ADMIN", "INTEGRATED_ADMIN"]} />}>
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/list" element={<ReconciliationList />} />
            <Route path="/admin/settlement/:id" element={<ReconciliationDetail />} />
            <Route path="/client" element={<ClientManagement />} />
            <Route path="/admin/logs" element={<AdminLogList />} />
            <Route path="/admin/health" element={<SystemHealth />} />
            <Route path="/admin/companies/review" element={<CompanyReview />} />
            <Route path="/admin/license-approval" element={<CompanyReview />} />
            <Route path="/remittance" element={<RemittanceManagement />} />
            <Route path="/admin/broadcast" element={<AdminBroadcast />} />
        </Route>
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
  );
};

export default AppRoutes;
