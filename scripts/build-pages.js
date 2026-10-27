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
  'highlight-pairs-data.js',
  'highlight-pairs.js',
  'highlight-pairs.css',
  'source-data.js',
  'learning-store.js',
  'source-workspace.js',
  'source-workspace.css',
  'scene-ai-data.js',
  'scene-ai-client.js',
  'scene-ai.js',
  'scene-ai-tasks.js',
  'scene-ai-tasks.css',
  'scene-ai.css',
  'scene-media.js',
  'media-editor-data.js',
  'media-editor-engine.js',
  'media-editor.js',
  'media-crop-ai.js',
  'assets/acceptance/crop-synthetic.png',
  'media-editor.css',
  'ui-overlays.js',
  'ui-consistency.js',
  'ui-consistency.css',
  'scene-ui.js',
  'scene-preview.js',
  'scene-workspace.js',
  'scene-organization.js',
  'scene-study.js',
  'anki-bridge-ui.js',
  'bridge-release.js',
  'bridge-release.json',
  'bridge-connection.css',
  'learning-help-data.js',
  'learning-help.js',
  'learning-help.css',
  'learning-content.js',
  'entry-maintenance-data.js',
  'entry-maintenance.js',
  'entry-maintenance.css',
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
await mkdir(join(dist,'vendor/media-engine'),{recursive:true});
for(const file of await readdir(join(root,'vendor/media-engine')))await copyFile(join(root,'vendor/media-engine',file),join(dist,'vendor/media-engine',file));

console.log(`Cloudflare Pages static output written to ${dist}`);
