/**
 * Firebase Client & Web SDK Initialization for 5ONG
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBD7BNL2dotB39DtACv8THFfLy0hYzh4ls",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "i5ong-music.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "i5ong-music",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "i5ong-music.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "631000245748",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:631000245748:web:decab3b4ffca3f68d005a1",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-JVCBEN02F5"
};

export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const clientFirestore = getFirestore(firebaseApp);
