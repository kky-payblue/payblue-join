import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SignupService } from '../../../shared/services/signup.service';

@Component({
  selector: 'app-step4-complete',
  standalone: true,
  template: `
    <div class="complete-container">
      <div class="complete-card">
        <!-- 성공 아이콘 -->
        <div class="success-icon-wrapper">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <h2 class="complete-title">가입 신청이 완료되었습니다</h2>
        <p class="complete-description">
          관리자 승인 후 서비스 이용이 가능합니다.<br />
          평균 <strong>1~2 영업일</strong> 내에 처리됩니다.
        </p>

        <!-- 다음 단계 안내 -->
        <div class="steps-guide">
          <h3 class="guide-title">다음 단계 안내</h3>
          <ol class="guide-list">
            <li class="guide-item">
              <span class="guide-number">1</span>
              <div class="guide-content">
                <strong>승인 대기</strong>
                <p>관리자가 제출하신 정보를 검토합니다.</p>
              </div>
            </li>
            <li class="guide-item">
              <span class="guide-number">2</span>
              <div class="guide-content">
                <strong>SMS 수신</strong>
                <p>승인 완료 시 등록된 연락처로 알림을 보내드립니다.</p>
              </div>
            </li>
            <li class="guide-item">
              <span class="guide-number">3</span>
              <div class="guide-content">
                <strong>앱 다운로드 및 실행</strong>
                <p>페이블루 앱을 설치하고, 등록 가입정보로 로그인하세요.</p>
              </div>
            </li>
            <li class="guide-item">
              <span class="guide-number">4</span>
              <div class="guide-content">
                <strong>결제 시작</strong>
                <p>페이블루의 다양한 결제서비스를 이용하세요!</p>
              </div>
            </li>
          </ol>
        </div>

        <!-- 앱 다운로드 -->
        <div class="app-download">
          <h3 class="download-title">앱 다운로드</h3>
          <div class="download-buttons">
            <a
              href="https://apps.apple.com/kr/app/payableu-%ED%8E%98%EC%9D%B4%EB%B8%94%EB%A3%A8/id1336004392"
              target="_blank"
              rel="noopener noreferrer"
              class="download-btn download-ios"
            >
              <svg class="download-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div class="download-text">
                <span class="download-sub">Download on the</span>
                <span class="download-store">App Store</span>
              </div>
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.bluetf.payblue"
              target="_blank"
              rel="noopener noreferrer"
              class="download-btn download-android"
            >
              <svg class="download-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76c-.36-.17-.58-.54-.58-.95V1.19c0-.41.22-.78.58-.95l11.83 11.76L3.18 23.76zm15.8-8.47l-3.22-1.85L12.6 12l3.16-1.44 3.22-1.85 3.56 2.05c.66.38.66 1.1 0 1.48l-3.56 2.05zM4.4 1.18l9.47 9.47-2.67 2.43L4.4 1.18zm0 21.64l6.8-11.9 2.67 2.43-9.47 9.47z"/>
              </svg>
              <div class="download-text">
                <span class="download-sub">GET IT ON</span>
                <span class="download-store">Google Play</span>
              </div>
            </a>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-primary"
          (click)="goHome()"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  `,
  styles: [`
    .complete-container {
      max-width: var(--pb-container-sm);
      margin: 0 auto;
      padding: var(--pb-space-8) var(--pb-space-4);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
    }

    .complete-card {
      text-align: center;
      width: 100%;
    }

    /* 성공 아이콘 */
    .success-icon-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: var(--pb-space-8);
    }

    .success-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--pb-success-50);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--pb-success-500);
      animation: pulse-success 2s ease-in-out infinite;
    }

    .success-icon svg {
      width: 40px;
      height: 40px;
    }

    @keyframes pulse-success {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.3);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 0 0 16px rgba(16, 185, 129, 0);
        transform: scale(1.05);
      }
    }

    .complete-title {
      font-size: var(--pb-text-2xl);
      font-weight: var(--pb-weight-bold);
      color: var(--pb-gray-900);
      margin: 0 0 var(--pb-space-3);
    }

    .complete-description {
      font-size: var(--pb-text-base);
      color: var(--pb-gray-500);
      margin: 0 0 var(--pb-space-10);
      line-height: var(--pb-leading-normal);
    }

    .complete-description strong {
      color: var(--pb-primary-500);
      font-weight: var(--pb-weight-semibold);
    }

    /* 다음 단계 안내 */
    .steps-guide {
      background: var(--pb-gray-50);
      border-radius: var(--pb-radius-lg);
      padding: var(--pb-space-6);
      margin-bottom: var(--pb-space-8);
      text-align: left;
    }

    .guide-title {
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-semibold);
      color: var(--pb-gray-500);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 var(--pb-space-5);
    }

    .guide-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--pb-space-4);
    }

    .guide-item {
      display: flex;
      align-items: flex-start;
      gap: var(--pb-space-3);
    }

    .guide-number {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--pb-primary-500);
      color: #fff;
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-semibold);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .guide-content {
      flex: 1;
      padding-top: 2px;
    }

    .guide-content strong {
      font-size: var(--pb-text-base);
      color: var(--pb-gray-800);
      font-weight: var(--pb-weight-semibold);
    }

    .guide-content p {
      font-size: var(--pb-text-sm);
      color: var(--pb-gray-500);
      margin: var(--pb-space-1) 0 0;
    }

    /* 앱 다운로드 */
    .app-download {
      margin-bottom: var(--pb-space-6);
    }
    .download-title {
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-semibold);
      color: var(--pb-gray-500);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 var(--pb-space-4);
    }
    .download-buttons {
      display: flex;
      gap: var(--pb-space-3);
      justify-content: center;
    }
    .download-btn {
      display: flex;
      align-items: center;
      gap: var(--pb-space-2);
      padding: var(--pb-space-2) var(--pb-space-5);
      border-radius: var(--pb-radius-md);
      background: var(--pb-gray-900);
      color: #fff;
      text-decoration: none;
      transition: background var(--pb-duration-fast) var(--pb-ease-out),
                  transform var(--pb-duration-fast) var(--pb-ease-out);
      min-height: 48px;
    }
    .download-btn:hover {
      background: var(--pb-gray-700);
      transform: translateY(-1px);
    }
    .download-icon {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    .download-text {
      display: flex;
      flex-direction: column;
      text-align: left;
      line-height: 1.2;
    }
    .download-sub {
      font-size: 9px;
      opacity: 0.8;
      letter-spacing: 0.02em;
    }
    .download-store {
      font-size: var(--pb-text-base);
      font-weight: var(--pb-weight-semibold);
      letter-spacing: -0.01em;
    }

    @media (max-width: 640px) {
      .download-buttons { flex-direction: column; }
      .download-btn { justify-content: center; }
    }

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
      transition: background var(--pb-duration-fast) var(--pb-ease-out);
    }

    .btn-primary {
      background: var(--pb-primary-500);
      color: #fff;
      width: 100%;
    }

    .btn-primary:hover {
      background: var(--pb-primary-600);
    }
  `]
})
export class Step4CompleteComponent {
  private readonly router = inject(Router);
  private readonly signupService = inject(SignupService);

  goHome(): void {
    this.signupService.reset();
    this.router.navigate(['/']);
  }
}
