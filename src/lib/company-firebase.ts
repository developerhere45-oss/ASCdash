"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
};

const companyFirebaseAppName = "apnaservo-company-dashboard";

export function companyFirebaseAuth() {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error("Firebase web configuration is missing.");
  }
  const app = getApps().some((entry) => entry.name === companyFirebaseAppName)
    ? getApp(companyFirebaseAppName)
    : initializeApp(firebaseConfig, companyFirebaseAppName);
  const auth = getAuth(app);
  void setPersistence(auth, browserLocalPersistence);
  return auth;
}

export const companyGoogleProvider = new GoogleAuthProvider();
companyGoogleProvider.setCustomParameters({ prompt: "select_account" });

export const companyBackendUrl = (process.env.NEXT_PUBLIC_APNASERVO_BACKEND_URL || "https://apnaservobk-1.onrender.com")
  .replace(/\/+$/, "");
