import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  getDoc,
  setDoc,
  startAfter,
  runTransaction,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// 🔧 CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAVYJ0l4XDFn5qXkid75LI7iggX3FlxGS8",
  authDomain: "escalaconfig.firebaseapp.com",
  projectId: "escalaconfig",
  storageBucket: "escalaconfig.firebasestorage.app",
  messagingSenderId: "393446307606",
  appId: "1:393446307606:web:69f1f038edf659739e8237",
  measurementId: "G-160CC381TP"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

const googleProvider = new GoogleAuthProvider();

export {
  // firestore
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  getDoc,
  setDoc,
  startAfter,
  runTransaction,
  onSnapshot,

  // auth
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged
};