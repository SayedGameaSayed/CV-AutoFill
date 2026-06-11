import { matchFieldsLocally } from '../utils/localMatcher.js';

const fieldList = document.getElementById('fieldList');
const stateLoading = document.getElementById('stateLoading');
const stateEmpty = document.getElementById('stateEmpty');
const stateNoCV = document.getElementById('stateNoCV');
const footer = document.getElementById('footer');
const selectedCount = document.getElementById('selectedCount');
const fillAllBtn = document.getElementById('fillAllBtn');
const fillSelectedBtn = document.getElementById('fillSelectedBtn');

let fields = [];

async function init() {
  const status = await chrome.runtime.sendMessage({ type: 'GET_CV_STATUS' });
  if (!status.hasCV) {
    showState(stateNoCV);
    return;
  }
  const result = await chrome.storage.local.get('cvData');
  if (!result.cvData) {
    showState(stateNoCV);
    return;
  }
  await scanAndMatch(result.cvData);
}

async function scanAndMatch(cvData) {
  showState(stateLoading);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const scanResult = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FIELDS' });
    if (!scanResult || !scanResult.fields || scanResult.fields.length === 0) {
      showState(stateEmpty);
      return;
    }

    // Local matching first
    const { matched: localMatches, unmatched } = matchFieldsLocally(scanResult.fields, cvData.parsed);

    // AI matching for unmatched fields
    let aiMatches = [];
    if (unmatched.length > 0) {
      const matchResult = await chrome.runtime.sendMessage({
        type: 'MATCH_FIELDS',
        parsedCV: cvData.parsed,
        rawText: cvData.raw_text,
        unmatchedFields: unmatched
      });
      if (matchResult.success) {
        aiMatches = matchResult.matches.map(m => ({
          ...m,
          element_id: scanResult.fields.find(f => f.id === m.id)?.element_id || m.id
        }));
      }
    }

    const allMatches = [...localMatches, ...aiMatches];
    if (allMatches.length === 0) {
      showState(stateEmpty);
      return;
    }

    fields = allMatches.map(m => ({
      ...m,
      label: scanResult.fields.find(f => f.id === m.id)?.label || 'Unknown',
      skipped: false
    }));
    renderFields();
  } catch (err) {
    showState(stateEmpty);
  }
}

function renderFields() {
  fieldList.innerHTML = '';
  fields.forEach((f, i) => {
    const card = document.createElement('div');
    card.className = 'sidebar__field';
    const confClass = f.confidence >= 0.8 ? 'high' : f.confidence >= 0.5 ? 'medium' : 'low';
    card.innerHTML = `
      <div class="sidebar__field-label">${escapeHtml(f.label)}</div>
      <div class="sidebar__field-row">
        <input type="checkbox" class="sidebar__toggle" checked data-index="${i}" />
        <input type="text" class="sidebar__field-input" value="${escapeHtml(f.suggested_value || '')}" data-index="${i}" />
        <span class="sidebar__confidence sidebar__confidence--${confClass}" title="Confidence: ${(f.confidence * 100).toFixed(0)}%"></span>
      </div>
      ${f.reasoning ? `<div class="sidebar__reasoning">${escapeHtml(f.reasoning)}</div>` : ''}
    `;
    const checkbox = card.querySelector('.sidebar__toggle');
    const input = card.querySelector('.sidebar__field-input');
    checkbox.addEventListener('change', updateCount);
    input.addEventListener('input', (e) => { fields[i].suggested_value = e.target.value; });
    fieldList.appendChild(card);
  });
  fieldList.style.display = 'block';
  footer.style.display = 'flex';
  updateCount();
}

function updateCount() {
  const checked = document.querySelectorAll('.sidebar__toggle:checked').length;
  selectedCount.textContent = `${checked} fields selected`;
}

fillAllBtn.addEventListener('click', () => fillSelected(true));
fillSelectedBtn.addEventListener('click', () => fillSelected(false));

async function fillSelected(all) {
  const toFill = fields.filter((f, i) => {
    const checkbox = document.querySelector(`.sidebar__toggle[data-index="${i}"]`);
    return checkbox && (all || checkbox.checked) && f.suggested_value;
  });
  if (toFill.length === 0) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { type: 'WRITE_FIELDS', fields: toFill });
    window.close();
  } catch (err) {
    console.error('Fill failed:', err);
  }
}

function showState(el) {
  [stateLoading, stateEmpty, stateNoCV, fieldList, footer].forEach(e => e.style.display = 'none');
  el.style.display = 'block';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
