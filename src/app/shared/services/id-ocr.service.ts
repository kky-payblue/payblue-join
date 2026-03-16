import { Injectable, signal } from '@angular/core';
import Tesseract from 'tesseract.js';

export interface IdOcrResult {
  readonly birthDate: string;   // YYMMDD (6자리)
  readonly genderDigit: string; // 1~4
  readonly raw: string;         // OCR 원문
}

@Injectable({ providedIn: 'root' })
export class IdOcrService {
  readonly processing = signal(false);
  readonly progress = signal(0);
  readonly errorMessage = signal('');

  /**
   * 신분증 이미지에서 주민등록번호 앞 6자리 + 뒷자리 첫째를 추출
   */
  async extractFromImage(file: File): Promise<IdOcrResult | null> {
    this.processing.set(true);
    this.progress.set(0);
    this.errorMessage.set('');

    try {
      const imageUrl = URL.createObjectURL(file);

      const result = await Tesseract.recognize(imageUrl, 'kor+eng', {
        logger: (info: { status: string; progress: number }) => {
          if (info.status === 'recognizing text') {
            this.progress.set(Math.round(info.progress * 100));
          }
        },
      });

      URL.revokeObjectURL(imageUrl);

      const text = result.data.text;
      const extracted = this.parseRRN(text);

      if (!extracted) {
        this.errorMessage.set('주민등록번호를 인식하지 못했습니다. 직접 입력해 주세요.');
        return null;
      }

      return extracted;
    } catch {
      this.errorMessage.set('이미지 인식에 실패했습니다. 직접 입력해 주세요.');
      return null;
    } finally {
      this.processing.set(false);
      this.progress.set(0);
    }
  }

  /**
   * OCR 텍스트에서 주민등록번호 패턴 추출
   * 패턴: 6자리 숫자 - (또는 공백) 7자리 숫자
   */
  private parseRRN(text: string): IdOcrResult | null {
    // 공백/특수문자 정리 후 다양한 패턴 시도
    const cleaned = text.replace(/[oO]/g, '0').replace(/[lI]/g, '1');

    // 패턴 1: NNNNNN-NNNNNNN (하이픈 포함)
    // 패턴 2: NNNNNN NNNNNNN (공백 포함)
    // 패턴 3: NNNNNNNNNNNNN (13자리 연속)
    const patterns = [
      /(\d{6})\s*[-–—]\s*(\d{7})/,
      /(\d{6})\s+(\d{7})/,
      /(\d{6})(\d{7})/,
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const front = match[1];
        const backFirst = match[2][0];

        if (this.isValidBirthDate(front) && this.isValidGenderDigit(backFirst)) {
          return {
            birthDate: front,
            genderDigit: backFirst,
            raw: text,
          };
        }
      }
    }

    return null;
  }

  private isValidBirthDate(value: string): boolean {
    if (value.length !== 6 || !/^\d{6}$/.test(value)) return false;
    const month = parseInt(value.substring(2, 4), 10);
    const day = parseInt(value.substring(4, 6), 10);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }

  private isValidGenderDigit(value: string): boolean {
    return /^[1-4]$/.test(value);
  }
}
