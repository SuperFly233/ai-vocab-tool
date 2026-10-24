import { copyFile, mkdir, rm, writeFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const files = [
  'index.html',
  'app.js',
  'provider-client.js',
  'provider-contract.js',
  'model-stream.js',
  'upstream-error.js',
  'history-data.js',
  'settings-data.js',
  'view-preferences.js',
  'storage-state.js',
  'diagnostic-store.js',
  'icons.js',
  'lookup-tasks.js',
  'sync-state.js',
  'learning-tools.js',
  'scene-data.js',
  'scene-media.js',
  'ui-overlays.js',
  'ui-consistency.js',
  'ui-consistency.css',
  'scene-ui.js',
  'scene-preview.js',
  'scene-workspace.js',
  'capture-data.js',
  'vision-client.js',
  'capture-ui.js',
  'capture.css',
  'scene-organization.js',
  'scene-study.js',
  'anki-bridge-ui.js',
  'learning-content.js',
  'learning-cards-ui.js',
  'learning-card.css',
  'fushi-workspace.js',
  'experience-ui.js',
  'row-navigation.js',
  'input-suggestions.js',
  'suggestion-worker.js',
  'dictionary-ui.js',
  'basic-dictionary.js',
  'basic-dictionary-worker.js',
  'request-ui.js',
  'styles.css',
  'favicon.svg',
  'site.webmanifest',
  'vendor/supabase.js',
  'vendor/supabase.LICENSE',
  'vendor/word-list/words.txt',
  'vendor/word-list/LICENSE',
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of files) {
  const target = join(dist, file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, file), target);
}

const retiredLucideTarget=join(dist,'vendor','lucide.min.js');
await mkdir(dirname(retiredLucideTarget),{recursive:true});
await writeFile(retiredLucideTarget,'/* Retired: project icons are generated in /icons.js. */\n','utf8');
await mkdir(join(dist,'vendor/basic-dictionaries'),{recursive:true});
for(const file of await readdir(join(root,'vendor/basic-dictionaries')))await copyFile(join(root,'vendor/basic-dictionaries',file),join(dist,'vendor/basic-dictionaries',file));

console.log(`Cloudflare Pages static output written to ${dist}`);
