// Sistema di autenticazione semplificato con configurazione esterna

let config = null;

// Carica configurazione
async function loadAuthConfig() {
    if (!config) {
        try {
            const response = await fetch('config.json');
            config = await response.json();
        } catch (error) {
            console.error('Errore caricamento configurazione auth:', error);
        }
    }
    return config;
}

// Verifica se l'utente è loggato
function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Verifica se l'utente è admin
function isAdmin() {
    return localStorage.getItem('userRole') === 'admin';
}

// Verifica se l'utente può modificare (admin o editor)
function canEdit() {
    const role = localStorage.getItem('userRole');
    return role === 'admin' || role === 'editor';
}

// Ottieni nome utente corrente
function getCurrentUser() {
    return localStorage.getItem('username');
}

// Ottieni ruolo utente corrente
function getUserRole() {
    return localStorage.getItem('userRole');
}

// Logout
function logout() {
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login-simple.html';
}

// Proteggi pagina (richiede login)
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login-simple.html';
        return false;
    }
    return true;
}

// Proteggi pagina admin
function requireAdmin() {
    if (!isLoggedIn() || !isAdmin()) {
        alert('Accesso negato: solo per amministratori');
        window.location.href = 'login-simple.html';
        return false;
    }
    return true;
}

// Proteggi pagina per editor (admin o editor)
function requireEditor() {
    if (!isLoggedIn() || !canEdit()) {
        alert('Accesso negato: permessi insufficienti');
        window.location.href = 'login-simple.html';
        return false;
    }
    return true;
}

// Aggiungi pulsante logout e info utente
function addLogoutButton() {
    const userInfo = document.createElement('div');
    userInfo.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background-color: #f8f9fa;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid #ddd;
        z-index: 1000;
        font-size: 14px;
    `;
    
    const username = getCurrentUser();
    const role = getUserRole();
    
    userInfo.innerHTML = `
        <div style="margin-bottom: 5px;"><strong>Utente:</strong> ${username}</div>
        <div style="margin-bottom: 10px;"><strong>Ruolo:</strong> ${role}</div>
        <button onclick="logout()" style="
            padding: 5px 10px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            width: 100%;
        ">Logout</button>
    `;
    
    document.body.appendChild(userInfo);
}
