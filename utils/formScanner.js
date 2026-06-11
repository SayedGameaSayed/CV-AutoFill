function scanFormFields() {
  const elements = document.querySelectorAll('input, textarea, select');
  const fields = [];
  const seen = new Set();

  elements.forEach(el => {
    const type = (el.type || 'text').toLowerCase();
    if (['hidden', 'submit', 'button', 'reset', 'file'].includes(type)) return;
    if (el.offsetParent === null && type !== 'checkbox' && type !== 'radio') return;

    const id = generateId(el);
    if (seen.has(id)) return;
    seen.add(id);

    const label = extractLabel(el);
    const selector = buildSelector(el);

    fields.push({
      id,
      element_id: selector,
      label,
      type,
      placeholder: el.placeholder || '',
      required: el.required || el.getAttribute('aria-required') === 'true',
      current_value: el.value || '',
      suggested_value: null,
      confidence: null,
      status: 'pending'
    });
  });

  return fields;
}

function extractLabel(el) {
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');

  if (el.id) {
    const labelByFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (labelByFor) return labelByFor.textContent.trim();
  }

  const parentLabel = el.closest('label');
  if (parentLabel) return parentLabel.textContent.trim();

  if (el.placeholder) return el.placeholder;

  const parent = el.closest('div, fieldset, section, td, th');
  if (parent) {
    const text = parent.cloneNode(true);
    const elInClone = text.querySelector('input, textarea, select');
    if (elInClone) elInClone.remove();
    const cleaned = text.textContent.trim();
    if (cleaned.length > 0 && cleaned.length < 200) return cleaned;
  }

  return el.name || el.id || 'Unknown field';
}

function buildSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.name) {
    const tag = el.tagName.toLowerCase();
    return `${tag}[name="${CSS.escape(el.name)}"]`;
  }
  let path = [];
  let current = el;
  while (current && current !== document.body) {
    let segment = current.tagName.toLowerCase();
    if (current.id) { path.unshift(`#${CSS.escape(current.id)}`); break; }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
      if (siblings.length > 1) {
        segment += `:nth-child(${Array.from(parent.children).indexOf(current) + 1})`;
      }
    }
    path.unshift(segment);
    current = current.parentElement;
  }
  return path.join(' > ');
}

function generateId(el) {
  return `${el.tagName.toLowerCase()}_${el.name || el.id || Math.random().toString(36).slice(2, 9)}`;
}
