export interface SignupFormData {
  step1: BasicInfoData;
  step2: BusinessInfoData;
  step2Individual: IndividualInfoData;
  step3: PaymentSettingsData;
}

export type MemberType = 'business' | 'individual';

export interface NiceAuthData {
  readonly verified: boolean;
  readonly name: string;
  readonly phone: string;
  readonly birthDate: string;
  readonly genderDigit: string;
  readonly ci: string;
  readonly di: string;
}

export interface BasicInfoData {
  memberType: MemberType;
  name: string;
  phone: string;
  niceAuth?: NiceAuthData;
}

export interface BusinessInfoData {
  businessNumber: string;
  businessName: string;
  ownerName: string;
  businessType: string;
  businessCategory: string;
  address: string;
  addressDetail: string;
  documentFile: File | null;
}

export interface PaymentSettingsData {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
}

export interface IndividualInfoData {
  birthDate: string;
  genderDigit: string;
  address: string;
  addressDetail: string;
  receiptBusinessName: string;
  salesCategory: string;
  idDocumentFile: File | null;
}

export interface BusinessVerification {
  valid: boolean;
  businessName: string;
  ownerName: string;
  address: string;
  status: 'active' | 'closed' | 'suspended';
}

export type SignupStep = 1 | 2 | 3 | 4;

export type PasswordStrength = 'weak' | 'medium' | 'strong';

