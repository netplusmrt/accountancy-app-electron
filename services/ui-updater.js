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

async function downloadFile(url, destination) {
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(destination);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function updateUi(uiFolder, versionFile) {
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

  await downloadFile(zipAsset.browser_download_url, zipPath);

  console.log('Extracting UI...');

  const zip = new AdmZip(zipPath);

  zip.extractAllTo(uiFolder, true);

  saveLocalVersion(versionFile, remoteVersion);

  console.log(`UI Updated -> ${remoteVersion}`);
}

module.exports = {
  updateUi
};