const fs = require('fs');

function getLocalVersion(versionFile) {
  try {
    if (!fs.existsSync(versionFile)) {
      return '0.0.0';
    }

    const data = JSON.parse(
      fs.readFileSync(versionFile, 'utf8')
    );

    return data.version || '0.0.0';
  } catch (err) {
    console.error(err);
    return '0.0.0';
  }
}

function saveLocalVersion(versionFile, version) {
  fs.writeFileSync(
    versionFile,
    JSON.stringify(
      {
        version
      },
      null,
      2
    )
  );
}

module.exports = {
  getLocalVersion,
  saveLocalVersion
};