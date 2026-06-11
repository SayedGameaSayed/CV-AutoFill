import { getApiKey, parseCVViaClaude, matchFieldsViaClaude } from './utils/claudeClient.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'PARSE_CV':
      handleParseCV(message, sendResponse);
      return true;
    case 'MATCH_FIELDS':
      handleMatchFields(message, sendResponse);
      return true;
    case 'GET_CV_STATUS':
      handleGetCVStatus(sendResponse);
      return true;
    case 'CLEAR_CV':
      handleClearCV(sendResponse);
      return true;
    case 'SCAN_FIELDS':
      handleScanFields(message.tabId, sendResponse);
      return true;
    case 'WRITE_FIELDS':
      handleWriteFields(message.tabId, message.fields, sendResponse);
      return true;
    case 'AUTOFILL':
      handleAutoFill(message.tabId, sendResponse);
      return true;
    case 'FORMS_DETECTED':
      handleFormsDetected(sender.tab?.id);
      break;
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'autofill') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) handleAutoFill(tab.id, () => {});
    });
  }
});

async function handleScanFields(tabId, sendResponse) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        if (typeof scanFormFields === 'function') {
          return scanFormFields();
        }
        return [];
      }
    });

    const allFields = [];
    for (const r of results) {
      if (r.result && r.result.length > 0) {
        allFields.push(...r.result.map(f => ({
          ...f,
          frameId: r.frameId
        })));
      }
    }
    sendResponse({ success: true, fields: allFields });
  } catch (err) {
    try {
      const result = await chrome.tabs.sendMessage(tabId, { type: 'SCAN_FIELDS' });
      sendResponse({ success: true, fields: result?.fields?.map(f => ({ ...f, frameId: 0 })) || [] });
    } catch (e) {
      sendResponse({ success: false, fields: [], error: e.message });
    }
  }
}

async function handleWriteFields(tabId, fields, sendResponse) {
  if (typeof fields !== 'object') {
    sendResponse({ success: false, error: 'invalid fields' });
    return;
  }

  const fieldsArray = Array.isArray(fields) ? fields : [fields];

  try {
    const byFrame = {};
    for (const f of fieldsArray) {
      const fid = f.frameId ?? 0;
      if (!byFrame[fid]) byFrame[fid] = [];
      byFrame[fid].push(f);
    }

    let totalFilled = 0;
    let total = 0;

    for (const [frameId, frameFields] of Object.entries(byFrame)) {
      const result = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [parseInt(frameId)] },
        func: (ff) => {
          if (typeof fillField !== 'function') return { filled: 0, total: ff.length };
          let filled = 0;
          ff.forEach(f => {
            if (f.suggested_value === null || f.suggested_value === undefined) return;
            const success = fillField(f.element_id || f.id, f.suggested_value);
            if (success) filled++;
          });
          if (typeof showToast === 'function') {
            showToast(`Filled ${filled} of ${ff.length} fields`, null, 3000);
          }
          return { filled, total: ff.length };
        },
        args: [frameFields]
      });
      if (result?.[0]?.result) {
        totalFilled += result[0].result.filled;
        total += result[0].result.total;
      }
    }

    sendResponse({ success: true, filled: totalFilled, total });
  } catch (err) {
    try {
      const result = await chrome.tabs.sendMessage(tabId, { type: 'WRITE_FIELDS', fields: fieldsArray });
      sendResponse(result || { success: false, error: 'no response' });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  }
}

async function handleAutoFill(tabId, sendResponse) {
  try {
    const { cvData } = await chrome.storage.local.get('cvData');
    if (!cvData) {
      sendResponse({ success: false, reason: 'no_cv' });
      return;
    }
    const scanResult = await handleScanFieldsInternal(tabId);
    if (!scanResult.fields || scanResult.fields.length === 0) {
      sendResponse({ success: false, reason: 'no_fields' });
      return;
    }
    const apiKey = await getApiKey();
    const matchResult = await matchFieldsViaClaude(cvData.parsed, cvData.raw_text, scanResult.fields, apiKey);
    if (matchResult && matchResult.length > 0) {
      await handleWriteFields(tabId, matchResult, () => {});
      sendResponse({ success: true, count: matchResult.length });
    } else {
      sendResponse({ success: false, reason: 'no_match' });
    }
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleScanFieldsInternal(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => typeof scanFormFields === 'function' ? scanFormFields() : []
    });
    const allFields = [];
    for (const r of results) {
      if (r.result && r.result.length > 0) {
        allFields.push(...r.result.map(f => ({ ...f, frameId: r.frameId })));
      }
    }
    return { fields: allFields };
  } catch (e) {
    try {
      const result = await chrome.tabs.sendMessage(tabId, { type: 'SCAN_FIELDS' });
      return { fields: result?.fields?.map(f => ({ ...f, frameId: 0 })) || [] };
    } catch (e2) {
      return { fields: [] };
    }
  }
}

async function handleParseCV(message, sendResponse) {
  try {
    const apiKey = await getApiKey();
    const parsed = await parseCVViaClaude(message.rawText, apiKey);
    const cvData = { parsed, raw_text: message.rawText, uploaded_at: new Date().toISOString() };
    await chrome.storage.local.set({ cvData });
    sendResponse({ success: true, cvData });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleMatchFields(message, sendResponse) {
  try {
    const apiKey = await getApiKey();
    const result = await matchFieldsViaClaude(message.parsedCV, message.rawText, message.unmatchedFields, apiKey);
    sendResponse({ success: true, matches: result });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleGetCVStatus(sendResponse) {
  const result = await chrome.storage.local.get('cvData');
  if (result.cvData) {
    sendResponse({ success: true, hasCV: true, uploadedAt: result.cvData.uploaded_at });
  } else {
    sendResponse({ success: true, hasCV: false });
  }
}

async function handleClearCV(sendResponse) {
  await chrome.storage.local.remove('cvData');
  sendResponse({ success: true });
}

function handleFormsDetected(tabId) {
  if (tabId) {
    chrome.action.setBadgeText({ text: '!', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId });
    }, 10000);
  }
}
