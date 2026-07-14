import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const files = [
  'index.html',
  'app.js',
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

console.log(`Cloudflare Pages static output written to ${dist}`);

