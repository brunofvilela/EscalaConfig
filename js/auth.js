import {
  auth,
  googleProvider,
  signInWithRedirect,
  onAuthStateChanged
} from "./firebase.js";

export function loginWithGoogle() {
  return signInWithRedirect(auth, googleProvider);
}

export function observeAuth(callback) {
  onAuthStateChanged(auth, callback);
}
  
  /* LOGOUT */
  export async function logout() {
    await signOut(auth);
  }
  
  /* PROTEÇÃO DE ROTAS */
  export function protectPage() {
    onAuthStateChanged(auth, user => {
      if (!user) {
        window.location.href = "login.html";
      }
    });
  }
  
  /* USUÁRIO ATUAL */
  export function getCurrentUser(callback) {
    onAuthStateChanged(auth, callback);
  }
  