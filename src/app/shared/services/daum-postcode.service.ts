import { Injectable } from '@angular/core';

export interface PostcodeResult {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
  autoRoadAddress: string;
  autoJibunAddress: string;
}

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeData) => void;
        onclose?: (state: string) => void;
        width?: string | number;
        height?: string | number;
      }) => { open: () => void; embed: (element: HTMLElement) => void };
    };
  }
}

interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
  autoRoadAddress: string;
  autoJibunAddress: string;
  userSelectedType: 'R' | 'J';
}

@Injectable({ providedIn: 'root' })
export class DaumPostcodeService {

  open(): Promise<PostcodeResult> {
    return new Promise((resolve, reject) => {
      if (!window.daum?.Postcode) {
        reject(new Error('다음 우편번호 스크립트가 로드되지 않았습니다.'));
        return;
      }

      new window.daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          const roadAddr = data.roadAddress || data.autoRoadAddress;
          const jibunAddr = data.jibunAddress || data.autoJibunAddress;
          const address = roadAddr || jibunAddr;
          const fullAddress = data.buildingName
            ? `${address} (${data.buildingName})`
            : address;

          resolve({
            zonecode: data.zonecode,
            roadAddress: fullAddress,
            jibunAddress: jibunAddr,
            buildingName: data.buildingName,
            autoRoadAddress: data.autoRoadAddress,
            autoJibunAddress: data.autoJibunAddress,
          });
        },
        onclose: (state: string) => {
          if (state === 'FORCE_CLOSE') {
            reject(new Error('사용자가 창을 닫았습니다.'));
          }
        },
      }).open();
    });
  }
}
