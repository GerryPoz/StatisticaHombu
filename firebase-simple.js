// Configurazione Firebase semplificata
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// LA TUA CONFIGURAZIONE FIREBASE (sostituisci con i tuoi dati)
const firebaseConfig = {
  apiKey: "AIzaSyDeQ4BExKI3IbGbMF4bo2lFDqIsQqJqICU",
  authDomain: "test-statistiche.firebaseapp.com",
  databaseURL: "https://test-statistiche-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "test-statistiche",
  storageBucket: "test-statistiche.firebasestorage.app",
  messagingSenderId: "86783623273",
  appId: "1:86783623273:web:c97117774be570b53ae2f8",
  measurementId: "G-EQ5ZXG1YFB"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Definisci utenti admin
const ADMIN_EMAILS = ['admin@test.com'];

// Funzione di login
window.loginUser = async function(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Determina ruolo e redirect
        const isAdmin = ADMIN_EMAILS.includes(user.email);
        
        if (isAdmin) {
            window.location.href = 'visualizza3.html';
        } else {
            window.location.href = 'index1.html';
        }
    } catch (error) {
        throw new Error('Credenziali non valide');
    }
};

// Funzione di logout
window.logoutUser = function() {
    signOut(auth).then(() => {
        window.location.href = 'login-firebase.html';
    });
};

// Funzione per verificare se è admin
window.isAdmin = function() {
    const user = auth.currentUser;
    return user && ADMIN_EMAILS.includes(user.email);
};

// Funzione per verificare autenticazione
window.requireAuth = function(adminOnly = false) {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Non autenticato
            window.location.href = 'login-firebase.html';
            return;
        }
        
        if (adminOnly && !ADMIN_EMAILS.includes(user.email)) {
            // Non è admin ma serve ruolo admin
            window.location.href = 'login-firebase.html';
            return;
        }
        
        // Tutto ok, aggiungi bottone logout
        addLogoutButton();
    });
};

// Aggiungi bottone logout
function addLogoutButton() {
    // Rimuovi bottone esistente se presente
    const existingBtn = document.getElementById('logout-btn');
    if (existingBtn) existingBtn.remove();
    
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        z-index: 1000;
        font-family: Arial, sans-serif;
    `;
    logoutBtn.onclick = window.logoutUser;
    document.body.appendChild(logoutBtn);
}
