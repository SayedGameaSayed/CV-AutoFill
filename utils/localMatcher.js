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

function matchFieldsLocally(fields, parsedCV) {
  const results = [];
  const unmatched = [];

  fields.forEach(field => {
    const label = field.label.toLowerCase().trim();
    let matched = false;

    for (const pattern of LABEL_PATTERNS) {
      if (pattern.keys.some(k => label.includes(k))) {
        let value = getNestedValue(parsedCV, pattern.src);
        if (pattern.transform) value = pattern.transform(value);
        if (value) {
          results.push({
            id: field.id,
            suggested_value: value,
            confidence: 0.95,
            reasoning: `Matched via ${pattern.src}`
          });
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      unmatched.push(field);
    }
  });

  return { matched: results, unmatched };
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key] ?? null, obj);
}
