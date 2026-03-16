import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SignupService } from '../../../shared/services/signup.service';
import { ValidationService } from '../../../shared/services/validation.service';
import { DaumPostcodeService } from '../../../shared/services/daum-postcode.service';
import { BusinessVerificationService } from '../../../shared/services/business-verification.service';
import { IdCameraGuideComponent } from '../../../shared/components/id-camera-guide/id-camera-guide.component';

@Component({
  selector: 'app-step2-business',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IdCameraGuideComponent],
  template: `
    <div class="step-container">
      <div class="step-header">
        <h2 class="step-title">사업자 정보</h2>
        <p class="step-description">사업자 등록 정보를 입력해 주세요.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="step-form">
        <!-- 사업자등록번호 -->
        <div class="form-field">
          <label for="businessNumber" class="form-label">
            사업자등록번호 <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <input
              id="businessNumber"
              type="text"
              formControlName="businessNumber"
              class="form-input"
              [class.error]="isFieldInvalid('businessNumber')"
              [class.success]="isBusinessVerified()"
              placeholder="000-00-00000"
              maxlength="12"
              inputmode="numeric"
            />
            <button
              type="button"
              class="btn-verify"
              (click)="verifyBusinessNumber()"
              [disabled]="!canVerify() || verifying()"
            >
              @if (verifying()) {
                <span class="spinner"></span>
              } @else {
                조회
              }
            </button>
          </div>
          <div class="field-feedback">
            @if (isFieldInvalid('businessNumber') && form.get('businessNumber')?.errors?.['invalidLength']) {
              <span class="hint error">10자리 숫자를 입력해 주세요.</span>
            }
            @if (isFieldInvalid('businessNumber') && form.get('businessNumber')?.errors?.['invalidChecksum']) {
              <span class="hint error">올바른 사업자등록번호를 입력해 주세요.</span>
            }
            @if (verificationResult() === 'valid') {
              <span class="hint success">
                <span class="material-symbols-rounded hint-icon">check_circle</span>
                정상 사업자 확인 완료
              </span>
            }
          </div>
        </div>

        <!-- 조회 결과 팝업 -->
        @if (showPopup()) {
          <div class="popup-overlay" (click)="closePopup()">
            <div class="popup-card pb-animate-fadeIn" (click)="$event.stopPropagation()">
              @switch (popupType()) {
                @case ('valid') {
                  <div class="popup-icon-wrap popup-icon-success">
                    <span class="material-symbols-rounded">check_circle</span>
                  </div>
                  <h3 class="popup-title">정상 사업자 확인</h3>
                  <p class="popup-message">
                    국세청 조회 결과 <strong>정상 사업자</strong>로 확인되었습니다.<br>
                    아래 사업자 정보를 입력해 주세요.
                  </p>
                  <button class="popup-btn popup-btn-primary" (click)="closePopup()">확인</button>
                }
                @case ('suspended') {
                  <div class="popup-icon-wrap popup-icon-warning">
                    <span class="material-symbols-rounded">warning</span>
                  </div>
                  <h3 class="popup-title">휴업 사업자</h3>
                  <p class="popup-message">
                    해당 사업자등록번호는 현재 <strong>휴업 상태</strong>입니다.<br>
                    휴업 중인 사업자는 가입이 불가합니다.<br>
                    사업자 상태를 확인 후 다시 시도해 주세요.
                  </p>
                  <button class="popup-btn popup-btn-secondary" (click)="closePopup()">다른 번호로 조회</button>
                }
                @case ('closed') {
                  <div class="popup-icon-wrap popup-icon-error">
                    <span class="material-symbols-rounded">cancel</span>
                  </div>
                  <h3 class="popup-title">폐업 사업자</h3>
                  <p class="popup-message">
                    해당 사업자등록번호는 <strong>폐업 처리</strong>된 번호입니다.<br>
                    폐업 사업자는 가입이 불가합니다.<br>
                    다른 사업자등록번호로 다시 조회해 주세요.
                  </p>
                  <button class="popup-btn popup-btn-secondary" (click)="closePopup()">다른 번호로 조회</button>
                }
                @case ('invalid') {
                  <div class="popup-icon-wrap popup-icon-error">
                    <span class="material-symbols-rounded">error</span>
                  </div>
                  <h3 class="popup-title">조회 실패</h3>
                  <p class="popup-message">
                    등록되지 않은 사업자등록번호입니다.<br>
                    번호를 다시 확인해 주세요.
                  </p>
                  <button class="popup-btn popup-btn-secondary" (click)="closePopup()">다시 입력</button>
                }
              }
            </div>
          </div>
        }

        <!-- 조회 성공 후 사업자 상세 정보 -->
        @if (isBusinessVerified()) {
          <div class="verified-section pb-animate-fadeIn">
            <div class="verified-header">
              <span class="material-symbols-rounded verified-icon">verified</span>
              <span>사업자 확인 완료 — 아래 정보를 입력해 주세요.</span>
            </div>

            <!-- 상호 (API 응답에 값이 있으면 readonly, 없으면 직접 입력) -->
            <div class="form-field">
              <label for="businessName" class="form-label">
                상호 <span class="required">*</span>
              </label>
              <input
                id="businessName"
                type="text"
                formControlName="businessName"
                class="form-input"
                [class.auto-filled]="autoFilled().businessName"
                [readonly]="autoFilled().businessName"
                [class.error]="isFieldInvalid('businessName')"
                placeholder="상호명을 입력하세요"
              />
              <div class="field-feedback">
                @if (autoFilled().businessName) {
                  <span class="hint success">
                    <span class="material-symbols-rounded hint-icon">check_circle</span>
                    자동 입력됨
                  </span>
                }
                @if (isFieldInvalid('businessName') && form.get('businessName')?.errors?.['required']) {
                  <span class="hint error">상호를 입력해 주세요.</span>
                }
              </div>
            </div>

            <!-- 대표자명 -->
            <div class="form-field">
              <label for="ownerName" class="form-label">
                대표자명 <span class="required">*</span>
              </label>
              <input
                id="ownerName"
                type="text"
                formControlName="ownerName"
                class="form-input"
                [class.auto-filled]="autoFilled().ownerName"
                [readonly]="autoFilled().ownerName"
                [class.error]="isFieldInvalid('ownerName')"
                placeholder="대표자명을 입력하세요"
              />
              <div class="field-feedback">
                @if (autoFilled().ownerName) {
                  <span class="hint success">
                    <span class="material-symbols-rounded hint-icon">check_circle</span>
                    자동 입력됨
                  </span>
                }
                @if (isFieldInvalid('ownerName') && form.get('ownerName')?.errors?.['required']) {
                  <span class="hint error">대표자명을 입력해 주세요.</span>
                }
              </div>
            </div>

            <!-- 사업장 주소 -->
            <div class="form-field">
              <label for="address" class="form-label">
                사업장 주소 <span class="required">*</span>
              </label>
              @if (autoFilled().address) {
                <input
                  id="address"
                  type="text"
                  formControlName="address"
                  class="form-input auto-filled"
                  readonly
                />
                <span class="hint success" style="margin-top: var(--pb-space-1)">
                  <span class="material-symbols-rounded hint-icon">check_circle</span>
                  자동 입력됨
                </span>
              } @else {
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
                    class="btn-verify"
                    (click)="openAddressSearch()"
                  >
                    검색
                  </button>
                </div>
              }
              <input
                id="addressDetail"
                type="text"
                formControlName="addressDetail"
                class="form-input"
                placeholder="상세 주소를 입력하세요 (동/호수 등)"
                style="margin-top: var(--pb-space-2)"
              />
              <div class="field-feedback">
                @if (isFieldInvalid('address') && form.get('address')?.errors?.['required']) {
                  <span class="hint error">주소를 입력해 주세요.</span>
                }
              </div>
            </div>

            <!-- 업태 / 업종 (항상 수동 입력) -->
            <div class="form-row">
              <div class="form-field">
                <label for="businessType" class="form-label">
                  업태 <span class="required">*</span>
                </label>
                <input
                  id="businessType"
                  type="text"
                  formControlName="businessType"
                  class="form-input"
                  [class.error]="isFieldInvalid('businessType')"
                  placeholder="예: 소매업"
                />
                <div class="field-feedback">
                  @if (isFieldInvalid('businessType') && form.get('businessType')?.errors?.['required']) {
                    <span class="hint error">업태를 입력해 주세요.</span>
                  }
                </div>
              </div>

              <div class="form-field">
                <label for="businessCategory" class="form-label">
                  업종 <span class="required">*</span>
                </label>
                <input
                  id="businessCategory"
                  type="text"
                  formControlName="businessCategory"
                  class="form-input"
                  [class.error]="isFieldInvalid('businessCategory')"
                  placeholder="예: 생활용품"
                />
                <div class="field-feedback">
                  @if (isFieldInvalid('businessCategory') && form.get('businessCategory')?.errors?.['required']) {
                    <span class="hint error">업종을 입력해 주세요.</span>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        <app-id-camera-guide
          [isOpen]="docCameraOpen()"
          (captured)="onDocCameraCapture($event)"
          (closed)="docCameraOpen.set(false)"
        />
        <app-id-camera-guide
          [isOpen]="idCameraOpen()"
          (captured)="onIdCameraCapture($event)"
          (closed)="idCameraOpen.set(false)"
        />

        <!-- 사업자등록증 + 신분증 촬영 -->
        <div class="upload-row">
        <div class="form-field">
          <label class="form-label">
            사업자등록증 사본 <span class="required">*</span>
          </label>
          <div class="file-upload-zone"
               [class.drag-over]="isDragOver()"
               [class.has-file]="!!selectedFileName()"
               [class.error]="docFileRequired()"
               (dragover)="onDragOver($event)"
               (dragleave)="isDragOver.set(false)"
               (drop)="onDrop($event)">
            @if (!selectedFileName()) {
              <div class="upload-placeholder">
                <span class="material-symbols-rounded upload-placeholder-icon">description</span>
                <p class="upload-placeholder-text">사업자등록증을<br/>등록해 주세요</p>
              </div>
              <div class="upload-actions">
                <button type="button" class="upload-action-btn upload-action-camera" (click)="openDocCameraGuide()">
                  <span class="material-symbols-rounded">photo_camera</span>
                  촬영
                </button>
                <button type="button" class="upload-action-btn upload-action-file" (click)="docFileInput.click()">
                  <span class="material-symbols-rounded">upload_file</span>
                  첨부
                </button>
              </div>
            } @else {
              <div class="file-preview-full">
                @if (docThumbnailUrl()) {
                  <img class="preview-img" [src]="docThumbnailUrl()" alt="사업자등록증" />
                } @else {
                  <div class="preview-file-icon">
                    <span class="material-symbols-rounded">description</span>
                  </div>
                }
                <button type="button" class="retake-btn" (click)="retakeDocPhoto()">
                  <span class="material-symbols-rounded">photo_camera</span>
                  재촬영
                </button>
              </div>
            }
          </div>
          <input #docCameraInput type="file" accept="image/*" capture="environment" (change)="onFileSelected($event)" style="display: none" />
          <input #docFileInput type="file" accept=".jpg,.jpeg,.png,.pdf" (change)="onFileSelected($event)" style="display: none" />
          <div class="field-feedback">
            @if (docFileRequired()) {
              <span class="hint error">사업자등록증 사본을 업로드해 주세요.</span>
            }
          </div>
        </div>

        <!-- 신분증 촬영 -->
        <div class="form-field">
          <label class="form-label">
            신분증 사본 <span class="required">*</span>
          </label>
          <div class="file-upload-zone"
               [class.drag-over]="isIdDragOver()"
               [class.has-file]="!!idFileName()"
               [class.error]="idFileRequired()"
               (dragover)="onIdDragOver($event)"
               (dragleave)="isIdDragOver.set(false)"
               (drop)="onIdDrop($event)">
            @if (!idFileName()) {
              <div class="upload-placeholder">
                <span class="material-symbols-rounded upload-placeholder-icon">badge</span>
                <p class="upload-placeholder-text">신분증을<br/>등록해 주세요</p>
              </div>
              <div class="upload-actions">
                <button type="button" class="upload-action-btn upload-action-camera" (click)="openIdCameraGuide()">
                  <span class="material-symbols-rounded">photo_camera</span>
                  촬영
                </button>
                <button type="button" class="upload-action-btn upload-action-file" (click)="idFileInput.click()">
                  <span class="material-symbols-rounded">upload_file</span>
                  첨부
                </button>
              </div>
            } @else {
              <div class="file-preview-full">
                @if (idThumbnailUrl()) {
                  <img class="preview-img" [src]="idThumbnailUrl()" alt="신분증" />
                } @else {
                  <div class="preview-file-icon">
                    <span class="material-symbols-rounded">badge</span>
                  </div>
                }
                <button type="button" class="retake-btn" (click)="retakeIdPhoto()">
                  <span class="material-symbols-rounded">photo_camera</span>
                  재촬영
                </button>
              </div>
            }
          </div>
          <input #idCameraInput type="file" accept="image/*" capture="environment" (change)="onIdFileSelected($event)" style="display: none" />
          <input #idFileInput type="file" accept=".jpg,.jpeg,.png,.pdf" (change)="onIdFileSelected($event)" style="display: none" />
          <div class="field-feedback">
            @if (idFileRequired()) {
              <span class="hint error">신분증 사본을 업로드해 주세요.</span>
            }
          </div>
        </div>
        </div><!-- /upload-row -->

        <p class="security-notice">
          <span class="material-symbols-rounded security-notice-icon">lock</span>
          개인정보는 암호화되어 안전하게 처리됩니다.
        </p>

        <!-- 버튼 -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="goBack()">이전</button>
          <button type="submit" class="btn btn-primary" [disabled]="!canProceed()">다음 단계</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .step-container { max-width: var(--pb-container-sm); margin: 0 auto; padding: var(--pb-space-8) var(--pb-space-4); }
    .step-header { margin-bottom: var(--pb-space-8); }
    .step-title { font-size: var(--pb-text-2xl); font-weight: var(--pb-weight-bold); color: var(--pb-gray-900); margin: 0 0 var(--pb-space-2); }
    .step-description { font-size: var(--pb-text-base); color: var(--pb-gray-500); margin: 0; }
    .step-form { display: flex; flex-direction: column; gap: var(--pb-form-field-gap); }
    .form-field { display: flex; flex-direction: column; gap: var(--pb-space-2); }
    .form-label { font-size: var(--pb-text-sm); font-weight: var(--pb-weight-medium); color: var(--pb-gray-700); }
    .required { color: var(--pb-error-500); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--pb-space-4); }
    .input-wrapper { display: flex; align-items: center; gap: var(--pb-space-2); }
    .form-input {
      width: 100%; min-height: 48px; padding: var(--pb-form-input-padding);
      border: 1.5px solid var(--pb-gray-200); border-radius: var(--pb-radius-md);
      font-size: var(--pb-text-base); font-family: var(--pb-font-primary);
      color: var(--pb-gray-900); background: #fff; box-sizing: border-box;
      transition: border-color var(--pb-duration-fast) var(--pb-ease-out), box-shadow var(--pb-duration-fast) var(--pb-ease-out);
    }
    .form-input::placeholder { color: var(--pb-gray-400); }
    .form-input:focus { outline: none; border-color: var(--pb-primary-400); box-shadow: 0 0 0 3px var(--pb-primary-50); }
    .form-input.error { border-color: var(--pb-error-500); background: var(--pb-error-50); }
    .form-input.error:focus { box-shadow: 0 0 0 3px var(--pb-error-50); }
    .form-input.success { border-color: var(--pb-success-500); }
    .form-input[readonly] { background: var(--pb-gray-50); cursor: default; }
    .form-input.readonly { background: var(--pb-gray-50); color: var(--pb-gray-700); cursor: default; border-color: var(--pb-gray-200); }

    .verified-section {
      border: 1.5px solid var(--pb-success-200); border-radius: var(--pb-radius-lg);
      background: linear-gradient(to bottom, var(--pb-success-50), #fff 30%);
      padding: var(--pb-space-5); display: flex; flex-direction: column; gap: var(--pb-form-field-gap);
    }
    .verified-header {
      display: flex; align-items: center; gap: var(--pb-space-2);
      font-size: var(--pb-text-sm); font-weight: var(--pb-weight-semibold);
      color: var(--pb-success-700); margin-bottom: var(--pb-space-2);
    }
    .verified-icon { font-size: 20px; }
    .form-input.auto-filled { background: var(--pb-gray-50); border-color: var(--pb-success-300); color: var(--pb-gray-700); cursor: default; }
    .hint-icon { font-size: 14px; }
    .btn-verify {
      flex-shrink: 0; min-height: 48px; padding: var(--pb-space-3) var(--pb-space-4);
      border: 1.5px solid var(--pb-primary-500); border-radius: var(--pb-radius-md);
      background: #fff; color: var(--pb-primary-500); font-size: var(--pb-text-sm);
      font-weight: var(--pb-weight-semibold); font-family: var(--pb-font-primary);
      cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: var(--pb-space-1);
      transition: all var(--pb-duration-fast) var(--pb-ease-out);
    }
    .btn-verify:hover:not(:disabled) { background: var(--pb-primary-50); }
    .btn-verify:disabled { opacity: 0.5; cursor: not-allowed; }
    .field-feedback { min-height: 1.25rem; }
    .hint { font-size: var(--pb-text-xs); display: flex; align-items: center; gap: var(--pb-space-1); }
    .hint.error { color: var(--pb-error-500); }
    .hint.success { color: var(--pb-success-500); }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--pb-gray-200); border-top-color: var(--pb-primary-500); border-radius: 50%; animation: spin .6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .upload-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--pb-space-4); }
    .file-upload-zone {
      border: 2px dashed var(--pb-gray-200); border-radius: var(--pb-radius-lg);
      padding: var(--pb-space-5) var(--pb-space-3); text-align: center;
      background: var(--pb-gray-50);
      transition: all var(--pb-duration-fast) var(--pb-ease-out);
      display: flex; flex-direction: column; align-items: center; gap: var(--pb-space-3);
    }
    .file-upload-zone:hover { border-color: var(--pb-primary-300); background: var(--pb-primary-50); }
    .file-upload-zone.drag-over { border-color: var(--pb-primary-500); background: var(--pb-primary-50); }
    .file-upload-zone.has-file { border-style: solid; border-color: var(--pb-success-400); background: var(--pb-success-50); padding: 0; overflow: hidden; }
    .file-upload-zone.error { border-color: var(--pb-error-500); background: var(--pb-error-50); }
    .upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: var(--pb-space-2); }
    .upload-placeholder-icon { font-size: 2.5rem; color: var(--pb-gray-300); }
    .upload-placeholder-text { font-size: var(--pb-text-sm); color: var(--pb-gray-400); margin: 0; line-height: 1.4; }
    .upload-actions { display: flex; gap: var(--pb-space-2); width: 100%; }
    .upload-action-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--pb-space-1);
      padding: var(--pb-space-2) var(--pb-space-2); min-height: 40px;
      border: 1.5px solid var(--pb-gray-200); border-radius: var(--pb-radius-md);
      background: #fff; color: var(--pb-gray-600);
      font-size: var(--pb-text-sm); font-weight: var(--pb-weight-semibold);
      font-family: var(--pb-font-primary); cursor: pointer;
      transition: all var(--pb-duration-fast) var(--pb-ease-out);
    }
    .upload-action-btn .material-symbols-rounded { font-size: 18px; }
    .upload-action-btn:hover { border-color: var(--pb-primary-400); color: var(--pb-primary-600); background: var(--pb-primary-50); }
    .upload-action-camera { border-color: var(--pb-primary-300); color: var(--pb-primary-600); background: var(--pb-primary-50); }
    .upload-action-camera:hover { background: var(--pb-primary-100); }
    @media (min-width: 641px) { .upload-action-camera { display: none; } .upload-actions { justify-content: center; } }
    @media (max-width: 640px) { .upload-action-file { display: none; } }
    .file-preview-full { position: relative; width: 100%; }
    .preview-img { width: 100%; display: block; border-radius: calc(var(--pb-radius-lg) - 2px); }
    .preview-file-icon { display: flex; flex-direction: column; align-items: center; padding: var(--pb-space-6) var(--pb-space-4); }
    .preview-file-icon .material-symbols-rounded { font-size: 2.5rem; color: var(--pb-success-500); }
    .retake-btn {
      position: absolute; bottom: var(--pb-space-2); right: var(--pb-space-2);
      display: flex; align-items: center; gap: 4px;
      padding: var(--pb-space-1) var(--pb-space-2);
      background: rgba(0,0,0,.6); color: #fff; border: none;
      border-radius: var(--pb-radius-md); font-size: var(--pb-text-xs);
      font-weight: var(--pb-weight-semibold); font-family: var(--pb-font-primary);
      cursor: pointer; backdrop-filter: blur(4px); transition: background .15s ease-out;
    }
    .retake-btn .material-symbols-rounded { font-size: 16px; }
    .retake-btn:hover { background: rgba(0,0,0,.8); }
    .security-notice {
      display: flex; align-items: center; justify-content: center; gap: var(--pb-space-1);
      font-size: var(--pb-text-xs); color: var(--pb-gray-400); margin: 0;
    }
    .security-notice-icon { font-size: 14px; }

    .form-actions { display: flex; justify-content: space-between; gap: var(--pb-space-3); padding-top: var(--pb-space-4); }
    .btn {
      min-height: 48px; padding: var(--pb-space-3) var(--pb-space-8); border: none;
      border-radius: var(--pb-radius-md); font-size: var(--pb-text-base);
      font-weight: var(--pb-weight-semibold); font-family: var(--pb-font-primary); cursor: pointer;
      transition: background var(--pb-duration-fast) var(--pb-ease-out), opacity var(--pb-duration-fast) var(--pb-ease-out);
    }
    .btn-primary { background: var(--pb-primary-500); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--pb-primary-600); }
    .btn-secondary { background: var(--pb-gray-100); color: var(--pb-gray-600); border: 1.5px solid var(--pb-gray-200); }
    .btn-secondary:hover { background: var(--pb-gray-200); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .popup-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: var(--pb-space-4);
    }
    .popup-card {
      background: #fff; border-radius: var(--pb-radius-xl, 16px);
      padding: var(--pb-space-8) var(--pb-space-6); max-width: 400px; width: 100%;
      text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,.15);
      display: flex; flex-direction: column; align-items: center; gap: var(--pb-space-4);
    }
    .popup-icon-wrap {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    .popup-icon-wrap .material-symbols-rounded { font-size: 36px; color: #fff; }
    .popup-icon-success { background: var(--pb-success-500); }
    .popup-icon-warning { background: #f59e0b; }
    .popup-icon-error { background: var(--pb-error-500); }
    .popup-title { font-size: var(--pb-text-lg); font-weight: var(--pb-weight-bold); color: var(--pb-gray-900); margin: 0; }
    .popup-message { font-size: var(--pb-text-sm); color: var(--pb-gray-600); line-height: 1.6; margin: 0; }
    .popup-btn {
      min-height: 44px; padding: var(--pb-space-3) var(--pb-space-8); border: none;
      border-radius: var(--pb-radius-md); font-size: var(--pb-text-base);
      font-weight: var(--pb-weight-semibold); font-family: var(--pb-font-primary);
      cursor: pointer; width: 100%; margin-top: var(--pb-space-2);
      transition: background var(--pb-duration-fast) var(--pb-ease-out);
    }
    .popup-btn-primary { background: var(--pb-primary-500); color: #fff; }
    .popup-btn-primary:hover { background: var(--pb-primary-600); }
    .popup-btn-secondary { background: var(--pb-gray-100); color: var(--pb-gray-700); }
    .popup-btn-secondary:hover { background: var(--pb-gray-200); }

    @media (max-width: 640px) {
      .form-row { grid-template-columns: 1fr; }
      .form-actions { flex-direction: column-reverse; }
      .btn { width: 100%; }
      .upload-row { gap: var(--pb-space-3); }
      .upload-placeholder-icon { font-size: 2rem; }
      .upload-placeholder-text { font-size: var(--pb-text-xs); }
      .upload-action-btn { font-size: var(--pb-text-xs); min-height: 36px; padding: var(--pb-space-1) var(--pb-space-2); }
    }
  `]
})
export class Step2BusinessComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly signupService = inject(SignupService);
  private readonly postcodeService = inject(DaumPostcodeService);
  private readonly bizVerifyService = inject(BusinessVerificationService);
  private readonly destroy$ = new Subject<void>();

  readonly verifying = signal(false);
  readonly verificationResult = signal<'none' | 'valid' | 'invalid' | 'suspended' | 'closed'>('none');
  readonly showPopup = signal(false);
  readonly popupType = signal<'valid' | 'invalid' | 'suspended' | 'closed'>('valid');
  readonly autoFilled = signal<{ businessName: boolean; ownerName: boolean; address: boolean }>({
    businessName: false, ownerName: false, address: false,
  });
  readonly isDragOver = signal(false);
  readonly selectedFileName = signal<string | null>(null);
  readonly docFileSize = signal('');
  readonly docThumbnailUrl = signal<string | null>(null);
  readonly docFileRequired = signal(false);

  readonly docCameraOpen = signal(false);
  readonly idCameraOpen = signal(false);
  readonly isIdDragOver = signal(false);
  readonly idFileName = signal<string | null>(null);
  readonly idFileSize = signal('');
  readonly idThumbnailUrl = signal<string | null>(null);
  readonly idFileRequired = signal(false);

  private selectedFile: File | null = null;
  private idFile: File | null = null;
  private fileSubmitAttempted = false;

  readonly form: FormGroup = this.fb.group({
    businessNumber: ['', [Validators.required, ValidationService.businessNumberValidator()]],
    businessName: ['', [Validators.required]],
    ownerName: ['', [Validators.required]],
    businessType: ['', [Validators.required]],
    businessCategory: ['', [Validators.required]],
    address: ['', [Validators.required]],
    addressDetail: [''],
  });

  ngOnInit(): void {
    this.restoreFormData();
    this.setupBusinessNumberFormat();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  canVerify(): boolean {
    const control = this.form.get('businessNumber');
    return !!control && control.valid;
  }

  isBusinessVerified(): boolean {
    return this.verificationResult() === 'valid';
  }

  canProceed(): boolean {
    return this.form.valid && this.isBusinessVerified() && !!this.selectedFile && !!this.idFile;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  verifyBusinessNumber(): void {
    if (!this.canVerify()) return;
    this.verifying.set(true);
    this.verificationResult.set('none');
    this.clearAutoFilledFields();

    const bNo = this.form.get('businessNumber')!.value;

    this.bizVerifyService.verify(bNo).pipe(
      takeUntil(this.destroy$),
    ).subscribe({
      next: (result) => {
        this.verifying.set(false);

        if (result.valid) {
          // 정상 사업자
          this.verificationResult.set('valid');
          this.popupType.set('valid');

          const filled = {
            businessName: !!result.businessName,
            ownerName: !!result.ownerName,
            address: !!result.address,
          };
          this.autoFilled.set(filled);
          this.form.patchValue({
            businessName: result.businessName || '',
            ownerName: result.ownerName || '',
            address: result.address || '',
          });
        } else if (result.status === 'suspended') {
          // 휴업자 — 입력 폼 표시 안 함
          this.verificationResult.set('suspended');
          this.popupType.set('suspended');
        } else if (result.status === 'closed') {
          // 폐업자 — 입력 폼 표시 안 함
          this.verificationResult.set('closed');
          this.popupType.set('closed');
        } else {
          // 미등록
          this.verificationResult.set('invalid');
          this.popupType.set('invalid');
        }

        this.showPopup.set(true);
      },
      error: () => {
        this.verifying.set(false);
        this.verificationResult.set('invalid');
        this.popupType.set('invalid');
        this.showPopup.set(true);
      },
    });
  }

  closePopup(): void {
    this.showPopup.set(false);
    // 비정상 사업자면 번호 입력란에 포커스
    if (this.verificationResult() !== 'valid') {
      this.verificationResult.set('none');
      this.clearAutoFilledFields();
      const el = document.getElementById('businessNumber');
      el?.focus();
      (el as HTMLInputElement)?.select();
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

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.selectedFileName.set(null);
    this.docThumbnailUrl.set(null);
    this.docFileSize.set('');
    if (this.fileSubmitAttempted) this.docFileRequired.set(true);
  }

  onIdDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isIdDragOver.set(true);
  }

  onIdDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isIdDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.setIdFile(file);
  }

  onIdFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setIdFile(file);
    input.value = '';
  }

  retakeDocPhoto(): void {
    this.selectedFile = null;
    this.selectedFileName.set(null);
    this.docThumbnailUrl.set(null);
    this.docFileSize.set('');
    this.docCameraOpen.set(true);
  }

  retakeIdPhoto(): void {
    this.idFile = null;
    this.idFileName.set(null);
    this.idThumbnailUrl.set(null);
    this.idFileSize.set('');
    this.idCameraOpen.set(true);
  }

  openDocCameraGuide(): void {
    this.docCameraOpen.set(true);
  }

  onDocCameraCapture(file: File): void {
    this.docCameraOpen.set(false);
    this.setFile(file);
  }

  openIdCameraGuide(): void {
    this.idCameraOpen.set(true);
  }

  onIdCameraCapture(file: File): void {
    this.idCameraOpen.set(false);
    this.setIdFile(file);
  }

  removeIdFile(event: Event): void {
    event.stopPropagation();
    this.idFile = null;
    this.idFileName.set(null);
    this.idThumbnailUrl.set(null);
    this.idFileSize.set('');
    if (this.fileSubmitAttempted) this.idFileRequired.set(true);
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
    if (!this.selectedFile) this.docFileRequired.set(true);
    if (!this.idFile) this.idFileRequired.set(true);
    if (!this.canProceed()) return;

    this.docFileRequired.set(false);
    this.idFileRequired.set(false);
    const { businessNumber, businessName, ownerName, businessType, businessCategory, address, addressDetail } = this.form.value;
    this.signupService.updateStep2({
      businessNumber, businessName, ownerName, businessType, businessCategory, address, addressDetail,
      documentFile: this.selectedFile,
    });
    this.signupService.goToStep(3);
    this.router.navigate(['/step/3']);
  }

  private setFile(file: File): void {
    if (!this.validateFile(file)) return;
    this.selectedFile = file;
    this.selectedFileName.set(file.name);
    this.docFileSize.set(this.formatSize(file.size));
    this.docFileRequired.set(false);
    this.generateThumbnail(file, this.docThumbnailUrl);
  }

  private setIdFile(file: File): void {
    if (!this.validateFile(file)) return;
    this.idFile = file;
    this.idFileName.set(file.name);
    this.idFileSize.set(this.formatSize(file.size));
    this.idFileRequired.set(false);
    this.generateThumbnail(file, this.idThumbnailUrl);
  }

  private validateFile(file: File): boolean {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024;
    return allowed.includes(file.type) && file.size <= maxSize;
  }

  private generateThumbnail(file: File, target: ReturnType<typeof signal<string | null>>): void {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => target.set(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      target.set(null);
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private restoreFormData(): void {
    const saved = this.signupService.formData().step2;
    if (saved.businessNumber) {
      this.form.patchValue({
        businessNumber: saved.businessNumber,
        businessName: saved.businessName,
        ownerName: saved.ownerName,
        businessType: saved.businessType,
        businessCategory: saved.businessCategory,
        address: saved.address,
        addressDetail: saved.addressDetail,
      }, { emitEvent: false });
    }
  }

  private saveFormData(): void {
    const { businessNumber, businessName, ownerName, businessType, businessCategory, address, addressDetail } = this.form.value;
    this.signupService.updateStep2({
      businessNumber, businessName, ownerName, businessType, businessCategory, address, addressDetail,
      documentFile: this.selectedFile,
    });
  }

  async openAddressSearch(): Promise<void> {
    try {
      const result = await this.postcodeService.open();
      this.form.get('address')?.setValue(result.roadAddress);
      this.form.get('address')?.markAsDirty();
      document.getElementById('addressDetail')?.focus();
    } catch {
      // 사용자가 창을 닫은 경우 무시
    }
  }

  private clearAutoFilledFields(): void {
    this.autoFilled.set({ businessName: false, ownerName: false, address: false });
    this.form.patchValue({
      businessName: '',
      ownerName: '',
      address: '',
      addressDetail: '',
    }, { emitEvent: false });
  }

  private setupBusinessNumberFormat(): void {
    const control = this.form.get('businessNumber');
    if (!control) return;
    control.valueChanges.pipe(
      takeUntil(this.destroy$),
    ).subscribe(value => {
      // 사업자번호 변경 시 조회 결과 초기화
      if (this.verificationResult() !== 'none') {
        this.verificationResult.set('none');
        this.clearAutoFilledFields();
      }
      if (!value) return;
      const formatted = ValidationService.formatBusinessNumber(value);
      if (formatted !== value) {
        control.setValue(formatted, { emitEvent: false });
      }
    });
  }
}
