export const authFetch = async (url: string, options: RequestInit = {}) => {
  // 3번: 토큰 실어 보내기 (열쇠 장착)
  const token = localStorage.getItem('accessToken'); 
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '', // 토큰이 있으면 헤더에 추가
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  // 4번: 401(토큰만료), 403(권한없음) 에러 처리
  if (response.status === 401) {
    alert("세션이 만료되었습니다. 다시 로그인해주세요.");
    localStorage.removeItem('accessToken');
    window.location.href = '/login'; // 로그인 페이지로 튕기기
    return null;
  }

  if (response.status === 403) {
    alert("해당 메뉴에 대한 접근 권한이 없습니다. (어드민 전용)");
    window.location.href = '/'; // 홈으로 튕기기
    return null;
  }

  return response;
};