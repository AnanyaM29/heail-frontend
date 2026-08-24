import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      // A 401 from anywhere (not logged in, or a session that's since
      // expired) means "go log in", not an inline error banner reading
      // the raw backend message — send them straight to the login page
      // instead. Login/auth calls themselves (e.g. a wrong password) are
      // excluded since a 401 there is a normal, expected form error.
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/api/v1/auth/')) {
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    })
  );
};
