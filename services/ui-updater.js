const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const semver = require('semver');

const {
  getLocalVersion,
  saveLocalVersion
} = require('./version-manager');

const GITHUB_OWNER = 'netplusmrt';
const GITHUB_REPO = 'accountancy-app-ui';

async function getLatestRelease() {
  const response = await axios.get(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
  return response.data;
}

async function downloadFile(url, destination, onProgress) {
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'stream'
  });

  const total = parseInt(response.headers['content-length'], 10) || 0;
  const writer = fs.createWriteStream(destination);
  let downloaded = 0;

  response.data.on('data', (chunk) => {
    downloaded += chunk.length;
    if (onProgress) {
      const percent = total > 0
        ? Math.min(100, Math.max(0, (downloaded / total) * 100))
        : 0;

      onProgress({
        transferred: downloaded,
        total,
        percent,
        stage: 'downloading'
      });
    }
  });

  response.data.on('error', (error) => {
    writer.destroy(error);
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      if (onProgress) {
        onProgress({
          transferred: total || downloaded,
          total: total || downloaded,
          percent: 100,
          stage: 'downloading'
        });
      }
      resolve();
    });
    writer.on('error', reject);
    response.data.on('error', reject);
  });
}

async function updateUi(uiFolder, versionFile, onProgress) {
  const localVersion = getLocalVersion(versionFile);
  const release = await getLatestRelease();
  const remoteVersion = release.tag_name.replace('ui-v','');

  if (
    !semver.gt(remoteVersion, localVersion)
  ) {
    console.log('UI already up to date');
    return;
  }

  const zipAsset = release.assets.find(asset => asset.name.endsWith('.zip'));

  if (!zipAsset) {
    throw new Error('ZIP asset not found');
  }

  await fs.promises.mkdir(uiFolder, { recursive: true } );

  const zipPath = path.join(uiFolder, 'ui.zip');

  console.log('Downloading UI update...');

  if (onProgress) {
    onProgress({
      transferred: 0,
      total: 0,
      percent: 0,
      stage: 'downloading'
    });
  }

  await downloadFile(zipAsset.browser_download_url, zipPath, onProgress);

  console.log('Extracting UI...');

  if (onProgress) {
    onProgress({
      transferred: 0,
      total: 0,
      percent: 100,
      stage: 'extracting'
    });
  }

  const zip = new AdmZip(zipPath);

  zip.extractAllTo(uiFolder, true);

  saveLocalVersion(versionFile, remoteVersion);

  console.log(`UI Updated -> ${remoteVersion}`);
}

module.exports = {
  updateUi
};