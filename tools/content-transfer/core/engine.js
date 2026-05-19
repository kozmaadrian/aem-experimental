/**
 * Pure copy orchestrator. No DOM, no fetch, no globals — all I/O is injected
 * via the `io` adapter. Drives a queue of items with bounded concurrency.
 *
 * State machine per item:
 *   queued → checking → (skipped | fetching → writing → done) | failed
 *
 * Conflict resolution is binary: `conflictPolicy: 'overwrite' | 'skip'`.
 * Existing target files are skipped silently unless overwrite is enabled.
 */

/**
 * @param {object} opts
 * @param {Array<{ sourcePath: string, targetPath: string }>} opts.items
 * @param {object} opts.io   readSource, writeSource, targetExists
 * @param {string} opts.sourceOrg
 * @param {string} opts.sourceSite
 * @param {string} opts.targetOrg
 * @param {string} opts.targetSite
 * @param {'skip'|'overwrite'} [opts.conflictPolicy='skip']
 * @param {number} [opts.concurrency=3]
 * @param {(p: { index: number, state: string, error?: string }) => void} opts.onProgress
 * @returns {Promise<{ copied: number, skipped: number, failed: number }>}
 */
export async function runCopy({
  items,
  io,
  sourceOrg,
  sourceSite,
  targetOrg,
  targetSite,
  conflictPolicy = 'skip',
  concurrency = 3,
  onProgress = () => {},
}) {
  let cursor = 0;
  const summary = { copied: 0, skipped: 0, failed: 0 };

  async function processItem(index) {
    const item = items[index];
    try {
      onProgress({ index, state: 'checking' });
      const exists = await io.targetExists(targetOrg, targetSite, item.targetPath);

      if (exists && conflictPolicy !== 'overwrite') {
        onProgress({ index, state: 'skipped' });
        summary.skipped += 1;
        return;
      }

      onProgress({ index, state: 'fetching' });
      const { body, contentType } = await io.readSource(sourceOrg, sourceSite, item.sourcePath);

      onProgress({ index, state: 'writing' });
      await io.writeSource(targetOrg, targetSite, item.targetPath, body, contentType);

      onProgress({ index, state: 'done' });
      summary.copied += 1;
    } catch (error) {
      onProgress({
        index,
        state: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      summary.failed += 1;
    }
  }

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      // eslint-disable-next-line no-await-in-loop
      await processItem(index);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1));
  const workers = [];
  for (let i = 0; i < workerCount; i += 1) workers.push(worker());
  await Promise.all(workers);

  return summary;
}
