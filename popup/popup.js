import { parsePDF } from '../utils/pdfParser.js';
import { matchFieldsLocally } from '../utils/localMatcher.js';

const SHOW = 'block';
const HIDE = 'none';

const $ = id => document.getElementById(id);
const state = {
  upload: $('stateUpload'),
  ready: $('stateReady'),
  formDetected: $('stateFormDetected'),
  loading: $('stateLoading'),
  error: $('stateError')
};

const statusBadge = $('statusBadge');
const fileInput = $('fileInput');
const dropZone = $('dropZone');
const reuploadBtn = $('reuploadBtn');
const fillBtn = $('fillBtn');
const previewBtn = $('previewBtn');
const errorRetryBtn = $('errorRetryBtn');
const loadingText = $('loadingText');
const errorText = $('errorText');
const cvFileName = $('cvFileName');
const cvUploadDate = $('cvUploadDate');
const fieldCount = $('fieldCount');

let cvData = null;
let scannedFields = [];

function showOnly(...elements) {
  Object.values(state).forEach(el => el.style.display = HIDE);
  elements.forEach(el => el.style.display = SHOW);
}

function setBadge(text, type) {
  statusBadge.textContent = text;
  statusBadge.className = 'popup__badge popup__badge--visible' + (type ? ` popup__badge--${type}` : '');
}

function setLoading(text) {
  loadingText.textContent = text;
  showOnly(state.loading);
}

// --- Drag & drop ---
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('popup__dropzone--dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('popup__dropzone--dragover'));
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('popup__dropzone--dragover'); handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

async function handleFile(file) {
  if (!file || file.type !== 'application/pdf') {
    showError('Please select a valid PDF file.');
    return;
  }
  setLoading('Parsing PDF...');
  try {
    const rawText = await parsePDF(file);
    setLoading('Analyzing with AI...');
    const response = await chrome.runtime.sendMessage({ type: 'PARSE_CV', rawText });
    if (!response.success) throw new Error(response.error);
    cvData = response.cvData;
    await checkStatus();
  } catch (err) {
    showError(getFriendlyError(err.message));
  }
}

reuploadBtn.addEventListener('click', () => showOnly(state.upload));

function openManualForm() {
  chrome.tabs.create({ url: chrome.runtime.getURL('form/form.html') });
}

document.getElementById('editCvBtn').addEventListener('click', openManualForm);
document.getElementById('manualBtn').addEventListener('click', openManualForm);

fillBtn.addEventListener('click', handleFill);

previewBtn.addEventListener('click', async () => {
  await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
  window.close();
});

errorRetryBtn.addEventListener('click', checkStatus);

document.getElementById('settingsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// --- Fill logic ---

// --- Fill logic ---
async function handleFill() {
  if (!cvData) return;
  setLoading('Scanning form fields...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const scanResult = await chrome.runtime.sendMessage({ type: 'SCAN_FIELDS', tabId: tab.id });
    if (!scanResult || !scanResult.fields || scanResult.fields.length === 0) {
      showError('No fillable fields found on this page.');
      return;
    }
    scannedFields = scanResult.fields;
    setLoading('Matching fields...');
    const { matched: localMatches, unmatched } = matchFieldsLocally(scannedFields, cvData.parsed);
    let allMatches = localMatches;
    if (unmatched.length > 0) {
      setLoading(`AI-matching ${unmatched.length} fields...`);
      const matchResult = await chrome.runtime.sendMessage({
        type: 'MATCH_FIELDS',
        parsedCV: cvData.parsed,
        rawText: cvData.raw_text,
        unmatchedFields: unmatched
      });
      if (!matchResult.success) {
        if (matchResult.error === 'API_KEY_MISSING' || matchResult.error === 'API_KEY_INVALID') {
          showError('API key issue. Check Options.');
          return;
        }
      } else {
        const enriched = matchResult.matches.map(m => {
          const orig = scannedFields.find(f => f.id === m.id);
          return { ...m, element_id: orig?.element_id || m.id, frameId: orig?.frameId };
        });
        allMatches = [...localMatches, ...enriched];
      }
    }
    const filledCount = allMatches.filter(f => f.suggested_value !== null).length;
    await chrome.runtime.sendMessage({ type: 'WRITE_FIELDS', tabId: tab.id, fields: allMatches });
    await logFillSession(tab.url, scannedFields.length, filledCount);
    window.close();
  } catch (err) {
    showError(getFriendlyError(err.message));
  }
}

async function logFillSession(url, total, filled) {
  const result = await chrome.storage.local.get('fillHistory');
  const history = result.fillHistory || [];
  history.unshift({ domain: new URL(url).hostname, url, timestamp: new Date().toISOString(), fields_total: total, fields_filled: filled });
  if (history.length > 50) history.length = 50;
  await chrome.storage.local.set({ fillHistory: history });
}

// --- Status check ---
async function checkStatus() {
  const statusResult = await chrome.runtime.sendMessage({ type: 'GET_CV_STATUS' });
  if (statusResult.hasCV && cvData) {
    const date = new Date(cvData.uploaded_at).toLocaleDateString();
    cvFileName.textContent = 'CV Ready';
    cvUploadDate.textContent = `Uploaded ${date}`;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const scanResult = await chrome.runtime.sendMessage({ type: 'SCAN_FIELDS', tabId: tab.id });
      if (scanResult && scanResult.fields && scanResult.fields.length > 0) {
        scannedFields = scanResult.fields;
        fieldCount.textContent = `${scanResult.fields.length} fields detected on this page`;
        setBadge('CV Ready', 'success');
        showOnly(state.formDetected);
      } else {
        setBadge('CV Ready', 'success');
        showOnly(state.ready);
      }
    } catch {
      setBadge('CV Ready', 'success');
      showOnly(state.ready);
    }
  } else {
    cvData = null;
    showOnly(state.upload);
  }
}

function showError(msg) {
  errorText.textContent = msg;
  showOnly(state.error);
}

function getFriendlyError(code) {
  switch (code) {
    case 'API_KEY_MISSING': return 'API key not set. Go to Options to add your Gemini key.';
    case 'API_KEY_INVALID': return 'Invalid API key. Check your Options.';
    case 'RATE_LIMITED': return 'API rate limited. Please try again.';
    default: return code;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.local.get('cvData');
  if (result.cvData) cvData = result.cvData;
  checkStatus();
});
