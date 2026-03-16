import {
  Component,
  input,
  signal,
  computed,
  forwardRef,
  ElementRef,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

@Component({
  selector: 'pb-file-upload',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PbFileUploadComponent),
      multi: true,
    },
  ],
  template: `
    <div class="upload"
         [class.upload--drag-over]="isDragOver()"
         [class.upload--has-file]="!!selectedFile()"
         [class.upload--error]="!!errorText()"
         [class.upload--disabled]="isDisabled()"
         role="group"
         aria-label="파일 업로드">

      @if (!selectedFile()) {
        <!-- Drop zone -->
        <div class="upload__dropzone"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave()"
             (drop)="onDrop($event)"
             (click)="fileInput.click()"
             (keydown.enter)="fileInput.click()"
             (keydown.space)="fileInput.click(); $event.preventDefault()"
             tabindex="0"
             role="button"
             [attr.aria-disabled]="isDisabled() || null"
             aria-label="클릭 또는 드래그하여 파일 업로드">
          <span class="material-symbols-rounded upload__icon" aria-hidden="true">cloud_upload</span>
          <p class="upload__text">
            파일을 드래그하거나 <span class="upload__link">클릭하여 선택</span>하세요
          </p>
          <p class="upload__hint">JPG, PNG, PDF (최대 {{ maxSizeMb }}MB)</p>
        </div>

        <!-- Mobile camera button -->
        <button
          type="button"
          class="upload__camera"
          (click)="cameraInput.click()"
          [disabled]="isDisabled()"
          aria-label="카메라로 촬영">
          <span class="material-symbols-rounded" aria-hidden="true">photo_camera</span>
          카메라 촬영
        </button>
      } @else {
        <!-- File preview -->
        <div class="upload__preview">
          @if (thumbnailUrl()) {
            <img class="upload__thumbnail" [src]="thumbnailUrl()" [alt]="selectedFile()!.name" />
          } @else {
            <span class="material-symbols-rounded upload__file-icon" aria-hidden="true">description</span>
          }
          <div class="upload__file-info">
            <span class="upload__filename">{{ selectedFile()!.name }}</span>
            <span class="upload__filesize">{{ formatSize(selectedFile()!.size) }}</span>
          </div>
          <button
            type="button"
            class="upload__remove"
            (click)="removeFile()"
            [disabled]="isDisabled()"
            aria-label="파일 삭제">
            <span class="material-symbols-rounded" aria-hidden="true">close</span>
          </button>
        </div>

        <!-- Progress bar -->
        @if (uploadProgress() < 100) {
          <div class="upload__progress" role="progressbar"
               [attr.aria-valuenow]="uploadProgress()"
               aria-valuemin="0" aria-valuemax="100">
            <div class="upload__progress-bar"
                 [style.width.%]="uploadProgress()">
            </div>
          </div>
        }
      }

      @if (errorText()) {
        <p class="upload__error" role="alert">{{ errorText() }}</p>
      }

      <!-- Hidden file inputs -->
      <input #fileInput type="file"
             class="upload__hidden-input"
             [accept]="acceptTypes"
             [disabled]="isDisabled()"
             (change)="onFileSelected($event)"
             tabindex="-1" />
      <input #cameraInput type="file"
             class="upload__hidden-input"
             accept="image/*;capture=camera"
             capture="environment"
             [disabled]="isDisabled()"
             (change)="onFileSelected($event)"
             tabindex="-1" />
    </div>
  `,
  styleUrl: './pb-file-upload.component.css',
})
export class PbFileUploadComponent implements ControlValueAccessor {
  readonly maxSizeMb = MAX_SIZE_MB;
  readonly acceptTypes = ALLOWED_TYPES.join(',');

  readonly selectedFile = signal<File | null>(null);
  readonly thumbnailUrl = signal<string | null>(null);
  readonly isDragOver = signal(false);
  readonly isDisabled = signal(false);
  readonly uploadProgress = signal(100);
  readonly errorText = signal('');

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  readonly cameraInput = viewChild.required<ElementRef<HTMLInputElement>>('cameraInput');

  private onChange: (file: File | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(file: File | null): void {
    if (!file) {
      this.clearPreview();
      return;
    }
    this.selectedFile.set(file);
    this.generateThumbnail(file);
  }

  registerOnChange(fn: (file: File | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isDisabled()) {
      this.isDragOver.set(true);
    }
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (this.isDisabled()) return;

    const file = event.dataTransfer?.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processFile(file);
    }
    input.value = '';
  }

  removeFile(): void {
    this.clearPreview();
    this.onChange(null);
    this.onTouched();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private processFile(file: File): void {
    this.errorText.set('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.errorText.set('JPG, PNG, PDF 형식만 업로드 가능합니다.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      this.errorText.set(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
      return;
    }

    this.selectedFile.set(file);
    this.generateThumbnail(file);
    this.simulateUpload();
    this.onChange(file);
    this.onTouched();
  }

  private generateThumbnail(file: File): void {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.thumbnailUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      this.thumbnailUrl.set(null);
    }
  }

  private simulateUpload(): void {
    this.uploadProgress.set(0);
    const interval = setInterval(() => {
      const current = this.uploadProgress();
      if (current >= 100) {
        clearInterval(interval);
        return;
      }
      const increment = Math.random() * 20 + 10;
      this.uploadProgress.set(Math.min(100, current + increment));
    }, 150);
  }

  private clearPreview(): void {
    if (this.thumbnailUrl()) {
      this.thumbnailUrl.set(null);
    }
    this.selectedFile.set(null);
    this.uploadProgress.set(100);
    this.errorText.set('');
  }
}
