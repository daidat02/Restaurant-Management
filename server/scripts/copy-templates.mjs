/**
 * Copy thư mục src/templates → dist/templates sau khi build (tsc KHÔNG copy file .hbs).
 * Chạy trong "build": "tsc && node scripts/copy-templates.mjs".
 */
import { cpSync, existsSync } from 'node:fs';

const src = 'src/templates';
const dest = 'dist/templates';

if (existsSync(src)) {
  cpSync(src, dest, { recursive: true });
  console.log(`[copy-templates] Đã copy ${src} → ${dest}`);
} else {
  console.warn('[copy-templates] Không thấy src/templates — bỏ qua.');
}