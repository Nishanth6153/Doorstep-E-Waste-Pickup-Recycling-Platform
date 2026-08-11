/* ============================================================
   auth.js — GreenLoop Authentication Client
   Clean, simple, production-ready frontend integration logic:
   - Real User Registration & Password Hashing Backend (/api/auth/register)
   - Real User Login (/api/auth/login)
   - Session Check (/api/auth/me) & Sign Out (/api/auth/logout)
   - Password Recovery Request (/api/auth/forgot-password)
   - Return Path Redirect Handling (?redirect=...)
   - Protected Route Guard Check
   ============================================================ */

'use strict';

const API_BASE = '/api/auth';

document.addEventListener('DOMContentLoaded', () => {
  setupNavbarAuthLinks();
  checkBackendSession();
  setupLoginForm();
  setupRegistrationFormBackend();
  setupForgotPasswordForm();
  setupVerifyEmailPage();
});

/* ════════════════════════════════════════════════════════════
   1. REAL BACKEND SESSION CHECK & NAVBAR RENDERING
   ════════════════════════════════════════════════════════════ */
async function checkBackendSession() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  sessionStorage.removeItem('GREENLOOP_SESSION');

  const token = localStorage.getItem('GREENLOOP_TOKEN');

  if (!token) {
    renderLoggedOutNavbar();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        if (currentPath === 'login.html' && !getRedirectParam()) {
          // If on login page without redirect target, clear old token for fresh login
          handleLogoutSilent();
          return;
        }
        renderLoggedInNavbar(data.user);
      } else {
        localStorage.removeItem('GREENLOOP_TOKEN');
        renderLoggedOutNavbar();
      }
    } else {
      localStorage.removeItem('GREENLOOP_TOKEN');
      renderLoggedOutNavbar();
    }
  } catch (e) {
    console.warn('Backend session check error:', e);
  }
}

function getRedirectParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') || null;
}

function renderLoggedInNavbar(user) {
  const siteNav = document.getElementById('site-nav');
  if (!siteNav) return;

  const loginLinks = siteNav.querySelectorAll('a[href="login.html"], a[href="register.html"]');
  loginLinks.forEach(link => link.remove());

  // Ensure "My Pickups" link exists in navbar when authenticated
  if (!siteNav.querySelector('a[href="schedule.html#my-pickups"]')) {
    const myPickupsLink = document.createElement('a');
    myPickupsLink.href = 'schedule.html#my-pickups';
    myPickupsLink.textContent = 'My Pickups';
    
    const contactLink = siteNav.querySelector('a[href="contact.html"]');
    if (contactLink) {
      siteNav.insertBefore(myPickupsLink, contactLink);
    }
  }

  if (!document.getElementById('nav-user-badge')) {
    const userBadge = document.createElement('div');
    userBadge.id = 'nav-user-badge';
    userBadge.style.cssText = 'display:flex;align-items:center;gap:8px;margin-left:6px;';
    userBadge.innerHTML = `
      <span style="background:var(--accent);color:#fff;padding:5px 14px;border-radius:100px;font-size:.825rem;font-weight:700;">
        🌱 ${escapeHtml(user.name || user.email.split('@')[0])}
      </span>
      <button type="button" id="btn-nav-logout" style="background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:5px 12px;border-radius:var(--radius-sm);font-size:.8rem;font-weight:600;cursor:pointer;">
        Sign Out
      </button>
    `;

    const cta = siteNav.querySelector('.nav-cta');
    if (cta) {
      siteNav.insertBefore(userBadge, cta);
    } else {
      siteNav.appendChild(userBadge);
    }

    document.getElementById('btn-nav-logout')?.addEventListener('click', handleLogout);
  }
}

function renderLoggedOutNavbar() {
  const userBadge = document.getElementById('nav-user-badge');
  if (userBadge) userBadge.remove();
}

function handleLogoutSilent() {
  const token = localStorage.getItem('GREENLOOP_TOKEN');
  if (token) {
    try {
      fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    } catch (e) {}
    localStorage.removeItem('GREENLOOP_TOKEN');
  }
  sessionStorage.removeItem('GREENLOOP_SESSION');
  renderLoggedOutNavbar();
}

async function handleLogout() {
  handleLogoutSilent();
  window.location.href = 'login.html';
}

function setupNavbarAuthLinks() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.site-nav a');
  
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href')?.split('/').pop();
    if (linkPath === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* ════════════════════════════════════════════════════════════
   2. EMAIL VALIDATION UTILITY
   ════════════════════════════════════════════════════════════ */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

function setFieldError(fieldId, errorMsg) {
  const inputEl = document.getElementById(fieldId);
  const errorEl = document.querySelector(`[data-error-for="${fieldId}"]`);
  
  if (inputEl) {
    if (errorMsg) {
      inputEl.classList.add('invalid');
      inputEl.setAttribute('aria-invalid', 'true');
    } else {
      inputEl.classList.remove('invalid');
      inputEl.removeAttribute('aria-invalid');
    }
  }

  if (errorEl) {
    errorEl.textContent = errorMsg || '';
  }
}

/* ════════════════════════════════════════════════════════════
   3. LOGIN FORM (REST API + RETURN PATH REDIRECT)
   ════════════════════════════════════════════════════════════ */
function setupLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const submitLoginBtn = document.getElementById('btn-submit-login');
  const togglePasswordBtn = document.getElementById('toggle-password-btn');

  // Input error clearing on type
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      if (emailInput.value.trim() && isValidEmail(emailInput.value)) {
        setFieldError('auth-email', '');
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      if (passwordInput.value.trim()) {
        setFieldError('auth-password', '');
      }
    });
  }

  // Password visibility toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.textContent = isPassword ? '🔒' : '👁';
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }

  // Submit Handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    let hasError = false;

    if (!email) {
      setFieldError('auth-email', 'Please enter your email address.');
      hasError = true;
    } else if (!isValidEmail(email)) {
      setFieldError('auth-email', 'Please enter a valid email address.');
      hasError = true;
    } else {
      setFieldError('auth-email', '');
    }

    if (!password) {
      setFieldError('auth-password', 'Please enter your password.');
      hasError = true;
    } else {
      setFieldError('auth-password', '');
    }

    if (hasError) return;

    setButtonLoading(submitLoginBtn, true, 'Signing in...');

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      setButtonLoading(submitLoginBtn, false, 'Sign In');

      if (res.ok && data.success) {
        localStorage.setItem('GREENLOOP_TOKEN', data.token);
        showDevStatusNotice(`Login successful! Welcome back, ${data.user.name}.`, 'success');
        
        const redirectUrl = getRedirectParam() || 'index.html';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 600);
      } else {
        setFieldError('auth-password', data.error || 'Invalid email or password.');
      }
    } catch (e) {
      setButtonLoading(submitLoginBtn, false, 'Sign In');
      showDevStatusNotice('Server connection failure. Verify backend server is running.', 'error');
    }
  });
}

/* ════════════════════════════════════════════════════════════
   4. REGISTRATION HANDLER FOR register.html
   ════════════════════════════════════════════════════════════ */
function setupRegistrationFormBackend() {
  const regForm = document.getElementById('registration-form');
  if (!regForm) return;

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const accountTypeRad = document.querySelector('input[name="accountType"]:checked');
    const submitBtn = regForm.querySelector('button[type="submit"]');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const accountType = accountTypeRad ? accountTypeRad.value : 'Individual';

    if (!name || !email || !password) return;

    if (submitBtn) setButtonLoading(submitBtn, true, 'Creating Account...');

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, accountType })
      });

      const data = await res.json();
      if (submitBtn) setButtonLoading(submitBtn, false, 'Create Account');

      if (res.ok && data.success) {
        localStorage.setItem('GREENLOOP_TOKEN', data.token);
        showDevStatusNotice('Account created successfully! Redirecting...', 'success');
        
        const redirectUrl = getRedirectParam() || 'index.html';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 700);
      } else {
        showDevStatusNotice(data.error || 'Registration failed.', 'error');
      }
    } catch (err) {
      if (submitBtn) setButtonLoading(submitBtn, false, 'Create Account');
      showDevStatusNotice('Backend connection failure.', 'error');
    }
  });
}

/* ════════════════════════════════════════════════════════════
   5. FORGOT PASSWORD & VERIFY EMAIL BACKEND HOOKS
   ════════════════════════════════════════════════════════════ */
function setupForgotPasswordForm() {
  const forgotForm = document.getElementById('forgot-password-form');
  if (!forgotForm) return;

  const emailInput = document.getElementById('forgot-email');
  const submitBtn = document.getElementById('btn-send-reset');

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawEmail = emailInput ? emailInput.value.trim() : '';

    if (!rawEmail || !isValidEmail(rawEmail)) {
      setFieldError('forgot-email', 'Please enter a valid email address.');
      return;
    }

    setFieldError('forgot-email', '');
    setButtonLoading(submitBtn, true, 'Dispatching link...');

    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rawEmail })
      });
      const data = await res.json();
      setButtonLoading(submitBtn, false, 'Send Reset Link');
      showDevStatusNotice(data.message || 'Password reset link sent.', 'success');
    } catch (e) {
      setButtonLoading(submitBtn, false, 'Send Reset Link');
      showDevStatusNotice('Server connection error.', 'error');
    }
  });
}

function setupVerifyEmailPage() {
  const resendBtn = document.getElementById('btn-resend-verification');
  if (!resendBtn) return;

  resendBtn.addEventListener('click', () => {
    if (resendBtn.disabled) return;
    setButtonLoading(resendBtn, true, 'Sending verification email...');

    setTimeout(() => {
      setButtonLoading(resendBtn, false, 'Resend verification email');
      showDevStatusNotice('A fresh verification link has been sent to your inbox.', 'success');
      startResendCooldown(60);
    }, 600);
  });

  function startResendCooldown(seconds) {
    let timeLeft = seconds;
    resendBtn.disabled = true;
    resendBtn.style.opacity = '0.7';

    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timer);
        resendBtn.disabled = false;
        resendBtn.style.opacity = '1';
        resendBtn.textContent = 'Resend verification email';
      } else {
        resendBtn.textContent = `Resend available in ${timeLeft}s`;
      }
    }, 1000);
  }
}

/* ════════════════════════════════════════════════════════════
   6. UI NOTIFICATION & HTML HELPERS
   ════════════════════════════════════════════════════════════ */
function setButtonLoading(buttonEl, isLoading, textContent) {
  if (!buttonEl) return;
  buttonEl.disabled = isLoading;
  if (isLoading) {
    buttonEl.dataset.originalText = buttonEl.textContent;
    buttonEl.innerHTML = `<span class="auth-spinner" aria-hidden="true"></span> ${textContent}`;
  } else {
    buttonEl.textContent = textContent || buttonEl.dataset.originalText || 'Submit';
  }
}

function showDevStatusNotice(message, type = 'info') {
  let statusBox = document.getElementById('auth-dev-notice');
  
  if (!statusBox) {
    const formCard = document.querySelector('.form-card') || document.querySelector('.form-page-copy');
    if (!formCard) return;
    
    statusBox = document.createElement('div');
    statusBox.id = 'auth-dev-notice';
    statusBox.setAttribute('role', 'status');
    statusBox.setAttribute('aria-live', 'polite');
    formCard.insertBefore(statusBox, formCard.firstChild);
  }

  statusBox.className = `auth-dev-alert alert-${type} fade-in-up visible`;
  
  const icons = {
    info: 'ℹ️',
    warning: '⚙️',
    error: '⚠️',
    success: '✅'
  };

  statusBox.innerHTML = `
    <div class="auth-dev-alert-icon" aria-hidden="true">${icons[type] || 'ℹ️'}</div>
    <div class="auth-dev-alert-content">
      <strong>${type === 'success' ? 'Authenticated' : type === 'error' ? 'Authentication Error' : 'Notice'}</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[match]));
}
