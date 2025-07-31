// Importa i moduli Firebase necessari
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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
    // Carica i dati dei gruppi
    fetch('gruppi.json')
        .then(response => response.json())
        .then(data => {
            window.gruppiData = data;
            popolaAnni();
        })
        .catch(error => {
            console.error('Errore nel caricamento dei gruppi:', error);
            alert('Errore nel caricamento dei dati dei gruppi');
        });

    // Event listeners
    document.getElementById('caricaGruppi').addEventListener('click', caricaGruppi);
    document.getElementById('rivedidati').addEventListener('click', rivedidati);
    document.getElementById('salvadati').addEventListener('click', salvasuFirebase);
    document.getElementById('confermaeSalva').addEventListener('click', confermaeSalva);
    document.getElementById('logoutBtn').addEventListener('click', logout);
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

// Popola gli anni disponibili
function popolaAnni() {
    const annoSelect = document.getElementById('anno');
    const anniDisponibili = new Set();
    
    // Estrai tutti gli anni dai dati dei gruppi
    Object.keys(window.gruppiData).forEach(key => {
        const anno = key.substring(0, 4);
        anniDisponibili.add(anno);
    });
    
    // Ordina gli anni in ordine decrescente
    const anniOrdinati = Array.from(anniDisponibili).sort((a, b) => b - a);
    
    // Popola il select
    annoSelect.innerHTML = '<option value="">Seleziona anno</option>';
    anniOrdinati.forEach(anno => {
        const option = document.createElement('option');
        option.value = anno;
        option.textContent = anno;
        annoSelect.appendChild(option);
    });
}

// Carica i gruppi per il periodo selezionato
function caricaGruppi() {
    const anno = document.getElementById('anno').value;
    const mese = document.getElementById('mese').value;
    
    if (!anno || !mese) {
        alert('Seleziona anno e mese');
        return;
    }
    
    const chiave = `${anno}${mese}`;
    const gruppi = window.gruppiData[chiave];
    
    if (!gruppi) {
        alert('Nessun gruppo trovato per il periodo selezionato');
        return;
    }
    
    // Mostra il container dei gruppi
    document.getElementById('gruppiContainer').style.display = 'block';
    
    // Genera il form per i gruppi
    generaFormGruppi(gruppi, anno, mese);
}

// Genera il form per l'inserimento dei dati dei gruppi
function generaFormGruppi(gruppi, anno, mese) {
    const container = document.getElementById('gruppiForm');
    container.innerHTML = '';
    
    gruppi.forEach((gruppo, index) => {
        const gruppoDiv = document.createElement('div');
        gruppoDiv.className = 'gruppo-card mb-4';
        gruppoDiv.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-users me-2"></i>
                        ${gruppo.nome} - ${gruppo.capitolo}
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4 mb-3">
                            <label class="form-label">Zadankai Svolti</label>
                            <input type="number" class="form-control" id="zadankai_${index}" min="0" value="0">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label">Praticanti Uomini</label>
                            <input type="number" class="form-control" id="uomini_${index}" min="0" value="0">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label">Praticanti Donne</label>
                            <input type="number" class="form-control" id="donne_${index}" min="0" value="0">
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Giovani (Under 35)</label>
                            <input type="number" class="form-control" id="giovani_${index}" min="0" value="0">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Ospiti</label>
                            <input type="number" class="form-control" id="ospiti_${index}" min="0" value="0">
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(gruppoDiv);
    });
}

// Rivedi i dati inseriti
function rivedidati() {
    const anno = document.getElementById('anno').value;
    const mese = document.getElementById('mese').value;
    
    if (!anno || !mese) {
        alert('Seleziona anno e mese prima di rivedere i dati');
        return;
    }
    
    const chiave = `${anno}${mese}`;
    const gruppi = window.gruppiData[chiave];
    
    if (!gruppi) {
        alert('Nessun gruppo caricato');
        return;
    }
    
    // Popola il modal di revisione
    popolaModalRevisione(gruppi, anno, mese);
    
    // Mostra il modal
    const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
    modal.show();
}

// Popola il modal di revisione con i dati inseriti
function popolaModalRevisione(gruppi, anno, mese) {
    // Sezione Periodo e Gruppo
    const reviewPeriodoGruppo = document.getElementById('reviewPeriodoGruppo');
    reviewPeriodoGruppo.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <strong>Anno:</strong> ${anno}
            </div>
            <div class="col-md-6">
                <strong>Mese:</strong> ${getNomeMese(mese)}
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-12">
                <strong>Numero Gruppi:</strong> ${gruppi.length}
            </div>
        </div>
    `;
    
    // Sezione Zadankai
    const reviewZadankai = document.getElementById('reviewZadankai');
    let zadankaiHtml = '<div class="row">';
    let totalZadankai = 0;
    
    gruppi.forEach((gruppo, index) => {
        const zadankai = parseInt(document.getElementById(`zadankai_${index}`).value) || 0;
        totalZadankai += zadankai;
        zadankaiHtml += `
            <div class="col-md-6 mb-2">
                <strong>${gruppo.nome}:</strong> ${zadankai} zadankai
            </div>
        `;
    });
    
    zadankaiHtml += `</div><div class="alert alert-info mt-3"><strong>Totale Zadankai:</strong> ${totalZadankai}</div>`;
    reviewZadankai.innerHTML = zadankaiHtml;
    
    // Sezione Praticanti
    const reviewPraticanti = document.getElementById('reviewPraticanti');
    let pratikantiHtml = '<div class="table-responsive"><table class="table table-sm table-striped">';
    pratikantiHtml += '<thead><tr><th>Gruppo</th><th>Uomini</th><th>Donne</th><th>Giovani</th><th>Ospiti</th><th>Totale</th></tr></thead><tbody>';
    
    let totalUomini = 0, totalDonne = 0, totalGiovani = 0, totalOspiti = 0, totalPraticanti = 0;
    
    gruppi.forEach((gruppo, index) => {
        const uomini = parseInt(document.getElementById(`uomini_${index}`).value) || 0;
        const donne = parseInt(document.getElementById(`donne_${index}`).value) || 0;
        const giovani = parseInt(document.getElementById(`giovani_${index}`).value) || 0;
        const ospiti = parseInt(document.getElementById(`ospiti_${index}`).value) || 0;
        const totaleGruppo = uomini + donne + giovani + ospiti;
        
        totalUomini += uomini;
        totalDonne += donne;
        totalGiovani += giovani;
        totalOspiti += ospiti;
        totalPraticanti += totaleGruppo;
        
        pratikantiHtml += `
            <tr>
                <td><strong>${gruppo.nome}</strong></td>
                <td>${uomini}</td>
                <td>${donne}</td>
                <td>${giovani}</td>
                <td>${ospiti}</td>
                <td><strong>${totaleGruppo}</strong></td>
            </tr>
        `;
    });
    
    pratikantiHtml += `
        <tr class="table-primary">
            <td><strong>TOTALI</strong></td>
            <td><strong>${totalUomini}</strong></td>
            <td><strong>${totalDonne}</strong></td>
            <td><strong>${totalGiovani}</strong></td>
            <td><strong>${totalOspiti}</strong></td>
            <td><strong>${totalPraticanti}</strong></td>
        </tr>
    `;
    pratikantiHtml += '</tbody></table></div>';
    
    reviewPraticanti.innerHTML = pratikantiHtml;
}

// Ottieni il nome del mese
function getNomeMese(numeroMese) {
    const mesi = {
        '01': 'Gennaio', '02': 'Febbraio', '03': 'Marzo', '04': 'Aprile',
        '05': 'Maggio', '06': 'Giugno', '07': 'Luglio', '08': 'Agosto',
        '09': 'Settembre', '10': 'Ottobre', '11': 'Novembre', '12': 'Dicembre'
    };
    return mesi[numeroMese] || numeroMese;
}

// Conferma e salva i dati
function confermaeSalva() {
    // Chiudi il modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
    modal.hide();
    
    // Salva su Firebase
    salvasuFirebase();
}

// Salva i dati su Firebase
function salvasuFirebase() {
    // Verifica autenticazione prima di salvare
    if (!auth.currentUser) {
        alert('Devi essere autenticato per salvare i dati');
        window.location.href = 'index.html';
        return;
    }
    
    const anno = document.getElementById('anno').value;
    const mese = document.getElementById('mese').value;
    
    if (!anno || !mese) {
        alert('Seleziona anno e mese prima di salvare');
        return;
    }
    
    const chiave = `${anno}${mese}`;
    const gruppi = window.gruppiData[chiave];
    
    if (!gruppi) {
        alert('Nessun gruppo caricato');
        return;
    }
    
    // Raccogli tutti i dati
    const datiDaSalvare = {
        anno: anno,
        mese: mese,
        dataInserimento: new Date().toISOString(),
        utente: auth.currentUser.email,
        gruppi: []
    };
    
    gruppi.forEach((gruppo, index) => {
        const zadankai = parseInt(document.getElementById(`zadankai_${index}`).value) || 0;
        const uomini = parseInt(document.getElementById(`uomini_${index}`).value) || 0;
        const donne = parseInt(document.getElementById(`donne_${index}`).value) || 0;
        const giovani = parseInt(document.getElementById(`giovani_${index}`).value) || 0;
        const ospiti = parseInt(document.getElementById(`ospiti_${index}`).value) || 0;
        
        datiDaSalvare.gruppi.push({
            nome: gruppo.nome,
            capitolo: gruppo.capitolo,
            zadankai: zadankai,
            uomini: uomini,
            donne: donne,
            giovani: giovani,
            ospiti: ospiti,
            totale: uomini + donne + giovani + ospiti
        });
    });
    
    // Salva su Firebase
    const dbRef = ref(database, `zadankai/${chiave}`);
    
    set(dbRef, datiDaSalvare)
        .then(() => {
            alert('Dati salvati con successo su Firebase!');
            console.log('Dati salvati:', datiDaSalvare);
            
            // Reset del form
            document.getElementById('gruppiContainer').style.display = 'none';
            document.getElementById('anno').value = '';
            document.getElementById('mese').value = '';
        })
        .catch((error) => {
            console.error('Errore nel salvataggio:', error);
            alert('Errore nel salvataggio dei dati: ' + error.message);
        });
}
