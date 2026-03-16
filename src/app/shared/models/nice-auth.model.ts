export interface NiceAuthResult {
  readonly name: string;
  readonly phone: string;
  readonly birthDate: string;      // YYMMDD (6자리)
  readonly gender: 'M' | 'F';
  readonly genderDigit: string;    // 주민번호 뒷자리 첫째 (1-4)
  readonly ci: string;
  readonly di: string;
  readonly nationalInfo: string;
}

export interface NiceAuthTokenResponse {
  readonly tokenVersionId: string;
  readonly encData: string;
  readonly integrityValue: string;
}

export type NiceAuthStatus = 'idle' | 'pending' | 'success' | 'failed' | 'cancelled';
