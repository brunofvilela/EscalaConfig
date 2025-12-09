import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc,
    doc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
export const db = getFirestore(app);

export { collection, addDoc, getDocs, deleteDoc, doc };