// Importa la configurazione Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Variabili globali
let righe = [];
let gruppiMap = new Map();
let capitoliMap = new Map();
let settoriMap = new Map();

// Controllo autenticazione
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Utente autenticato:', user.email);
        caricaDati();
    } else {
        console.log('Utente non autenticato, reindirizzamento...');
        window.location.href = 'index.html';
    }
});

// Funzione per caricare i dati da Firebase
async function caricaDati() {
    try {
        console.log('Inizio caricamento dati...');
        
        // Carica i dati dei gruppi
        let gruppiData = {};
        const gruppiRef = ref(database, 'gruppi');
        const gruppiSnapshot = await get(gruppiRef);
        
        if (gruppiSnapshot.exists()) {
            gruppiData = gruppiSnapshot.val();
            console.log('Dati gruppi caricati');
        } else {
            console.log('Nessun dato gruppi trovato');
        }
        
        // Carica i dati zadankai
        const zadankaiRef = ref(database, 'zadankai');
        const zadankaiSnapshot = await get(zadankaiRef);
        
        if (zadankaiSnapshot.exists()) {
            console.log('Dati zadankai caricati');
            const zadankaiData = zadankaiSnapshot.val();
            
            // Processa i dati
            righe = [];
            
            if (zadankaiData && typeof zadankaiData === 'object') {
                Object.entries(zadankaiData).forEach(([chiave, valore]) => {
                    if (valore && typeof valore === 'object') {
                        // Estrai anno e mese dalla chiave (formato: "2025-01" o simile)
                        const [anno, numeroMese] = chiave.split('-');
                        const mese = getMeseName(numeroMese);
                        
                        Object.entries(valore).forEach(([gruppoId, datiGruppo]) => {
                            if (datiGruppo && typeof datiGruppo === 'object') {
                                const infoGruppo = gruppiData[gruppoId] || {};
                                
                                const riga = {
                                    anno: parseInt(anno),
                                    mese: mese,
                                    gruppoId: gruppoId,
                                    nomeGruppo: infoGruppo.nome || 'Gruppo sconosciuto',
                                    capitolo: infoGruppo.capitolo || 'Non specificato',
                                    settore: infoGruppo.settore || 'Non specificato',
                                    responsabile: infoGruppo.responsabile || 'Non specificato',
                                    partecipanti: datiGruppo.partecipanti || 0,
                                    ospiti: datiGruppo.ospiti || 0,
                                    totale: (datiGruppo.partecipanti || 0) + (datiGruppo.ospiti || 0)
                                };
                                
                                righe.push(riga);
                            }
                        });
                    }
                });
            }
            
            console.log('Righe elaborate:', righe.length);
            
            // Popola le mappe per i filtri
            popolaMappe();
            
            // Inizializza i filtri
            inizializzaFiltri();
            
            // Aggiorna i riepiloghi
            aggiornaRiepiloghi();
        } else {
            console.log('Nessun dato zadankai trovato');
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
    }
}

// Funzione per convertire il numero del mese in nome
function getMeseName(numeroMese) {
    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return mesi[parseInt(numeroMese) - 1] || 'Mese sconosciuto';
}

// Funzione per popolare le mappe
function popolaMappe() {
    righe.forEach(riga => {
        gruppiMap.set(riga.gruppoId, riga.nomeGruppo);
        capitoliMap.set(riga.capitolo, riga.capitolo);
        settoriMap.set(riga.settore, riga.settore);
    });
}

// Funzione per inizializzare i filtri
function inizializzaFiltri() {
    // Popola filtro anni
    const anni = [...new Set(righe.map(r => r.anno))].sort((a, b) => b - a);
    const selectAnno = document.getElementById('filtro-anno');
    if (selectAnno) {
        selectAnno.innerHTML = '';
        anni.forEach(anno => {
            const option = document.createElement('option');
            option.value = anno;
            option.textContent = anno;
            selectAnno.appendChild(option);
        });
        
        // Seleziona l'anno più recente
        if (anni.length > 0) {
            selectAnno.value = anni[0];
        }
    }
    
    // Popola filtro mesi
    aggiornaFiltroMesi();
    
    // Aggiungi event listeners
    const filtroAnno = document.getElementById('filtro-anno');
    const filtroMese = document.getElementById('filtro-mese');
    const filtroLivello = document.getElementById('filtro-livello');
    
    if (filtroAnno) {
        filtroAnno.addEventListener('change', () => {
            aggiornaFiltroMesi();
            aggiornaRiepiloghi();
        });
    }
    
    if (filtroMese) {
        filtroMese.addEventListener('change', aggiornaRiepiloghi);
    }
    
    if (filtroLivello) {
        filtroLivello.addEventListener('change', aggiornaRiepiloghi);
    }
}

// Funzione per aggiornare il filtro mesi
function aggiornaFiltroMesi() {
    const annoSelezionato = document.getElementById('filtro-anno')?.value;
    const selectMese = document.getElementById('filtro-mese');
    
    if (!selectMese || !annoSelezionato) return;
    
    // Filtra i mesi per l'anno selezionato
    const mesiDisponibili = [...new Set(
        righe.filter(r => r.anno === parseInt(annoSelezionato))
             .map(r => r.mese)
    )].sort((a, b) => {
        const ordine = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                       'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        return ordine.indexOf(a) - ordine.indexOf(b);
    });
    
    selectMese.innerHTML = '<option value="tutti">Tutti i mesi</option>';
    mesiDisponibili.forEach(mese => {
        const option = document.createElement('option');
        option.value = mese;
        option.textContent = mese;
        selectMese.appendChild(option);
    });
    
    // Seleziona il mese più recente
    if (mesiDisponibili.length > 0) {
        selectMese.value = mesiDisponibili[mesiDisponibili.length - 1];
    }
}

// Funzione per aggiornare i riepiloghi
function aggiornaRiepiloghi() {
    const annoSelezionato = document.getElementById('filtro-anno')?.value;
    const meseSelezionato = document.getElementById('filtro-mese')?.value;
    const livelloSelezionato = document.getElementById('filtro-livello')?.value;
    
    if (!annoSelezionato || !meseSelezionato || !livelloSelezionato) {
        console.log('Filtri non completi');
        return;
    }
    
    console.log('Aggiornamento riepiloghi:', { annoSelezionato, meseSelezionato, livelloSelezionato });
    
    // Filtra i dati
    const datiAnno = righe.filter(r => r.anno === parseInt(annoSelezionato));
    const datiMese = meseSelezionato === 'tutti' ? datiAnno : datiAnno.filter(r => r.mese === meseSelezionato);
    
    const contenitore = document.getElementById('contenitore-riepiloghi');
    if (!contenitore) return;
    
    contenitore.innerHTML = '';
    
    switch (livelloSelezionato) {
        case 'hombu':
            generaRiepilogoHombu(datiMese, parseInt(annoSelezionato), meseSelezionato);
            break;
        case 'capitoli':
            generaRiepiloghiCapitoli(datiMese, parseInt(annoSelezionato), meseSelezionato);
            break;
        case 'settori':
            generaRiepiloghiSettori(datiMese, parseInt(annoSelezionato), meseSelezionato);
            break;
    }
}

// Funzione per generare il riepilogo Hombu
function generaRiepilogoHombu(dati, anno, mese) {
    const contenitore = document.getElementById('contenitore-riepiloghi');
    if (!contenitore) return;
    
    const card = document.createElement('div');
    card.className = 'card mb-4 shadow-sm';
    
    const titoloMese = mese === 'tutti' ? 'Tutti i mesi' : mese;
    
    card.innerHTML = `
        <div class="card-header bg-success text-white">
            <h5 class="mb-0">
                <i class="fas fa-chart-bar me-2"></i>
                Riepilogo Hombu 9 - ${titoloMese} ${anno}
            </h5>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Gruppo</th>
                            <th>Capitolo</th>
                            <th>Settore</th>
                            <th>Responsabile</th>
                            <th>Partecipanti</th>
                            <th>Ospiti</th>
                            <th>Totale</th>
                        </tr>
                    </thead>
                    <tbody id="tabella-hombu">
                    </tbody>
                    <tfoot class="table-secondary">
                        <tr id="totali-hombu">
                            <th colspan="4">TOTALI</th>
                            <th id="totale-partecipanti">0</th>
                            <th id="totale-ospiti">0</th>
                            <th id="totale-generale">0</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div class="mt-3">
                <button class="btn btn-success" onclick="esportaCSV('hombu', ${anno}, '${mese}')">
                    <i class="fas fa-download me-2"></i>Esporta CSV
                </button>
            </div>
        </div>
    `;
    
    contenitore.appendChild(card);
    
    // Popola la tabella
    const tbody = document.getElementById('tabella-hombu');
    let totalePartecipanti = 0;
    let totaleOspiti = 0;
    
    dati.forEach(riga => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${riga.nomeGruppo}</td>
            <td>${riga.capitolo}</td>
            <td>${riga.settore}</td>
            <td>${riga.responsabile}</td>
            <td class="text-end">${riga.partecipanti}</td>
            <td class="text-end">${riga.ospiti}</td>
            <td class="text-end fw-bold">${riga.totale}</td>
        `;
        tbody.appendChild(tr);
        
        totalePartecipanti += riga.partecipanti;
        totaleOspiti += riga.ospiti;
    });
    
    // Aggiorna i totali
    document.getElementById('totale-partecipanti').textContent = totalePartecipanti;
    document.getElementById('totale-ospiti').textContent = totaleOspiti;
    document.getElementById('totale-generale').textContent = totalePartecipanti + totaleOspiti;
}

// Funzione per generare i riepiloghi per capitolo
function generaRiepiloghiCapitoli(dati, anno, mese) {
    const contenitore = document.getElementById('contenitore-riepiloghi');
    if (!contenitore) return;
    
    const capitoli = [...new Set(dati.map(r => r.capitolo))].sort();
    const titoloMese = mese === 'tutti' ? 'Tutti i mesi' : mese;
    
    capitoli.forEach(capitolo => {
        const datiCapitolo = dati.filter(r => r.capitolo === capitolo);
        
        const card = document.createElement('div');
        card.className = 'card mb-4 shadow-sm';
        
        card.innerHTML = `
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                    <i class="fas fa-users me-2"></i>
                    Capitolo: ${capitolo} - ${titoloMese} ${anno}
                </h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Gruppo</th>
                                <th>Settore</th>
                                <th>Responsabile</th>
                                <th>Partecipanti</th>
                                <th>Ospiti</th>
                                <th>Totale</th>
                            </tr>
                        </thead>
                        <tbody id="tabella-capitolo-${capitolo.replace(/\s+/g, '-')}">
                        </tbody>
                        <tfoot class="table-secondary">
                            <tr>
                                <th colspan="3">TOTALI CAPITOLO</th>
                                <th class="totale-partecipanti-capitolo">0</th>
                                <th class="totale-ospiti-capitolo">0</th>
                                <th class="totale-generale-capitolo">0</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="esportaCSV('capitolo', ${anno}, '${mese}', '${capitolo}')">
                        <i class="fas fa-download me-2"></i>Esporta CSV
                    </button>
                </div>
            </div>
        `;
        
        contenitore.appendChild(card);
        
        // Popola la tabella del capitolo
        const tbody = document.getElementById(`tabella-capitolo-${capitolo.replace(/\s+/g, '-')}`);
        let totalePartecipanti = 0;
        let totaleOspiti = 0;
        
        datiCapitolo.forEach(riga => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${riga.nomeGruppo}</td>
                <td>${riga.settore}</td>
                <td>${riga.responsabile}</td>
                <td class="text-end">${riga.partecipanti}</td>
                <td class="text-end">${riga.ospiti}</td>
                <td class="text-end fw-bold">${riga.totale}</td>
            `;
            tbody.appendChild(tr);
            
            totalePartecipanti += riga.partecipanti;
            totaleOspiti += riga.ospiti;
        });
        
        // Aggiorna i totali del capitolo
        card.querySelector('.totale-partecipanti-capitolo').textContent = totalePartecipanti;
        card.querySelector('.totale-ospiti-capitolo').textContent = totaleOspiti;
        card.querySelector('.totale-generale-capitolo').textContent = totalePartecipanti + totaleOspiti;
    });
}

// Funzione per generare i riepiloghi per settore
function generaRiepiloghiSettori(dati, anno, mese) {
    const contenitore = document.getElementById('contenitore-riepiloghi');
    if (!contenitore) return;
    
    const settori = [...new Set(dati.map(r => r.settore))].sort();
    const titoloMese = mese === 'tutti' ? 'Tutti i mesi' : mese;
    
    settori.forEach(settore => {
        const datiSettore = dati.filter(r => r.settore === settore);
        
        const card = document.createElement('div');
        card.className = 'card mb-4 shadow-sm';
        
        card.innerHTML = `
            <div class="card-header bg-info text-white">
                <h5 class="mb-0">
                    <i class="fas fa-map-marker-alt me-2"></i>
                    Settore: ${settore} - ${titoloMese} ${anno}
                </h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Gruppo</th>
                                <th>Capitolo</th>
                                <th>Responsabile</th>
                                <th>Partecipanti</th>
                                <th>Ospiti</th>
                                <th>Totale</th>
                            </tr>
                        </thead>
                        <tbody id="tabella-settore-${settore.replace(/\s+/g, '-')}">
                        </tbody>
                        <tfoot class="table-secondary">
                            <tr>
                                <th colspan="3">TOTALI SETTORE</th>
                                <th class="totale-partecipanti-settore">0</th>
                                <th class="totale-ospiti-settore">0</th>
                                <th class="totale-generale-settore">0</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div class="mt-3">
                    <button class="btn btn-info" onclick="esportaCSV('settore', ${anno}, '${mese}', '${settore}')">
                        <i class="fas fa-download me-2"></i>Esporta CSV
                    </button>
                </div>
            </div>
        `;
        
        contenitore.appendChild(card);
        
        // Popola la tabella del settore
        const tbody = document.getElementById(`tabella-settore-${settore.replace(/\s+/g, '-')}`);
        let totalePartecipanti = 0;
        let totaleOspiti = 0;
        
        datiSettore.forEach(riga => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${riga.nomeGruppo}</td>
                <td>${riga.capitolo}</td>
                <td>${riga.responsabile}</td>
                <td class="text-end">${riga.partecipanti}</td>
                <td class="text-end">${riga.ospiti}</td>
                <td class="text-end fw-bold">${riga.totale}</td>
            `;
            tbody.appendChild(tr);
            
            totalePartecipanti += riga.partecipanti;
            totaleOspiti += riga.ospiti;
        });
        
        // Aggiorna i totali del settore
        card.querySelector('.totale-partecipanti-settore').textContent = totalePartecipanti;
        card.querySelector('.totale-ospiti-settore').textContent = totaleOspiti;
        card.querySelector('.totale-generale-settore').textContent = totalePartecipanti + totaleOspiti;
    });
}

// Funzione per esportare in CSV
function esportaCSV(tipo, anno, mese, filtro = '') {
    let datiEsportazione = [];
    let nomeFile = `riepilogo_${tipo}_${anno}_${mese}`;
    
    // Filtra i dati in base ai parametri
    let datiFiltered = righe.filter(r => r.anno === anno);
    if (mese !== 'tutti') {
        datiFiltered = datiFiltered.filter(r => r.mese === mese);
    }
    
    switch (tipo) {
        case 'hombu':
            datiEsportazione = datiFiltered;
            break;
        case 'capitolo':
            datiEsportazione = datiFiltered.filter(r => r.capitolo === filtro);
            nomeFile += `_${filtro.replace(/\s+/g, '_')}`;
            break;
        case 'settore':
            datiEsportazione = datiFiltered.filter(r => r.settore === filtro);
            nomeFile += `_${filtro.replace(/\s+/g, '_')}`;
            break;
    }
    
    // Crea il contenuto CSV
    let csvContent = 'Gruppo,Capitolo,Settore,Responsabile,Partecipanti,Ospiti,Totale\n';
    
    datiEsportazione.forEach(riga => {
        csvContent += `"${riga.nomeGruppo}","${riga.capitolo}","${riga.settore}","${riga.responsabile}",${riga.partecipanti},${riga.ospiti},${riga.totale}\n`;
    });
    
    // Calcola i totali
    const totalePartecipanti = datiEsportazione.reduce((sum, r) => sum + r.partecipanti, 0);
    const totaleOspiti = datiEsportazione.reduce((sum, r) => sum + r.ospiti, 0);
    const totaleGenerale = totalePartecipanti + totaleOspiti;
    
    csvContent += `"TOTALI","","","",${totalePartecipanti},${totaleOspiti},${totaleGenerale}\n`;
    
    // Scarica il file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${nomeFile}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Funzione per il logout
function logout() {
    signOut(auth).then(() => {
        console.log('Logout effettuato');
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Errore durante il logout:', error);
    });
}

// Esporta le funzioni globali
window.esportaCSV = esportaCSV;
window.logout = logout;

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM caricato, inizializzazione in corso...');
    
    // Aggiungi event listener per il logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
