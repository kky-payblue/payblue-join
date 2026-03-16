import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { PasswordStrength } from '../models/signup.model';

@Injectable({ providedIn: 'root' })
export class ValidationService {

  static emailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(control.value) ? null : { invalidEmail: true };
    };
  }

  static passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const value = control.value;
      const errors: ValidationErrors = {};
      if (value.length < 8) errors['minLength'] = true;
      if (!/[a-zA-Z]/.test(value)) errors['noLetter'] = true;
      if (!/[0-9]/.test(value)) errors['noNumber'] = true;
      return Object.keys(errors).length ? errors : null;
    };
  }

  static passwordMatchValidator(passwordField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const parent = control.parent;
      if (!parent) return null;
      const password = parent.get(passwordField);
      if (!password || !control.value) return null;
      return password.value === control.value ? null : { passwordMismatch: true };
    };
  }

  static phoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const cleaned = control.value.replace(/[^0-9]/g, '');
      return /^01[016789]\d{7,8}$/.test(cleaned) ? null : { invalidPhone: true };
    };
  }

  static businessNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const cleaned = control.value.replace(/[^0-9]/g, '');
      if (cleaned.length !== 10) return { invalidLength: true };

      // Korean business number checksum validation
      const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned[i], 10) * weights[i];
      }
      sum += Math.floor((parseInt(cleaned[8], 10) * 5) / 10);
      const checkDigit = (10 - (sum % 10)) % 10;
      return checkDigit === parseInt(cleaned[9], 10) ? null : { invalidChecksum: true };
    };
  }

  static getPasswordStrength(password: string): PasswordStrength {
    if (!password || password.length < 8) return 'weak';
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium';
    return 'strong';
  }

  static formatPhone(value: string): string {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  }

  static formatBusinessNumber(value: string): string {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
  }
}
