import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/signup-layout/signup-layout.component').then(m => m.SignupLayoutComponent),
    children: [
      { path: '', redirectTo: 'step/0', pathMatch: 'full' },
      { path: 'step/0', loadComponent: () => import('./pages/signup/step0-preparation/step0-preparation.component').then(m => m.Step0PreparationComponent) },
      { path: 'step/1', loadComponent: () => import('./pages/signup/step1-basic/step1-basic.component').then(m => m.Step1BasicComponent) },
      { path: 'step/2', loadComponent: () => import('./pages/signup/step2-business/step2-business.component').then(m => m.Step2BusinessComponent) },
      { path: 'step/2-individual', loadComponent: () => import('./pages/signup/step2-individual/step2-individual.component').then(m => m.Step2IndividualComponent) },
      { path: 'step/3', loadComponent: () => import('./pages/signup/step3-payment/step3-payment.component').then(m => m.Step3PaymentComponent) },
      { path: 'step/4', loadComponent: () => import('./pages/signup/step4-complete/step4-complete.component').then(m => m.Step4CompleteComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
