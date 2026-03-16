import { Component, input, computed } from '@angular/core';
import type { PasswordStrength } from '../../models/signup.model';

@Component({
  selector: 'pb-password-strength',
  standalone: true,
  template: `
    <div class="strength" role="status" [attr.aria-label]="'비밀번호 강도: ' + strengthLabel()">
      <div class="strength__bars">
        @for (bar of bars(); track $index) {
          <div class="strength__bar"
               [class.strength__bar--filled]="bar.filled"
               [style.background-color]="bar.filled ? barColor() : null">
          </div>
        }
      </div>
      <span class="strength__label" [style.color]="barColor()">
        {{ strengthLabel() }}
      </span>
    </div>
  `,
  styleUrl: './pb-password-strength.component.css',
})
export class PbPasswordStrengthComponent {
  readonly strength = input<PasswordStrength>('weak');

  readonly strengthLabel = computed(() => {
    const labels: Record<PasswordStrength, string> = {
      weak: '약함',
      medium: '보통',
      strong: '강함',
    };
    return labels[this.strength()];
  });

  readonly barColor = computed(() => {
    const colors: Record<PasswordStrength, string> = {
      weak: 'var(--pb-error-500)',
      medium: 'var(--pb-warning-500)',
      strong: 'var(--pb-success-500)',
    };
    return colors[this.strength()];
  });

  readonly bars = computed(() => {
    const filledCount: Record<PasswordStrength, number> = {
      weak: 1,
      medium: 2,
      strong: 3,
    };
    const count = filledCount[this.strength()];
    return [
      { filled: count >= 1 },
      { filled: count >= 2 },
      { filled: count >= 3 },
    ];
  });
}
