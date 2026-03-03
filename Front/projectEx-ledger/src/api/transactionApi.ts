import axios from "axios";

// API 호출 기본 설정 (B님의 토큰이 있다면 헤더에 추가하는 로직이 들어갈 곳)
const api = axios.create({
  baseURL: "", // 필요시 베이스 URL 설정
});

export const transactionApi = {
  // A님의 실시간 환율 가져오기
  getLatestRates: () => api.get("/api/v1/exchange/latest"),

  // C님의 새 거래 생성하기
  createTransaction: (data: any) => api.post("/api/v1/transactions", data),

  // C님의 대시보드 요약 정보 가져오기
  getDashboard: () => api.get("/api/v1/transactions/my-dashboard"),
};
