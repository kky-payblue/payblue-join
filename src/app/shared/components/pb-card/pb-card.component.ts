import { Component, input } from '@angular/core';

@Component({
  selector: 'pb-card',
  standalone: true,
  template: `
    <div class="card"
         [class.card--signup]="variant() === 'signup'"
         role="region">
      <ng-content />
    </div>
  `,
  styleUrl: './pb-card.component.css',
})
export class PbCardComponent {
  readonly variant = input<'default' | 'signup'>('default');
}
