import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const targetDir = resolve('public/assets');
const target = resolve(targetDir, 'sql-wasm.wasm');

if (existsSync(source)) {
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(source, target);
  console.log('Copied sql-wasm.wasm to public/assets');
} else {
  console.warn('sql-wasm.wasm not found yet. Run npm install again if needed.');
}