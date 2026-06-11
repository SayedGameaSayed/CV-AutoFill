const FIELD_TYPE_PATTERNS = {
  first_name: ['first name', 'firstname', 'given name', 'givenname', 'fname', 'first', 'prénom', 'nombre', 'prenom', 'vorname', 'نام', 'الاسم الأول', 'nome', 'nombre de pila'],
  middle_name: ['middle name', 'middlename', 'middle initial', 'mi', 'middle', 'deuxième prénom', 'zweiter vorname', 'الاسم الأوسط', 'segundo nombre'],
  last_name: ['last name', 'lastname', 'surname', 'family name', 'familyname', 'lname', 'nom', 'nachname', 'apellido', 'cognome', 'الاسم الأخير', 'اسم العائلة', 'sobrenome'],
  full_name: ['full name', 'fullname', 'your name', 'name', 'complete name', 'nom complet', 'vollständiger name', 'nombre completo', 'nome completo', 'الاسم الكامل'],
  email: ['email', 'e-mail', 'mail', 'email address', 'emailaddress', 'e mail', 'adresse email', 'adresse e-mail', 'courriel', 'e-mail-adresse', 'correo electrónico', '电子邮件', 'البريد الإلكتروني'],
  phone: ['phone', 'telephone', 'tel', 'phone number', 'phonenumber', 'telephone number', 'mobile', 'cell', 'cell phone', 'contact number', 'téléphone', 'telefon', 'teléfono', 'telefono', 'رقم الهاتف', 'رقم الجوال', '电话号码'],
  address: ['address', 'street', 'street address', 'address line', 'adresse', 'adresse postale', 'adresse', 'anschrift', 'dirección', 'endereço', 'عنوان'],
  city: ['city', 'town', 'municipality', 'ville', 'stadt', 'ciudad', 'cidade', 'مدينة', 'المدينة'],
  state: ['state', 'province', 'region', 'territory', 'prov', 'état', 'bundesland', 'estado', 'provincia', 'منطقة', 'ولاية'],
  zip: ['zip', 'zip code', 'zipcode', 'postal', 'postal code', 'postcode', 'post code', 'code postal', 'plz', 'código postal', 'codice postale', 'código postal', 'الرمز البريدي'],
  country: ['country', 'nation', 'pays', 'land', 'país', 'paese', 'país', 'بلد', 'الدولة'],
  company: ['company', 'employer', 'organization', 'organisation', 'firm', 'business', 'current employer', 'current company', 'compagnie', 'entreprise', 'unternehmen', 'empresa', 'azienda', 'شركة'],
  job_title: ['job title', 'title', 'position', 'current position', 'current job title', 'current title', 'most recent title', 'poste', 'titre', 'stelle', 'título del puesto', 'titolo', 'المسمى الوظيفي', 'المنصب'],
  linkedin: ['linkedin', 'linkedin url', 'linkedin profile', 'linkedin link', 'linkedin.com'],
  github: ['github', 'github url', 'github profile', 'github link', 'github.com'],
  portfolio: ['portfolio', 'website', 'personal website', 'web', 'url', 'site web', 'website url', 'webseite', 'sitio web'],
  education: ['education', 'school', 'university', 'college', 'institution', 'degree', 'diploma', 'qualification', 'formation', 'bildung', 'educación', 'educação', 'التعليم', 'المؤهل'],
  degree: ['degree', 'degree type', 'major', 'field of study', 'study', 'diplôme', 'abschluss', 'título', 'grado', 'الشهادة', 'التخصص'],
  graduation_year: ['graduation year', 'graduation date', 'year of graduation', 'grad year', 'class of', 'année d\'obtention', 'abschlussjahr', 'año de graduación', 'anno di laurea', 'سنة التخرج'],
  skills: ['skills', 'skill', 'skillset', 'competencies', 'compétences', 'fähigkeiten', 'habilidades', 'competenze', 'مهارات', 'المهارات'],
  languages: ['language', 'languages', 'langue', 'langues', 'sprache', 'sprachen', 'idioma', 'idiomas', 'lingua', 'lingue', 'لغة', 'لغات'],
  certifications: ['certification', 'certifications', 'certificate', 'certificates', 'certifié', 'zertifizierung', 'certificación', 'certificazione', 'شهادة', 'شهادات'],
  experience: ['experience', 'work experience', 'work history', 'employment', 'employment history', 'job history', 'professional experience', 'expérience', 'erfahrung', 'experiencia', 'esperienza', 'خبرة', 'الخبرة'],
  years_experience: ['years of experience', 'years experience', 'total experience', 'years of exp', 'yoe', 'professional experience years', 'années d\'expérience', 'berufserfahrung', 'años de experiencia', 'anni di esperienza', 'سنوات الخبرة'],
  date_of_birth: ['date of birth', 'dob', 'birthdate', 'birth date', 'birth day', 'date de naissance', 'geburtsdatum', 'fecha de nacimiento', 'data di nascita', 'تاريخ الميلاد'],
  age: ['age', 'your age', 'how old are you', 'âge', 'alter', 'edad', 'età', 'العمر', 'السن'],
  nationality: ['nationality', 'citizenship', 'citizen of', 'nationalité', 'staatsangehörigkeit', 'nacionalidad', 'nazionalità', 'جنسية', 'الجنسية'],
  work_authorization: ['work authorization', 'work permit', 'visa', 'sponsorship', 'authorization to work', 'right to work', 'eligible to work', 'autorisation de travail', 'arbeitsgenehmigung', 'autorización de trabajo', 'permesso di lavoro', 'تصريح العمل', 'تأشيرة'],
  gender: ['gender', 'sex', 'genre', 'geschlecht', 'género', 'sesso', 'جنس', 'الجنس'],
  ethnicity: ['ethnicity', 'race', 'ethnic', 'origine', 'ethnie', 'volk', 'etnia', 'etnia', 'عرق', 'العرق'],
  veteran: ['veteran', 'military service', 'veteran status', 'disabled veteran', 'ancien combattant', 'veteran', 'veterano', 'veterano', 'محارب قديم', 'عسكري'],
  disability: ['disability', 'disabled', 'handicap', 'handicapé', 'behinderung', 'discapacidad', 'disabilità', 'إعاقة'],
  desired_salary: ['desired salary', 'salary expectation', 'expected salary', 'salary requirement', 'pay expectation', 'salaire souhaité', 'gehaltsvorstellung', 'salario deseado', 'salario desiderato', 'الراتب المطلوب'],
  current_salary: ['current salary', 'current compensation', 'salaire actuel', 'aktuelles gehalt', 'salario actual', 'salario attuale', 'الراتب الحالي'],
  notice_period: ['notice period', 'availability', 'when can you start', 'start date', 'available from', 'préavis', 'kündigungsfrist', 'plazo de preaviso', 'preavviso', 'فترة الإشعار', 'تاريخ البدء'],
  how_heard: ['how did you hear', 'how did you hear about us', 'referral', 'source', 'referred by', 'comment avez-vous connu', 'wie haben sie erfahren', 'cómo se enteró', 'come ci hai conosciuto', 'كيف سمعت عنا'],
  resume: ['resume', 'cv', 'upload cv', 'upload resume', 'curriculum vitae', 'cv upload', 'télécharger cv', 'cv hochladen', 'subir cv', 'caricare cv', 'تحميل السيرة الذاتية'],
  cover_letter: ['cover letter', 'lettre de motivation', 'anschreiben', 'carta de presentación', 'lettera di presentazione', 'خطاب التغطية'],
  linkedin_profile: ['linkedin profile', 'linkedin url', 'linkedin', 'profil linkedin', 'linkedin profil'],
  website: ['website', 'personal website', 'portfolio', 'webseite', 'sitio web'],
  github_profile: ['github profile', 'github url', 'github', 'github profil'],
  twitter_profile: ['twitter profile', 'twitter url', 'twitter handle', 'x profile', 'x url'],
  start_date: ['start date', 'available start date', 'earliest start date', 'date de début', 'startdatum', 'fecha de inicio', 'data di inizio', 'تاريخ البدء', 'موعد البدء'],
  relocation: ['relocation', 'willing to relocate', 'relocate', 'mobilité', 'umzug', 'reasignación', 'trasferimento', 'الانتقال', 'إعادة التوطين'],
  remote: ['remote', 'remote work', 'work remote', 'remote only', 'télétravail', 'fernarbeit', 'trabajo remoto', 'lavoro da remoto', 'العمل عن بعد'],
  travel: ['travel', 'willing to travel', 'travel requirement', 'déplacement', 'reisebereitschaft', 'viaje', 'viaggio', 'سفر'],
  linkedin_url: ['linkedin url', 'linkedin profile url', 'linkedin link'],
  gender_identity: ['gender identity', 'genderqueer', 'non-binary', 'transgender'],
  hispanic: ['hispanic', 'latino', 'latina', 'latinx', 'hispanic or latino'],
  education_level: ['education level', 'highest education', 'highest degree', 'level of education', "niveau d'éducation", 'bildungsniveau', 'nivel de educación', 'livello di istruzione', 'المستوى التعليمي'],
  current_company: ['current company', 'current employer', 'present employer', 'most recent employer', 'entreprise actuelle', 'aktueller arbeitgeber', 'empresa actual', 'azienda attuale', 'الشركة الحالية'],
  current_title: ['current title', 'current position', 'current job title', 'most recent title', 'present position', 'poste actuel', 'aktuelle position', 'puesto actual', 'posizione attuale', 'المنصب الحالي'],
  years_at_current_job: ['years at current job', 'years at current company', 'tenure', 'years with current employer', 'ans dans le poste', 'betriebszugehörigkeit', 'años en el puesto', 'anni in azienda', 'سنوات في الشركة'],
  phone_type: ['phone type', 'phone number type', 'mobile or home', 'type de téléphone', 'telefontyp', 'tipo de teléfono', 'tipo di telefono', 'نوع الهاتف'],
  address_line2: ['address line 2', 'address line2', 'apt', 'apartment', 'suite', 'unit', 'appartement', 'wohnung', 'apartamento', 'appartamento', 'شقة', 'وحدة'],
  consent: ['consent', 'agree', 'i agree', 'terms', 'terms of service', 'privacy policy', 'accept', 'confirmation', 'consentement', 'zustimmung', 'consentimiento', 'consenso', 'موافقة'],
  captcha: ['captcha', 'recaptcha', 'not a robot', 'verification', 'verify', 'vérification', 'verifizierung', 'verificación', 'verifica', 'تحقق'],
  prefix: ['prefix', 'title', 'mr', 'mrs', 'ms', 'dr', 'salutation', 'civilité', 'anrede', 'tratamiento', 'titolo', 'اللقب'],
  suffix: ['suffix', 'jr', 'sr', 'ii', 'iii', 'phd', 'suffixe', 'nachsilbe', 'sufijo', 'suffisso', 'لاحقة'],
  password: ['password', 'create password', 'mot de passe', 'passwort', 'contraseña', 'password', 'كلمة المرور'],
  confirm_password: ['confirm password', 'confirm', 'repeat password', 'confirmer', 'passwort bestätigen', 'confirmar contraseña', 'conferma password', 'تأكيد كلمة المرور']
};

const COMMON_LABEL_SELECTORS = '.label, label, .form-label, .field-label, .input-label, .control-label, .question-label, [class*="label"]';

function deepQuerySelectorAll(selector, root) {
  const results = [];
  try {
    results.push(...root.querySelectorAll(selector));
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (el.shadowRoot) {
        results.push(...deepQuerySelectorAll(selector, el.shadowRoot));
      }
    }
  } catch (e) {}
  return results;
}

function scanAllFields() {
  const fields = [];
  const seen = new Set();

  const docs = [document];
  try {
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        if (iframe.contentDocument) docs.push(iframe.contentDocument);
      } catch (e) {}
    });
    document.querySelectorAll('iframe[srcdoc]').forEach(iframe => {
      try {
        if (iframe.contentDocument) docs.push(iframe.contentDocument);
      } catch (e) {}
    });
  } catch (e) {}

  for (const doc of docs) {
    const id = doc === document ? 'main' : `iframe_${Math.random().toString(36).slice(2, 6)}`;
    fields.push(...scanFieldsInDoc(doc, id, seen));
  }

  return fields;
}

function scanFieldsInDoc(doc, docId, seen) {
  const fields = [];

  scanElements(doc, 'input, textarea, select', 'standard', fields, docId, seen);
  scanElements(doc, '[contenteditable="true"]:not([contenteditable="false"])', 'contenteditable', fields, docId, seen);
  scanElements(doc, '[role="combobox"]:not(input):not(select)', 'combobox', fields, docId, seen);
  scanElements(doc, '[role="textbox"]:not(input):not(textarea)', 'textbox', fields, docId, seen);
  scanElements(doc, '[role="searchbox"]:not(input)', 'searchbox', fields, docId, seen);
  scanShadowDomElements(doc, '', fields, docId, seen);

  return fields;
}

function scanElements(doc, selector, role, fields, docId, seen) {
  deepQuerySelectorAll(selector, doc).forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      const type = (el.type || 'text').toLowerCase();
      if (['hidden', 'submit', 'button', 'reset', 'file', 'image'].includes(type)) return;
    }

    const id = generateId(el);
    if (seen.has(id)) return;
    seen.add(id);

    const label = extractLabel(el);
    if (!label && !el.placeholder && !el.getAttribute('aria-label')) {
      if (role !== 'combobox') return;
    }

    const selectorText = buildSelector(el);
    const fieldType = detectFieldType(label, el);

    const field = {
      id,
      element_id: selectorText,
      label,
      type: el.type || role || el.tagName.toLowerCase(),
      field_type: fieldType,
      placeholder: el.placeholder || '',
      required: el.required || el.getAttribute('aria-required') === 'true',
      current_value: el.value || '',
      suggested_value: null,
      confidence: null,
      aria_label: el.getAttribute('aria-label') || '',
      element_role: role,
      doc_id: docId,
      options: getOptions(el),
      shadow: el.getRootNode() instanceof ShadowRoot
    };

    fields.push(field);
  });
}

function scanShadowDomElements(root, path, fields, docId, seen) {
  const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
  for (const el of all) {
    if (el.shadowRoot) {
      const shadowFields = scanFieldsInDoc(el.shadowRoot, docId + '_shadow', seen);
      fields.push(...shadowFields);
      scanShadowDomElements(el.shadowRoot, path + ' > ' + buildSelector(el), fields, docId, seen);
    }
  }
}

function extractLabel(el) {
  const strategies = [
    () => el.getAttribute('aria-labelledby')?.split(' ').map(id => {
      const labelEl = el.getRootNode()?.getElementById(id) || document.getElementById(id);
      return labelEl?.textContent || '';
    }).filter(Boolean).join(' '),

    () => el.getAttribute('aria-label'),

    () => el.getAttribute('data-automation-id')?.replace(/[-_]/g, ' '),

    () => {
      const id = el.id;
      if (!id) return null;
      try {
        return el.getRootNode()?.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim()
          || document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim();
      } catch (e) { return null; }
    },

    () => {
      const root = el.getRootNode?.();
      if (root instanceof ShadowRoot) {
        const slot = root.querySelector('slot');
        if (slot) {
          const assigned = slot.assignedNodes?.() || [];
          const text = assigned.map(n => n.textContent || '').join('').trim();
          if (text) return text;
        }
      }
      return null;
    },

    () => el.closest('label')?.textContent?.trim(),

    () => {
      const fieldset = el.closest('fieldset');
      if (fieldset) {
        const legend = fieldset.querySelector('legend');
        if (legend) return legend.textContent?.trim();
      }
      return null;
    },

    () => {
      const parent = el.parentElement;
      if (!parent) return null;
      const prev = parent.querySelector(':scope > span, :scope > div, :scope > label');
      if (prev && prev !== el) {
        const text = prev.textContent?.trim();
        if (text && text.length < 200) return text;
      }
      return null;
    },

    () => el.placeholder?.trim(),

    () => {
      const parent = el.closest('div, fieldset, section, td, th, .field, .form-group, .input-group, [class*="form"], [class*="field"]');
      if (parent) {
        const cloned = parent.cloneNode(true);
        const selfInClone = cloned.querySelector('input, textarea, select, [contenteditable], [role="combobox"]');
        if (selfInClone) selfInClone.remove();
        const wrapper = cloned.querySelector(COMMON_LABEL_SELECTORS);
        if (wrapper) {
          const text = wrapper.textContent?.trim();
          if (text && text.length > 0 && text.length < 200) return text;
        }
        const text = cloned.textContent?.trim();
        if (text && text.length > 0 && text.length < 200) return text;
      }
      return null;
    },

    () => el.name?.replace(/[-_]/g, ' ')?.trim(),

    () => el.title?.trim(),

    () => el.getAttribute('data-placeholder') || el.getAttribute('data-label') || null
  ];

  for (const fn of strategies) {
    try {
      const result = fn();
      if (result && result.length > 0 && result.length < 300) {
        return result.trim();
      }
    } catch (e) {}
  }

  return 'Unknown';
}

function detectFieldType(label, el) {
  const l = label.toLowerCase().trim();
  const n = (el.name || '').toLowerCase();
  const p = (el.placeholder || '').toLowerCase();
  const al = (el.getAttribute('aria-label') || '').toLowerCase();
  const patterns = [l, n, p, al].filter(Boolean);

  for (const [type, keywords] of Object.entries(FIELD_TYPE_PATTERNS)) {
    for (const pat of patterns) {
      for (const kw of keywords) {
        if (pat === kw || pat.startsWith(kw) || pat.includes(kw)) {
          return type;
        }
      }
    }
  }

  if (el.type === 'email') return 'email';
  if (el.type === 'tel') return 'phone';
  if (el.type === 'url') return 'website';
  if (el.type === 'number') {
    if (l.includes('year') || l.includes('experience') || l.includes('age')) return 'years_experience';
    if (l.includes('salary')) return 'desired_salary';
    if (l.includes('phone')) return 'phone';
    return 'number';
  }
  if (el.type === 'date') return 'date_of_birth';

  return 'unknown';
}

function getOptions(el) {
  if (el.tagName === 'SELECT') {
    return Array.from(el.options).map(o => ({ value: o.value, text: o.text })).filter(o => o.value);
  }
  const listbox = el.getAttribute('role') === 'combobox'
    ? el.parentElement?.querySelector('[role="listbox"]')
    : null;
  if (listbox) {
    return Array.from(listbox.querySelectorAll('[role="option"]')).map(o => ({
      value: o.getAttribute('data-value') || o.textContent?.trim() || '',
      text: o.textContent?.trim() || ''
    }));
  }
  return [];
}

function buildSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.name) {
    const tag = el.tagName.toLowerCase();
    return `${tag}[name="${CSS.escape(el.name)}"]`;
  }
  if (el.getAttribute('data-automation-id')) {
    return `[data-automation-id="${CSS.escape(el.getAttribute('data-automation-id'))}"]`;
  }
  let path = [];
  let current = el;
  while (current && current !== document.body && current !== document.documentElement) {
    let segment = current.tagName.toLowerCase();
    if (current.id) { path.unshift(`#${CSS.escape(current.id)}`); break; }
    const parent = current.parentElement || current.parentNode;
    if (parent) {
      if (parent instanceof ShadowRoot) {
        path.unshift(`${segment}`);
        break;
      }
      const children = Array.from(parent.children || []).filter(c => c.tagName === current.tagName);
      if (children.length > 1) {
        const idx = Array.from(parent.children).indexOf(current) + 1;
        segment += `:nth-child(${idx})`;
      }
    }
    path.unshift(segment);
    current = current.parentElement || current.parentNode;
    if (current instanceof ShadowRoot) {
      path.unshift('shadow-root');
      current = current.host;
    }
  }
  return path.join(' > ');
}

function generateId(el) {
  const parts = [
    el.tagName.toLowerCase(),
    el.name || '',
    el.id || '',
    el.getAttribute('data-automation-id') || '',
    Math.random().toString(36).slice(2, 6)
  ];
  return parts.filter(Boolean).join('_');
}

function scanFormFields() {
  return scanAllFields().filter(f => {
    const noGo = ['captcha', 'password', 'confirm_password', 'resume', 'cover_letter', 'file'];
    return !noGo.includes(f.field_type);
  });
}
