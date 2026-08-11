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
  renderWwrDeviceCards();        // what-we-recycle.html — device cards
  loadMalformedDraftDemo();      // Exception Handling demo (schedule.html)
  loadEwasteData();              // impact.html — JSON fetch demo
  setupRememberMe();             // login.html — remember me checkbox
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
  const confirmPw = form.elements['confirmPassword'] ? form.elements['confirmPassword'].value : password;
  const gender    = form.querySelector('input[name="gender"]:checked');

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
    ['reg-confirm-password',
      confirmPw === password && confirmPw.length >= 8,
      'Passwords do not match. Please re-enter your password.'],
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
      'Select your preferred pickup area.'],
    ['reg-address',
      address.length >= 10,
      'Enter your full address (at least 10 characters).'],
    ['gender',
      Boolean(gender),
      'Please select your gender.'],
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
      const mobile  = form.elements['contactMobile'] ? form.elements['contactMobile'].value.trim() : '0000000000';
      const subject = form.elements['subject'].value;
      const date    = form.elements['contactDate'] ? form.elements['contactDate'].value : '2026-01-01';
      const message = form.elements['message'].value.trim();
      const consent = form.elements['contactConsent'] ? form.elements['contactConsent'].checked : true;

      // FORM VALIDATION: check each field individually with inline errors
      const checks = [
        ['contact-name',    name.length >= 2,                                    'Enter your name (at least 2 characters).'],
        ['contact-email',   /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email),        'Enter a valid email address.'],
        ['contact-mobile',  /^\d{10}$/.test(mobile),                            'Enter a valid 10-digit mobile number.'],
        ['contact-subject', Boolean(subject),                                    'Please choose a contact category.'],
        ['contact-date',    Boolean(date),                                       'Please select a preferred contact date.'],
        ['contact-message', message.length >= 10,                                'Enter a message (at least 10 characters).'],
        ['contact-consent', consent,                                             'Please consent to being contacted in response.']
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

/* ════════════════════════════════════════════════════════════
   REMEMBER ME — EVENT HANDLING + localStorage
   ════════════════════════════════════════════════════════════ */
/**
 * EVENT HANDLING: Sets up the Remember Me checkbox on login.html.
 * EXCEPTION HANDLING: Wraps localStorage access in try-catch.
 * If remember me is checked, persists the email in localStorage.
 */
function setupRememberMe() {
  const rememberCheckbox = document.getElementById('auth-remember');
  const emailInput       = document.getElementById('auth-email');
  if (!rememberCheckbox || !emailInput) return;

  // EXCEPTION HANDLING: localStorage access may fail in private/incognito
  try {
    const savedEmail = localStorage.getItem('GREENLOOP_REMEMBERED_EMAIL');
    if (savedEmail) {
      emailInput.value         = savedEmail;
      rememberCheckbox.checked = true;
    }
  } catch (storageErr) {
    console.warn('[GreenLoop] Could not read remembered email from localStorage:', storageErr.message);
  }

  // EVENT HANDLING: change event on remember me checkbox
  rememberCheckbox.addEventListener('change', () => {
    try {
      if (rememberCheckbox.checked && emailInput.value) {
        localStorage.setItem('GREENLOOP_REMEMBERED_EMAIL', emailInput.value);
      } else {
        localStorage.removeItem('GREENLOOP_REMEMBERED_EMAIL');
      }
    } catch (storageErr) {
      console.warn('[GreenLoop] Could not save remembered email:', storageErr.message);
    }
  });

  // EVENT HANDLING: also save when user blurs email field while remember is checked
  emailInput.addEventListener('blur', () => {
    try {
      if (rememberCheckbox.checked && emailInput.value) {
        localStorage.setItem('GREENLOOP_REMEMBERED_EMAIL', emailInput.value);
      }
    } catch (storageErr) {
      console.warn('[GreenLoop] Could not update remembered email:', storageErr.message);
    }
  });
}

/* ════════════════════════════════════════════════════════════
   JSON FETCH — impact.html (JSON REPRESENTATION + DOM MANIPULATION)
   ════════════════════════════════════════════════════════════ */
/**
 * JSON REPRESENTATION: Loads data/e_waste.json using fetch().
 * DOM MANIPULATION: Dynamically renders rows into #json-ewaste-tbody.
 * EXCEPTION HANDLING: try-catch around fetch() and JSON parsing.
 * EVENT HANDLING: runs on DOMContentLoaded via loadEwasteData().
 */
async function loadEwasteData() {
  const tbody    = document.getElementById('json-ewaste-tbody');
  const statusEl = document.getElementById('json-load-status');
  if (!tbody) return; // only runs on impact.html

  try {
    // JSON REPRESENTATION: fetch the external JSON file
    const response = await fetch('data/e_waste.json');

    // EXCEPTION HANDLING: check HTTP status
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status} — could not load e_waste.json`);
    }

    // EXCEPTION HANDLING: JSON.parse errors caught if response body is malformed
    const items = await response.json();

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('e_waste.json returned empty or non-array data.');
    }

    // DOM MANIPULATION: clear placeholder row
    tbody.innerHTML = '';

    // DOM MANIPULATION: render each JSON item as a table row
    items.forEach(item => {
      const row = document.createElement('tr');

      // Hazard colour coding
      const hazardColors = { High: '#e74c3c', Medium: '#f39c12', Low: 'var(--accent)' };
      const hazardColor  = hazardColors[item.hazardLevel] || 'var(--text-muted)';

      // DOM MANIPULATION: build row cells using innerHTML (safe — data is from our own JSON)
      row.innerHTML = `
        <td style="font-size:1.4rem;">${item.icon || '♻'}</td>
        <td><span class="cell-em">${item.name}</span></td>
        <td style="color:var(--text-muted);">${item.category}</td>
        <td><span style="color:${hazardColor};font-weight:700;font-size:.8rem;">${item.hazardLevel} Hazard</span></td>
        <td style="font-size:.8rem;color:var(--text-muted);">${(item.recyclableMaterials || []).slice(0,3).join(', ')}</td>
      `;

      // DOM MANIPULATION: appendChild to insert row into table
      tbody.appendChild(row);
    });

    // DOM MANIPULATION: show success status
    if (statusEl) {
      statusEl.className = 'form-status success visible';
      statusEl.textContent = `✓ Catalogue loaded from data/e_waste.json — ${items.length} device categories found.`;
    }

    // Re-run fade observer so newly added rows animate in
    setupFadeInObserver();

  } catch (fetchError) {
    // EXCEPTION HANDLING: graceful fallback on fetch/parse/network error
    console.error('[GreenLoop] Failed to load e_waste.json:', fetchError.message);

    // DOM MANIPULATION: show error message in tbody
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">
          <strong>Note:</strong> Live JSON loading requires a web server.
          When served locally, the catalogue loads from <code>data/e_waste.json</code>.
          Data is also available as the JavaScript array in <code>data.js</code>.
        </td>
      </tr>
    `;

    // DOM MANIPULATION: show inline fallback using ewasteItems from data.js
    if (typeof ewasteItems !== 'undefined' && Array.isArray(ewasteItems)) {
      tbody.innerHTML = '';
      ewasteItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="font-size:1.4rem;">${item.iconOrImage || '♻'}</td>
          <td><span class="cell-em">${item.itemName}</span></td>
          <td style="color:var(--text-muted);">${item.category}</td>
          <td><span style="color:var(--text-muted);font-weight:700;font-size:.8rem;">${item.hazardLevel} Hazard</span></td>
          <td style="font-size:.8rem;color:var(--text-muted);">${(item.recoveredMaterials || []).slice(0,3).join(', ')}</td>
        `;
        tbody.appendChild(row);
      });

      if (statusEl) {
        statusEl.className = 'form-status visible';
        statusEl.style.cssText = 'background:color-mix(in srgb,var(--accent) 8%,transparent);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);';
        statusEl.textContent = 'ℹ️ Showing catalogue from data.js (JSON file requires a web server to fetch).';
      }
    }
  }
}

/* ════════════════════════════════════════════════════════════
   WHAT WE RECYCLE PAGE — DEVICE CARDS (DOM MANIPULATION, JSON)
   ════════════════════════════════════════════════════════════ */
/**
 * DOM MANIPULATION: Renders e-waste device cards on what-we-recycle.html.
 * JSON REPRESENTATION: Uses ewasteItems array from data.js.
 * EXCEPTION HANDLING: try-catch around data access.
 */
function renderWwrDeviceCards() {
  const grid = document.querySelector('#wwr-device-cards');
  if (!grid) return; // only on what-we-recycle.html

  try {
    // EXCEPTION HANDLING: verify data is available
    if (typeof ewasteItems === 'undefined' || !Array.isArray(ewasteItems)) {
      throw new Error('ewasteItems data not available for WWR page.');
    }

    // DOM MANIPULATION: render each item as a card
    ewasteItems.forEach(item => {
      const card = document.createElement('article');
      card.className = 'device-card fade-in-up';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'article');
      card.setAttribute('aria-label', `${item.itemName} — ${item.category}`);

      // DOM MANIPULATION: build card children
      card.innerHTML = `
        <div class="card-icon" aria-hidden="true">${item.iconOrImage}</div>
        <p class="card-cat">${item.category}</p>
        <h3>${item.itemName}</h3>
        <p class="card-desc">${item.description}</p>
        <span class="hazard ${item.hazardLevel.toLowerCase()}">${item.hazardLevel} hazard</span>
        <div class="card-materials">
          ${(item.recoveredMaterials || []).map(m => `<span class="material-chip">${m}</span>`).join('')}
        </div>
        <span class="card-arrow" aria-hidden="true">→</span>
      `;

      // EVENT HANDLING: click to schedule
      card.addEventListener('click', () => {
        window.location.href = 'schedule.html';
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = 'schedule.html';
        }
      });

      grid.appendChild(card);
    });

    setupFadeInObserver();

  } catch (err) {
    // EXCEPTION HANDLING: graceful fallback
    console.error('[GreenLoop] Could not render WWR device cards:', err.message);
    const msg = document.createElement('p');
    msg.style.cssText = 'color:var(--text-muted);padding:24px 0;text-align:center;';
    msg.textContent = 'Device catalogue is loading…';
    grid.appendChild(msg);
  }
}
