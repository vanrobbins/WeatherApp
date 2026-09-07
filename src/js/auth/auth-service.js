/**
 * Authentication, wrapped in the app's own vocabulary.
 *
 * The rest of the app never imports the Firebase auth SDK directly — it calls
 * these functions. Two reasons: the CDN import URL lives in exactly one place
 * (firebase.js), and Firebase's error codes never reach the UI. Every failure
 * is translated to a sentence a person can act on, thrown as an AuthError.
 *
 * Mirrors the WeatherApiError pattern in api/weather-api.js: one typed error,
 * a human message on `.message`.
 */

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as fbSignOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

import { auth } from './firebase.js';

const provider = new GoogleAuthProvider();

export class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

// Firebase codes → sentences. Anything unmapped falls back to a calm generic,
// so a new SDK code can never surface as "auth/internal-error" to a user.
const MESSAGES = {
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'That email and password don’t match.',
  'auth/invalid-credential': 'That email and password don’t match.',
  'auth/email-already-in-use': 'There’s already an account with that email. Try signing in.',
  'auth/weak-password': 'Choose a password of at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Can’t reach the network. Check your connection.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and retry.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/operation-not-allowed':
    'This sign-in method isn’t enabled for the project yet.',
};

function toAuthError(error) {
  const code = error?.code ?? '';
  const message = MESSAGES[code] ?? 'Something went wrong. Please try again.';
  return new AuthError(message, code);
}

/**
 * Subscribe to sign-in state. Fires immediately with the current user (or null)
 * and again on every change.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} unsubscribe
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signUp(email, password) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    return user;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signIn(email, password) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return user;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signInWithGoogle() {
  try {
    const { user } = await signInWithPopup(auth, provider);
    return user;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signOut() {
  try {
    await fbSignOut(auth);
  } catch (error) {
    throw toAuthError(error);
  }
}
