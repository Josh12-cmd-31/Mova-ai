
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4C0wLf_hGRuSBNZ_FzJyoWHEn8ti3ntM",
  authDomain: "mova-a6ec6.firebaseapp.com",
  projectId: "mova-a6ec6",
  storageBucket: "mova-a6ec6.firebasestorage.app",
  messagingSenderId: "173698947730",
  appId: "1:173698947730:web:5cf12f6bf21ba3e211e44b",
  measurementId: "G-8MMSFTRB63"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
