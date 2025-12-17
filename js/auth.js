import {
  auth,
  googleProvider,
  signInWithRedirect,
  signOut,
  onAuthStateChanged
} from "./firebase.js";
  
  /* LOGIN */
  export async function loginWithGoogle() {
    await signInWithRedirect(auth, googleProvider);
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
  