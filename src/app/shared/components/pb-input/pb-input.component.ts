import {
  Component,
  input,
  signal,
  computed,
  forwardRef,
  ElementRef,
  viewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'pb-input',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PbInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="field"
         [class.field--focused]="focused()"
         [class.field--error]="showError()"
         [class.field--valid]="showValid()"
         [class.field--disabled]="isDisabled()">
      @if (label()) {
        <label class="field__label" [attr.for]="inputId">
          {{ label() }}
          @if (required()) {
            <span class="field__required" aria-hidden="true">*</span>
          }
        </label>
      }
      <div class="field__wrapper">
        @if (icon()) {
          <span class="material-symbols-rounded field__icon" aria-hidden="true">{{ icon() }}</span>
        }
        <input
          #inputEl
          class="field__input"
          [class.field__input--with-icon]="!!icon()"
          [id]="inputId"
          [type]="type()"
          [placeholder]="placeholder()"
          [disabled]="isDisabled()"
          [attr.aria-required]="required() || null"
          [attr.aria-invalid]="showError() || null"
          [attr.aria-describedby]="describedBy()"
          [value]="value()"
          (input)="onInput($event)"
          (focus)="onFocus()"
          (blur)="onBlur()" />
      </div>
      @if (helpText() && !showError()) {
        <p class="field__help" [id]="helpId">{{ helpText() }}</p>
      }
      @if (showError()) {
        <p class="field__error" [id]="errorId" role="alert">
          {{ errorMessage() }}
        </p>
      }
    </div>
  `,
  styleUrl: './pb-input.component.css',
})
export class PbInputComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly type = input<string>('text');
  readonly required = input<boolean>(false);
  readonly errorMessage = input<string>('');
  readonly helpText = input<string>('');
  readonly icon = input<string>('');

  readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  readonly inputId = `pb-input-${++nextId}`;
  readonly errorId = `${this.inputId}-error`;
  readonly helpId = `${this.inputId}-help`;

  readonly value = signal('');
  readonly focused = signal(false);
  readonly touched = signal(false);
  readonly isDisabled = signal(false);

  readonly showError = computed(() => {
    return this.touched() && !this.focused() && !!this.errorMessage();
  });

  readonly showValid = computed(() => {
    return this.touched() && !this.focused() && !this.errorMessage() && !!this.value();
  });

  readonly describedBy = computed(() => {
    if (this.showError()) return this.errorId;
    if (this.helpText()) return this.helpId;
    return null;
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  onFocus(): void {
    this.focused.set(true);
  }

  onBlur(): void {
    this.focused.set(false);
    this.touched.set(true);
    this.onTouched();
  }
}
