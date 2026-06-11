function fillField(selector, value) {
  const el = document.querySelector(selector);
  if (!el || el.disabled || el.readOnly) return false;

  const tag = el.tagName.toLowerCase();
  const type = (el.type || 'text').toLowerCase();

  if (tag === 'select') {
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  if (type === 'checkbox') {
    const checked = value === true || value === 'true' || value === 'yes';
    el.checked = checked;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  if (type === 'radio') {
    const radio = document.querySelector(`${selector}[value="${CSS.escape(value)}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  if (type === 'date') {
    value = formatDate(value);
  }

  if (type === 'tel') {
    value = value.replace(/[^0-9+\-() ]/g, '');
  }

  const maxLen = el.getAttribute('maxlength');
  if (maxLen && value.length > parseInt(maxLen)) {
    value = value.slice(0, parseInt(maxLen));
  }

  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set || Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

  el.classList.add('cv-autofill-highlighted');

  return true;
}

function formatDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/(\d{4})/);
  return match ? `${match[1]}-01-01` : value;
}

function collectOriginalValues(fields) {
  const snapshot = [];
  fields.forEach(f => {
    const el = document.querySelector(f.element_id);
    if (el) {
      snapshot.push({ selector: f.element_id, originalValue: el.value });
    }
  });
  return snapshot;
}

function restoreOriginalValues(snapshot) {
  snapshot.forEach(({ selector, originalValue }) => {
    const el = document.querySelector(selector);
    if (el) {
      fillField(selector, originalValue);
      el.classList.remove('cv-autofill-highlighted');
    }
  });
}
