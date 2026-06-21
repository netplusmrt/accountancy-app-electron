// Splash/renderer logic for status text, progress, and version display.

function updateProgress(percent, stage) {
  const progressPercent = Math.max(0, Math.min(100, Number(percent) || 0));

  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const stageText = document.getElementById('stage-text');
  const statusText = document.getElementById('status-text');

  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }

  if (progressText) {
    progressText.textContent = `${Math.round(progressPercent)}%`;
  }

  if (stageText) {
    if (stage === 'downloading') {
      stageText.textContent = 'Downloading updates...';
    } else if (stage === 'extracting') {
      stageText.textContent = 'Extracting updates...';
    } else {
      stageText.textContent = '';
    }
  }

  if (statusText) {
    if (stage === 'extracting') {
      statusText.textContent = 'Finalizing download...';
    } else if (stage === 'downloading') {
      statusText.textContent = 'Preparing your workspace...';
    } else if (!statusText.dataset.custom) {
      statusText.textContent = 'Preparing your workspace...';
    }
  }
}

function setStatusText(message) {
  const statusText = document.getElementById('status-text');
  if (statusText && message) {
    statusText.dataset.custom = 'true';
    statusText.textContent = message;
  }
}

function clearStatusTextOverride() {
  const statusText = document.getElementById('status-text');
  if (statusText) {
    delete statusText.dataset.custom;
    statusText.textContent = 'Preparing your workspace...';
  }
}

async function initializeSplash() {
  const versionEl = document.getElementById('app-version');

  if (versionEl && window.electron?.invoke) {
    try {
      const version = await window.electron.invoke('get-app-version');
      if (version) {
        versionEl.textContent = version;
      }
    } catch (error) {
      console.error('Failed to load app version:', error);
    }
  }
}

initializeSplash();

window.electron?.receive('ui-download-progress', (payload) => {
  const hasSplashProgress = !!document.getElementById('progress-fill') && !!document.getElementById('progress-text');
  if (hasSplashProgress) {
    updateProgress(payload?.percent, payload?.stage);
  }
});

window.electron?.receive('ui-update-status', (message) => {
  const hasSplashStatus = !!document.getElementById('status-text');
  if (hasSplashStatus) {
    setStatusText(message);
  }
});

window.electron?.receive('update_available', () => {
  const bar = document.getElementById('bar');
  if (bar) {
    bar.style.display = 'flex';
  }

  const hasSplash = !!document.getElementById('progress-fill') && !!document.getElementById('progress-text');
  if (!bar && hasSplash) {
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = 'Update available. Downloading...';
    }
  }
});

window.electron?.receive('update-progress', (percentage) => {
  const bar = document.getElementById('bar');
  if (bar) {
    const percent = Number(percentage) || 0;
    bar.style.width = `${percent * 100}%`;
    bar.innerHTML = `Downloading ${parseInt(percent * 100)}%`;
  }

  const hasSplash = !!document.getElementById('progress-fill') && !!document.getElementById('progress-text');
  if (hasSplash && !bar) {
    updateProgress(percentage, 'downloading');
  }
});

function isOnline() {
  return navigator.onLine;
}

window.electron?.receive('update_downloaded', () => {
  const result = confirm('A new update is ready. Restart the app to apply it?');
  if (result) {
    window.electron?.send('restart_app');
  }
});