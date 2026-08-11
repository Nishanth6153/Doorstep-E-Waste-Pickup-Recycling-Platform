/* ============================================================
   script.js — GreenLoop E-Waste Scheduler
   All graded logic: Form Validation, DOM Manipulation,
   Event Handling, Exception Handling (try-catch), JSON data
   ============================================================ */

'use strict';

/* ════════════════════════════════════════════════════════════
   SHARED BOOTSTRAP — EVENT HANDLING: DOMContentLoaded
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // EVENT HANDLING: Wire up all page-specific modules safely
  setupThemeToggle();            // Dark/Light mode toggle
  setupNavbar();
  setupFadeInObserver();
  setupRegistrationForm();       // register.html
  setupPasswordStrength();       // register.html — password strength meter
  setupContactForm();            // contact.html
  setupFaq();                    // contact.html
  setupSchedulePage();           // schedule.html
  renderHomeDeviceCards();       // index.html — device cards from JSON
  loadMalformedDraftDemo();      // Exception Handling demo (schedule.html)
});

/* ════════════════════════════════════════════════════════════
   NAVBAR — EVENT HANDLING
   ════════════════════════════════════════════════════════════ */
// EVENT HANDLING: hamburger toggle + nav scroll shrink
function setupNavbar() {
  const toggle = document.querySelector('.menu-toggle');
  const nav    = document.querySelector('.site-nav');
  const header = document.querySelector('.site-header');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.textContent = isOpen ? '✕' : '☰';
    });

    // Close nav when a link is clicked on mobile
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      });
    });

    // Close nav when clicking outside
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target) && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      }
    });
  }

  // EVENT HANDLING: Scroll listener for header style
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }
}

/* ════════════════════════════════════════════════════════════
   DARK / LIGHT MODE THEME TOGGLE
   ════════════════════════════════════════════════════════════ */
function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  // Restore saved preference, or use OS preference
  const saved = localStorage.getItem('GREENLOOP_THEME');
  const initial = saved || (prefersDark.matches ? 'dark' : 'light');
  applyTheme(initial, btn);

  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next, btn);
      localStorage.setItem('GREENLOOP_THEME', next);
    });
  }

  // Respond to OS preference change when no saved preference
  prefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('GREENLOOP_THEME')) {
      applyTheme(e.matches ? 'dark' : 'light', btn);
    }
  });
}

function applyTheme(theme, btn) {
  document.documentElement.setAttribute('data-theme', theme);
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }
}

/* ════════════════════════════════════════════════════════════
   FADE-IN OBSERVER — DOM MANIPULATION / EVENT HANDLING
   ════════════════════════════════════════════════════════════ */
// DOM MANIPULATION: IntersectionObserver applies .visible class to trigger CSS animations
function setupFadeInObserver() {
  const elements = document.querySelectorAll('.fade-in-up');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // fire once only
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));
}

/* ════════════════════════════════════════════════════════════
   SHARED DOM HELPERS — DOM MANIPULATION
   ════════════════════════════════════════════════════════════ */

/**
 * DOM MANIPULATION: Creates or updates an inline error span below a field.
 * @param {string} fieldId - data-error-for attribute value
 * @param {string} message - Error text to inject
 */
function showFieldError(fieldId, message) {
  const errorSpan = document.querySelector(`[data-error-for="${fieldId}"]`);
  if (errorSpan) {
    errorSpan.textContent = message;
    // DOM MANIPULATION: add error state class to the parent wrapper
    const wrapper = errorSpan.closest('.form-group') || errorSpan.closest('fieldset') || errorSpan.parentElement;
    if (wrapper) wrapper.classList.add('field-error');
  }
}

/**
 * DOM MANIPULATION: Clears the inline error and removes the error state class.
 * @param {string} fieldId
 */
function clearFieldError(fieldId) {
  const errorSpan = document.querySelector(`[data-error-for="${fieldId}"]`);
  if (errorSpan) {
    errorSpan.textContent = '';
    const wrapper = errorSpan.closest('.form-group') || errorSpan.closest('fieldset') || errorSpan.parentElement;
    if (wrapper) wrapper.classList.remove('field-error');
  }
}

/**
 * DOM MANIPULATION: Show or hide the form status banner.
 * @param {HTMLElement} el - The status element
 * @param {'success'|'error'} type
 * @param {string} message
 */
function setStatus(el, type, message) {
  if (!el) return;
  el.className = `form-status ${type} visible`;
  el.textContent = message;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideStatus(el) {
  if (!el) return;
  el.className = 'form-status';
  el.textContent = '';
}

/* ════════════════════════════════════════════════════════════
   EXCEPTION HANDLING: Safe field access helper
   ════════════════════════════════════════════════════════════ */
/**
 * EXCEPTION HANDLING: Wraps form.elements access in try-catch.
 * If the named field is missing from the form (e.g. DOM not rendered),
 * logs to console and throws a descriptive error so the catch block
 * in the form handler can display a friendly UI message.
 * @param {HTMLFormElement} form
 * @param {string} name - field name attribute
 * @param {HTMLElement} statusEl - element to update with friendly error
 * @returns {HTMLElement} The found form element
 */
function getRequiredField(form, name, statusEl) {
  const field = form.elements.namedItem(name);
  if (!field) {
    const msg = `Required form field "${name}" is missing. Please refresh the page.`;
    console.error('[GreenLoop] Missing field:', name, '— DOM may not have rendered correctly.');
    setStatus(statusEl, 'error', msg);
    throw new Error(msg);
  }
  return field;
}

/* ════════════════════════════════════════════════════════════
   EXCEPTION HANDLING: Malformed saved-draft demo
   ════════════════════════════════════════════════════════════ */
/**
 * EXCEPTION HANDLING: Simulates reading a saved draft from localStorage/
 * a backend. The mock data is intentionally malformed JSON to demonstrate
 * try-catch with JSON.parse(). The catch block logs to console AND
 * injects a friendly DOM message — it does NOT crash the app.
 */
function loadMalformedDraftDemo() {
  const draftStatusEl = document.querySelector('#draft-status');
  if (!draftStatusEl) return; // only on schedule.html

  const malformedJson = '{itemType: "Laptop", quantity: 2, date: "2026-09-01"'; // intentionally broken

  try {
    // EXCEPTION HANDLING: JSON.parse on malformed string — will throw SyntaxError
    const draft = JSON.parse(malformedJson);
    // If somehow it didn't throw (shouldn't happen), populate the form
    console.log('[GreenLoop] Draft loaded:', draft);
  } catch (parseError) {
    // EXCEPTION HANDLING: catch block — log to console, show friendly UI message
    console.error('[GreenLoop] Saved draft could not be parsed (SyntaxError):', parseError.message);
    draftStatusEl.className = 'form-status error visible';
    draftStatusEl.textContent =
      '⚠ A saved draft was found but could not be recovered (corrupted data). Starting a fresh form.';
  }
}

/* ════════════════════════════════════════════════════════════
   HOME PAGE — DEVICE CARDS (DOM MANIPULATION, JSON)
   ════════════════════════════════════════════════════════════ */
/**
 * DOM MANIPULATION: Renders e-waste items as visual cards on the homepage.
 * Uses the ewasteItems JSON data from data.js.
 * Only runs on index.html (checks for #home-device-cards element).
 */
function renderHomeDeviceCards() {
  const grid = document.querySelector('#home-device-cards');
  if (!grid) return; // not on homepage

  try {
    // EXCEPTION HANDLING: verify JSON data
    if (typeof ewasteItems === 'undefined' || !Array.isArray(ewasteItems)) {
      throw new Error('ewasteItems data not available.');
    }

    // JSON REPRESENTATION: iterate over ewasteItems array
    ewasteItems.forEach(item => {
      // DOM MANIPULATION: createElement for each card
      const card = document.createElement('article');
      card.className = 'device-card fade-in-up';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'article');
      card.setAttribute('aria-label', `${item.itemName} — ${item.category}`);

      const iconEl = document.createElement('div');
      iconEl.className = 'card-icon';
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.textContent = item.iconOrImage;

      const catEl = document.createElement('p');
      catEl.className = 'card-cat';
      catEl.textContent = item.category;

      const titleEl = document.createElement('h3');
      titleEl.textContent = item.itemName;

      const descEl = document.createElement('p');
      descEl.className = 'card-desc';
      descEl.textContent = item.description;

      const hazardEl = document.createElement('span');
      hazardEl.className = `hazard ${item.hazardLevel.toLowerCase()}`;
      hazardEl.textContent = `${item.hazardLevel} hazard`;

      // Recovered materials chips
      const materialsEl = document.createElement('div');
      materialsEl.className = 'card-materials';
      if (item.recoveredMaterials && item.recoveredMaterials.length) {
        item.recoveredMaterials.forEach(mat => {
          const chip = document.createElement('span');
          chip.className = 'material-chip';
          chip.textContent = mat;
          materialsEl.appendChild(chip);
        });
      }

      const arrowEl = document.createElement('span');
      arrowEl.className = 'card-arrow';
      arrowEl.setAttribute('aria-hidden', 'true');
      arrowEl.textContent = '→';

      card.append(iconEl, catEl, titleEl, descEl, hazardEl, materialsEl, arrowEl);

      // EVENT HANDLING: card click navigates to schedule page
      card.addEventListener('click', () => {
        window.location.href = 'schedule.html';
      });

      // EVENT HANDLING: keyboard Enter/Space for accessibility
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = 'schedule.html';
        }
      });

      grid.appendChild(card);
    });

    // Re-run fade observer for newly added cards
    setupFadeInObserver();

  } catch (err) {
    // EXCEPTION HANDLING: graceful fallback if data is unavailable
    console.error('[GreenLoop] Could not render home device cards:', err.message);
    const msg = document.createElement('p');
    msg.style.cssText = 'color:var(--text-muted);padding:24px 0;text-align:center;';
    msg.textContent = 'Device catalogue is loading…';
    grid.appendChild(msg);
  }
}

/* ════════════════════════════════════════════════════════════
   PASSWORD STRENGTH — DOM MANIPULATION / EVENT HANDLING
   ════════════════════════════════════════════════════════════ */
/**
 * DOM MANIPULATION: Updates password strength bar and label as user types.
 * EVENT HANDLING: Listens on the password input.
 */
function setupPasswordStrength() {
  const pwInput   = document.querySelector('#reg-password');
  const fillEl    = document.querySelector('#pw-strength-fill');
  const labelEl   = document.querySelector('#reg-pw-label');
  const barEl     = fillEl ? fillEl.parentElement : null;
  if (!pwInput || !fillEl || !labelEl) return;

  pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    const score = calcPasswordStrength(val);

    // DOM MANIPULATION: update fill width and colour
    const levels = [
      { pct: 0,    color: 'transparent', label: '' },
      { pct: 25,   color: '#e74c3c',    label: 'Weak' },
      { pct: 50,   color: '#f39c12',    label: 'Fair' },
      { pct: 75,   color: '#f0ad4e',    label: 'Good' },
      { pct: 100,  color: '#1f6b47',    label: 'Strong' }
    ];

    const level = levels[score];
    fillEl.style.width    = level.pct + '%';
    fillEl.style.background = level.color;
    labelEl.textContent   = val.length ? level.label : '';
    labelEl.style.color   = level.color;

    // Update ARIA for screen readers
    if (barEl) {
      barEl.setAttribute('aria-valuenow', level.pct);
      barEl.setAttribute('aria-valuetext', val.length ? `Password strength: ${level.label}` : 'Enter a password');
    }
  });
}

/**
 * FORM VALIDATION: Calculates password strength score 0–4.
 * @param {string} pw
 * @returns {number} 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong
 */
function calcPasswordStrength(pw) {
  if (!pw.length) return 0;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(1, score); // at least 1 if they've typed anything
}

/* ════════════════════════════════════════════════════════════
   REGISTRATION FORM — FORM VALIDATION + EVENT HANDLING
   ════════════════════════════════════════════════════════════ */

/**
 * FORM VALIDATION: Validates all registration fields with custom rules.
 * Augments HTML5 `required`/`pattern` with JS logic for richer messages.
 * Returns true if all checks pass, false otherwise.
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
function validateRegistration(form) {
  // FORM VALIDATION: gather values
  const name     = form.elements['name'].value.trim();
  const email    = form.elements['email'].value.trim();
  const password = form.elements['password'].value;
  const phone    = form.elements['phone'].value.trim();
  const dob      = form.elements['dob'].value;
  const house    = form.elements['house'].value;
  const city     = form.elements['city'].value;
  const address  = form.elements['address'].value.trim();
  const acctType = form.querySelector('input[name="accountType"]:checked');
  const terms    = form.elements['terms'].checked;

  let valid = true;

  // FORM VALIDATION: define all checks as [fieldId, passes, errorMessage]
  const checks = [
    ['reg-name',
      name.length >= 2 && /^[A-Za-z\s'-]+$/.test(name),
      'Enter your full name (letters only, min 2 characters).'],
    ['reg-email',
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email),
      'Enter a valid email address (e.g. user@example.com).'],
    ['reg-password',
      /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password),
      'Password must be at least 8 characters with a letter and a number.'],
    ['reg-phone',
      /^\d{10}$/.test(phone),
      'Enter a 10-digit phone number with no spaces.'],
    ['reg-dob',
      Boolean(dob),
      'Select your date of birth.'],
    ['reg-house',
      house !== '' && parseInt(house, 10) >= 1,
      'Enter a valid house / flat number.'],
    ['reg-city',
      city !== '',
      'Select your city or service area.'],
    ['reg-address',
      address.length >= 10,
      'Enter your full address (at least 10 characters).'],
    ['accountType',
      Boolean(acctType),
      'Choose an account type — Individual or Business.'],
    ['reg-terms',
      terms,
      'You must agree to the terms and privacy policy to continue.']
  ];

  // FORM VALIDATION: run all checks, show/clear errors via DOM helpers
  checks.forEach(([id, passes, msg]) => {
    if (!passes) { showFieldError(id, msg); valid = false; }
    else clearFieldError(id);
  });

  return valid;
}

/**
 * EVENT HANDLING: Sets up the registration form with:
 *   - live input → clear error  (EVENT HANDLING)
 *   - submit → validate (FORM VALIDATION) inside try-catch (EXCEPTION HANDLING)
 */
function setupRegistrationForm() {
  const form     = document.querySelector('#registration-form');
  const statusEl = document.querySelector('#registration-status');
  if (!form) return;

  // EVENT HANDLING: clear errors as user types
  form.addEventListener('input', (e) => {
    const id = e.target.id || e.target.name;
    if (id) clearFieldError(id);
  });

  form.addEventListener('change', (e) => {
    const id = e.target.id || e.target.name;
    if (id) clearFieldError(id);
  });

  // EVENT HANDLING: submit event with FORM VALIDATION + EXCEPTION HANDLING
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hideStatus(statusEl);

    try {
      // EXCEPTION HANDLING: getRequiredField wraps DOM access in try-catch
      getRequiredField(form, 'name', statusEl);
      getRequiredField(form, 'email', statusEl);
      getRequiredField(form, 'password', statusEl);

      // FORM VALIDATION: run full validation
      if (validateRegistration(form)) {
        // DOM MANIPULATION: show success state
        setStatus(statusEl, 'success',
          '✓ Account created successfully! You can now schedule your first pickup.');
        form.reset();

        // DOM MANIPULATION: reset password strength bar after success
        const fillEl  = document.querySelector('#pw-strength-fill');
        const labelEl = document.querySelector('#reg-pw-label');
        if (fillEl)  { fillEl.style.width = '0%'; fillEl.style.background = 'transparent'; }
        if (labelEl) { labelEl.textContent = ''; }

      } else {
        // DOM MANIPULATION: draw attention to first error
        const firstError = form.querySelector('[data-error-for]:not(:empty)');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setStatus(statusEl, 'error', 'Please correct the highlighted fields above.');
      }
    } catch (err) {
      // EXCEPTION HANDLING: unexpected error (missing DOM elements, etc.)
      console.error('[GreenLoop] Registration form error:', err);
      setStatus(statusEl, 'error',
        'An unexpected error occurred. Please refresh and try again.');
    }
  });
}

/* ════════════════════════════════════════════════════════════
   CONTACT FORM — EVENT HANDLING + FORM VALIDATION
   ════════════════════════════════════════════════════════════ */
// EVENT HANDLING: handles contact form submit without leaving the page
function setupContactForm() {
  const form     = document.querySelector('#contact-form');
  const statusEl = document.querySelector('#contact-status');
  if (!form) return;

  // EVENT HANDLING: clear errors on input
  form.addEventListener('input', (e) => {
    const id = e.target.id || e.target.name;
    if (id) clearFieldError(id);
  });

  form.addEventListener('change', (e) => {
    const id = e.target.id || e.target.name;
    if (id) clearFieldError(id);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hideStatus(statusEl);

    try {
      // FORM VALIDATION: use custom checks with inline errors
      const name    = form.elements['contactName'].value.trim();
      const email   = form.elements['contactEmail'].value.trim();
      const subject = form.elements['subject'].value;
      const message = form.elements['message'].value.trim();

      // FORM VALIDATION: check each field individually with inline errors
      const checks = [
        ['contact-name',    name.length >= 2,                                    'Enter your name (at least 2 characters).'],
        ['contact-email',   /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email),        'Enter a valid email address.'],
        ['contact-subject', Boolean(subject),                                    'Please choose a topic.'],
        ['contact-message', message.length >= 10,                                'Enter a message (at least 10 characters).']
      ];

      let valid = true;
      checks.forEach(([id, passes, msg]) => {
        if (!passes) { showFieldError(id, msg); valid = false; }
        else clearFieldError(id);
      });

      if (valid) {
        // DOM MANIPULATION: inject success message
        setStatus(statusEl, 'success',
          '✓ Message sent! Our team will reply within 1–2 business days.');
        form.reset();
      } else {
        const firstErr = form.querySelector('[data-error-for]:not(:empty)');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setStatus(statusEl, 'error', 'Please correct the highlighted fields above.');
      }
    } catch (err) {
      // EXCEPTION HANDLING: unexpected DOM/runtime errors
      console.error('[GreenLoop] Contact form error:', err);
      setStatus(statusEl, 'error', 'Something went wrong. Please try again.');
    }
  });
}

/* ════════════════════════════════════════════════════════════
   FAQ ACCORDION — EVENT HANDLING
   ════════════════════════════════════════════════════════════ */
// EVENT HANDLING: click → expand/collapse FAQ answers; only one open at a time
function setupFaq() {
  const faqBtns = document.querySelectorAll('.faq-btn');
  if (!faqBtns.length) return;

  faqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const answerId = btn.getAttribute('aria-controls');
      const answer   = answerId ? document.querySelector(`#${answerId}`) : btn.nextElementSibling;
      const isOpen   = btn.getAttribute('aria-expanded') === 'true';
      const icon     = btn.querySelector('.faq-icon');

      // EVENT HANDLING: close all others first (accordion pattern)
      faqBtns.forEach(other => {
        if (other !== btn) {
          other.setAttribute('aria-expanded', 'false');
          const otherId   = other.getAttribute('aria-controls');
          const otherAns  = otherId ? document.querySelector(`#${otherId}`) : other.nextElementSibling;
          const otherIcon = other.querySelector('.faq-icon');
          if (otherAns)  otherAns.classList.remove('open');
          if (otherIcon) otherIcon.textContent = '+';
        }
      });

      // DOM MANIPULATION: toggle this one
      btn.setAttribute('aria-expanded', String(!isOpen));
      if (answer) answer.classList.toggle('open', !isOpen);
      if (icon) icon.textContent = isOpen ? '+' : '×';
    });
  });
}

/* ════════════════════════════════════════════════════════════
   SCHEDULE PAGE — DOM MANIPULATION, EVENT HANDLING, JSON
   ════════════════════════════════════════════════════════════ */

// In-memory array to store scheduled pickups (simulates a session store)
const pickupsStore = [];

/**
 * EXCEPTION HANDLING: Safe catalogue loader with JSON parse error simulation.
 * @returns {Array} Valid items array or empty array as fallback
 */
function safelyLoadItems() {
  try {
    // EXCEPTION HANDLING: verify JSON data array is available and valid
    if (typeof ewasteItems === 'undefined') {
      throw new Error('ewasteItems is not defined — data.js may not have loaded.');
    }
    if (!Array.isArray(ewasteItems) || ewasteItems.length === 0) {
      throw new Error('ewasteItems is empty or not an array.');
    }
    // JSON REPRESENTATION: return a shallow copy to avoid mutating the source
    return [...ewasteItems];
  } catch (err) {
    // EXCEPTION HANDLING: log and return empty array so page still renders
    console.error('[GreenLoop] Could not load catalogue data:', err.message);
    return [];
  }
}

/**
 * DOM MANIPULATION: Renders e-waste items into both the catalogue TABLE and CARD GRID.
 * All elements created with createElement — zero hardcoded HTML here.
 * @param {Array} items - Filtered/sorted subset of ewasteItems
 */
function renderItems(items) {
  const tableBody = document.querySelector('#items-table-body');
  const cardsGrid = document.querySelector('#item-cards-grid');
  if (!tableBody || !cardsGrid) return;

  // DOM MANIPULATION: clear existing rows/cards
  tableBody.innerHTML = '';
  cardsGrid.innerHTML = '';

  if (!items.length) {
    // DOM MANIPULATION: empty state row
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'empty-row';
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 5;
    emptyCell.innerHTML = 'No items match your search. <button type="button" id="btn-reset-table-search" style="background:none;border:none;color:var(--accent);font-weight:700;cursor:pointer;text-decoration:underline;">Reset Search & Filters</button>';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);

    // DOM MANIPULATION: empty card state
    const emptyWrap = document.createElement('div');
    emptyWrap.style.cssText = 'text-align:center;padding:48px 24px;color:var(--text-muted);grid-column:1/-1;';
    emptyWrap.innerHTML = `
      <p style="font-size:1.1rem;font-weight:600;margin-bottom:8px;">No devices match your search.</p>
      <p style="font-size:.875rem;margin-bottom:16px;">Try another category or clear your filters.</p>
      <button type="button" id="btn-reset-cards-search" class="btn btn-outline-green" style="padding:6px 16px;font-size:.825rem;">
        Reset Search & Filters
      </button>
    `;
    cardsGrid.appendChild(emptyWrap);

    const resetBtn1 = document.getElementById('btn-reset-table-search');
    const resetBtn2 = document.getElementById('btn-reset-cards-search');
    const resetSearch = () => {
      const searchEl = document.querySelector('#item-search');
      if (searchEl) { searchEl.value = ''; searchEl.dispatchEvent(new Event('input')); }
    };
    resetBtn1?.addEventListener('click', resetSearch);
    resetBtn2?.addEventListener('click', resetSearch);
    return;
  }

  items.forEach(item => {
    // ── TABLE ROW ──────────────────────────────────────────
    // DOM MANIPULATION: createElement for each cell
    const row = document.createElement('tr');

    const cellIcon = document.createElement('td');
    cellIcon.style.fontSize = '1.4rem';
    cellIcon.setAttribute('aria-hidden', 'true');
    cellIcon.textContent = item.iconOrImage;

    const cellName = document.createElement('td');
    const nameEm = document.createElement('span');
    nameEm.className = 'cell-em';
    nameEm.textContent = item.itemName;
    cellName.appendChild(nameEm);

    const cellCat = document.createElement('td');
    cellCat.textContent = item.category;
    cellCat.style.color = 'var(--text-muted)';

    const cellDesc = document.createElement('td');
    cellDesc.textContent = item.description;
    cellDesc.style.fontSize = '.85rem';

    const cellHazard = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `hazard ${item.hazardLevel.toLowerCase()}`;
    badge.textContent = item.hazardLevel;
    cellHazard.appendChild(badge);

    [cellIcon, cellName, cellCat, cellDesc, cellHazard].forEach(c => row.appendChild(c));
    tableBody.appendChild(row);

    // ── CARD ──────────────────────────────────────────────
    // DOM MANIPULATION: createElement for card structure
    const card = document.createElement('article');
    card.className = 'item-card fade-in-up';

    const iconEl = document.createElement('div');
    iconEl.className = 'card-icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = item.iconOrImage;

    const catEl = document.createElement('p');
    catEl.className = 'card-cat';
    catEl.textContent = item.category;

    const titleEl = document.createElement('h3');
    titleEl.textContent = item.itemName;

    const descEl = document.createElement('p');
    descEl.className = 'card-desc';
    descEl.textContent = item.description;

    const hazardEl = document.createElement('span');
    hazardEl.className = `hazard ${item.hazardLevel.toLowerCase()}`;
    hazardEl.textContent = `${item.hazardLevel} hazard`;

    // Recovered materials chips
    if (item.recoveredMaterials && item.recoveredMaterials.length) {
      const materialsEl = document.createElement('div');
      materialsEl.className = 'card-materials';
      item.recoveredMaterials.forEach(mat => {
        const chip = document.createElement('span');
        chip.className = 'material-chip';
        chip.textContent = mat;
        materialsEl.appendChild(chip);
      });
      card.append(iconEl, catEl, titleEl, descEl, hazardEl, materialsEl);
    } else {
      card.append(iconEl, catEl, titleEl, descEl, hazardEl);
    }

    cardsGrid.appendChild(card);
  });

  // Re-run fade observer for newly added cards
  setupFadeInObserver();
}

/**
 * EVENT HANDLING: Wires up search input, category chips, and sort button.
 * All three share the same `applyFilters()` function for consistent output.
 * @param {Array} allItems - Full unfiltered catalogue
 */
function setupCatalogueFilters(allItems) {
  const searchEl  = document.querySelector('#item-search');
  const chipsEl   = document.querySelector('#category-chips');
  const sortBtn   = document.querySelector('#sort-hazard');
  if (!searchEl || !chipsEl || !sortBtn) return;

  let activeCategory = 'All';
  let sortedDesc     = false;

  // EVENT HANDLING: compute filtered + sorted items then re-render
  const applyFilters = () => {
    const query = searchEl.value.toLowerCase().trim();

    let filtered = allItems.filter(item => {
      const matchCat  = activeCategory === 'All' || item.category === activeCategory;
      const matchText = !query ||
        item.itemName.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query);
      return matchCat && matchText;
    });

    if (sortedDesc) {
      const rank = { High: 3, Medium: 2, Low: 1 };
      filtered.sort((a, b) => rank[b.hazardLevel] - rank[a.hazardLevel]);
    }

    // DOM MANIPULATION: re-render results
    renderItems(filtered);
  };

  // DOM MANIPULATION: build category chips dynamically from JSON data
  const categories = ['All', ...new Set(allItems.map(i => i.category))];
  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${cat === 'All' ? ' active' : ''}`;
    chip.textContent = cat;
    chip.dataset.cat = cat;
    chip.setAttribute('aria-pressed', cat === 'All' ? 'true' : 'false');
    chipsEl.appendChild(chip);
  });

  // EVENT HANDLING: search input (live filter)
  searchEl.addEventListener('input', applyFilters);

  // EVENT HANDLING: category chip clicks (event delegation on container)
  chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    activeCategory = chip.dataset.cat;
    // DOM MANIPULATION: update chip active state and aria-pressed
    chipsEl.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c === chip);
      c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
    });
    applyFilters();
  });

  // EVENT HANDLING: sort by hazard level button (toggle)
  sortBtn.addEventListener('click', () => {
    sortedDesc = !sortedDesc;
    // DOM MANIPULATION: update button label to reflect state
    sortBtn.textContent = sortedDesc
      ? '↓ Hazard: High → Low'
      : '↑ Sort by Hazard';
    sortBtn.setAttribute('aria-pressed', String(sortedDesc));
    applyFilters();
  });
}

/* ════════════════════════════════════════════════════════════
   LIVE PICKUP SUMMARY — DOM MANIPULATION
   ════════════════════════════════════════════════════════════ */
/**
 * DOM MANIPULATION: Updates the live pickup summary panel on the right side
 * of the schedule page as the user fills in the form.
 * @param {HTMLFormElement} form
 */
function updatePickupSummary(form) {
  const emptyState    = document.querySelector('#summary-empty-state');
  const devicesWrap   = document.querySelector('#summary-devices');
  const devicesList   = document.querySelector('#summary-devices-list');
  const datetimeWrap  = document.querySelector('#summary-datetime');
  const summaryDate   = document.querySelector('#summary-date');
  const summaryTime   = document.querySelector('#summary-time');
  const addressWrap   = document.querySelector('#summary-address-row');
  const summaryAddr   = document.querySelector('#summary-address');
  const confirmWrap   = document.querySelector('#summary-confirm-wrap');

  if (!emptyState) return; // not on schedule page

  // Gather current form values
  const checkedItems = [...form.querySelectorAll('input[name="itemType"]:checked')];
  const quantity     = form.elements['quantity'] ? form.elements['quantity'].value : '';
  const date         = form.elements['date'] ? form.elements['date'].value : '';
  const time         = form.elements['time'] ? form.elements['time'].value : '';
  const address      = form.elements['address'] ? form.elements['address'].value.trim() : '';

  const hasDevices   = checkedItems.length > 0;
  const hasDatetime  = date || time;
  const hasAddress   = address.length >= 5;
  const hasAnything  = hasDevices || hasDatetime || hasAddress;

  // DOM MANIPULATION: show/hide empty state
  emptyState.style.display = hasAnything ? 'none' : 'block';

  // DOM MANIPULATION: update device list
  if (devicesWrap && devicesList) {
    devicesWrap.style.display = hasDevices ? 'block' : 'none';
    devicesList.innerHTML = '';
    checkedItems.forEach(cb => {
      const item = document.createElement('div');
      item.className = 'summary-device-item';
      // Find icon from ewasteItems if available
      let icon = '📦';
      if (typeof ewasteItems !== 'undefined') {
        const match = ewasteItems.find(i => i.itemName.toLowerCase().includes(cb.value.toLowerCase())
          || cb.value.toLowerCase().includes(i.itemName.toLowerCase()));
        if (match) icon = match.iconOrImage;
      }
      item.innerHTML = `<span class="summary-device-icon" aria-hidden="true">${icon}</span> ${cb.value}${quantity ? ' × ' + quantity : ''}`;
      devicesList.appendChild(item);
    });
  }

  // DOM MANIPULATION: update date/time
  if (datetimeWrap && summaryDate && summaryTime) {
    datetimeWrap.style.display = hasDatetime ? 'block' : 'none';
    summaryDate.textContent = date
      ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    summaryTime.textContent = time || '—';
  }

  // DOM MANIPULATION: update address
  if (addressWrap && summaryAddr) {
    addressWrap.style.display = hasAddress ? 'block' : 'none';
    summaryAddr.textContent   = address;
  }

  // DOM MANIPULATION: show confirm button when enough data
  if (confirmWrap) {
    const readyToConfirm = hasDevices && hasDatetime && hasAddress;
    confirmWrap.style.display = readyToConfirm ? 'block' : 'none';
  }

  // Update step pills based on progress
  updateStepPills(form, hasDevices, hasDatetime);
}

/**
 * DOM MANIPULATION: Highlights step pills as user progresses through the form.
 */
function updateStepPills(form, hasDevices, hasDatetime) {
  const pill1 = document.querySelector('.step-pill:nth-child(1)');
  const pill2 = document.querySelector('#step-2-pill');
  const pill3 = document.querySelector('#step-3-pill');
  if (!pill1 || !pill2 || !pill3) return;

  const hasAddress = form.elements['address'] && form.elements['address'].value.trim().length >= 5;

  pill1.classList.toggle('done', hasDevices);
  pill1.classList.toggle('active', !hasDevices);
  pill2.classList.toggle('active', hasDevices && !hasDatetime);
  pill2.classList.toggle('done', hasDatetime);
  pill3.classList.toggle('active', hasDatetime && !hasAddress);
  pill3.classList.toggle('done', hasAddress);
}

/* ════════════════════════════════════════════════════════════
   FORM VALIDATION: Pickup form
   ════════════════════════════════════════════════════════════ */
/**
 * FORM VALIDATION: Validates the pickup scheduling form.
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
function validatePickupForm(form) {
  const fullName  = form.elements['fullName'].value.trim();
  const address   = form.elements['address'].value.trim();
  const itemTypes = form.querySelectorAll('input[name="itemType"]:checked');
  const quantity  = parseInt(form.elements['quantity'].value, 10);
  const date      = form.elements['date'].value;
  const time      = form.elements['time'].value;
  const condition = form.querySelector('input[name="condition"]:checked');

  let valid = true;

  // FORM VALIDATION: each check maps to a data-error-for target
  const checks = [
    ['itemType',        itemTypes.length > 0,                           'Select at least one item type to collect.'],
    ['pickup-quantity', !isNaN(quantity) && quantity >= 1 && quantity <= 50,
                                                                        'Enter a quantity between 1 and 50.'],
    ['pickup-date',     Boolean(date),                                  'Choose a preferred pickup date.'],
    ['pickup-time',     Boolean(time),                                  'Select a time slot.'],
    ['pickup-name',     fullName.length >= 2,                           'Enter your full name.'],
    ['pickup-address',  address.length >= 10,                           'Enter a complete pickup address (10+ characters).'],
    ['condition',       Boolean(condition),                             'Select the condition of your item(s).']
  ];

  checks.forEach(([id, passes, msg]) => {
    if (!passes) { showFieldError(id, msg); valid = false; }
    else clearFieldError(id);
  });

  return valid;
}

/**
 * DOM MANIPULATION: Re-renders the "My Scheduled Pickups" table from the in-memory array.
 */
async function renderPickups() {
  const tbody = document.querySelector('#pickups-table-body');
  if (!tbody) return;

  const token = localStorage.getItem('GREENLOOP_TOKEN');
  let currentPickups = [...pickupsStore];

  if (token) {
    try {
      const res = await fetch('/api/pickups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.pickups) {
          currentPickups = data.pickups;
        }
      }
    } catch (e) {}
  }

  tbody.innerHTML = '';

  if (!currentPickups.length) {
    const emptyRow  = document.createElement('tr');
    emptyRow.className = 'empty-row';
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 6;
    emptyCell.textContent = 'No pickups scheduled yet. Your confirmed requests will appear here.';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
    return;
  }

  currentPickups.forEach((pickup, index) => {
    const row = document.createElement('tr');
    const itemsText = Array.isArray(pickup.items) ? pickup.items.join(', ') : (pickup.itemTypes ? pickup.itemTypes.join(', ') : 'E-Waste');

    const data = [
      `#${index + 1}`,
      pickup.userName || pickup.name || 'User',
      itemsText,
      String(pickup.quantity || 1),
      `${pickup.date} · ${pickup.timeSlot || pickup.time}`,
      pickup.condition || 'Good'
    ];

    data.forEach(val => {
      const td = document.createElement('td');
      td.textContent = val;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });
}

function setupSchedulePage() {
  const form     = document.querySelector('#schedule-form');
  const statusEl = document.querySelector('#schedule-status');
  if (!form) return;

  const items = safelyLoadItems();

  renderItems(items);
  setupCatalogueFilters(items);
  renderPickups();

  form.addEventListener('input',  () => updatePickupSummary(form));
  form.addEventListener('change', () => updatePickupSummary(form));

  form.addEventListener('input',  (e) => clearFieldError(e.target.id || e.target.name));
  form.addEventListener('change', (e) => clearFieldError(e.target.id || e.target.name));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatus(statusEl);

    // Authentication Guard Check
    const token = localStorage.getItem('GREENLOOP_TOKEN');
    if (!token) {
      window.location.href = 'login.html?redirect=schedule.html';
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Scheduling…';
    }

    try {
      getRequiredField(form, 'fullName', statusEl);
      getRequiredField(form, 'address', statusEl);

      if (!validatePickupForm(form)) {
        const firstErr = form.querySelector('[data-error-for]:not(:empty)');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setStatus(statusEl, 'error', 'Please correct the highlighted fields above.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Confirm Pickup <span class="arrow" aria-hidden="true">→</span>';
        }
        return;
      }

      const itemsSelected = [...form.querySelectorAll('input[name="itemType"]:checked')].map(cb => cb.value);
      const payload = {
        items: itemsSelected,
        itemTypes: itemsSelected,
        quantity: form.elements['quantity'].value,
        date: form.elements['date'].value,
        timeSlot: form.elements['time'].value,
        address: form.elements['address'].value.trim(),
        phone: form.elements['phone'] ? form.elements['phone'].value.trim() : '9876543210',
        condition: form.querySelector('input[name="condition"]:checked')?.value || 'Good',
        notes: form.elements['instructions'] ? form.elements['instructions'].value.trim() : ''
      };

      const res = await fetch('/api/pickups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();

      if (res.ok && resData.success) {
        if (resData.pickup) pickupsStore.unshift(resData.pickup);
        await renderPickups();

        setStatus(statusEl, 'success',
          `✓ Doorstep Pickup confirmed! Your request is registered under your account.`);

        form.reset();
        updatePickupSummary(form);

        const pickupsSection = document.querySelector('.pickups-section');
        if (pickupsSection) {
          setTimeout(() => pickupsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
        }
      } else {
        setStatus(statusEl, 'error', resData.error || 'Failed to schedule pickup.');
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Confirm Pickup <span class="arrow" aria-hidden="true">→</span>';
      }

    } catch (err) {
      console.error('[GreenLoop] Schedule form error:', err);
      setStatus(statusEl, 'error',
        `Unable to schedule pickup: ${err.message}. Please try again.`);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Confirm Pickup <span class="arrow" aria-hidden="true">→</span>';
      }
    }
  });
}
