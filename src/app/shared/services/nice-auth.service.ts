import { Injectable, signal, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { NiceAuthResult, NiceAuthStatus, NiceAuthTokenResponse } from '../models/nice-auth.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NiceAuthService {
  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);
  private readonly config = environment.niceAuth;

  readonly status = signal<NiceAuthStatus>('idle');
  readonly errorMessage = signal('');

  private popupWindow: Window | null = null;
  private popupTimer: ReturnType<typeof setInterval> | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private resultSubject: Subject<NiceAuthResult> | null = null;

  requestVerification(): Observable<NiceAuthResult> {
    this.cleanup();
    this.status.set('pending');
    this.errorMessage.set('');

    this.resultSubject = new Subject<NiceAuthResult>();

    if (this.config.useMock) {
      this.executeMockVerification();
    } else {
      this.executeRealVerification();
    }

    return this.resultSubject.asObservable();
  }

  cancelVerification(): void {
    this.status.set('cancelled');
    this.errorMessage.set('본인인증이 취소되었습니다.');
    this.cleanup();
  }

  reset(): void {
    this.status.set('idle');
    this.errorMessage.set('');
    this.cleanup();
  }

  private executeMockVerification(): void {
    setTimeout(() => {
      this.ngZone.run(() => {
        const mockResult: NiceAuthResult = {
          name: '홍길동',
          phone: '010-1234-5678',
          birthDate: '900101',
          gender: 'M',
          genderDigit: '1',
          ci: 'MOCK_CI_' + Date.now(),
          di: 'MOCK_DI_' + Date.now(),
          nationalInfo: '1',
        };

        this.status.set('success');
        this.resultSubject?.next(mockResult);
        this.resultSubject?.complete();
      });
    }, 800);
  }

  private executeRealVerification(): void {
    this.http.post<NiceAuthTokenResponse>(this.config.requestTokenUrl, {
      returnUrl: `${window.location.origin}/api/nice/callback`,
    }).subscribe({
      next: (tokenData) => {
        this.openPopup(tokenData);
      },
      error: () => {
        this.ngZone.run(() => {
          this.status.set('failed');
          this.errorMessage.set('본인인증 요청에 실패했습니다. 다시 시도해 주세요.');
          this.resultSubject?.error(new Error('Token request failed'));
        });
      },
    });
  }

  private openPopup(tokenData: NiceAuthTokenResponse): void {
    const width = 500;
    const height = 600;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    const features = `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;

    this.popupWindow = window.open('about:blank', 'niceAuthPopup', features);

    if (!this.popupWindow) {
      this.status.set('failed');
      this.errorMessage.set('팝업이 차단되었습니다. 팝업 차단을 해제한 후 다시 시도해 주세요.');
      this.resultSubject?.error(new Error('Popup blocked'));
      return;
    }

    // Create form and submit to NICE
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = this.config.popupUrl;
    form.target = 'niceAuthPopup';

    const fields: Record<string, string> = {
      m: 'checkplusService',
      token_version_id: tokenData.tokenVersionId,
      enc_data: tokenData.encData,
      integrity_value: tokenData.integrityValue,
    };

    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    this.setupMessageListener();
    this.startPopupMonitor();
  }

  private setupMessageListener(): void {
    this.messageHandler = (event: MessageEvent) => {
      // Validate origin in production
      if (!this.config.useMock && !event.origin.includes(window.location.hostname)) {
        return;
      }

      if (event.data?.type === 'NICE_AUTH_RESULT' && event.data?.requestId) {
        this.fetchResult(event.data.requestId);
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  private fetchResult(requestId: string): void {
    this.http.get<NiceAuthResult>(`${this.config.resultUrl}?requestId=${requestId}`)
      .subscribe({
        next: (result) => {
          this.ngZone.run(() => {
            this.status.set('success');
            this.resultSubject?.next(result);
            this.resultSubject?.complete();
            this.cleanup();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.status.set('failed');
            this.errorMessage.set('인증 결과 조회에 실패했습니다. 다시 시도해 주세요.');
            this.resultSubject?.error(new Error('Result fetch failed'));
            this.cleanup();
          });
        },
      });
  }

  private startPopupMonitor(): void {
    this.popupTimer = setInterval(() => {
      if (this.popupWindow && this.popupWindow.closed) {
        this.ngZone.run(() => {
          if (this.status() === 'pending') {
            this.status.set('cancelled');
            this.errorMessage.set('본인인증 창이 닫혔습니다. 다시 시도해 주세요.');
            this.resultSubject?.error(new Error('Popup closed'));
          }
          this.cleanup();
        });
      }
    }, 500);
  }

  private cleanup(): void {
    if (this.popupTimer) {
      clearInterval(this.popupTimer);
      this.popupTimer = null;
    }
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close();
    }
    this.popupWindow = null;
  }
}
