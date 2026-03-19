import { Injectable, signal, computed } from '@angular/core';
import { SignupFormData, SignupStep, BasicInfoData, BusinessInfoData, IndividualInfoData, PaymentSettingsData, MemberType, NiceAuthData } from '../models/signup.model';

@Injectable({ providedIn: 'root' })
export class SignupService {
  private readonly _currentStep = signal<SignupStep>(0);
  private readonly _formData = signal<SignupFormData>({
    step1: { memberType: 'business', name: '', phone: '' },
    step2: { businessNumber: '', businessName: '', ownerName: '', businessType: '', businessCategory: '', address: '', addressDetail: '', documentFile: null },
    step2Individual: { birthDate: '', genderDigit: '', address: '', addressDetail: '', receiptBusinessName: '', salesCategory: '', idDocumentFile: null },
    step3: { bankName: '', accountNumber: '', accountHolder: '', agreeTerms: false, agreePrivacy: false, agreeMarketing: false },
  });
  private readonly _isSubmitting = signal(false);
  private readonly _isComplete = signal(false);

  readonly currentStep = this._currentStep.asReadonly();
  readonly formData = this._formData.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly isComplete = this._isComplete.asReadonly();

  readonly memberType = computed<MemberType>(() => this._formData().step1.memberType);
  readonly niceAuthResult = computed<NiceAuthData | undefined>(() => this._formData().step1.niceAuth);

  readonly progressPercent = computed(() => {
    const step = this._currentStep();
    if (step === 0) return 0;
    return Math.round(((step - 1) / 3) * 100);
  });

  goToStep(step: SignupStep): void {
    this._currentStep.set(step);
  }

  nextStep(): void {
    const current = this._currentStep();
    if (current < 4) {
      this._currentStep.set((current + 1) as SignupStep);
    }
  }

  prevStep(): void {
    const current = this._currentStep();
    if (current > 0) {
      this._currentStep.set((current - 1) as SignupStep);
    }
  }

  updateStep1(data: BasicInfoData): void {
    this._formData.update(prev => ({ ...prev, step1: data }));
  }

  updateNiceAuth(data: NiceAuthData): void {
    this._formData.update(prev => ({
      ...prev,
      step1: { ...prev.step1, niceAuth: data },
    }));
  }

  updateStep2(data: BusinessInfoData): void {
    this._formData.update(prev => ({ ...prev, step2: data }));
  }

  updateStep2Individual(data: IndividualInfoData): void {
    this._formData.update(prev => ({ ...prev, step2Individual: data }));
  }

  updateStep3(data: PaymentSettingsData): void {
    this._formData.update(prev => ({ ...prev, step3: data }));
  }

  async submitApplication(): Promise<boolean> {
    this._isSubmitting.set(true);
    try {
      // TODO: Replace with actual API call
      // POST /api/v1/onboarding/apply
      await new Promise(resolve => setTimeout(resolve, 1500));
      this._isComplete.set(true);
      this._currentStep.set(4);
      return true;
    } catch {
      return false;
    } finally {
      this._isSubmitting.set(false);
    }
  }

  reset(): void {
    this._currentStep.set(0);
    this._isComplete.set(false);
    this._isSubmitting.set(false);
    this._formData.set({
      step1: { memberType: 'business', name: '', phone: '' },
      step2: { businessNumber: '', businessName: '', ownerName: '', businessType: '', businessCategory: '', address: '', addressDetail: '', documentFile: null },
      step2Individual: { birthDate: '', genderDigit: '', address: '', addressDetail: '', receiptBusinessName: '', salesCategory: '', idDocumentFile: null },
      step3: { bankName: '', accountNumber: '', accountHolder: '', agreeTerms: false, agreePrivacy: false, agreeMarketing: false },
    });
  }
}
