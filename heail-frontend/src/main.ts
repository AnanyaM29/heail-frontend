import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { CHUNK_RELOAD_FLAG, reloadOnChunkFailure } from './app/core/chunk-reload.handler';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    // App came up cleanly — release the one-shot guard so a future deploy
    // mismatch can still get its single recovery reload.
    try { sessionStorage.removeItem(CHUNK_RELOAD_FLAG); } catch {}
  })
  .catch((err) => {
    if (reloadOnChunkFailure(err)) return;
    console.error(err);
  });
