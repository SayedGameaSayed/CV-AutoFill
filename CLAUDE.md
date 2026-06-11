# CV AutoFill — Chrome Extension

Fill job application forms from your CV using AI.

## Key Architecture

- **Manifest V3** — Service Worker background, no DOM access in background
- **PDF parsing** — Done in popup context (pdf.js from CDN), not service worker
- **Message routing** — Popup/Sidebar talk directly to content script via `chrome.tabs.sendMessage`
- **Background** — Only handles Claude API calls + `chrome.storage.local` management
- **Hybrid matching** — Client-side regex/keyword matcher for simple fields (name, email, phone); Claude API for ambiguous ones (cover letters, etc.)
- **Undo** — Undo All via snapshot before fill
- **No bundler** — Pure Vanilla JS, files loaded individually

## File Structure
```
cv-autofill/
├── manifest.json
├── background.js           # Claude API + storage
├── content.js              # Scan, fill, toast, undo
├── popup/                  # PDF upload + fill trigger
├── sidebar/                # Preview + edit before fill
├── options/                # API key + settings
└── utils/
    ├── pdfParser.js        # PDF → text (popup context)
    ├── formScanner.js      # DOM → FormField[] (content script)
    ├── localMatcher.js     # Client-side matching
    ├── claudeClient.js     # Claude API wrapper (background)
    └── fillEngine.js       # DOM value writer (content script)
```

## Build & Load
1. No build step — pure Vanilla JS
2. Load unpacked in `chrome://extensions` with Developer mode
3. Debug: `chrome.storage.local.get(null, console.log)`
