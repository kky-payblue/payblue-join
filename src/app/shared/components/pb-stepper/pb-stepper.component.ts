import { Component, input, output } from '@angular/core';

@Component({
  selector: 'pb-stepper',
  standalone: true,
  template: `
    <nav class="stepper" role="navigation" aria-label="가입 진행 단계">
      <ol class="stepper__list">
        @for (label of stepLabels(); track $index; let i = $index) {
          <li class="stepper__item"
              [class.stepper__item--completed]="i + 1 < currentStep()"
              [class.stepper__item--active]="i + 1 === currentStep()"
              [class.stepper__item--pending]="i + 1 > currentStep()">
            @if (i > 0) {
              <div class="stepper__connector"
                   [class.stepper__connector--completed]="i + 1 <= currentStep()">
              </div>
            }
            <button
              class="stepper__indicator"
              [attr.aria-current]="i + 1 === currentStep() ? 'step' : null"
              [attr.aria-label]="label + (i + 1 < currentStep() ? ' (완료)' : i + 1 === currentStep() ? ' (진행 중)' : ' (대기)')"
              [disabled]="i + 1 >= currentStep()"
              (click)="onStepClick(i + 1)">
              @if (i + 1 < currentStep()) {
                <span class="stepper__check" aria-hidden="true">✓</span>
              } @else {
                <span class="stepper__number">{{ i + 1 }}</span>
              }
            </button>
            <span class="stepper__label">{{ label }}</span>
          </li>
        }
      </ol>
    </nav>
  `,
  styleUrl: './pb-stepper.component.css',
})
export class PbStepperComponent {
  readonly currentStep = input.required<number>();
  readonly totalSteps = input<number>(4);
  readonly stepLabels = input<string[]>([]);
  readonly stepChange = output<number>();

  onStepClick(step: number): void {
    if (step < this.currentStep()) {
      this.stepChange.emit(step);
    }
  }
}
