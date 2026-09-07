/**
 * Firebase, initialised once.
 *
 * No bundler in this project, so the SDK is loaded as ES modules straight from
 * Google's CDN, pinned to an exact version. The v10 SDK is modular: each
 * `getX` is tree-shakeable and we only ever pull `app`, `auth` and `firestore`.
 *
 * Everything else imports `auth` and `db` from here, so the app is initialised
 * exactly once regardless of how many modules touch Firebase.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
