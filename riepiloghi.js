// Importa Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

// Configurazione bordi
const BORDER_CONFIG = {
  vertical: {
    thickness: "2px",
    style: "solid",
    color: "#3282F6"
  },
  horizontal: {
    thickness: "4px",
    style: "solid",
    color: "#EE8AF8"
  },
  getVerticalBorder: function() {
    return `${this.vertical.thickness} ${this.vertical.style} ${this.vertical.color}`;
  },
  getHorizontalBorder: function() {
    return `${this.horizontal.thickness} ${this.horizontal.style} ${this.horizontal.color}`;
  }
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Variabili globali
let righe = [];
let gruppiData;
let gruppoToCapitolo = {};

const mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

// Controllo autenticazione
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Utente autenticato:', user.email);
        caricaDati();
    } else {
        window.location.href = 'index.html';
    }
});

// Funzione per calcolare il mese precedente
function mesePrecedente(mese, anno) {
    const indiceMese = mesiOrdine.indexOf(mese);
    return indiceMese === 0 
        ? { mese: mesiOrdine[11], anno: (parseInt(anno) - 1).toString() }
        : { mese: mesiOrdine[indiceMese - 1], anno: anno };
}

// Carica i dati
async function caricaDati() {
    try {
        console.log('Caricamento dati in corso...');
        
        // Carica gruppi.json
        const responseGruppi = await fetch('./gruppi.json');
        gruppiData = await responseGruppi.json();
        
        // Crea mappa gruppo -> capitolo
        Object.keys(gruppiData.hombu9).forEach(capitolo => {
            Object.keys(gruppiData.hombu9[capitolo]).forEach(settore => {
                gruppiData.hombu9[capitolo][settore].forEach(gruppo => {
                    gruppoToCapitolo[gruppo] = capitolo;
                });
            });
        });
        
        // Carica dati da Firebase
        const snapshot = await get(ref(database, 'zadankai'));
        if (snapshot.exists()) {
            const datiZadankai = snapshot.val();
            
            Object.keys(datiZadankai).forEach(anno => {
                Object.keys(datiZadankai[anno]).forEach(mese => {
                    Object.keys(datiZadankai[anno][mese]).forEach(gruppo => {
                        const datiGruppo = datiZadankai[anno][mese][gruppo];
                        
                        // Zadankai
                        if (datiGruppo.zadankai) {
                            Object.keys(datiGruppo.zadankai).forEach(sezione => {
                                const datiSezione = datiGruppo.zadankai[sezione];
                                righe.push({
                                    anno: parseInt(anno),
                                    mese: mese,
                                    gruppo: gruppo,
                                    tipo: 'ZADANKAI',
                                    sezione: sezione,
                                    U: datiSezione.U || 0,
                                    D: datiSezione.D || 0,
                                    GU: datiSezione.GU || 0,
                                    GD: datiSezione.GD || 0,
                                    FUT: datiSezione.FUT || 0,
                                    STU: datiSezione.STU || 0
                                });
                            });
                        }
                        
                        // Praticanti
                        if (datiGruppo.praticanti) {
                            Object.keys(datiGruppo.praticanti).forEach(sezione => {
                                const datiSezione = datiGruppo.praticanti[sezione];
                                righe.push({
                                    anno: parseInt(anno),
                                    mese: mese,
                                    gruppo: gruppo,
                                    tipo: 'PRATICANTI',
                                    sezione: sezione,
                                    U: datiSezione.U || 0,
                                    D: datiSezione.D || 0,
                                    GU: datiSezione.GU || 0,
                                    GD: datiSezione.GD || 0,
                                    FUT: datiSezione.FUT || 0,
                                    STU: datiSezione.STU || 0
                                });
                            });
                        }
                    });
                });
            });
        }
        
        console.log('Dati caricati:', righe.length, 'righe');
        inizializzaFiltri();
        
        // Aggiungi event listeners per i pulsanti di esportazione
        const btnExportExcel = document.getElementById('btn-export-excel');
        const btnExportPdf = document.getElementById('btn-export-pdf');
        const btnPrint = document.getElementById('btn-print');
        
        if (btnExportExcel) btnExportExcel.addEventListener('click', esportaExcel);
        if (btnExportPdf) btnExportPdf.addEventListener('click', esportaPdf);
        if (btnPrint) btnPrint.addEventListener('click', stampa);
        
        aggiornaRiepiloghi();
        
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        alert('Errore nel caricamento dei dati. Controlla la console.');
    }
}

// Inizializza i filtri
function inizializzaFiltri() {
    const filtroAnno = document.getElementById('filtro-anno');
    const filtroMese = document.getElementById('filtro-mese');
    
    // Popola filtro anno
    const anni = [...new Set(righe.map(r => r.anno))].sort((a, b) => b - a);
    anni.forEach(anno => {
        const option = document.createElement('option');
        option.value = anno;
        option.textContent = anno;
        filtroAnno.appendChild(option);
    });
    
    // Popola filtro mese
    const mesiPresenti = [...new Set(righe.map(r => r.mese))];
    mesiOrdine.forEach(mese => {
        if (mesiPresenti.includes(mese)) {
            const option = document.createElement('option');
            option.value = mese;
            option.textContent = mese;
            filtroMese.appendChild(option);
        }
    });
    
    // Imposta valori predefiniti
    if (anni.length > 0) filtroAnno.value = anni[0];
    if (mesiPresenti.length > 0) {
        const ultimoMese = mesiPresenti[mesiPresenti.length - 1];
        filtroMese.value = ultimoMese;
    }
    
    // Event listeners
    filtroAnno.addEventListener('change', aggiornaRiepiloghi);
    filtroMese.addEventListener('change', aggiornaRiepiloghi);
}

// Aggiorna i riepiloghi
function aggiornaRiepiloghi() {
    const annoSelezionato = document.getElementById('filtro-anno').value;
    const meseSelezionato = document.getElementById('filtro-mese').value;
    
    if (!annoSelezionato || !meseSelezionato) return;
    
    // Pulisci il contenitore
    document.getElementById('contenitore-riepiloghi').innerHTML = '';
    
    const righeFiltratePerAnno = righe.filter(r => r.anno === parseInt(annoSelezionato));
    const righeFiltrate = righeFiltratePerAnno.filter(r => r.mese === meseSelezionato);
    
    if (righeFiltrate.length === 0) {
        document.getElementById('contenitore-riepiloghi').innerHTML = 
            '<div class="alert alert-warning">Nessun dato disponibile per il periodo selezionato.</div>';
        return;
    }
    
    const { mese: mesePrec, anno: annoPrec } = mesePrecedente(meseSelezionato, annoSelezionato);
    
    // Genera i riepiloghi
    generaRiepilogoHombu(righeFiltrate, meseSelezionato, annoSelezionato, mesePrec, annoPrec);
    generaRiepiloghiCapitoli(righeFiltrate, meseSelezionato, annoSelezionato, mesePrec, annoPrec);
}

// Genera riepilogo Hombu
function generaRiepilogoHombu(righeFiltrate, mese, anno, mesePrec, annoPrec) {
    const contenitore = document.getElementById('contenitore-riepiloghi');
    
    // Calcola totali Hombu
    const totaliHombu = righeFiltrate.reduce((acc, r) => ({
        U: acc.U + r.U,
        D: acc.D + r.D,
        GU: acc.GU + r.GU,
        GD: acc.GD + r.GD,
        FUT: acc.FUT + r.FUT,
        STU: acc.STU + r.STU
    }), { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 });
    
    const totaleHombu = totaliHombu.U + totaliHombu.D + totaliHombu.GU + totaliHombu.GD;
    
    // Calcola totali mese precedente
    const righePrecHombu = righe.filter(r => r.anno === parseInt(annoPrec) && r.mese === mesePrec);
    const totaliPrecHombu = righePrecHombu.reduce((acc, r) => ({
        U: acc.U + r.U,
        D: acc.D + r.D,
        GU: acc.GU + r.GU,
        GD: acc.GD + r.GD,
        FUT: acc.FUT + r.FUT,
        STU: acc.STU + r.STU
    }), { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 });
    
    const totalePrecHombu = totaliPrecHombu.U + totaliPrecHombu.D + totaliPrecHombu.GU + totaliPrecHombu.GD;
    const deltaHombu = totaleHombu - totalePrecHombu;
    
    // Crea card Hombu
    const cardHombu = document.createElement('div');
    cardHombu.className = 'card mb-4 shadow-sm';
    cardHombu.innerHTML = `
        <div class="card-header bg-success text-white">
            <h4 class="mb-0"><i class="fas fa-home me-2"></i>RIEPILOGO HOMBU 9 - ${mese} ${anno}</h4>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Categoria</th>
                            <th>Sezione</th>
                            <th>U</th>
                            <th>D</th>
                            <th>GU</th>
                            <th>GD</th>
                            <th>Somma</th>
                            <th>Prec.</th>
                            <th>Δ</th>
                            <th>Futuro</th>
                            <th>Studenti</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="table-success">
                            <td><strong>TOTALE HOMBU</strong></td>
                            <td><strong>GENERALE</strong></td>
                            <td><strong>${totaliHombu.U}</strong></td>
                            <td><strong>${totaliHombu.D}</strong></td>
                            <td><strong>${totaliHombu.GU}</strong></td>
                            <td><strong>${totaliHombu.GD}</strong></td>
                            <td><strong>${totaleHombu}</strong></td>
                            <td><strong>${totalePrecHombu}</strong></td>
                            <td><strong class="${deltaHombu >= 0 ? 'text-success' : 'text-danger'}">${deltaHombu >= 0 ? '+' : ''}${deltaHombu}</strong></td>
                            <td><strong>${totaliHombu.FUT}</strong></td>
                            <td><strong>${totaliHombu.STU}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    contenitore.appendChild(cardHombu);
}

// Genera riepiloghi per capitoli
function generaRiepiloghiCapitoli(righeFiltrate, mese, anno, mesePrec, annoPrec) {
    const contenitore = document.getElementById('contenitore-riepiloghi');
    const capitoli = [...new Set(righeFiltrate.map(r => gruppoToCapitolo[r.gruppo]))].filter(Boolean).sort();
    
    capitoli.forEach(capitolo => {
        const righeCap = righeFiltrate.filter(r => gruppoToCapitolo[r.gruppo] === capitolo);
        generaRiepilogoCapitolo(righeCap, capitolo, mese, anno, mesePrec, annoPrec, contenitore);
        
        // Genera riepiloghi settori per questo capitolo
        const settori = [...new Set(righeCap.map(r => {
            return gruppiData.hombu9[capitolo] ? 
                Object.keys(gruppiData.hombu9[capitolo]).find(s => 
                    gruppiData.hombu9[capitolo][s].includes(r.gruppo)
                ) : null;
        }))].filter(Boolean).sort();
        
        settori.forEach(settore => {
            const righeSettore = righeCap.filter(r => 
                gruppiData.hombu9[capitolo][settore].includes(r.gruppo)
            );
            const gruppiSettore = [...new Set(righeSettore.map(r => r.gruppo))].sort();
            generaRiepilogoSettore(righeSettore, settore, mese, anno, mesePrec, annoPrec, gruppiSettore, contenitore);
        });
    });
}

// Genera riepilogo per settore
function generaRiepilogoSettore(righeSettore, settore, mese, anno, mesePrec, annoPrec, gruppiSettore, contenitore) {
    // Calcola totali settore
    const totaliSettore = righeSettore.reduce((acc, r) => ({
        U: acc.U + r.U,
        D: acc.D + r.D,
        GU: acc.GU + r.GU,
        GD: acc.GD + r.GD,
        FUT: acc.FUT + r.FUT,
        STU: acc.STU + r.STU
    }), { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 });
    
    const totaleSettore = totaliSettore.U + totaliSettore.D + totaliSettore.GU + totaliSettore.GD;
    
    // Calcola totali mese precedente
    const righePrecSettore = righe.filter(r => 
        r.anno === parseInt(annoPrec) && 
        r.mese === mesePrec && 
        gruppiSettore.includes(r.gruppo)
    );
    
    const totaliPrecSettore = righePrecSettore.reduce((acc, r) => ({
        U: acc.U + r.U,
        D: acc.D + r.D,
        GU: acc.GU + r.GU,
        GD: acc.GD + r.GD,
        FUT: acc.FUT + r.FUT,
        STU: acc.STU + r.STU
    }), { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 });
    
    const totalePrecSettore = totaliPrecSettore.U + totaliPrecSettore.D + totaliPrecSettore.GU + totaliPrecSettore.GD;
    const deltaSettore = totaleSettore - totalePrecSettore;
    
    // Crea card settore
    const cardSettore = document.createElement('div');
    cardSettore.className = 'card mb-3 shadow-sm';
    
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header bg-info text-white';
    cardHeader.innerHTML = `<h5 class="mb-0"><i class="fas fa-layer-group me-2"></i>SETTORE: ${settore}</h5>`;
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-responsive';
    
    const tabella = document.createElement('table');
    tabella.className = 'table table-bordered table-hover';
    
    const thead = document.createElement('thead');
    thead.className = 'table-dark';
    thead.innerHTML = `
        <tr>
            <th>Categoria</th>
            <th>Sezione</th>
            <th>U</th>
            <th>D</th>
            <th>GU</th>
            <th>GD</th>
            <th>Somma</th>
            <th>Prec.</th>
            <th>Δ</th>
            <th>Futuro</th>
            <th>Studenti</th>
        </tr>
    `;
    
    const tbody = document.createElement('tbody');
    
    // Aggiungi righe per categoria e sezione
    ['ZADANKAI', 'PRATICANTI'].forEach(tipo => {
        const righeCategoria = righeSettore.filter(r => r.tipo === tipo);
        if (righeCategoria.length === 0) return;
        
        const sezioni = [...new Set(righeCategoria.map(r => r.sezione))].sort();
        
        sezioni.forEach(sezione => {
            const righeSezione = righeCategoria.filter(r => r.sezione === sezione);
            const totaliSezione = righeSezione.reduce((acc, r) => ({
                U: acc.U + r.U,
                D: acc.D + r.D,
                GU: acc.GU + r.GU,
                GD: acc.GD + r.GD,
                FUT: acc.FUT + r.FUT,
                STU: acc.STU + r.STU
            }), { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 });
            
            const sommaSezione = totaliSezione.U + totaliSezione.D + totaliSezione.GU + totaliSezione.GD;
            
            const righePrecSezione = righePrecSettore.filter(r => r.tipo === tipo && r.sezione === sezione);
            const sommaPrecSezione = righePrecSezione.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
            const deltaSezione = sommaSezione - sommaPrecSezione;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${tipo}</td>
                <td>${sezione}</td>
                <td>${totaliSezione.U}</td>
                <td>${totaliSezione.D}</td>
                <td>${totaliSezione.GU}</td>
                <td>${totaliSezione.GD}</td>
                <td>${sommaSezione}</td>
                <td>${sommaPrecSezione}</td>
                <td class="${deltaSezione >= 0 ? 'text-success' : 'text-danger'}">${deltaSezione >= 0 ? '+' : ''}${deltaSezione}</td>
                <td>${totaliSezione.FUT}</td>
                <td>${totaliSezione.STU}</td>
            `;
            tbody.appendChild(tr);
        });
    });
    
    // Riga totale settore
    const trTotale = document.createElement('tr');
    trTotale.className = 'table-info';
    trTotale.innerHTML = `
        <td><strong>TOTALE SETTORE</strong></td>
        <td><strong>${settore}</strong></td>
        <td><strong>${totaliSettore.U}</strong></td>
        <td><strong>${totaliSettore.D}</strong></td>
        <td><strong>${totaliSettore.GU}</strong></td>
        <td><strong>${totaliSettore.GD}</strong></td>
        <td><strong>${totaleSettore}</strong></td>
        <td><strong>${totalePrecSettore}</strong></td>
        <td><strong class="${deltaSettore >= 0 ? 'text-success' : 'text-danger'}">${deltaSettore >= 0 ? '+' : ''}${deltaSettore}</strong></td>
        <td><strong>${totaliSettore.FUT}</strong></td>
        <td><strong>${totaliSettore.STU}</strong></td>
    `;
    tbody.appendChild(trTotale);
    
    tabella.appendChild(thead);
    tabella.appendChild(tbody);
    tableContainer.appendChild(tabella);
    cardBody.appendChild(tableContainer);
    cardSettore.appendChild(cardHeader);
    cardSettore.appendChild(cardBody);
    contenitore.appendChild(cardSettore);
}

// Genera riepilogo per capitolo
function generaRiepilogoCapitolo(righeFiltrateCap, capitolo, mese, anno, mesePrec, annoPrec, contenitore) {
    // Calcola totali capitolo
    const totaliCapitolo = righeFiltrateCap.reduce((acc, r) => ({
        U: acc.U + r.U,
        D: acc.D + r.D,
        GU: acc.GU + r.GU,
        GD: acc.GD + r.GD,
        FUT: acc.FUT + r.FUT,
        STU: acc.STU + r.STU
    }), { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 });
    
    const totaleCapitolo = totaliCapitolo.U + totaliCapitolo.D + totaliCapitolo.GU + totaliCapitolo.GD;
    
    // Calcola totali mese precedente
    const righePrecCapitolo = righe.filter(r => 
        r.anno === parseInt(annoPrec) && 
        r.mese === mesePrec && 
        gruppoToCapitolo[r.gruppo] === capitolo
    );
    
    const totaliPrecCapitolo = righePrecCapitolo.reduce((acc, r) => ({
        U: acc.U + r.U,
        D: acc.D + r.D,
        GU: acc.GU + r.GU,
        GD: acc.GD + r.GD,
        FUT: acc.FUT + r.FUT,
        STU: acc.STU + r.STU
    }), { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 });
    
    const totalePrecCapitolo = totaliPrecCapitolo.U + totaliPrecCapitolo.D + totaliPrecCapitolo.GU + totaliPrecCapitolo.GD;
    const deltaCapitolo = totaleCapitolo - totalePrecCapitolo;
    
    // Crea card capitolo
    const cardCapitolo = document.createElement('div');
    cardCapitolo.className = 'card mb-4 shadow-sm';
    
    const cardHeaderCap = document.createElement('div');
    cardHeaderCap.className = 'card-header bg-primary text-white';
    cardHeaderCap.innerHTML = `<h4 class="mb-0"><i class="fas fa-building me-2"></i>CAPITOLO: ${capitolo}</h4>`;
    
    const cardBodyCap = document.createElement('div');
    cardBodyCap.className = 'card-body';
    
    const tableContainerCap = document.createElement('div');
    tableContainerCap.className = 'table-responsive';
    
    const tabellaCap = document.createElement('table');
    tabellaCap.className = 'table table-bordered table-hover';
    
    const theadCap = document.createElement('thead');
    theadCap.className = 'table-dark';
    theadCap.innerHTML = `
        <tr>
            <th>Categoria</th>
            <th>Sezione</th>
            <th>U</th>
            <th>D</th>
            <th>GU</th>
            <th>GD</th>
            <th>Somma</th>
            <th>Prec.</th>
            <th>Δ</th>
            <th>Futuro</th>
            <th>Studenti</th>
        </tr>
    `;
    
    const tbodyCap = document.createElement('tbody');
    
    // Riga totale capitolo
    const trTotaleCap = document.createElement('tr');
    trTotaleCap.className = 'table-primary';
    trTotaleCap.innerHTML = `
        <td><strong>TOTALE CAPITOLO</strong></td>
        <td><strong>${capitolo}</strong></td>
        <td><strong>${totaliCapitolo.U}</strong></td>
        <td><strong>${totaliCapitolo.D}</strong></td>
        <td><strong>${totaliCapitolo.GU}</strong></td>
        <td><strong>${totaliCapitolo.GD}</strong></td>
        <td><strong>${totaleCapitolo}</strong></td>
        <td><strong>${totalePrecCapitolo}</strong></td>
        <td><strong class="${deltaCapitolo >= 0 ? 'text-success' : 'text-danger'}">${deltaCapitolo >= 0 ? '+' : ''}${deltaCapitolo}</strong></td>
        <td><strong>${totaliCapitolo.FUT}</strong></td>
        <td><strong>${totaliCapitolo.STU}</strong></td>
    `;
    tbodyCap.appendChild(trTotaleCap);
    
    tabellaCap.appendChild(theadCap);
    tabellaCap.appendChild(tbodyCap);
    tableContainerCap.appendChild(tabellaCap);
    cardBodyCap.appendChild(tableContainerCap);
    cardCapitolo.appendChild(cardHeaderCap);
    cardCapitolo.appendChild(cardBodyCap);
    contenitore.appendChild(cardCapitolo);
}

// Funzione per esportare in Excel
function esportaExcel() {
    const anno = document.getElementById('filtro-anno').value;
    const mese = document.getElementById('filtro-mese').value;
    const { mese: mesePrec, anno: annoPrec } = mesePrecedente(mese, anno);

    const righeFiltrate = righe.filter(r => r.anno === parseInt(anno) && r.mese === mese);

    if (righeFiltrate.length === 0) {
        alert("Nessun dato da esportare");
        return;
    }

    // Crea i dati per Excel
    const datiExcel = [];
    
    // Intestazioni
    datiExcel.push(["Livello", "Nome", "Categoria", "Sezione", "U", "D", "GU", "GD", "Somma", "Prec.", "Delta", "Futuro", "Studenti"]);
    
    // Dati Hombu
    const totaleHombu = righeFiltrate.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
    const righePrecHombu = righe.filter(r => r.anno === parseInt(annoPrec) && r.mese === mesePrec);
    const totalePrecHombu = righePrecHombu.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
    const deltaHombu = totaleHombu - totalePrecHombu;
    
    datiExcel.push(["HOMBU", "HOMBU 9", "TOTALE", "", "", "", "", "", totaleHombu, totalePrecHombu, deltaHombu, "", ""]);
    
    // Dati per Capitoli
    const capitoli = [...new Set(righeFiltrate.map(r => gruppoToCapitolo[r.gruppo]))].filter(Boolean).sort();
    
    capitoli.forEach(capitolo => {
        const righeCap = righeFiltrate.filter(r => gruppoToCapitolo[r.gruppo] === capitolo);
        const totaleCap = righeCap.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
        const righePrecCap = righePrecHombu.filter(r => gruppoToCapitolo[r.gruppo] === capitolo);
        const totalePrecCap = righePrecCap.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
        const deltaCap = totaleCap - totalePrecCap;
        
        datiExcel.push(["CAPITOLO", capitolo, "TOTALE", "", "", "", "", "", totaleCap, totalePrecCap, deltaCap, "", ""]);
        
        // Settori del capitolo
        const settori = [...new Set(righeCap.map(r => gruppiData.hombu9[capitolo] ? Object.keys(gruppiData.hombu9[capitolo]).find(s => gruppiData.hombu9[capitolo][s].includes(r.gruppo)) : null))].filter(Boolean).sort();
        
        settori.forEach(settore => {
            const righeSettore = righeCap.filter(r => gruppiData.hombu9[capitolo][settore].includes(r.gruppo));
            const totaleSettore = righeSettore.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
            const righePrecSettore = righePrecCap.filter(r => gruppiData.hombu9[capitolo][settore].includes(r.gruppo));
            const totalePrecSettore = righePrecSettore.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
            const deltaSettore = totaleSettore - totalePrecSettore;
            
            datiExcel.push(["SETTORE", settore, "TOTALE", "", "", "", "", "", totaleSettore, totalePrecSettore, deltaSettore, "", ""]);
            
            // Dettagli per categoria e sezione
            ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
                const righeCategoria = righeSettore.filter(r => r.tipo === tipo);
                if (righeCategoria.length > 0) {
                    const sezioni = [...new Set(righeCategoria.map(r => r.sezione))].sort();
                    sezioni.forEach(sezione => {
                        const righeSezione = righeCategoria.filter(r => r.sezione === sezione);
                        const totaleSezione = righeSezione.reduce((acc, r) => ({
                            U: acc.U + r.U,
                            D: acc.D + r.D,
                            GU: acc.GU + r.GU,
                            GD: acc.GD + r.GD,
                            FUT: acc.FUT + r.FUT,
                            STU: acc.STU + r.STU
                        }), { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 });
                        
                        const sommaSezione = totaleSezione.U + totaleSezione.D + totaleSezione.GU + totaleSezione.GD;
                        
                        const righePrecSezione = righePrecSettore.filter(r => r.tipo === tipo && r.sezione === sezione);
                        const sommaPrecSezione = righePrecSezione.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
                        const deltaSezione = sommaSezione - sommaPrecSezione;
                        
                        datiExcel.push(["DETTAGLIO", settore, tipo, sezione, totaleSezione.U, totaleSezione.D, totaleSezione.GU, totaleSezione.GD, sommaSezione, sommaPrecSezione, deltaSezione, totaleSezione.FUT, totaleSezione.STU]);
                    });
                }
            });
        });
    });

    // Crea il workbook
    const ws = XLSX.utils.aoa_to_sheet(datiExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riepiloghi");
    
    // Scarica il file
    XLSX.writeFile(wb, `riepiloghi_${mese}_${anno}.xlsx`);
}

// Funzione per esportare in PDF
function esportaPdf() {
    const anno = document.getElementById('filtro-anno').value;
    const mese = document.getElementById('filtro-mese').value;

    const righeFiltrate = righe.filter(r => r.anno === parseInt(anno) && r.mese === mese);

    if (righeFiltrate.length === 0) {
        alert("Nessun dato da esportare");
        return;
    }

    // Crea il documento PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    // Titolo
    doc.setFontSize(16);
    doc.text(`Riepiloghi HOMBU 9 - ${mese} ${anno}`, 20, 20);
    
    // Prepara i dati per la tabella (versione semplificata per PDF)
    const intestazioni = [["Livello", "Nome", "Totale", "Precedente", "Delta"]];
    const righeTabella = [];
    
    // Aggiungi i dati principali
    const totaleHombu = righeFiltrate.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
    const { mese: mesePrec, anno: annoPrec } = mesePrecedente(mese, anno);
    const righePrecHombu = righe.filter(r => r.anno === parseInt(annoPrec) && r.mese === mesePrec);
    const totalePrecHombu = righePrecHombu.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
    const deltaHombu = totaleHombu - totalePrecHombu;
    
    righeTabella.push(["HOMBU", "HOMBU 9", totaleHombu, totalePrecHombu, deltaHombu]);
    
    // Aggiungi capitoli
    const capitoli = [...new Set(righeFiltrate.map(r => gruppoToCapitolo[r.gruppo]))].filter(Boolean).sort();
    capitoli.forEach(capitolo => {
        const righeCap = righeFiltrate.filter(r => gruppoToCapitolo[r.gruppo] === capitolo);
        const totaleCap = righeCap.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
        const righePrecCap = righePrecHombu.filter(r => gruppoToCapitolo[r.gruppo] === capitolo);
        const totalePrecCap = righePrecCap.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
        const deltaCap = totaleCap - totalePrecCap;
        
        righeTabella.push(["CAPITOLO", capitolo, totaleCap, totalePrecCap, deltaCap]);
    });
    
    // Crea la tabella
    doc.autoTable({
        head: intestazioni,
        body: righeTabella,
        startY: 30,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Scarica il file
    doc.save(`riepiloghi_${mese}_${anno}.pdf`);
}

// Funzione per la stampa
function stampa() {
    window.print();
}

// Logout
function logout() {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Errore durante il logout:', error);
    });
}

// Esporta funzioni globali
window.logout = logout;

// Inizializza quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM caricato, inizializzazione in corso...');
    
    // Pulisci il contenitore all'inizio
    const contenitore = document.getElementById('contenitore-riepiloghi');
    if (contenitore) {
        contenitore.innerHTML = '';
    }
});
