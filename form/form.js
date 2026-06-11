const $ = id => document.getElementById(id);
const $$ = (sel, ctx) => (ctx || document).querySelectorAll(sel);

// ---- Elements ----
const form = $('cvForm');
const saveStatus = $('saveStatus');
const closeBtn = $('closeBtn');
const cancelBtn = $('cancelBtn');

// ---- Tag helpers ----
function initTags(containerId, inputId, hiddenId) {
  const container = $(containerId);
  const input = $(inputId);
  const hidden = $(hiddenId);
  const wrap = container.querySelector('.form-tags-wrap');

  function render(tags) {
    wrap.querySelectorAll('.form-tag').forEach(t => t.remove());
    tags.forEach(tag => {
      const el = document.createElement('span');
      el.className = 'form-tag';
      el.innerHTML = `${escapeHtml(tag)}<button type="button" class="form-tag-remove" data-tag="${escapeHtml(tag)}">&times;</button>`;
      wrap.insertBefore(el, input);
    });
    hidden.value = JSON.stringify(tags);
  }

  function getTags() {
    try { return JSON.parse(hidden.value) || []; } catch { return []; }
  }

  function addTag(tag) {
    tag = tag.trim();
    if (!tag) return;
    const tags = getTags();
    if (tags.includes(tag)) return;
    tags.push(tag);
    render(tags);
  }

  function removeTag(tag) {
    const tags = getTags().filter(t => t !== tag);
    render(tags);
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input.value);
      input.value = '';
    }
  });

  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      addTag(input.value);
      input.value = '';
    }
  });

  wrap.addEventListener('click', e => {
    const btn = e.target.closest('.form-tag-remove');
    if (btn) removeTag(btn.dataset.tag);
  });

  return { getTags, setTags: (arr) => render(arr || []), addTag, removeTag };
}

// ---- Repeatable entry helpers ----
let entryCounters = { experience: 0, education: 0, projects: 0, customFields: 0 };

function createExperienceEntry(data) {
  const idx = ++entryCounters.experience;
  const div = document.createElement('div');
  div.className = 'form-entry';
  div.dataset.idx = idx;
  div.innerHTML = `
    <div class="form-entry-header">
      <span class="form-entry-title">${escapeHtml(data?.title || 'New Experience')}</span>
      <button type="button" class="form-entry-remove" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
    <div class="form-grid form-grid--2">
      <div class="form-field">
        <label class="form-label">Job Title</label>
        <input type="text" class="form-input exp-title" value="${escapeHtml(data?.title || '')}" placeholder="e.g. Software Engineer" />
      </div>
      <div class="form-field">
        <label class="form-label">Company</label>
        <input type="text" class="form-input exp-company" value="${escapeHtml(data?.company || '')}" placeholder="e.g. Acme Corp" />
      </div>
      <div class="form-field">
        <label class="form-label">Start Date</label>
        <input type="text" class="form-input exp-start" value="${escapeHtml(data?.start || '')}" placeholder="e.g. 2021" />
      </div>
      <div class="form-field">
        <label class="form-label">End Date</label>
        <input type="text" class="form-input exp-end" value="${escapeHtml(data?.end || '')}" placeholder="e.g. 2024 or Present" />
      </div>
    </div>
    <div class="form-field">
      <label class="form-label">Description</label>
      <textarea class="form-textarea exp-desc" rows="2" placeholder="Key responsibilities and achievements...">${escapeHtml(data?.description || '')}</textarea>
    </div>
  `;
  div.querySelector('.form-entry-remove').addEventListener('click', () => {
    div.remove();
    markDirty();
  });
  div.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', markDirty));
  $('experienceList').appendChild(div);
  return div;
}

function createEducationEntry(data) {
  const idx = ++entryCounters.education;
  const div = document.createElement('div');
  div.className = 'form-entry';
  div.dataset.idx = idx;
  div.innerHTML = `
    <div class="form-entry-header">
      <span class="form-entry-title">${escapeHtml(data?.degree || 'New Education')}</span>
      <button type="button" class="form-entry-remove" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
    <div class="form-grid form-grid--2">
      <div class="form-field">
        <label class="form-label">Degree</label>
        <input type="text" class="form-input edu-degree" value="${escapeHtml(data?.degree || '')}" placeholder="e.g. BSc Computer Science" />
      </div>
      <div class="form-field">
        <label class="form-label">Institution</label>
        <input type="text" class="form-input edu-institution" value="${escapeHtml(data?.institution || '')}" placeholder="e.g. MIT" />
      </div>
      <div class="form-field">
        <label class="form-label">GPA (optional)</label>
        <input type="text" class="form-input edu-gpa" value="${escapeHtml(data?.gpa || '')}" placeholder="e.g. 3.8/4.0" />
      </div>
      <div class="form-field">
        <label class="form-label">Graduation Year</label>
        <input type="text" class="form-input edu-graduation" value="${escapeHtml(data?.graduation || '')}" placeholder="e.g. 2023" />
      </div>
    </div>
  `;
  div.querySelector('.form-entry-remove').addEventListener('click', () => {
    div.remove();
    markDirty();
  });
  div.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', markDirty));
  $('educationList').appendChild(div);
  return div;
}

function createProjectEntry(data) {
  const idx = ++entryCounters.projects;
  const div = document.createElement('div');
  div.className = 'form-entry';
  div.dataset.idx = idx;
  div.innerHTML = `
    <div class="form-entry-header">
      <span class="form-entry-title">${escapeHtml(data?.name || 'New Project')}</span>
      <button type="button" class="form-entry-remove" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
    <div class="form-grid form-grid--2">
      <div class="form-field">
        <label class="form-label">Project Name</label>
        <input type="text" class="form-input proj-name" value="${escapeHtml(data?.name || '')}" placeholder="e.g. E-commerce App" />
      </div>
      <div class="form-field">
        <label class="form-label">Technologies</label>
        <input type="text" class="form-input proj-tech" value="${escapeHtml(Array.isArray(data?.tech) ? data.tech.join(', ') : (data?.tech || ''))}" placeholder="e.g. React, Node.js, PostgreSQL" />
      </div>
    </div>
    <div class="form-field">
      <label class="form-label">Description</label>
      <textarea class="form-textarea proj-desc" rows="2" placeholder="Brief project description...">${escapeHtml(data?.description || '')}</textarea>
    </div>
  `;
  div.querySelector('.form-entry-remove').addEventListener('click', () => {
    div.remove();
    markDirty();
  });
  div.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', markDirty));
  $('projectsList').appendChild(div);
  return div;
}

function createCustomFieldEntry(data) {
  ++entryCounters.customFields;
  const div = document.createElement('div');
  div.className = 'form-entry form-entry--custom';
  div.innerHTML = `
    <div class="form-entry-header">
      <span class="form-entry-title">${escapeHtml(data?.question || 'New Custom Field')}</span>
      <button type="button" class="form-entry-remove" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
    <div class="form-grid form-grid--2">
      <div class="form-field">
        <label class="form-label">Form Field Label</label>
        <input type="text" class="form-input custom-question" value="${escapeHtml(data?.question || '')}" placeholder="e.g. Expected Salary, Work Authorization..." />
      </div>
      <div class="form-field">
        <label class="form-label">Your Answer</label>
        <input type="text" class="form-input custom-answer" value="${escapeHtml(data?.answer || '')}" placeholder="e.g. Negotiable, US Citizen..." />
      </div>
    </div>
  `;
  div.querySelector('.form-entry-remove').addEventListener('click', () => {
    div.remove();
    markDirty();
  });
  div.querySelectorAll('input').forEach(el => el.addEventListener('input', markDirty));
  $('customFieldsList').appendChild(div);
  return div;
}

// ---- Collect data ----
function collectFormData() {
  const skills = skillsTags.getTags();
  const languages = languagesTags.getTags();
  const certifications = certsTags.getTags();

  const experience = [];
  $$('.form-entry', $('experienceList')).forEach(el => {
    experience.push({
      title: el.querySelector('.exp-title')?.value || '',
      company: el.querySelector('.exp-company')?.value || '',
      start: el.querySelector('.exp-start')?.value || '',
      end: el.querySelector('.exp-end')?.value || '',
      description: el.querySelector('.exp-desc')?.value || ''
    });
  });

  const education = [];
  $$('.form-entry', $('educationList')).forEach(el => {
    education.push({
      degree: el.querySelector('.edu-degree')?.value || '',
      institution: el.querySelector('.edu-institution')?.value || '',
      gpa: el.querySelector('.edu-gpa')?.value || null,
      graduation: el.querySelector('.edu-graduation')?.value || ''
    });
  });

  const projects = [];
  $$('.form-entry', $('projectsList')).forEach(el => {
    projects.push({
      name: el.querySelector('.proj-name')?.value || '',
      description: el.querySelector('.proj-desc')?.value || '',
      tech: (el.querySelector('.proj-tech')?.value || '').split(',').map(s => s.trim()).filter(Boolean)
    });
  });

  const custom_fields = [];
  $$('.form-entry--custom', $('customFieldsList')).forEach(el => {
    const question = el.querySelector('.custom-question')?.value?.trim();
    const answer = el.querySelector('.custom-answer')?.value?.trim();
    if (question && answer) custom_fields.push({ question, answer });
  });

  return {
    full_name: $('fullName').value.trim(),
    email: $('email').value.trim(),
    phone: $('phone').value.trim(),
    location: $('location').value.trim(),
    linkedin: $('linkedin').value.trim() || null,
    github: $('github').value.trim() || null,
    website: $('website').value.trim() || null,
    summary: $('summary').value.trim() || null,
    skills,
    languages,
    experience,
    education,
    certifications,
    projects,
    custom_fields
  };
}

// ---- Load / Save ----
let dirty = false;

function markDirty() { dirty = true; }

async function loadForm() {
  const result = await chrome.storage.local.get('cvData');
  if (!result.cvData || !result.cvData.parsed) return;
  const d = result.cvData.parsed;

  $('fullName').value = d.full_name || '';
  $('email').value = d.email || '';
  $('phone').value = d.phone || '';
  $('location').value = d.location || '';
  $('linkedin').value = d.linkedin || '';
  $('github').value = d.github || '';
  $('website').value = d.website || '';
  $('summary').value = d.summary || '';

  skillsTags.setTags(d.skills);
  languagesTags.setTags(d.languages);
  certsTags.setTags(d.certifications);

  if (d.experience) d.experience.forEach(e => createExperienceEntry(e));
  if (d.education) d.education.forEach(e => createEducationEntry(e));
  if (d.projects) d.projects.forEach(p => createProjectEntry(p));
  if (d.custom_fields) d.custom_fields.forEach(c => createCustomFieldEntry(c));
}

async function saveForm() {
  const data = collectFormData();
  const cvData = {
    parsed: data,
    raw_text: JSON.stringify(data),
    uploaded_at: new Date().toISOString()
  };
  await chrome.storage.local.set({ cvData });
  saveStatus.textContent = 'Saved!';
  saveStatus.classList.add('form-save-status--visible');
  setTimeout(() => {
    saveStatus.classList.remove('form-save-status--visible');
  }, 2000);
  dirty = false;
}

// ---- Event listeners ----
document.addEventListener('DOMContentLoaded', loadForm);

form.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  await saveForm();
  btn.disabled = false;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save & Use for Auto-Fill`;
  window.close();
});

closeBtn.addEventListener('click', () => window.close());
cancelBtn.addEventListener('click', () => window.close());

$('addExperienceBtn').addEventListener('click', () => createExperienceEntry());
$('addEducationBtn').addEventListener('click', () => createEducationEntry());
$('addProjectBtn').addEventListener('click', () => createProjectEntry());
$('addCustomFieldBtn').addEventListener('click', () => createCustomFieldEntry());

// Auto-update entry title on input
document.addEventListener('input', e => {
  const entry = e.target.closest('.form-entry');
  if (!entry) return;
  const titleEl = entry.querySelector('.form-entry-title');
  const titleInp = entry.querySelector('.exp-title, .edu-degree, .proj-name, .custom-question');
  if (!titleInp) return;
  if (entry.classList.contains('form-entry--custom')) {
    const answerInp = entry.querySelector('.custom-answer');
    titleEl.textContent = (titleInp.value || 'New Custom Field') + (answerInp?.value ? ` → ${answerInp.value}` : '');
  } else {
    titleEl.textContent = titleInp.value || 'New Entry';
  }
});

// ---- Init tag inputs ----
const skillsTags = initTags('skillsContainer', 'skillsInput', 'skills');
const languagesTags = initTags('languagesContainer', 'languagesInput', 'languages');
const certsTags = initTags('certificationsContainer', 'certificationsInput', 'certifications');

// ---- Utility ----
function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
