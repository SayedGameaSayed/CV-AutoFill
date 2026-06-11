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
  }
});

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

