const GEMINI_MODEL = 'gemini-pro';
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;

async function getApiKey() {
  const result = await chrome.storage.local.get('apiKey');
  if (!result.apiKey) throw new Error('API_KEY_MISSING');
  return result.apiKey;
}

async function geminiRequest(systemPrompt, userMessage, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: 8192, temperature: 0.1 }
      })
    });
    if (response.ok) {
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    }
    if (response.status === 403 || response.status === 400) throw new Error('API_KEY_INVALID');
    if (response.status === 429) {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
        continue;
      }
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`API_ERROR: ${response.status}`);
  }
}

const PARSE_SYSTEM_PROMPT = `You are a structured CV data extractor. Extract all information from the provided CV text.
Return ONLY a valid JSON object. No markdown fences. No explanation. No preamble.

The JSON must match this exact schema:
{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "location": "string (city only)",
  "linkedin": "string or null",
  "github": "string or null",
  "website": "string or null",
  "summary": "string or null",
  "experience": [
    { "title": "string", "company": "string", "start": "string (e.g. 2023)", "end": "string (e.g. Present or 2024)", "description": "string" }
  ],
  "education": [
    { "degree": "string", "institution": "string", "gpa": "string or null", "graduation": "string" }
  ],
  "skills": ["string"],
  "languages": ["string (with level, e.g. Arabic - Native)"],
  "certifications": ["string"],
  "projects": [
    { "name": "string", "description": "string", "tech": ["string"] }
  ]
}

If a field is not found in the CV, use null for optional fields or empty array [] for arrays.`;

async function parseCVViaClaude(rawText, apiKey) {
  const text = await geminiRequest(PARSE_SYSTEM_PROMPT, rawText, apiKey);
  return JSON.parse(text);
}

const MATCH_SYSTEM_PROMPT = `You are an expert job application assistant. You will receive:
1. A candidate's structured CV data
2. A list of form fields from a job application form

Your job is to determine the best value for each field based on the CV data.

Instructions:
- Match fields intelligently using label context, not just exact string matching
- "First name" and "الاسم الأول" and "Vorname" all need the same data
- For open-ended questions (motivation, cover letter, why this company): write
  a 2-3 sentence professional answer using the candidate's actual experience
- For "Expected salary": respond with "Negotiable" unless CV specifies
- For "Notice period": respond with "Immediately" or "2 weeks" based on context
- For skill-rating sliders (1-5 or 1-10): estimate from CV evidence
- If genuinely unknown, set suggested_value to null and explain in reasoning

Return ONLY a valid JSON array. No markdown. No explanation outside JSON.
Each item: { "id": "field_id", "suggested_value": "string or null", "confidence": 0.0-1.0, "reasoning": "brief explanation" }`;

async function matchFieldsViaClaude(parsedCV, rawText, unmatchedFields, apiKey) {
  const userMessage = `CV Data:\n${JSON.stringify({ parsed: parsedCV, raw_text: rawText }, null, 2)}\n\nForm Fields:\n${JSON.stringify(unmatchedFields, null, 2)}`;
  const text = await geminiRequest(MATCH_SYSTEM_PROMPT, userMessage, apiKey);
  return JSON.parse(text);
}
