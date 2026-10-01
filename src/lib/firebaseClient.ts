/**
 * Firebase Client SDK Initialization for 5ONG
 */
import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDemoDummyApiKeyFor5ONGPlayer2025',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'jf-player-510117.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'jf-player-510117',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'jf-player-510117.appspot.com',
  messagingSenderId: '560026340042',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:560026340042:web:5ongmusicplayerjf',
};

export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
