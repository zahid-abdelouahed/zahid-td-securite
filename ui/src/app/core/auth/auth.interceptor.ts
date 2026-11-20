import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API } from '../api/banque';
import { AuthService } from './auth.service';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const entete = auth.enteteAuthorization;
    const versApi = req.url.startsWith(API);
    
    if (versApi && entete && !req.headers.has('Authorization')) {
        req = req.clone({ setHeaders: { Authorization: entete } });
    }
    return next(req).pipe(
        catchError((err: unknown) => {
            if (versApi && err instanceof HttpErrorResponse && err.status === 401 && auth.utilisateur()) {
                auth.deconnecter();
                void router.navigate(['/login'], { queryParams: { retour: router.url } });
            }
            return throwError(() => err);
        }),
    );
};