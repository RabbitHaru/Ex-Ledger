import { useEffect, useState } from "react";
import axios from "axios";
import SmartExchangeForm from "../../components/transaction/SmartExchangeForm";
import SpendingChart from "../../components/dashboard/SpendingChart";

// 1. 인터페이스 선언
interface DashboardData {
  totalSpentKrw: number;
  pendingCount: number;
  settledCount: number;
  chartData: { date: string; amount: number }[];
}

const MyPage = () => {
  // 2. useState에 타입 입히기
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );

  const fetchDashboard = async () => {
    try {
      const response = await axios.get("/api/v1/transactions/my-dashboard");
      setDashboardData(response.data.data);
    } catch (error) {
      console.error("데이터 로드 실패", error);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // 3. 데이터가 오기 전까지는 로딩 화면을 보여주어 null 참조 에러 방지
  if (!dashboardData)
    return (
      <div className="p-10 text-center text-gray-500">
        데이터를 불러오는 중입니다...
      </div>
    );

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="grid max-w-6xl grid-cols-1 gap-8 mx-auto md:grid-cols-3">
        <div className="md:col-span-1">
          {/* 결제 성공 시 fetchDashboard를 다시 호출하여 화면 갱신 */}
          <SmartExchangeForm onPaymentSuccess={fetchDashboard} />
        </div>

        <div className="space-y-8 md:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
              <p className="text-sm text-gray-500">이번 달 총 지출</p>
              <p className="text-2xl font-bold text-gray-800">
                {dashboardData.totalSpentKrw.toLocaleString()}원
              </p>
            </div>
            <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
              <p className="text-sm text-gray-500">진행 중인 정산</p>
              <p className="text-2xl font-bold text-blue-600">
                {dashboardData.pendingCount}건
              </p>
            </div>
          </div>

          <SpendingChart data={dashboardData.chartData} />
        </div>
      </div>
    </div>
  );
};

export default MyPage;
