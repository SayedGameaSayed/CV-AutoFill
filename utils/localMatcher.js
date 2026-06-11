// ============================================================
// localMatcher.js — Intelligent Field Matcher
// Matches form field labels to CV data with 50+ field types,
// smart value derivation, multi-language synonyms, and
// confidence-scored matching.
// ============================================================

// ---- Normalization ----
function normalizeLabel(label) {
  let s = label.toLowerCase().trim();
  s = s.replace(/\(required\)|\(optional\)|\(optional, but recommended\)/gi, '');
  s = s.replace(/[^a-z0-9\s\-'\/]/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

const ABBREV = {
  yr: 'year', yrs: 'years', exp: 'experience', w/: 'with',
  info: 'information', addl: 'additional', dept: 'department',
  ref: 'reference', refs: 'references', pref: 'preferred',
  addr: 'address', org: 'organization', comp: 'company',
  yrs_of_exp: 'years of experience', yoexp: 'years of experience',
  dob: 'date of birth', reloc: 'relocate', auth: 'authorization',
  avail: 'availability', compen: 'compensation', sal: 'salary',
  curr: 'current', mgr: 'manager', dept: 'department',
  prof: 'professional', lang: 'language', cert: 'certification',
  edu: 'education', inst: 'institution', univ: 'university'
};

function expandAbbrevs(s) {
  return s.split(/\s+/).map(w => ABBREV[w] || w).join(' ');
}

function normalizeAndExpand(label) {
  return expandAbbrevs(normalizeLabel(label));
}

// ---- Field type detection from HTML element ----
function detectFieldType(el) {
  const type = (el.type || 'text').toLowerCase();
  const tag = (el.tagName || '').toLowerCase();
  if (tag === 'select' || type === 'select-one' || type === 'select-multiple') return 'select';
  if (tag === 'textarea' || type === 'textarea') return 'textarea';
  if (type === 'checkbox') return 'checkbox';
  if (type === 'radio') return 'radio';
  if (type === 'email') return 'email';
  if (type === 'tel') return 'tel';
  if (type === 'number') return 'number';
  if (type === 'url') return 'url';
  if (type === 'date' || type === 'datetime-local' || type === 'month') return 'date';
  if (type === 'file') return 'file';
  return 'text';
}

// ---- Value derivation from CV data ----
function deriveAge(dob) {
  if (!dob) return null;
  const m = dob.match(/(\d{4})/);
  if (!m) return null;
  const age = new Date().getFullYear() - parseInt(m[1]);
  return String(age);
}

function deriveExperienceYears(experience) {
  if (!experience || !Array.isArray(experience) || experience.length === 0) return null;
  let totalMonths = 0;
  for (const exp of experience) {
    const start = exp.start ? parseInt(exp.start) : null;
    const end = exp.end && exp.end.toLowerCase() !== 'present' ? parseInt(exp.end) : new Date().getFullYear();
    if (start && end && end >= start) totalMonths += (end - start) * 12;
  }
  if (totalMonths === 0) return null;
  const years = Math.round(totalMonths / 12);
  return String(years);
}

function splitName(fullName) {
  if (!fullName) return { first: null, middle: null, last: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], middle: null, last: null };
  if (parts.length === 2) return { first: parts[0], middle: null, last: parts[1] };
  return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
}

function joinArray(val) {
  if (Array.isArray(val)) return val.join(', ');
  return val;
}

function joinArrayNewlines(val) {
  if (Array.isArray(val)) return val.join('\n');
  return val;
}

function formatDate(val) {
  if (!val) return null;
  const m = val.match(/(\d{4})-?(\d{2})?-?(\d{2})?/);
  if (!m) return val;
  if (m[2] && m[3]) return `${m[1]}-${m[2]}-${m[3]}`;
  if (m[2]) return `${m[1]}-${m[2]}`;
  return m[1];
}

function formatPhone(val) {
  if (!val) return null;
  return val.replace(/[^\d+]/g, '');
}

function yesNo(val) {
  if (!val) return null;
  const v = val.toLowerCase();
  if (['yes', 'y', 'true', '1', 'yeah'].includes(v)) return 'Yes';
  if (['no', 'n', 'false', '0', 'nah'].includes(v)) return 'No';
  return val;
}

// ---- Field type formatters ----
function formatValue(val, fieldType) {
  if (val === null || val === undefined) return null;
  switch (fieldType) {
    case 'tel': return formatPhone(val);
    case 'email': return val.includes('@') ? val : null;
    case 'url': return val.startsWith('http') ? val : `https://${val}`;
    case 'number': return val.replace(/[^0-9.]/g, '');
    case 'date': return formatDate(val);
    case 'checkbox': return yesNo(val);
    case 'radio': return yesNo(val);
    default: return val;
  }
}

// ============================================================
// FIELD DEFINITIONS
// ============================================================
// Each entry: { key, synonyms, patterns, source, transform, type, confidence }
// - key: field identifier
// - synonyms: words/phrases to match in labels
// - patterns: additional HTML attribute patterns (name, id, aria, data-automation)
// - source: path in cvData.parsed (dot notation)
// - transform: function to transform source value
// - type: expected field type for value formatting
// - confidence: base confidence when matched
// ============================================================

const FIELD_DEFS = [
  // ---- NAME FIELDS ----
  {
    key: 'first_name',
    synonyms: ['first name', 'firstname', 'given name', 'forename', 'fname',
      'first', 'first/given name', 'first & given name', 'first and given name',
      'prénom', 'primeiro nome', 'vorname', 'nombre', 'prenom', '名',
      'first name (given name)', 'given name / first name',
      'your first name', 'candidate first name', 'applicant first name'],
    patterns: ['first_name', 'firstName', 'firstname', 'GivenName', 'FirstName',
      'data-automation-id*="firstName"', 'name*="firstname"'],
    source: null,
    transform: (parsed) => splitName(parsed.full_name).first,
    type: 'text',
    confidence: 0.92
  },
  {
    key: 'middle_name',
    synonyms: ['middle name', 'middlename', 'middle initial', 'middle',
      'second name', 'middle name / initial', 'middle initial/name'],
    patterns: ['middle_name', 'middleName', 'middleinitial', 'MiddleName'],
    source: null,
    transform: (parsed) => splitName(parsed.full_name).middle,
    type: 'text',
    confidence: 0.85
  },
  {
    key: 'last_name',
    synonyms: ['last name', 'lastname', 'surname', 'family name', 'lname',
      'second name', 'nom', 'apellido', 'nachname', 'sobrenome', '姓',
      'last name (family name)', 'family name / last name',
      'your last name', 'candidate last name'],
    patterns: ['last_name', 'lastName', 'lastname', 'surname', 'Surname',
      'FamilyName', 'family_name', 'data-automation-id*="lastName"'],
    source: null,
    transform: (parsed) => splitName(parsed.full_name).last,
    type: 'text',
    confidence: 0.92
  },
  {
    key: 'full_name',
    synonyms: ['full name', 'fullname', 'name', 'your name', 'candidate name',
      'applicant name', 'legal name', 'complete name', 'nom complet',
      'nombre completo', 'vollständiger name', 'الاسم الكامل'],
    patterns: ['name', 'full_name', 'fullName', 'Name',
      'data-automation-id*="name"'],
    source: 'full_name',
    type: 'text',
    confidence: 0.95
  },
  {
    key: 'preferred_name',
    synonyms: ['preferred name', 'preferred first name', 'what do you prefer to be called',
      'call me', 'nickname', 'preferred'],
    patterns: ['preferred_name', 'preferredName'],
    source: null,
    transform: (parsed) => splitName(parsed.full_name).first,
    type: 'text',
    confidence: 0.80
  },
  {
    key: 'salutation',
    synonyms: ['salutation', 'title', 'prefix', 'mr/ms/dr', 'name prefix'],
    patterns: ['salutation', 'prefix'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.50
  },
  {
    key: 'suffix',
    synonyms: ['suffix', 'name suffix', 'jr/sr/iii', 'generational suffix'],
    patterns: ['suffix'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.50
  },

  // ---- CONTACT FIELDS ----
  {
    key: 'email',
    synonyms: ['email', 'e-mail', 'email address', 'email id', 'e mail',
      'electronic mail', 'your email', 'applicant email', 'candidate email',
      'email (required)', 'email address (required)', 'primary email',
      'البريد الإلكتروني', 'courriel', 'correo electrónico', 'e-mailアドレス',
      'メールアドレス'],
    patterns: ['email', 'e-mail', 'Email', 'EmailAddress', 'email_address',
      'data-automation-id*="email"', 'type="email"'],
    source: 'email',
    type: 'email',
    confidence: 0.97
  },
  {
    key: 'phone',
    synonyms: ['phone', 'phone number', 'telephone', 'mobile', 'mobile phone',
      'cell phone', 'contact number', 'primary phone', 'your phone number',
      'mobile number', 'phone (required)', 'phone number (required)',
      'tel', 'telefono', 'téléphone', 'telefon', 'رقم الهاتف',
      'telephone number', 'contact phone', 'home phone', 'work phone'],
    patterns: ['phone', 'telephone', 'Phone', 'PhoneNumber', 'phone_number',
      'tel', 'data-automation-id*="phone"', 'type="tel"'],
    source: 'phone',
    type: 'tel',
    confidence: 0.97
  },
  {
    key: 'address',
    synonyms: ['address', 'address line 1', 'address line 1', 'street address',
      'street', 'current address', 'your address', 'mailing address',
      'physical address', 'residential address', 'home address',
      'dirección', 'adresse', 'adresse postale'],
    patterns: ['address', 'addressLine1', 'address_line_1', 'street',
      'data-automation-id*="addressLine1"', 'name*="address"'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.60
  },
  {
    key: 'address_line2',
    synonyms: ['address line 2', 'address 2', 'apt/suite', 'unit',
      'apartment / unit / suite', 'apartment', 'suite'],
    patterns: ['addressLine2', 'address_line_2', 'address2'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.60
  },
  {
    key: 'city',
    synonyms: ['city', 'town', 'municipality', 'your city', 'ciudad', 'ville',
      'stadt', 'المدينة'],
    patterns: ['city', 'City', 'data-automation-id*="city"'],
    source: null,
    transform: (parsed) => parsed.location ? parsed.location.split(',')[0].trim() : null,
    type: 'text',
    confidence: 0.85
  },
  {
    key: 'state',
    synonyms: ['state', 'province', 'state/province', 'region', 'county',
      'prefecture', 'state/region', 'province/territory',
      'estado', 'province', 'bundesland'],
    patterns: ['state', 'province', 'State', 'data-automation-id*="state"'],
    source: null,
    transform: (parsed) => parsed.location && parsed.location.includes(',')
      ? parsed.location.split(',').slice(1).join(',').trim() : null,
    type: 'text',
    confidence: 0.80
  },
  {
    key: 'zip_code',
    synonyms: ['zip code', 'postal code', 'postcode', 'zip/postal code',
      'zip', 'codice postale', 'código postal', 'código de área',
      'código postal'],
    patterns: ['postalCode', 'postal_code', 'zip', 'zip_code', 'ZipCode',
      'data-automation-id*="postalCode"'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.60
  },
  {
    key: 'country',
    synonyms: ['country', 'country/region', 'nation', 'país', 'pays', 'land'],
    patterns: ['country', 'Country', 'data-automation-id*="country"'],
    source: null,
    transform: (parsed) => parsed.nationality || null,
    type: 'text',
    confidence: 0.60
  },
  {
    key: 'location',
    synonyms: ['location', 'current location', 'your location', 'candidate location',
      'city, state', 'ubicación', 'localisation', 'standort',
      'الموقع'],
    patterns: ['location', 'Location', 'data-automation-id*="location"',
      'placeholder*="City, State"'],
    source: 'location',
    type: 'text',
    confidence: 0.90
  },
  {
    key: 'linkedin',
    synonyms: ['linkedin', 'linkedin profile', 'linkedin url', 'profile url',
      'linkedin (url)', 'linkedin / url', 'linkedin link'],
    patterns: ['linkedin', 'LinkedIn', 'urls[LinkedIn]'],
    source: 'linkedin',
    type: 'url',
    confidence: 0.95
  },
  {
    key: 'github',
    synonyms: ['github', 'github url', 'github profile', 'github (url)'],
    patterns: ['github', 'GitHub', 'urls[Github]'],
    source: 'github',
    type: 'url',
    confidence: 0.95
  },
  {
    key: 'website',
    synonyms: ['website', 'portfolio', 'personal website', 'portfolio url',
      'your website', 'web page', 'url', 'personal url', 'website/portfolio',
      'الموقع الشخصي'],
    patterns: ['website', 'portfolio', 'Website', 'urls[Portfolio]', 'urls[Website]'],
    source: 'website',
    type: 'url',
    confidence: 0.90
  },
  {
    key: 'twitter',
    synonyms: ['twitter', 'twitter url', 'x profile', 'twitter / x'],
    patterns: ['twitter', 'Twitter', 'urls[Twitter]', 'x_profile'],
    source: null,
    transform: () => null,
    type: 'url',
    confidence: 0.85
  },
  {
    key: 'pronouns',
    synonyms: ['pronouns', 'preferred pronouns', 'what are your pronouns',
      'gender pronouns', 'pronoun'],
    patterns: ['pronouns', 'Pronouns'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.70
  },

  // ---- PERSONAL INFO ----
  {
    key: 'date_of_birth',
    synonyms: ['date of birth', 'birth date', 'dob', 'birthday', 'birth year',
      'fecha de nacimiento', 'date de naissance', 'geburtsdatum',
      'fecha de nacimiento'],
    patterns: ['dob', 'date_of_birth', 'birthDate', 'birth_date',
      'data-automation-id*="birthDate"'],
    source: 'date_of_birth',
    type: 'date',
    confidence: 0.92
  },
  {
    key: 'age',
    synonyms: ['age', 'years old', 'your age', 'how old are you', 'current age',
      'edad', 'âge', 'alter'],
    patterns: ['age', 'Age'],
    source: null,
    transform: (parsed) => deriveAge(parsed.date_of_birth),
    type: 'number',
    confidence: 0.85
  },
  {
    key: 'nationality',
    synonyms: ['nationality', 'citizenship', 'country of citizenship', 'nation',
      'nationalité', 'nacionalidad', 'staatsangehörigkeit'],
    patterns: ['citizenship', 'nationality', 'Nationality'],
    source: 'nationality',
    type: 'text',
    confidence: 0.90
  },
  {
    key: 'work_authorization',
    synonyms: ['work authorization', 'right to work', 'eligibility to work',
      'are you legally authorized to work', 'do you have the right to work',
      'employment eligibility', 'work permit', 'authorization to work',
      'legally authorized', 'eligible to work', 'work status',
      'autorisation de travail', 'permiso de trabajo'],
    patterns: ['work_authorization', 'authorized', 'right_to_work',
      'work_auth', 'eligibility'],
    source: 'work_authorization',
    type: 'select',
    confidence: 0.92
  },
  {
    key: 'sponsorship',
    synonyms: ['will you now or in the future require sponsorship',
      'visa sponsorship', 'sponsorship required', 'do you require sponsorship',
      'do you need employment sponsorship', 'require sponsorship',
      'sponsorship', 'visa sponsorship required', 'need sponsorship',
      'do you now or will you in the future require sponsorship',
      'do you now or in the future require sponsorship for employment'],
    patterns: ['sponsor', 'visa', 'sponsorship'],
    source: 'work_authorization',
    transform: (parsed) => {
      const wa = (parsed.work_authorization || '').toLowerCase();
      if (wa.includes('sponsor') || wa === 'not authorized') return 'Yes';
      if (['us citizen', 'permanent resident', 'green card', 'us person'].some(s => wa.includes(s))) return 'No';
      return null;
    },
    type: 'radio',
    confidence: 0.88
  },
  {
    key: 'visa_type',
    synonyms: ['visa type', 'current visa', 'what is your current visa status',
      'immigration status', 'visa status', 'current visa status'],
    patterns: ['visa_type', 'visaType', 'current_visa'],
    source: 'work_authorization',
    type: 'select',
    confidence: 0.85
  },
  {
    key: 'gender',
    synonyms: ['gender', 'sex', 'gender identity', 'género', 'sexe',
      'geschlecht'],
    patterns: ['gender', 'Gender', 'sex'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.70
  },
  {
    key: 'race_ethnicity',
    synonyms: ['race', 'ethnicity', 'race/ethnicity', 'please identify your race',
      'ethnic group', 'raza', 'origen étnico'],
    patterns: ['race', 'ethnicity', 'Race'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.60
  },
  {
    key: 'veteran_status',
    synonyms: ['veteran status', 'protected veteran', 'are you a protected veteran',
      'veteran', 'military service', 'armed forces service', 'veteran/military'],
    patterns: ['veteran', 'Veteran'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.60
  },
  {
    key: 'disability_status',
    synonyms: ['disability status', 'disability', 'do you have a disability',
      'disability inclusion'],
    patterns: ['disability', 'Disability'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.60
  },

  // ---- PROFESSIONAL ----
  {
    key: 'current_title',
    synonyms: ['current title', 'current job title', 'most recent title',
      'current position', 'current role', 'current job', 'job title',
      'position title', 'title', 'most recent job title', 'role title',
      'puesto actual', 'cargo actual', 'poste actuel'],
    patterns: ['currentTitle', 'current_title', 'currentJobTitle',
      'data-automation-id*="currentJobTitle"'],
    source: 'current_title',
    type: 'text',
    confidence: 0.90
  },
  {
    key: 'current_company',
    synonyms: ['current company', 'current employer', 'company', 'organization',
      'current org', 'employer', 'current organization', 'company name',
      'empresa actual', 'employeur actuel', 'aktuelles unternehmen'],
    patterns: ['currentCompany', 'current_company', 'org', 'employer',
      'data-automation-id*="currentOrg"'],
    source: 'current_company',
    type: 'text',
    confidence: 0.90
  },
  {
    key: 'years_of_experience',
    synonyms: ['years of experience', 'years of relevant experience',
      'total years of experience', 'experience level', 'how many years of experience',
      'years experience', 'relevant experience', 'professional experience',
      'years of professional experience', 'total experience',
      'años de experiencia', 'années d\'expérience', 'berufserfahrung'],
    patterns: ['yearsExperience', 'years_of_experience', 'exp_years',
      'data-automation-id*="yearsExperience"'],
    source: null,
    transform: (parsed) => {
      if (parsed.years_of_experience) return parsed.years_of_experience;
      return deriveExperienceYears(parsed.experience);
    },
    type: 'number',
    confidence: 0.85
  },
  {
    key: 'industry',
    synonyms: ['industry', 'industry experience', 'sector', 'field'],
    patterns: ['industry', 'Industry'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.50
  },
  {
    key: 'job_level',
    synonyms: ['job level', 'level', 'employment level', 'career level',
      'position level'],
    patterns: ['jobLevel', 'career_level'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.50
  },

  // ---- EXPERIENCE SECTION (repeated blocks) ----
  {
    key: 'exp_company',
    synonyms: ['company', 'employer', 'organization name', 'company name',
      'empresa', 'entreprise', 'unternehmen'],
    patterns: ['company', 'employer', 'OrganizationName'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.80
  },
  {
    key: 'exp_title',
    synonyms: ['title', 'job title', 'position', 'role title', 'position held',
      'cargo', 'poste', 'titel', 'puesto'],
    patterns: ['title', 'JobTitle'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.80
  },
  {
    key: 'exp_start',
    synonyms: ['start date', 'from', 'start', 'date started', 'begin',
      'fecha de inicio', 'date de début', 'startdatum'],
    patterns: ['startDate', 'start_date', 'StartDate'],
    source: null,
    transform: () => null,
    type: 'date',
    confidence: 0.80
  },
  {
    key: 'exp_end',
    synonyms: ['end date', 'to', 'end', 'date ended', 'end (or expected end)',
      'finish date', 'fecha de fin', 'date de fin', 'enddatum'],
    patterns: ['endDate', 'end_date', 'EndDate'],
    source: null,
    transform: () => null,
    type: 'date',
    confidence: 0.80
  },
  {
    key: 'exp_current',
    synonyms: ['i currently work here', 'current position', 'currently employed here',
      'present', 'i currently work', 'currently work here'],
    patterns: ['current_position', 'currently_employed'],
    source: null,
    transform: () => null,
    type: 'checkbox',
    confidence: 0.70
  },
  {
    key: 'exp_description',
    synonyms: ['description', 'job description', 'responsibilities', 'role description',
      'summary', 'work summary', 'key responsibilities', 'duties',
      'descripción', 'descripción del puesto', 'aufgaben'],
    patterns: ['description', 'Description', 'responsibilities'],
    source: null,
    transform: () => null,
    type: 'textarea',
    confidence: 0.70
  },

  // ---- EMPLOYMENT DETAILS ----
  {
    key: 'employment_type',
    synonyms: ['employment type', 'job type', 'type of employment',
      'full-time/part-time', 'position type',
      'full time / part time / contract / temporary / internship'],
    patterns: ['employmentType', 'employment_type', 'job_type'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.65
  },
  {
    key: 'work_schedule',
    synonyms: ['work schedule', 'work shift', 'shift preference', 'shift',
      'schedule preference', 'hours per week'],
    patterns: ['workSchedule', 'shift_preference'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.60
  },
  {
    key: 'remote_preference',
    synonyms: ['remote preference', 'work location preference', 'remote/on-site/hybrid',
      'work arrangement', 'remote eligible', 'on-site / remote / hybrid',
      'preferred work location', 'work model'],
    patterns: ['remote_preference', 'work_location', 'workArrangement'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.60
  },
  {
    key: 'willing_relocate',
    synonyms: ['willing to relocate', 'open to relocation', 'relocation',
      'willing to relocate?', 'are you willing to relocate'],
    patterns: ['relocate', 'relocation'],
    source: null,
    transform: () => null,
    type: 'radio',
    confidence: 0.70
  },
  {
    key: 'willing_travel',
    synonyms: ['willing to travel', 'travel availability', 'travel required',
      'are you willing to travel', 'travel percentage'],
    patterns: ['travel', 'willing_travel'],
    source: null,
    transform: () => null,
    type: 'radio',
    confidence: 0.65
  },

  // ---- COMPENSATION ----
  {
    key: 'desired_salary',
    synonyms: ['desired salary', 'salary expectation', 'expected salary',
      'salary requirements', 'desired compensation', 'what are your salary expectations',
      'expected compensation', 'desired pay', 'salary range',
      'salary expected', 'salary desired', 'compensation expectation',
      'salario deseado', 'prétention salariale', 'gehaltsvorstellung'],
    patterns: ['salary', 'desiredSalary', 'expected_salary', 'salaryExpectation',
      'data-automation-id*="salary"'],
    source: 'desired_salary',
    type: 'text',
    confidence: 0.92
  },
  {
    key: 'current_salary',
    synonyms: ['current salary', 'current compensation', 'current base pay',
      'current pay', 'present salary'],
    patterns: ['current_salary', 'currentSalary', 'CurrentCompensation'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.75
  },
  {
    key: 'salary_currency',
    synonyms: ['currency', 'salary currency'],
    patterns: ['currency', 'Currency'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.55
  },

  // ---- AVAILABILITY ----
  {
    key: 'notice_period',
    synonyms: ['notice period', 'availability', 'when can you start',
      'available start date', 'start date', 'available from',
      'availability to start', 'how much notice', 'start availability',
      'preavis', 'préavis', 'kündigungsfrist'],
    patterns: ['notice_period', 'start_date', 'availability', 'NoticePeriod',
      'data-automation-id*="startDate"'],
    source: 'notice_period',
    type: 'text',
    confidence: 0.92
  },
  {
    key: 'reason_leaving',
    synonyms: ['reason for leaving', 'reason for leaving current role',
      'why are you leaving your current position', 'reason for leaving current position',
      'why leaving', 'reason for change'],
    patterns: ['reason_for_leaving', 'reason_leaving'],
    source: null,
    transform: () => null,
    type: 'textarea',
    confidence: 0.65
  },

  // ---- HOW HEARD ----
  {
    key: 'how_heard',
    synonyms: ['how did you hear about this job', 'how did you hear about us',
      'referral source', 'source', 'where did you find this position',
      'how did you learn about this position', 'how did you find us',
      'how did you hear', 'referral', 'how did you learn about this opening',
      'cómo se enteró', 'comment nous avez-vous connu', 'wie sind sie auf uns aufmerksam geworden'],
    patterns: ['how_did_you_hear', 'referral_source', 'source', 'ReferralSource',
      'data-automation-id*="referral"'],
    source: 'how_heard',
    type: 'select',
    confidence: 0.92
  },
  {
    key: 'referral_name',
    synonyms: ['referred by a current employee', 'referral name', 'who referred you',
      'referred by', 'employee referral name'],
    patterns: ['referral_name', 'referred_by', 'ReferralName'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.70
  },
  {
    key: 'former_employee',
    synonyms: ['previously employed here', 'former employee', 'have you worked here before',
      'have you been employed by this company before', 'previously employed by this company',
      'prior employee', 'have you applied here before'],
    patterns: ['previous_employee', 'former_employee', 'PriorEmployee',
      'data-automation-id*="formerEmployee"'],
    source: null,
    transform: () => null,
    type: 'radio',
    confidence: 0.75
  },

  // ---- EDUCATION ----
  {
    key: 'education_level',
    synonyms: ['highest education', 'education level', 'highest degree',
      'education', 'level of education', 'educational level',
      'nivel de educación', 'niveau d\'éducation', 'bildungsniveau'],
    patterns: ['highestEducation', 'education_level', 'EducationLevel'],
    source: null,
    transform: (parsed) => {
      if (!parsed.education || !Array.isArray(parsed.education) || parsed.education.length === 0) return null;
      const degree = parsed.education[0]?.degree || '';
      if (degree.toLowerCase().includes('phd') || degree.toLowerCase().includes('doctor')) return 'Doctorate';
      if (degree.toLowerCase().includes('master')) return "Master's";
      if (degree.toLowerCase().includes('bachelor') || degree.toLowerCase().includes('bsc') || degree.toLowerCase().includes('ba')) return "Bachelor's";
      if (degree.toLowerCase().includes('associate')) return "Associate's";
      if (degree.toLowerCase().includes('high school') || degree.toLowerCase().includes('diploma')) return 'High School';
      return degree || null;
    },
    type: 'select',
    confidence: 0.75
  },
  {
    key: 'school',
    synonyms: ['school', 'university', 'college', 'institution',
      'college/university', 'educational institution', 'school/university',
      'universidad', 'université', 'hochschule', 'universität',
      'school name', 'university name', 'institution name'],
    patterns: ['school', 'university', 'institution', 'School',
      'data-automation-id*="school"'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.80
  },
  {
    key: 'degree',
    synonyms: ['degree', 'degree type', 'degree/diploma', 'qualification',
      'titulación', 'diplôme', 'abschluss'],
    patterns: ['degree', 'Degree', 'degree_type'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.80
  },
  {
    key: 'field_of_study',
    synonyms: ['field of study', 'major', 'area of study', 'concentration',
      'what is your major', 'discipline', 'specialization', 'study field',
      'campo de estudio', 'domaine d\'études', 'fachrichtung'],
    patterns: ['major', 'field_of_study', 'FieldOfStudy'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.80
  },
  {
    key: 'gpa',
    synonyms: ['gpa', 'grade point average', 'cgpa', 'class rank', 'grade average',
      'promedio', 'note moyenne', 'notendurchschnitt'],
    patterns: ['gpa', 'GPA', 'grade_point_average'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.80
  },
  {
    key: 'graduation_date',
    synonyms: ['graduation date', 'graduation year', 'completion date', 'end date',
      'expected graduation', 'year of graduation', 'end date (or expected)',
      'year graduated', 'fecha de graduación', 'date de fin', 'abschlussdatum'],
    patterns: ['graduation_date', 'graduationDate', 'end_date', 'EndDate',
      'data-automation-id*="educationEndDate"'],
    source: null,
    transform: () => null,
    type: 'date',
    confidence: 0.80
  },
  {
    key: 'currently_enrolled',
    synonyms: ['i am currently enrolled', 'currently attending', 'in progress',
      'currently enrolled', 'currently studying'],
    patterns: ['currently_enrolled', 'currently_attending'],
    source: null,
    transform: () => null,
    type: 'checkbox',
    confidence: 0.65
  },

  // ---- SKILLS ----
  {
    key: 'skills',
    synonyms: ['skills', 'competencies', 'technical skills', 'relevant skills',
      'skill set', 'what skills do you have', 'proficiencies', 'expertise',
      'habilidades', 'compétences', 'fähigkeiten', 'المهارات',
      'tech stack', 'technologies', 'tools', 'technical competencies',
      'what software are you proficient in', 'proficiencies', 'core competencies'],
    patterns: ['skills', 'Skills', 'competencies', 'data-automation-id*="skills"',
      'placeholder*="Search skills"'],
    source: 'skills',
    transform: (v) => Array.isArray(v) ? v.join(', ') : v,
    type: 'text',
    confidence: 0.88
  },

  // ---- LANGUAGES ----
  {
    key: 'languages',
    synonyms: ['languages', 'what languages do you speak', 'language',
      'language proficiency', 'language skills', 'idiomas',
      'langues', 'sprachen', 'اللغات'],
    patterns: ['language', 'languages', 'Languages'],
    source: 'languages',
    transform: (v) => Array.isArray(v) ? v.join(', ') : v,
    type: 'text',
    confidence: 0.88
  },
  {
    key: 'language_level',
    synonyms: ['level', 'proficiency', 'language level', 'proficiency level',
      'nivel', 'niveau', 'niveau'],
    patterns: ['language_level', 'proficiency'],
    source: null,
    transform: () => null,
    type: 'select',
    confidence: 0.60
  },

  // ---- CERTIFICATIONS ----
  {
    key: 'certifications',
    synonyms: ['certifications', 'professional certifications', 'licenses',
      'credentials', 'professional licenses', 'certificates',
      'certificaciones', 'certifications', 'zertifikate', 'الشهادات'],
    patterns: ['certification', 'certifications', 'Certifications',
      'data-automation-id*="certification"'],
    source: 'certifications',
    transform: (v) => Array.isArray(v) ? v.join(', ') : v,
    type: 'text',
    confidence: 0.88
  },
  {
    key: 'certification_authority',
    synonyms: ['certification authority', 'issuing organization', 'issued by'],
    patterns: ['certification_authority', 'issuing_org'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.55
  },
  {
    key: 'certification_date',
    synonyms: ['certification date', 'date obtained', 'issue date', 'date earned'],
    patterns: ['certification_date', 'certDate', 'date_obtained'],
    source: null,
    transform: () => null,
    type: 'date',
    confidence: 0.55
  },

  // ---- SUMMARY / COVER LETTER ----
  {
    key: 'summary',
    synonyms: ['summary', 'professional summary', 'about me', 'profile',
      'candidate summary', 'bio', 'professional profile', 'career summary',
      'resumen', 'sommaire', 'zusammenfassung', 'نبذة'],
    patterns: ['summary', 'Summary', 'professional_summary', 'AboutMe'],
    source: 'summary',
    type: 'textarea',
    confidence: 0.90
  },
  {
    key: 'cover_letter',
    synonyms: ['cover letter', 'cover letter text', 'please include a cover letter',
      'message to hiring manager', 'cover message', 'additional comments',
      'anything else we should know', 'additional information',
      'why do you want to work here', 'why are you interested',
      'carta de presentación', 'lettre de motivation', 'anschreiben'],
    patterns: ['cover_letter', 'coverLetter', 'CoverLetter',
      'messageToHiringManager'],
    source: 'summary',
    type: 'textarea',
    confidence: 0.70
  },

  // ---- PROJECTS ----
  {
    key: 'project_name',
    synonyms: ['project name', 'project title', 'project'],
    patterns: ['project_name', 'projectName'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.70
  },
  {
    key: 'project_description',
    synonyms: ['project description', 'description', 'brief description'],
    patterns: ['project_description'],
    source: null,
    transform: () => null,
    type: 'textarea',
    confidence: 0.65
  },
  {
    key: 'project_tech',
    synonyms: ['technologies used', 'tech stack', 'technologies', 'tools used'],
    patterns: ['project_tech', 'tech_stack'],
    source: null,
    transform: () => null,
    type: 'text',
    confidence: 0.65
  },

  // ---- AGREEMENT / CONSENT ----
  {
    key: 'agree_terms',
    synonyms: ['i agree to the terms and conditions', 'terms of service',
      'i accept the terms', 'i have read and agree', 'i agree to the',
      'i accept', 'agree to terms', 'accept terms', 'terms & conditions',
      'i have read and agree to the privacy policy', 'privacy policy',
      'data processing consent', 'gdpr consent', 'privacy notice',
      'by checking this box you agree', 'create account consent',
      'i consent to the processing of my data'],
    patterns: ['terms', 'agree', 'consent', 'data_compliance', 'gdpr'],
    source: null,
    transform: () => 'Yes',
    type: 'checkbox',
    confidence: 0.80
  },
  {
    key: 'confirm_accuracy',
    synonyms: ['i confirm the information provided is accurate',
      'i certify that', 'i acknowledge', 'data accuracy confirmation',
      'i confirm that the information i have provided is true and accurate',
      'i certify the information provided is true and correct',
      'information is accurate', 'confirm information'],
    patterns: ['confirm', 'certify', 'acknowledge', 'accuracy'],
    source: null,
    transform: () => 'Yes',
    type: 'checkbox',
    confidence: 0.80
  },
  {
    key: 'signature',
    synonyms: ['signature', 'esignature', 'digital signature', 'sign here',
      'type your full name to sign', 'full name (as signature)',
      'electronic signature', 'applicant signature'],
    patterns: ['signature', 'Signature'],
    source: 'full_name',
    type: 'text',
    confidence: 0.85
  },
  {
    key: 'signature_date',
    synonyms: ['date', 'signature date', 'current date', 'today\'s date',
      'date signed', 'application date', 'submission date'],
    patterns: ['signature_date', 'date_signed'],
    source: null,
    transform: () => new Date().toISOString().split('T')[0],
    type: 'date',
    confidence: 0.75
  },

  // ---- MISCELLANEOUS ----
  {
    key: 'resume_upload',
    synonyms: ['resume', 'cv', 'resume/cv', 'upload resume', 'attach resume',
      'attach cv', 'upload cv', 'your resume', 'resume attachment'],
    patterns: ['resume', 'cv', 'Resume', 'data-automation-id*="resume"',
      'accept*=".pdf"'],
    source: null,
    transform: () => null,
    type: 'file',
    confidence: 0.90
  },
  {
    key: 'at_least_18',
    synonyms: ['are you at least 18 years old', 'are you at least 18',
      'are you 18 or older', 'minimum age requirement',
      'do you meet the minimum age requirement', 'at least 18',
      'are you over 18', 'are you 18+', '18 years or older'],
    patterns: ['at_least_18', 'minimum_age', 'age_requirement'],
    source: null,
    transform: (parsed) => {
      const age = deriveAge(parsed.date_of_birth);
      return age && parseInt(age) >= 18 ? 'Yes' : null;
    },
    type: 'radio',
    confidence: 0.85
  },
  {
    key: 'at_least_21',
    synonyms: ['are you at least 21', 'at least 21', '21 years or older'],
    patterns: ['at_least_21'],
    source: null,
    transform: (parsed) => {
      const age = deriveAge(parsed.date_of_birth);
      return age && parseInt(age) >= 21 ? 'Yes' : null;
    },
    type: 'radio',
    confidence: 0.85
  },
  {
    key: 'eeo_consent',
    synonyms: ['eeo consent', 'voluntary self-identification', 'eeo information',
      'equal opportunity', 'self-identification'],
    patterns: ['eeoc', 'eeo', 'compliance', 'demographic'],
    source: null,
    transform: () => null,
    type: 'checkbox',
    confidence: 0.50
  },
  {
    key: 'follow_company',
    synonyms: ['follow company', 'stay updated on future opportunities',
      'subscribe to job alerts', 'receive notifications',
      'keep me posted', 'email me about similar jobs'],
    patterns: ['follow_company', 'job_alerts', 'subscribe'],
    source: null,
    transform: () => null,
    type: 'checkbox',
    confidence: 0.55
  }
];

// ============================================================
// MAIN MATCHING FUNCTION
// ============================================================

function matchFieldsLocally(fields, parsed) {
  const matched = [];
  const unmatched = [];
  const customFields = parsed.custom_fields || [];

  // Pre-derive all values once for efficiency
  const derived = {};
  for (const def of FIELD_DEFS) {
    if (def.source) {
      derived[def.key] = getNestedValue(parsed, def.source);
    } else if (def.transform) {
      derived[def.key] = def.transform(parsed);
    }
  }
  // Direct access for fields with source
  for (const def of FIELD_DEFS) {
    if (def.source && derived[def.key] === undefined) {
      derived[def.key] = getNestedValue(parsed, def.source);
    }
  }

  for (const field of fields) {
    const normalized = normalizeAndExpand(field.label);
    field.fieldType = detectFieldType(field);

    let match = null;

    // Layer 1: Custom fields (user-defined, highest priority)
    for (const cf of customFields) {
      if (cf.question && normalized.includes(normalizeAndExpand(cf.question))) {
        match = {
          id: field.id,
          suggested_value: formatValue(cf.answer, field.fieldType),
          confidence: 0.98,
          reasoning: `Custom: "${cf.question}"`
        };
        break;
      }
    }
    if (match) { matched.push(match); continue; }

    // Layer 2: Exact match on normalized label
    // Layer 3: Contains match on synonyms
    // Layer 4: Word intersection
    let bestScore = 0;
    let bestMatch = null;

    for (const def of FIELD_DEFS) {
      let value = derived[def.key];
      const defValue = def.source ? getNestedValue(parsed, def.source) : null;
      if (value === null || value === undefined) value = defValue;
      if (value === null || value === undefined) continue;

      // Check each synonym
      for (const syn of def.synonyms) {
        const normSyn = normalizeAndExpand(syn);

        // Exact match
        if (normalized === normSyn) {
          const score = Math.min(1, def.confidence + 0.05);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = formatValue(value, def.type);
            bestMatch = applyTransformForReason(def, value, parsed, field);
          }
          break;
        }

        // Contains match
        if (normalized.includes(normSyn) || normSyn.includes(normalized)) {
          const score = def.confidence;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = applyTransformForReason(def, value, parsed, field);
          }
        }

        // Word intersection (at least 2 matching words for multi-word synonyms)
        const synWords = normSyn.split(/\s+/);
        if (synWords.length >= 2) {
          const labelWords = normalized.split(/\s+/);
          const intersection = synWords.filter(w => w.length > 2 && labelWords.includes(w));
          if (intersection.length >= 2) {
            const score = def.confidence * 0.85;
            if (score > bestScore) {
              bestScore = score;
              bestMatch = applyTransformForReason(def, value, parsed, field);
            }
          }
        }
      }

      // Check additional patterns against field name/id/attributes
      const fieldId = (field.id || '').toLowerCase();
      const fieldName = (field.name || '').toLowerCase();
      const fieldPlaceholder = (field.placeholder || '').toLowerCase();
      for (const pat of def.patterns) {
        const normPat = pat.replace(/[*]/g, '').toLowerCase();
        if (fieldId.includes(normPat) || fieldName.includes(normPat) || fieldPlaceholder.includes(normPat)) {
          const score = def.confidence * 0.9;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = applyTransformForReason(def, value, parsed, field);
          }
        }
      }
    }

    if (bestMatch !== null && bestScore >= 0.50) {
      matched.push({
        id: field.id,
        suggested_value: bestMatch,
        confidence: Math.round(bestScore * 100) / 100,
        reasoning: `Matched (${Math.round(bestScore * 100)}% confidence)`
      });
    } else {
      unmatched.push(field);
    }
  }

  return { matched, unmatched };
}

function applyTransformForReason(def, value, parsed, field) {
  if (def.transform) {
    const transformed = def.transform(parsed);
    if (transformed !== null && transformed !== undefined) return transformed;
  }
  if (def.source) {
    const raw = getNestedValue(parsed, def.source);
    if (Array.isArray(raw)) {
      if (field.fieldType === 'textarea') return joinArrayNewlines(raw);
      return joinArray(raw);
    }
    return formatValue(raw, field.fieldType);
  }
  return value;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key] ?? null, obj);
}

export { matchFieldsLocally, normalizeLabel, normalizeAndExpand, detectFieldType };
