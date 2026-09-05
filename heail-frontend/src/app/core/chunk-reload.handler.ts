import { ErrorHandler, Injectable } from '@angular/core';

export const CHUNK_RELOAD_FLAG = 'heail_chunk_reload';

function isChunkFailure(error: unknown): boolean {
  const msg = String((error as any)?.message ?? error ?? '');
  return (
    /ChunkLoadError/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

/**
 * Reloads the page once if `error` is a lazy-chunk load failure. After a deploy,
 * an open tab / stale index.html still points at the previous build's
 * content-hashed chunks; navigating to a lazy route then fails and the click
 * seems to do nothing. The one-shot guard (cleared on the next successful
 * bootstrap, see main.ts) prevents a reload loop if the reload doesn't help.
 * Returns true if a reload was triggered.
 */
export function reloadOnChunkFailure(error: unknown): boolean {
  if (!isChunkFailure(error)) return false;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1') return false;
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
  } catch { /* private mode: still worth one reload attempt */ }
  window.location.reload();
  return true;
}

@Injectable()
export class ChunkReloadErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (reloadOnChunkFailure(error)) return;
    console.error(error);
  }
}
