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
  setupNavbar();
  setupFadeInObserver();
  setupRegistrationForm();   // register.html
  setupContactForm();        // contact.html
  setupFaq();               // contact.html
  setupSchedulePage();       // schedule.html
  loadMalformedDraftDemo(); // Exception Handling demo (schedule.html)
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
  }

  // EVENT HANDLING: Scroll listener for header style
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
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
  }, { threshold: 0.12 });

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
    const wrapper = errorSpan.closest('.form-group') || errorSpan.parentElement;
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
    const wrapper = errorSpan.closest('.form-group') || errorSpan.parentElement;
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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      // FORM VALIDATION: use HTML5 validity + custom check
      const name    = form.elements['contactName'].value.trim();
      const email   = form.elements['contactEmail'].value.trim();
      const subject = form.elements['subject'].value;
      const message = form.elements['message'].value.trim();

      let valid = true;
      if (name.length < 2)            { valid = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { valid = false; }
      if (!subject)                   { valid = false; }
      if (message.length < 10)        { valid = false; }

      if (valid) {
        // DOM MANIPULATION: inject success message
        setStatus(statusEl, 'success',
          '✓ Message sent! Our team will reply within 1–2 business days.');
        form.reset();
      } else {
        // FORM VALIDATION: browser native validity UI as fallback
        form.reportValidity();
        setStatus(statusEl, 'error', 'Please fill in all fields correctly.');
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
      const answer  = btn.nextElementSibling; // .faq-answer
      const isOpen  = btn.getAttribute('aria-expanded') === 'true';
      const icon    = btn.querySelector('.faq-icon');

      // EVENT HANDLING: close all others first (accordion pattern)
      faqBtns.forEach(other => {
        if (other !== btn) {
          other.setAttribute('aria-expanded', 'false');
          const otherAnswer = other.nextElementSibling;
          const otherIcon   = other.querySelector('.faq-icon');
          if (otherAnswer) otherAnswer.classList.remove('open');
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
    emptyCell.textContent = 'No items match your search. Try a different keyword or category.';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);

    // DOM MANIPULATION: empty card state
    const emptyMsg = document.createElement('p');
    emptyMsg.style.cssText = 'color:var(--text-muted);padding:24px 0;';
    emptyMsg.textContent = 'No matching items found.';
    cardsGrid.appendChild(emptyMsg);
    return;
  }

  items.forEach(item => {
    // ── TABLE ROW ──────────────────────────────────────────
    // DOM MANIPULATION: createElement for each cell
    const row = document.createElement('tr');

    const cellIcon = document.createElement('td');
    cellIcon.style.fontSize = '1.4rem';
    cellIcon.textContent = item.iconOrImage;

    const cellName = document.createElement('td');
    const nameEm = document.createElement('span');
    nameEm.className = 'cell-em';
    nameEm.textContent = item.itemName;
    cellName.appendChild(nameEm);

    const cellCat = document.createElement('td');
    cellCat.textContent = item.category;
    cellCat.style.color = 'var(--text-sub)';

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
    card.className = 'item-card tilt-card fade-in-up';

    const iconEl = document.createElement('div');
    iconEl.className = 'card-icon';
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
      materialsEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;';
      item.recoveredMaterials.forEach(mat => {
        const chip = document.createElement('span');
        chip.style.cssText = 'font-size:.7rem;padding:3px 9px;border-radius:99px;background:rgba(255,255,255,.05);color:var(--text-muted);border:1px solid var(--border);';
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
  let sortedDesc     = false; // track sort direction

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
    chipsEl.appendChild(chip);
  });

  // EVENT HANDLING: search input (live filter)
  searchEl.addEventListener('input', applyFilters);

  // EVENT HANDLING: category chip clicks (event delegation on container)
  chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    activeCategory = chip.dataset.cat;
    // DOM MANIPULATION: update chip active state
    chipsEl.querySelectorAll('.chip').forEach(c =>
      c.classList.toggle('active', c === chip)
    );
    applyFilters();
  });

  // EVENT HANDLING: sort by hazard level button (toggle)
  sortBtn.addEventListener('click', () => {
    sortedDesc = !sortedDesc;
    // DOM MANIPULATION: update button label to reflect state
    sortBtn.textContent = sortedDesc
      ? '↓ Hazard: High → Low'
      : '↑ Sort by Hazard';
    applyFilters();
  });
}

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
    ['pickup-name',     fullName.length >= 2,         'Enter your full name.'],
    ['pickup-address',  address.length >= 10,         'Enter a complete pickup address (10+ characters).'],
    ['itemType',        itemTypes.length > 0,         'Select at least one item type to collect.'],
    ['pickup-quantity', !isNaN(quantity) && quantity >= 1 && quantity <= 50,
                                                      'Enter a quantity between 1 and 50.'],
    ['pickup-date',     Boolean(date),                'Choose a preferred pickup date.'],
    ['pickup-time',     Boolean(time),                'Select a time slot.'],
    ['condition',       Boolean(condition),           'Select the condition of your item(s).']
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
function renderPickups() {
  const tbody = document.querySelector('#pickups-table-body');
  if (!tbody) return;

  // DOM MANIPULATION: clear and rebuild
  tbody.innerHTML = '';

  if (!pickupsStore.length) {
    const emptyRow  = document.createElement('tr');
    emptyRow.className = 'empty-row';
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 6;
    emptyCell.textContent = 'No pickups scheduled yet. Your confirmed requests will appear here.';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
    return;
  }

  pickupsStore.forEach((pickup, index) => {
    // DOM MANIPULATION: createElement for each cell
    const row = document.createElement('tr');

    // Add a delete button cell
    const data = [
      `#${index + 1}`,
      pickup.name,
      pickup.items.join(', '),
      String(pickup.quantity),
      `${pickup.date} · ${pickup.time}`,
      pickup.condition
    ];

    data.forEach(val => {
      const td = document.createElement('td');
      td.textContent = val;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });
}

/**
 * EVENT HANDLING + DOM MANIPULATION: Full schedule page initialisation.
 * Loads JSON data, wires filters, wires form submit into in-memory store.
 */
function setupSchedulePage() {
  const form     = document.querySelector('#schedule-form');
  const statusEl = document.querySelector('#schedule-status');
  if (!form) return;

  // JSON REPRESENTATION: load items via safe loader
  const items = safelyLoadItems();

  // DOM MANIPULATION: initial render
  renderItems(items);

  // EVENT HANDLING: setup filter/sort controls
  setupCatalogueFilters(items);

  // Initial render of (empty) pickups table
  renderPickups();

  // EVENT HANDLING: clear errors on user input
  form.addEventListener('input',  (e) => clearFieldError(e.target.id || e.target.name));
  form.addEventListener('change', (e) => clearFieldError(e.target.id || e.target.name));

  // EVENT HANDLING: pickup form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hideStatus(statusEl);

    try {
      // EXCEPTION HANDLING: wrap entire submit in try-catch
      getRequiredField(form, 'fullName', statusEl);
      getRequiredField(form, 'address', statusEl);

      // FORM VALIDATION
      if (!validatePickupForm(form)) {
        const firstErr = form.querySelector('[data-error-for]:not(:empty)');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setStatus(statusEl, 'error', 'Please correct the highlighted fields above.');
        return;
      }

      // DOM MANIPULATION: collect form data and push to in-memory store
      const newPickup = {
        name:      form.elements['fullName'].value.trim(),
        address:   form.elements['address'].value.trim(),
        items:     [...form.querySelectorAll('input[name="itemType"]:checked')].map(cb => cb.value),
        quantity:  form.elements['quantity'].value,
        date:      form.elements['date'].value,
        time:      form.elements['time'].value,
        condition: form.querySelector('input[name="condition"]:checked').value,
        instructions: form.elements['instructions'] ? form.elements['instructions'].value.trim() : ''
      };

      pickupsStore.push(newPickup);

      // DOM MANIPULATION: re-render the pickups table with new entry
      renderPickups();

      // DOM MANIPULATION: success status
      setStatus(statusEl, 'success',
        `✓ Pickup #${pickupsStore.length} confirmed! Scroll down to see your scheduled pickups.`);

      form.reset();

      // Scroll to pickups section
      const pickupsSection = document.querySelector('.pickups-section');
      if (pickupsSection) {
        setTimeout(() => pickupsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
      }

    } catch (err) {
      // EXCEPTION HANDLING: catch unexpected errors during scheduling
      console.error('[GreenLoop] Schedule form error:', err);
      setStatus(statusEl, 'error',
        `Unable to schedule pickup: ${err.message}. Please refresh and try again.`);
    }
  });
}
