# PayBlue 회원가입 시스템 개선 기획서

> **작성일**: 2026-03-15
> **최종 업데이트**: 2026-03-20 (구현 현황 반영)
> **작성팀**: 풀스택 개발자, 시스템 기획자, 반응형 웹 디자이너, 결제 도메인 전문가
> **대상 시스템**: PayBlue 가입시스템(payblue-join.k-lab.io) + 관리시스템(payblue.k-lab.io)
> **프로젝트 기간**: 6개월 (Phase 1~3)

---

## 목차

1. [현행 시스템 분석](#1-현행-시스템-분석)
2. [개선 목표 및 비전](#2-개선-목표-및-비전)
3. [기술 아키텍처 개선안](#3-기술-아키텍처-개선안)
4. [UI/UX 디자인 개선안](#4-uiux-디자인-개선안)
5. [프론트엔드 구현 현황](#5-프론트엔드-구현-현황)
6. [보안 및 규제 준수 개선안](#6-보안-및-규제-준수-개선안)
7. [단계별 실행 로드맵](#7-단계별-실행-로드맵)
8. [리소스 계획](#8-리소스-계획)
9. [KPI 및 성과 지표](#9-kpi-및-성과-지표)
10. [리스크 분석 및 대응](#10-리스크-분석-및-대응)
11. [부록](#11-부록)

---

## 1. 현행 시스템 분석

### 1.1 기술 스택 현황

| 영역 | 현행 기술 | 비고 |
|------|----------|------|
| 프레임워크 | Angular (SPA) | Hash-based routing (`#/`), 구버전 추정 (8~12) |
| UI 라이브러리 | PrimeNG | `ui-column-title`, `ui-paginator-*` 클래스 확인 |
| CSS | 인라인 CSS | 외부 스타일시트 없음, `linear-gradient(135deg, #71b7e6, #9b59b6)` |
| 폰트 | Google Fonts | Noto Sans KR, Roboto, Material Icons |
| 트래킹 | Facebook Pixel | ID: 630978878089384 |
| 데이터 자동화 | Python + Playwright | 웹 스크래핑 기반, `daily_payblue.py` (481줄) |
| 데이터 저장 | Excel (.xlsx) | openpyxl 라이브러리, 로컬 + OneDrive 동기화 |
| 배포 환경 | k-lab.io 도메인 | 관리/가입 시스템 별도 서브도메인 |

### 1.2 시스템 구성도

```
┌─────────────────────────┐     ┌──────────────────────────┐
│  관리시스템 (Admin)       │     │  가입시스템 (Join)         │
│  payblue.k-lab.io       │     │  payblue-join.k-lab.io   │
│  Angular + PrimeNG      │     │  별도 프론트엔드           │
│  Hash Routing (#/)      │     │                          │
└────────┬────────────────┘     └──────────┬───────────────┘
         │                                  │
         ▼                                  ▼
┌─────────────────────────────────────────────────────────┐
│                   백엔드 서버 (추정)                      │
│              API 직접 노출 없음 → 스크래핑 의존            │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   데이터베이스 (추정)                      │
│              가맹점, 거래, 사용자 데이터                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│  자동화 스크립트           │
│  daily_payblue.py       │
│  Playwright 스크래핑      │
│  → Excel 저장            │
│  → OneDrive 동기화       │
└─────────────────────────┘
```

### 1.3 운영 수치 (로그 분석 기반)

| 지표 | 수치 | 비고 |
|------|------|------|
| 일일 전체 거래량 | 27~148건/일 | 요일별 차이 큼 |
| 등록 가맹점(PB코드) | ~153개 | 기본내역 시트 기준 |
| PB코드 미등록 제외율 | ~68% | 전체 거래의 2/3가 활용되지 않음 |
| 스크래핑 소요시간 | 30초~2분 | 데이터량 비례 선형 증가 |
| 페이지당 건수 | 10건 (고정) | 50건 전환 시도하나 실패 |

### 1.4 데이터 모델 (역추적)

거래 데이터 16개 필드:
```
대리점 | 판매자코드(PB코드) | 상호 | 판매자이름 | 판매자연락처
구매자연락처 | 승인일시 | TID/상점번호 | 발급사 | 카드번호
할부 | 승인번호 | 판매금액 | 취소일시 | 메모 | 앱종류
```

PB코드 체계: `PB`로 시작, 기본내역 시트에 B~EX열(2~154열) 범위, 최대 153개

### 1.5 핵심 문제점 요약

#### CRITICAL (즉시 조치 필요)

| # | 문제 | 영역 | 영향 |
|---|------|------|------|
| C-1 | **하드코딩된 인증 정보** — 소스코드에 사용자명/비밀번호 평문 노출 | 보안 | 코드 유출 시 전체 시스템 접근 가능 |
| C-2 | **카드번호 평문 저장** — Excel 파일에 카드번호 마스킹 미검증 | 보안/PCI | PCI DSS 직접 위반 가능성 |
| C-3 | **API 부재** — 데이터 접근이 Playwright 스크래핑에 100% 의존 | 아키텍처 | UI 변경 시 전체 자동화 마비 |

#### HIGH (단기 해결 필요)

| # | 문제 | 영역 | 영향 |
|---|------|------|------|
| H-1 | 단일 인증(SFA) — MFA 미적용 | 보안 | 크리덴셜 탈취 시 전체 노출 |
| H-2 | Excel 기반 정산 — RDBMS 아닌 파일이 SSOT | 아키텍처 | 확장성 한계, 데이터 정합성 위험 |
| H-3 | PB코드 미등록율 68% — 거래 데이터 2/3 미활용 | 비즈니스 | 매출 파악 부정확 |
| H-4 | 인라인 CSS — 반응형 미대응, 디자인 시스템 부재 | UI/UX | 모바일 사용 불가, 유지보수 곤란 |
| H-5 | 개인정보 무통제 유통 — Excel→OneDrive 암호화 없이 동기화 | 규제 | 개인정보보호법 위반 가능 |

#### MEDIUM (중기 개선)

| # | 문제 | 영역 |
|---|------|------|
| M-1 | Angular 버전 노후화 (Hash routing, 구버전 패턴) | 기술 |
| M-2 | 에러 복구 미흡 (스크린샷만 저장, 재시도 없음) | 운영 |
| M-3 | 모니터링/알림 부재 (로그 파일만 존재) | 운영 |
| M-4 | 멱등성 미보장 (중복 실행 시 중복 시트 생성) | 데이터 |
| M-5 | 접근성(a11y) 미준수 | UI/UX |

---

## 2. 개선 목표 및 비전

### 2.1 비전

> **"가맹점주가 5분 안에, 모바일에서도, 안전하게 가입을 완료하고, 실시간으로 거래를 확인할 수 있는 시스템"**

### 2.2 전략 선택: API 중심 하이브리드 전환 (Option B)

3가지 전략을 비교 분석한 결과, **기존 시스템을 유지하면서 API 레이어를 추가하고 점진적으로 전환하는 하이브리드 접근**을 채택합니다.

| 전략 | 설명 | 장점 | 단점 | 가중 점수 |
|------|------|------|------|----------|
| A. 점진적 패치 | 스크래핑 안정화, UI 패치 | 리스크 최소, 즉시 착수 | 근본 문제 미해결 | 2.85 |
| **B. 하이브리드 전환** | **API 추가 + DB 전환 + UI 현대화** | **근본 해결 + 기존 투자 보존** | **백엔드 개발 필요** | **3.70** |
| C. 전체 리빌드 | 최신 스택 완전 재구축 | 기술 부채 청산 | 12개월+, 높은 리스크 | 3.50 |

**선택 근거**:
1. 근본 문제(스크래핑 의존, Excel 한계)를 해결하면서 기존 투자를 보존
2. 6개월 일정 내 핵심 가치 전달 가능
3. 단계별 전환으로 운영 리스크 관리
4. PB코드 매칭률 68%→95% 달성을 위한 유일한 현실적 경로

### 2.3 핵심 성공 지표

| 지표 | 현행 | 목표 |
|------|------|------|
| 가입 전환율 | ~60% | 85%+ |
| 가입 소요 시간 | 15분+ | 5분 이내 |
| 모바일 가입 완료율 | 매우 낮음 | 50%+ |
| PB코드 매칭률 | ~32% | 95%+ |
| 데이터 수집 시간 | 30초~2분 | <2초 (API) |
| 자동화 성공률 | ~95% | 99.9% |
| 코드 내 평문 시크릿 | 2건 | 0건 |

---

## 3. 기술 아키텍처 개선안

### 3.1 목표 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Nx Monorepo                          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ apps/join    │  │ apps/admin   │  │ apps/api     │  │
│  │ (가입시스템)   │  │ (관리시스템)   │  │ (NestJS)     │  │
│  │ Angular 19   │  │ Angular 19   │  │ REST API     │  │
│  │ 반응형 위저드 │  │ PrimeNG 19   │  │ PostgreSQL   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│  ┌──────┴──────────────────┴──────────────────┘         │
│  │  libs/                                               │
│  │  ├── shared/ui         # 공유 UI 컴포넌트            │
│  │  ├── shared/auth       # 통합 인증 (JWT + MFA)      │
│  │  ├── shared/api-client # API 클라이언트 (타입 공유)   │
│  │  ├── shared/types      # 공통 타입 정의              │
│  │  └── shared/utils      # 공통 유틸리티               │
│  └──────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

### 3.2 기술 스택 결정

| 결정 사항 | 권장안 | 근거 |
|----------|--------|------|
| 프론트엔드 | **Angular 19 업그레이드** | 전면 재작성 대비 비용 1/3, 기존 코드 활용 |
| 백엔드 | **NestJS** | Angular과 동일 패턴(DI, 데코레이터), 학습 비용 최소 |
| DB | **PostgreSQL 17** | ACID 보장, RLS, 결제 시스템에 최적 |
| ORM | **Prisma 또는 Drizzle** | 타입 안전, 마이그레이션 관리 |
| 빌드 | **Vite + esbuild** | Angular 19 기본 지원, 빌드 속도 3-5배 개선 |
| 스타일 | **CSS Custom Properties + 컴포넌트 스타일** | 인라인 CSS 정리, 디자인 토큰 관리 |
| 모노레포 | **Nx** | Angular 공식 추천, 빌드 캐싱 |
| CI/CD | **GitHub Actions** | 무료 티어 충분, 생태계 최대 |
| 모니터링 | **Sentry + Grafana** | 에러/성능 추적, 비용 효율적 |
| 캐시 | **Redis** | 세션 관리, 정산 요약 캐싱 |

> **핵심 원칙**: 이 시스템의 규모(일 27~148건, 가맹점 ~153개)는 소규모입니다. **모놀리스 + PostgreSQL + Angular 업그레이드**가 최적입니다. 마이크로서비스, K8s 등 과도한 엔지니어링을 절대 피합니다.

### 3.3 프론트엔드 구현 현황 (Angular 19)

> **✅ Phase 1 완료**: Angular 19 기반 가입 프론트엔드가 구현되었습니다.

#### 구현 완료 항목

- ✅ Angular 19 Standalone Components (NgModule 제거)
- ✅ Angular Signals 기반 상태 관리 (Zone.js 의존 최소화)
- ✅ Vite/esbuild 기반 `@angular-devkit/build-angular:application` 빌더
- ✅ Path-based routing (Hash routing 제거)
- ✅ Lazy loading (`loadComponent()`로 코드 분할)
- ✅ CSS Custom Properties 기반 디자인 토큰 시스템
- ✅ 반응형 레이아웃 (Mobile-First)
- ✅ 5단계 멀티스텝 위저드 (Step 0~4)
- ✅ 회원유형별 분기 (사업자/개인)

#### 미구현 항목

- ⬚ PrimeNG 사용 안 함 (커스텀 디자인 시스템으로 대체)
- ⬚ @defer 블록 미적용
- ⬚ 테스트 코드 없음 (Karma/Jasmine 설정만 존재)
- ⬚ Route Guard 미구현 (단계 검증 없음)
- ⬚ HTTP Interceptor 미구현

#### 미래 작업: Nx 모노레포 통합 (Phase 3)
- ⬚ Nx 모노레포 구성
- ⬚ 공유 라이브러리: UI 컴포넌트, 인증, API 클라이언트
- ⬚ 관리시스템(admin) 통합

### 3.4 백엔드 API 설계

현재 가장 시급한 문제는 **API 부재**입니다. API가 있으면 스크래핑 60초 → API 호출 1초로 단축됩니다.

#### 핵심 API 엔드포인트

```
# 인증
POST   /api/v1/auth/login              # 로그인 (+ MFA)
POST   /api/v1/auth/refresh            # 토큰 갱신
POST   /api/v1/auth/logout             # 로그아웃

# 가맹점 관리
GET    /api/v1/merchants                # 가맹점 목록
POST   /api/v1/merchants                # 가맹점 등록 (회원가입)
GET    /api/v1/merchants/:id            # 가맹점 상세
PATCH  /api/v1/merchants/:id            # 가맹점 수정

# 거래 조회
GET    /api/v1/transactions             # 거래 목록 (필터/페이지네이션)
GET    /api/v1/transactions/summary     # PB코드별 합계 (정산 대체)
POST   /api/v1/transactions/export      # Excel 다운로드

# 정산
GET    /api/v1/settlements/daily/:date  # 날짜별 정산
POST   /api/v1/settlements/calculate    # 일일 정산 계산

# 온보딩
POST   /api/v1/onboarding/apply         # 가입 신청
GET    /api/v1/onboarding/:id/status    # 신청 상태 조회
POST   /api/v1/onboarding/:id/approve   # 승인 → PB코드 자동 할당

# NICE 본인인증 (프론트엔드 프록시)
POST   /api/v1/nice/token               # 인증 토큰 요청
GET    /api/v1/nice/result              # 인증 결과 조회

# 보고서
GET    /api/v1/reports/daily/:date      # 일일 보고서
POST   /api/v1/reports/export           # 맞춤 Excel Export
```

#### API 응답 형식 (일관된 엔벨로프)

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "total": 125,
      "page": 1,
      "limit": 50,
      "totalPages": 3
    }
  },
  "error": null,
  "timestamp": "2026-03-15T10:00:00Z"
}
```

### 3.5 데이터베이스 스키마

```sql
-- 가맹점 (회원)
CREATE TABLE merchants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pb_code         VARCHAR(20) UNIQUE NOT NULL,
    business_name   VARCHAR(100) NOT NULL,
    owner_name      VARCHAR(50) NOT NULL,
    owner_phone     VARCHAR(20),
    agency_id       UUID REFERENCES agencies(id),
    app_type        VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 대리점
CREATE TABLE agencies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 거래
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID REFERENCES merchants(id) NOT NULL,
    tid             VARCHAR(50),
    buyer_phone     VARCHAR(20),
    card_issuer     VARCHAR(50),
    card_number     VARCHAR(30),        -- 마스킹 필수 (앞6뒤4)
    installment     SMALLINT DEFAULT 0,
    approval_number VARCHAR(30),
    amount          INTEGER NOT NULL,
    approved_at     TIMESTAMPTZ NOT NULL,
    cancelled_at    TIMESTAMPTZ,
    memo            TEXT,
    status          VARCHAR(20) DEFAULT 'approved',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 일일 정산
CREATE TABLE daily_settlements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_date DATE NOT NULL,
    merchant_id     UUID REFERENCES merchants(id) NOT NULL,
    total_amount    INTEGER NOT NULL,
    transaction_count INTEGER NOT NULL,
    cancel_count    INTEGER DEFAULT 0,
    payback_amount  INTEGER,            -- 페이백 (4%)
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(settlement_date, merchant_id)
);

-- 사용자 (관리시스템 로그인)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL,    -- admin/agency/merchant
    agency_id       UUID REFERENCES agencies(id),
    merchant_id     UUID REFERENCES merchants(id),
    is_active       BOOLEAN DEFAULT true,
    mfa_enabled     BOOLEAN DEFAULT false,
    mfa_secret      VARCHAR(255),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 가입 신청
CREATE TABLE onboarding_applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no  VARCHAR(30) UNIQUE NOT NULL,
    member_type     VARCHAR(20) NOT NULL,       -- 'business' | 'individual'
    business_name   VARCHAR(200),
    owner_name      VARCHAR(100) NOT NULL,
    owner_phone     VARCHAR(20) NOT NULL,
    business_no     VARCHAR(20),
    birth_date      VARCHAR(6),                 -- YYMMDD
    gender_digit    VARCHAR(1),                 -- '1'-'4'
    nice_ci         VARCHAR(255),               -- NICE 본인인증 CI
    nice_di         VARCHAR(255),               -- NICE 중복확인 DI
    address         VARCHAR(500),
    address_detail  VARCHAR(200),
    bank_name       VARCHAR(50),
    account_number  VARCHAR(30),
    account_holder  VARCHAR(50),
    agree_terms     BOOLEAN DEFAULT false,
    agree_privacy   BOOLEAN DEFAULT false,
    agree_marketing BOOLEAN DEFAULT false,
    status          VARCHAR(20) DEFAULT 'pending',
    assigned_pb_code VARCHAR(20),
    documents       JSONB DEFAULT '[]',
    submitted_at    TIMESTAMPTZ DEFAULT now(),
    reviewed_at     TIMESTAMPTZ,
    approved_at     TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_transactions_merchant_date ON transactions(merchant_id, approved_at);
CREATE INDEX idx_transactions_approved_at ON transactions(approved_at);
CREATE INDEX idx_settlements_date ON daily_settlements(settlement_date);
CREATE INDEX idx_merchants_pb_code ON merchants(pb_code);
CREATE INDEX idx_onboarding_status ON onboarding_applications(status);
CREATE INDEX idx_onboarding_member_type ON onboarding_applications(member_type);
```

### 3.6 Excel → DB 마이그레이션 전략

```
Phase 1: 이중 쓰기 (2주)
  - API가 DB에 쓰면서 동시에 Excel도 생성
  - 기존 daily_payblue.py는 검증용으로 병행 운영

Phase 2: DB 전환 (2주)
  - Excel 생성을 API 엔드포인트(/transactions/export)로 대체
  - daily_payblue.py를 API 호출 스크립트로 전환

Phase 3: Excel 제거 (1주)
  - Excel 기반 정산 완전 제거 (단, Excel Export 기능은 영구 유지)
  - 정산 대시보드로 대체
```

### 3.7 성능 최적화 목표

| 항목 | 현행 (추정) | 개선 목표 | 방법 |
|------|------------|----------|------|
| 초기 번들 | ~500KB+ | <200KB | Tree-shaking, Lazy loading, @defer |
| 빌드 도구 | Webpack | Vite/esbuild | Angular 19 기본 ✅ 완료 |
| 데이터 수집 | 60초 (스크래핑) | 1~2초 (API) | REST API 직접 호출 |
| 정산 계산 | 수동 + 2분 | 실시간 | DB 뷰/트리거 |
| 폰트 | 외부 CDN | self-host + subset | Pretendard 가변 폰트 ✅ 적용 |

### 3.8 DevOps / CI-CD

```
┌─────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  GitHub  │────>│  GitHub  │────>│  Docker   │────>│  배포     │
│  Push    │     │  Actions │     │  Build    │     │          │
└─────────┘     └──────────┘     └───────────┘     └──────────┘
                     │
                     ├── Lint (Biome)
                     ├── Unit Test (Vitest)
                     ├── E2E Test (Playwright)
                     ├── Type Check (tsc)
                     ├── Security Scan
                     └── Build

환경 구성:
  개발:    dev.payblue.k-lab.io     → feature branch 자동 배포
  스테이징: staging.payblue.k-lab.io → main branch 자동 배포
  프로덕션: payblue.k-lab.io         → 태그/릴리스 시 수동 승인 후 배포
```

---

## 4. UI/UX 디자인 개선안

### 4.1 디자인 시스템 — "PayBlue Brand System" ✅ 구현 완료

#### 컬러 팔레트 ✅

PayBlue의 핵심 정체성은 **신뢰(Blue)와 전문성(Deep Navy)**입니다. CSS Custom Properties 기반 디자인 토큰으로 구현됨.

실제 구현된 토큰 (`src/app/shared/styles/tokens.css`):

```css
:root {
  /* Primary: PayBlue Brand Blue */
  --pb-primary-50:  #EBF5FF;
  --pb-primary-100: #CCE5FF;
  --pb-primary-300: #66B0FF;
  --pb-primary-500: #0070E0;  /* ★ Primary — 버튼, 링크, CTA */
  --pb-primary-600: #005BB3;  /* 호버 */
  --pb-primary-700: #004080;  /* 액티브 */

  /* Neutral: Cool Gray */
  --pb-gray-50:  #F8FAFB;  /* 페이지 배경 */
  --pb-gray-200: #E2E7EE;  /* 구분선 */
  --pb-gray-500: #6B7A90;  /* 보조 텍스트 */
  --pb-gray-700: #2D3B4E;  /* 제목 텍스트 */
  --pb-gray-800: #1A2435;  /* 강조 텍스트 */
  --pb-gray-900: #0F1624;

  /* Semantic */
  --pb-success-500: #10B981;  /* 성공 */
  --pb-warning-500: #F59E0B;  /* 경고 */
  --pb-error-500:   #EF4444;  /* 오류 */
  --pb-info-500:    #3B82F6;  /* 정보 */

  /* 배경 그래디언트 */
  --pb-bg-gradient: linear-gradient(135deg, #0070E0 0%, #004080 100%);
}
```

#### 타이포그래피 ✅

```css
:root {
  /* Pretendard + Noto Sans KR (tabular-nums 지원) */
  --pb-font-primary: 'Pretendard', 'Noto Sans KR', -apple-system, sans-serif;

  /* Fluid Typography (clamp 기반 반응형) */
  --pb-text-sm:   clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem);
  --pb-text-base: clamp(0.875rem, 0.83rem + 0.22vw, 1rem);
  --pb-text-xl:   clamp(1.125rem, 1rem + 0.63vw, 1.375rem);
  --pb-text-3xl:  clamp(1.75rem, 1.38rem + 1.88vw, 2.25rem);
}
```

#### 스페이싱 (8px 기반) ✅

```css
:root {
  --pb-space-1:  0.25rem;   /* 4px */
  --pb-space-2:  0.5rem;    /* 8px */
  --pb-space-4:  1rem;      /* 16px */
  --pb-space-6:  1.5rem;    /* 24px */
  --pb-space-8:  2rem;      /* 32px */
  --pb-space-12: 3rem;      /* 48px */
  --pb-space-16: 4rem;      /* 64px */
}
```

#### 추가 구현된 토큰 ✅

```css
:root {
  /* 컨테이너 */
  --pb-container-sm: 540px;
  --pb-container-md: 720px;
  --pb-container-lg: 960px;
  --pb-container-xl: 1140px;

  /* 보더 라디우스 */
  --pb-radius-sm: 6px;
  --pb-radius-md: 8px;
  --pb-radius-lg: 12px;
  --pb-radius-xl: 16px;
  --pb-radius-full: 9999px;

  /* 그림자 */
  --pb-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --pb-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --pb-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --pb-shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08);

  /* 트랜지션 */
  --pb-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --pb-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --pb-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --pb-duration-fast: 150ms;
  --pb-duration-normal: 300ms;
  --pb-duration-slow: 500ms;
}
```

### 4.2 가입 플로우 — 5단계 스텝 위저드 ✅ 구현 완료

기획 초기안 4단계에서 **5단계(Step 0~4)**로 확장. 준비 안내 단계(Step 0)를 추가하고 회원유형에 따라 Step 2가 분기됨.

```
Step 0: 준비 안내       Step 1: 기본 정보      Step 2a/2b: 상세 정보    Step 3: 결제/약관     Step 4: 완료
┌───────────────┐    ┌───────────────┐    ┌───────────────┐       ┌───────────────┐    ┌───────────────┐
│ - 필요 서류    │    │ - 회원유형     │    │ [사업자]        │       │ - 정산 계좌   │    │ ✓ 가입 완료   │
│   안내         │    │   선택         │    │ - 사업자번호    │       │ - 은행 선택   │    │ - 승인 대기   │
│ - 사업자/개인  │    │ - NICE 본인   │    │ - 국세청 검증   │       │ - 계좌번호    │    │ - 앱 다운로드 │
│   체크리스트   │    │   인증         │    │ - 주소 검색     │       │ - 예금주명    │    │ - 다음 단계   │
│               │    │ - 직접입력     │    │ - 신분증 OCR    │       │ - 약관 동의   │    │   가이드      │
│               │    │   폴백         │    │ [개인]          │       │ - 마케팅 동의 │    │               │
│               │    │               │    │ - 주소 검색     │       │               │    │               │
│               │    │               │    │ - 신분증 OCR    │       │               │    │               │
│               │    │               │    │ - 사업명 입력   │       │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘       └───────────────┘    └───────────────┘
 ●───────○───────○───────○───────○
```

**핵심 원칙 (구현됨):**
- ✅ 각 단계 3~6개 필드 이내 (인지 부하 감소)
- ✅ 사업자등록번호 입력 시 국세청 API 연동 → 진위 확인 (자동입력은 API 한계로 사용자 직접 입력)
- ✅ 회원유형(사업자/개인)에 따른 Step 2 분기
- ✅ 이전 단계로 자유롭게 돌아갈 수 있음
- ✅ NICE 본인인증 결과로 이름/전화번호/생년월일 자동 입력
- ⬚ 각 단계 완료 시 데이터 서버 저장 (현재 클라이언트 signal만)

### 4.3 반응형 전략 — Mobile-First ✅ 구현 완료

#### 모바일 (320px ~ 767px) — 최우선

```
┌─────────────────────────────┐
│  PayBlue 로고               │
│  ● ─ ○ ─ ○ ─ ○ ─ ○  (1/5) │
│                             │
│  ┌───────────────────────┐  │
│  │ 이메일 *               │  │  ← 전체 너비
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 비밀번호 *             │  │
│  └───────────────────────┘  │
│  ████░░░░  보통             │  ← 비밀번호 강도
│  ┌───────────────────────┐  │
│  │    다음 단계 →          │  │  ← 전체 너비 CTA
│  └───────────────────────┘  │
│  이미 계정이 있나요? 로그인  │
└─────────────────────────────┘
```

#### 데스크톱 (1024px+)

```
┌──────────────────────────────────────────────────────────────┐
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │  PayBlue             │  │  ● ── ○ ── ○ ── ○ ── ○     │  │
│  │  결제의 새로운 기준   │  │  기본 정보                   │  │
│  │                      │  │                             │  │
│  │  ✓ 빠른 가입         │  │  [이메일 필드]               │  │
│  │  ✓ 안전한 결제        │  │  [비밀번호 필드]             │  │
│  │  ✓ 실시간 정산        │  │  [다음 단계 →]              │  │
│  │                      │  │                             │  │
│  └──────────────────────┘  └─────────────────────────────┘  │
│     브랜드 패널 (40%)          가입 폼 패널 (60%)            │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 폼 UX 패턴

#### 필드 유효성 검사 ✅ (ValidationService 구현 완료)

| 필드 유형 | 검증 시점 | 구현 상태 |
|----------|----------|----------|
| 이메일 | blur + submit | ✅ `ValidationService.emailValidator()` |
| 비밀번호 | 입력 중 (실시간) | ✅ `PbPasswordStrengthComponent` |
| 사업자번호 | blur + 국세청 API 검증 | ✅ `ValidationService.businessNumberValidator()` (체크섬 포함) |
| 전화번호 | blur + submit | ✅ `ValidationService.phoneValidator()` (한국 010 형식) |
| 필수 필드 | blur + submit | ✅ Angular Reactive Forms `Validators.required` |

#### 에러 메시지 원칙: "어떻게 하면 되는지" 안내

| 잘못된 예 | 올바른 예 |
|----------|----------|
| "잘못된 이메일 형식" | "이메일 형식을 확인해주세요 (예: name@example.com)" |
| "비밀번호 오류" | "8자 이상, 영문과 숫자를 포함해주세요" |
| "사업자번호 유효하지 않음" | "10자리 사업자등록번호를 입력해주세요 (- 없이)" |

### 4.5 접근성(a11y) — WCAG 2.1 AA 준수

- **색상 대비**: 모든 텍스트 4.5:1 이상 보장
- **키보드 네비게이션**: Tab 순서 논리적 보장, `:focus-visible` 포커스 표시
- **스크린 리더**: `aria-required`, `aria-invalid`, `aria-describedby`, `aria-live="polite"`
- **모션 감소**: `prefers-reduced-motion` 미디어 쿼리 존중 ✅ animations.css에 구현
- **시맨틱 HTML**: `<main>`, `<form>`, `<fieldset>`, `<legend>` 적절 사용

### 4.6 가맹점주 특화 UX ✅ 구현 완료

- ✅ **사업자등록번호 검증**: 국세청 API 연동 (진위확인 + 휴폐업 조회)
- ✅ **NICE 본인인증**: 팝업 기반 인증 + mock 모드 지원
- ✅ **신분증 OCR**: Tesseract.js 기반 주민등록번호 추출 (이름/생년월일/성별)
- ✅ **신뢰 구축 요소**: `PbTrustBadgeComponent`
- ✅ **카메라 직접 촬영**: `IdCameraGuideComponent` (자동 감지 + 흔들림 방지 + 플래시)
- ✅ **다음 우편번호 검색**: `DaumPostcodeService` (팝업 방식)
- ✅ **가입 완료 후 안내**: 승인 대기 → SMS → 앱 다운로드 → 결제 시작 타임라인

### 4.7 마이크로 인터랙션 ✅ 구현 완료

구현된 애니메이션 (`src/app/shared/styles/animations.css`):

| 애니메이션 | 키프레임 | 용도 |
|-----------|---------|------|
| `pb-slideInRight` | translateX(30px→0) | 스텝 전환 (다음) |
| `pb-slideInLeft` | translateX(-30px→0) | 스텝 전환 (이전) |
| `pb-slideDown` | translateY(-8px→0) | 에러 메시지 등장 |
| `pb-fadeIn` | opacity(0→1) | 일반 등장 |
| `pb-spin` | rotate(0→360) | 로딩 스피너 |
| `pb-checkIn` | scale(0→1.2→1) | 유효성 체크 아이콘 |
| `pb-successPulse` | scale(1→1.05→1) | 가입 완료 아이콘 |

- ✅ **성능 규칙**: `transform`과 `opacity`만 애니메이션 (GPU 가속)
- ✅ **prefers-reduced-motion**: 모션 축소 환경 대응

### 4.8 성능 목표

| 지표 | 목표 |
|------|------|
| LCP (Largest Contentful Paint) | < 2.0초 |
| INP (Interaction to Next Paint) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.05 |
| 전체 페이지 크기 | < 500KB (이미지 제외) |
| 프로덕션 빌드 예산 | 초기 번들 500KB 경고, 1MB 에러 ✅ angular.json |

---

## 5. 프론트엔드 구현 현황

> **이 섹션은 2026-03-20 기준 실제 구현된 코드를 기반으로 작성되었습니다.**

### 5.1 프로젝트 구조

```
payblue-join/
├── src/
│   ├── app/
│   │   ├── layouts/
│   │   │   └── signup-layout/              # 래퍼 (스테퍼 + 프로그레스)
│   │   ├── pages/signup/
│   │   │   ├── step0-preparation/          # 준비 안내
│   │   │   ├── step1-basic/                # 기본 정보 (회원유형 + 본인인증)
│   │   │   ├── step2-business/             # 사업자 정보
│   │   │   ├── step2-individual/           # 개인 정보
│   │   │   ├── step3-payment/              # 결제/약관 동의
│   │   │   └── step4-complete/             # 완료
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── pb-button/              # 버튼 (primary/secondary/text, sm/md/lg)
│   │   │   │   ├── pb-input/               # 텍스트 입력 필드
│   │   │   │   ├── pb-card/                # 카드 컨테이너
│   │   │   │   ├── pb-stepper/             # 5단계 프로그레스 표시
│   │   │   │   ├── pb-password-strength/   # 비밀번호 강도 미터
│   │   │   │   ├── pb-file-upload/         # 파일 업로드 (드래그앤드롭)
│   │   │   │   ├── pb-trust-badge/         # 신뢰 배지
│   │   │   │   ├── id-camera-guide/        # ★ 신분증 카메라 (자동감지)
│   │   │   │   └── index.ts               # barrel export
│   │   │   ├── models/
│   │   │   │   ├── signup.model.ts          # 가입 폼 데이터 모델
│   │   │   │   └── nice-auth.model.ts       # NICE 인증 모델
│   │   │   ├── services/
│   │   │   │   ├── signup.service.ts        # 중앙 상태 관리 (signals)
│   │   │   │   ├── nice-auth.service.ts     # NICE 본인인증
│   │   │   │   ├── business-verification.service.ts  # 국세청 API
│   │   │   │   ├── id-ocr.service.ts        # Tesseract.js OCR
│   │   │   │   ├── validation.service.ts    # 유효성 검사
│   │   │   │   └── daum-postcode.service.ts # 다음 우편번호
│   │   │   └── styles/
│   │   │       ├── tokens.css               # 디자인 토큰
│   │   │       └── animations.css           # GPU 가속 애니메이션
│   │   ├── app.routes.ts                    # 라우트 (lazy loading)
│   │   ├── app.config.ts                    # 프로바이더
│   │   └── app.component.ts                 # 루트 컴포넌트
│   ├── environments/
│   │   ├── environment.ts                   # 개발 (mock 활성)
│   │   └── environment.prod.ts              # 운영 (mock 비활성)
│   ├── styles.css                           # 글로벌 스타일
│   └── index.html
├── proxy.conf.json                          # 개발 프록시 설정
├── angular.json                             # Angular 빌드 설정
├── package.json                             # 의존성
└── tsconfig.app.json
```

### 5.2 라우팅 구조

```typescript
// app.routes.ts — 모든 라우트 lazy loading
{
  path: '',
  loadComponent: SignupLayoutComponent,    // 스테퍼 래퍼
  children: [
    { path: '', redirectTo: 'step/0', pathMatch: 'full' },
    { path: 'step/0', loadComponent: Step0PreparationComponent },
    { path: 'step/1', loadComponent: Step1BasicComponent },
    { path: 'step/2', loadComponent: Step2BusinessComponent },        // 사업자
    { path: 'step/2-individual', loadComponent: Step2IndividualComponent }, // 개인
    { path: 'step/3', loadComponent: Step3PaymentComponent },
    { path: 'step/4', loadComponent: Step4CompleteComponent },
  ]
},
{ path: '**', redirectTo: '' }
```

**분기 로직**: Step 1에서 `memberType`을 선택 → `'business'`면 `/step/2`, `'individual'`이면 `/step/2-individual`로 이동.

### 5.3 데이터 모델

```typescript
// signup.model.ts
type MemberType = 'business' | 'individual';

interface SignupFormData {
  step1: BasicInfoData;        // 기본 정보
  step2: BusinessInfoData;     // 사업자 정보
  step2Individual: IndividualInfoData;  // 개인 정보
  step3: PaymentSettingsData;  // 결제/약관
}

interface BasicInfoData {
  memberType: MemberType;
  name: string;
  phone: string;
  niceAuth?: NiceAuthData;     // NICE 인증 결과 (선택)
}

interface NiceAuthData {
  readonly verified: boolean;
  readonly name: string;
  readonly phone: string;
  readonly birthDate: string;  // YYMMDD
  readonly genderDigit: string; // '1'-'4'
  readonly ci: string;         // 고유 식별값
  readonly di: string;         // 중복가입 확인값
}

interface BusinessInfoData {
  businessNumber: string;      // 사업자등록번호 (10자리)
  businessName: string;        // 상호명
  ownerName: string;           // 대표자명
  businessType: string;        // 업태
  businessCategory: string;    // 업종
  address: string;             // 주소
  addressDetail: string;       // 상세주소
  documentFile: File | null;   // 사업자등록증 이미지
}

interface IndividualInfoData {
  birthDate: string;           // YYMMDD
  genderDigit: string;         // '1'-'4'
  address: string;
  addressDetail: string;
  receiptBusinessName: string; // 사업명 (현금영수증용)
  salesCategory: string;       // 판매 카테고리
  idDocumentFile: File | null; // 신분증 이미지
}

interface PaymentSettingsData {
  bankName: string;            // 은행명
  accountNumber: string;       // 계좌번호
  accountHolder: string;       // 예금주명
  agreeTerms: boolean;         // 서비스 이용약관 (필수)
  agreePrivacy: boolean;       // 개인정보 처리방침 (필수)
  agreeMarketing: boolean;     // 마케팅 수신 동의 (선택)
}
```

### 5.4 서비스 계층

| 서비스 | 역할 | 상태 관리 | 외부 연동 |
|--------|------|----------|----------|
| `SignupService` | 전체 폼 데이터 중앙 관리 | Angular signals (`signal()`, `computed()`) | — |
| `NiceAuthService` | NICE 본인인증 팝업 처리 | signals: `status`, `errorMessage` | NICE API (mock/real) |
| `BusinessVerificationService` | 사업자등록번호 국세청 검증 | — | `api.odcloud.kr` (프록시 경유) |
| `IdOcrService` | 신분증 이미지 → 텍스트 추출 | signals: `processing`, `progress` | Tesseract.js (클라이언트) |
| `ValidationService` | 유효성 검사 규칙 (static) | — | — |
| `DaumPostcodeService` | 다음 우편번호 검색 팝업 | — | `window.daum.Postcode` |

#### SignupService 상태 흐름

```
signal(formData) ← updateStep1() / updateStep2() / updateStep3()
                                       │
computed(memberType)  ←────────────────┘
computed(niceAuthResult)
computed(progressPercent)
computed(isComplete)

submitApplication() → TODO: POST /api/v1/onboarding/apply
```

### 5.5 공유 컴포넌트 (pb- 접두사)

| 컴포넌트 | 셀렉터 | 기능 |
|---------|--------|------|
| `PbButtonComponent` | `pb-button` | 버튼 (primary/secondary/text), 크기 (sm/md/lg), 로딩 스피너, disabled |
| `PbInputComponent` | `pb-input` | 텍스트 입력, 라벨, 에러 힌트 |
| `PbCardComponent` | `pb-card` | 카드 컨테이너 (패딩, 보더, 쉐도우) |
| `PbStepperComponent` | `pb-stepper` | 5단계 프로그레스 표시, 완료 체크마크, 이전 단계 이동 |
| `PbPasswordStrengthComponent` | `pb-password-strength` | 비밀번호 강도 미터 (weak/medium/strong) |
| `PbFileUploadComponent` | `pb-file-upload` | 파일 업로드 (드래그앤드롭) |
| `PbTrustBadgeComponent` | `pb-trust-badge` | 보안/신뢰 배지 |
| `IdCameraGuideComponent` | `app-id-camera-guide` | ★ 가장 복잡한 컴포넌트 (아래 상세) |

#### IdCameraGuideComponent — 신분증 카메라 자동 촬영 ★

프로덕션 수준의 카메라 기반 신분증/서류 자동 촬영 컴포넌트:

- **자동 감지**: 콘텐츠 유무 (표준편차), 엣지 근접도 (보더 비율), 프레임 안정성, 선명도 (라플라시안 분산)
- **상태 머신**: `waiting` → `too_close` → `detected` → `stabilizing` → `captured` / `blurry`
- **자동 촬영**: 3프레임 연속 안정 시 자동 촬영 (~0.75초)
- **플래시 제어**: 지원 기기에서 torch 토글
- **모드 분기**: 신분증(ISO/IEC 7810 카드 비율, 자동감지) / 서류(A4 비율, 수동 촬영만)
- **수동 폴백**: 자동감지 실패 시 수동 촬영 버튼

### 5.6 각 Step 구현 상세

#### Step 0: 준비 안내 ✅

- 사업자/개인별 필요 서류 체크리스트 (2컬럼 카드)
- Material Symbols 아이콘
- "준비완료" 버튼 → Step 1 이동

#### Step 1: 기본 정보 ✅

- 회원유형 선택 (라디오 카드: 사업자/개인)
- NICE 본인인증 팝업 (mock: 800ms 즉시 응답)
- "본인인증 없이 직접 입력" 폴백
- 재방문 시 폼 데이터 복원
- 인증 성공 시 Step 2로 자동 이동

#### Step 2-Business: 사업자 정보 ✅

- 신분증 OCR (NICE 인증 안 한 경우)
  - 카메라 촬영 → Tesseract.js → 이름/생년월일/성별 자동 추출
- 사업자등록번호 입력 + 국세청 API 검증
  - 10자리 체크섬 검증 (한국 세금 ID 알고리즘)
  - API 호출 → 정상/휴업/폐업 상태 표시
- 다음 우편번호 검색 → 주소 자동입력
- NICE 인증 완료 시 이름/전화번호/생년월일 readonly

#### Step 2-Individual: 개인 정보 ✅

- Step 2-Business와 유사하되 사업자번호 검증 없음
- 사업명(현금영수증용), 판매 카테고리 입력
- 신분증 OCR 필수

#### Step 3: 결제/약관 동의 ✅

- 은행 드롭다운 (KB, 신한, NH, 우리, 하나, IBK, DGB, 부산 등)
- 계좌번호 입력 (숫자만)
- 예금주명 입력
- 약관 체크박스:
  - ☐ 서비스 이용약관 동의 (필수)
  - ☐ 개인정보 처리방침 동의 (필수)
  - ☐ 마케팅 수신 동의 (선택)
- "전체 동의" 체크박스 → 하위 전체 동기화
- 안내: "가입자와 예금주는 동일인만 가능합니다"

#### Step 4: 완료 ✅

- 성공 아이콘 (SVG 체크마크 + 펄스 애니메이션)
- "가입 신청이 완료되었습니다"
- 다음 단계 타임라인:
  1. 가입 심사 (영업일 1~2일)
  2. SMS 알림
  3. 앱 다운로드 (App Store / Google Play 링크)
  4. 결제 시작
- 홈 버튼 (signup 리셋 후 재시작)

### 5.7 외부 서비스 연동

| 서비스 | 구현 상태 | 개발 모드 | 운영 모드 |
|--------|----------|----------|----------|
| **NICE 본인인증** | ✅ Mock + Real 분기 | `environment.niceAuth.useMock: true` → 800ms mock | 팝업 인증 → postMessage |
| **국세청 사업자조회** | ✅ API + Mock 폴백 | `proxy.conf.json` → `api.odcloud.kr` 프록시 | `/api/v1/nts/*` 백엔드 경유 |
| **신분증 OCR** | ✅ Tesseract.js | 클라이언트 사이드 (서버 불필요) | 동일 |
| **다음 우편번호** | ✅ 외부 스크립트 | `window.daum.Postcode` 팝업 | 동일 |
| **가입 제출 API** | ⬚ TODO (mock delay) | `setTimeout(1500ms)` | `POST /api/v1/onboarding/apply` 필요 |

### 5.8 환경별 설정

#### 개발 환경 (`environment.ts`)

```typescript
export const environment = {
  production: false,
  ntsApiKey: 'e2e70db0...089a334c',  // 국세청 API 키 (개발용)
  niceAuth: {
    useMock: true,                    // ← Mock 모드 활성
    requestTokenUrl: '/api/nice/token',
    resultUrl: '/api/nice/result',
    popupUrl: 'https://nice.checkplus.co.kr/CheckPlusSa498',
  },
};
```

#### 운영 환경 (`environment.prod.ts`)

```typescript
export const environment = {
  production: true,
  ntsApiKey: '',                      // 백엔드에서 관리
  niceAuth: {
    useMock: false,                   // ← 실제 NICE 인증
    requestTokenUrl: '/api/v1/nice/token',
    resultUrl: '/api/v1/nice/result',
    popupUrl: 'https://nice.checkplus.co.kr/CheckPlusSa498',
  },
};
```

#### 개발 프록시 (`proxy.conf.json`)

```json
{
  "/api/nts": {
    "target": "https://api.odcloud.kr",
    "pathRewrite": { "^/api/nts": "/api/nts-businessman/v1" }
  },
  "/api/nice": {
    "target": "http://localhost:3000"
  }
}
```

### 5.9 의존성

```json
{
  "@angular/core": "^19.2.0",
  "@angular/forms": "^19.2.0",
  "@angular/router": "^19.2.0",
  "@angular/animations": "^19.2.20",
  "tesseract.js": "^7.0.0",
  "rxjs": "~7.8.0",
  "zone.js": "~0.15.0"
}
```

- **UI 프레임워크 없음**: Bootstrap, Material, Tailwind 미사용 → 100% 커스텀 CSS + 디자인 토큰
- **테스트**: Karma + Jasmine 설정 존재, 테스트 파일 미작성

### 5.10 구현 완료 vs TODO 요약

#### ✅ 완료 (프론트엔드)

| 항목 | 상세 |
|------|------|
| Angular 19 + Standalone | NgModule 없는 순수 standalone 구조 |
| 5단계 멀티스텝 위저드 | Step 0~4 전체 UI + 네비게이션 |
| 회원유형 분기 | 사업자/개인 Step 2 분기 라우팅 |
| 상태 관리 (Signals) | `SignupService` — immutable 업데이트 |
| 디자인 시스템 | 토큰, 컬러, 타이포, 스페이싱, 애니메이션 |
| 반응형 레이아웃 | Mobile-First, clamp() 기반 유동 타이포 |
| NICE 본인인증 | Mock/Real 분기, 팝업 → postMessage |
| 국세청 사업자조회 | API 호출 + mock 폴백, 체크섬 검증 |
| 신분증 OCR | Tesseract.js, 카메라 자동촬영 (자동감지/안정성/선명도) |
| 다음 우편번호 | 팝업 방식 주소 검색 |
| 유효성 검사 | 이메일, 전화번호, 사업자번호(체크섬), 비밀번호 |
| 공유 컴포넌트 8종 | pb-button, pb-input, pb-card, pb-stepper 등 |
| 가입 완료 화면 | 타임라인 + 앱 다운로드 링크 |

#### ⬚ TODO (미구현)

| 항목 | 우선순위 | 설명 |
|------|---------|------|
| `submitApplication()` API 연동 | **CRITICAL** | 현재 `setTimeout(1500ms)` mock — `POST /api/v1/onboarding/apply` 구현 필요 |
| 백엔드 (NestJS) | **CRITICAL** | API 서버 미구축 |
| Route Guard | HIGH | 단계 스킵 방지 (예: Step 3 직접 접근 차단) |
| HTTP Interceptor | HIGH | 인증 토큰 자동 첨부, 에러 처리 |
| 테스트 코드 | HIGH | 단위 테스트 0% → 80%+ 목표 |
| 에러 처리 고도화 | MEDIUM | API 실패 시 재시도, 사용자 알림 |
| `@defer` 블록 | LOW | 지연 로딩 최적화 |
| index.html 다음 스크립트 | LOW | 다음 우편번호 외부 스크립트 로드 필요 |

---

## 6. 보안 및 규제 준수 개선안

### 6.1 즉시 조치 사항 (이번 주 내)

| # | 항목 | 현행 | 조치 | 난이도 |
|---|------|------|------|--------|
| 1 | **자격증명 하드코딩 제거** | 코드에 평문 ID/PW | 환경변수/.env + Secret Manager | 낮음 |
| 2 | **카드번호 마스킹 검증** | 마스킹 여부 미확인 | 스크래핑 단계에서 마스킹 강제 | 낮음 |
| 3 | **Excel 파일 접근 제한** | 무통제 파일 접근 | 파일 암호화 또는 접근 제한 | 중간 |
| 4 | **OneDrive 공유 설정 검토** | 공유 범위 미확인 | 접근 통제, 공유 링크 제한 | 낮음 |

> **참고**: 가입 프론트엔드(`payblue-join`)의 `environment.ts`에 국세청 API 키가 포함되어 있음. 운영 배포 시 반드시 백엔드 프록시로 전환 필요. (현재 `environment.prod.ts`에서는 비워둠 ✅)

### 6.2 규제 준수 요건

#### 전자금융거래법

| 요건 | 현행 | 필요 조치 |
|------|------|----------|
| IT 보안 기준 (전자금융감독규정) | 미충족 | 접근 통제, 암호화, 로깅, 모니터링 |
| 이용자 인증 수단 (제6조) | SFA만 사용 | MFA 의무화 |
| 거래 기록 보존 (제22조) | Excel 저장 | 5년 이상 무결성 보장 DB 저장 |
| 이상거래 탐지 (제21조의3) | 미구현 | FDS 시스템 구축 |

#### 개인정보보호법(PIPA)

| 요건 | 필요 조치 |
|------|----------|
| 안전조치 의무 (제29조) | 암호화, 접근 통제, 접근 기록 관리 |
| 파기 의무 (제21조) | 보존 기간 경과 데이터 자동 파기 정책 |
| 유출 통지 (제34조) | 유출 탐지 체계 구축, 72시간 내 통지 |
| 처리방침 공개 | 개인정보 처리방침 수립 및 공개 |

#### PCI DSS 관련

| 요건 | 현행 | 위험도 |
|------|------|--------|
| 요건 3: 저장된 카드 데이터 보호 | **Excel 평문 저장** | **Critical** |
| 요건 6: 안전한 시스템 개발 | 하드코딩 자격증명 | **Critical** |
| 요건 8: 사용자 식별/인증 | SFA만 사용 | **High** |
| 요건 10: 로깅/모니터링 | 불충분 | **High** |

### 6.3 인증/인가 체계 강화

#### MFA 도입 로드맵

| 단계 | 내용 | 대상 | 시기 |
|------|------|------|------|
| Phase 1 | SMS OTP 인증 | 본사 관리자 | 즉시 |
| Phase 2 | TOTP 앱 (Google Authenticator) | 전체 사용자 | 3개월 |
| Phase 3 | FIDO2/WebAuthn (생체인증) | 선택적 강화 | 12개월 |

> **필수**: MFA 기기 분실 시 백업 코드 발급과 관리자 수동 리셋 기능을 반드시 함께 구현

#### 가입 시스템 인증 현황

| 항목 | 구현 상태 |
|------|----------|
| NICE 본인인증 (가입자) | ✅ 팝업 기반 + mock 모드 |
| 관리자 로그인 (MFA) | ⬚ 미구현 |
| JWT 토큰 인증 | ⬚ 미구현 |
| RBAC 역할 관리 | ⬚ 미구현 |

#### OAuth 2.0 + JWT 인증 전환

```
[클라이언트] → POST /auth/login (credentials + MFA)
            ← { access_token (JWT, 15분), refresh_token (httpOnly cookie, 7일) }

[클라이언트] → GET /api/transactions (Authorization: Bearer <access_token>)
            ← { data: [...] }
```

- Access Token: 15분 만료, 메모리에만 저장 (XSS 방어)
- Refresh Token: 7일 만료, httpOnly + Secure + SameSite=Strict 쿠키
- Token Rotation: Refresh 사용 시 새 Token 발급 (탈취 감지)

#### 역할 기반 접근 제어(RBAC)

| 리소스 | SuperAdmin | 본사 관리자 | 대리점 | 가맹점 |
|--------|-----------|-----------|--------|--------|
| 전체 거래 조회 | ✅ | ✅ | 소속만 | 자기만 |
| 카드번호 (마스킹) | ✅ (전체) | ✅ (마스킹) | ❌ | ❌ |
| 정산 데이터 | ✅ | ✅ | 소속만 | 자기만 |
| 가맹점 등록 | ✅ | ✅ | ✅ | ❌ |
| 시스템 설정 | ✅ | ❌ | ❌ | ❌ |

### 6.4 데이터 보안

#### 암호화 대상

| 데이터 | 암호화 방식 | 키 관리 |
|--------|-----------|--------|
| 카드번호 | AES-256-GCM (필드 레벨) | HSM/KMS |
| 연락처 | AES-256-GCM | KMS |
| 비밀번호 | bcrypt/Argon2id (해싱) | N/A |
| 거래 금액 | 디스크 암호화 (TDE) | KMS |

#### 카드번호 처리 전략

```
즉시: 마스킹 검증 → 앞6뒤4 이외 절대 저장 불가
중기: 토큰화 도입 → PG 토큰만 저장, 카드번호 미통과
장기: PCI DSS 범위 축소 → 호스티드 결제 페이지 사용
```

### 6.5 API 보안

- **API Gateway**: 인증, Rate Limiting, 로깅, 라우팅 중앙 관리
- **Rate Limiting**: 로그인 5회/분, 조회 60회/분, 환불 10회/분
- **API Key**: 발급 시 1회만 표시, SHA-256 해시 저장, 90일 로테이션
- **보안 헤더**: CORS, CSP, HSTS, X-Content-Type-Options, X-Frame-Options

### 6.6 이상거래탐지(FDS)

#### Phase 1: 규칙 기반 (즉시)

| 규칙 | 임계값 | 행동 |
|------|--------|------|
| 동일 카드 반복 결제 | 5분 내 3회 | 차단 + 알림 |
| 고액 결제 | 단건 100만 원 초과 | 추가 인증 |
| 심야 결제 | 00:00~06:00 | 위험도 +30 |
| 결제 후 즉시 취소 반복 | 취소율 50% 초과 | 가맹점 경고 |
| 신규 가맹점 고액 | 가입 7일 내 일 500만 원 | 정산 홀드 |

#### Phase 2: 점수 기반 (3~6개월)

```
위험 점수 = 시간대 점수 + 금액 이상도 + 빈도 이상도 + 카드변경빈도 + 지역이상도

0~30: 정상 (자동 승인)     61~80: 경고 (추가 인증)
31~60: 주의 (모니터링)     81~100: 차단 (수동 확인)
```

### 6.7 가맹점 KYC 프로세스 — 구현 현황 매핑

```
Step 0: 준비 안내 (구현 ✅) → 필요 서류 체크리스트
Step 1: 본인인증 (구현 ✅) → NICE 휴대폰 인증 (팝업 방식)
Step 2: 사업자 검증 (구현 ✅) → 국세청 API 진위확인 + 휴폐업 조회
        신분증 OCR (구현 ✅) → Tesseract.js 이름/생년월일 추출
Step 3: 계좌 정보 (구현 ✅) → 은행/계좌번호/예금주 입력
        약관 동의 (구현 ✅) → 서비스/개인정보/마케팅 체크박스
Step 4: 완료 (구현 ✅) → 승인 대기 안내 + 앱 다운로드

미구현:
  - 계좌 인증 (1원 인증): ⬚
  - 자동 승인 vs 수동 승인 분기: ⬚ (백엔드 필요)
```

### 6.8 웹 스크래핑 → API 전환 전략

```
Phase 0 (즉시): 스크래핑 데이터 검증 로직 추가, 자격증명 환경변수 전환
Phase 1 (1~3개월): PayBlue 내부 API 발굴/요청, 테스트 환경 확보
Phase 2 (3~6개월): API + 스크래핑 병행 운영, 결과 비교 검증
Phase 3 (6~9개월): API 단독 운영, 스크래핑 코드 아카이브 및 폐기
```

> **결제 시스템에서 '나중에 하자'는 '사고가 나면 하겠다'와 같습니다.** 카드 데이터 처리와 자격증명 관리는 사고 시 법적 책임(과태료, 영업정지)과 직결됩니다.

---

## 7. 단계별 실행 로드맵

### Phase 1: 즉시 개선 (1~2개월) — "안정화와 기반 구축"

#### M1.1 보안 긴급 패치 (1주)
- [ ] 하드코딩 자격증명 제거 → `.env` 파일 + Secret Manager
- [ ] `.gitignore`에 `.env` 추가
- [ ] 카드번호 마스킹 검증/강제 로직 추가
- [ ] 로그 출력 시 민감정보 마스킹

#### M1.2 스크래핑 안정화 + 멱등성 (2주)
- [ ] 실행 전 해당 날짜 시트 존재 확인 → 있으면 업데이트 (중복 방지)
- [ ] `set_page_size_50` 안정화
- [ ] 재시도 데코레이터 추가 (최대 3회, 지수 백오프)
- [ ] 실행 결과 JSON 로그 (기계 파싱 가능)

#### M1.3 PayBlue API 탐색 및 검증 (2주) ⭐ 핵심 분기점
- [ ] Playwright Network 요청 캡처 → API 엔드포인트 추출
- [ ] 인증 토큰/쿠키 방식 분석
- [ ] `requests`/`httpx`로 API 직접 호출 PoC
- [ ] 스크래핑 결과 vs API 결과 비교 검증
- [ ] **API 가용성 보고서 작성 → Phase 2 방향 결정**

#### M1.4 모니터링 및 알림 (1주)
- [ ] Slack/카카오톡 자동화 실패 알림
- [ ] 실행 상태 대시보드 (간단한 웹 페이지 또는 Notion)
- [ ] 스크래핑 실패 시 5분 내 알림 수신

#### ✅ M1.5 가입 프론트엔드 구현 (완료)
- [x] Angular 19 Standalone Components 기반 프로젝트 생성
- [x] 5단계 멀티스텝 위저드 (Step 0~4) 전체 UI 구현
- [x] 회원유형별 분기 (사업자/개인 Step 2)
- [x] CSS Custom Properties 기반 디자인 토큰 시스템
- [x] 반응형 Mobile-First 레이아웃
- [x] NICE 본인인증 연동 (Mock + Real 분기)
- [x] 국세청 사업자등록번호 검증 API 연동
- [x] 신분증 OCR (Tesseract.js + 카메라 자동촬영)
- [x] 다음 우편번호 검색 연동
- [x] 공유 컴포넌트 8종 (pb-button, pb-stepper 등)
- [x] 유효성 검사 서비스 (이메일, 전화번호, 사업자번호 체크섬)
- [x] Angular Signals 기반 상태 관리
- [x] GPU 가속 애니메이션 (7종 키프레임)
- [x] Lazy loading 라우팅

### Phase 2: 핵심 기능 개선 (3~4개월) — "API 전환과 데이터 현대화"

#### M2.1 데이터베이스 구축 및 마이그레이션 (3주)
- [ ] PostgreSQL 인스턴스 생성
- [ ] 스키마 생성 (섹션 3.5 기반, `onboarding_applications` 테이블 확장 반영)
- [ ] `내역정리.xlsx` → DB 마이그레이션 스크립트
- [ ] `기본내역` 시트 수식 → DB 트리거/뷰 구현
- [ ] 마이그레이션 결과 검증 (행 수, 합계 100% 일치)

#### M2.2 백엔드 API 서버 구축 (4주) ⭐ 신규 추가
- [ ] NestJS 프로젝트 생성
- [ ] `POST /api/v1/onboarding/apply` — 가입 신청 접수 (프론트엔드 연동)
- [ ] `GET /api/v1/onboarding/:id/status` — 신청 상태 조회
- [ ] `POST /api/v1/nice/token` — NICE 인증 토큰 발급 프록시
- [ ] `GET /api/v1/nice/result` — NICE 인증 결과 조회
- [ ] 국세청 API 백엔드 프록시 (`/api/v1/nts/*`)
- [ ] JWT 인증 미들웨어
- [ ] 에러 핸들링 + 로깅

#### M2.3 API 기반 데이터 수집 전환 (3주)
- [ ] API 클라이언트 모듈 (인증, 요청, 에러 처리)
- [ ] 데이터 파이프라인: API → 정규화 → DB
- [ ] 스크래핑 폴백: API 실패 시 자동 전환
- [ ] 2주 병행 운영 + 결과 비교 → API 단독 전환

#### M2.4 PB코드 자동 등록 시스템 (2주)
- [ ] 미등록 PB코드 자동 감지 + 관리자 알림
- [ ] 관리자 승인 큐 (무분별한 자동 등록 방지)
- [ ] PB코드 매칭률 95%+ 달성

#### M2.5 보고서 시스템 현대화 (2주)
- [ ] DB 기반 실시간 보고서 API
- [ ] Excel Export (기존 형태 100% 호환)
- [ ] 대시보드 위젯 (일일/주간/월간 요약)

#### M2.6 프론트엔드 보강 (2주) ⭐ 신규 추가
- [ ] `submitApplication()` 실제 API 연동
- [ ] Route Guard 추가 (단계 스킵 방지)
- [ ] HTTP Interceptor 추가 (에러 처리, 인증)
- [ ] 단위 테스트 작성 (80%+ 커버리지)
- [ ] 1원 계좌인증 연동 (Step 3)

### Phase 3: 고도화 및 확장 (5~6개월) — "사용자 경험 혁신"

#### ~~M3.1 회원가입 UX 현대화 (3주)~~ ✅ 완료 (Phase 1에서 선행 구현)
- [x] ~~4단계~~ 5단계 스텝 위저드 구현 (Angular Standalone Components)
- [x] 반응형 레이아웃 (Mobile-First)
- [x] 사업자등록번호 국세청 API 연동
- [x] 파일 업로드 + 카메라 촬영 지원 (자동감지 포함)

#### M3.2 관리자 대시보드 실시간화 (3주)
- [ ] 실시간 거래 현황, 차트, KPI 위젯
- [ ] 온보딩 관리 (원클릭 승인/반려)
- [ ] 거래 데이터 반영 지연 < 5분

#### M3.3 가맹점 셀프서비스 포털 (2주)
- [ ] 가맹점 전용 로그인 + 거래내역/정산 조회
- [ ] Row-Level Security로 데이터 격리
- [ ] 관리자 문의 30% 감소 목표

#### M3.4 스크래핑 완전 폐기 (1주)
- [ ] 4주 연속 API 100% 정상 운영 확인
- [ ] 스크래핑 코드 아카이브 + 제거
- [ ] 운영 문서 업데이트

### 의존성 그래프 (업데이트)

```
Phase 1                    Phase 2                       Phase 3
────────                   ────────                      ────────

M1.1 (보안) ──────────────────────────────────────────────────────>
M1.2 (안정화) ─────────────────────────────────────────────────────>
M1.3 (API탐색) ──→ M2.3 (API전환) ──→ M3.4 (스크래핑폐기)
M1.4 (모니터링) ──>       │
M1.5 (가입FE) ✅──→ M2.2 (백엔드) ──→ M2.6 (FE보강) ──→ M3.2 (대시보드)
                         │                                │
                         ▼                                ▼
                   M2.1 (DB구축) ──→ M2.4 (PB코드) ──→ M3.3 (셀프서비스)
                         │
                         ▼
                   M2.5 (보고서)
```

---

## 8. 리소스 계획

### 8.1 팀 구성

| 역할 | 인원 | 담당 영역 | 투입 시기 |
|------|------|----------|----------|
| 풀스택 개발자 (리드) | 1명 | 백엔드 API, DB, 데이터 파이프라인 | Phase 1~3 전체 |
| 프론트엔드 개발자 | 0.5~1명 | Angular UI, 반응형 디자인, 접근성 | Phase 2~3 |
| 기획/QA | 0.5명 | 요구사항, 테스트, 사용자 피드백 | Phase 1~3 전체 |

### 8.2 예상 공수

| Phase | 기간 | 핵심 작업 | 예상 공수 |
|-------|------|----------|----------|
| Phase 1 | 1~2개월 | 보안, 안정화, API 탐색, 모니터링, **가입 FE ✅** | 25~30 인일 |
| Phase 2 | 3~4개월 | **백엔드 구축**, DB, API 전환, PB코드, 보고서, FE 보강 | 40~50 인일 |
| Phase 3 | 5~6개월 | ~~UX 현대화~~, 대시보드, 셀프서비스 | 30~40 인일 |
| **합계** | **6개월** | | **95~120 인일** |

> **참고**: Phase 3의 M3.1(회원가입 UX)이 Phase 1에서 선행 완료되어, Phase 3 공수가 약 3주 감소 예상.

---

## 9. KPI 및 성과 지표

### 9.1 가입/온보딩 KPI

| KPI | 현행 | Phase 1 | Phase 2 | Phase 3 |
|-----|------|---------|---------|---------|
| 가입 완료율 | ~60% | 65% (FE 완료 ✅) | 75% | **85%** |
| 가입 소요 시간 | 15분+ | 12분 (FE 완료 ✅) | 8분 | **5분** |
| 가입→PB코드 할당 | 수동 1~3일 | 수동 1일 | 반자동 4시간 | **자동 즉시** |
| 모바일 가입 비율 | 매우 낮음 | 가능 (반응형 ✅) | 30% | **50%** |

### 9.2 운영 KPI

| KPI | 현행 | Phase 1 | Phase 2 | Phase 3 |
|-----|------|---------|---------|---------|
| PB코드 매칭률 | ~32% | 40% | 90% | **95%+** |
| 자동화 성공률 | ~95% | 99% | 99.5% | **99.9%** |
| 데이터 수집 시간 | 30초~2분 | 15초 | <5초 | **<2초** |
| 보고서 생성 | 수동+2분 | 자동+1분 | 실시간 | **실시간** |
| 관리자 문의 | 기준선 | -10% | -30% | **-50%** |

### 9.3 기술/보안 KPI

| KPI | 현행 | 목표 |
|-----|------|------|
| 코드 내 평문 시크릿 | 2건 | **0건** |
| 테스트 커버리지 | 0% | **80%+** |
| 중복 실행 데이터 정합성 | 미보장 | **100% 보장** |
| 평균 장애 복구 시간 (MTTR) | 수동 확인 | **<15분** |
| Lighthouse 점수 | 미측정 | **90+** |

---

## 10. 리스크 분석 및 대응

### 10.1 위험 레지스터

| # | 위험 | 확률 | 영향 | 완화 전략 | 조기 경보 |
|---|------|------|------|----------|----------|
| R1 | **PayBlue API 접근 불가** | 중간 | 높음 | Network 탭 리버스엔지니어링, 스크래핑 고도화 | Phase 1.3 종료 시점 |
| R2 | **Excel→DB 마이그레이션 데이터 불일치** | 중간 | 높음 | 병행 운영 4주, 자동 비교 테스트 | 마이그레이션 직후 |
| R3 | **팀 규모로 일정 초과** | 높음 | 중간 | Phase 3 범위 축소, 핵심(1~2)에 집중 | 월별 진행률 체크 |
| R4 | **사용자 변경 저항** | 낮음 | 중간 | Excel Export 유지, 점진적 전환, A/B 테스트 | 사용자 피드백 |
| R5 | **PayBlue UI 변경으로 스크래핑 마비** | 중간 | 높음 | API 전환 가속, 셀렉터 모듈화 | PrimeNG 버전 감지 |
| R6 | **보안 사고 (평문 비밀번호 노출)** | 낮음 | 매우 높음 | **Phase 1.1 즉시 실행** | 코드 리뷰 즉시 |

### 10.2 되돌림 신호 (Reversal Signals)

다음 상황 발생 시 전략을 재검토합니다:
- Phase 1.3 완료 후 2주 내 API 접근 방법 미확보
- DB 마이그레이션 후 Excel과의 불일치율 5% 초과
- 동시 3개 이상 마일스톤 병행 필요 상황
- 사용자 "기존이 더 편했다" 피드백 30% 초과

### 10.3 복구 계획 (Fallback)

1. **스크래핑은 항상 유지** — API 전환 완료 확인 전까지 폴백으로 운영
2. **API 직접 추가 불가 시** — Angular 프론트엔드의 HTTP 요청 리버스엔지니어링으로 동일 API 직접 호출
3. **Excel Export 영구 유지** — DB 전환 후에도 기존 형태 Excel 출력 기능 보존

---

## 11. 부록

### 11.1 결정 기록 (Decision Log)

| # | 결정 | 이유 | 대안 | 되돌림 신호 |
|---|------|------|------|-----------|
| D1 | 하이브리드 전환 (Option B) | 근본 해결 + 현실적 일정 | A(패치), C(리빌드) | API 2주 내 불가 |
| D2 | PostgreSQL 선택 | ACID, RLS, 결제 시스템 적합 | SQLite, MongoDB | 데이터 불일치 5% 초과 |
| D3 | Angular 19 유지 (리빌드 안함) | 기존 투자 보존, 팀 역량 | React/Next.js 전환 | Angular EOL 발표 |
| D4 | NestJS 백엔드 | Angular과 동일 패턴, 학습 비용 최소 | FastAPI, Express | 팀 역량 변경 |
| D5 | Excel Export 영구 유지 | 사용자 의존도 높음 | DB 전용 대시보드 | 사용률 10% 미만 |
| D6 | 스크래핑 폴백 유지 | API 안정성 검증 전 안전망 | 즉시 폐기 | API 4주 연속 100% |
| D7 | **5단계 위저드 (기획 4단계→5단계)** | **준비 안내(Step 0) 추가로 서류 미비 방지** | **4단계 유지** | **Step 0 이탈률 높음** |
| D8 | **회원유형별 Step 2 분기** | **사업자/개인 필수 정보 차이** | **단일 Step 2** | **분기 유지보수 비용** |
| D9 | **커스텀 디자인 시스템 (PrimeNG 미사용)** | **경량화, 브랜드 일관성** | **PrimeNG 19 도입** | **컴포넌트 부족 시** |
| D10 | **Tesseract.js 클라이언트 OCR** | **서버 비용 없음, 개인정보 서버 미전송** | **서버 OCR API** | **인식률 부족 시** |

### 11.2 가정 목록 (Assumptions)

| # | 가정 | 검증 방법 | 틀릴 경우 영향 |
|---|------|----------|---------------|
| A1 | PayBlue 백엔드에 REST API 존재 또는 추가 가능 | Phase 1.3 Network 분석 | 일정 2주 지연, 리버스엔지니어링 |
| A2 | 153개 PB코드가 전체 목록 | 실제 거래 대조 | 동적 추가 기능 필요 |
| A3 | 일일 거래량 500건 미만 유지 | 월별 추이 모니터링 | DB 인덱스 전략 조정 |
| A4 | 페이백 비율 4% 고정 | 비즈니스팀 확인 | 설정 가능한 비율 테이블 필요 |
| A5 | 1~2명으로 Phase 2까지 완료 가능 | 월별 번다운 차트 | Phase 3 축소 또는 인력 추가 |
| A6 | **국세청 API가 사업자명/대표자명을 반환** | **API 응답 확인** | **사용자 직접 입력 필요 (현재 상태)** |
| A7 | **NICE 본인인증 백엔드가 별도 운영됨** | **인프라 확인** | **NestJS에 NICE 토큰 발급 포함 필요** |

### 11.3 열린 질문 (Open Questions)

- [x] ~~가맹점 가입 시 사업자등록번호 실시간 검증 API 사용 가능한가?~~ → ✅ 국세청 API 연동 완료 (진위확인+휴폐업 조회). 단, **사업자명/대표자명은 API 미제공** → 사용자 직접 입력 또는 별도 데이터 필요
- [ ] PayBlue 관리 시스템의 백엔드 API 문서가 존재하는가?
- [ ] PB코드 자동 생성 규칙은? (수동/자동 할당)
- [ ] 기본내역 시트 153개 외 추가 PB코드 필요 가능성은?
- [ ] 페이백 4%는 고정인가, 가맹점/대리점별 차등인가?
- [ ] OneDrive 동기화 대상자는 누구이며, DB 전환 시에도 필요한가?
- [ ] 금토일 그룹 열 숨김 로직의 비즈니스 의미는?
- [ ] 카드번호가 현재 마스킹된 형태로 표시되는지, 전체 PAN인지?
- [ ] **NICE 본인인증 실서비스 계약 및 백엔드 환경은?** (현재 mock 동작 중)
- [ ] **계좌 인증(1원 인증) 서비스 연동 계획은?**

---

> **이 기획서는 풀스택 개발자, 시스템 기획자, 반응형 웹 디자이너, 결제 도메인 전문가 4명의 독립적 분석을 종합한 결과입니다.**
> **2026-03-20 업데이트: 프론트엔드 구현 현황을 반영하여 기획서를 최신화하였습니다.**
>
> **현재 진행 상황 요약:**
> - ✅ **가입 프론트엔드 100% 구현 완료** (Phase 3 M3.1 선행 완료)
> - ⬚ **다음 단계: 백엔드 API 서버 구축** (NestJS + PostgreSQL)
>
> **가장 시급한 3가지 행동:**
> 1. **즉시**: NestJS 백엔드 구축 + `POST /api/v1/onboarding/apply` API 구현 (프론트엔드 연동)
> 2. **2주 내**: PostgreSQL 스키마 생성 + NICE 본인인증 백엔드 프록시
> 3. **1개월 내**: Route Guard + HTTP Interceptor + 테스트 80%+ 달성
>
> Phase 1.3(API 탐색)의 결과가 전체 프로젝트 방향을 결정하는 **핵심 분기점**입니다.
