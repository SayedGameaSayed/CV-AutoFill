const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const testApiKeyBtn = document.getElementById('testApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const cvStatusText = document.getElementById('cvStatusText');
const clearCVBtn = document.getElementById('clearCVBtn');
const autoDetectToggle = document.getElementById('autoDetectToggle');
const showSidebarToggle = document.getElementById('showSidebarToggle');
const historyBody = document.getElementById('historyBody');
const historyEmpty = document.getElementById('historyEmpty');

document.addEventListener('DOMContentLoaded', async () => {
  await loadApiKey();
  await loadCVStatus();
  await loadSettings();
  await loadHistory();
});

async function loadApiKey() {
  const result = await chrome.storage.local.get('apiKey');
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
    setStatus(apiKeyStatus, 'API key is saved', 'success');
  }
}

async function loadCVStatus() {
  const result = await chrome.storage.local.get('cvData');
  if (result.cvData) {
    const date = new Date(result.cvData.uploaded_at).toLocaleString();
    cvStatusText.textContent = `CV uploaded on ${date}`;
    clearCVBtn.style.display = 'inline-block';
  } else {
    cvStatusText.textContent = 'No CV uploaded.';
    clearCVBtn.style.display = 'none';
  }
}

async function loadSettings() {
  const result = await chrome.storage.local.get('settings');
  if (result.settings) {
    autoDetectToggle.checked = result.settings.autoDetect ?? true;
    showSidebarToggle.checked = result.settings.showSidebar ?? false;
  } else {
    autoDetectToggle.checked = true;
  }
}

async function loadHistory() {
  const result = await chrome.storage.local.get('fillHistory');
  const history = result.fillHistory || [];
  if (history.length === 0) {
    historyEmpty.style.display = 'block';
    historyBody.innerHTML = '';
    return;
  }
  historyEmpty.style.display = 'none';
  historyBody.innerHTML = history.slice(0, 10).map(session => `
    <tr>
      <td>${escapeHtml(session.domain)}</td>
      <td>${new Date(session.timestamp).toLocaleDateString()}</td>
      <td>${session.fields_filled}/${session.fields_total}</td>
    </tr>
  `).join('');
}

saveApiKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus(apiKeyStatus, 'Please enter an API key', 'error');
    return;
  }
  await chrome.storage.local.set({ apiKey: key });
  setStatus(apiKeyStatus, 'API key saved', 'success');
});

testApiKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus(apiKeyStatus, 'Enter an API key first', 'error');
    return;
  }
  setStatus(apiKeyStatus, 'Testing...', '');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });
    if (response.ok) {
      setStatus(apiKeyStatus, 'Connection successful!', 'success');
    } else if (response.status === 403 || response.status === 400) {
      setStatus(apiKeyStatus, 'Invalid API key. Check and try again.', 'error');
    } else {
      setStatus(apiKeyStatus, `Unexpected response: ${response.status}`, 'error');
    }
  } catch (err) {
    setStatus(apiKeyStatus, 'Network error. Check your internet connection.', 'error');
  }
});

clearCVBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'CLEAR_CV' });
  await loadCVStatus();
});

autoDetectToggle.addEventListener('change', saveSettings);
showSidebarToggle.addEventListener('change', saveSettings);

async function saveSettings() {
  await chrome.storage.local.set({
    settings: {
      autoDetect: autoDetectToggle.checked,
      showSidebar: showSidebarToggle.checked
    }
  });
}

function setStatus(el, text, type) {
  el.textContent = text;
  el.className = 'options__status' + (type ? ` options__status--${type}` : '');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
