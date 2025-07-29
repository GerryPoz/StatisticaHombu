import { login, onAuthChange } from './auth.js';

// Verifica se l'utente è già loggato
onAuthChange((user) => {
    if (user) {
        // Utente già loggato, reindirizza
        window.location.href = 'visualizza3.html';
    }
});

// Gestione del form di login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    
    // Mostra loading
    loginBtn.disabled = true;
    loading.style.display = 'block';
    errorMessage.style.display = 'none';
    
    try {
        const result = await login(email, password);
        
        if (result.success) {
            // Login riuscito
            window.location.href = 'visualizza3.html';
        } else {
            // Errore nel login
            errorMessage.textContent = 'Email o password non corretti';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'Errore di connessione. Riprova.';
        errorMessage.style.display = 'block';
    } finally {
        // Nascondi loading
        loginBtn.disabled = false;
        loading.style.display = 'none';
    }
});
