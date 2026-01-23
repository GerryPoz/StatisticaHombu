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
let __tipoListenerInitR__ = false;

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

function getTipoDati() {
    const radio = document.querySelector('input[name="filtro-tipo"]:checked');
    return radio ? radio.value : 'ZADANKAI';
}

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
        
        const tipoDati = getTipoDati();
        const basePath = tipoDati === 'STUDIO_GOSHO' ? 'studio_gosho' : 'zadankai';
        const datiRef = ref(database, basePath);
        const snapshot = await get(datiRef);
        
        if (snapshot.exists()) {
            const dati = snapshot.val();
            console.log('Dati zadankai caricati da Firebase');
            
            // Elabora i dati
            for (const key in dati) {
                const [anno, mese, gruppo] = key.split('-');
                const sezioni = dati[key];
                
                if (sezioni.zadankai) {
                    for (const categoria in sezioni.zadankai) {
                        const r = sezioni.zadankai[categoria];
                        righe.push({ 
                            anno, mese, gruppo, tipo: "ZADANKAI", sezione: categoria,
                            U: r.U ?? 0, D: r.D ?? 0, GU: r.GU ?? 0, GD: r.GD ?? 0, 
                            FUT: r.FUT ?? 0, STU: r.STU ?? 0 
                        });
                    }
                }
                
                if (sezioni.praticanti) {
                    for (const categoria in sezioni.praticanti) {
                        const r = sezioni.praticanti[categoria];
                        righe.push({ 
                            anno, mese, gruppo, tipo: "PRATICANTI", sezione: categoria,
                            U: r.U ?? 0, D: r.D ?? 0, GU: r.GU ?? 0, GD: r.GD ?? 0, 
                            FUT: r.FUT ?? 0, STU: r.STU ?? 0 
                        });
                    }
                }
            }
            
            console.log(`Righe elaborate: ${righe.length}`);
            inizializzaFiltri();
        } else {
            console.log('Nessun dato trovato in Firebase');
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
    }

    const btnPrint = document.getElementById('btn-print');
    if (btnPrint) {
        btnPrint.addEventListener('click', stampa);
    }

    const btnExportPdf = document.getElementById('btn-export-pdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', esportaPdf);
    }

    if (!__tipoListenerInitR__) {
        __tipoListenerInitR__ = true;
        const radiosTipo = document.querySelectorAll('input[name="filtro-tipo"]');
        radiosTipo.forEach(radio => {
            radio.addEventListener('change', () => {
                righe = [];
                const filtroAnno = document.getElementById('filtro-anno');
                const filtroMese = document.getElementById('filtro-mese');
                if (filtroAnno) filtroAnno.innerHTML = '';
                if (filtroMese) filtroMese.innerHTML = '';
                caricaDati();
            });
        });
    }
}

// Inizializza filtri
function inizializzaFiltri() {
    const filtroAnno = document.getElementById('filtro-anno');
    const filtroMese = document.getElementById('filtro-mese');
    if (filtroAnno) filtroAnno.innerHTML = '';
    if (filtroMese) filtroMese.innerHTML = '';
    
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

    const container = document.getElementById('container-tabelle');
    container.innerHTML = '';
    const righeFiltrate = righe.filter(r => r.anno === annoSelezionato && r.mese === meseSelezionato);
    const { mese: mesePrec, anno: annoPrec } = mesePrecedente(meseSelezionato, annoSelezionato);
    const tipoSelezionato = getTipoDati();
    const strutturaHombu = gruppiData["HOMBU 9"];
    const tableZ = document.createElement('table'); tableZ.className = 'table-custom table-zadankai mb-5'; tableZ.innerHTML = getHeaderZadankai();
    const tbodyZ = document.createElement('tbody');
    let tableP = null, tbodyP = null;
    if (tipoSelezionato !== 'STUDIO_GOSHO') {
        tableP = document.createElement('table'); tableP.className = 'table-custom table-praticanti mb-5'; tableP.innerHTML = getHeaderPraticanti();
        tbodyP = document.createElement('tbody');
    }
  const totH9Z = { membri: initTot(), simp: initTot(), ospiti: initTot(), totG: 0, var: 0, fut: 0, stu: 0 };
  const totH9P = { membri: initTot(), simp: initTot(), totG: 0, var: 0 };
    Object.entries(strutturaHombu).forEach(([capitolo, settori]) => {
      const totCapZ = { membri: initTot(), simp: initTot(), ospiti: initTot(), totG: 0, var: 0, fut: 0, stu: 0 };
      const totCapP = { membri: initTot(), simp: initTot(), totG: 0, var: 0 };
      Object.entries(settori).forEach(([settore, gruppi]) => {
        const datiSettore = { totZ: { membri: initTot(), simp: initTot(), ospiti: initTot(), totG: 0, var: 0, fut: 0, stu: 0 },
                              totP: { membri: initTot(), simp: initTot(), totG: 0, var: 0 } };
        // Aggrega SOLO per SETTORE (nessun dettaglio gruppo)
        gruppi.slice().sort().forEach(gruppo => {
          // ZADANKAI
          const rz = righeFiltrate.filter(r => r.gruppo === gruppo && r.tipo === 'ZADANKAI');
          const rzPrec = righe.filter(r => r.anno === annoPrec && r.mese === mesePrec && r.gruppo === gruppo && r.tipo === 'ZADANKAI');
          const zM = trovaDatiSezione(rz, 'membri');
          const zS = trovaDatiSezione(rz, 'simpatizzanti');
          const zO = trovaDatiSezione(rz, 'ospiti');
          const zTotG = zM.Tot + zS.Tot + zO.Tot;
          const zFut = (zM.FUT||0) + (zS.FUT||0) + (zO.FUT||0);
          const zStu = (zM.STU||0) + (zS.STU||0) + (zO.STU||0);
          let zTotPrec = 0; rzPrec.forEach(rr => { zTotPrec += rr.U + rr.D + rr.GU + rr.GD; });
          const zVar = zTotG - zTotPrec;
          sommaTotali(datiSettore.totZ.membri, zM); sommaTotali(datiSettore.totZ.simp, zS); sommaTotali(datiSettore.totZ.ospiti, zO);
          datiSettore.totZ.totG += zTotG; datiSettore.totZ.var += zVar; datiSettore.totZ.fut += zFut; datiSettore.totZ.stu += zStu;
          // PRATICANTI
          const rp = righeFiltrate.filter(r => r.gruppo === gruppo && r.tipo === 'PRATICANTI');
          const rpPrec = righe.filter(r => r.anno === annoPrec && r.mese === mesePrec && r.gruppo === gruppo && r.tipo === 'PRATICANTI');
          const pM = trovaDatiSezione(rp, 'membri'); const pS = trovaDatiSezione(rp, 'simpatizzanti');
          const pTotG = pM.Tot + pS.Tot; let pTotPrec = 0; rpPrec.forEach(rr => { pTotPrec += rr.U + rr.D + rr.GU + rr.GD; });
          const pVar = pTotG - pTotPrec;
          sommaTotali(datiSettore.totP.membri, pM); sommaTotali(datiSettore.totP.simp, pS);
          datiSettore.totP.totG += pTotG; datiSettore.totP.var += pVar;
        });
        tbodyZ.appendChild(creaRigaZadankai(`- ${settore.toUpperCase()}`, datiSettore.totZ, 'riga-settore'));
        if (tbodyP) tbodyP.appendChild(creaRigaPraticanti(`- ${settore.toUpperCase()}`, datiSettore.totP, 'riga-settore'));
        sommaTotali(totCapZ.membri, datiSettore.totZ.membri); sommaTotali(totCapZ.simp, datiSettore.totZ.simp); sommaTotali(totCapZ.ospiti, datiSettore.totZ.ospiti);
        totCapZ.totG += datiSettore.totZ.totG; totCapZ.var += datiSettore.totZ.var; totCapZ.fut += datiSettore.totZ.fut; totCapZ.stu += datiSettore.totZ.stu;
        sommaTotali(totCapP.membri, datiSettore.totP.membri); sommaTotali(totCapP.simp, datiSettore.totP.simp);
        totCapP.totG += datiSettore.totP.totG; totCapP.var += datiSettore.totP.var;
      });
      tbodyZ.appendChild(creaRigaZadankai(`- ${capitolo.toUpperCase()}`, totCapZ, 'riga-capitolo'));
      if (tbodyP) tbodyP.appendChild(creaRigaPraticanti(`- ${capitolo.toUpperCase()}`, totCapP, 'riga-capitolo'));
      // Accumula HOMBU 9
      sommaTotali(totH9Z.membri, totCapZ.membri); sommaTotali(totH9Z.simp, totCapZ.simp); sommaTotali(totH9Z.ospiti, totCapZ.ospiti);
      totH9Z.totG += totCapZ.totG; totH9Z.var += totCapZ.var; totH9Z.fut += totCapZ.fut; totH9Z.stu += totCapZ.stu;
      sommaTotali(totH9P.membri, totCapP.membri); sommaTotali(totH9P.simp, totCapP.simp);
      totH9P.totG += totCapP.totG; totH9P.var += totCapP.var;
    });
  // Riga finale HOMBU 9
  tbodyZ.appendChild(creaRigaZadankai('CENTRO HOMBU 9', totH9Z, 'riga-centro'));
  if (tbodyP) tbodyP.appendChild(creaRigaPraticanti('CENTRO HOMBU 9', totH9P, 'riga-centro'));
    tableZ.appendChild(tbodyZ); container.appendChild(tableZ);
    if (tableP && tbodyP) { tableP.appendChild(tbodyP); container.appendChild(tableP); }
}

function initTot(){ return { U:0, D:0, GU:0, GD:0, Tot:0, FUT:0, STU:0 }; }
function sommaTotali(dest, src){ dest.U+=src.U; dest.D+=src.D; dest.GU+=src.GU; dest.GD+=src.GD; dest.Tot+=src.Tot; dest.FUT+=(src.FUT||0); dest.STU+=(src.STU||0); }
function trovaDatiSezione(righeSez, sezione){
  const r = righeSez.find(x => x.sezione === sezione);
  if (r) return { U:r.U, D:r.D, GU:r.GU, GD:r.GD, Tot:(r.U+r.D+r.GU+r.GD), FUT:r.FUT, STU:r.STU };
  return { U:0, D:0, GU:0, GD:0, Tot:0, FUT:0, STU:0 };
}
function getHeaderZadankai(){
  const title = getTipoDati() === 'STUDIO_GOSHO' ? 'REPORT STUDIO GOSHO' : 'REPORT ZADANKAI';
  return `
    <thead>
      <tr class="header-main">
        <th rowspan="2" class="col-zona"> ${title}<br>ZONA</th>
        <th colspan="5" class="col-membri">MEMBRI</th>
        <th colspan="5" class="col-simp">SIMPATIZZANTI</th>
        <th colspan="5" class="col-nuove">OSPITI</th>
        <th colspan="4" class="col-totali">TOTALI</th>
      </tr>
      <tr class="header-sub">
        <th>U</th><th>D</th><th>GU</th><th>GD</th><th>TOT</th>
        <th>U</th><th>D</th><th>GU</th><th>GD</th><th>TOT</th>
        <th>U</th><th>D</th><th>GU</th><th>GD</th><th>TOT</th>
        <th>TOT G.</th><th>VAR</th><th>FUT</th><th>STU</th>
      </tr>
    </thead>
  `;
}
function getHeaderPraticanti(){
  return `
    <thead>
      <tr class="header-main">
        <th rowspan="2" class="col-zona">Report Praticanti<br>Zona</th>
        <th colspan="5" class="col-praticanti-membri">Praticanti Membri</th>
        <th colspan="5" class="col-praticanti-simp">Praticanti Simpatizzanti</th>
        <th rowspan="2" class="col-totg">TOT G.</th>
        <th rowspan="2" class="col-var">Var</th>
      </tr>
      <tr class="header-sub">
        <th>U</th><th>D</th><th>GU</th><th>GD</th><th>Tot</th>
        <th>U</th><th>D</th><th>GU</th><th>GD</th><th>Tot</th>
      </tr>
    </thead>
  `;
}
function creaRigaZadankai(nome, dati, classe){
  const tr = document.createElement('tr'); if (classe) tr.className = classe;
  const celle = [
    nome,
    dati.membri.U, dati.membri.D, dati.membri.GU, dati.membri.GD, dati.membri.Tot,
    dati.simp.U, dati.simp.D, dati.simp.GU, dati.simp.GD, dati.simp.Tot,
    dati.ospiti.U, dati.ospiti.D, dati.ospiti.GU, dati.ospiti.GD, dati.ospiti.Tot,
    dati.totG, dati.var, dati.fut, dati.stu
  ];
  celle.forEach((val, i) => {
    const td = document.createElement('td');
    td.textContent = (i === 17 && typeof val === 'number' && val > 0) ? `+${val}` : val;
    if (i===0) td.className='text-start fw-bold cella-nome';
    if (i===5 || i===10 || i===15 || i===16 || i===17) td.classList.add('fw-bold');
    tr.appendChild(td);
  });
  return tr;
}
function creaRigaPraticanti(nome, dati, classe){
  const tr = document.createElement('tr'); if (classe) tr.className = classe;
  const celle = [
    nome,
    dati.membri.U, dati.membri.D, dati.membri.GU, dati.membri.GD, dati.membri.Tot,
    dati.simp.U, dati.simp.D, dati.simp.GU, dati.simp.GD, dati.simp.Tot,
    dati.totG, dati.var
  ];
  celle.forEach((val, i) => {
    const td = document.createElement('td');
    td.textContent = (i === 12 && typeof val === 'number' && val > 0) ? `+${val}` : val;
    if (i===0) td.className='text-start fw-bold cella-nome';
    if (i===5 || i===10 || i===11 || i===12) td.classList.add('fw-bold');
    tr.appendChild(td);
  });
  return tr;
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

// Funzione per esportare in PDF
function esportaPdf() {
    const annoSelezionato = document.getElementById('filtro-anno').value;
    const meseSelezionato = document.getElementById('filtro-mese').value;
    
    if (!annoSelezionato || !meseSelezionato) {
        alert("Seleziona anno e mese per esportare");
        return;
    }
    
    // Filtra i dati
    const righeFiltrate = righe.filter(r => 
        r.anno === annoSelezionato && r.mese === meseSelezionato
    );
    
    if (righeFiltrate.length === 0) {
        alert("Nessun dato da esportare per il periodo selezionato");
        return;
    }
    
    const { mese: mesePrec, anno: annoPrec } = mesePrecedente(meseSelezionato, annoSelezionato);
    
    // Crea il documento PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    // Titolo principale
    doc.setFontSize(18);
    doc.text(`Riepiloghi HOMBU 9 - ${meseSelezionato} ${annoSelezionato}`, 20, 20);
    
    let yPosition = 40;
    
    // ===== RIEPILOGO HOMBU GENERALE DETTAGLIATO =====
    doc.setFontSize(14);
    doc.text('RIEPILOGO HOMBU GENERALE', 20, yPosition);
    yPosition += 10;
    
    // Prepara tabella dettagliata Hombu
    const intestazioniHombu = [['Categoria', 'Sezione', 'U', 'D', 'GU', 'GD', 'Somma', 'Prec.', 'Totale Hombu', 'Futuro', 'Studenti']];
    const righeHombuDettagliate = [];
    
    ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
        const righeTipo = righeFiltrate.filter(r => r.tipo === tipo);
        if (righeTipo.length === 0) return;
        
        // Raggruppa per sezione
        const sezioni = [...new Set(righeTipo.map(r => r.sezione))];
        if (tipo === "ZADANKAI") {
            const ordine = ["membri", "simpatizzanti", "ospiti"];
            sezioni.sort((a, b) => ordine.indexOf(a) - ordine.indexOf(b));
        }
        
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
            r.tipo === tipo && sezioniRilevanti.includes(r.sezione)
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
            const sommaPrec = righePrec.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
            
            const riga = [
                index === 0 ? tipo : '',
                sezione,
                sum.U, sum.D, sum.GU, sum.GD,
                sommaTot,
                sommaPrec,
                index === 0 ? `${totaleMese} (Prec: ${totalePrec}, Δ: ${delta >= 0 ? "+" : ""}${delta})` : '',
                sum.FUT,
                sum.STU
            ];
            
            righeHombuDettagliate.push(riga);
        });
    });
    
    doc.autoTable({
        head: intestazioniHombu,
        body: righeHombuDettagliate,
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
            6: { fontStyle: 'bold' }, // Somma
            8: { fontStyle: 'bold' }  // Totale Hombu
        }
    });
    
    yPosition = doc.lastAutoTable.finalY + 20;
    
    // ===== RIEPILOGHI DETTAGLIATI PER CAPITOLO =====
    const capitoli = [...new Set(righeFiltrate.map(r => gruppoToCapitolo[r.gruppo]))].filter(Boolean).sort();
    
    capitoli.forEach((capitolo) => {
        // Nuova pagina per ogni capitolo
        doc.addPage();
        yPosition = 10;
        
        doc.setFontSize(16);
        doc.text(`CAPITOLO: ${capitolo}`, 20, yPosition);
        yPosition += 10;
        
        const righeFiltrateCap = righeFiltrate.filter(r => gruppoToCapitolo[r.gruppo] === capitolo);
        
        // Raggruppa per settore
        const settori = {};
        righeFiltrateCap.forEach(r => {
            if (!gruppiData || !gruppiData["HOMBU 9"] || !gruppiData["HOMBU 9"][capitolo]) return;
            
            for (const [settore, gruppiSettore] of Object.entries(gruppiData["HOMBU 9"][capitolo])) {
                if (Array.isArray(gruppiSettore) && gruppiSettore.includes(r.gruppo)) {
                    if (!settori[settore]) settori[settore] = [];
                    settori[settore].push(r);
                    break;
                }
            }
        });
        
        // ===== TABELLE DETTAGLIATE PER SETTORE =====
        Object.entries(settori).forEach(([settore, righeSettore]) => {
            // if (yPosition > 200) {
            //     doc.addPage();
            //     yPosition = 20;
            // }
            
            doc.setFontSize(12);
            doc.text(`Settore: ${settore}`, 20, yPosition);
            yPosition += 8;
            
            // Ottieni lista gruppi del settore
            const gruppiSettore = gruppiData["HOMBU 9"][capitolo][settore] || [];
            
            // Prepara dati per tabella settore DETTAGLIATA
            const intestazioniSettore = [['Categoria', 'Sezione', 'U', 'D', 'GU', 'GD', 'Somma', 'Prec.', 'Totale Settore', 'Futuro', 'Studenti']];
            const righeTabSettore = [];
            
            ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
                const righeTipo = righeSettore.filter(r => r.tipo === tipo);
                if (righeTipo.length === 0) return;
                
                const sezioni = [...new Set(righeTipo.map(r => r.sezione))];
                if (tipo === "ZADANKAI") {
                    const ordine = ["membri", "simpatizzanti", "ospiti"];
                    sezioni.sort((a, b) => ordine.indexOf(a) - ordine.indexOf(b));
                }
                
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
                    
                    const riga = [
                        index === 0 ? tipo : '',
                        sezione,
                        sum.U, sum.D, sum.GU, sum.GD,
                        sommaTot,
                        sommaPrec,
                        index === 0 ? `${totaleMese} (Prec: ${totalePrec}, Δ: ${delta >= 0 ? "+" : ""}${delta})` : '',
                        sum.FUT,
                        sum.STU
                    ];
                    
                    righeTabSettore.push(riga);
                });
            });
            
            doc.autoTable({
                head: intestazioniSettore,
                body: righeTabSettore,
                startY: yPosition,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [255, 193, 7] },
                columnStyles: {
                    6: { fontStyle: 'bold' }, // Somma
                    8: { fontStyle: 'bold' }  // Totale Settore
                }
            });
            
            yPosition = doc.lastAutoTable.finalY + 10;
        });
        
        // ===== RIEPILOGO CAPITOLO DETTAGLIATO =====
        // Forza sempre una nuova pagina per il riepilogo capitolo
        //doc.addPage();
        //yPosition = 20;
        
        doc.setFontSize(12);
        doc.text(`Riepilogo Capitolo: ${capitolo}`, 20, yPosition);
        yPosition += 8;
        
        // Prepara tabella dettagliata capitolo
        const intestazioniCapitolo = [['Categoria', 'Sezione', 'U', 'D', 'GU', 'GD', 'Somma', 'Prec.', 'Totale Capitolo', 'Futuro', 'Studenti']];
        const righeCapitoloDettagliate = [];
        
        ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
            const righeTipo = righeFiltrateCap.filter(r => r.tipo === tipo);
            if (righeTipo.length === 0) return;
            
            const sezioni = [...new Set(righeTipo.map(r => r.sezione))];
            if (tipo === "ZADANKAI") {
                const ordine = ["membri", "simpatizzanti", "ospiti"];
                sezioni.sort((a, b) => ordine.indexOf(a) - ordine.indexOf(b));
            }
            
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
                r.tipo === tipo && sezioniRilevanti.includes(r.sezione) &&
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
                const sommaPrec = righePrec.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
                
                const riga = [
                    index === 0 ? tipo : '',
                    sezione,
                    sum.U, sum.D, sum.GU, sum.GD,
                    sommaTot,
                    sommaPrec,
                    index === 0 ? `${totaleMese} (Prec: ${totalePrec}, Δ: ${delta >= 0 ? "+" : ""}${delta})` : '',
                    sum.FUT,
                    sum.STU
                ];
                
                righeCapitoloDettagliate.push(riga);
            });
        });
        
        doc.autoTable({
            head: intestazioniCapitolo,
            body: righeCapitoloDettagliate,
            startY: yPosition,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [40, 167, 69] },
            columnStyles: {
                6: { fontStyle: 'bold' }, // Somma
                8: { fontStyle: 'bold' }  // Totale Capitolo
            }
        });
    });
    
    // Scarica il file
    doc.save(`riepiloghi_completi_${meseSelezionato}_${annoSelezionato}.pdf`);
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
