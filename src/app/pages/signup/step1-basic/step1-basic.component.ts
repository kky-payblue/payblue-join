import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SignupService } from '../../../shared/services/signup.service';
import { NiceAuthService } from '../../../shared/services/nice-auth.service';
import { ValidationService } from '../../../shared/services/validation.service';
import { MemberType, NiceAuthData } from '../../../shared/models/signup.model';

@Component({
  selector: 'app-step1-basic',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="step-container">
      <div class="step-header">
        <h2 class="step-title">기본 정보</h2>
        <p class="step-description">서비스 이용을 위한 기본 정보를 입력해 주세요.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="step-form">
        <!-- 회원 유형 선택 -->
        <div class="form-field">
          <span class="form-label">회원 유형 <span class="required">*</span></span>
          <div class="member-type-group">
            <label class="type-card" [class.selected]="selectedType() === 'business'">
              <input
                type="radio"
                formControlName="memberType"
                value="business"
                class="type-radio"
              />
              <span class="material-symbols-rounded type-icon">store</span>
              <span class="type-label">사업자 회원</span>
              <span class="type-desc">사업자등록증을 보유한 사업주</span>
            </label>
            <label class="type-card" [class.selected]="selectedType() === 'individual'">
              <input
                type="radio"
                formControlName="memberType"
                value="individual"
                class="type-radio"
              />
              <span class="material-symbols-rounded type-icon">person</span>
              <span class="type-label">비사업자 회원</span>
              <span class="type-desc">개인 또는 비사업자</span>
            </label>
          </div>
        </div>

        <!-- 본인인증 -->
        <div class="form-field">
          <span class="form-label">본인인증 <span class="required">*</span></span>

          @if (isNiceVerified()) {
            <!-- 인증 완료 상태 -->
            <div class="nice-verified-card">
              <div class="nice-verified-header">
                <span class="material-symbols-rounded nice-verified-icon">verified_user</span>
                <span class="nice-verified-text">본인인증 완료</span>
              </div>
              <div class="nice-verified-info">
                <div class="nice-info-row">
                  <span class="nice-info-label">이름</span>
                  <span class="nice-info-value">{{ form.get('name')?.value }}</span>
                </div>
                <div class="nice-info-row">
                  <span class="nice-info-label">연락처</span>
                  <span class="nice-info-value">{{ form.get('phone')?.value }}</span>
                </div>
              </div>
              <button type="button" class="nice-reverify-btn" (click)="startNiceAuth()">
                재인증
              </button>
            </div>
          } @else {
            <!-- 미인증 상태 -->
            <div class="nice-auth-section">
              <p class="nice-auth-desc">
                가입을 위해 휴대폰 본인인증이 필요합니다.
              </p>
              <button
                type="button"
                class="nice-auth-btn"
                [disabled]="niceAuthService.status() === 'pending'"
                (click)="startNiceAuth()"
              >
                @if (niceAuthService.status() === 'pending') {
                  <span class="spinner"></span>
                  <span>인증 진행 중...</span>
                } @else {
                  <span class="material-symbols-rounded nice-btn-icon">smartphone</span>
                  <span>휴대폰 본인인증</span>
                }
              </button>
              @if (niceAuthService.errorMessage()) {
                <div class="nice-error">
                  <span class="material-symbols-rounded nice-error-icon">error</span>
                  <span>{{ niceAuthService.errorMessage() }}</span>
                </div>
              }
              @if (!manualEntry()) {
                <button type="button" class="manual-entry-btn" (click)="enableManualEntry()">
                  본인인증 없이 직접 입력
                </button>
              }
            </div>
          }
        </div>

        <!-- 이름 / 연락처 -->
        @if (!isNiceVerified()) {
          @if (manualEntry()) {
            <div class="form-field">
              <label for="name" class="form-label">
                이름 <span class="required">*</span>
              </label>
              <input
                id="name"
                type="text"
                formControlName="name"
                class="form-input"
                [class.error]="isFieldInvalid('name')"
                placeholder="홍길동"
                autocomplete="name"
              />
              <div class="field-feedback">
                @if (isFieldInvalid('name') && form.get('name')?.errors?.['required']) {
                  <span class="hint error">이름을 입력해 주세요.</span>
                }
              </div>
            </div>

            <div class="form-field">
              <label for="phone" class="form-label">
                연락처 <span class="required">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                formControlName="phone"
                class="form-input"
                [class.error]="isFieldInvalid('phone')"
                placeholder="010-1234-5678"
                autocomplete="tel"
              />
              <div class="field-feedback">
                @if (isFieldInvalid('phone') && form.get('phone')?.errors?.['invalidPhone']) {
                  <span class="hint error">올바른 연락처를 입력해 주세요.</span>
                }
              </div>
            </div>
          }
        }

        <!-- 버튼 -->
        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!canProceed()"
          >
            다음 단계
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .step-container {
      max-width: var(--pb-container-sm);
      margin: 0 auto;
      padding: var(--pb-space-8) var(--pb-space-4);
    }
    .step-header { margin-bottom: var(--pb-space-8); }
    .step-title {
      font-size: var(--pb-text-2xl);
      font-weight: var(--pb-weight-bold);
      color: var(--pb-gray-900);
      margin: 0 0 var(--pb-space-2);
    }
    .step-description {
      font-size: var(--pb-text-base);
      color: var(--pb-gray-500);
      margin: 0;
    }
    .step-form {
      display: flex;
      flex-direction: column;
      gap: var(--pb-form-field-gap);
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--pb-space-2);
    }
    .form-label {
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-medium);
      color: var(--pb-gray-700);
    }
    .required { color: var(--pb-error-500); }

    /* 회원 유형 카드 */
    .member-type-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--pb-space-3);
    }
    .type-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--pb-space-2);
      padding: var(--pb-space-6) var(--pb-space-4);
      border: 2px solid var(--pb-gray-200);
      border-radius: var(--pb-radius-lg);
      cursor: pointer;
      transition: all var(--pb-duration-fast) var(--pb-ease-out);
      text-align: center;
    }
    .type-card:hover {
      border-color: var(--pb-primary-300);
      background: var(--pb-primary-50);
    }
    .type-card.selected {
      border-color: var(--pb-primary-500);
      background: var(--pb-primary-50);
      box-shadow: 0 0 0 3px var(--pb-primary-100);
    }
    .type-radio {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .type-icon {
      font-size: 2rem;
      color: var(--pb-gray-400);
      transition: color var(--pb-duration-fast) var(--pb-ease-out);
    }
    .type-card.selected .type-icon {
      color: var(--pb-primary-500);
    }
    .type-label {
      font-size: var(--pb-text-base);
      font-weight: var(--pb-weight-semibold);
      color: var(--pb-gray-800);
    }
    .type-desc {
      font-size: var(--pb-text-xs);
      color: var(--pb-gray-500);
    }

    /* 본인인증 섹션 */
    .nice-auth-section {
      border: 2px dashed var(--pb-gray-300);
      border-radius: var(--pb-radius-lg);
      padding: var(--pb-space-6);
      text-align: center;
    }
    .nice-auth-desc {
      font-size: var(--pb-text-sm);
      color: var(--pb-gray-500);
      margin: 0 0 var(--pb-space-4);
    }
    .nice-auth-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--pb-space-2);
      min-height: 48px;
      padding: var(--pb-space-3) var(--pb-space-8);
      border: none;
      border-radius: var(--pb-radius-md);
      background: var(--pb-primary-500);
      color: #fff;
      font-size: var(--pb-text-base);
      font-weight: var(--pb-weight-semibold);
      font-family: var(--pb-font-primary);
      cursor: pointer;
      transition: background var(--pb-duration-fast) var(--pb-ease-out);
      width: 100%;
    }
    .nice-auth-btn:hover:not(:disabled) { background: var(--pb-primary-600); }
    .nice-auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .nice-btn-icon { font-size: 20px; }
    .nice-error {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--pb-space-1);
      margin-top: var(--pb-space-3);
      font-size: var(--pb-text-xs);
      color: var(--pb-error-500);
    }
    .nice-error-icon { font-size: 16px; }
    .manual-entry-btn {
      display: inline-block;
      margin-top: var(--pb-space-3);
      background: none;
      border: none;
      color: var(--pb-gray-400);
      font-size: var(--pb-text-xs);
      font-family: var(--pb-font-primary);
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }
    .manual-entry-btn:hover { color: var(--pb-primary-500); }

    /* 인증 완료 카드 */
    .nice-verified-card {
      border: 1.5px solid var(--pb-success-300);
      border-radius: var(--pb-radius-lg);
      background: var(--pb-success-50);
      padding: var(--pb-space-5);
    }
    .nice-verified-header {
      display: flex;
      align-items: center;
      gap: var(--pb-space-2);
      margin-bottom: var(--pb-space-4);
    }
    .nice-verified-icon {
      font-size: 22px;
      color: var(--pb-success-500);
    }
    .nice-verified-text {
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-semibold);
      color: var(--pb-success-700);
    }
    .nice-verified-info {
      display: flex;
      flex-direction: column;
      gap: var(--pb-space-2);
      margin-bottom: var(--pb-space-4);
    }
    .nice-info-row {
      display: flex;
      align-items: center;
      gap: var(--pb-space-3);
    }
    .nice-info-label {
      font-size: var(--pb-text-xs);
      color: var(--pb-gray-500);
      min-width: 48px;
      flex-shrink: 0;
    }
    .nice-info-value {
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-medium);
      color: var(--pb-gray-800);
    }
    .nice-reverify-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--pb-space-1);
      background: none;
      border: none;
      color: var(--pb-gray-400);
      font-size: var(--pb-text-xs);
      font-family: var(--pb-font-primary);
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }
    .nice-reverify-btn:hover { color: var(--pb-primary-500); }

    /* 입력 필드 */
    .form-input {
      width: 100%;
      min-height: 48px;
      padding: var(--pb-form-input-padding);
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
    .form-input::placeholder { color: var(--pb-gray-400); }
    .form-input:focus {
      outline: none;
      border-color: var(--pb-primary-400);
      box-shadow: 0 0 0 3px var(--pb-primary-50);
    }
    .form-input.error {
      border-color: var(--pb-error-500);
      background: var(--pb-error-50);
    }
    .form-input[readonly] { background: var(--pb-gray-50); cursor: default; }
    .field-feedback { min-height: 1.25rem; }
    .hint {
      font-size: var(--pb-text-xs);
      display: flex;
      align-items: center;
      gap: var(--pb-space-1);
    }
    .hint.error { color: var(--pb-error-500); }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* 버튼 */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: var(--pb-space-4);
    }
    .btn {
      min-height: 48px;
      padding: var(--pb-space-3) var(--pb-space-8);
      border: none;
      border-radius: var(--pb-radius-md);
      font-size: var(--pb-text-base);
      font-weight: var(--pb-weight-semibold);
      font-family: var(--pb-font-primary);
      cursor: pointer;
      transition: background var(--pb-duration-fast) var(--pb-ease-out),
                  opacity var(--pb-duration-fast) var(--pb-ease-out);
    }
    .btn-primary { background: var(--pb-primary-500); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--pb-primary-600); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    @media (max-width: 640px) {
      .member-type-group { grid-template-columns: 1fr 1fr; }
      .type-card {
        padding: var(--pb-space-4) var(--pb-space-2);
        gap: var(--pb-space-1);
      }
      .type-icon { font-size: 1.5rem; }
      .type-label { font-size: var(--pb-text-sm); }
      .type-desc { font-size: 10px; }
      .form-actions { flex-direction: column; }
      .btn { width: 100%; }
    }
  `]
})
export class Step1BasicComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly signupService = inject(SignupService);
  readonly niceAuthService = inject(NiceAuthService);
  private readonly destroy$ = new Subject<void>();

  readonly selectedType = signal<MemberType>('business');
  readonly isNiceVerified = signal(false);
  readonly manualEntry = signal(false);

  readonly form: FormGroup = this.fb.group({
    memberType: ['business', [Validators.required]],
    name: ['', [Validators.required]],
    phone: ['', [Validators.required, ValidationService.phoneValidator()]],
  });

  ngOnInit(): void {
    this.restoreFormData();
    this.setupTypeSync();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  canProceed(): boolean {
    return this.form.valid && (this.isNiceVerified() || this.manualEntry());
  }

  enableManualEntry(): void {
    this.manualEntry.set(true);
    this.setupPhoneFormat();
  }

  startNiceAuth(): void {
    this.niceAuthService.requestVerification()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          // Auto-fill name and phone from NICE result
          this.form.patchValue({
            name: result.name,
            phone: result.phone,
          });
          this.form.get('name')?.markAsDirty();
          this.form.get('phone')?.markAsDirty();

          // Store NICE auth data
          const niceAuthData: NiceAuthData = {
            verified: true,
            name: result.name,
            phone: result.phone,
            birthDate: result.birthDate,
            genderDigit: result.genderDigit,
            ci: result.ci,
            di: result.di,
          };
          this.signupService.updateNiceAuth(niceAuthData);
          this.isNiceVerified.set(true);
        },
        error: () => {
          this.isNiceVerified.set(false);
        },
      });
  }

  onSubmit(): void {
    if (!this.canProceed()) {
      this.form.markAllAsTouched();
      return;
    }

    const { memberType, name, phone } = this.form.value;
    const niceAuth = this.signupService.niceAuthResult();
    this.signupService.updateStep1({ memberType, name, phone, niceAuth });
    this.signupService.goToStep(2);
    const route = memberType === 'individual' ? '/step/2-individual' : '/step/2';
    this.router.navigate([route]);
  }

  private restoreFormData(): void {
    const saved = this.signupService.formData().step1;
    if (saved.name) {
      this.form.patchValue(saved, { emitEvent: false });
      this.selectedType.set(saved.memberType);
    }
    // Restore NICE auth state
    if (saved.niceAuth?.verified) {
      this.isNiceVerified.set(true);
      this.niceAuthService.status.set('success');
    } else if (saved.name && !saved.niceAuth) {
      // Restore manual entry state
      this.manualEntry.set(true);
      this.setupPhoneFormat();
    }
  }

  private setupPhoneFormat(): void {
    const phoneControl = this.form.get('phone');
    if (!phoneControl) return;

    phoneControl.valueChanges.pipe(
      takeUntil(this.destroy$),
    ).subscribe(value => {
      if (!value) return;
      const formatted = ValidationService.formatPhone(value);
      if (formatted !== value) {
        phoneControl.setValue(formatted, { emitEvent: false });
      }
    });
  }

  private setupTypeSync(): void {
    const typeControl = this.form.get('memberType');
    if (!typeControl) return;

    typeControl.valueChanges.pipe(
      takeUntil(this.destroy$),
    ).subscribe(value => {
      this.selectedType.set(value);
    });
  }
}
