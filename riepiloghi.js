// Importa Firebase
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

// Gestione autenticazione
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Utente autenticato:', user.email);
        caricaDati();
    } else {
        window.location.href = 'index.html';
    }
});

// Funzione principale per caricare i dati
async function caricaDati() {
    try {
        console.log('Inizio caricamento dati...');
        
        // Dichiara gruppiData all'inizio della funzione
        let gruppiData = {};
        
        // Carica i dati dei gruppi
        const gruppiRef = ref(database, 'gruppi');
        const gruppiSnapshot = await get(gruppiRef);
        
        if (gruppiSnapshot.exists()) {
            gruppiData = gruppiSnapshot.val();
            console.log('Dati gruppi caricati:', Object.keys(gruppiData).length, 'gruppi');
        } else {
            console.log('Nessun dato gruppi trovato');
        }
        
        // Carica i dati zadankai
        const zadankaiRef = ref(database, 'zadankai');
        const zadankaiSnapshot = await get(zadankaiRef);
        
        if (zadankaiSnapshot.exists()) {
            console.log('Dati zadankai caricati');
            const zadankaiData = zadankaiSnapshot.val();
            
            // Debug: mostra la struttura dei dati
            console.log('Struttura gruppiData:', Object.keys(gruppiData).slice(0, 3));
            if (Object.keys(gruppiData).length > 0) {
                console.log('Esempio gruppo:', gruppiData[Object.keys(gruppiData)[0]]);
            }
            console.log('Struttura zadankaiData:', Object.keys(zadankaiData).slice(0, 3));
            if (Object.keys(zadankaiData).length > 0) {
                console.log('Esempio zadankai:', zadankaiData[Object.keys(zadankaiData)[0]]);
            }
            
            // Processa i dati
            righe = [];
            
            if (zadankaiData && typeof zadankaiData === 'object') {
                Object.entries(zadankaiData).forEach(([chiave, valore]) => {
                    if (valore && typeof valore === 'object') {
                        // Estrai anno e mese dalla chiave (formato: "2025-01" o simile)
                        const [anno, numeroMese] = chiave.split('-');
                        const mese = getMeseName(numeroMese);
                        
                        console.log(`Elaborando ${chiave}: anno=${anno}, mese=${mese}`);
                        
                        Object.entries(valore).forEach(([gruppoId, datiGruppo]) => {
                            if (datiGruppo && typeof datiGruppo === 'object') {
                                const infoGruppo = gruppiData[gruppoId] || {};
                                
                                console.log('Gruppo ID:', gruppoId);
                                console.log('Info Gruppo:', infoGruppo);
                                console.log('Dati Gruppo:', datiGruppo);
                                
                                // Gestisce i valori numerici in modo più robusto
                                let partecipanti = 0;
                                let ospiti = 0;
                                
                                // Se partecipanti è un oggetto, prova a estrarre il valore
                                if (typeof datiGruppo.partecipanti === 'object' && datiGruppo.partecipanti !== null) {
                                    partecipanti = datiGruppo.partecipanti.valore || datiGruppo.partecipanti.value || 0;
                                } else {
                                    partecipanti = parseInt(datiGruppo.partecipanti) || 0;
                                }
                                
                                // Se ospiti è un oggetto, prova a estrarre il valore
                                if (typeof datiGruppo.ospiti === 'object' && datiGruppo.ospiti !== null) {
                                    ospiti = datiGruppo.ospiti.valore || datiGruppo.ospiti.value || 0;
                                } else {
                                    ospiti = parseInt(datiGruppo.ospiti) || 0;
                                }
                                
                                const riga = {
                                    anno: parseInt(anno),
                                    mese: mese,
                                    gruppoId: gruppoId,
                                    nomeGruppo: infoGruppo.nome || `Gruppo ${gruppoId}`,
                                    capitolo: infoGruppo.capitolo || 'Non specificato',
                                    settore: infoGruppo.settore || 'Non specificato',
                                    responsabile: infoGruppo.responsabile || 'Non specificato',
                                    partecipanti: partecipanti,
                                    ospiti: ospiti,
                                    totale: partecipanti + ospiti
                                };
                                
                                console.log('Riga creata:', riga);
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
function getMeseName(mese) {
    console.log('getMeseName chiamata con:', mese, 'tipo:', typeof mese);
    
    // Se è già una stringa di nome mese, restituiscila
    if (typeof mese === 'string' && mese !== '' && isNaN(mese)) {
        return mese;
    }
    
    // Converti in numero se è una stringa numerica
    let meseNum = typeof mese === 'string' ? parseInt(mese.replace(/^0+/, '')) : mese;
    
    const nomiMesi = {
        1: 'Gennaio', 2: 'Febbraio', 3: 'Marzo', 4: 'Aprile',
        5: 'Maggio', 6: 'Giugno', 7: 'Luglio', 8: 'Agosto',
        9: 'Settembre', 10: 'Ottobre', 11: 'Novembre', 12: 'Dicembre'
    };
    
    return nomiMesi[meseNum] || 'Mese sconosciuto';
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
    const filtroAnno = document.getElementById('filtro-anno');
    const filtroMese = document.getElementById('filtro-mese');
    const filtroLivello = document.getElementById('filtro-livello');
    
    if (!filtroAnno || !filtroMese || !filtroLivello) {
        console.error('Elementi filtro non trovati');
        return;
    }
    
    // Popola il filtro anni
    const anni = [...new Set(righe.map(r => r.anno))].sort((a, b) => b - a);
    filtroAnno.innerHTML = '<option value="">Seleziona anno</option>';
    anni.forEach(anno => {
        const option = document.createElement('option');
        option.value = anno;
        option.textContent = anno;
        filtroAnno.appendChild(option);
    });
    
    // Seleziona l'anno più recente
    if (anni.length > 0) {
        filtroAnno.value = anni[0];
        aggiornaFiltroMesi();
    }
    
    // Event listeners
    filtroAnno.addEventListener('change', aggiornaFiltroMesi);
    filtroMese.addEventListener('change', aggiornaRiepiloghi);
    filtroLivello.addEventListener('change', aggiornaRiepiloghi);
}

// Funzione per aggiornare il filtro mesi
function aggiornaFiltroMesi() {
    const filtroAnno = document.getElementById('filtro-anno');
    const filtroMese = document.getElementById('filtro-mese');
    
    if (!filtroAnno || !filtroMese) return;
    
    const annoSelezionato = parseInt(filtroAnno.value);
    
    if (!annoSelezionato) {
        filtroMese.innerHTML = '<option value="">Seleziona prima un anno</option>';
        return;
    }
    
    // Filtra i mesi disponibili per l'anno selezionato
    const mesiDisponibili = [...new Set(righe
        .filter(r => r.anno === annoSelezionato)
        .map(r => r.mese)
    )];
    
    // Ordina i mesi
    const ordineM = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                     'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    mesiDisponibili.sort((a, b) => ordineM.indexOf(a) - ordineM.indexOf(b));
    
    // Popola il dropdown
    filtroMese.innerHTML = '<option value="tutti">Tutti i mesi</option>';
    mesiDisponibili.forEach(mese => {
        const option = document.createElement('option');
        option.value = mese;
        option.textContent = mese;
        filtroMese.appendChild(option);
    });
    
    // Seleziona il mese più recente
    if (mesiDisponibili.length > 0) {
        filtroMese.value = mesiDisponibili[mesiDisponibili.length - 1];
    }
    
    aggiornaRiepiloghi();
}

// Funzione per aggiornare i riepiloghi
function aggiornaRiepiloghi() {
    const annoSelezionato = document.getElementById('filtro-anno')?.value;
    const meseSelezionato = document.getElementById('filtro-mese').value;
    console.log('Mese selezionato dal filtro:', meseSelezionato);
    
    let righeFiltratePerMese = righeFiltratePerAnno;
    if (meseSelezionato && meseSelezionato !== '') {
        righeFiltratePerMese = righeFiltratePerAnno.filter(riga => {
            // Se il mese selezionato è un numero, confronta con il numero del mese
            if (!isNaN(meseSelezionato)) {
                return riga.mese == meseSelezionato;
            }
            // Se il mese selezionato è un nome, confronta con il nome
            return riga.mese === meseSelezionato || getMeseName(riga.mese) === meseSelezionato;
        });
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
    
    const nomeMese = mese === 'tutti' ? 'Tutti i mesi' : getMeseName(mese);
    
    card.innerHTML = `
        <div class="card-header bg-success text-white">
            <h5 class="mb-0">
                <i class="fas fa-chart-bar me-2"></i>
                Riepilogo Hombu 9 - ${nomeMese} ${anno}
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
    
    // Raggruppa per capitolo
    const datiPerCapitolo = {};
    dati.forEach(riga => {
        if (!datiPerCapitolo[riga.capitolo]) {
            datiPerCapitolo[riga.capitolo] = [];
        }
        datiPerCapitolo[riga.capitolo].push(riga);
    });
    
    const titoloMese = mese === 'tutti' ? 'Tutti i mesi' : mese;
    
    Object.entries(datiPerCapitolo).forEach(([capitolo, righeCapitolo]) => {
        const card = document.createElement('div');
        card.className = 'card mb-4 shadow-sm';
        
        card.innerHTML = `
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                    <i class="fas fa-users me-2"></i>
                    ${capitolo} - ${titoloMese} ${anno}
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
                        <tbody id="tabella-${capitolo.replace(/\s+/g, '-')}">
                        </tbody>
                        <tfoot class="table-secondary">
                            <tr>
                                <th colspan="3">TOTALI ${capitolo}</th>
                                <th id="totale-partecipanti-${capitolo.replace(/\s+/g, '-')}">0</th>
                                <th id="totale-ospiti-${capitolo.replace(/\s+/g, '-')}">0</th>
                                <th id="totale-generale-${capitolo.replace(/\s+/g, '-')}">0</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="esportaCSV('capitoli', ${anno}, '${mese}', '${capitolo}')">
                        <i class="fas fa-download me-2"></i>Esporta CSV
                    </button>
                </div>
            </div>
        `;
        
        contenitore.appendChild(card);
        
        // Popola la tabella del capitolo
        const tbody = document.getElementById(`tabella-${capitolo.replace(/\s+/g, '-')}`);
        let totalePartecipanti = 0;
        let totaleOspiti = 0;
        
        righeCapitolo.forEach(riga => {
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
        document.getElementById(`totale-partecipanti-${capitolo.replace(/\s+/g, '-')}`).textContent = totalePartecipanti;
        document.getElementById(`totale-ospiti-${capitolo.replace(/\s+/g, '-')}`).textContent = totaleOspiti;
        document.getElementById(`totale-generale-${capitolo.replace(/\s+/g, '-')}`).textContent = totalePartecipanti + totaleOspiti;
    });
}

// Funzione per generare i riepiloghi per settore
function generaRiepiloghiSettori(dati, anno, mese) {
    const contenitore = document.getElementById('contenitore-riepiloghi');
    if (!contenitore) return;
    
    // Raggruppa per settore
    const datiPerSettore = {};
    dati.forEach(riga => {
        if (!datiPerSettore[riga.settore]) {
            datiPerSettore[riga.settore] = [];
        }
        datiPerSettore[riga.settore].push(riga);
    });
    
    const titoloMese = mese === 'tutti' ? 'Tutti i mesi' : mese;
    
    Object.entries(datiPerSettore).forEach(([settore, righeSettore]) => {
        const card = document.createElement('div');
        card.className = 'card mb-4 shadow-sm';
        
        card.innerHTML = `
            <div class="card-header bg-warning text-dark">
                <h5 class="mb-0">
                    <i class="fas fa-building me-2"></i>
                    ${settore} - ${titoloMese} ${anno}
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
                                <th colspan="3">TOTALI ${settore}</th>
                                <th id="totale-partecipanti-settore-${settore.replace(/\s+/g, '-')}">0</th>
                                <th id="totale-ospiti-settore-${settore.replace(/\s+/g, '-')}">0</th>
                                <th id="totale-generale-settore-${settore.replace(/\s+/g, '-')}">0</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div class="mt-3">
                    <button class="btn btn-warning" onclick="esportaCSV('settori', ${anno}, '${mese}', '${settore}')">
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
        
        righeSettore.forEach(riga => {
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
        document.getElementById(`totale-partecipanti-settore-${settore.replace(/\s+/g, '-')}`).textContent = totalePartecipanti;
        document.getElementById(`totale-ospiti-settore-${settore.replace(/\s+/g, '-')}`).textContent = totaleOspiti;
        document.getElementById(`totale-generale-settore-${settore.replace(/\s+/g, '-')}`).textContent = totalePartecipanti + totaleOspiti;
    });
}

// Funzione per esportare in CSV
function esportaCSV(tipo, anno, mese, filtro = '') {
    let datiEsportazione = righe.filter(r => r.anno === anno);
    
    if (mese !== 'tutti') {
        datiEsportazione = datiEsportazione.filter(r => r.mese === mese);
    }
    
    if (filtro) {
        if (tipo === 'capitoli') {
            datiEsportazione = datiEsportazione.filter(r => r.capitolo === filtro);
        } else if (tipo === 'settori') {
            datiEsportazione = datiEsportazione.filter(r => r.settore === filtro);
        }
    }
    
    // Crea il CSV
    const headers = ['Gruppo', 'Capitolo', 'Settore', 'Responsabile', 'Partecipanti', 'Ospiti', 'Totale'];
    let csvContent = headers.join(',') + '\n';
    
    datiEsportazione.forEach(riga => {
        const row = [
            `"${riga.nomeGruppo}"`,
            `"${riga.capitolo}"`,
            `"${riga.settore}"`,
            `"${riga.responsabile}"`,
            riga.partecipanti,
            riga.ospiti,
            riga.totale
        ];
        csvContent += row.join(',') + '\n';
    });
    
    // Download del file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const nomeFile = `riepilogo_${tipo}_${anno}_${mese}${filtro ? '_' + filtro.replace(/\s+/g, '_') : ''}.csv`;
    link.setAttribute('download', nomeFile);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Funzione di logout
function logout() {
    signOut(auth).then(() => {
        console.log('Logout effettuato');
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Errore durante il logout:', error);
    });
}

// Esporta le funzioni per l'uso globale
window.esportaCSV = esportaCSV;
window.logout = logout;

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM caricato, inizializzazione in corso...');
});
