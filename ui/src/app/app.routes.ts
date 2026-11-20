import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'comptes' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
    title: 'Banque · connexion',
  },
   
  {
    path: 'comptes',
    loadComponent: () => import('./features/comptes/liste-comptes').then((m) => m.ListeComptes),
    title: 'Banque · comptes',
    canActivate: [authGuard],
    data: { roles: ['CLIENT', 'CONSEILLER'] },
  },
  {
    path: 'comptes/:id',
    loadComponent: () => import('./features/comptes/detail-compte').then((m) => m.DetailCompte),
    title: 'Banque · compte',
    canActivate: [authGuard],
    data: { roles: ['CLIENT', 'CONSEILLER'] },
  },

  {
    path: 'comptes',
    loadComponent: () => import('./features/comptes/liste-comptes').then((m) => m.ListeComptes),
    title: 'Banque · comptes',
  },
  {
    path: 'comptes/:id',
    loadComponent: () => import('./features/comptes/detail-compte').then((m) => m.DetailCompte),
    title: 'Banque · compte',
  },
  { path: '**', redirectTo: 'comptes' },
];
