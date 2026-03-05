export interface ExchangeRate {
  curUnit: string; // 통화 코드
  curNm: string; // 통화명
  rate: number; // 현재 환율
  updatedAt: string; // 업데이트 시간

  // 🌟 추가된 속성들
  provider: string; // 데이터 제공처
  changeAmount: number; // 전일 대비 등락폭
  changeRate: number; // 전일 대비 등락률
}
