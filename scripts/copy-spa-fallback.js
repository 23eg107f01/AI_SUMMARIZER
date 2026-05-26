const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
const fallbackPath = path.join(__dirname, '..', 'frontend', 'dist', '404.html');

if (fs.existsSync(sourcePath)) {
  fs.copyFileSync(sourcePath, fallbackPath);
}