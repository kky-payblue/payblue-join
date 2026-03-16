export const environment = {
  production: false,
  // 공공데이터포털 > 마이페이지 > 오픈API > 일반 인증키(Encoding) 값을 넣어주세요
  ntsApiKey: 'e2e70db0c94520d4837e63528cbd0f9c6ee7d75db09a0a8dcb1763ff089a334c',
  niceAuth: {
    useMock: true,
    requestTokenUrl: '/api/nice/token',
    resultUrl: '/api/nice/result',
    popupUrl: 'https://nice.checkplus.co.kr/CheckPlusSa498',
  },
};
