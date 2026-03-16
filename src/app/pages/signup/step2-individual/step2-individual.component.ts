import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SignupService } from '../../../shared/services/signup.service';
import { DaumPostcodeService } from '../../../shared/services/daum-postcode.service';
import { IdOcrService } from '../../../shared/services/id-ocr.service';
import { IdCameraGuideComponent } from '../../../shared/components/id-camera-guide/id-camera-guide.component';

@Component({
  selector: 'app-step2-individual',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IdCameraGuideComponent],
  template: `
    <div class="step-container">
      <div class="step-header">
        <h2 class="step-title">개인 정보</h2>
        <p class="step-description">본인 확인을 위한 정보를 입력해 주세요.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="step-form">

        <!-- 수동입력 모드: 신분증 먼저 촬영 → OCR로 주민번호 자동입력 -->
        @if (!niceAutoFilled()) {
          <ng-container *ngTemplateOutlet="idUploadTpl"></ng-container>
        }

        <!-- 주민등록번호 앞자리 + 성별 -->
        <div class="form-field">
          <span class="form-label">
            주민등록번호 <span class="required">*</span>
          </span>
          <div
            class="rrn-field"
            [class.focused]="rrnFocused()"
            [class.error]="isFieldInvalid('birthDate') || isFieldInvalid('genderDigit')"
          >
            <div class="rrn-front">
              <input
                id="birthDate"
                type="text"
                formControlName="birthDate"
                class="rrn-input"
                [class.auto-filled]="rrnAutoFilled()"
                placeholder="000000"
                maxlength="6"
                inputmode="numeric"
                autocomplete="off"
                [readonly]="rrnAutoFilled()"
                (focus)="rrnFocused.set(true)"
                (blur)="rrnFocused.set(false)"
              />
            </div>
            <span class="rrn-separator">-</span>
            <div class="rrn-back">
              <input
                id="genderDigit"
                type="text"
                formControlName="genderDigit"
                class="rrn-input rrn-gender"
                [class.auto-filled]="rrnAutoFilled()"
                placeholder="0"
                maxlength="1"
                inputmode="numeric"
                autocomplete="off"
                [readonly]="rrnAutoFilled()"
                (focus)="rrnFocused.set(true)"
                (blur)="rrnFocused.set(false)"
              />
              <span class="rrn-dots">
                <span class="rrn-dot"></span>
                <span class="rrn-dot"></span>
                <span class="rrn-dot"></span>
                <span class="rrn-dot"></span>
                <span class="rrn-dot"></span>
                <span class="rrn-dot"></span>
              </span>
            </div>
          </div>
          <div class="field-feedback">
            @if (isFieldInvalid('birthDate')) {
              @if (form.get('birthDate')?.errors?.['required']) {
                <span class="hint error">생년월일 6자리를 입력해 주세요.</span>
              } @else if (form.get('birthDate')?.errors?.['invalidBirthDate']) {
                <span class="hint error">올바른 생년월일을 입력해 주세요.</span>
              }
            }
            @if (isFieldInvalid('genderDigit')) {
              @if (form.get('genderDigit')?.errors?.['required']) {
                <span class="hint error">성별 구분 숫자를 입력해 주세요.</span>
              } @else if (form.get('genderDigit')?.errors?.['invalidGender']) {
                <span class="hint error">1~4 중 하나를 입력해 주세요.</span>
              }
            }
          </div>
          @if (niceAutoFilled()) {
            <p class="field-help nice-auto-hint">
              <span class="material-symbols-rounded help-icon nice-check">verified_user</span>
              본인인증으로 자동 입력되었습니다.
            </p>
          } @else if (ocrAutoFilled()) {
            <p class="field-help nice-auto-hint">
              <span class="material-symbols-rounded help-icon nice-check">document_scanner</span>
              신분증에서 자동 인식되었습니다.
            </p>
          } @else {
            <p class="field-help">
              <span class="material-symbols-rounded help-icon">info</span>
              생년월일 6자리와 뒷자리 첫 번째 숫자(성별 구분)만 입력합니다.
            </p>
          }
        </div>

        <!-- 주소 -->
        <div class="form-field">
          <label for="address" class="form-label">
            주소 <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <input
              id="address"
              type="text"
              formControlName="address"
              class="form-input"
              [class.error]="isFieldInvalid('address')"
              placeholder="주소를 검색해 주세요"
              readonly
            />
            <button
              type="button"
              class="btn-action"
              (click)="openAddressSearch()"
            >
              검색
            </button>
          </div>
          <input
            id="addressDetail"
            type="text"
            formControlName="addressDetail"
            class="form-input address-detail"
            placeholder="상세 주소를 입력하세요 (동/호수 등)"
          />
          <div class="field-feedback">
            @if (isFieldInvalid('address') && form.get('address')?.errors?.['required']) {
              <span class="hint error">주소를 입력해 주세요.</span>
            }
          </div>
        </div>

        <!-- 영수증 표시 상호 -->
        <div class="form-field">
          <label for="receiptBusinessName" class="form-label">
            영수증 표시 상호 <span class="required">*</span>
          </label>
          <input
            id="receiptBusinessName"
            type="text"
            formControlName="receiptBusinessName"
            class="form-input"
            [class.error]="isFieldInvalid('receiptBusinessName')"
            placeholder="영수증에 표시될 상호를 입력하세요"
          />
          <div class="field-feedback">
            @if (isFieldInvalid('receiptBusinessName') && form.get('receiptBusinessName')?.errors?.['required']) {
              <span class="hint error">영수증 표시 상호를 입력해 주세요.</span>
            }
          </div>
        </div>

        <!-- 판매업종/품목 -->
        <div class="form-field">
          <label for="salesCategory" class="form-label">
            판매업종 / 품목 <span class="required">*</span>
          </label>
          <input
            id="salesCategory"
            type="text"
            formControlName="salesCategory"
            class="form-input"
            [class.error]="isFieldInvalid('salesCategory')"
            placeholder="예: 소매업 / 의류"
          />
          <div class="field-feedback">
            @if (isFieldInvalid('salesCategory') && form.get('salesCategory')?.errors?.['required']) {
              <span class="hint error">판매업종/품목을 입력해 주세요.</span>
            }
          </div>
        </div>

        <!-- 본인인증 모드: 신분증은 아래에 표시 -->
        @if (niceAutoFilled()) {
          <ng-container *ngTemplateOutlet="idUploadTpl"></ng-container>
        }

        <!-- 버튼 -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="goBack()">이전</button>
          <button type="submit" class="btn btn-primary" [disabled]="!canProceed()">다음 단계</button>
        </div>
      </form>

      <app-id-camera-guide
        [isOpen]="cameraOpen()"
        (captured)="onCameraCapture($event)"
        (closed)="cameraOpen.set(false)"
      />

      <!-- 신분증 업로드 (재사용 템플릿) -->
      <ng-template #idUploadTpl>
        <div class="form-field">
          <label class="form-label">
            신분증 사본 <span class="required">*</span>
            @if (!niceAutoFilled()) {
              <span class="ocr-badge">자동 인식</span>
            }
          </label>
          <div class="file-upload-zone"
               [class.drag-over]="isDragOver()"
               [class.has-file]="!!selectedFileName()"
               [class.error]="fileRequired()"
               (dragover)="onDragOver($event)"
               (dragleave)="isDragOver.set(false)"
               (drop)="onDrop($event)">
            @if (ocrProcessing()) {
              <div class="ocr-loading">
                <div class="ocr-spinner"></div>
                <p class="ocr-loading-text">신분증 인식 중... {{ ocrProgress() }}%</p>
                <div class="ocr-progress-bar">
                  <div class="ocr-progress-fill" [style.width.%]="ocrProgress()"></div>
                </div>
              </div>
            } @else if (!selectedFileName()) {
              <div class="upload-placeholder">
                <span class="material-symbols-rounded upload-placeholder-icon">badge</span>
                @if (!niceAutoFilled()) {
                  <p class="upload-placeholder-text">신분증을 촬영하면<br/>주민번호가 자동 입력됩니다</p>
                } @else {
                  <p class="upload-placeholder-text">신분증을 등록해 주세요</p>
                }
                <p class="upload-placeholder-sub">주민등록증, 운전면허증, 여권</p>
              </div>
              <div class="upload-actions">
                <button type="button" class="upload-action-btn upload-action-camera" (click)="openCameraGuide()">
                  <span class="material-symbols-rounded">photo_camera</span>
                  촬영
                </button>
                <button type="button" class="upload-action-btn upload-action-file" (click)="fileInput.click()">
                  <span class="material-symbols-rounded">upload_file</span>
                  첨부
                </button>
              </div>
            } @else {
              <div class="file-preview-full">
                @if (thumbnailUrl()) {
                  <img class="preview-img" [src]="thumbnailUrl()" alt="신분증 미리보기" />
                } @else {
                  <div class="preview-file-icon">
                    <span class="material-symbols-rounded">description</span>
                    <span class="preview-file-name">{{ selectedFileName() }}</span>
                  </div>
                }
                @if (!rrnAutoFilled()) {
                  <button type="button" class="retake-btn" (click)="retakePhoto()">
                    <span class="material-symbols-rounded">photo_camera</span>
                    재촬영
                  </button>
                }
              </div>
            }
          </div>
          <!-- 카메라 촬영 (모바일) -->
          <input
            #cameraInput
            type="file"
            accept="image/*"
            capture="environment"
            (change)="onFileSelected($event)"
            style="display: none"
          />
          <!-- 파일 첨부 (데스크톱) -->
          <input
            #fileInput
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            (change)="onFileSelected($event)"
            style="display: none"
          />
          <div class="field-feedback">
            @if (fileRequired()) {
              <span class="hint error">신분증 사본을 업로드해 주세요.</span>
            }
            @if (fileError()) {
              <span class="hint error">{{ fileError() }}</span>
            }
            @if (ocrError()) {
              <span class="hint warning">{{ ocrError() }}</span>
            }
          </div>
          <p class="field-help">
            <span class="material-symbols-rounded help-icon">lock</span>
            개인정보는 암호화되어 안전하게 처리됩니다.
          </p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .step-container {
      max-width: var(--pb-container-sm);
      margin: 0 auto;
      padding: var(--pb-space-6) var(--pb-space-4);
    }
    .step-header { margin-bottom: var(--pb-space-5); }
    .step-title {
      font-size: var(--pb-text-2xl);
      font-weight: var(--pb-weight-bold);
      color: var(--pb-gray-900);
      margin: 0 0 var(--pb-space-1);
    }
    .step-description {
      font-size: var(--pb-text-base);
      color: var(--pb-gray-500);
      margin: 0;
    }
    .step-form {
      display: flex;
      flex-direction: column;
      gap: var(--pb-space-5);
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--pb-space-1);
    }
    .form-label {
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-medium);
      color: var(--pb-gray-700);
    }
    .required { color: var(--pb-error-500); }

    /* 주민등록번호 — 통합 필드 */
    .rrn-field {
      display: flex;
      align-items: center;
      min-height: 48px;
      border: 1.5px solid var(--pb-gray-200);
      border-radius: var(--pb-radius-md);
      background: #fff;
      transition: border-color var(--pb-duration-fast) var(--pb-ease-out),
                  box-shadow var(--pb-duration-fast) var(--pb-ease-out);
      overflow: hidden;
    }
    .rrn-field.focused {
      border-color: var(--pb-primary-400);
      box-shadow: 0 0 0 3px var(--pb-primary-50);
    }
    .rrn-field.error {
      border-color: var(--pb-error-500);
      background: var(--pb-error-50);
    }
    .rrn-front {
      flex: 1;
      display: flex;
    }
    .rrn-separator {
      flex-shrink: 0;
      width: 24px;
      text-align: center;
      font-size: var(--pb-text-xl);
      font-weight: var(--pb-weight-bold);
      color: var(--pb-gray-300);
      user-select: none;
    }
    .rrn-back {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      padding-right: var(--pb-space-4);
    }
    .rrn-input {
      border: none;
      outline: none;
      background: transparent;
      font-size: var(--pb-text-base);
      font-family: var(--pb-font-primary);
      font-variant-numeric: tabular-nums;
      color: var(--pb-gray-900);
      letter-spacing: 0.2em;
      min-height: 44px;
    }
    .rrn-input::placeholder { color: var(--pb-gray-400); letter-spacing: 0.2em; }
    .rrn-front .rrn-input {
      width: 100%;
      text-align: center;
      padding: 0 var(--pb-space-3);
    }
    .rrn-gender {
      width: 28px;
      text-align: center;
      padding: 0;
      flex-shrink: 0;
    }
    .rrn-dots {
      display: flex;
      align-items: center;
      gap: 6px;
      user-select: none;
    }
    .rrn-dot {
      display: block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--pb-gray-300);
    }

    /* 입력 필드 */
    .form-input {
      width: 100%;
      min-height: 44px;
      padding: var(--pb-space-2) var(--pb-space-3);
      border: 1.5px solid var(--pb-gray-200);
      border-radius: var(--pb-radius-md);
      font-size: var(--pb-text-base);
      font-family: var(--pb-font-primary);
      color: var(--pb-gray-900);
      background: #fff;
      transition: border-color var(--pb-duration-fast) var(--pb-ease-out),
                  box-shadow var(--pb-duration-fast) var(--pb-ease-out);
      box-sizing: border-box;
    }
    .form-input::placeholder { color: var(--pb-gray-400); }
    .form-input:focus {
      outline: none;
      border-color: var(--pb-primary-400);
      box-shadow: 0 0 0 3px var(--pb-primary-50);
    }
    .form-input.error {
      border-color: var(--pb-error-500);
      background: var(--pb-error-50);
    }
    .form-input[readonly] { background: var(--pb-gray-50); cursor: pointer; }
    .address-detail { margin-top: var(--pb-space-2); }

    .input-wrapper {
      display: flex;
      align-items: center;
      gap: var(--pb-space-2);
    }
    .btn-action {
      flex-shrink: 0;
      min-height: 44px;
      padding: var(--pb-space-2) var(--pb-space-4);
      border: 1.5px solid var(--pb-primary-500);
      border-radius: var(--pb-radius-md);
      background: #fff;
      color: var(--pb-primary-500);
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-semibold);
      font-family: var(--pb-font-primary);
      cursor: pointer;
      transition: all var(--pb-duration-fast) var(--pb-ease-out);
      white-space: nowrap;
    }
    .btn-action:hover { background: var(--pb-primary-50); }

    .field-feedback { min-height: 0; }
    .hint {
      font-size: var(--pb-text-xs);
      display: flex;
      align-items: center;
      gap: var(--pb-space-1);
    }
    .hint.error { color: var(--pb-error-500); }

    .field-help {
      display: flex;
      align-items: center;
      gap: var(--pb-space-1);
      font-size: var(--pb-text-xs);
      color: var(--pb-gray-500);
      margin: 0;
    }
    .help-icon {
      font-size: 14px;
      color: var(--pb-gray-400);
    }
    .nice-check { color: var(--pb-success-500); }
    .nice-auto-hint { color: var(--pb-success-600); }
    .rrn-input.auto-filled { color: var(--pb-gray-600); }

    /* 파일 업로드 */
    .file-upload-zone {
      border: 2px dashed var(--pb-gray-200);
      border-radius: var(--pb-radius-lg);
      padding: var(--pb-space-5) var(--pb-space-4);
      text-align: center;
      background: var(--pb-gray-50);
      transition: all var(--pb-duration-fast) var(--pb-ease-out);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--pb-space-3);
    }
    .file-upload-zone:hover { border-color: var(--pb-primary-300); background: var(--pb-primary-50); }
    .file-upload-zone.drag-over { border-color: var(--pb-primary-500); background: var(--pb-primary-50); }
    .file-upload-zone.has-file {
      border-style: solid;
      border-color: var(--pb-success-400);
      background: var(--pb-success-50);
      padding: 0;
      overflow: hidden;
    }
    .file-upload-zone.error { border-color: var(--pb-error-500); background: var(--pb-error-50); }
    .upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: var(--pb-space-2); }
    .upload-placeholder-icon { font-size: 2.5rem; color: var(--pb-gray-300); }
    .upload-placeholder-text { font-size: var(--pb-text-sm); color: var(--pb-gray-500); margin: 0; }
    .upload-placeholder-sub { font-size: var(--pb-text-xs); color: var(--pb-gray-400); margin: 0; }
    .upload-placeholder-text br { display: block; }
    .ocr-badge {
      display: inline-block; font-size: 10px; font-weight: var(--pb-weight-semibold);
      color: var(--pb-primary-600); background: var(--pb-primary-50);
      border: 1px solid var(--pb-primary-200); border-radius: 10px;
      padding: 1px 8px; margin-left: var(--pb-space-1); vertical-align: middle;
    }
    .ocr-loading { display: flex; flex-direction: column; align-items: center; gap: var(--pb-space-2); padding: var(--pb-space-2) 0; }
    .ocr-spinner {
      width: 32px; height: 32px; border: 3px solid var(--pb-gray-200);
      border-top-color: var(--pb-primary-500); border-radius: 50%;
      animation: ocr-spin .7s linear infinite;
    }
    @keyframes ocr-spin { to { transform: rotate(360deg); } }
    .ocr-loading-text { font-size: var(--pb-text-sm); color: var(--pb-gray-500); margin: 0; }
    .ocr-progress-bar { width: 100%; max-width: 200px; height: 4px; background: var(--pb-gray-200); border-radius: 2px; overflow: hidden; }
    .ocr-progress-fill { height: 100%; background: var(--pb-primary-500); border-radius: 2px; transition: width .3s ease; }
    .hint.warning { color: #b45309; }
    .upload-actions { display: flex; gap: var(--pb-space-2); width: 100%; max-width: 280px; }
    .upload-action-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--pb-space-1);
      padding: var(--pb-space-2) var(--pb-space-3);
      min-height: 40px;
      border: 1.5px solid var(--pb-gray-200);
      border-radius: var(--pb-radius-md);
      background: #fff;
      color: var(--pb-gray-600);
      font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-semibold);
      font-family: var(--pb-font-primary);
      cursor: pointer;
      transition: all var(--pb-duration-fast) var(--pb-ease-out);
    }
    .upload-action-btn .material-symbols-rounded { font-size: 18px; }
    .upload-action-btn:hover { border-color: var(--pb-primary-400); color: var(--pb-primary-600); background: var(--pb-primary-50); }
    .upload-action-camera { border-color: var(--pb-primary-300); color: var(--pb-primary-600); background: var(--pb-primary-50); }
    .upload-action-camera:hover { background: var(--pb-primary-100); }
    @media (min-width: 641px) { .upload-action-camera { display: none; } .upload-actions { justify-content: center; } }
    @media (max-width: 640px) { .upload-action-file { display: none; } .upload-actions { max-width: 100%; } }
    .file-preview-full { position: relative; width: 100%; }
    .preview-img { width: 100%; display: block; border-radius: calc(var(--pb-radius-lg) - 2px); }
    .preview-file-icon {
      display: flex; flex-direction: column; align-items: center; gap: var(--pb-space-2);
      padding: var(--pb-space-6) var(--pb-space-4);
    }
    .preview-file-icon .material-symbols-rounded { font-size: 2.5rem; color: var(--pb-success-500); }
    .preview-file-name {
      font-size: var(--pb-text-xs); color: var(--pb-gray-600);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;
    }
    .retake-btn {
      position: absolute; bottom: var(--pb-space-3); right: var(--pb-space-3);
      display: flex; align-items: center; gap: var(--pb-space-1);
      padding: var(--pb-space-2) var(--pb-space-3);
      background: rgba(0,0,0,.6); color: #fff; border: none;
      border-radius: var(--pb-radius-md); font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-semibold); font-family: var(--pb-font-primary);
      cursor: pointer; backdrop-filter: blur(4px);
      transition: background .15s ease-out;
    }
    .retake-btn .material-symbols-rounded { font-size: 18px; }
    .retake-btn:hover { background: rgba(0,0,0,.8); }

    /* 버튼 */
    .form-actions {
      display: flex;
      justify-content: space-between;
      gap: var(--pb-space-3);
      padding-top: var(--pb-space-2);
    }
    .btn {
      min-height: 44px;
      padding: var(--pb-space-2) var(--pb-space-8);
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
    .btn-secondary {
      background: var(--pb-gray-100);
      color: var(--pb-gray-600);
      border: 1.5px solid var(--pb-gray-200);
    }
    .btn-secondary:hover { background: var(--pb-gray-200); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    @media (max-width: 640px) {
      .rrn-front .rrn-input { font-size: var(--pb-text-sm); letter-spacing: 0.12em; }
      .rrn-gender { font-size: var(--pb-text-sm); }
      .rrn-dot { width: 6px; height: 6px; }
      .rrn-dots { gap: 4px; }
      .form-actions { flex-direction: column-reverse; }
      .btn { width: 100%; }
    }
  `]
})
export class Step2IndividualComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly signupService = inject(SignupService);
  private readonly postcodeService = inject(DaumPostcodeService);
  private readonly idOcrService = inject(IdOcrService);
  private readonly destroy$ = new Subject<void>();

  readonly rrnFocused = signal(false);
  readonly niceAutoFilled = signal(false);
  readonly ocrAutoFilled = signal(false);
  readonly cameraOpen = signal(false);
  readonly rrnAutoFilled = computed(() => this.niceAutoFilled() || this.ocrAutoFilled());
  readonly ocrProcessing = this.idOcrService.processing;
  readonly ocrProgress = this.idOcrService.progress;
  readonly ocrError = this.idOcrService.errorMessage;
  readonly isDragOver = signal(false);
  readonly selectedFileName = signal<string | null>(null);
  readonly fileSize = signal('');
  readonly thumbnailUrl = signal<string | null>(null);
  readonly fileError = signal('');
  readonly fileRequired = signal(false);

  private selectedFile: File | null = null;
  private fileSubmitAttempted = false;

  readonly form: FormGroup = this.fb.group({
    birthDate: ['', [Validators.required, Step2IndividualComponent.birthDateValidator()]],
    genderDigit: ['', [Validators.required, Step2IndividualComponent.genderValidator()]],
    address: ['', [Validators.required]],
    addressDetail: [''],
    receiptBusinessName: ['', [Validators.required]],
    salesCategory: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.restoreFormData();
    this.applyNiceAuthData();
    this.setupNumericFilter('birthDate', 6);
    this.setupNumericFilter('genderDigit', 1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  canProceed(): boolean {
    return this.form.valid && !!this.selectedFile;
  }

  async openAddressSearch(): Promise<void> {
    try {
      const result = await this.postcodeService.open();
      this.form.get('address')?.setValue(result.roadAddress);
      this.form.get('address')?.markAsDirty();
      // 주소 선택 후 상세주소 입력으로 포커스 이동
      document.getElementById('addressDetail')?.focus();
    } catch {
      // 사용자가 창을 닫은 경우 무시
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
    input.value = '';
  }

  openCameraGuide(): void {
    this.cameraOpen.set(true);
  }

  onCameraCapture(file: File): void {
    this.cameraOpen.set(false);
    this.setFile(file);
  }

  retakePhoto(): void {
    this.selectedFile = null;
    this.selectedFileName.set(null);
    this.thumbnailUrl.set(null);
    this.fileSize.set('');
    if (this.ocrAutoFilled()) {
      this.ocrAutoFilled.set(false);
      this.form.patchValue({ birthDate: '', genderDigit: '' }, { emitEvent: false });
    }
    this.cameraOpen.set(true);
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.selectedFileName.set(null);
    this.thumbnailUrl.set(null);
    this.fileSize.set('');
    if (this.ocrAutoFilled()) {
      this.ocrAutoFilled.set(false);
      this.form.patchValue({ birthDate: '', genderDigit: '' }, { emitEvent: false });
    }
    if (this.fileSubmitAttempted) {
      this.fileRequired.set(true);
    }
  }

  goBack(): void {
    this.saveFormData();
    this.signupService.goToStep(1);
    this.router.navigate(['/step/1']);
  }

  onSubmit(): void {
    this.fileSubmitAttempted = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
    }
    if (!this.selectedFile) {
      this.fileRequired.set(true);
    }
    if (!this.canProceed()) return;

    this.fileRequired.set(false);
    const { birthDate, genderDigit, address, addressDetail, receiptBusinessName, salesCategory } = this.form.value;
    this.signupService.updateStep2Individual({
      birthDate,
      genderDigit,
      address,
      addressDetail,
      receiptBusinessName,
      salesCategory,
      idDocumentFile: this.selectedFile,
    });
    this.signupService.goToStep(3);
    this.router.navigate(['/step/3']);
  }

  private setFile(file: File): void {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024;

    this.fileError.set('');
    this.fileRequired.set(false);

    if (!allowed.includes(file.type)) {
      this.fileError.set('JPG, PNG, PDF 형식만 업로드 가능합니다.');
      return;
    }
    if (file.size > maxSize) {
      this.fileError.set('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    this.selectedFile = file;
    this.selectedFileName.set(file.name);
    this.fileSize.set(this.formatSize(file.size));
    this.generateThumbnail(file);

    // 수동입력 모드 + 이미지 파일 → OCR로 주민번호 자동 추출
    if (!this.niceAutoFilled() && file.type.startsWith('image/')) {
      this.runOcr(file);
    }
  }

  private async runOcr(file: File): Promise<void> {
    const result = await this.idOcrService.extractFromImage(file);
    if (result) {
      this.form.patchValue({
        birthDate: result.birthDate,
        genderDigit: result.genderDigit,
      }, { emitEvent: false });
      this.ocrAutoFilled.set(true);
    }
  }

  private generateThumbnail(file: File): void {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => this.thumbnailUrl.set(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      this.thumbnailUrl.set(null);
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private restoreFormData(): void {
    const saved = this.signupService.formData().step2Individual;
    if (saved.birthDate) {
      this.form.patchValue({
        birthDate: saved.birthDate,
        genderDigit: saved.genderDigit,
        address: saved.address,
        addressDetail: saved.addressDetail,
        receiptBusinessName: saved.receiptBusinessName ?? '',
        salesCategory: saved.salesCategory ?? '',
      }, { emitEvent: false });
    }
  }

  private saveFormData(): void {
    const { birthDate, genderDigit, address, addressDetail, receiptBusinessName, salesCategory } = this.form.value;
    this.signupService.updateStep2Individual({
      birthDate, genderDigit, address, addressDetail,
      receiptBusinessName, salesCategory,
      idDocumentFile: this.selectedFile,
    });
  }

  private applyNiceAuthData(): void {
    const niceAuth = this.signupService.niceAuthResult();
    if (niceAuth?.verified && niceAuth.birthDate && niceAuth.genderDigit) {
      this.form.patchValue({
        birthDate: niceAuth.birthDate,
        genderDigit: niceAuth.genderDigit,
      }, { emitEvent: false });
      this.niceAutoFilled.set(true);
    }
  }

  private setupNumericFilter(fieldName: string, maxLen: number): void {
    const control = this.form.get(fieldName);
    if (!control) return;

    control.valueChanges.pipe(
      takeUntil(this.destroy$),
    ).subscribe(value => {
      if (!value) return;
      const numbersOnly = value.replace(/[^0-9]/g, '').slice(0, maxLen);
      if (numbersOnly !== value) {
        control.setValue(numbersOnly, { emitEvent: false });
      }
    });
  }

  static birthDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const v = control.value;
      if (v.length !== 6 || !/^\d{6}$/.test(v)) return { invalidBirthDate: true };
      const month = parseInt(v.substring(2, 4), 10);
      const day = parseInt(v.substring(4, 6), 10);
      if (month < 1 || month > 12) return { invalidBirthDate: true };
      if (day < 1 || day > 31) return { invalidBirthDate: true };
      return null;
    };
  }

  static genderValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      return /^[1-4]$/.test(control.value) ? null : { invalidGender: true };
    };
  }
}
