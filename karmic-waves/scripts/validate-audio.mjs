/* Verifies that all 36 audio files (12 months × 3 tracks) resolve under the configured AUDIO_SOURCE.
 * Fails loudly (exit 1) if any month is incomplete. Run as part of `npm run build`.
 * Set SKIP_AUDIO_CHECK=1 only for frontend-only preview builds — never for a production deploy.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { validateAll } = require('../lib/audio-library.js');

if (process.env.SKIP_AUDIO_CHECK === '1') {
  console.warn('audio check SKIPPED (SKIP_AUDIO_CHECK=1) — do not deploy this build to production');
  process.exit(0);
}

const r = await validateAll();
if (r.ok) {
  console.log(`audio library OK: ${r.total}/36 files resolved via AUDIO_SOURCE=${r.mode}`);
  process.exit(0);
}
console.error(`\nAUDIO LIBRARY INCOMPLETE (AUDIO_SOURCE=${r.mode}): ${r.missing.length} of ${r.total} files missing\n`);
for (const m of r.missing) console.error(`  - ${m.month}: ${m.file}`);
console.error('\nFix: place the files, set AUDIO_SOURCE/AUDIO_BASE_URL/AUDIO_MEDIA_IDS_JSON, or update src/config.js. Build aborted.\n');
process.exit(1);
