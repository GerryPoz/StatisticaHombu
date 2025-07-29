// Sistema di autenticazione semplificato

// Verifica se l'utente è loggato
function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Verifica se l'utente è admin
function isAdmin() {
    return localStorage.getItem('userType') === 'admin';
}

// Logout
function logout() {
    localStorage.removeItem('userType');
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

// Aggiungi pulsante logout
function addLogoutButton() {
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 15px;
        background-color: #dc3545;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    `;
    logoutBtn.onclick = logout;
    document.body.appendChild(logoutBtn);
}
