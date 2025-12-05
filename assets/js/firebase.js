// Firebase Config (substitua pelo seu)
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "escalaconfig.firebaseapp.com",
  projectId: "escalaconfig",
  storageBucket: "escalaconfig.firebasestorage.app",
  messagingSenderId: "393446307606",
  appId: "1:393446307606:web:69f1f038edf659739e8237",
  measurementId: "G-160CC381TP"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
