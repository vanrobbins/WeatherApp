/**
 * The sign-in screen's form.
 *
 * One form serves both signing in and signing up — a mode toggle swaps the copy
 * and the submit behaviour, matching the canvas's single night panel. All the
 * DOM already exists in index.html; this module gives it behaviour and routes
 * every action through auth-service, whose errors arrive as plain sentences.
 *
 * Success is not handled here beyond clearing the form: Firebase's auth-state
 * listener in main.js is the single place that reacts to a user appearing or
 * disappearing. This module only reports failure and hands off via `onAuthed`.
 */

import { qs } from '../util/dom.js';

// The auth service pulls in the Firebase SDK, so it's imported on demand — the
// form wires up on boot, but the ~130KB of Firebase only loads once someone
// actually tries to sign in. The dynamic import is cached by the module system.
const authService = () => import('../auth/auth-service.js');

// Copy for each mode, so the swap is data, not scattered conditionals.
const COPY = {
  signin: {
    switchLabel: 'New here?',
    title: 'Welcome back',
    submit: 'Sign in',
    busy: 'Signing in…',
    toggle: 'Create an account',
    passwordAutocomplete: 'current-password',
  },
  signup: {
    switchLabel: 'Have an account?',
    title: 'Create your account',
    submit: 'Create account',
    busy: 'Creating account…',
    toggle: 'Sign in instead',
    passwordAutocomplete: 'new-password',
  },
};

let mode = 'signin';
let onAuthed = () => {};

const form = () => qs('[data-auth-form]');
const emailInput = () => qs('#auth-email');
const passwordInput = () => qs('#auth-password');
const formError = () => qs('[data-auth-error]');
const submitButton = () => qs('[data-auth-submit]');

export function initAuthForm({ onAuthed: onSuccess } = {}) {
  if (onSuccess) onAuthed = onSuccess;

  form().addEventListener('submit', onSubmit);
  qs('[data-auth-mode-toggle]')?.addEventListener('click', toggleMode);
  qs('[data-google-signin]')?.addEventListener('click', onGoogle);
  qs('[data-forgot-password]')?.addEventListener('click', onForgot);
  qs('[data-toggle-password]')?.addEventListener('click', togglePassword);

  applyMode();
}

// -- Mode ---------------------------------------------------------------------

function toggleMode() {
  mode = mode === 'signin' ? 'signup' : 'signin';
  applyMode();
}

function applyMode() {
  const copy = COPY[mode];
  setText('[data-auth-switch-label]', copy.switchLabel);
  setText('[data-auth-title]', copy.title);
  setText('[data-auth-mode-toggle]', copy.toggle);
  submitButton().textContent = copy.submit;
  passwordInput().setAttribute('autocomplete', copy.passwordAutocomplete);
  clearErrors();
}

// -- Submit -------------------------------------------------------------------

async function onSubmit(event) {
  event.preventDefault();
  clearErrors();
  if (!validate()) return;

  const email = emailInput().value.trim();
  const password = passwordInput().value;

  await run(async () => {
    const svc = await authService();
    const action = mode === 'signup' ? svc.signUp : svc.signIn;
    return action(email, password);
  });
}

async function onGoogle() {
  clearErrors();
  await run(async () => (await authService()).signInWithGoogle());
}

async function onForgot() {
  clearErrors();
  const email = emailInput().value.trim();
  if (!email) {
    showFieldError('email', 'Enter your email first, then tap Forgot password.');
    emailInput().focus();
    return;
  }

  try {
    const { resetPassword } = await authService();
    await resetPassword(email);
    // The same alert region carries the good news — it's the one spot the user
    // is already looking after acting.
    showFormMessage(`If an account exists for ${email}, a reset link is on its way.`);
  } catch (error) {
    showFormMessage(error.message);
  }
}

/**
 * Run an auth call with the submit button locked, then either hand off on
 * success or surface the sentence auth-service gave us.
 */
async function run(call) {
  setBusy(true);
  try {
    await call();
    reset();
    onAuthed();
  } catch (error) {
    showFormMessage(error.message);
  } finally {
    setBusy(false);
  }
}

// -- Validation ---------------------------------------------------------------

function validate() {
  let ok = true;

  const email = emailInput();
  if (!email.value.trim()) {
    showFieldError('email', 'Enter your email address.');
    ok = false;
  } else if (!email.checkValidity()) {
    showFieldError('email', 'That email address doesn’t look right.');
    ok = false;
  }

  const password = passwordInput();
  if (password.value.length < 6) {
    showFieldError('password', 'Passwords are at least 6 characters.');
    ok = false;
  }

  return ok;
}

// -- Password reveal ----------------------------------------------------------

function togglePassword(event) {
  const button = event.currentTarget;
  const input = passwordInput();
  const revealed = input.type === 'text';
  input.type = revealed ? 'password' : 'text';
  button.textContent = revealed ? 'Show' : 'Hide';
  button.setAttribute('aria-pressed', String(!revealed));
}

// -- DOM helpers --------------------------------------------------------------

function setBusy(busy) {
  const button = submitButton();
  button.disabled = busy;
  button.textContent = busy ? COPY[mode].busy : COPY[mode].submit;
}

function setText(selector, text) {
  const node = qs(selector);
  if (node) node.textContent = text;
}

function showFieldError(field, message) {
  const node = qs(`[data-error-for="${field}"]`);
  if (node) node.textContent = message;
}

function showFormMessage(message) {
  formError().textContent = message;
}

function clearErrors() {
  formError().textContent = '';
  showFieldError('email', '');
  showFieldError('password', '');
}

function reset() {
  form().reset();
  clearErrors();
}
