import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SignupService } from '../../../shared/services/signup.service';

@Component({
  selector: 'app-step3-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="step-container">
      <div class="step-header">
        <h2 class="step-title">정산계좌 설정</h2>
        <p class="step-description">정산 계좌 정보와 약관 동의를 완료해 주세요.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="step-form">
        <!-- 정산 계좌 섹션 -->
        <fieldset class="form-section">
          <div class="account-notice">
            <span class="material-symbols-rounded account-notice-icon">info</span>
            <p class="account-notice-text">
              가입자와 예금주는 동일인만 가능합니다.<br/>
              계좌가 준비되지 않으셨으면 고객센터나 앱 내에서<br/>
              정산정보 등록을 다시 해주세요.
            </p>
          </div>

          <div class="form-field">
            <label for="bankName" class="form-label">
              은행
            </label>
            <select
              id="bankName"
              formControlName="bankName"
              class="form-select"
              [class.error]="isFieldInvalid('bankName')"
              [class.placeholder]="!form.get('bankName')?.value"
            >
              <option value="" disabled>은행을 선택하세요</option>
              @for (bank of banks; track bank) {
                <option [value]="bank">{{ bank }}</option>
              }
            </select>
            <div class="field-feedback"></div>
          </div>

          <div class="form-field">
            <label for="accountNumber" class="form-label">
              계좌번호
            </label>
            <input
              id="accountNumber"
              type="text"
              formControlName="accountNumber"
              class="form-input"
              [class.error]="isFieldInvalid('accountNumber')"
              placeholder="'-' 없이 숫자만 입력"
              inputmode="numeric"
            />
            <div class="field-feedback">
              @if (isFieldInvalid('accountNumber') && form.get('accountNumber')?.errors?.['pattern']) {
                <span class="hint error">숫자만 입력해 주세요.</span>
              }
            </div>
          </div>

          <div class="form-field">
            <label for="accountHolder" class="form-label">
              예금주
            </label>
            <input
              id="accountHolder"
              type="text"
              formControlName="accountHolder"
              class="form-input"
              [class.error]="isFieldInvalid('accountHolder')"
              placeholder="예금주명을 입력하세요"
            />
            <div class="field-feedback"></div>
          </div>
        </fieldset>

        <!-- 약관 동의 섹션 -->
        <fieldset class="form-section">
          <label class="checkbox-item checkbox-all">
            <input type="checkbox" [checked]="allChecked()" (change)="toggleAll($event)" />
            <span class="checkbox-box">
              @if (allChecked()) {
                <span class="material-symbols-rounded checkbox-icon">check</span>
              }
            </span>
            <span class="checkbox-text">전체 동의</span>
          </label>

          <div class="checkbox-divider"></div>

          <label class="checkbox-item">
            <input type="checkbox" formControlName="agreeTerms" />
            <span class="checkbox-box" [class.checked]="form.get('agreeTerms')?.value">
              @if (form.get('agreeTerms')?.value) {
                <span class="material-symbols-rounded checkbox-icon">check</span>
              }
            </span>
            <span class="checkbox-text">
              <span class="required-badge">필수</span>
              페이블루 서비스 이용약관에 동의합니다
            </span>
            <button type="button" class="checkbox-detail" (click)="openTermsModal('terms', $event)">보기</button>
          </label>

          <label class="checkbox-item">
            <input type="checkbox" formControlName="agreePrivacy" />
            <span class="checkbox-box" [class.checked]="form.get('agreePrivacy')?.value">
              @if (form.get('agreePrivacy')?.value) {
                <span class="material-symbols-rounded checkbox-icon">check</span>
              }
            </span>
            <span class="checkbox-text">
              <span class="required-badge">필수</span>
              개인정보 수집 및 이용에 동의합니다
            </span>
            <button type="button" class="checkbox-detail" (click)="openTermsModal('privacy', $event)">보기</button>
          </label>

          <label class="checkbox-item">
            <input type="checkbox" formControlName="agreeMarketing" />
            <span class="checkbox-box" [class.checked]="form.get('agreeMarketing')?.value">
              @if (form.get('agreeMarketing')?.value) {
                <span class="material-symbols-rounded checkbox-icon">check</span>
              }
            </span>
            <span class="checkbox-text">
              <span class="optional-badge">선택</span>
              마케팅 정보 수신에 동의합니다
            </span>
            <button type="button" class="checkbox-detail" (click)="openTermsModal('marketing', $event)">보기</button>
          </label>

          <div class="field-feedback">
            @if (form.get('agreeTerms')?.touched && !form.get('agreeTerms')?.value) {
              <span class="hint error">페이블루 서비스 이용약관에 동의해 주세요.</span>
            }
            @if (form.get('agreePrivacy')?.touched && !form.get('agreePrivacy')?.value) {
              <span class="hint error">개인정보 수집 및 이용에 동의해 주세요.</span>
            }
          </div>
        </fieldset>

        <!-- 약관 보기 모달 -->
        @if (termsModalOpen()) {
          <div class="terms-overlay" (click)="closeTermsModal()">
            <div class="terms-modal pb-animate-fadeIn" (click)="$event.stopPropagation()">
              <div class="terms-modal-header">
                <h3 class="terms-modal-title">{{ termsModalTitle() }}</h3>
                <button type="button" class="terms-modal-close" (click)="closeTermsModal()">
                  <span class="material-symbols-rounded">close</span>
                </button>
              </div>
              <div class="terms-modal-body">
                <pre class="terms-content">{{ termsModalContent() }}</pre>
              </div>
              <div class="terms-modal-footer">
                <button type="button" class="terms-modal-btn" (click)="closeTermsModal()">확인</button>
              </div>
            </div>
          </div>
        }

        <!-- 버튼 -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="goBack()">이전</button>
          <button type="submit" class="btn btn-primary" [disabled]="!canProceed() || submitting()">
            @if (submitting()) {
              <span class="spinner"></span> 제출 중...
            } @else {
              가입 신청
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .step-container {
      max-width: var(--pb-container-sm);
      margin: 0 auto;
      padding: var(--pb-space-5) var(--pb-space-4);
    }
    .step-header { margin-bottom: var(--pb-space-5); }
    .step-title {
      font-size: var(--pb-text-2xl);
      font-weight: var(--pb-weight-bold);
      color: var(--pb-gray-900);
      margin: 0 0 var(--pb-space-1);
    }
    .step-description {
      font-size: var(--pb-text-sm);
      color: var(--pb-gray-500);
      margin: 0;
      word-break: keep-all;
      line-height: var(--pb-leading-normal);
    }
    .step-form {
      display: flex;
      flex-direction: column;
      gap: var(--pb-space-5);
    }
    .form-section { border: none; padding: 0; margin: 0; }
    .section-title {
      font-size: var(--pb-text-lg);
      font-weight: var(--pb-weight-semibold);
      color: var(--pb-gray-800);
      margin-bottom: var(--pb-space-3);
      padding-bottom: var(--pb-space-2);
      border-bottom: 1px solid var(--pb-gray-200);
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--pb-space-1);
      margin-bottom: var(--pb-space-3);
    }
    .form-field:last-child { margin-bottom: 0; }
    .form-label {
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-medium);
      color: var(--pb-gray-700);
    }
    .required { color: var(--pb-error-500); }

    .account-notice {
      display: flex;
      align-items: flex-start;
      gap: var(--pb-space-2);
      padding: var(--pb-space-3) var(--pb-space-4);
      background: var(--pb-gray-50);
      border: 1px solid var(--pb-gray-200);
      border-radius: var(--pb-radius-md);
      margin-bottom: var(--pb-space-4);
    }
    .account-notice-icon {
      font-size: 20px;
      color: var(--pb-primary-400);
      flex-shrink: 0;
      margin-top: 2px;
    }
    .account-notice-text {
      margin: 0;
      font-size: var(--pb-text-sm);
      color: var(--pb-gray-700);
      line-height: var(--pb-leading-loose);
      word-break: keep-all;
    }

    .form-input,
    .form-select {
      width: 100%;
      min-height: 44px;
      padding: var(--pb-space-2) var(--pb-space-3);
      border: 1.5px solid var(--pb-gray-200);
      border-radius: var(--pb-radius-md);
      font-size: var(--pb-text-base);
      font-family: var(--pb-font-primary);
      color: var(--pb-gray-900);
      background: #fff;
      transition: border-color var(--pb-duration-fast) var(--pb-ease-out),
                  box-shadow var(--pb-duration-fast) var(--pb-ease-out);
      box-sizing: border-box;
    }
    .form-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7A90' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 40px;
    }
    .form-select.placeholder { color: var(--pb-gray-400); }
    .form-input::placeholder { color: var(--pb-gray-400); }
    .form-input:focus,
    .form-select:focus {
      outline: none;
      border-color: var(--pb-primary-400);
      box-shadow: 0 0 0 3px var(--pb-primary-50);
    }
    .form-input.error,
    .form-select.error {
      border-color: var(--pb-error-500);
      background: var(--pb-error-50);
    }
    .field-feedback { min-height: 0; }
    .hint {
      font-size: var(--pb-text-xs);
      display: flex;
      align-items: center;
      gap: var(--pb-space-1);
      word-break: keep-all;
    }
    .hint.error { color: var(--pb-error-500); }
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* 체크박스 */
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: var(--pb-space-2);
      padding: var(--pb-space-2) 0;
      cursor: pointer;
      user-select: none;
    }
    .checkbox-item input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .checkbox-box {
      width: 20px;
      height: 20px;
      border: 2px solid var(--pb-gray-300);
      border-radius: var(--pb-radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all var(--pb-duration-fast) var(--pb-ease-out);
    }
    .checkbox-item input:checked + .checkbox-box,
    .checkbox-box.checked {
      background: var(--pb-primary-500);
      border-color: var(--pb-primary-500);
    }
    .checkbox-icon { font-size: 16px; color: #fff; font-weight: bold; }
    .checkbox-text {
      flex: 1;
      font-size: var(--pb-text-sm);
      color: var(--pb-gray-700);
      display: flex;
      align-items: center;
      gap: var(--pb-space-2);
      word-break: keep-all;
      line-height: var(--pb-leading-normal);
    }
    .checkbox-all .checkbox-text {
      font-weight: var(--pb-weight-semibold);
      color: var(--pb-gray-900);
      font-size: var(--pb-text-base);
    }
    .checkbox-divider {
      height: 1px;
      background: var(--pb-gray-200);
      margin: var(--pb-space-1) 0;
    }
    .required-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: var(--pb-radius-sm);
      font-size: 11px;
      font-weight: var(--pb-weight-semibold);
      background: var(--pb-primary-50);
      color: var(--pb-primary-600);
    }
    .optional-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: var(--pb-radius-sm);
      font-size: 11px;
      font-weight: var(--pb-weight-semibold);
      background: var(--pb-gray-100);
      color: var(--pb-gray-500);
    }
    .checkbox-detail {
      background: none;
      border: none;
      color: var(--pb-gray-400);
      font-size: var(--pb-text-xs);
      cursor: pointer;
      text-decoration: underline;
      padding: var(--pb-space-1);
      font-family: var(--pb-font-primary);
    }
    .checkbox-detail:hover { color: var(--pb-primary-500); }

    /* 버튼 */
    .form-actions {
      display: flex;
      justify-content: space-between;
      gap: var(--pb-space-3);
      padding-top: var(--pb-space-2);
    }
    .btn {
      min-height: 44px;
      padding: var(--pb-space-2) var(--pb-space-6);
      border: none;
      border-radius: var(--pb-radius-md);
      font-size: var(--pb-text-base);
      font-weight: var(--pb-weight-semibold);
      font-family: var(--pb-font-primary);
      cursor: pointer;
      transition: background var(--pb-duration-fast) var(--pb-ease-out),
                  opacity var(--pb-duration-fast) var(--pb-ease-out);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--pb-space-2);
    }
    .btn-primary { background: var(--pb-primary-500); color: #fff; flex: 1; }
    .btn-primary:hover:not(:disabled) { background: var(--pb-primary-600); }
    .btn-secondary {
      background: var(--pb-gray-100);
      color: var(--pb-gray-600);
      border: 1.5px solid var(--pb-gray-200);
    }
    .btn-secondary:hover { background: var(--pb-gray-200); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* 약관 모달 */
    .terms-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--pb-space-4);
    }
    .terms-modal {
      background: #fff;
      border-radius: var(--pb-radius-lg);
      width: 100%;
      max-width: 600px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }
    .terms-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--pb-space-5) var(--pb-space-6);
      border-bottom: 1px solid var(--pb-gray-200);
      flex-shrink: 0;
    }
    .terms-modal-title {
      font-size: var(--pb-text-lg);
      font-weight: var(--pb-weight-semibold);
      color: var(--pb-gray-900);
      margin: 0;
    }
    .terms-modal-close {
      background: none;
      border: none;
      color: var(--pb-gray-400);
      cursor: pointer;
      padding: var(--pb-space-1);
      border-radius: var(--pb-radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color var(--pb-duration-fast) var(--pb-ease-out),
                  background var(--pb-duration-fast) var(--pb-ease-out);
    }
    .terms-modal-close:hover {
      color: var(--pb-gray-600);
      background: var(--pb-gray-100);
    }
    .terms-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: var(--pb-space-6);
    }
    .terms-content {
      font-size: var(--pb-text-sm);
      line-height: 1.8;
      color: var(--pb-gray-700);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--pb-font-primary);
      margin: 0;
    }
    .terms-modal-footer {
      padding: var(--pb-space-4) var(--pb-space-6);
      border-top: 1px solid var(--pb-gray-200);
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
    }
    .terms-modal-btn {
      min-height: 40px;
      padding: var(--pb-space-2) var(--pb-space-6);
      background: var(--pb-primary-500);
      color: #fff;
      border: none;
      border-radius: var(--pb-radius-md);
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-semibold);
      font-family: var(--pb-font-primary);
      cursor: pointer;
      transition: background var(--pb-duration-fast) var(--pb-ease-out);
    }
    .terms-modal-btn:hover { background: var(--pb-primary-600); }

    @media (max-width: 640px) {
      .step-container { padding: var(--pb-space-4) var(--pb-space-3); }
      .step-header { margin-bottom: var(--pb-space-3); }
      .step-title { font-size: var(--pb-text-xl); }
      .step-form { gap: var(--pb-space-4); }
      .section-title { margin-bottom: var(--pb-space-2); padding-bottom: var(--pb-space-2); font-size: var(--pb-text-base); }
      .form-field { margin-bottom: var(--pb-space-2); }
      .form-actions { flex-direction: column-reverse; }
      .btn { width: 100%; }
      .checkbox-text { flex-wrap: wrap; }
      .terms-modal {
        max-height: 90vh;
        border-radius: var(--pb-radius-md);
      }
      .terms-modal-header { padding: var(--pb-space-3); }
      .terms-modal-body { padding: var(--pb-space-3); }
      .terms-modal-footer { padding: var(--pb-space-3); }
    }
  `]
})
export class Step3PaymentComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly signupService = inject(SignupService);
  private readonly destroy$ = new Subject<void>();

  readonly submitting = this.signupService.isSubmitting;

  readonly banks = [
    '국민은행', '신한은행', '하나은행', '우리은행', '농협은행',
    'SC제일은행', '씨티은행', '기업은행', '카카오뱅크', '토스뱅크',
    '케이뱅크', '수협은행', '대구은행', '부산은행', '경남은행',
    '광주은행', '전북은행', '제주은행', '새마을금고', '신협',
    '우체국', '산업은행',
  ];

  readonly form: FormGroup = this.fb.group({
    bankName: [''],
    accountNumber: ['', [Validators.pattern('^[0-9]+$')]],
    accountHolder: [''],
    agreeTerms: [false, [Validators.requiredTrue]],
    agreePrivacy: [false, [Validators.requiredTrue]],
    agreeMarketing: [false],
  });

  readonly termsModalOpen = signal(false);
  readonly termsModalTitle = signal('');
  readonly termsModalContent = signal('');

  readonly allChecked = computed(() => {
    const terms = this.form.get('agreeTerms')?.value;
    const privacy = this.form.get('agreePrivacy')?.value;
    const marketing = this.form.get('agreeMarketing')?.value;
    return terms && privacy && marketing;
  });

  private readonly termsText: Record<string, { title: string; content: string }> = {
    terms: {
      title: '페이블루 서비스 이용약관',
      content: `KSPAY 전자지불대행서비스 표준계약서 서비스이용자 (이하 '갑'이라 한다.)와 주식회사 케이에스넷(이하 '을'이라 한다.)은 '을'이 제공하는 KSPAY전자지불대행 서비스(이하 'KSPAY서비스'라 한다.) 이용에 관한 계약을 아래와 같이 체결한다.

제1장 총 칙

제1조 목적
본 계약의 목적은 '갑'이 운영하는 통신판매 또는 전자상거래 쇼핑몰(이하 '온라인쇼핑몰'이라 한다.)에 '을'이 KSPAY서비스를 제공하고, '갑'이 이용함에 있어서의 서비스 조건 및 절차 등 제반사항을 정하는데 있다.

제2조 서비스의 종류
1. '을'이 '갑'에게 제공하는 KSPAY서비스의 종류는 다음 각 호와 같다.
가. 신용카드 서비스
나. 가상계좌 서비스
다. 계좌이체 서비스
라. 전자화폐 서비스
마. 인증 서비스 (신용카드본인확인, 성명인증, 휴대폰인증 등)
2. '을'은 '갑'과 제1항 이외의 서비스에 대하여 별도 합의 하에 추가로 제공할 수 있다.
3. '을'이 제공하는 KSPAY서비스 종류 및 내용은 '을'의 사정에 따라 변경될 수 있으며, '을'은 '갑'에게 변경내용을 15일전까지 사전 통지하여야 한다.
4. '갑'이 이용 계약하는 KSPAY서비스의 종류는 [별첨1]에 표기한 바에 따른다.

제3조 용어의 정의
1. 본 계약에 공통적으로 적용되는 용어의 정의는 다음과 같다.
가. 전자지불시스템 : '갑'에게 KSPAY서비스를 제공하기 위하여 '을'이 운영하는 시스템을 말한다.
나. 이용자 : '갑'이 운영하는 온라인쇼핑몰에서 상품 및 서비스를 구매하고, '을'이 제공하는 KSPAY서비스를 이용하여 해당 금액을 결제하는 자로서 각 결제수단의 실제 소유자를 말한다.
다. 결제수단 : '을'이 제공하는 KSPAY서비스상의 결제종류로서 신용카드, 가상계좌, 계좌이체, 전자화폐, 휴대폰, ARS, 기타 결제 가능한 결제종류 등을 말한다.
라. 결제정보 : 이용자가 '갑'의 상품 및 서비스를 구매하기 위하여 '을'의 KSPAY서비스를 통해 제시한 각 결제수단별 제반정보를 말하며 본 조 제2항부터 제5항의 제1호에 따른다.
마. 결제기관 : 이용자가 제시한 결제정보를 승인 처리하는 기관으로서 각 결제수단별로 해당되는 신용카드사, 은행, 전자화폐사, 기타 결제수단의 승인기관을 말한다.
바. 거래승인 : 상품 및 서비스를 구매하기 위하여 이용자가 제시한 결제정보를 결제기관으로 전송하여 해당 기관으로부터 해당 거래의 유효성 여부를 판단 받는 것을 말한다.
사. 판매대금 : '갑'의 온라인쇼핑몰에서 일정기간동안 '을'의 KSPAY서비스를 이용하여 발생한 판매내역의 합계 금액을 말한다.
아. 결제대금 : '갑'과 '을'간의 정산을 통하여 '을'이 '갑'에게 지급하는 대금을 말한다.
자. 대금지급요청 : '갑'의 판매대금을 '을'이 '갑'을 대행하여 결제기관으로 대금지급을 요청하는 행위를 말한다.
차. 정산 : 결제기관으로부터 지급 받은 '갑'의 온라인쇼핑몰 판매내역에 대한 판매대금을 '을'이 결제기관의 제수수료 및 '을'의 제수수료를 공제하여 '갑'에게 지급하는 행위를 말한다.

제4조 서비스 제공 시간
1. '을'은 '갑'에게 연중무휴 1일 24시간 서비스 제공함을 원칙으로 한다. 다만 가상계좌 서비스 및 계좌이체 서비스 등은 연중 무휴 은행서비스가 가능한 시간에 제공하는 것을 원칙으로 하며, 해당 결제기관의 업무환경에 따라 제공시간을 달리 할 수 있다.
2. '을'의 전자지불시스템 정기점검 및 유지보수, 결제기관 또는 통신회사의 시스템 정기점검 및 유지보수 등 업무상 또는 기술상의 이유로 서비스 중단이 불가피 할 경우에는 '을'의 사전 또는 사후 통지로써 서비스를 일시 중지할 수 있다.

제5조 서비스 제공 중지
1. '을'은 '갑'이 다음 각 호에 해당하는 경우 서비스 제공을 중지할 수 있다.
가. 본 계약 또는 관계법규를 위반하여 '을'에게 업무적, 기술적으로 지장을 초래하는 경우
나. '갑'이 판매하는 상품 및 서비스에 하자가 있는 경우
다. 서비스 이용요금 및 기타 '을'에게 지급하여야 할 비용 등의 지급을 불이행하는 경우
라. '갑'의 고의 또는 과실로 상점정보를 변경조치 또는 변경내용을 '을'에게 통지하지 않은 경우
마. '갑'의 이용자에 대한 배송지연이 과다하게 발생하거나 지속적으로 발생하는 경우

제6조 서비스 이용요금
1. 서비스 이용요금은 가입비와 년관리비, KSPAY수수료, 결제기관부가 수수료로 구분되며, 세부내용은 [별첨1] 서비스 이용요금표에 따른다.
2. 가입비 및 년관리비는 시스템 등록 등 가입신청에 소요되는 실비로서 '갑'은 KSPAY서비스 가입 시 KSPAY 홈페이지상 명기된 가상계좌, 신용카드 결제로 기한 내에 납부하여야 한다.

제7조 상점정보 변경
1. '갑'은 자신의 주소 또는 연락처, 대표이사 변경 등 상점정보 변경이 있는 경우 즉시 '을'에게 해당 변경 내용을 통지하거나 또는 '을'의 전자지불시스템내에서 해당 상점정보를 변경하여야 한다.

제8조 상점ID 관리책임
'을'이 '갑'에게 발급한 상점ID와 비밀번호 등의 관리에 대한 모든 책임은 전적으로 '갑'이 부담한다.

제9조 배송
1. '갑'은 거래승인 건에 대하여 거래승인일로부터 7일 이내에 구매자에게 해당 상품이 인도될 수 있도록 배송의 책임을 지며, 배송이 완료된 거래는 즉시 '을'에게 데이터로 전송하여야 한다.

제10조 정산
1. '을'은 결제기관으로부터 '갑'의 온라인쇼핑몰 판매내역에 대한 판매대금을 지급 받으면 '갑'과 상호 합의한 정산주기 단위로 서비스 이용요금을 공제한 금액을 '갑'에게 지급한다.

<서비스 이용의무 및 준수사항>
본 안내는 가맹점(서비스 이용회원)이 준수하여야 할 사항중 특히 주의하여야 할 중요사항을 선별하여 알려 드리는 것이므로, 이 외에도 "여신전문금융업법령", "신용카드 가맹점 표준약관", 여신금융협회 홈페이지의 가맹점 관련 안내사항을 참고하시기 바랍니다.

<준수사항>
1. 신용카드 거래시 본인 확인 의무
2. 고액승인(30만원이상) 발생시 구매자(카드회원) 연락처 확인 및 영수증발행 의무
3. 가장거래, 위장가맹점 등을 통한 불법자금융통과 그 중개 알선, 가맹점 명의 대여 및 신용카드 거래 대행 금지
4. 카드매출 취소요청은 당일 10:00 ~ 18:00에 할 수 있다.
5. 관리비, 부가서비스 등 계약자가 출금 동의한 수수료 연체시에는 차기 결제대금에서 차감하여 정산 할 수 있다.
6. 매년 5월 종합소득세를 신고/납부할 의무가 있으며, 세금관련 부분에 대한 문제시 회사는 결제수단만을 제공하는 사업자로써 어떠한 책임도 지지 아니한다.
7. 서비스 이용후의 단순변심 철회는 불가하며, 이용전 개통철회는 15일 이내 가능하다.`,
    },
    privacy: {
      title: '개인정보 수집 및 이용동의',
      content: `<개인정보 제공 및 활용 동의>, <개인정보의 수집 및 이용에 대한 안내>

페이블루 서비스 제공사인 ㈜블루티에프(이하 "회사")는 정보통신망 이용촉진 및 정보보호 등에 관한 법률 외 모든 관련 법령을 준수하고 있으며, 다음과 같은 목적으로 개인정보를 수집하고 있습니다.

* 수집하는 개인정보 항목

1. 개인정보 제공 수집, 이용

1) 수집항목
가. 회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.
- 이름, 주민등록번호, 카드번호, 비밀번호, 전화번호, 휴대폰번호, 이메일, 사용자 IP Address, 쿠키, 서비스이용기록, 결제기록, 결제정보 등

나. "결제정보"라 함은 "이용자"가 고객사의 상품 및 서비스를 구매하기 위하여 "회사"가 제공하는 "서비스"를 통해 제시한 각 결제수단 별 제반 정보를 의미하며 신용카드 번호, 신용카드 유효기간, 성명, 계좌번호, 주민등록번호, 휴대폰번호, 유선전화번호 등을 말합니다.

다. 기타 회사는 서비스 이용과 관련한 대금결제, 물품배송 및 환불 등에 필요한 정보를 추가로 수집할 수 있습니다.

2) 수집 및 이용목적
가. 회사는 다음과 같은 목적 하에 "결제서비스"와 관련한 개인정보를 수집합니다.
- 사고 및 리스크 관리, 통계활용, 결제결과 통보
- 신용카드, 계좌이체 등 결제서비스 제공, 결제결과 조회 및 통보

나. 서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산
- 서비스 가입, 변경 및 해지, 요금정산, A/S 등 서비스 관련 문의 등을 포함한 이용계약관련 사항의 처리
- 청구서 등의 발송, 금융거래 본인 인증 및 금융서비스, 요금추심 등

다. 회사가 제공하는 서비스의 이용에 따르는 본인확인, 이용자간 거래의 원활한 진행, 본인의사의 확인, 불만처리, 새로운 정보와 고지사항의 안내, 상품배송을 위한 배송자 확인, 대금결제서비스의 제공 및 환불입금 정보 등 서비스 제공을 원활하게 하기 위해 필요한 최소한의 정보제공만을 받고 있습니다.

3) 보유 및 이용기간
이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.
- 회사 내부 방침에 의한 정보 보유 사유: 본 전자결제 서비스 계약상의 권리, 의무의 이행
- 관련법령에 의한 정보보유 사유: 상법, 전자상거래 등에서의 소비자보호에 관한 법률 등 관계법령의 규정에 의하여 회사는 관계법령에서 정한 일정한 기간 동안 개인정보를 보관합니다.

<개인정보 제공>
개인정보 제공은 서비스 가입 또는 이용시에만 이루어지며, 아래 제공목적, 제공정보, 제공받는 자 및 그 보유이용기간이 변동되는 경우 홈페이지상 개인정보 취급방침으로 고지합니다.

제공목적 / 제공정보 / 제공처
- CMS청구: 결제정보 → 한국금융결제
- 전산매체신고: 결제정보 → 국세청
- 현금영수증: 결제정보 → 국세청
- 신용카드: 결제정보 → 국민, 비씨, 롯데, 삼성, NH농협, 현대, 외환, 신한, 시중은행(신한/SC제일/씨티/하나), 특수은행(농협/기업/국민), 지방은행(대구/부산/경남)
- 고객지원: 가입정보 → ㈜블루티에프, 하나은행, KSNET, 위탁 영업 대행사
- 전자지불 표준약관동의: 가입정보 → (주)KSNET`,
    },
    marketing: {
      title: '마케팅 정보 수신동의',
      content: `페이블루에서 제공하는 이벤트/혜택 등 다양한 정보를 휴대전화(페이블루 앱알림 또는 문자, 카카오톡 등), 이메일로 받아보실 수 있습니다.

일부 서비스(별도 회원 체계로 운영하거나 페이블루 가입 이후 추가 가입하여 이용하는 서비스 등)의 경우, 개별 서비스에 대해 별도 수신 동의를 받을 수 있으며, 이때에도 수신 동의에 대해 별도로 안내하고 동의를 받습니다.`,
    },
  };

  ngOnInit(): void {
    this.restoreFormData();
    this.setupAccountNumberFilter();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  canProceed(): boolean {
    return this.form.valid;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.patchValue({
      agreeTerms: checked,
      agreePrivacy: checked,
      agreeMarketing: checked,
    });
    this.form.get('agreeTerms')?.markAsTouched();
    this.form.get('agreePrivacy')?.markAsTouched();
  }

  openTermsModal(type: 'terms' | 'privacy' | 'marketing', event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const data = this.termsText[type];
    if (data) {
      this.termsModalTitle.set(data.title);
      this.termsModalContent.set(data.content);
      this.termsModalOpen.set(true);
    }
  }

  closeTermsModal(): void {
    this.termsModalOpen.set(false);
  }

  goBack(): void {
    this.saveFormData();
    this.signupService.goToStep(2);
    this.router.navigate(['/step/2']);
  }

  async onSubmit(): Promise<void> {
    if (!this.canProceed()) {
      this.form.markAllAsTouched();
      return;
    }
    const { bankName, accountNumber, accountHolder, agreeTerms, agreePrivacy, agreeMarketing } = this.form.value;
    this.signupService.updateStep3({
      bankName, accountNumber, accountHolder, agreeTerms, agreePrivacy, agreeMarketing,
    });
    const success = await this.signupService.submitApplication();
    if (success) {
      this.router.navigate(['/step/4']);
    }
  }

  private restoreFormData(): void {
    const saved = this.signupService.formData().step3;
    if (saved.bankName) {
      this.form.patchValue(saved, { emitEvent: false });
    }
  }

  private saveFormData(): void {
    const { bankName, accountNumber, accountHolder, agreeTerms, agreePrivacy, agreeMarketing } = this.form.value;
    this.signupService.updateStep3({
      bankName, accountNumber, accountHolder, agreeTerms, agreePrivacy, agreeMarketing,
    });
  }

  private setupAccountNumberFilter(): void {
    const control = this.form.get('accountNumber');
    if (!control) return;
    control.valueChanges.pipe(
      takeUntil(this.destroy$),
    ).subscribe(value => {
      if (!value) return;
      const numbersOnly = value.replace(/[^0-9]/g, '');
      if (numbersOnly !== value) {
        control.setValue(numbersOnly, { emitEvent: false });
      }
    });
  }
}
