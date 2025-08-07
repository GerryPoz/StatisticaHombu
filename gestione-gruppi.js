// Importa la configurazione Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDatabase, ref, get, set } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

// Configurazione Firebase
const firebaseConfig = {
    // La configurazione verrà caricata dal file config.json
};

let app, auth, database;
let strutturaGruppi = {};

// Inizializzazione
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Carica configurazione Firebase
        const response = await fetch('config.json');
        const config = await response.json();
        
        // Inizializza Firebase
        app = initializeApp(config);
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
        await caricaStrutturaGruppi();
        visualizzaStruttura();
        popolaSelectCapitoli();
        
        // Nascondi schermata di caricamento
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        // Event listener per logout
        document.getElementById('logoutBtn').addEventListener('click', logout);
        
    } catch (error) {
        console.error('Errore inizializzazione app:', error);
        alert('Errore durante il caricamento dei dati');
    }
}

// Carica la struttura dei gruppi da Firebase
async function caricaStrutturaGruppi() {
    try {
        const gruppiRef = ref(database, 'gruppi');
        const snapshot = await get(gruppiRef);
        
        if (snapshot.exists()) {
            strutturaGruppi = snapshot.val();
        } else {
            // Se non esiste, carica da file locale
            const response = await fetch('gruppi.json');
            strutturaGruppi = await response.json();
            // Salva su Firebase
            await set(gruppiRef, strutturaGruppi);
        }
    } catch (error) {
        console.error('Errore caricamento struttura:', error);
        // Fallback al file locale
        const response = await fetch('gruppi.json');
        strutturaGruppi = await response.json();
    }
}

// Visualizza la struttura dei gruppi
function visualizzaStruttura() {
    const container = document.getElementById('strutturaGruppi');
    container.innerHTML = '';
    
    Object.keys(strutturaGruppi).forEach(hombu => {
        const hombuDiv = document.createElement('div');
        hombuDiv.className = 'mb-4';
        
        hombuDiv.innerHTML = `
            <div class="card gruppo-card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 class="mb-0">
                        <i class="fas fa-building me-2"></i>
                        ${hombu}
                    </h4>
                    <div>
                        <button class="btn btn-sm btn-outline-light me-1" onclick="modificaElemento('hombu', '${hombu}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminaElemento('hombu', '${hombu}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${visualizzaCapitoli(strutturaGruppi[hombu], hombu)}
                </div>
            </div>
        `;
        
        container.appendChild(hombuDiv);
    });
}

// Visualizza i capitoli
function visualizzaCapitoli(capitoli, hombu) {
    let html = '';
    
    Object.keys(capitoli).forEach(capitolo => {
        html += `
            <div class="card mb-3">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                        <i class="fas fa-map-marker-alt me-2 text-info"></i>
                        ${capitolo}
                    </h5>
                    <div>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="modificaElemento('capitolo', '${capitolo}', '${hombu}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminaElemento('capitolo', '${capitolo}', '${hombu}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${visualizzaSettori(capitoli[capitolo], hombu, capitolo)}
                </div>
            </div>
        `;
    });
    
    return html;
}

// Visualizza i settori
function visualizzaSettori(settori, hombu, capitolo) {
    let html = '';
    
    Object.keys(settori).forEach(settore => {
        html += `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge settore-badge text-white px-3 py-2">
                        <i class="fas fa-layer-group me-1"></i>
                        ${settore}
                    </span>
                    <div>
                        <button class="btn btn-sm btn-outline-info me-1" onclick="modificaElemento('settore', '${settore}', '${hombu}', '${capitolo}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminaElemento('settore', '${settore}', '${hombu}', '${capitolo}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="ms-3">
                    ${visualizzaGruppi(settori[settore], hombu, capitolo, settore)}
                </div>
            </div>
        `;
    });
    
    return html;
}

// Visualizza i gruppi
function visualizzaGruppi(gruppi, hombu, capitolo, settore) {
    let html = '';
    
    gruppi.forEach(gruppo => {
        html += `
            <span class="gruppo-item d-inline-flex align-items-center">
                <i class="fas fa-users me-1 text-primary"></i>
                ${gruppo}
                <button class="btn btn-sm btn-outline-warning ms-2 p-1" onclick="modificaElemento('gruppo', '${gruppo}', '${hombu}', '${capitolo}', '${settore}')">
                    <i class="fas fa-edit" style="font-size: 10px;"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1 p-1" onclick="eliminaElemento('gruppo', '${gruppo}', '${hombu}', '${capitolo}', '${settore}')">
                    <i class="fas fa-trash" style="font-size: 10px;"></i>
                </button>
            </span>
        `;
    });
    
    return html;
}

// Popola le select dei capitoli
function popolaSelectCapitoli() {
    const selectCapitoloSettore = document.getElementById('capitoloSettore');
    const selectCapitoloGruppo = document.getElementById('capitoloGruppo');
    
    // Pulisci le select
    selectCapitoloSettore.innerHTML = '<option value="">Seleziona capitolo...</option>';
    selectCapitoloGruppo.innerHTML = '<option value="">Seleziona capitolo...</option>';
    
    // Popola con i capitoli esistenti
    Object.keys(strutturaGruppi).forEach(hombu => {
        Object.keys(strutturaGruppi[hombu]).forEach(capitolo => {
            const option1 = document.createElement('option');
            option1.value = capitolo;
            option1.textContent = capitolo;
            selectCapitoloSettore.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = capitolo;
            option2.textContent = capitolo;
            selectCapitoloGruppo.appendChild(option2);
        });
    });
}

// Carica i settori in base al capitolo selezionato
function caricaSettori() {
    const capitoloSelezionato = document.getElementById('capitoloGruppo').value;
    const selectSettore = document.getElementById('settoreGruppo');
    
    selectSettore.innerHTML = '<option value="">Seleziona settore...</option>';
    
    if (capitoloSelezionato) {
        Object.keys(strutturaGruppi).forEach(hombu => {
            if (strutturaGruppi[hombu][capitoloSelezionato]) {
                Object.keys(strutturaGruppi[hombu][capitoloSelezionato]).forEach(settore => {
                    const option = document.createElement('option');
                    option.value = settore;
                    option.textContent = settore;
                    selectSettore.appendChild(option);
                });
            }
        });
    }
}

// Aggiungi nuovo capitolo
async function aggiungiCapitolo() {
    const nomeCapitolo = document.getElementById('nomeCapitolo').value.trim();
    
    if (!nomeCapitolo) {
        alert('Inserisci il nome del capitolo');
        return;
    }
    
    // Aggiungi alla struttura (assumendo HOMBU 9)
    const hombu = 'HOMBU 9';
    if (!strutturaGruppi[hombu]) {
        strutturaGruppi[hombu] = {};
    }
    
    if (strutturaGruppi[hombu][nomeCapitolo]) {
        alert('Capitolo già esistente');
        return;
    }
    
    strutturaGruppi[hombu][nomeCapitolo] = {};
    
    try {
        await salvaStruttura();
        visualizzaStruttura();
        popolaSelectCapitoli();
        
        // Chiudi modal e resetta form
        bootstrap.Modal.getInstance(document.getElementById('modalCapitolo')).hide();
        document.getElementById('formCapitolo').reset();
        
        alert('Capitolo aggiunto con successo!');
    } catch (error) {
        console.error('Errore aggiunta capitolo:', error);
        alert('Errore durante l\'aggiunta del capitolo');
    }
}

// Aggiungi nuovo settore
async function aggiungiSettore() {
    const capitolo = document.getElementById('capitoloSettore').value;
    const nomeSettore = document.getElementById('nomeSettore').value.trim();
    
    if (!capitolo || !nomeSettore) {
        alert('Compila tutti i campi');
        return;
    }
    
    // Trova il capitolo nella struttura
    let hombuTrovato = null;
    Object.keys(strutturaGruppi).forEach(hombu => {
        if (strutturaGruppi[hombu][capitolo]) {
            hombuTrovato = hombu;
        }
    });
    
    if (!hombuTrovato) {
        alert('Capitolo non trovato');
        return;
    }
    
    if (strutturaGruppi[hombuTrovato][capitolo][nomeSettore]) {
        alert('Settore già esistente');
        return;
    }
    
    strutturaGruppi[hombuTrovato][capitolo][nomeSettore] = [];
    
    try {
        await salvaStruttura();
        visualizzaStruttura();
        
        // Chiudi modal e resetta form
        bootstrap.Modal.getInstance(document.getElementById('modalSettore')).hide();
        document.getElementById('formSettore').reset();
        
        alert('Settore aggiunto con successo!');
    } catch (error) {
        console.error('Errore aggiunta settore:', error);
        alert('Errore durante l\'aggiunta del settore');
    }
}

// Aggiungi nuovo gruppo
async function aggiungiGruppo() {
    const capitolo = document.getElementById('capitoloGruppo').value;
    const settore = document.getElementById('settoreGruppo').value;
    const nomeGruppo = document.getElementById('nomeGruppo').value.trim().toUpperCase();
    
    if (!capitolo || !settore || !nomeGruppo) {
        alert('Compila tutti i campi');
        return;
    }
    
    // Trova il settore nella struttura
    let hombuTrovato = null;
    Object.keys(strutturaGruppi).forEach(hombu => {
        if (strutturaGruppi[hombu][capitolo] && strutturaGruppi[hombu][capitolo][settore]) {
            hombuTrovato = hombu;
        }
    });
    
    if (!hombuTrovato) {
        alert('Settore non trovato');
        return;
    }
    
    if (strutturaGruppi[hombuTrovato][capitolo][settore].includes(nomeGruppo)) {
        alert('Gruppo già esistente');
        return;
    }
    
    strutturaGruppi[hombuTrovato][capitolo][settore].push(nomeGruppo);
    
    try {
        await salvaStruttura();
        visualizzaStruttura();
        
        // Chiudi modal e resetta form
        bootstrap.Modal.getInstance(document.getElementById('modalGruppo')).hide();
        document.getElementById('formGruppo').reset();
        
        alert('Gruppo aggiunto con successo!');
    } catch (error) {
        console.error('Errore aggiunta gruppo:', error);
        alert('Errore durante l\'aggiunta del gruppo');
    }
}

// Modifica elemento
function modificaElemento(tipo, nome, hombu = null, capitolo = null, settore = null) {
    document.getElementById('titoloModifica').textContent = `Modifica ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
    document.getElementById('nuovoNome').value = nome;
    document.getElementById('tipoModifica').value = tipo;
    document.getElementById('percorsoModifica').value = JSON.stringify({tipo, nome, hombu, capitolo, settore});
    
    new bootstrap.Modal(document.getElementById('modalModifica')).show();
}

// Conferma modifica
async function confermaModifica() {
    const nuovoNome = document.getElementById('nuovoNome').value.trim();
    const percorso = JSON.parse(document.getElementById('percorsoModifica').value);
    
    if (!nuovoNome) {
        alert('Inserisci il nuovo nome');
        return;
    }
    
    try {
        switch (percorso.tipo) {
            case 'hombu':
                strutturaGruppi[nuovoNome] = strutturaGruppi[percorso.nome];
                delete strutturaGruppi[percorso.nome];
                break;
                
            case 'capitolo':
                strutturaGruppi[percorso.hombu][nuovoNome] = strutturaGruppi[percorso.hombu][percorso.nome];
                delete strutturaGruppi[percorso.hombu][percorso.nome];
                break;
                
            case 'settore':
                strutturaGruppi[percorso.hombu][percorso.capitolo][nuovoNome] = strutturaGruppi[percorso.hombu][percorso.capitolo][percorso.nome];
                delete strutturaGruppi[percorso.hombu][percorso.capitolo][percorso.nome];
                break;
                
            case 'gruppo':
                const gruppi = strutturaGruppi[percorso.hombu][percorso.capitolo][percorso.settore];
                const index = gruppi.indexOf(percorso.nome);
                if (index > -1) {
                    gruppi[index] = nuovoNome.toUpperCase();
                }
                break;
        }
        
        await salvaStruttura();
        visualizzaStruttura();
        popolaSelectCapitoli();
        
        bootstrap.Modal.getInstance(document.getElementById('modalModifica')).hide();
        alert('Modifica completata con successo!');
        
    } catch (error) {
        console.error('Errore modifica:', error);
        alert('Errore durante la modifica');
    }
}

// Elimina elemento
async function eliminaElemento(tipo, nome, hombu = null, capitolo = null, settore = null) {
    if (!confirm(`Sei sicuro di voler eliminare ${tipo} "${nome}"?\nQuesta azione eliminerà anche tutti gli elementi contenuti.`)) {
        return;
    }
    
    try {
        switch (tipo) {
            case 'hombu':
                delete strutturaGruppi[nome];
                break;
                
            case 'capitolo':
                delete strutturaGruppi[hombu][nome];
                break;
                
            case 'settore':
                delete strutturaGruppi[hombu][capitolo][nome];
                break;
                
            case 'gruppo':
                const gruppi = strutturaGruppi[hombu][capitolo][settore];
                const index = gruppi.indexOf(nome);
                if (index > -1) {
                    gruppi.splice(index, 1);
                }
                break;
        }
        
        await salvaStruttura();
        visualizzaStruttura();
        popolaSelectCapitoli();
        
        alert('Eliminazione completata con successo!');
        
    } catch (error) {
        console.error('Errore eliminazione:', error);
        alert('Errore durante l\'eliminazione');
    }
}

// Salva la struttura su Firebase
async function salvaStruttura() {
    const gruppiRef = ref(database, 'gruppi');
    await set(gruppiRef, strutturaGruppi);
}

// Esporta struttura in JSON
function esportaStruttura() {
    const dataStr = JSON.stringify(strutturaGruppi, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'struttura-gruppi.json';
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

// Rendi le funzioni globali
window.aggiungiCapitolo = aggiungiCapitolo;
window.aggiungiSettore = aggiungiSettore;
window.aggiungiGruppo = aggiungiGruppo;
window.caricaSettori = caricaSettori;
window.modificaElemento = modificaElemento;
window.confermaModifica = confermaModifica;
window.eliminaElemento = eliminaElemento;
window.esportaStruttura = esportaStruttura;
