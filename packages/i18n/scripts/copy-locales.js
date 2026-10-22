const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '..', 'src', 'locales');
const dest = path.join(__dirname, '..', 'dist', 'locales');

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  if (file.endsWith('.json')) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
}
console.log('[i18n] locales copied to dist/locales');
