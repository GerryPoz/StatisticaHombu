import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const ADMIN_EMAILS = [
  'admin@hombu9.it',
  'pliplomail@gmail.com',
  'servizipliplo@gmail.com'
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const userEmailEl = document.getElementById('userEmail');
const statusEl = document.getElementById('status');
const downloadBtn = document.getElementById('downloadBtn');
const logoutBtn = document.getElementById('logoutBtn');

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('text-danger', isError);
  statusEl.classList.toggle('text-muted', !isError);
}

function formatTimestampForFilename(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

async function downloadBackup(user) {
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Download in corso…';
  setStatus('Scaricamento backup…');

  try {
    const snapshot = await get(ref(database));
    const payload = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      data: snapshot.val() ?? {}
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `hombu9-backup_${formatTimestampForFilename(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setStatus('Backup scaricato.');
  } catch (error) {
    setStatus(`Errore durante il backup: ${error?.message ?? error}`, true);
  } finally {
    downloadBtn.innerHTML = '<i class="fas fa-download me-2"></i>Scarica backup completo';
    downloadBtn.disabled = false;
  }
}

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } finally {
    window.location.href = 'index.html';
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  userEmailEl.textContent = user.email;
  const isAdmin = ADMIN_EMAILS.includes(user.email);
  if (!isAdmin) {
    setStatus('Accesso negato: utente non autorizzato.', true);
    setTimeout(() => {
      window.location.href = 'index1.html';
    }, 800);
    return;
  }

  setStatus('Pronto.');
  downloadBtn.disabled = false;
  downloadBtn.addEventListener('click', () => downloadBackup(user));
});

