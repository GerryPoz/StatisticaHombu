import { isAuthenticated, isAdmin } from './auth.js';

// Protegge le pagine richiedendo autenticazione
export async function requireAuth() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    alert('Devi effettuare il login per accedere a questa pagina.');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Protegge le pagine richiedendo privilegi admin
export async function requireAdmin() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    alert('Devi effettuare il login per accedere a questa pagina.');
    window.location.href = 'login.html';
    return false;
  }
  
  const admin = await isAdmin();
  if (!admin) {
    alert('Non hai i privilegi necessari per accedere a questa pagina.');
    window.location.href = 'visualizza3.html';
    return false;
  }
  return true;
}

// Aggiunge il pulsante logout alle pagine
export function addLogoutButton() {
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Logout';
  logoutBtn.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
    padding: 8px 16px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  
  logoutBtn.addEventListener('click', async () => {
    const { logout } = await import('./auth.js');
    const result = await logout();
    if (result.success) {
      window.location.href = 'login.html';
    }
  });
  
  document.body.appendChild(logoutBtn);
}
