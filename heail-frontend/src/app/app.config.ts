import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withNavigationErrorHandler } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ChunkReloadErrorHandler, reloadOnChunkFailure } from './core/chunk-reload.handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      // A lazy route whose chunk 404s after a deploy would otherwise just fail
      // silently (the click does nothing) — reload to pick up the new build.
      withNavigationErrorHandler((e: any) => reloadOnChunkFailure(e?.error ?? e))
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: ErrorHandler, useClass: ChunkReloadErrorHandler }
  ]
};
