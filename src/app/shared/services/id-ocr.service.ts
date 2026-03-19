import { Injectable, signal } from '@angular/core';
import Tesseract from 'tesseract.js';

export interface IdOcrResult {
  readonly name: string;        // 이름 (빈 문자열이면 인식 실패)
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
   * 신분증 이미지에서 이름 + 주민등록번호 앞 6자리 + 뒷자리 첫째를 추출
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
      const extracted = this.parseIdCard(text);

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
   * OCR 텍스트에서 이름 + 주민등록번호 패턴 추출
   */
  private parseIdCard(text: string): IdOcrResult | null {
    const cleaned = text.replace(/[oO]/g, '0').replace(/[lI]/g, '1');

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
          const name = this.extractName(text, match.index ?? 0);
          return {
            name,
            birthDate: front,
            genderDigit: backFirst,
            raw: text,
          };
        }
      }
    }

    return null;
  }

  /**
   * 주민등록번호 앞쪽 텍스트에서 한글 이름 추출
   * 주민등록증: "홍길동" 또는 "홍 길 동" 형태
   */
  private extractName(text: string, rrnIndex: number): string {
    const beforeRrn = text.substring(0, rrnIndex);
    const lines = beforeRrn.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

    // 문서 제목 등 이름이 아닌 한글 키워드 제외
    const excludeWords = [
      '주민등록증', '주민등록', '운전면허증', '운전면허',
      '대한민국', '주민번호', '등록번호', '면허번호',
    ];
    const isExcluded = (s: string): boolean =>
      excludeWords.some(w => s === w || s.includes(w));

    // Pass 1: "이름" / "성명" 라벨 뒤에서 이름 추출 (가장 신뢰도 높음)
    for (let i = lines.length - 1; i >= 0; i--) {
      const labelMatch = lines[i].match(/(?:이\s*름|성\s*명)\s*[:\s]\s*([가-힣\s]{2,})/);
      if (labelMatch) {
        const name = labelMatch[1].replace(/\s/g, '');
        if (name.length >= 2 && name.length <= 5 && !isExcluded(name)) {
          return name;
        }
      }
    }

    // Pass 2: 줄 전체가 한글 이름 (2~5자), 제외 키워드 필터
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const cleaned = line.replace(/\s/g, '');
      if (/^[가-힣]{2,5}$/.test(cleaned) && !isExcluded(cleaned)) {
        return cleaned;
      }
      // 괄호 안에 한자가 있는 경우: "홍길동(洪吉童)" → "홍길동"
      const hangulOnly = line.replace(/\(.*?\)/g, '').replace(/\s/g, '');
      if (/^[가-힣]{2,5}$/.test(hangulOnly) && !isExcluded(hangulOnly)) {
        return hangulOnly;
      }
    }

    // Pass 3: 줄에서 한글만 추출 후 이름 패턴 확인 (OCR 노이즈 대응)
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      // 숫자, 특수문자, 영문 제거 후 한글 연속 부분만 추출
      const koreanSegments = line.match(/[가-힣]{2,5}/g);
      if (koreanSegments) {
        for (const seg of koreanSegments) {
          if (!isExcluded(seg) && seg.length >= 2 && seg.length <= 5) {
            return seg;
          }
        }
      }
    }

    return '';
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
