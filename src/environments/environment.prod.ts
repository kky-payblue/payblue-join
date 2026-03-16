export const environment = {
  production: true,
  // 실운영 시 백엔드 프록시를 사용하므로 키 불필요 (백엔드에서 관리)
  ntsApiKey: '',
  niceAuth: {
    useMock: false,
    requestTokenUrl: '/api/v1/nice/token',
    resultUrl: '/api/v1/nice/result',
    popupUrl: 'https://nice.checkplus.co.kr/CheckPlusSa498',
  },
};
