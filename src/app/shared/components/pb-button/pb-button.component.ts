import { Component, input } from '@angular/core';

@Component({
  selector: 'pb-button',
  standalone: true,
  template: `
    <button
      class="btn"
      [class.btn--primary]="variant() === 'primary'"
      [class.btn--secondary]="variant() === 'secondary'"
      [class.btn--text]="variant() === 'text'"
      [class.btn--sm]="size() === 'sm'"
      [class.btn--md]="size() === 'md'"
      [class.btn--lg]="size() === 'lg'"
      [class.btn--full-width]="fullWidth()"
      [class.btn--loading]="loading()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() || null"
      [attr.aria-disabled]="disabled() || loading() || null">
      <span class="btn__content" [class.btn__content--hidden]="loading()">
        <ng-content />
      </span>
      @if (loading()) {
        <span class="btn__spinner" aria-hidden="true"></span>
      }
    </button>
  `,
  styleUrl: './pb-button.component.css',
})
export class PbButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'text'>('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly loading = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);
  readonly disabled = input<boolean>(false);
}
