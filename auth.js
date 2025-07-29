import { auth } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword 
} from 'firebase/auth';

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

// Funzione per verificare se l'utente è admin
export async function isAdmin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdTokenResult();
          resolve(token.claims.admin === true);
        } catch (error) {
          resolve(false);
        }
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
