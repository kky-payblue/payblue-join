import {
  Component, Input, Output, EventEmitter, signal, computed,
  OnChanges, OnDestroy, SimpleChanges, ElementRef, viewChild,
  ChangeDetectionStrategy, inject, ChangeDetectorRef, NgZone,
} from '@angular/core';

const ID_RATIO = 85.6 / 54; // ISO/IEC 7810 ID card
const GUIDE_W = 0.82;
const JPEG_Q = 0.85;

// Detection tuning
const DETECT_MS = 250;          // analysis interval
const ANAL_W = 120;             // analysis canvas width (performance)
const CONTENT_THRESH = 15;      // min std-dev to consider "has content"
const STABLE_THRESH = 12;       // max frame-diff for "stable"
const SHARP_THRESH = 8;         // min Laplacian variance for "sharp"
const STABLE_FRAMES = 4;        // consecutive stable+sharp frames → auto capture (~1s)
const BLUR_CHECK_THRESH = 6;    // final image sharpness threshold
const RETRY_DELAY = 1500;       // ms to show "blurry" message before retry

type DetectPhase = 'waiting' | 'detected' | 'stabilizing' | 'blurry';

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
          <rect width="100%" height="100%" fill="rgba(0,0,0,.55)" mask="url(#gm)"/>
        </svg>
        <div class="frame" [class.frame--detected]="phase()==='detected'"
             [class.frame--stable]="phase()==='stabilizing'"
             [class.frame--blurry]="phase()==='blurry'"
             [style.left.px]="gr().x" [style.top.px]="gr().y"
             [style.width.px]="gr().w" [style.height.px]="gr().h">
          <i class="c c-tl"></i><i class="c c-tr"></i>
          <i class="c c-bl"></i><i class="c c-br"></i>
          @if (phase() === 'stabilizing') {
            <div class="progress-ring">
              <svg viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="3"/>
                <circle cx="22" cy="22" r="18" fill="none" stroke="#4ade80" stroke-width="3"
                  stroke-linecap="round"
                  [style.stroke-dasharray]="'113'"
                  [style.stroke-dashoffset]="113 - 113 * stableProgress()"
                  style="transition:stroke-dashoffset .3s ease; transform:rotate(-90deg); transform-origin:center;"/>
              </svg>
            </div>
          }
        </div>

        <!-- Status text -->
        <p class="txt txt-t" [style.bottom]="'calc(50% + '+(gr().h/2+20)+'px)'"
           [class.txt--detected]="phase()==='detected'"
           [class.txt--stable]="phase()==='stabilizing'"
           [class.txt--blurry]="phase()==='blurry'">
          @switch (phase()) {
            @case ('waiting') { 프레임 안에 신분증 전체가 보이도록 맞춰주세요 }
            @case ('detected') { 움직이지 마세요... }
            @case ('stabilizing') { 자동 촬영 중... }
            @case ('blurry') { 선명하지 않습니다. 다시 촬영합니다. }
          }
        </p>
        <p class="txt txt-b" [style.top]="'calc(50% + '+(gr().h/2+12)+'px)'">
          @switch (phase()) {
            @case ('waiting') { 신분증이 프레임보다 작게, 여유 있게 띄워주세요 }
            @default { 주민등록증, 운전면허증, 여권 }
          }
        </p>

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
                  (click)="capture()" aria-label="수동 촬영">
            <span class="cap-r"></span><span class="cap-i"></span>
          </button>
          <p class="auto-hint">자동 촬영 활성화됨</p>
        </div>
        @if (err()) {
          <div class="err-ov">
            <span class="material-symbols-rounded err-ic">videocam_off</span>
            <p class="err-tx">{{err()}}</p>
            <button type="button" class="err-btn" (click)="close()">닫기</button>
          </div>
        }
        <canvas #canvasEl style="position:absolute;visibility:hidden;top:-9999px"></canvas>
        <canvas #analEl style="position:absolute;visibility:hidden;top:-9999px"></canvas>
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
      border-radius:12px; pointer-events:none;
      transition:border-color .3s ease, box-shadow .3s ease; }
    .frame--detected { border-color:rgba(250,204,21,.8);
      box-shadow:0 0 0 2px rgba(250,204,21,.2); }
    .frame--stable { border-color:rgba(74,222,128,.9);
      box-shadow:0 0 0 3px rgba(74,222,128,.25); }
    .frame--blurry { border-color:rgba(248,113,113,.8);
      box-shadow:0 0 0 2px rgba(248,113,113,.2); }
    .c { position:absolute; width:24px; height:24px; pointer-events:none; display:block; }
    .c::before,.c::after { content:''; position:absolute; border-radius:2px;
      transition:background .3s ease; }
    .frame .c::before,.frame .c::after { background:#fff; }
    .frame--detected .c::before,.frame--detected .c::after { background:#facc15; }
    .frame--stable .c::before,.frame--stable .c::after { background:#4ade80; }
    .frame--blurry .c::before,.frame--blurry .c::after { background:#f87171; }
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
      margin:0; text-shadow:0 1px 4px rgba(0,0,0,.6);
      transition:color .3s ease; }
    .txt-t { font-size:var(--pb-text-base,1rem); font-weight:var(--pb-weight-semibold,600); }
    .txt--detected { color:#facc15; }
    .txt--stable { color:#4ade80; }
    .txt--blurry { color:#f87171; }
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
      flex-direction:column; align-items:center; gap:8px;
      padding:24px 16px calc(env(safe-area-inset-bottom,16px)+24px); z-index:10; }
    .cap { position:relative; width:72px; height:72px; background:transparent;
      border:none; cursor:pointer; -webkit-tap-highlight-color:transparent; padding:0; }
    .cap:disabled { opacity:.4; cursor:not-allowed; }
    .cap-r { position:absolute; inset:0; border:4px solid #fff; border-radius:50%;
      transition:transform .15s ease-out; }
    .cap:active:not(:disabled) .cap-r { transform:scale(.93); }
    .cap-i { position:absolute; inset:6px; background:#fff; border-radius:50%;
      transition:transform .15s ease-out, background .15s ease-out; }
    .cap:active:not(:disabled) .cap-i { transform:scale(.9); background:var(--pb-gray-200,#e5e7eb); }
    .auto-hint { margin:0; font-size:var(--pb-text-xs,.75rem); color:rgba(255,255,255,.5);
      font-family:var(--pb-font-primary,sans-serif); }
    .progress-ring { position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%); width:44px; height:44px; pointer-events:none; }
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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  @Input() isOpen = false;
  @Output() captured = new EventEmitter<File>();
  @Output() closed = new EventEmitter<void>();

  readonly videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  readonly canvasEl = viewChild<ElementRef<HTMLCanvasElement>>('canvasEl');
  readonly analEl = viewChild<ElementRef<HTMLCanvasElement>>('analEl');

  readonly ready = signal(false);
  readonly capturing = signal(false);
  readonly err = signal<string | null>(null);
  readonly flashOn = signal(false);
  readonly flashOk = signal(false);
  readonly phase = signal<DetectPhase>('waiting');
  readonly stableProgress = signal(0);
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

  // Detection state
  private detectRafId = 0;
  private lastDetectTime = 0;
  private prevGray: Uint8ClampedArray | null = null;
  private stableCount = 0;
  private retryTimer = 0;

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

  /** Manual capture (button press) — skips auto-detection */
  async capture(): Promise<void> {
    const video = this.videoEl()?.nativeElement;
    const canvas = this.canvasEl()?.nativeElement;
    if (!video || !canvas || !this.ready()) return;
    this.stopDetection();
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

  // ─── Camera lifecycle ───────────────────────────────────

  private async open(): Promise<void> {
    this.err.set(null);
    this.ready.set(false);
    this.flashOn.set(false);
    this.flashOk.set(false);
    this.phase.set('waiting');
    this.stableProgress.set(0);
    this.stableCount = 0;
    this.prevGray = null;
    window.addEventListener('resize', this.onResizeBound);
    this.onResize();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      this.track = this.stream.getVideoTracks()[0];
      this.detectFlash();
      await Promise.resolve();

      const video = this.videoEl()?.nativeElement;
      if (!video) return;
      video.srcObject = this.stream;
      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res();
        video.onerror = () => rej(new Error('Video load failed'));
      });
      await video.play();
      this.ready.set(true);
      this.startDetection();
    } catch (e) {
      this.err.set(this.permMsg(e));
    }
  }

  private stopCamera(): void {
    this.stopDetection();
    clearTimeout(this.retryTimer);
    window.removeEventListener('resize', this.onResizeBound);
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null; this.track = null;
    }
    const v = this.videoEl()?.nativeElement;
    if (v) v.srcObject = null;
    this.ready.set(false); this.flashOn.set(false); this.flashOk.set(false);
    this.phase.set('waiting'); this.stableProgress.set(0);
  }

  // ─── Auto-detection loop ────────────────────────────────

  private startDetection(): void {
    this.lastDetectTime = 0;
    this.stableCount = 0;
    this.prevGray = null;
    this.phase.set('waiting');
    this.stableProgress.set(0);
    // Run rAF outside zone for performance, then enter zone only for UI updates
    this.zone.runOutsideAngular(() => {
      const loop = (ts: number) => {
        this.detectRafId = requestAnimationFrame(loop);
        if (ts - this.lastDetectTime < DETECT_MS) return;
        this.lastDetectTime = ts;
        this.analyzeFrame();
      };
      this.detectRafId = requestAnimationFrame(loop);
    });
  }

  private stopDetection(): void {
    if (this.detectRafId) {
      cancelAnimationFrame(this.detectRafId);
      this.detectRafId = 0;
    }
  }

  private analyzeFrame(): void {
    if (this.capturing() || this.phase() === 'blurry') return;
    const video = this.videoEl()?.nativeElement;
    const anal = this.analEl()?.nativeElement;
    if (!video || !anal || video.readyState < 2) return;

    // Map guide rect to video coordinates
    const guide = this.gr();
    const dw = video.clientWidth, dh = video.clientHeight;
    const vw = video.videoWidth, vh = video.videoHeight;
    const va = vw / vh, da = dw / dh;
    let sx: number, sy: number, ox: number, oy: number;
    if (va > da) {
      sy = vh / dh; sx = sy; ox = (vw - dw * sx) / 2; oy = 0;
    } else {
      sx = vw / dw; sy = sx; ox = 0; oy = (vh - dh * sy) / 2;
    }
    const gx = Math.max(0, Math.round(guide.x * sx + ox));
    const gy = Math.max(0, Math.round(guide.y * sy + oy));
    const gw = Math.min(Math.round(guide.w * sx), vw - gx);
    const gh = Math.min(Math.round(guide.h * sy), vh - gy);

    // Draw guide area onto small analysis canvas
    const aw = ANAL_W;
    const ah = Math.round(aw / ID_RATIO);
    anal.width = aw;
    anal.height = ah;
    const ctx = anal.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, gx, gy, gw, gh, 0, 0, aw, ah);
    const imgData = ctx.getImageData(0, 0, aw, ah);

    // Convert to grayscale
    const gray = this.toGrayscale(imgData);

    // 1. Content check: standard deviation
    const contentStd = this.stdDev(gray);
    const hasContent = contentStd > CONTENT_THRESH;

    // 2. Stability check: frame difference
    let isStable = false;
    if (this.prevGray && this.prevGray.length === gray.length) {
      const diff = this.frameDiff(gray, this.prevGray);
      isStable = diff < STABLE_THRESH;
    }
    this.prevGray = gray;

    // 3. Sharpness check: Laplacian variance
    const sharpness = this.laplacianVariance(gray, aw, ah);
    const isSharp = sharpness > SHARP_THRESH;

    // State machine — update signals inside zone for change detection
    const prevPhase = this.phase();
    let newPhase: DetectPhase;
    let newProgress = 0;

    if (!hasContent) {
      this.stableCount = 0;
      newPhase = 'waiting';
    } else if (!isStable || !isSharp) {
      this.stableCount = 0;
      newPhase = 'detected';
    } else {
      this.stableCount++;
      newPhase = this.stableCount >= 2 ? 'stabilizing' : 'detected';
      newProgress = Math.min(1, this.stableCount / STABLE_FRAMES);
    }

    // Only enter zone when something changed
    if (newPhase !== prevPhase || newProgress !== this.stableProgress()) {
      this.zone.run(() => {
        this.phase.set(newPhase);
        this.stableProgress.set(newProgress);
        this.cdr.markForCheck();
      });
    }

    if (this.stableCount >= STABLE_FRAMES) {
      this.zone.run(() => this.autoCapture());
    }
  }

  private async autoCapture(): Promise<void> {
    this.stopDetection();
    this.capturing.set(true);
    const video = this.videoEl()?.nativeElement;
    const canvas = this.canvasEl()?.nativeElement;
    if (!video || !canvas) {
      this.capturing.set(false);
      return;
    }

    try {
      const file = await this.cropGuideArea(video, canvas);

      // Check final image sharpness
      const sharp = await this.checkFinalSharpness(file);
      if (!sharp) {
        this.capturing.set(false);
        this.phase.set('blurry');
        this.stableProgress.set(0);
        this.cdr.markForCheck();
        this.retryTimer = window.setTimeout(() => {
          this.phase.set('waiting');
          this.stableCount = 0;
          this.prevGray = null;
          this.cdr.markForCheck();
          this.startDetection();
        }, RETRY_DELAY);
        return;
      }

      this.stopCamera();
      this.captured.emit(file);
    } catch {
      this.err.set('촬영에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      this.capturing.set(false);
    }
  }

  // ─── Image analysis helpers ─────────────────────────────

  private toGrayscale(imgData: ImageData): Uint8ClampedArray {
    const d = imgData.data;
    const out = new Uint8ClampedArray(d.length / 4);
    for (let i = 0; i < out.length; i++) {
      const j = i * 4;
      out[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8; // fast luminance
    }
    return out;
  }

  private stdDev(gray: Uint8ClampedArray): number {
    const n = gray.length;
    if (n === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += gray[i];
    const mean = sum / n;
    let sq = 0;
    for (let i = 0; i < n; i++) {
      const d = gray[i] - mean;
      sq += d * d;
    }
    return Math.sqrt(sq / n);
  }

  private frameDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    return sum / a.length;
  }

  /** Laplacian variance — higher = sharper */
  private laplacianVariance(gray: Uint8ClampedArray, w: number, h: number): number {
    // 3x3 Laplacian kernel: [0,-1,0,-1,4,-1,0,-1,0]
    const out: number[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const lap =
          4 * gray[idx]
          - gray[idx - 1] - gray[idx + 1]
          - gray[idx - w] - gray[idx + w];
        out.push(lap);
      }
    }
    if (out.length === 0) return 0;
    let sum = 0;
    for (const v of out) sum += v;
    const mean = sum / out.length;
    let sq = 0;
    for (const v of out) {
      const d = v - mean;
      sq += d * d;
    }
    return Math.sqrt(sq / out.length);
  }

  /** Check sharpness of the final captured JPEG */
  private async checkFinalSharpness(file: File): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const aw = ANAL_W;
        const ah = Math.round(aw / ID_RATIO);
        c.width = aw;
        c.height = ah;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) { resolve(true); return; }
        ctx.drawImage(img, 0, 0, aw, ah);
        const imgData = ctx.getImageData(0, 0, aw, ah);
        const gray = this.toGrayscale(imgData);
        const sharpness = this.laplacianVariance(gray, aw, ah);
        URL.revokeObjectURL(img.src);
        resolve(sharpness >= BLUR_CHECK_THRESH);
      };
      img.onerror = () => resolve(true); // on error, allow it through
      img.src = URL.createObjectURL(file);
    });
  }

  // ─── Crop & utility ─────────────────────────────────────

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

  private onResize(): void {
    this.vp.set({ w: window.innerWidth, h: window.innerHeight });
  }
}
