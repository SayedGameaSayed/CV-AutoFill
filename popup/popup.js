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

// --- Local matcher (inline, mirrors utils/localMatcher.js) ---
const LABEL_PATTERNS = [
  { keys: ['first name', 'firstname', 'given name', 'fname', 'الاسم الأول'], src: 'full_name', transform: v => v?.split(' ')[0] || null },
  { keys: ['last name', 'lastname', 'surname', 'family name', 'lname', 'الاسم الأخير'], src: 'full_name', transform: v => v?.split(' ').slice(1).join(' ') || null },
  { keys: ['email', 'e-mail', 'email address', 'البريد الإلكتروني'], src: 'email' },
  { keys: ['phone', 'telephone', 'mobile', 'phone number', 'tel', 'رقم الهاتف'], src: 'phone' },
  { keys: ['city', 'location', 'town', 'المدينة', 'الموقع'], src: 'location' },
  { keys: ['linkedin', 'linkedin profile'], src: 'linkedin' },
  { keys: ['github', 'github profile'], src: 'github' },
  { keys: ['website', 'portfolio', 'personal website', 'الموقع الشخصي'], src: 'website' },
  { keys: ['summary', 'professional summary', 'about me', 'profile', 'نبذة'], src: 'summary' },
  { keys: ['skills', 'technologies', 'tech stack', 'competencies', 'المهارات'], src: 'skills', transform: v => Array.isArray(v) ? v.join(', ') : v },
  { keys: ['certifications', 'certificates', 'الشهادات'], src: 'certifications', transform: v => Array.isArray(v) ? v.join(', ') : v },
  { keys: ['languages', 'اللغات'], src: 'languages', transform: v => Array.isArray(v) ? v.join(', ') : v },
];

function matchLocally(fields, parsed) {
  const matched = [];
  const unmatched = [];
  fields.forEach(f => {
    const label = f.label.toLowerCase().trim();
    let found = false;
    for (const p of LABEL_PATTERNS) {
      if (p.keys.some(k => label.includes(k))) {
        let val = p.src.split('.').reduce((acc, k) => acc?.[k] ?? null, parsed);
        if (p.transform) val = p.transform(val);
        if (val) {
          matched.push({ id: f.id, suggested_value: val, confidence: 0.95, reasoning: `Local: ${p.src}` });
          found = true;
          break;
        }
    }}
    if (!found) unmatched.push(f);
  });
  return { matched, unmatched };
}

// --- Fill logic ---
async function handleFill() {
  if (!cvData) return;
  setLoading('Scanning form fields...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const scanResult = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FIELDS' });
    if (!scanResult || !scanResult.fields || scanResult.fields.length === 0) {
      showError('No fillable fields found on this page.');
      return;
    }
    scannedFields = scanResult.fields;
    setLoading('Matching fields...');
    const { matched: localMatches, unmatched } = matchLocally(scannedFields, cvData.parsed);
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
        allMatches = [...localMatches, ...matchResult.matches];
      }
    }
    const filledCount = allMatches.filter(f => f.suggested_value !== null).length;
    await chrome.tabs.sendMessage(tab.id, { type: 'WRITE_FIELDS', fields: allMatches });
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
      const scanResult = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FIELDS' });
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
