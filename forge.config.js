const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
     name: "AccountancyApp"
  },
  hooks: {
    postPackage: async (forgeConfig, options) => {
      console.log("✅ postPackage hook triggered!");
      console.log("Package Directory:", options.outputPaths);

      // Example: Copy a file after packaging
      const fs = require('fs-extra');
      const path = require('path');

      const outputPath = options.outputPaths[0]; // Path to the packaged app
      const extraFile = path.join(__dirname, "dev-app-update.yml");
      const destination = path.join(outputPath, "resources\\app-update.yml");

      await fs.copy(extraFile, destination);
      console.log("📂 Extra file copied to:", destination);
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: "AccountancyApp",
        setupExe: "AccountancyApp-installer.exe",
        setupIcon: "assets/icon.ico", // Installer icon
        shortcutName: "AccountancyApp", // Name for the shortcut
        menuCategory: true, // Places it under a Start Menu category
        createDesktopShortcut: true, // Ensures a desktop shortcut is created
        createStartMenuShortcut: true, // Ensures a Start Menu shortcut is created
        noMsi: true, // Avoids creating an MSI installer
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  build: {
    extraResources: [
      {
        from: "dev-app-update.yml", // Local file in your project
        to: "app-update.yml" // Destination inside packaged app
      }
    ]
  }
};
