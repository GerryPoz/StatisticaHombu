// Import Firebase
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

// Autenticazione
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Utente autenticato:', user.email);
        caricaDati();
    } else {
        window.location.href = 'index.html';
    }
});

// Funzione per ottenere il mese precedente
function mesePrecedente(mese, anno) {
  const idx = mesiOrdine.indexOf(mese);
  const nuovoIdx = (idx - 1 + 12) % 12;
  const nuovoAnno = idx === 0 ? String(Number(anno) - 1) : anno;
  return { mese: mesiOrdine[nuovoIdx], anno: nuovoAnno };
}

// Carica dati
async function caricaDati() {
    try {
        console.log('Caricamento dati in corso...');
        
        // Carica gruppi.json
        const gruppiResponse = await fetch('gruppi.json');
        gruppiData = await gruppiResponse.json();
        console.log('Dati gruppi caricati:', gruppiData);
        
        // Popola gruppoToCapitolo
        const struttura = gruppiData["HOMBU 9"];
        for (const [capitolo, settori] of Object.entries(struttura)) {
            for (const [_, gruppi] of Object.entries(settori)) {
                gruppi.forEach(gr => gruppoToCapitolo[gr] = capitolo);
            }
        }
        
        // Carica dati zadankai da Firebase
        const zadankaiRef = ref(database, 'zadankai');
        const snapshot = await get(zadankaiRef);
        
        if (snapshot.exists()) {
            const dati = snapshot.val();
            console.log('Dati zadankai caricati da Firebase');
            
            // Elabora i dati
            for (const key in dati) {
                const [anno, mese, gruppo] = key.split('-');
                const sezioni = dati[key];
                
                // Zadankai
                for (const categoria in sezioni.zadankai) {
                    const r = sezioni.zadankai[categoria];
                    righe.push({ 
                        anno, mese, gruppo, tipo: "ZADANKAI", sezione: categoria,
                        U: r.U ?? 0, D: r.D ?? 0, GU: r.GU ?? 0, GD: r.GD ?? 0, 
                        FUT: r.FUT ?? 0, STU: r.STU ?? 0 
                    });
                }
                
                // Praticanti
                for (const categoria in sezioni.praticanti) {
                    const r = sezioni.praticanti[categoria];
                    righe.push({ 
                        anno, mese, gruppo, tipo: "PRATICANTI", sezione: categoria,
                        U: r.U ?? 0, D: r.D ?? 0, GU: r.GU ?? 0, GD: r.GD ?? 0, 
                        FUT: r.FUT ?? 0, STU: r.STU ?? 0 
                    });
                }
            }
            
            console.log(`Righe elaborate: ${righe.length}`);
            inizializzaFiltri();
            // Aggiungi event listener per il pulsante di stampa
            const btnPrint = document.getElementById('btn-print');
            if (btnPrint) {
                btnPrint.addEventListener('click', stampa);
                console.log('Event listener per stampa aggiunto');
            } else {
                console.log('Pulsante stampa non trovato');
            }
        } else {
            console.log('Nessun dato trovato in Firebase');
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
    }
}

// Inizializza filtri
function inizializzaFiltri() {
    const filtroAnno = document.getElementById('filtro-anno');
    const filtroMese = document.getElementById('filtro-mese');
    
    // Popola anni
    const anni = [...new Set(righe.map(r => r.anno))].sort();
    anni.forEach(anno => {
        const option = document.createElement('option');
        option.value = anno;
        option.textContent = anno;
        filtroAnno.appendChild(option);
    });
    
    // Popola mesi
    const mesi = [...new Set(righe.map(r => r.mese))];
    const mesiOrdinati = mesi.sort((a, b) => mesiOrdine.indexOf(a) - mesiOrdine.indexOf(b));
    mesiOrdinati.forEach(mese => {
        const option = document.createElement('option');
        option.value = mese;
        option.textContent = mese;
        filtroMese.appendChild(option);
    });
    
    // Seleziona valori più recenti
    if (anni.length > 0) filtroAnno.value = anni[anni.length - 1];
    if (mesiOrdinati.length > 0) filtroMese.value = mesiOrdinati[mesiOrdinati.length - 1];
    
    // Aggiungi event listeners
    filtroAnno.addEventListener('change', aggiornaRiepiloghi);
    filtroMese.addEventListener('change', aggiornaRiepiloghi);
    
    // Genera riepiloghi iniziali
    aggiornaRiepiloghi();
}

// Aggiorna riepiloghi
function aggiornaRiepiloghi() {
    const annoSelezionato = document.getElementById('filtro-anno').value;
    const meseSelezionato = document.getElementById('filtro-mese').value;
    
    if (!annoSelezionato || !meseSelezionato) {
        console.log('Filtri non completi');
        return;
    }
    
    console.log('Aggiornamento riepiloghi:', { annoSelezionato, meseSelezionato });

    // Pulisci il contenitore prima di generare i nuovi riepiloghi
    document.getElementById('contenitore-riepiloghi').innerHTML = '';
  
    // Filtra i dati
    const righeFiltrate = righe.filter(r => 
        r.anno === annoSelezionato && r.mese === meseSelezionato
    );
    
    const { mese: mesePrec, anno: annoPrec } = mesePrecedente(meseSelezionato, annoSelezionato);
    
    // Genera riepiloghi
    generaRiepilogoHombu(righeFiltrate, meseSelezionato, annoSelezionato, mesePrec, annoPrec);
    generaRiepiloghiCapitoli(righeFiltrate, meseSelezionato, annoSelezionato, mesePrec, annoPrec);
}

// Genera riepilogo Hombu generale
function generaRiepilogoHombu(righeFiltrate, mese, anno, mesePrec, annoPrec) {
    const contenitore = document.getElementById('contenitore-riepiloghi');
    
    // Crea card per Hombu
    const cardHombu = document.createElement('div');
    cardHombu.className = 'card shadow-sm mb-4';
    
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header bg-success text-white';
    cardHeader.innerHTML = `<h5 class="mb-0"><i class="fas fa-home me-2"></i>Riepilogo Generale: HOMBU 9 - ${mese} ${anno}</h5>`;
    cardHombu.appendChild(cardHeader);
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body table-responsive';
    
    const tabella = document.createElement('table');
    tabella.className = 'table table-striped table-bordered';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th>
      <th>Somma</th><th>Prec.</th><th>Totale Hombu</th><th>Futuro</th><th>Studenti</th>
    </tr>`;
    tabella.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    
    ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
        const righeTipo = righeFiltrate.filter(r => r.tipo === tipo);
        if (righeTipo.length === 0) return;
        
        const sezioni = [...new Set(righeTipo.map(r => r.sezione))];
        if (tipo === "ZADANKAI") {
            const ordine = ["membri", "simpatizzanti", "ospiti"];
            sezioni.sort((a, b) => ordine.indexOf(a) - ordine.indexOf(b));
        }
        
        const tipoRowSpan = sezioni.length;
        const sezioniRilevanti = tipo === "ZADANKAI"
            ? ["membri", "simpatizzanti", "ospiti"]
            : ["membri", "simpatizzanti"];
        
        const righeTotali = righeTipo.filter(r => sezioniRilevanti.includes(r.sezione));
        const sumTot = righeTotali.reduce((acc, r) => ({
            U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
            GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
        }), {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
        const totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
        
        const righePrecTot = righe.filter(r =>
            r.anno === annoPrec && r.mese === mesePrec &&
            r.tipo === tipo &&
            sezioniRilevanti.includes(r.sezione)
        );
        const totalePrec = righePrecTot.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
        const delta = totaleMese - totalePrec;
        
        sezioni.forEach((sezione, index) => {
            const righeSezione = righeTipo.filter(r => r.sezione === sezione);
            const sum = righeSezione.reduce((acc, r) => ({
                U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
                GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
            }), {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
            const sommaTot = sum.U + sum.D + sum.GU + sum.GD;
            
            const righePrec = righe.filter(r =>
                r.anno === annoPrec && r.mese === mesePrec &&
                r.tipo === tipo && r.sezione === sezione
            );
            const sommaPrec = righePrec.reduce((acc, r) =>
                acc + r.U + r.D + r.GU + r.GD, 0);
            
            const tr = document.createElement('tr');
            tr.className = tipo === "ZADANKAI" ? "table-warning" : "table-info";
            
            if (index === 0) {
                const tdTipo = document.createElement('td');
                tdTipo.textContent = tipo;
                tdTipo.rowSpan = tipoRowSpan;
                tdTipo.className = 'fw-bold';
                tr.appendChild(tdTipo);
            }
            
            const celle = [
                sezione, sum.U, sum.D, sum.GU, sum.GD,
                sommaTot, sommaPrec
            ];
            celle.forEach((val, i) => {
                const td = document.createElement('td');
                td.textContent = val;
                if (i === 1) { // U
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                } else if (i === 5) { // Somma
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                    td.style.fontWeight = "bold";
                }
                tr.appendChild(td);
            });
            
            if (index === 0) {
                const tdTot = document.createElement('td');
                tdTot.rowSpan = tipoRowSpan;
                tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                tdTot.innerHTML = `
                    <div style="font-size: 1.2em;"><strong>${totaleMese}</strong></div>
                    <div class="small">Prec: ${totalePrec}</div>
                    <div class="${delta >= 0 ? 'text-success' : 'text-danger'} fw-bold">
                        Δ ${delta >= 0 ? "+" : ""}${delta}
                    </div>`;
                tdTot.className = 'text-center';
                tr.appendChild(tdTot);
            }
            
            const tdFUT = document.createElement('td');
            tdFUT.textContent = sum.FUT;
            tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
            const tdSTU = document.createElement('td');
            tdSTU.textContent = sum.STU;
            tr.appendChild(tdFUT);
            tr.appendChild(tdSTU);
            
            tbody.appendChild(tr);
        });
    });
    
    tabella.appendChild(tbody);
    cardBody.appendChild(tabella);
    cardHombu.appendChild(cardBody);
    contenitore.appendChild(cardHombu);
}

// Genera riepiloghi per capitoli
function generaRiepiloghiCapitoli(righeFiltrate, mese, anno, mesePrec, annoPrec) {
    const contenitore = document.getElementById('contenitore-riepiloghi');
    const struttura = gruppiData["HOMBU 9"];
    
    // Per ogni capitolo
    Object.entries(struttura).forEach(([capitolo, settori]) => {
        const righeFiltrateCap = righeFiltrate.filter(r => gruppoToCapitolo[r.gruppo] === capitolo);
        if (righeFiltrateCap.length === 0) return;
        
        // Genera riepiloghi per settori del capitolo
        Object.entries(settori).forEach(([settore, gruppiSettore]) => {
            const righeSettore = righeFiltrateCap.filter(r => gruppiSettore.includes(r.gruppo));
            if (righeSettore.length === 0) return;
            
            generaRiepilogoSettore(righeSettore, settore, mese, anno, mesePrec, annoPrec, gruppiSettore, contenitore);
        });
        
        // Genera riepilogo capitolo
        generaRiepilogoCapitolo(righeFiltrateCap, capitolo, mese, anno, mesePrec, annoPrec, contenitore);
    });
}

// Genera riepilogo per un settore
function generaRiepilogoSettore(righeSettore, settore, mese, anno, mesePrec, annoPrec, gruppiSettore, contenitore) {
    const cardSettore = document.createElement('div');
    cardSettore.className = 'card shadow-sm mb-4';
    
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header bg-warning text-dark';
    cardHeader.innerHTML = `<h5 class="mb-0"><i class="fas fa-chart-pie me-2"></i>Riepilogo: ${settore}</h5>`;
    cardSettore.appendChild(cardHeader);
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body table-responsive';
    
    const tabella = document.createElement('table');
    tabella.className = 'table table-striped table-bordered';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th>
      <th>Somma</th><th>Prec.</th><th>Totale Settore</th><th>Futuro</th><th>Studenti</th>
    </tr>`;
    tabella.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    
    ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
        const righeTipo = righeSettore.filter(r => r.tipo === tipo);
        if (righeTipo.length === 0) return;
        
        const sezioni = [...new Set(righeTipo.map(r => r.sezione))];
        if (tipo === "ZADANKAI") {
            const ordine = ["membri", "simpatizzanti", "ospiti"];
            sezioni.sort((a, b) => ordine.indexOf(a) - ordine.indexOf(b));
        }
        
        const tipoRowSpan = sezioni.length;
        const sezioniRilevanti = tipo === "ZADANKAI"
            ? ["membri", "simpatizzanti", "ospiti"]
            : ["membri", "simpatizzanti"];
        
        const righeTotali = righeTipo.filter(r => sezioniRilevanti.includes(r.sezione));
        const sumTot = righeTotali.reduce((acc, r) => ({
            U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
            GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
        }), {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
        const totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
        
        const righePrecTot = righe.filter(r =>
            r.anno === annoPrec && r.mese === mesePrec &&
            r.tipo === tipo &&
            sezioniRilevanti.includes(r.sezione) &&
            gruppiSettore.includes(r.gruppo)
        );
        const totalePrec = righePrecTot.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
        const delta = totaleMese - totalePrec;
        
        sezioni.forEach((sezione, index) => {
            const righeSezione = righeTipo.filter(r => r.sezione === sezione);
            const sum = righeSezione.reduce((acc, r) => ({
                U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
                GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
            }), {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
            const sommaTot = sum.U + sum.D + sum.GU + sum.GD;
            
            const righePrec = righe.filter(r =>
                r.anno === annoPrec && r.mese === mesePrec &&
                r.tipo === tipo && r.sezione === sezione &&
                gruppiSettore.includes(r.gruppo)
            );
            const sommaPrec = righePrec.reduce((acc, r) =>
                acc + r.U + r.D + r.GU + r.GD, 0);
            
            const tr = document.createElement('tr');
            tr.className = tipo === "ZADANKAI" ? "table-warning" : "table-info";
            
            if (index === 0) {
                const tdTipo = document.createElement('td');
                tdTipo.textContent = tipo;
                tdTipo.rowSpan = tipoRowSpan;
                tdTipo.className = 'fw-bold';
                tr.appendChild(tdTipo);
            }
            
            const celle = [
                sezione, sum.U, sum.D, sum.GU, sum.GD,
                sommaTot, sommaPrec
            ];
            celle.forEach((val, i) => {
                const td = document.createElement('td');
                td.textContent = val;
                if (i === 1) { // U
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                } else if (i === 5) { // Somma
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                    td.style.fontWeight = "bold";
                }
                tr.appendChild(td);
            });
            
            if (index === 0) {
                const tdTot = document.createElement('td');
                tdTot.rowSpan = tipoRowSpan;
                tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                tdTot.innerHTML = `
                    <div style="font-size: 1.2em;"><strong>${totaleMese}</strong></div>
                    <div class="small">Prec: ${totalePrec}</div>
                    <div class="${delta >= 0 ? 'text-success' : 'text-danger'} fw-bold">
                        Δ ${delta >= 0 ? "+" : ""}${delta}
                    </div>`;
                tdTot.className = 'text-center';
                tr.appendChild(tdTot);
            }
            
            const tdFUT = document.createElement('td');
            tdFUT.textContent = sum.FUT;
            tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
            const tdSTU = document.createElement('td');
            tdSTU.textContent = sum.STU;
            tr.appendChild(tdFUT);
            tr.appendChild(tdSTU);
            
            tbody.appendChild(tr);
        });
    });
    
    tabella.appendChild(tbody);
    cardBody.appendChild(tabella);
    cardSettore.appendChild(cardBody);
    contenitore.appendChild(cardSettore);
}

// Genera riepilogo per un capitolo
function generaRiepilogoCapitolo(righeFiltrateCap, capitolo, mese, anno, mesePrec, annoPrec, contenitore) {
    const cardCapitolo = document.createElement('div');
    cardCapitolo.className = 'card shadow-sm mb-4';
    
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header bg-primary text-white';
    cardHeader.innerHTML = `<h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Riepilogo: ${capitolo}</h5>`;
    cardCapitolo.appendChild(cardHeader);
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body table-responsive';
    
    const tabella = document.createElement('table');
    tabella.className = 'table table-striped table-bordered';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th>
      <th>Somma</th><th>Prec.</th><th>Totale Capitolo</th><th>Futuro</th><th>Studenti</th>
    </tr>`;
    tabella.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    
    ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
        const righeTipo = righeFiltrateCap.filter(r => r.tipo === tipo);
        if (righeTipo.length === 0) return;
        
        const sezioni = [...new Set(righeTipo.map(r => r.sezione))];
        if (tipo === "ZADANKAI") {
            const ordine = ["membri", "simpatizzanti", "ospiti"];
            sezioni.sort((a, b) => ordine.indexOf(a) - ordine.indexOf(b));
        }
        
        const tipoRowSpan = sezioni.length;
        const sezioniRilevanti = tipo === "ZADANKAI"
            ? ["membri", "simpatizzanti", "ospiti"]
            : ["membri", "simpatizzanti"];
        
        const righeTotali = righeTipo.filter(r => sezioniRilevanti.includes(r.sezione));
        const sumTot = righeTotali.reduce((acc, r) => ({
            U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
            GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
        }), {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
        const totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
        
        const righePrecTot = righe.filter(r =>
            r.anno === annoPrec && r.mese === mesePrec &&
            r.tipo === tipo &&
            sezioniRilevanti.includes(r.sezione) &&
            gruppoToCapitolo[r.gruppo] === capitolo
        );
        const totalePrec = righePrecTot.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
        const delta = totaleMese - totalePrec;
        
        sezioni.forEach((sezione, index) => {
            const righeSezione = righeTipo.filter(r => r.sezione === sezione);
            const sum = righeSezione.reduce((acc, r) => ({
                U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
                GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
            }), {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
            const sommaTot = sum.U + sum.D + sum.GU + sum.GD;
            
            const righePrec = righe.filter(r =>
                r.anno === annoPrec && r.mese === mesePrec &&
                r.tipo === tipo && r.sezione === sezione &&
                gruppoToCapitolo[r.gruppo] === capitolo
            );
            const sommaPrec = righePrec.reduce((acc, r) =>
                acc + r.U + r.D + r.GU + r.GD, 0);
            
            const tr = document.createElement('tr');
            tr.className = tipo === "ZADANKAI" ? "table-warning" : "table-info";
            
            if (index === 0) {
                const tdTipo = document.createElement('td');
                tdTipo.textContent = tipo;
                tdTipo.rowSpan = tipoRowSpan;
                tdTipo.className = 'fw-bold';
                tr.appendChild(tdTipo);
            }
            
            const celle = [
                sezione, sum.U, sum.D, sum.GU, sum.GD,
                sommaTot, sommaPrec
            ];
            celle.forEach((val, i) => {
                const td = document.createElement('td');
                td.textContent = val;
                if (i === 1) { // U
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                } else if (i === 5) { // Somma
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                    td.style.fontWeight = "bold";
                }
                tr.appendChild(td);
            });
            
            if (index === 0) {
                const tdTot = document.createElement('td');
                tdTot.rowSpan = tipoRowSpan;
                tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                tdTot.innerHTML = `
                    <div style="font-size: 1.2em;"><strong>${totaleMese}</strong></div>
                    <div class="small">Prec: ${totalePrec}</div>
                    <div class="${delta >= 0 ? 'text-success' : 'text-danger'} fw-bold">
                        Δ ${delta >= 0 ? "+" : ""}${delta}
                    </div>`;
                tdTot.className = 'text-center';
                tr.appendChild(tdTot);
            }
            
            const tdFUT = document.createElement('td');
            tdFUT.textContent = sum.FUT;
            tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
            const tdSTU = document.createElement('td');
            tdSTU.textContent = sum.STU;
            tr.appendChild(tdFUT);
            tr.appendChild(tdSTU);
            
            tbody.appendChild(tr);
        });
    });
    
    tabella.appendChild(tbody);
    cardBody.appendChild(tabella);
    cardCapitolo.appendChild(cardBody);
    contenitore.appendChild(cardCapitolo);
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
