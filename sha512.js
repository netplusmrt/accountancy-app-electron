const crypto = require("crypto");
const fs = require("fs");

function getSHA512(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha512");
  hashSum.update(fileBuffer);
  return hashSum.digest("base64"); // Convert to base64 (electron-updater standard)
}

// Change this to your actual output file
const filePath = "out/make/squirrel.windows/x64/accountancy-app-25.1.12 Setup.exe";

console.log(`SHA-512: ${getSHA512(filePath)}`);
