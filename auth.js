import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { ref, get } from 'firebase/database';

// Funzione per il login
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Funzione per il logout
export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Lista degli admin (sostituisci con l'email del tuo utente admin)
const ADMIN_EMAILS = [
  'pliplomail@gmail.com'  // SOSTITUISCI CON LA TUA EMAIL
];

// Funzione per verificare se l'utente è admin
export function isAdmin() {
    const user = auth.currentUser;
    if (!user) return false;
    return ADMIN_EMAILS.includes(user.email);
}

// Funzione per verificare se l'utente è admin
export async function isAdmin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Verifica se l'email è nella lista admin
        const isAdminUser = ADMIN_EMAILS.includes(user.email);
        resolve(isAdminUser);
      } else {
        resolve(false);
      }
    });
  });
}

// Funzione per verificare se l'utente è autenticato
export function isAuthenticated() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      resolve(!!user);
    });
  });
}

// Listener per cambiamenti di autenticazione
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
