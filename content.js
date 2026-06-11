const STYLE_ID = 'cv-autofill-styles';
const TOAST_ID = 'cv-autofill-toast';
const OBSERVER_DELAY = 350;

let undoSnapshot = [];
let formObserver = null;
let navCheckInterval = null;
let lastUrl = location.href;

injectStyles();
registerFrame();
startFormObserver();
startNavWatcher();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SCAN_FIELDS':
      const fields = scanFormFields();
      sendResponse({ fields });
      return true;
    case 'WRITE_FIELDS':
      handleWriteFields(message.fields, sendResponse);
      return true;
    case 'SCAN_FIELDS_DEEP':
      scanDeep(sendResponse);
      return true;
    case 'AUTOFILL':
      handleAutoFill(sendResponse);
      return true;
    case 'PING':
      sendResponse({ alive: true });
      return true;
  }
});

function registerFrame() {
  try {
    chrome.runtime.sendMessage({ type: 'FRAME_REGISTER', url: location.href }, () => {
      if (chrome.runtime.lastError) {}
    });
  } catch (e) {}
}

function startFormObserver() {
  if (formObserver) formObserver.disconnect();
  formObserver = new MutationObserver(() => {
    if (document.querySelector('input, textarea, select, [contenteditable], [role="combobox"], [role="textbox"]')) {
      clearTimeout(formObserver._debounce);
      formObserver._debounce = setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'FORMS_DETECTED',
          url: location.href
        });
      }, OBSERVER_DELAY);
    }
  });
  formObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
}

function startNavWatcher() {
  if (navCheckInterval) clearInterval(navCheckInterval);
  navCheckInterval = setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      restart();
    }
  }, 500);
}

function restart() {
  if (formObserver) formObserver.disconnect();
  startFormObserver();
}

async function handleAutoFill(sendResponse) {
  const result = await chrome.storage.local.get('cvData');
  if (!result.cvData) {
    sendResponse({ success: false, reason: 'no_cv' });
    return;
  }
  const fields = scanFormFields();
  if (fields.length === 0) {
    sendResponse({ success: false, reason: 'no_fields' });
    return;
  }
  const matchResult = await chrome.runtime.sendMessage({
    type: 'MATCH_FIELDS',
    parsedCV: result.cvData.parsed,
    rawText: result.cvData.raw_text,
    unmatchedFields: fields
  });
  if (matchResult.success && matchResult.matches.length > 0) {
    handleWriteFields(matchResult.matches, (res) => sendResponse(res));
  } else {
    sendResponse({ success: false, reason: 'no_match' });
  }
  return true;
}

function handleWriteFields(fields, sendResponse) {
  const snapshot = collectOriginalValues(fields);
  let filled = 0;
  let total = 0;

  fields.forEach(f => {
    if (f.suggested_value === null || f.suggested_value === undefined) return;
    total++;
    const success = fillField(f.element_id || f.id, f.suggested_value);
    if (success) filled++;
  });

  undoSnapshot = snapshot;

  showToast(`Filled ${filled} of ${total} fields`, () => {
    restoreOriginalValues(undoSnapshot);
    undoSnapshot = [];
    removeToast();
    showToast('Undo complete', null, 2000);
  });

  sendResponse({ success: true, filled, total });
}

function scanDeep(sendResponse) {
  const fields = scanAllFields();
  sendResponse({ fields });
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .cv-autofill-highlighted {
      outline: 2px solid #f59e0b !important;
      outline-offset: 2px !important;
      transition: outline 0.3s ease;
    }
    .cv-autofill-done {
      outline: 2px solid #10b981 !important;
    }
    #${TOAST_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #1a1a2e;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      gap: 12px;
      animation: cvToastIn 0.3s ease;
    }
    #${TOAST_ID} .cv-toast__btn {
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    #${TOAST_ID} .cv-toast__btn:hover {
      background: #4338ca;
    }
    @keyframes cvToastIn {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

function showToast(message, undoCallback, duration = 5000) {
  removeToast();
  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.innerHTML = `<span>${message}</span>`;
  if (undoCallback) {
    const btn = document.createElement('button');
    btn.className = 'cv-toast__btn';
    btn.textContent = 'Undo';
    btn.addEventListener('click', undoCallback);
    toast.appendChild(btn);
  }
  document.body.appendChild(toast);
  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
}

function removeToast() {
  const existing = document.getElementById(TOAST_ID);
  if (existing) existing.remove();
}
