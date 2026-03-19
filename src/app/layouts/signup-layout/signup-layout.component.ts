import { Component, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SignupService } from '../../shared/services/signup.service';
import { SignupStep } from '../../shared/models/signup.model';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-signup-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './signup-layout.component.html',
  styleUrl: './signup-layout.component.css',
})
export class SignupLayoutComponent implements OnInit, OnDestroy {
  private readonly signupService = inject(SignupService);
  private readonly router = inject(Router);
  private routerSub: Subscription | null = null;

  readonly currentStep = this.signupService.currentStep;
  readonly isPreparationStep = computed(() => this.currentStep() === 0);

  readonly steps = computed(() => {
    const isBusiness = this.signupService.memberType() === 'business';
    return [
      { number: 1 as SignupStep, label: '기본 정보' },
      { number: 2 as SignupStep, label: isBusiness ? '사업자 정보' : '개인 정보' },
      { number: 3 as SignupStep, label: '정산계좌 설정' },
      { number: 4 as SignupStep, label: '완료' },
    ];
  });

  readonly stepStatus = computed(() => {
    const current = this.currentStep();
    return this.steps().map((step) => ({
      ...step,
      isActive: step.number === current,
      isCompleted: step.number < current,
    }));
  });

  ngOnInit(): void {
    this.syncStepFromUrl(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncStepFromUrl(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private syncStepFromUrl(url: string): void {
    if (url.includes('/step/2-individual')) {
      if (this.currentStep() !== 2) this.signupService.goToStep(2);
      return;
    }
    const match = url.match(/\/step\/(\d)/);
    if (match) {
      const step = parseInt(match[1], 10) as SignupStep;
      if (step >= 0 && step <= 4 && step !== this.currentStep()) {
        this.signupService.goToStep(step);
      }
    }
  }
}
