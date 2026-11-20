import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    
    const auth = inject(AuthService);

    const router = inject(Router);
    if (!auth.utilisateur()) {
        return router.createUrlTree(['/login'], { queryParams: { retour: state.url } });
    }

    const roles = route.data['roles'] as string[] | undefined;
    if (roles && !auth.aUnRole(...roles)) {
        return false; 
    }
    return true;
};