import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SignupService } from '../../../shared/services/signup.service';

@Component({
  selector: 'app-step0-preparation',
  standalone: true,
  template: `
    <div class="prep-container">
      <div class="prep-header">
        <h2 class="prep-title">준비사항 안내</h2>
        <p class="prep-desc">가입 중 서류를 휴대폰으로 촬영합니다.<br>아래 서류를 미리 준비해 주세요.</p>
      </div>

      <div class="prep-cards">
        <!-- 사업자 -->
        <div class="prep-card business">
          <div class="card-badge">사업자 회원</div>
          <ul class="card-list">
            <li>
              <span class="material-symbols-rounded ic">description</span>
              <span>사업자등록증</span>
            </li>
            <li>
              <span class="material-symbols-rounded ic">badge</span>
              <span>대표자 신분증</span>
            </li>
          </ul>
        </div>

        <!-- 비사업자 -->
        <div class="prep-card individual">
          <div class="card-badge">비사업자 회원</div>
          <ul class="card-list">
            <li>
              <span class="material-symbols-rounded ic">badge</span>
              <span>본인 신분증</span>
            </li>
          </ul>
        </div>
      </div>

      <p class="prep-tip">
        <span class="material-symbols-rounded tip-ic">photo_camera</span>
        신분증, 서류는 가입 과정에서 카메라로 촬영합니다.
      </p>

      <button type="button" class="ready-btn" (click)="onReady()">
        준비완료
      </button>
    </div>
  `,
  styles: [`
    .prep-container {
      max-width: var(--pb-container-sm);
      margin: 0 auto;
      padding: var(--pb-space-6) var(--pb-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--pb-space-5);
    }

    /* 헤더 */
    .prep-header { text-align: center; }
    .prep-title {
      font-size: var(--pb-text-xl);
      font-weight: var(--pb-weight-bold);
      color: var(--pb-gray-900);
      margin: 0 0 var(--pb-space-1);
    }
    .prep-desc {
      font-size: var(--pb-text-sm);
      color: var(--pb-gray-500);
      margin: 0;
      word-break: keep-all;
      line-height: var(--pb-leading-normal);
    }

    /* 카드 그리드 */
    .prep-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--pb-space-3);
    }

    .prep-card {
      border-radius: var(--pb-radius-lg);
      padding: var(--pb-space-5) var(--pb-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--pb-space-4);
      min-height: 160px;
    }
    .prep-card.business {
      background: var(--pb-primary-50);
      border: 1.5px solid var(--pb-primary-200);
    }
    .prep-card.individual {
      background: var(--pb-info-50, #eff6ff);
      border: 1.5px solid var(--pb-info-200, #bfdbfe);
    }

    .card-badge {
      font-size: var(--pb-text-xs);
      font-weight: var(--pb-weight-bold);
      letter-spacing: 0.02em;
      padding: var(--pb-space-1) var(--pb-space-2);
      border-radius: var(--pb-radius-sm);
      width: fit-content;
      align-self: center;
    }
    .business .card-badge {
      background: var(--pb-primary-500);
      color: #fff;
    }
    .individual .card-badge {
      background: var(--pb-info-500, #3b82f6);
      color: #fff;
    }

    .card-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--pb-space-3);
      flex: 1;
    }
    .card-list li {
      display: flex;
      align-items: center;
      gap: var(--pb-space-2);
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-medium);
      color: var(--pb-gray-800);
      padding: var(--pb-space-2) 0;
    }
    .ic {
      font-size: 22px;
      flex-shrink: 0;
    }
    .business .ic { color: var(--pb-primary-500); }
    .individual .ic { color: var(--pb-info-500, #3b82f6); }

    /* 안내 팁 */
    .prep-tip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--pb-space-1);
      font-size: var(--pb-text-xs);
      color: var(--pb-gray-500);
      margin: 0;
      word-break: keep-all;
      text-align: center;
    }
    .tip-ic {
      font-size: 16px;
      color: var(--pb-gray-400);
      flex-shrink: 0;
    }

    /* 버튼 */
    .ready-btn {
      width: 100%;
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
      transition: background var(--pb-duration-fast) var(--pb-ease-out),
                  transform var(--pb-duration-fast) var(--pb-ease-out);
    }
    .ready-btn:hover { background: var(--pb-primary-600); }
    .ready-btn:active { transform: scale(0.98); }

    @media (max-width: 360px) {
      .prep-cards { grid-template-columns: 1fr; }
    }
  `]
})
export class Step0PreparationComponent {
  private readonly router = inject(Router);
  private readonly signupService = inject(SignupService);

  onReady(): void {
    this.signupService.goToStep(1);
    this.router.navigate(['/step/1']);
  }
}
