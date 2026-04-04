const fs = require('fs');

const pkgPath = './package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const now = new Date();

const year = String(now.getFullYear()).slice(2); // 26
const month = String(now.getMonth() + 1); // 4
const day = now.getDate(); // 4 (number, NOT padded)

let build = 1;

if (pkg.version) {
  const parts = pkg.version.split('.');

  if (parts.length === 3) {
    const [existingYear, existingMonth, existingPatch] = parts;

    const patchNum = parseInt(existingPatch, 10);

    // Extract day & build dynamically
    const existingDay = Math.floor(patchNum / 100);   // 401 → 4
    const existingBuild = patchNum % 100;             // 401 → 1

      if (
        existingYear === year &&
        existingMonth === month &&
        existingDay === day &&
        !isNaN(existingBuild)
      ) {
        build = existingBuild + 1;
      }
    }
  }

// Create patch: DD * 100 + build
const patch = day * 100 + build;

// Final version
const newVersion = `${year}.${month}.${patch}`;

pkg.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log('Version updated to:', newVersion);