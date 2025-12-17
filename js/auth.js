import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "/js/firebase.js";

/* LOGIN */
export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

/* LOGOUT */
export function logout() {
  return signOut(auth);
}

/* OBSERVA AUTH EM TEMPO REAL */
export function observeAuth(callback) {
  return onAuthStateChanged(auth, user => {
    console.log("🔐 Auth mudou:", user);
    callback(user);
  });
}
