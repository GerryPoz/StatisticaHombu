// Configurazione Firebase
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

// Verifica autenticazione
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Utente autenticato:', user.email);
        caricaDati();
    } else {
        console.log('Utente non autenticato, reindirizzamento al login');
        window.location.href = 'index.html';
    }
});

// Funzione per caricare i dati
async function caricaDati() {
    try {
        console.log('Inizio caricamento dati...');
        
        // Carica i dati dei gruppi
        const gruppiRef = ref(database, 'gruppi');
        const gruppiSnapshot = await get(gruppiRef);
        
        if (gruppiSnapshot.exists()) {
            const gruppiData = gruppiSnapshot.val();
            console.log('Dati gruppi caricati:', Object.keys(gruppiData).length, 'gruppi');
            
            // Costruisci le mappe dei gruppi
            Object.entries(gruppiData).forEach(([id, gruppo]) => {
                if (gruppo && typeof gruppo === 'object') {
                    gruppiMap.set(id, gruppo.nome || id);
                    
                    if (gruppo.capitolo) {
                        capitoliMap.set(gruppo.capitolo, gruppo.capitolo);
                    }
                    if (gruppo.settore) {
                        settoriMap.set(gruppo.settore, gruppo.settore);
                    }
                }
            });
        }
        
        // Carica i dati statistici
        const datiRef = ref(database, 'zadankai');
        const datiSnapshot = await get(datiRef);
        
        if (datiSnapshot.exists()) {
            const datiData = datiSnapshot.val();
            console.log('Dati zadankai caricati');
            
            righe = [];
            
            // Processa i dati
            Object.entries(datiData).forEach(([chiave, valore]) => {
                if (valore && typeof valore === 'object') {
                    // Estrai anno e mese dalla chiave (formato: "2025-01" o simile)
                    const parti = chiave.split('-');
                    if (parti.length >= 2) {
                        const anno = parti[0];
                        const meseNumero = parti[1];
                        const mese = getMeseName(meseNumero);
                        
                        // Processa ogni gruppo nel mese
                        Object.entries(valore).forEach(([gruppoId, datiGruppo]) => {
                            if (datiGruppo && typeof datiGruppo === 'object') {
                                const gruppo = gruppiData[gruppoId] || {};
                                
                                righe.push({
                                    anno: anno,
                                    mese: mese,
                                    gruppo: gruppoId,
                                    nomeGruppo: gruppo.nome || gruppoId,
                                    capitolo: gruppo.capitolo || 'Non specificato',
                                    settore: gruppo.settore || 'Non specificato',
                                    membri: parseInt(datiGruppo.membri) || 0,
                                    ospiti: parseInt(datiGruppo.ospiti) || 0,
                                    totale: (parseInt(datiGruppo.membri) || 0) + (parseInt(datiGruppo.ospiti) || 0)
                                });
                            }
                        });
                    }
                }
            });
            
            console.log('Righe elaborate:', righe.length);
            inizializzaFiltri();
            aggiornaRiepiloghi();
        } else {
            console.log('Nessun dato trovato nel database');
        }
        
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        alert('Errore nel caricamento dei dati: ' + error.message);
    }
}

// Funzione per convertire numero mese in nome
function getMeseName(numeroMese) {
    const mesi = {
        '01': 'Gennaio', '02': 'Febbraio', '03': 'Marzo', '04': 'Aprile',
        '05': 'Maggio', '06': 'Giugno', '07': 'Luglio', '08': 'Agosto',
        '09': 'Settembre', '10': 'Ottobre', '11': 'Novembre', '12': 'Dicembre'
    };
    return mesi[numeroMese] || numeroMese;
}

// Funzione per inizializzare i filtri
function inizializzaFiltri() {
    // Popola filtro anni
    const anni = [...new Set(righe.map(r => r.anno))].sort((a, b) => b - a);
    const selectAnno = document.getElementById('filtroAnno');
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
    const filtroAnno = document.getElementById('filtroAnno');
    const filtroMese = document.getElementById('filtroMese');
    const filtroLivello = document.getElementById('filtroLivello');
    
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
    const annoSelezionato = document.getElementById('filtroAnno')?.value;
    const selectMese = document.getElementById('filtroMese');
    
    if (!selectMese || !annoSelezionato) return;
    
    // Filtra i mesi per l'anno selezionato
    const mesiDisponibili = [...new Set(
        righe.filter(r => r.anno === annoSelezionato)
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
    const annoSelezionato = document.getElementById('filtroAnno')?.value;
    const meseSelezionato = document.getElementById('filtroMese')?.value;
    const livelloSelezionato = document.getElementById('filtroLivello')?.value;
    
    if (!annoSelezionato || !meseSelezionato || !livelloSelezionato) {
        console.log('Filtri non completi');
        return;
    }
    
    console.log('Aggiornamento riepiloghi:', { annoSelezionato, meseSelezionato, livelloSelezionato });
    
    // Filtra i dati
    let datiFiltrati = righe.filter(r => r.anno === annoSelezionato);
    
    if (meseSelezionato !== 'tutti') {
        datiFiltrati = datiFiltrati.filter(r => r.mese === meseSelezionato);
    }
    
    console.log('Dati filtrati:', datiFiltrati.length);
    
    // Genera il riepilogo appropriato
    switch (livelloSelezionato) {
        case 'hombu':
            generaRiepilogoHombu(datiFiltrati, annoSelezionato, meseSelezionato);
            break;
        case 'capitoli':
            generaRiepiloghiCapitoli(datiFiltrati, annoSelezionato, meseSelezionato);
            break;
        case 'settori':
            generaRiepiloghiSettori(datiFiltrati, annoSelezionato, meseSelezionato);
            break;
    }
}

// Funzione per generare riepilogo Hombu
function generaRiepilogoHombu(dati, anno, mese) {
    const container = document.getElementById('riepiloghi-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Crea card per Hombu
    const card = document.createElement('div');
    card.className = 'riepilogo-card';
    
    const titolo = mese === 'tutti' ? `Hombu - ${anno} (Tutti i mesi)` : `Hombu - ${mese} ${anno}`;
    
    card.innerHTML = `
        <div class="card-header">
            <h3>${titolo}</h3>
            <div class="card-actions">
                <button onclick="esportaCSV('hombu', '${anno}', '${mese}')" class="btn-export">Esporta CSV</button>
            </div>
        </div>
        <div class="table-container">
            <table id="tabella-hombu">
                <thead>
                    <tr>
                        <th>Gruppo</th>
                        <th>Capitolo</th>
                        <th>Settore</th>
                        <th>Membri</th>
                        <th>Ospiti</th>
                        <th>Totale</th>
                    </tr>
                </thead>
                <tbody></tbody>
                <tfoot>
                    <tr class="totale-row">
                        <td colspan="3"><strong>TOTALE HOMBU</strong></td>
                        <td id="totale-membri"><strong>0</strong></td>
                        <td id="totale-ospiti"><strong>0</strong></td>
                        <td id="totale-generale"><strong>0</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    container.appendChild(card);
    
    // Popola la tabella
    const tbody = document.querySelector('#tabella-hombu tbody');
    let totaleMembri = 0, totaleOspiti = 0;
    
    // Raggruppa per gruppo se "tutti i mesi"
    let datiRaggruppati;
    if (mese === 'tutti') {
        const gruppi = {};
        dati.forEach(riga => {
            if (!gruppi[riga.gruppo]) {
                gruppi[riga.gruppo] = {
                    nomeGruppo: riga.nomeGruppo,
                    capitolo: riga.capitolo,
                    settore: riga.settore,
                    membri: 0,
                    ospiti: 0
                };
            }
            gruppi[riga.gruppo].membri += riga.membri;
            gruppi[riga.gruppo].ospiti += riga.ospiti;
        });
        datiRaggruppati = Object.values(gruppi);
    } else {
        datiRaggruppati = dati;
    }
    
    datiRaggruppati.sort((a, b) => a.nomeGruppo.localeCompare(b.nomeGruppo));
    
    datiRaggruppati.forEach(riga => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${riga.nomeGruppo}</td>
            <td>${riga.capitolo}</td>
            <td>${riga.settore}</td>
            <td>${riga.membri}</td>
            <td>${riga.ospiti}</td>
            <td>${riga.membri + riga.ospiti}</td>
        `;
        tbody.appendChild(tr);
        
        totaleMembri += riga.membri;
        totaleOspiti += riga.ospiti;
    });
    
    // Aggiorna i totali
    document.getElementById('totale-membri').innerHTML = `<strong>${totaleMembri}</strong>`;
    document.getElementById('totale-ospiti').innerHTML = `<strong>${totaleOspiti}</strong>`;
    document.getElementById('totale-generale').innerHTML = `<strong>${totaleMembri + totaleOspiti}</strong>`;
}

// Funzione per generare riepiloghi per capitoli
function generaRiepiloghiCapitoli(dati, anno, mese) {
    const container = document.getElementById('riepiloghi-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Raggruppa per capitolo
    const capitoli = {};
    dati.forEach(riga => {
        if (!capitoli[riga.capitolo]) {
            capitoli[riga.capitolo] = [];
        }
        capitoli[riga.capitolo].push(riga);
    });
    
    // Crea una card per ogni capitolo
    Object.entries(capitoli).sort(([a], [b]) => a.localeCompare(b)).forEach(([capitolo, righeCapitolo]) => {
        const card = document.createElement('div');
        card.className = 'riepilogo-card';
        
        const titolo = mese === 'tutti' ? `${capitolo} - ${anno} (Tutti i mesi)` : `${capitolo} - ${mese} ${anno}`;
        
        card.innerHTML = `
            <div class="card-header">
                <h3>${titolo}</h3>
                <div class="card-actions">
                    <button onclick="esportaCSV('capitolo', '${anno}', '${mese}', '${capitolo}')" class="btn-export">Esporta CSV</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Gruppo</th>
                            <th>Settore</th>
                            <th>Membri</th>
                            <th>Ospiti</th>
                            <th>Totale</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                    <tfoot>
                        <tr class="totale-row">
                            <td colspan="2"><strong>TOTALE ${capitolo.toUpperCase()}</strong></td>
                            <td class="totale-membri"><strong>0</strong></td>
                            <td class="totale-ospiti"><strong>0</strong></td>
                            <td class="totale-generale"><strong>0</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
        container.appendChild(card);
        
        // Popola la tabella
        const tbody = card.querySelector('tbody');
        let totaleMembri = 0, totaleOspiti = 0;
        
        // Raggruppa per gruppo se "tutti i mesi"
        let datiRaggruppati;
        if (mese === 'tutti') {
            const gruppi = {};
            righeCapitolo.forEach(riga => {
                if (!gruppi[riga.gruppo]) {
                    gruppi[riga.gruppo] = {
                        nomeGruppo: riga.nomeGruppo,
                        settore: riga.settore,
                        membri: 0,
                        ospiti: 0
                    };
                }
                gruppi[riga.gruppo].membri += riga.membri;
                gruppi[riga.gruppo].ospiti += riga.ospiti;
            });
            datiRaggruppati = Object.values(gruppi);
        } else {
            datiRaggruppati = righeCapitolo;
        }
        
        datiRaggruppati.sort((a, b) => a.nomeGruppo.localeCompare(b.nomeGruppo));
        
        datiRaggruppati.forEach(riga => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${riga.nomeGruppo}</td>
                <td>${riga.settore}</td>
                <td>${riga.membri}</td>
                <td>${riga.ospiti}</td>
                <td>${riga.membri + riga.ospiti}</td>
            `;
            tbody.appendChild(tr);
            
            totaleMembri += riga.membri;
            totaleOspiti += riga.ospiti;
        });
        
        // Aggiorna i totali
        card.querySelector('.totale-membri').innerHTML = `<strong>${totaleMembri}</strong>`;
        card.querySelector('.totale-ospiti').innerHTML = `<strong>${totaleOspiti}</strong>`;
        card.querySelector('.totale-generale').innerHTML = `<strong>${totaleMembri + totaleOspiti}</strong>`;
    });
}

// Funzione per generare riepiloghi per settori
function generaRiepiloghiSettori(dati, anno, mese) {
    const container = document.getElementById('riepiloghi-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Raggruppa per settore
    const settori = {};
    dati.forEach(riga => {
        if (!settori[riga.settore]) {
            settori[riga.settore] = [];
        }
        settori[riga.settore].push(riga);
    });
    
    // Crea una card per ogni settore
    Object.entries(settori).sort(([a], [b]) => a.localeCompare(b)).forEach(([settore, righeSettore]) => {
        const card = document.createElement('div');
        card.className = 'riepilogo-card';
        
        const titolo = mese === 'tutti' ? `${settore} - ${anno} (Tutti i mesi)` : `${settore} - ${mese} ${anno}`;
        
        card.innerHTML = `
            <div class="card-header">
                <h3>${titolo}</h3>
                <div class="card-actions">
                    <button onclick="esportaCSV('settore', '${anno}', '${mese}', '${settore}')" class="btn-export">Esporta CSV</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Gruppo</th>
                            <th>Capitolo</th>
                            <th>Membri</th>
                            <th>Ospiti</th>
                            <th>Totale</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                    <tfoot>
                        <tr class="totale-row">
                            <td colspan="2"><strong>TOTALE ${settore.toUpperCase()}</strong></td>
                            <td class="totale-membri"><strong>0</strong></td>
                            <td class="totale-ospiti"><strong>0</strong></td>
                            <td class="totale-generale"><strong>0</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
        container.appendChild(card);
        
        // Popola la tabella
        const tbody = card.querySelector('tbody');
        let totaleMembri = 0, totaleOspiti = 0;
        
        // Raggruppa per gruppo se "tutti i mesi"
        let datiRaggruppati;
        if (mese === 'tutti') {
            const gruppi = {};
            righeSettore.forEach(riga => {
                if (!gruppi[riga.gruppo]) {
                    gruppi[riga.gruppo] = {
                        nomeGruppo: riga.nomeGruppo,
                        capitolo: riga.capitolo,
                        membri: 0,
                        ospiti: 0
                    };
                }
                gruppi[riga.gruppo].membri += riga.membri;
                gruppi[riga.gruppo].ospiti += riga.ospiti;
            });
            datiRaggruppati = Object.values(gruppi);
        } else {
            datiRaggruppati = righeSettore;
        }
        
        datiRaggruppati.sort((a, b) => a.nomeGruppo.localeCompare(b.nomeGruppo));
        
        datiRaggruppati.forEach(riga => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${riga.nomeGruppo}</td>
                <td>${riga.capitolo}</td>
                <td>${riga.membri}</td>
                <td>${riga.ospiti}</td>
                <td>${riga.membri + riga.ospiti}</td>
            `;
            tbody.appendChild(tr);
            
            totaleMembri += riga.membri;
            totaleOspiti += riga.ospiti;
        });
        
        // Aggiorna i totali
        card.querySelector('.totale-membri').innerHTML = `<strong>${totaleMembri}</strong>`;
        card.querySelector('.totale-ospiti').innerHTML = `<strong>${totaleOspiti}</strong>`;
        card.querySelector('.totale-generale').innerHTML = `<strong>${totaleMembri + totaleOspiti}</strong>`;
    });
}

// Funzione per esportare in CSV
function esportaCSV(tipo, anno, mese, filtro = '') {
    let datiEsportazione = [];
    let nomeFile = '';
    
    // Filtra i dati per l'esportazione
    let datiBase = righe.filter(r => r.anno === anno);
    if (mese !== 'tutti') {
        datiBase = datiBase.filter(r => r.mese === mese);
    }
    
    switch (tipo) {
        case 'hombu':
            datiEsportazione = datiBase;
            nomeFile = mese === 'tutti' ? `Hombu_${anno}_tutti_mesi.csv` : `Hombu_${mese}_${anno}.csv`;
            break;
        case 'capitolo':
            datiEsportazione = datiBase.filter(r => r.capitolo === filtro);
            nomeFile = mese === 'tutti' ? `${filtro}_${anno}_tutti_mesi.csv` : `${filtro}_${mese}_${anno}.csv`;
            break;
        case 'settore':
            datiEsportazione = datiBase.filter(r => r.settore === filtro);
            nomeFile = mese === 'tutti' ? `${filtro}_${anno}_tutti_mesi.csv` : `${filtro}_${mese}_${anno}.csv`;
            break;
    }
    
    if (datiEsportazione.length === 0) {
        alert('Nessun dato da esportare');
        return;
    }
    
    // Raggruppa per gruppo se "tutti i mesi"
    let datiFinali;
    if (mese === 'tutti') {
        const gruppi = {};
        datiEsportazione.forEach(riga => {
            if (!gruppi[riga.gruppo]) {
                gruppi[riga.gruppo] = {
                    gruppo: riga.nomeGruppo,
                    capitolo: riga.capitolo,
                    settore: riga.settore,
                    membri: 0,
                    ospiti: 0,
                    totale: 0
                };
            }
            gruppi[riga.gruppo].membri += riga.membri;
            gruppi[riga.gruppo].ospiti += riga.ospiti;
            gruppi[riga.gruppo].totale += riga.totale;
        });
        datiFinali = Object.values(gruppi);
    } else {
        datiFinali = datiEsportazione.map(r => ({
            gruppo: r.nomeGruppo,
            capitolo: r.capitolo,
            settore: r.settore,
            membri: r.membri,
            ospiti: r.ospiti,
            totale: r.totale
        }));
    }
    
    // Crea il CSV
    const headers = ['Gruppo', 'Capitolo', 'Settore', 'Membri', 'Ospiti', 'Totale'];
    let csvContent = headers.join(',') + '\n';
    
    datiFinali.forEach(riga => {
        const row = [
            `"${riga.gruppo}"`,
            `"${riga.capitolo}"`,
            `"${riga.settore}"`,
            riga.membri,
            riga.ospiti,
            riga.totale
        ];
        csvContent += row.join(',') + '\n';
    });
    
    // Scarica il file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', nomeFile);
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
        alert('Errore durante il logout');
    });
}

// Rendi le funzioni globali
window.esportaCSV = esportaCSV;
window.logout = logout;

// Inizializzazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM caricato, inizializzazione in corso...');
    
    // Aggiungi event listener per il pulsante logout se esiste
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
