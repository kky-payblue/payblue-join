import {
  Component, Input, Output, EventEmitter, signal, computed,
  OnChanges, OnDestroy, SimpleChanges, ElementRef, viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';

const ID_RATIO = 85.6 / 54; // ISO/IEC 7810 ID card
const GUIDE_W = 0.85;
const JPEG_Q = 0.85;

@Component({
  selector: 'app-id-camera-guide',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
      <div class="ov" [class.ov--ready]="ready()" [class.ov--err]="!!err()"
           role="dialog" aria-modal="true" aria-label="신분증 촬영">
        <video #videoEl class="vid" autoplay playsinline [attr.aria-hidden]="true"></video>
        <svg class="svg" aria-hidden="true">
          <defs>
            <mask id="gm">
              <rect width="100%" height="100%" fill="white"/>
              <rect [attr.x]="gr().x" [attr.y]="gr().y" [attr.width]="gr().w"
                    [attr.height]="gr().h" rx="12" ry="12" fill="black"/>
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,.6)" mask="url(#gm)"/>
        </svg>
        <div class="frame" [style.left.px]="gr().x" [style.top.px]="gr().y"
             [style.width.px]="gr().w" [style.height.px]="gr().h">
          <i class="c c-tl"></i><i class="c c-tr"></i>
          <i class="c c-bl"></i><i class="c c-br"></i>
        </div>
        <p class="txt txt-t" [style.bottom]="'calc(50% + '+(gr().h/2+20)+'px)'">
          신분증을 프레임 안에 맞춰주세요</p>
        <p class="txt txt-b" [style.top]="'calc(50% + '+(gr().h/2+12)+'px)'">
          주민등록증, 운전면허증, 여권</p>
        <div class="top-bar">
          @if (flashOk()) {
            <button type="button" class="cb" (click)="toggleFlash()"
              [attr.aria-label]="flashOn()?'플래시 끄기':'플래시 켜기'">
              <span class="material-symbols-rounded">{{flashOn()?'flash_on':'flash_off'}}</span>
            </button>
          } @else { <span class="cb-sp"></span> }
          <button type="button" class="cb" (click)="close()" aria-label="닫기">
            <span class="material-symbols-rounded">close</span></button>
        </div>
        <div class="bot-bar">
          <button type="button" class="cap" [disabled]="!ready()||capturing()"
                  (click)="capture()" aria-label="촬영">
            <span class="cap-r"></span><span class="cap-i"></span>
          </button>
        </div>
        @if (err()) {
          <div class="err-ov">
            <span class="material-symbols-rounded err-ic">videocam_off</span>
            <p class="err-tx">{{err()}}</p>
            <button type="button" class="err-btn" (click)="close()">닫기</button>
          </div>
        }
        <canvas #canvasEl style="position:absolute;visibility:hidden;top:-9999px"></canvas>
      </div>
    }
  `,
  styles: [`
    .ov { position:fixed; inset:0; z-index:2000; background:#000;
      display:flex; align-items:center; justify-content:center;
      opacity:0; animation:fo .3s ease-out forwards; }
    .ov--ready .vid { opacity:1; }
    .ov--err { background:rgba(0,0,0,.95); }
    @keyframes fo { from{opacity:0} to{opacity:1} }
    .vid { position:absolute; inset:0; width:100%; height:100%;
      object-fit:cover; opacity:0; transition:opacity .3s ease-out; }
    .svg { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
    .frame { position:absolute; border:2px solid rgba(255,255,255,.5);
      border-radius:12px; pointer-events:none; }
    .c { position:absolute; width:24px; height:24px; pointer-events:none; display:block; }
    .c::before,.c::after { content:''; position:absolute; background:#fff; border-radius:2px; }
    .c-tl { top:-2px; left:-2px; }
    .c-tl::before { top:0;left:0;width:24px;height:3px; }
    .c-tl::after  { top:0;left:0;width:3px;height:24px; }
    .c-tr { top:-2px; right:-2px; }
    .c-tr::before { top:0;right:0;width:24px;height:3px; }
    .c-tr::after  { top:0;right:0;width:3px;height:24px; }
    .c-bl { bottom:-2px; left:-2px; }
    .c-bl::before { bottom:0;left:0;width:24px;height:3px; }
    .c-bl::after  { bottom:0;left:0;width:3px;height:24px; }
    .c-br { bottom:-2px; right:-2px; }
    .c-br::before { bottom:0;right:0;width:24px;height:3px; }
    .c-br::after  { bottom:0;right:0;width:3px;height:24px; }
    .txt { position:absolute; left:0; right:0; text-align:center; color:#fff;
      font-family:var(--pb-font-primary,sans-serif); pointer-events:none;
      margin:0; text-shadow:0 1px 4px rgba(0,0,0,.6); }
    .txt-t { font-size:var(--pb-text-base,1rem); font-weight:var(--pb-weight-semibold,600); }
    .txt-b { font-size:var(--pb-text-sm,.875rem); color:rgba(255,255,255,.7); }
    .top-bar { position:absolute; top:0; left:0; right:0; display:flex;
      justify-content:space-between; align-items:center;
      padding:env(safe-area-inset-top,12px) 16px 12px; z-index:10; }
    .cb { display:flex; align-items:center; justify-content:center; width:44px; height:44px;
      background:rgba(0,0,0,.35); border:none; border-radius:var(--pb-radius-full,9999px);
      color:#fff; cursor:pointer; -webkit-tap-highlight-color:transparent;
      transition:background .15s ease-out; }
    .cb:active { background:rgba(0,0,0,.6); }
    .cb .material-symbols-rounded { font-size:24px; }
    .cb-sp { width:44px; height:44px; }
    .bot-bar { position:absolute; bottom:0; left:0; right:0; display:flex;
      justify-content:center; padding:24px 16px calc(env(safe-area-inset-bottom,16px)+24px);
      z-index:10; }
    .cap { position:relative; width:72px; height:72px; background:transparent;
      border:none; cursor:pointer; -webkit-tap-highlight-color:transparent; padding:0; }
    .cap:disabled { opacity:.4; cursor:not-allowed; }
    .cap-r { position:absolute; inset:0; border:4px solid #fff; border-radius:50%;
      transition:transform .15s ease-out; }
    .cap:active:not(:disabled) .cap-r { transform:scale(.93); }
    .cap-i { position:absolute; inset:6px; background:#fff; border-radius:50%;
      transition:transform .15s ease-out, background .15s ease-out; }
    .cap:active:not(:disabled) .cap-i { transform:scale(.9); background:var(--pb-gray-200,#e5e7eb); }
    .err-ov { position:absolute; inset:0; display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:var(--pb-space-4,1rem);
      z-index:20; padding:var(--pb-space-6,1.5rem); }
    .err-ic { font-size:48px; color:rgba(255,255,255,.6); }
    .err-tx { color:#fff; font-size:var(--pb-text-base,1rem);
      font-family:var(--pb-font-primary,sans-serif); text-align:center; margin:0;
      line-height:var(--pb-leading-normal,1.6); }
    .err-btn { min-height:44px; padding:var(--pb-space-2,.5rem) var(--pb-space-8,2rem);
      background:rgba(255,255,255,.15); border:1.5px solid rgba(255,255,255,.3);
      border-radius:var(--pb-radius-md,8px); color:#fff;
      font-size:var(--pb-text-base,1rem); font-weight:var(--pb-weight-semibold,600);
      font-family:var(--pb-font-primary,sans-serif); cursor:pointer;
      transition:background .15s ease-out; }
    .err-btn:active { background:rgba(255,255,255,.25); }
  `],
})
export class IdCameraGuideComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Output() captured = new EventEmitter<File>();
  @Output() closed = new EventEmitter<void>();

  readonly videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  readonly canvasEl = viewChild<ElementRef<HTMLCanvasElement>>('canvasEl');

  readonly ready = signal(false);
  readonly capturing = signal(false);
  readonly err = signal<string | null>(null);
  readonly flashOn = signal(false);
  readonly flashOk = signal(false);
  private readonly vp = signal({ w: window.innerWidth, h: window.innerHeight });

  readonly gr = computed(() => {
    const v = this.vp();
    const w = Math.round(v.w * GUIDE_W);
    const h = Math.round(w / ID_RATIO);
    return { x: Math.round((v.w - w) / 2), y: Math.round((v.h - h) / 2), w, h };
  });

  private stream: MediaStream | null = null;
  private track: MediaStreamTrack | null = null;
  private onResizeBound = this.onResize.bind(this);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      this.isOpen ? this.open() : this.stopCamera();
    }
  }

  ngOnDestroy(): void { this.stopCamera(); }

  close(): void { this.stopCamera(); this.closed.emit(); }

  async toggleFlash(): Promise<void> {
    if (!this.track) return;
    const next = !this.flashOn();
    try {
      await this.track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      this.flashOn.set(next);
    } catch { /* torch unsupported */ }
  }

  async capture(): Promise<void> {
    const video = this.videoEl()?.nativeElement;
    const canvas = this.canvasEl()?.nativeElement;
    if (!video || !canvas || !this.ready()) return;
    this.capturing.set(true);
    try {
      const file = await this.cropGuideArea(video, canvas);
      this.stopCamera();
      this.captured.emit(file);
    } catch {
      this.err.set('촬영에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      this.capturing.set(false);
    }
  }

  private async open(): Promise<void> {
    this.err.set(null);
    this.ready.set(false);
    this.flashOn.set(false);
    this.flashOk.set(false);
    window.addEventListener('resize', this.onResizeBound);
    this.onResize();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      this.track = this.stream.getVideoTracks()[0];
      this.detectFlash();
      await Promise.resolve(); // let Angular render <video>

      const video = this.videoEl()?.nativeElement;
      if (!video) return;
      video.srcObject = this.stream;
      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res();
        video.onerror = () => rej(new Error('Video load failed'));
      });
      await video.play();
      this.ready.set(true);
    } catch (e) {
      this.err.set(this.permMsg(e));
    }
  }

  private async cropGuideArea(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<File> {
    const vw = video.videoWidth, vh = video.videoHeight;
    canvas.width = vw; canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    ctx.drawImage(video, 0, 0, vw, vh);

    const dw = video.clientWidth, dh = video.clientHeight;
    const guide = this.gr();
    const va = vw / vh, da = dw / dh;
    let sx: number, sy: number, ox: number, oy: number;
    if (va > da) {
      sy = vh / dh; sx = sy; ox = (vw - dw * sx) / 2; oy = 0;
    } else {
      sx = vw / dw; sy = sx; ox = 0; oy = (vh - dh * sy) / 2;
    }
    const cx = Math.max(0, Math.round(guide.x * sx + ox));
    const cy = Math.max(0, Math.round(guide.y * sy + oy));
    const cw = Math.min(Math.round(guide.w * sx), vw - cx);
    const ch = Math.min(Math.round(guide.h * sy), vh - cy);

    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    const oc = out.getContext('2d');
    if (!oc) throw new Error('No 2d context');
    oc.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);

    const blob = await new Promise<Blob>((res, rej) =>
      out.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', JPEG_Q));
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return new File([blob], `id-card-${ts}.jpg`, { type: 'image/jpeg' });
  }

  private detectFlash(): void {
    if (!this.track) return;
    try {
      const cap = this.track.getCapabilities();
      this.flashOk.set('torch' in cap && (cap as Record<string, unknown>)['torch'] === true);
    } catch { this.flashOk.set(false); }
  }

  private permMsg(e: unknown): string {
    if (e instanceof DOMException) {
      switch (e.name) {
        case 'NotAllowedError': return '카메라 접근 권한이 필요합니다';
        case 'NotFoundError': return '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해 주세요.';
        case 'NotReadableError': return '카메라가 다른 앱에서 사용 중입니다. 다른 앱을 종료한 후 다시 시도해 주세요.';
        case 'OverconstrainedError': return '후면 카메라를 찾을 수 없습니다.';
        default: return '카메라를 시작할 수 없습니다. 다시 시도해 주세요.';
      }
    }
    return '카메라 접근 권한이 필요합니다';
  }

  private stopCamera(): void {
    window.removeEventListener('resize', this.onResizeBound);
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null; this.track = null;
    }
    const v = this.videoEl()?.nativeElement;
    if (v) v.srcObject = null;
    this.ready.set(false); this.flashOn.set(false); this.flashOk.set(false);
  }

  private onResize(): void {
    this.vp.set({ w: window.innerWidth, h: window.innerHeight });
  }
}
