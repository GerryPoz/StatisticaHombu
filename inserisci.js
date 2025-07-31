// Importa i moduli Firebase necessari
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Verifica autenticazione all'avvio
document.addEventListener("DOMContentLoaded", () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('Utente autenticato:', user.email);
            loadingScreen.classList.add('d-none');
            mainContent.classList.remove('d-none');
            inizializzaApp();
        } else {
            console.log('Utente non autenticato, reindirizzamento...');
            window.location.href = 'index.html';
        }
    });
});

// Funzione per inizializzare l'applicazione
function inizializzaApp() {
    // Popola Anno
    const anno = new Date().getFullYear();
    document.getElementById("anno").innerHTML = `
        <option value="${anno}" selected>${anno}</option>
        <option value="${anno + 1}">${anno + 1}</option>
    `;

    // Popola Mese
    const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    document.getElementById("mese").innerHTML = '<option value="">–</option>' + mesi.map(m => `<option>${m}</option>`).join("");

    // Popola Gruppo da gruppi.json
    fetch("gruppi.json")
        .then(res => res.json())
        .then(data => {
            const gruppi = [];
            for (const capitolo of Object.values(data["HOMBU 9"])) {
                for (const settore of Object.values(capitolo)) {
                    gruppi.push(...settore);
                }
            }
            document.getElementById("gruppo").innerHTML = '<option value="">–</option>' + gruppi.map(g => `<option>${g}</option>`).join("");
        })
        .catch(error => {
            console.error('Errore nel caricamento dei gruppi:', error);
            alert('Errore nel caricamento dei dati dei gruppi');
        });
    
    // Blocca caratteri non numerici, incolla e rotella del mouse
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener("keypress", e => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
        });
        input.addEventListener("paste", e => {
            const pasted = (e.clipboardData || window.clipboardData).getData("text");
            if (!/^\d+$/.test(pasted)) e.preventDefault();
        });
        input.addEventListener("wheel", e => e.target.blur());
    });

    // Attiva i calcoli in tempo reale
    document.querySelectorAll('#zadankai-table input[type="number"]').forEach(input => {
        input.addEventListener("input", calcolaTotaliZadankai);
    });
    document.querySelectorAll('#praticanti-table input[type="number"]').forEach(input => {
        input.addEventListener("input", calcolaTotaliPraticanti);
    });

    // Event listeners
    document.getElementById('dati-form').addEventListener('submit', salvasuFirebase);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    // Event listeners per caricare dati esistenti
    document.getElementById('anno').addEventListener('change', caricaDatiEsistenti);
    document.getElementById('mese').addEventListener('change', caricaDatiEsistenti);
    document.getElementById('gruppo').addEventListener('change', caricaDatiEsistenti);
}

// Funzione per il logout
function logout() {
    signOut(auth).then(() => {
        console.log('Logout effettuato');
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Errore durante il logout:', error);
        alert('Errore durante il logout');
    });
}

// Calcolo totali Zadankai
function calcolaTotaliZadankai() {
    const sezioni = ["m", "s", "o"];
    let totaleGenerale = 0;

    sezioni.forEach(sezione => {
        const u = +document.querySelector(`[name="zadankai_${sezione}_u"]`).value || 0;
        const d = +document.querySelector(`[name="zadankai_${sezione}_d"]`).value || 0;
        const gu = +document.querySelector(`[name="zadankai_${sezione}_gu"]`).value || 0;
        const gd = +document.querySelector(`[name="zadankai_${sezione}_gd"]`).value || 0;
        const somma = u + d + gu + gd;
        document.querySelector(`[name="zadankai_${sezione}_tot"]`).value = somma;
        totaleGenerale += somma;
    });

    document.querySelector(`[name="zadankai_totale_generale"]`).value = totaleGenerale;
}

// Calcolo totali Praticanti
function calcolaTotaliPraticanti() {
    const sezioni = ["m", "s"];
    let totaleGenerale = 0;

    sezioni.forEach(sezione => {
        const u = +document.querySelector(`[name="praticanti_${sezione}_u"]`).value || 0;
        const d = +document.querySelector(`[name="praticanti_${sezione}_d"]`).value || 0;
        const gu = +document.querySelector(`[name="praticanti_${sezione}_gu"]`).value || 0;
        const gd = +document.querySelector(`[name="praticanti_${sezione}_gd"]`).value || 0;
        const somma = u + d + gu + gd;
        document.querySelector(`[name="praticanti_${sezione}_tot"]`).value = somma;
        totaleGenerale += somma;
    });

    document.querySelector(`[name="praticanti_totale_generale"]`).value = totaleGenerale;
}

// Salvataggio su Firebase
function salvasuFirebase(e) {
    e.preventDefault();
    
    // Verifica autenticazione prima di salvare
    if (!auth.currentUser) {
        alert('Devi essere autenticato per salvare i dati');
        window.location.href = 'index.html';
        return;
    }
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const key = `${data.anno}-${data.mese}-${data.gruppo}`;

    const payload = {
        gruppo: data.gruppo,
        zadankai: {
          membri: {
            U: parseInt(data.zadankai_m_u) || 0,
            D: parseInt(data.zadankai_m_d) || 0,
            GU: parseInt(data.zadankai_m_gu) || 0,
            GD: parseInt(data.zadankai_m_gd) || 0,
            FUT: parseInt(data.zadankai_m_fut) || 0,
            STU: parseInt(data.zadankai_m_stu) || 0
          },
          simpatizzanti: {
            U: parseInt(data.zadankai_s_u) || 0,
            D: parseInt(data.zadankai_s_d) || 0,
            GU: parseInt(data.zadankai_s_gu) || 0,
            GD: parseInt(data.zadankai_s_gd) || 0,
            FUT: parseInt(data.zadankai_s_fut) || 0,
            STU: parseInt(data.zadankai_s_stu) || 0
          },
          ospiti: {
            U: parseInt(data.zadankai_o_u) || 0,
            D: parseInt(data.zadankai_o_d) || 0,
            GU: parseInt(data.zadankai_o_gu) || 0,
            GD: parseInt(data.zadankai_o_gd) || 0
          }
        },
        praticanti: {
          membri: {
            U: parseInt(data.praticanti_m_u) || 0,
            D: parseInt(data.praticanti_m_d) || 0,
            GU: parseInt(data.praticanti_m_gu) || 0,
            GD: parseInt(data.praticanti_m_gd) || 0
          },
          simpatizzanti: {
            U: parseInt(data.praticanti_s_u) || 0,
            D: parseInt(data.praticanti_s_d) || 0,
            GU: parseInt(data.praticanti_s_gu) || 0,
            GD: parseInt(data.praticanti_s_gd) || 0
          }
        }
    };

    // Salva su Firebase
    const dbRef = ref(database, `zadankai/${key}`);
    
    set(dbRef, payload)
        .then(() => {
            console.log('Dati salvati:', payload);
            document.getElementById('messaggio-successo').classList.remove('d-none');
            
            // Reset del form dopo 3 secondi
            //setTimeout(() => {
            //    document.getElementById('dati-form').reset();
            //    document.getElementById('messaggio-successo').classList.add('d-none');
            //}, 3000);
        })
        .catch((error) => {
            console.error('Errore nel salvataggio:', error);
            alert('Errore nel salvataggio dei dati: ' + error.message);
        });
}

// Funzione per caricare dati esistenti
function caricaDatiEsistenti() {
    const anno = document.getElementById('anno').value;
    const mese = document.getElementById('mese').value;
    const gruppo = document.getElementById('gruppo').value;
    
    // Verifica che tutti i campi siano selezionati
    if (!anno || !mese || !gruppo) {
        return;
    }
    
    const key = `${anno}-${mese}-${gruppo}`;
    const dbRef = ref(database, `zadankai/${key}`);
    
    get(dbRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                console.log('Dati esistenti trovati:', data);
                
                // Popola i campi ZADANKAI
                if (data.zadankai) {
                    // Membri
                    if (data.zadankai.membri) {
                        document.querySelector('input[name="zadankai_m_u"]').value = data.zadankai.membri.u || 0;
                        document.querySelector('input[name="zadankai_m_d"]').value = data.zadankai.membri.d || 0;
                        document.querySelector('input[name="zadankai_m_gu"]').value = data.zadankai.membri.gu || 0;
                        document.querySelector('input[name="zadankai_m_gd"]').value = data.zadankai.membri.gd || 0;
                        document.querySelector('input[name="zadankai_m_fut"]').value = data.zadankai.membri.fut || 0;
                        document.querySelector('input[name="zadankai_m_stu"]').value = data.zadankai.membri.stu || 0;
                    }
                    
                    // Simpatizzanti
                    if (data.zadankai.simpatizzanti) {
                        document.querySelector('input[name="zadankai_s_u"]').value = data.zadankai.simpatizzanti.u || 0;
                        document.querySelector('input[name="zadankai_s_d"]').value = data.zadankai.simpatizzanti.d || 0;
                        document.querySelector('input[name="zadankai_s_gu"]').value = data.zadankai.simpatizzanti.gu || 0;
                        document.querySelector('input[name="zadankai_s_gd"]').value = data.zadankai.simpatizzanti.gd || 0;
                        document.querySelector('input[name="zadankai_s_fut"]').value = data.zadankai.simpatizzanti.fut || 0;
                        document.querySelector('input[name="zadankai_s_stu"]').value = data.zadankai.simpatizzanti.stu || 0;
                    }
                    
                    // Ospiti
                    if (data.zadankai.ospiti) {
                        document.querySelector('input[name="zadankai_o_u"]').value = data.zadankai.ospiti.u || 0;
                        document.querySelector('input[name="zadankai_o_d"]').value = data.zadankai.ospiti.d || 0;
                        document.querySelector('input[name="zadankai_o_gu"]').value = data.zadankai.ospiti.gu || 0;
                        document.querySelector('input[name="zadankai_o_gd"]').value = data.zadankai.ospiti.gd || 0;
                        document.querySelector('input[name="zadankai_o_fut"]').value = data.zadankai.ospiti.fut || 0;
                        document.querySelector('input[name="zadankai_o_stu"]').value = data.zadankai.ospiti.stu || 0;
                    }
                }
                
                // Popola i campi PRATICANTI
                if (data.praticanti) {
                    // Membri
                    if (data.praticanti.membri) {
                        document.querySelector('input[name="praticanti_m_u"]').value = data.praticanti.membri.u || 0;
                        document.querySelector('input[name="praticanti_m_d"]').value = data.praticanti.membri.d || 0;
                        document.querySelector('input[name="praticanti_m_gu"]').value = data.praticanti.membri.gu || 0;
                        document.querySelector('input[name="praticanti_m_gd"]').value = data.praticanti.membri.gd || 0;
                    }
                    
                    // Simpatizzanti
                    if (data.praticanti.simpatizzanti) {
                        document.querySelector('input[name="praticanti_s_u"]').value = data.praticanti.simpatizzanti.u || 0;
                        document.querySelector('input[name="praticanti_s_d"]').value = data.praticanti.simpatizzanti.d || 0;
                        document.querySelector('input[name="praticanti_s_gu"]').value = data.praticanti.simpatizzanti.gu || 0;
                        document.querySelector('input[name="praticanti_s_gd"]').value = data.praticanti.simpatizzanti.gd || 0;
                    }
                }
                
                // Ricalcola i totali
                calcolaTotaliZadankai();
                calcolaTotaliPraticanti();
                
                // Mostra un messaggio di conferma
                alert('Dati esistenti caricati per la modifica!');
            } else {
                console.log('Nessun dato esistente trovato per questa combinazione');
                // Pulisci il form se non ci sono dati esistenti
                document.getElementById('dati-form').reset();
                // Ripristina i valori di anno, mese e gruppo
                document.getElementById('anno').value = anno;
                document.getElementById('mese').value = mese;
                document.getElementById('gruppo').value = gruppo;
            }
        })
        .catch((error) => {
            console.error('Errore nel caricamento dei dati:', error);
        });
}
