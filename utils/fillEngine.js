function fillField(selector, value) {
  const el = findElement(selector);
  if (!el || el.disabled || el.readOnly) return false;

  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role');
  const type = (el.type || 'text').toLowerCase();

  if (el.getAttribute('contenteditable') === 'true') {
    return fillContenteditable(el, value);
  }

  if (role === 'combobox' || role === 'listbox') {
    return fillCombobox(el, value);
  }

  if (tag === 'select') {
    return fillSelect(el, value);
  }

  if (type === 'checkbox') {
    return fillCheckbox(el, value);
  }

  if (type === 'radio') {
    return fillRadio(el, value, selector);
  }

  return fillInput(el, value, type);
}

function findElement(selector) {
  if (typeof selector === 'string') {
    let el = document.querySelector(selector);
    if (!el) {
      const parts = selector.split(' > ');
      if (parts.length > 1) {
        const shadowIdx = parts.indexOf('shadow-root');
        if (shadowIdx !== -1) {
          let current = document.querySelector(parts.slice(0, shadowIdx).join(' > '));
          if (current && current.shadowRoot) {
            const subSelector = parts.slice(shadowIdx + 1).join(' > ');
            el = current.shadowRoot.querySelector(subSelector);
          }
        }
      }
    }
    if (!el) {
      el = findInIframes(selector);
    }
    if (!el) {
      el = findInShadowDom(selector);
    }
    return el;
  }
  return typeof selector === 'object' ? selector : null;
}

function findInIframes(selector) {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument;
      if (doc) {
        const el = doc.querySelector(selector);
        if (el) return el;
      }
    } catch (e) {}
  }
  return null;
}

function findInShadowDom(selector, root) {
  root = root || document;
  try {
    const el = root.querySelector(selector);
    if (el) return el;
    const all = root.querySelectorAll('*');
    for (const node of all) {
      if (node.shadowRoot) {
        const found = findInShadowDom(selector, node.shadowRoot);
        if (found) return found;
      }
    }
  } catch (e) {}
  return null;
}

function fillContenteditable(el, value) {
  el.textContent = value;
  dispatchAllEvents(el, ['input', 'change', 'blur']);
  return true;
}

function fillCombobox(el, value) {
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
    return fillInput(el, value, el.type || 'text');
  }

  const label = value.toLowerCase().trim();
  const listbox = el.parentElement?.querySelector('[role="listbox"]')
    || el.nextElementSibling?.querySelector?.('[role="listbox"]')
    || document.querySelector('[role="listbox"]');

  if (listbox) {
    const options = listbox.querySelectorAll('[role="option"]');
    for (const opt of options) {
      const text = (opt.textContent || '').toLowerCase().trim();
      const dataVal = (opt.getAttribute('data-value') || '').toLowerCase().trim();
      const optVal = (opt.getAttribute('value') || '').toLowerCase().trim();
      if (text === label || text.includes(label) || dataVal === label || optVal === label) {
        el.click();
        opt.click();
        dispatchAllEvents(el, ['input', 'change', 'blur']);
        return true;
      }
    }
  }

  if (el.tagName === 'DIV' || el.tagName === 'SPAN') {
    el.textContent = value;
    el.setAttribute('data-value', value);
    dispatchAllEvents(el, ['input', 'change', 'blur']);
    return true;
  }

  if (el.tagName === 'INPUT') {
    return fillInput(el, value, 'text');
  }

  return false;
}

function fillSelect(el, value) {
  const v = String(value);
  for (const opt of el.options) {
    if (opt.value === v || opt.text === v || opt.text.toLowerCase().includes(v.toLowerCase())) {
      el.value = opt.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  return false;
}

function fillCheckbox(el, value) {
  const checked = value === true || value === 'true' || value === 'yes' || value === '1';
  el.checked = checked;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function fillRadio(el, value, selector) {
  const v = String(value).toLowerCase();
  const name = el.name;
  if (name) {
    const radios = document.querySelectorAll(`input[name="${CSS.escape(name)}"]`);
    for (const radio of radios) {
      const rv = (radio.value || '').toLowerCase();
      const rl = getLabelForRadio(radio)?.toLowerCase() || '';
      if (rv === v || rl === v || rv.includes(v) || rl.includes(v)) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
  }
  const direct = document.querySelector(`${selector}[value="${CSS.escape(value)}"]`);
  if (direct) {
    direct.checked = true;
    direct.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

function fillInput(el, value, type) {
  if (type === 'date') value = formatDate(value);
  if (type === 'tel') value = value.replace(/[^0-9+\-() ]/g, '');
  if (type === 'email') value = value.trim();

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

  dispatchAllEvents(el, ['input', 'change', 'blur', 'keyup', 'keydown', 'keypress']);
  el.classList.add('cv-autofill-highlighted');

  if (typeof el.dispatchEvent === 'function') {
    try {
      el.dispatchEvent(new CustomEvent('autofill', { bubbles: true, detail: { value } }));
      el.dispatchEvent(new CustomEvent('react-change', { bubbles: true, detail: { value } }));
    } catch (e) {}
  }

  try {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value);
      const inputEvent = new Event('input', { bubbles: true });
      inputEvent.simulated = true;
      el.dispatchEvent(inputEvent);
    }
  } catch (e) {}

  return true;
}

function getLabelForRadio(radio) {
  const id = radio.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.textContent?.trim();
  }
  const parent = radio.closest('label');
  if (parent) return parent.textContent?.trim();
  const wrapper = radio.closest('div, span, li');
  if (wrapper) {
    const text = wrapper.textContent?.replace(radio.value || '', '').trim();
    if (text) return text;
  }
  return null;
}

function formatDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const m = value.match(/(\d{4})/);
  return m ? `${m[1]}-01-01` : value;
}

function dispatchAllEvents(el, types) {
  for (const type of types) {
    try {
      const event = new Event(type, { bubbles: true, cancelable: true });
      el.dispatchEvent(event);
    } catch (e) {}
  }
}

function collectOriginalValues(fields) {
  const snapshot = [];
  fields.forEach(f => {
    const el = findElement(f.element_id);
    if (el) {
      snapshot.push({ selector: f.element_id, originalValue: getElementValue(el) });
    }
  });
  return snapshot;
}

function getElementValue(el) {
  if (el.getAttribute('contenteditable') === 'true') return el.textContent || '';
  if (el.type === 'checkbox') return el.checked ? 'true' : 'false';
  if (el.type === 'radio') return el.checked ? (el.value || 'true') : 'false';
  return el.value || '';
}

function restoreOriginalValues(snapshot) {
  snapshot.forEach(({ selector, originalValue }) => {
    const el = findElement(selector);
    if (el) {
      fillField(selector, originalValue);
      el.classList.remove('cv-autofill-highlighted');
    }
  });
}
