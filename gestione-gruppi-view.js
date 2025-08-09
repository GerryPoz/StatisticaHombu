// Importa la configurazione Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

let app, auth, database;
let strutturaGruppi = {};

// Inizializzazione
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Inizializza Firebase
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        database = getDatabase(app);
        
        // Verifica autenticazione
        onAuthStateChanged(auth, (user) => {
            if (user) {
                inizializzaApp();
            } else {
                window.location.href = 'index.html';
            }
        });
        
    } catch (error) {
        console.error('Errore inizializzazione:', error);
        alert('Errore durante l\'inizializzazione dell\'applicazione');
    }
});

// Inizializza l'applicazione
async function inizializzaApp() {
    try {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        await caricaStrutturaGruppi();
        visualizzaStruttura();
        calcolaStatistiche();
        
    } catch (error) {
        console.error('Errore inizializzazione app:', error);
        alert('Errore durante il caricamento dei dati');
    }
}

// Carica la struttura dei gruppi
async function caricaStrutturaGruppi() {
    try {
        const gruppiRef = ref(database, 'gruppi');
        const snapshot = await get(gruppiRef);
        
        if (snapshot.exists()) {
            strutturaGruppi = snapshot.val();
        } else {
            // Carica da file JSON locale se non presente su Firebase
            const response = await fetch('gruppi.json');
            strutturaGruppi = await response.json();
        }
        
    } catch (error) {
        console.error('Errore caricamento struttura:', error);
        throw error;
    }
}

// Visualizza la struttura
function visualizzaStruttura() {
    const container = document.getElementById('strutturaContainer');
    const treeView = document.getElementById('treeView');
    
    container.innerHTML = '';
    treeView.innerHTML = '';
    
    let treeText = 'HOMBU 9\n';
    
    Object.keys(strutturaGruppi).forEach(hombuKey => {
        const hombu = strutturaGruppi[hombuKey];
        
        Object.keys(hombu).forEach(capitoloKey => {
            const capitolo = hombu[capitoloKey];
            
            // Header del capitolo
            const capitoloDiv = document.createElement('div');
            capitoloDiv.className = 'capitolo-header mb-4';
            capitoloDiv.innerHTML = `
                <h3><i class="fas fa-building me-2"></i>${capitoloKey}</h3>
                <p class="mb-0">Organizzazione settori e gruppi</p>
            `;
            container.appendChild(capitoloDiv);
            
            treeText += `├── ${capitoloKey}\n`;
            
            // Settori
            Object.keys(capitolo).forEach((settoreKey, settoreIndex, settoriArray) => {
                const settore = capitolo[settoreKey];
                const isLastSettore = settoreIndex === settoriArray.length - 1;
                
                const settoreCard = document.createElement('div');
                settoreCard.className = 'gruppo-card card mb-3';
                
                const gruppiCount = Array.isArray(settore) ? settore.length : 0;
                
                settoreCard.innerHTML = `
                    <div class="card-body">
                        <div class="settore-badge">
                            <i class="fas fa-layer-group me-2"></i>${settoreKey}
                            <span class="count-badge">${gruppiCount} gruppi</span>
                        </div>
                        <div class="gruppi-container">
                            ${Array.isArray(settore) ? settore.map(gruppo => 
                                `<span class="gruppo-item">
                                    <i class="fas fa-users me-2"></i>${gruppo}
                                </span>`
                            ).join('') : '<span class="text-muted">Nessun gruppo</span>'}
                        </div>
                    </div>
                `;
                
                container.appendChild(settoreCard);
                
                // Tree view
                const settorePrefix = isLastSettore ? '└──' : '├──';
                treeText += `│   ${settorePrefix} ${settoreKey} (${gruppiCount} gruppi)\n`;
                
                if (Array.isArray(settore)) {
                    settore.forEach((gruppo, gruppoIndex) => {
                        const isLastGruppo = gruppoIndex === settore.length - 1;
                        const gruppoPrefix = isLastGruppo ? '└──' : '├──';
                        const linePrefix = isLastSettore ? '    ' : '│   ';
                        treeText += `${linePrefix}    ${gruppoPrefix} ${gruppo}\n`;
                    });
                }
            });
        });
    });
    
    treeView.textContent = treeText;
}

// Calcola e visualizza le statistiche
function calcolaStatistiche() {
    let totaleCapitoli = 0;
    let totaleSettori = 0;
    let totaleGruppi = 0;
    
    Object.keys(strutturaGruppi).forEach(hombuKey => {
        const hombu = strutturaGruppi[hombuKey];
        
        Object.keys(hombu).forEach(capitoloKey => {
            totaleCapitoli++;
            const capitolo = hombu[capitoloKey];
            
            Object.keys(capitolo).forEach(settoreKey => {
                totaleSettori++;
                const settore = capitolo[settoreKey];
                
                if (Array.isArray(settore)) {
                    totaleGruppi += settore.length;
                }
            });
        });
    });
    
    const mediaGruppi = totaleSettori > 0 ? (totaleGruppi / totaleSettori).toFixed(1) : 0;
    
    document.getElementById('totaleCapitoli').textContent = totaleCapitoli;
    document.getElementById('totaleSettori').textContent = totaleSettori;
    document.getElementById('totaleGruppi').textContent = totaleGruppi;
    document.getElementById('mediaGruppi').textContent = mediaGruppi;
}

// Esporta la struttura in JSON
function esportaStruttura() {
    const dataStr = JSON.stringify(strutturaGruppi, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `struttura-gruppi-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Logout
async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Errore logout:', error);
        alert('Errore durante il logout');
    }
}

// Esporta funzioni globali
window.esportaStruttura = esportaStruttura;
window.logout = logout;
