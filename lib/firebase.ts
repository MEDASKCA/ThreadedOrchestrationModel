import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAWzAZiMVlGU1h7CLZRR1Qc-0BxKkIDNW4",
  authDomain: "medaskca-93d48.firebaseapp.com",
  projectId: "medaskca-93d48",
  storageBucket: "medaskca-93d48.firebasestorage.app",
  messagingSenderId: "830746933399",
  appId: "1:830746933399:web:b94a042718d64989f7d1d2",
  measurementId: "G-ETHE315F6E",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
