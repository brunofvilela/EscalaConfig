import {
    auth,
    googleProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
  } from "./firebase.js";
  
  /* LOGIN */
  export async function loginWithGoogle() {
    await signInWithPopup(auth, googleProvider);
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
  