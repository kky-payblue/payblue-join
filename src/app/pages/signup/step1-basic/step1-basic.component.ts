import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SignupService } from '../../../shared/services/signup.service';
import { NiceAuthService } from '../../../shared/services/nice-auth.service';
import { MemberType, NiceAuthData } from '../../../shared/models/signup.model';

@Component({
  selector: 'app-step1-basic',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="step-container">
      <div class="step-header">
        <h2 class="step-title">기본 정보</h2>
        <p class="step-description">회원 유형을 선택하고 본인인증을 진행해 주세요.</p>
      </div>

      <form [formGroup]="form" class="step-form">
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
            <!-- 인증 완료 상태 (뒤로가기 시 표시) -->
            <div class="nice-verified-card">
              <div class="nice-verified-header">
                <span class="material-symbols-rounded nice-verified-icon">verified_user</span>
                <span class="nice-verified-text">본인인증 완료</span>
              </div>
              <button type="button" class="btn btn-primary proceed-btn" (click)="proceedToStep2()">
                다음 단계로 계속하기
              </button>
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
              <button type="button" class="manual-entry-btn" (click)="skipToManualEntry()">
                본인인증 없이 직접 입력
              </button>
            </div>
          }
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
      word-break: keep-all;
      line-height: var(--pb-leading-normal);
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
      word-break: keep-all;
    }
    .type-desc {
      font-size: var(--pb-text-xs);
      color: var(--pb-gray-500);
      word-break: keep-all;
      line-height: var(--pb-leading-normal);
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
      word-break: keep-all;
      line-height: var(--pb-leading-normal);
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
      text-align: center;
    }
    .nice-verified-header {
      display: flex;
      align-items: center;
      justify-content: center;
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

    /* 버튼 */
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
    .proceed-btn {
      width: 100%;
      margin-bottom: var(--pb-space-3);
    }

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

    @media (max-width: 640px) {
      .member-type-group { grid-template-columns: 1fr 1fr; }
      .type-card {
        padding: var(--pb-space-4) var(--pb-space-2);
        gap: var(--pb-space-1);
      }
      .type-icon { font-size: 1.5rem; }
      .type-label { font-size: var(--pb-text-sm); }
      .type-desc { font-size: var(--pb-text-xs); line-height: var(--pb-leading-tight); }
      .nice-auth-section { padding: var(--pb-space-5) var(--pb-space-4); }
    }
    @media (max-width: 360px) {
      .member-type-group { grid-template-columns: 1fr; }
      .type-card {
        flex-direction: row;
        padding: var(--pb-space-3) var(--pb-space-4);
        gap: var(--pb-space-3);
        text-align: left;
      }
      .type-icon { font-size: 1.5rem; flex-shrink: 0; }
      .type-card .type-label,
      .type-card .type-desc { text-align: left; }
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

  readonly form: FormGroup = this.fb.group({
    memberType: ['business', [Validators.required]],
  });

  ngOnInit(): void {
    this.restoreFormData();
    this.setupTypeSync();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startNiceAuth(): void {
    this.niceAuthService.requestVerification()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
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

          // Save step1 data and auto-navigate to step 2
          const memberType = this.form.get('memberType')?.value;
          this.signupService.updateStep1({
            memberType,
            name: result.name,
            phone: result.phone,
            niceAuth: niceAuthData,
          });
          this.navigateToStep2(memberType);
        },
        error: () => {
          this.isNiceVerified.set(false);
        },
      });
  }

  skipToManualEntry(): void {
    const memberType = this.form.get('memberType')?.value;
    this.signupService.updateStep1({ memberType, name: '', phone: '' });
    this.navigateToStep2(memberType);
  }

  proceedToStep2(): void {
    const memberType = this.form.get('memberType')?.value;
    const niceAuth = this.signupService.niceAuthResult();
    this.signupService.updateStep1({
      memberType,
      name: niceAuth?.name ?? '',
      phone: niceAuth?.phone ?? '',
      niceAuth,
    });
    this.navigateToStep2(memberType);
  }

  private navigateToStep2(memberType: MemberType): void {
    this.signupService.goToStep(2);
    const route = memberType === 'individual' ? '/step/2-individual' : '/step/2';
    this.router.navigate([route]);
  }

  private restoreFormData(): void {
    const saved = this.signupService.formData().step1;
    this.form.patchValue({ memberType: saved.memberType }, { emitEvent: false });
    this.selectedType.set(saved.memberType);
    if (saved.niceAuth?.verified) {
      this.isNiceVerified.set(true);
      this.niceAuthService.status.set('success');
    }
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
