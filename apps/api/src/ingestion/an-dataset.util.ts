import { createWriteStream } from 'node:fs';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { IngestionLogLevel } from '../../generated/prisma/client.js';

/**
 * Machinerie de téléchargement des dumps open data de l'Assemblée nationale, partagée par les
 * ingestors qui consomment ces dumps (amendements, textes/dossiers, …). Extrait tel quel de
 * l'ingestor amendements. Aucun appel à l'infra Tricoteuses : seule la source étatique est contactée.
 */

export type AnDatasetLog = (
  level: IngestionLogLevel,
  message: string,
) => Promise<void>;

/** Reuse an already-downloaded dump younger than this (idempotent retries). */
const ZIP_REUSE_MAX_AGE_MS = 20 * 3_600_000;
/**
 * Download in short Range requests: the AN server (Varnish) kills long
 * connections mid-stream, a single large GET rarely survives.
 */
const DOWNLOAD_CHUNK_SIZE = 16 * 1024 * 1024;
const DOWNLOAD_MAX_FAILURES = 10;

/** Télécharge (avec reprise) puis extrait le zip du dump dans `extractDir`. */
export async function downloadAndExtractAnDataset(
  url: string,
  extractDir: string,
  log: AnDatasetLog,
): Promise<void> {
  const zipPath = `${extractDir}.zip`;
  const remoteSize = await remoteContentLength(url);

  if (await canReuseZip(zipPath, remoteSize)) {
    await log(
      'INFO',
      `Reusing existing dump ${zipPath} (fresh, size verified)`,
    );
  } else {
    await downloadFileWithResume(url, zipPath, log);
  }
  await log('INFO', `Extracting ${zipPath}`);

  // Fresh extraction — the dump is authoritative, stale files must not linger.
  await rm(extractDir, { recursive: true, force: true });
  await mkdir(extractDir, { recursive: true });
  const { default: extractZip } = await import('extract-zip');
  // extract-zip exige un `dir` absolu. resolve() convient qu'extractDir soit
  // relatif (défaut ./data) OU absolu (DATA_DIR=/app/data en prod) ; l'ancien
  // join(process.cwd(), extractDir) doublait le préfixe sur un chemin absolu
  // (/app + /app/data → /app/app/data), extrayant à côté de walkJsonFiles.
  await extractZip(zipPath, { dir: resolve(extractDir) });
  await rm(zipPath, { force: true });
  await log('INFO', `Extracted into ${extractDir}`);
}

/** Itère récursivement tous les fichiers `.json` sous `dir`. */
export async function* walkJsonFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkJsonFiles(fullPath);
    } else if (entry.name.endsWith('.json')) {
      yield fullPath;
    }
  }
}

async function remoteContentLength(url: string): Promise<number | null> {
  try {
    const head = await fetch(url, { method: 'HEAD' });
    const length = Number(head.headers.get('content-length'));
    return Number.isFinite(length) && length > 0 ? length : null;
  } catch {
    return null;
  }
}

/** Reuse only a fresh AND complete dump (guards against truncated downloads). */
async function canReuseZip(
  zipPath: string,
  remoteSize: number | null,
): Promise<boolean> {
  const local = await stat(zipPath).catch(() => null);
  if (!local || Date.now() - local.mtimeMs >= ZIP_REUSE_MAX_AGE_MS) {
    return false;
  }
  // Without a remote size we cannot verify integrity — re-download.
  return remoteSize !== null && local.size === remoteSize;
}

/**
 * Chunked download: 16 MB Range requests appended to a .part file, each
 * short enough to survive the server's mid-stream connection cuts. Progress
 * persists across retries AND across runs (.part + .etag files); an ETag
 * change (dump regenerated server-side) restarts from zero.
 * Réutilisable par tout harvester consommant un gros dump étatique (AN, DILA…).
 */
export async function downloadFileWithResume(
  url: string,
  destPath: string,
  log: AnDatasetLog,
): Promise<void> {
  const zipPath = destPath;
  const partPath = `${zipPath}.part`;
  const etagPath = `${zipPath}.etag`;

  let etag = await readFile(etagPath, 'utf-8').catch(() => null);
  let offset = 0;
  if (etag) {
    offset = (await stat(partPath).catch(() => null))?.size ?? 0;
    if (offset > 0) {
      await log('INFO', `Resuming previous download at ${offset} bytes`);
    }
  } else {
    await rm(partPath, { force: true });
  }

  let totalSize: number | null = null;
  let failures = 0;

  await log('INFO', `Downloading ${url} (chunked)`);
  while (totalSize === null || offset < totalSize) {
    try {
      const end = offset + DOWNLOAD_CHUNK_SIZE - 1;
      const response: Response = await fetch(url, {
        headers: { Range: `bytes=${offset}-${end}` },
      });
      if (response.status !== 206 || !response.body) {
        throw new Error(`HTTP ${response.status} (expected 206)`);
      }

      const responseEtag = response.headers.get('etag');
      if (etag && responseEtag && responseEtag !== etag) {
        await log(
          'WARN',
          'Dump regenerated server-side (ETag changed), restarting from zero',
        );
        await rm(partPath, { force: true });
        etag = null;
        offset = 0;
        totalSize = null;
        continue;
      }
      if (!etag && responseEtag) {
        etag = responseEtag;
        await writeFile(etagPath, etag);
      }

      // Content-Range: "bytes <from>-<to>/<total>" — authoritative total.
      const contentRange = response.headers.get('content-range');
      const totalMatch = /\/(\d+)$/.exec(contentRange ?? '');
      if (totalMatch) totalSize = Number(totalMatch[1]);

      await pipeline(
        Readable.fromWeb(response.body as never),
        createWriteStream(partPath, { flags: 'a' }),
      );
      // A cut mid-chunk still appended some bytes — always recompute.
      offset = (await stat(partPath)).size;

      if (offset % (4 * DOWNLOAD_CHUNK_SIZE) < DOWNLOAD_CHUNK_SIZE) {
        await log('INFO', `Downloaded ${offset}/${totalSize ?? '?'} bytes`);
      }
    } catch (error) {
      failures += 1;
      offset = (await stat(partPath).catch(() => null))?.size ?? 0;
      const message = error instanceof Error ? error.message : String(error);
      if (failures >= DOWNLOAD_MAX_FAILURES) {
        // Keep .part + .etag: the next run resumes where this one stopped.
        throw new Error(
          `Download failed after ${failures} chunk failures: ${message}`,
        );
      }
      const backoffMs = Math.min(1000 * 2 ** failures, 30_000);
      await log(
        'WARN',
        `Chunk failed at offset ${offset} (${message}), retrying in ${backoffMs}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  const downloaded = await stat(partPath);
  if (downloaded.size !== totalSize) {
    throw new Error(
      `Size mismatch after download: ${downloaded.size}/${totalSize} bytes`,
    );
  }
  // Atomic rename — a crash mid-download can't leave a corrupt zip behind.
  await rm(zipPath, { force: true });
  await rename(partPath, zipPath);
  await rm(etagPath, { force: true });
  await log('INFO', `Downloaded ${downloaded.size} bytes to ${zipPath}`);
}
