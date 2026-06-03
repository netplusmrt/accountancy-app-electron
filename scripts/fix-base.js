const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'accountancy-app', 'index.html');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
const replaced = content.replace(/<base href="\/">/g, '<base href=".\/">');

if (content === replaced) {
  console.log('No <base> replacement needed.');
} else {
  fs.writeFileSync(filePath, replaced, 'utf8');
  console.log('Replaced <base href="/"> with <base href="./"> in', filePath);
}
