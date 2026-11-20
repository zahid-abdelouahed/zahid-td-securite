import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { API } from '../api/banque';

export interface Utilisateur {
  readonly login: string;
  readonly roles: readonly string[];
}

/**
 * Garde l'utilisateur connecté. Squelette du TD : à compléter en partie 2.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly http = inject(HttpClient);

  readonly utilisateur = signal<Utilisateur | null>(null);

  /**
   * Vérifie les identifiants auprès du serveur (GET /api/me avec l'en-tête
   * Basic) et mémorise l'utilisateur. Doit échouer (throw) si le serveur répond 401.
   */

  private entete: string | null = null;

  get enteteAuthorization(): string | null {
    return this.entete;
  }
  async connecter(login: string, motDePasse: string): Promise<void> {

    const entete = 'Basic ' + btoa(`${login}:${motDePasse}`);
    const moi = await firstValueFrom(
      this.http.get<Utilisateur>(`${API}/me`, {
        headers: new HttpHeaders({ Authorization: entete })
      }),
    );
    this.entete = entete;
    this.utilisateur.set(moi);
  }

  deconnecter(): void {
    this.entete = null;
    this.utilisateur.set(null);
  }

  aUnRole(...roles: string[]): boolean {
    const u = this.utilisateur();
    return !!u && roles.some((r) => u.roles.includes(r));
  }

}

