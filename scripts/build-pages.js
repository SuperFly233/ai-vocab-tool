import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const files = [
  'index.html',
  'app.js',
  'history-data.js',
  'settings-data.js',
  'storage-state.js',
  'icons.js',
  'lookup-tasks.js',
  'sync-state.js',
  'styles.css',
  'favicon.svg',
  'site.webmanifest',
  'vendor/supabase.js',
  'vendor/supabase.LICENSE',
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

console.log(`Cloudflare Pages static output written to ${dist}`);
