import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, map, switchMap, catchError, delay } from 'rxjs';
import { BusinessVerification } from '../models/signup.model';
import { environment } from '../../../environments/environment';

// ──────────────────────────────────────────────
// 국세청 API 응답 타입
// ──────────────────────────────────────────────

/** 상태조회 API 응답 (/status) */
interface NtsStatusResponse {
  match_cnt: number;
  request_cnt: number;
  status_code: string;
  data: NtsStatusItem[];
}

interface NtsStatusItem {
  b_no: string;
  b_stt: string;            // "계속사업자" | "휴업자" | "폐업자"
  b_stt_cd: '01' | '02' | '03';
  tax_type: string;
  tax_type_cd: string;
  end_dt: string;
  utcc_yn: string;
  tax_type_change_dt: string;
  invoice_apply_dt: string;
  rbf_tax_type: string;
  rbf_tax_type_cd: string;
}

/** 진위확인 API 응답 (/validate) */
interface NtsValidateResponse {
  status_code: string;
  request_cnt: number;
  valid_cnt: number;
  data: NtsValidateItem[];
}

interface NtsValidateItem {
  b_no: string;
  valid: string;            // "01" = 일치, "02" = 불일치
  valid_msg: string;
  request_param: {
    b_no: string;
    start_dt: string;
    p_nm: string;
    p_nm2: string;
    b_nm: string;
    corp_no: string;
    b_sector: string;
    b_type: string;
    b_adr: string;
  };
  status: {
    b_no: string;
    b_stt: string;
    b_stt_cd: string;
    tax_type: string;
    tax_type_cd: string;
    end_dt: string;
    utcc_yn: string;
    tax_type_change_dt: string;
    invoice_apply_dt: string;
    rbf_tax_type: string;
    rbf_tax_type_cd: string;
  };
}

// ──────────────────────────────────────────────
// 프록시 경로 (proxy.conf.json에서 /api/nts → api.odcloud.kr 로 변환)
// ──────────────────────────────────────────────
const NTS_STATUS_URL = '/api/nts/status';
const NTS_VALIDATE_URL = '/api/nts/validate';

// 실운영 시 백엔드 프록시 엔드포인트
const BACKEND_API_URL = '/api/v1/business/verify';

const STATUS_MAP: Record<string, 'active' | 'closed' | 'suspended'> = {
  '01': 'active',
  '02': 'suspended',
  '03': 'closed',
};

@Injectable({ providedIn: 'root' })
export class BusinessVerificationService {
  private readonly http = inject(HttpClient);

  /**
   * 사업자등록번호로 국세청 API 조회
   *
   * 흐름:
   * 1) 상태조회 API (/status) → 계속사업자 여부 확인
   * 2) 상태가 유효하면 → 조회 성공 반환
   *
   * 참고: 국세청 상태조회 API는 상호/대표자명/주소를 반환하지 않습니다.
   * 이 정보는 실운영 시 백엔드에서 별도 DB 또는 상용 API로 보완해야 합니다.
   * 개발 단계에서는 상태조회 성공 시 상호/대표자명/주소를 사용자가 직접 입력하도록 합니다.
   */
  verify(businessNumber: string): Observable<BusinessVerification> {
    const bNo = businessNumber.replace(/-/g, '');
    const apiKey = environment.ntsApiKey;

    // API 키 미설정 → mock 모드
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      return this.fallbackMock(bNo);
    }

    // 실운영 환경에서는 백엔드 프록시 사용
    if (environment.production) {
      return this.http.post<BusinessVerification>(BACKEND_API_URL, { businessNumber: bNo });
    }

    // 개발 환경: Angular 프록시 경유 → 국세청 상태조회 API 직접 호출
    const url = `${NTS_STATUS_URL}?serviceKey=${encodeURIComponent(apiKey)}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' });

    return this.http.post<NtsStatusResponse>(url, { b_no: [bNo] }, { headers }).pipe(
      map(res => this.mapStatusResponse(res)),
      catchError(err => {
        console.warn('국세청 API 호출 실패, mock 데이터 사용:', err.message);
        return this.fallbackMock(bNo);
      }),
    );
  }

  private mapStatusResponse(res: NtsStatusResponse): BusinessVerification {
    const item = res.data?.[0];
    if (!item) {
      return { valid: false, businessName: '', ownerName: '', address: '', status: 'closed' };
    }

    const status = STATUS_MAP[item.b_stt_cd] ?? 'closed';

    return {
      valid: item.b_stt_cd === '01',
      // 국세청 상태조회 API는 상호/대표자명/주소를 반환하지 않음
      // → 조회 성공 시 사용자 직접 입력 또는 백엔드 보완
      businessName: '',
      ownerName: '',
      address: '',
      status,
    };
  }

  /**
   * 개발용 목업 — API 키 미설정 시 사용
   */
  private fallbackMock(bNo: string): Observable<BusinessVerification> {
    const mockDb: Record<string, Omit<BusinessVerification, 'valid' | 'status'>> = {
      '1248100998': { businessName: '(주)페이블루', ownerName: '김대표', address: '서울특별시 강남구 테헤란로 123' },
      '2208162517': { businessName: '스마트커머스', ownerName: '이상점', address: '서울특별시 서초구 서초대로 456' },
      '1018271234': { businessName: '굿프레시마트', ownerName: '박신선', address: '경기도 성남시 분당구 판교로 789' },
    };

    const match = mockDb[bNo];

    // 등록된 mock이 없어도 10자리 유효 번호면 기본 mock 데이터로 조회 성공 처리 (개발용)
    if (!match && bNo.length === 10) {
      return of<BusinessVerification>({
        valid: true,
        businessName: `테스트상점_${bNo.slice(-4)}`,
        ownerName: '홍길동',
        address: '서울특별시 중구 세종대로 110',
        status: 'active',
      }).pipe(delay(800));
    }

    return of<BusinessVerification>(
      match
        ? { valid: true, businessName: match.businessName, ownerName: match.ownerName, address: match.address, status: 'active' }
        : { valid: false, businessName: '', ownerName: '', address: '', status: 'closed' }
    ).pipe(delay(800));
  }
}
