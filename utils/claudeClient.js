const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;

async function getApiKey() {
  const result = await chrome.storage.local.get('apiKey');
  if (!result.apiKey) throw new Error('API_KEY_MISSING');
  return result.apiKey;
}

async function claudeRequest(systemPrompt, userMessage, apiKey) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    if (response.ok) {
      const data = await response.json();
      return data.content[0].text;
    }
    if (response.status === 401) throw new Error('API_KEY_INVALID');
    if (response.status === 429 || response.status === 529) {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
        continue;
      }
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`CLAUDE_ERROR: ${response.status}`);
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
  const text = await claudeRequest(PARSE_SYSTEM_PROMPT, rawText, apiKey);
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
  const text = await claudeRequest(MATCH_SYSTEM_PROMPT, userMessage, apiKey);
  return JSON.parse(text);
}
