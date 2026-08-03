import { copyFile, mkdir, rm } from 'node:fs/promises';
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
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of files) {
  const target = join(dist, file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, file), target);
}

const lucideTarget=join(dist,'vendor','lucide.min.js');
await mkdir(dirname(lucideTarget),{recursive:true});
await copyFile(join(root,'node_modules','lucide','dist','umd','lucide.min.js'),lucideTarget);

console.log(`Cloudflare Pages static output written to ${dist}`);
