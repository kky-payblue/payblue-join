import { Component } from '@angular/core';

@Component({
  selector: 'pb-trust-badge',
  standalone: true,
  template: `
    <div class="trust" role="contentinfo" aria-label="보안 인증 정보">
      <div class="trust__item">
        <span class="material-symbols-rounded trust__icon" aria-hidden="true">lock</span>
        <span class="trust__text">SSL 암호화</span>
      </div>
      <div class="trust__divider" aria-hidden="true"></div>
      <div class="trust__item">
        <span class="material-symbols-rounded trust__icon" aria-hidden="true">verified_user</span>
        <span class="trust__text">보안 인증</span>
      </div>
      <div class="trust__divider" aria-hidden="true"></div>
      <div class="trust__item">
        <span class="material-symbols-rounded trust__icon" aria-hidden="true">shield</span>
        <span class="trust__text">개인정보 보호</span>
      </div>
    </div>
  `,
  styleUrl: './pb-trust-badge.component.css',
})
export class PbTrustBadgeComponent {}
