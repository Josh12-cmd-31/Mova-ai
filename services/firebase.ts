import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB4C0wLf_hGRuSBNZ_FzJyoWHEn8ti3ntM",
  authDomain: "mova-a6ec6.firebaseapp.com",
  projectId: "mova-a6ec6",
  storageBucket: "mova-a6ec6.firebasestorage.app",
  messagingSenderId: "173698947730",
  appId: "1:173698947730:web:5cf12f6bf21ba3e211e44b",
  measurementId: "G-8MMSFTRB63"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const googleProvider = new GoogleAuthProvider();

// Auth Helper Functions
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
