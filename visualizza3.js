// 🔹 Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

// 🔹 Configurazione bordi centralizzata
const BORDER_CONFIG = {
  vertical: {
    thickness: "2px",
    style: "solid",
    color: "#3282F6"
  },
  horizontal: {
    thickness: "4px",
    style: "solid",
    color: "#495057"
  },
  // Funzioni helper per generare le stringhe CSS
  getVerticalBorder: function() {
    return `${this.vertical.thickness} ${this.vertical.style} ${this.vertical.color}`;
  },
  getHorizontalBorder: function() {
    return `${this.horizontal.thickness} ${this.horizontal.style} ${this.horizontal.color}`;
  }
};

// 🔹 Inizializza Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🔹 Riferimenti DOM
const filtroAnno = document.getElementById("filtro-anno");
const filtroMese = document.getElementById("filtro-mese");
const filtroCapitolo = document.getElementById("filtro-capitolo");
const tbody = document.querySelector("#tabella-dati tbody");
const btnExportCsv = document.getElementById("btn-export-csv");
const btnPrint = document.getElementById("btn-print");
const chartCategorie = document.getElementById("chart-categorie");
const chartConfronto = document.getElementById("chart-confronto");

const mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

// Variabili globali
let righe = [];
let gruppoToCapitolo = {};
let gruppiData;
let graficoCategorieInstance = null;
let graficoConfrontoInstance = null;

// Funzione per ottenere il mese precedente
function mesePrecedente(mese, anno) {
  const idx = mesiOrdine.indexOf(mese);
  const nuovoIdx = (idx - 1 + 12) % 12;
  const nuovoAnno = idx === 0 ? String(Number(anno) - 1) : anno;
  return { mese: mesiOrdine[nuovoIdx], anno: nuovoAnno };
}

// 🔹 Carica dati da gruppi.json e Firebase
async function caricaDati() {
  try {
    const [dataResponse, snapshot] = await Promise.all([
      fetch("gruppi.json").then(res => res.json()),
      get(child(ref(db), "zadankai"))
    ]);
    
    gruppiData = dataResponse;
    const struttura = gruppiData["HOMBU 9"];
    
    // Popola il filtro capitolo
    for (const [capitolo, settori] of Object.entries(struttura)) {
      for (const [_, gruppi] of Object.entries(settori)) {
        gruppi.forEach(gr => gruppoToCapitolo[gr] = capitolo);
      }
      const option = new Option(capitolo, capitolo);
      filtroCapitolo.appendChild(option);
    }

    if (!snapshot.exists()) return;
    const dati = snapshot.val();

    // Elabora i dati da Firebase
    for (const key in dati) {
      const [anno, mese, gruppo] = key.split("-");
      const sezioni = dati[key];

      // Zadankai
      for (const categoria in sezioni.zadankai) {
        const r = sezioni.zadankai[categoria];
        righe.push({ 
          anno, mese, gruppo, tipo: "ZADANKAI", sezione: categoria,
          U: r.U ?? 0, D: r.D ?? 0, GU: r.GU ?? 0, GD: r.GD ?? 0, FUT: r.FUT ?? 0, STU: r.STU ?? 0 
        });
      }

      // Praticanti
      for (const categoria in sezioni.praticanti) {
        const r = sezioni.praticanti[categoria];
        righe.push({ 
          anno, mese, gruppo, tipo: "PRATICANTI", sezione: categoria,
          U: r.U ?? 0, D: r.D ?? 0, GU: r.GU ?? 0, GD: r.GD ?? 0, FUT: 0, STU: 0 
        });
      }
    }

    // Popola i filtri anno e mese
    const anni = [...new Set(righe.map(r => r.anno))].sort();
    anni.forEach(anno => {
      const option = new Option(anno, anno);
      filtroAnno.appendChild(option);
    });

    const mesiPresenti = [...new Set(righe.map(r => r.mese))];
    mesiOrdine.forEach(mese => { 
      if (mesiPresenti.includes(mese)) {
        const option = new Option(mese, mese);
        filtroMese.appendChild(option);
      }
    });

    // Aggiungi event listeners
    [filtroAnno, filtroMese, filtroCapitolo].forEach(f => 
      f.addEventListener("change", aggiornaTabella));
    btnExportCsv.addEventListener("click", esportaCsv);
    btnPrint.addEventListener("click", stampa);

    // Inizializza la tabella
    aggiornaTabella();
  } catch (error) {
    console.error("Errore nel caricamento dei dati:", error);
    alert("Si è verificato un errore nel caricamento dei dati. Controlla la console per dettagli.");
  }
}

// Funzione per aggiornare la tabella
function aggiornaTabella() {
  tbody.innerHTML = "";
  const anno = filtroAnno.value;
  const mese = filtroMese.value;
  const capitolo = filtroCapitolo.value;
  const { mese: mesePrec, anno: annoPrec } = mesePrecedente(mese, anno);

  // Filtra le righe in base ai filtri selezionati
  const righeFiltrate = righe.filter(r =>
    r.anno === anno &&
    r.mese === mese &&
    gruppoToCapitolo[r.gruppo] === capitolo
  );

  // Ottieni la struttura dei settori e gruppi
  const settorePerGruppo = {};
  const strutturaCapitolo = gruppiData["HOMBU 9"][capitolo];
  for (const [settore, listaGruppi] of Object.entries(strutturaCapitolo)) {
    listaGruppi.forEach(gr => settorePerGruppo[gr] = settore);
  }
  
  // Raggruppa i gruppi per settore e ordina alfabeticamente
  const gruppiPresenti = [...new Set(righeFiltrate.map(r => r.gruppo))];
  
  // Crea una mappa settore -> gruppi ordinati alfabeticamente
  const gruppiPerSettore = {};
  gruppiPresenti.forEach(gruppo => {
    const settore = settorePerGruppo[gruppo];
    if (!gruppiPerSettore[settore]) {
      gruppiPerSettore[settore] = [];
    }
    gruppiPerSettore[settore].push(gruppo);
  });
  
  // Ordina i settori alfabeticamente e i gruppi all'interno di ogni settore
  const settoriOrdinati = Object.keys(gruppiPerSettore).sort();
  const gruppiOrdinati = [];
  settoriOrdinati.forEach(settore => {
    gruppiPerSettore[settore].sort();
    gruppiOrdinati.push(...gruppiPerSettore[settore]);
  });

  let settoreCorrente = null;
  
  // Genera la tabella
  gruppiOrdinati.forEach((gruppo, index) => {
    const settore = settorePerGruppo[gruppo];
    
    // Intestazione settore
    if (settore !== settoreCorrente) {
      // Riga separatrice settore
      const separatore = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 12;
      td.textContent = `Settore: ${settore}`;
      td.className = "bg-secondary text-white fw-bold text-center";
      separatore.appendChild(td);
      tbody.appendChild(separatore);
    
      // Intestazione tabella
      const headerRow = document.createElement("tr");
      const headers = [
        "Nome Gruppo", "Categoria", "Sezione", "U", "D", "GU", "GD",
        "Somma", "Prec.", "Totale Gruppo", "Futuro", "Studenti"
      ];
      headers.forEach((testo, i) => {
        const th = document.createElement("th");
        th.textContent = testo;
        th.className = "bg-light";
        headerRow.appendChild(th);
      });
      tbody.appendChild(headerRow);
    
      settoreCorrente = settore;
    }
    
    // Righe dei dati per gruppo
    const righeGruppo = righeFiltrate.filter(r => r.gruppo === gruppo);
    let gruppoStampato = false;
    let tipoStampati = {};
    let totaleStampati = {};
    let primaRigaGruppo = true;
  
    ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
      let righeCategoria = righeGruppo.filter(r => r.tipo === tipo);
  
      if (righeCategoria.length === 0) return;
  
      // Ordina sezioni ZADANKAI
      if (tipo === "ZADANKAI") {
        const sezioniOrdinate = ["membri", "simpatizzanti", "ospiti"];
        righeCategoria.sort((a, b) =>
          sezioniOrdinate.indexOf(a.sezione) - sezioniOrdinate.indexOf(b.sezione)
        );
      }
  
      const totaleCategoria = righeCategoria.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
  
      const righePrec = righe.filter(r =>
        r.anno === annoPrec &&
        r.mese === mesePrec &&
        r.gruppo === gruppo &&
        r.tipo === tipo
      );
  
      const totalePrec = righePrec.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
      const delta = totaleCategoria - totalePrec;
  
      righeCategoria.forEach((r, index) => {
        const somma = r.U + r.D + r.GU + r.GD;
        const righePrecSezione = righePrec.filter(x => x.sezione === r.sezione);
        const sommaPrec = righePrecSezione.reduce((acc, x) => acc + x.U + x.D + x.GU + x.GD, 0);
  
        const tr = document.createElement("tr");
        tr.className = tipo === "ZADANKAI" ? "zadankai" : "praticanti";
        
        // Applica bordo più spesso per separare i gruppi
        if (primaRigaGruppo && index === 0 && gruppo !== gruppiOrdinati[0]) {
          tr.classList.add("gruppo-border");
        }
  
        let colIndex = 0; // Traccia la posizione effettiva delle colonne
  
        // Nome Gruppo
        if (!gruppoStampato && index === 0) {
          const tdGruppo = document.createElement("td");
          tdGruppo.textContent = gruppo;
          tdGruppo.rowSpan = righeGruppo.length;
          tdGruppo.className = "nome-gruppo";
          tr.appendChild(tdGruppo);
          gruppoStampato = true;
        }
        colIndex++; // Colonna 1: Nome Gruppo
  
        // Categoria
        if (!tipoStampati[tipo]) {
          const tdTipo = document.createElement("td");
          tdTipo.textContent = tipo;
          tdTipo.rowSpan = righeCategoria.length;
          tr.appendChild(tdTipo);
          tipoStampati[tipo] = true;
        }
        colIndex++; // Colonna 2: Categoria
  
        // Dati ordinati con bordi neri applicati direttamente
        const celle = [
          r.sezione, r.U, r.D, r.GU, r.GD,
          somma,
          sommaPrec
        ];
  
        celle.forEach((val, i) => {
          const td = document.createElement("td");
          td.textContent = val;
          
          // Applica bordi neri per le colonne specifiche
          const currentCol = colIndex + i + 1; // +1 perché colIndex è 0-based
          if (currentCol === 4) { // Separazione tra Sezione e U
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (currentCol === 8) { // Separazione tra GD e Somma
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (currentCol === 10) { // Separazione tra Prec. e Totale Gruppo
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          }
          
          tr.appendChild(td);
        });
        colIndex += celle.length;
  
        // Totale categoria
        if (!totaleStampati[tipo]) {
          const tdTot = document.createElement("td");
          tdTot.rowSpan = righeCategoria.length;
          // Aggiungere il bordo sinistro per separare da "Prec"
          tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          tdTot.innerHTML = `
            <div><strong>${totaleCategoria}</strong></div>
            <div class="small">Prec: ${totalePrec}</div>
            <div class="${delta >= 0 ? 'text-success' : 'text-danger'} fw-bold">
              Δ ${delta >= 0 ? "+" : ""}${delta}
            </div>`;
          tr.appendChild(tdTot);
          totaleStampati[tipo] = true;
        }
        colIndex++; // Colonna Totale Gruppo
  
        // Futuro e Studenti
        const tdFuturo = document.createElement("td");
        tdFuturo.textContent = r.FUT;
        // Separazione tra Totale Gruppo e Futuro
        tdFuturo.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        tr.appendChild(tdFuturo);
        
        const tdStudenti = document.createElement("td");
        tdStudenti.textContent = r.STU;
        tr.appendChild(tdStudenti);
  
        tbody.appendChild(tr);
        
        if (primaRigaGruppo && index === 0) {
          primaRigaGruppo = false;
        }
      });
    });
  });

  // Aggiorna le altre sezioni
  mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo);
  generaRiepiloghiCapitoloESettori(righeFiltrate, mese, anno, mesePrec, annoPrec, capitolo);
  aggiornaGrafici(righeFiltrate, anno, mese, capitolo, annoPrec, mesePrec);
}

// Funzione per mostrare i gruppi mancanti
function mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo) {
  const contenitoreLista = document.getElementById("gruppi-mancanti");
  contenitoreLista.innerHTML = "";

  // Gruppi del capitolo selezionato
  const gruppiCapitolo = Object.values(gruppiData["HOMBU 9"][capitolo]).flat();

  // Gruppi presenti nei dati per quel mese
  const gruppiPresenti = [...new Set(righeFiltrate.map(r => r.gruppo))];
  const gruppiMancanti = gruppiCapitolo.filter(gr => !gruppiPresenti.includes(gr));

  if (gruppiMancanti.length > 0) {
    contenitoreLista.className = "alert alert-warning";
    const ul = document.createElement("ul");
    ul.className = "mb-0 list-unstyled";
    gruppiMancanti.forEach(gr => {
      const li = document.createElement("li");
      li.innerHTML = `<i class="fas fa-exclamation-triangle text-danger me-2"></i>${gr}`;
      ul.appendChild(li);
    });
    contenitoreLista.innerHTML = `<strong>Gruppi senza dati per ${mese} ${anno}:</strong>`;
    contenitoreLista.appendChild(ul);
  } else {
    contenitoreLista.className = "alert alert-success";
    contenitoreLista.innerHTML = `<i class="fas fa-check-circle me-2"></i>Tutti i gruppi del capitolo hanno inserito dati!`;
  }
}

// Funzione per generare i riepiloghi
function generaRiepiloghiCapitoloESettori(righeFiltrate, mese, anno, mesePrec, annoPrec, capitolo) {
  const contenitore = document.getElementById("riepilogo-capitolo");
  contenitore.innerHTML = "";

  const struttura = gruppiData["HOMBU 9"][capitolo];
  const settori = Object.entries(struttura);

  // Genera riepiloghi per settori
  settori.forEach(([settore, gruppiSettore]) => {
    const righeSettore = righeFiltrate.filter(r => gruppiSettore.includes(r.gruppo));
    if (righeSettore.length === 0) return;

    // Crea card per il settore
    const cardSettore = document.createElement("div");
    cardSettore.className = "card shadow-sm mb-4";
    
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header bg-warning text-dark";
    cardHeader.innerHTML = `<h5 class="mb-0"><i class="fas fa-chart-pie me-2"></i>Riepilogo: ${settore}</h5>`; //SETTORE
    cardSettore.appendChild(cardHeader);
    
    const cardBody = document.createElement("div");
    cardBody.className = "card-body table-responsive";
    
    // Crea tabella
    const tabella = document.createElement("table");
    tabella.className = "table table-striped table-bordered";
    
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr>
      <th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th>
      <th>Somma</th><th>Prec.</th><th>Totale Gruppi</th><th>Futuro</th><th>Studenti</th>
    </tr>`;
    tabella.appendChild(thead);
    
    const tbody = document.createElement("tbody");
    
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
        
        const tr = document.createElement("tr");
        tr.className = tipo === "ZADANKAI" ? "table-warning" : "table-info";
        
        if (index === 0) {
          const tdTipo = document.createElement("td");
          tdTipo.textContent = tipo;
          tdTipo.rowSpan = tipoRowSpan;
          tdTipo.className = "fw-bold";
          tr.appendChild(tdTipo);
        }
        
        const celle = [
          sezione, sum.U, sum.D, sum.GU, sum.GD,
          sommaTot, sommaPrec
        ];
        celle.forEach((val, i) => {
          const td = document.createElement("td");
          td.textContent = val;
          // Applica bordi neri per le colonne specifiche nelle tabelle riepilogo
          // Colonna 3=U, 7=Somma, 8=Prec
          if (i === 1) { // U (dopo Sezione)
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (i === 5) { // Somma (dopo GD)
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          }
          tr.appendChild(td);
        });
        
        if (index === 0) {
          const tdTot = document.createElement("td");
          tdTot.rowSpan = tipoRowSpan;
          // Bordo sinistro per separare da "Prec"
          tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          tdTot.innerHTML = `
            <div><strong>${totaleMese}</strong></div>
            <div class="small">Prec: ${totalePrec}</div>
            <div class="${delta >= 0 ? 'text-success' : 'text-danger'} fw-bold">
              Δ ${delta >= 0 ? "+" : ""}${delta}
            </div>`;
          tdTot.className = "text-center";
          tr.appendChild(tdTot);
        }
        
        const tdFUT = document.createElement("td");
        tdFUT.textContent = sum.FUT;
        // Bordo sinistro per separare da "Totale Gruppo"
        tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        const tdSTU = document.createElement("td");
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
  });
  
  // Genera riepilogo capitolo
  const cardCapitolo = document.createElement("div");
  cardCapitolo.className = "card shadow-sm mb-4";
  
  const cardHeaderCap = document.createElement("div");
  cardHeaderCap.className = "card-header bg-primary text-white";
  cardHeaderCap.innerHTML = `<h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Riepilogo: ${capitolo}</h5>`; //CAPITOLO
  cardCapitolo.appendChild(cardHeaderCap);
  
  const cardBodyCap = document.createElement("div");
  cardBodyCap.className = "card-body table-responsive";
  
  const tabellaCap = document.createElement("table");
  tabellaCap.className = "table table-striped table-bordered";
  
  const theadCap = document.createElement("thead");
  theadCap.innerHTML = `<tr>
    <th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th>
    <th>Somma</th><th>Prec.</th><th>Totale Gruppi</th><th>Futuro</th><th>Studenti</th>
  </tr>`;
  tabellaCap.appendChild(theadCap);
  
  const tbodyCap = document.createElement("tbody");
  
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
      
      const tr = document.createElement("tr");
      tr.className = tipo === "ZADANKAI" ? "table-warning" : "table-info";
      
      if (index === 0) {
        const tdTipo = document.createElement("td");
        tdTipo.textContent = tipo;
        tdTipo.rowSpan = tipoRowSpan;
        tdTipo.className = "fw-bold";
        tr.appendChild(tdTipo);
      }
      
      const celle = [
        sezione, sum.U, sum.D, sum.GU, sum.GD,
        sommaTot, sommaPrec
      ];
      celle.forEach((val, i) => {
        const td = document.createElement("td");
        td.textContent = val;
        // Applica bordi neri per le colonne specifiche nel riepilogo capitolo
        // Colonna 1=U (dopo Sezione), 5=Somma (dopo GD)
        if (i === 1) { // U (dopo Sezione)
          td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        } else if (i === 5) { // Somma (dopo GD)
          td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        }
        tr.appendChild(td);
      });
      
      if (index === 0) {
        const tdTot = document.createElement("td");
        tdTot.rowSpan = tipoRowSpan;
        // Bordo sinistro per separare da "Prec"
        tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        tdTot.innerHTML = `
          <div><strong>${totaleMese}</strong></div>
          <div class="small">Prec: ${totalePrec}</div>
          <div class="${delta >= 0 ? 'text-success' : 'text-danger'} fw-bold">
            Δ ${delta >= 0 ? "+" : ""}${delta}
          </div>`;
        tdTot.className = "text-center";
        tr.appendChild(tdTot);
      }
      
      const tdFUT = document.createElement("td");
      tdFUT.textContent = sum.FUT;
      // Bordo sinistro per separare da "Totale Gruppo"
      tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
      const tdSTU = document.createElement("td");
      tdSTU.textContent = sum.STU;
      tr.appendChild(tdFUT);
      tr.appendChild(tdSTU);
      
      tbodyCap.appendChild(tr);
    });
  });
  
  tabellaCap.appendChild(tbodyCap);
  cardBodyCap.appendChild(tabellaCap);
  cardCapitolo.appendChild(cardBodyCap);
  contenitore.appendChild(cardCapitolo);
}

// Funzione per aggiornare i grafici
function aggiornaGrafici(righeFiltrate, anno, mese, capitolo, annoPrec, mesePrec) {
  // Distruggi i grafici esistenti se presenti
  if (graficoCategorieInstance) graficoCategorieInstance.destroy();
  if (graficoConfrontoInstance) graficoConfrontoInstance.destroy();

  // Dati per il grafico delle categorie
  const datiZadankai = righeFiltrate.filter(r => r.tipo === "ZADANKAI");
  const datiPraticanti = righeFiltrate.filter(r => r.tipo === "PRATICANTI");

  const totaleZadankai = datiZadankai.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
  const totalePraticanti = datiPraticanti.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);

  // Grafico a torta per le categorie
  graficoCategorieInstance = new Chart(chartCategorie, {
    type: 'pie',
    data: {
      labels: ['Zadankai', 'Praticanti'],
      datasets: [{
        data: [totaleZadankai, totalePraticanti],
        backgroundColor: ['#fff3cd', '#d1ecf1'],
        borderColor: ['#ffc107', '#17a2b8'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `Distribuzione per Categoria - ${mese} ${anno}`
        }
      }
    }
  });

  // Dati per il grafico di confronto con il mese precedente - SOLO ZADANKAI
  const righePrecedentiZadankai = righe.filter(r =>
    r.anno === annoPrec &&
    r.mese === mesePrec &&
    r.tipo === "ZADANKAI" &&
    gruppoToCapitolo[r.gruppo] === capitolo
  );

  const totaleZadankaiCorrente = datiZadankai.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
  const totaleZadankaiPrecedente = righePrecedentiZadankai.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);

  // Grafico a barre per il confronto - SOLO ZADANKAI
  graficoConfrontoInstance = new Chart(chartConfronto, {
    type: 'bar',
    data: {
      labels: [`${mesePrec} ${annoPrec}`, `${mese} ${anno}`],
      datasets: [{
        label: 'Totale Zadankai',
        data: [totaleZadankaiPrecedente, totaleZadankaiCorrente],
        backgroundColor: ['#6c757d', '#ffc107'],
        borderColor: ['#5a6268', '#e0a800'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Confronto Zadankai con Mese Precedente'
        }
      }
    }
  });
}

// Funzione per esportare in CSV
function esportaCsv() {
  const anno = filtroAnno.value;
  const mese = filtroMese.value;
  const capitolo = filtroCapitolo.value;

  const righeFiltrate = righe.filter(r =>
    r.anno === anno &&
    r.mese === mese &&
    gruppoToCapitolo[r.gruppo] === capitolo
  );

  if (righeFiltrate.length === 0) {
    alert("Nessun dato da esportare");
    return;
  }

  // Intestazioni CSV
  let csv = "Gruppo,Categoria,Sezione,U,D,GU,GD,Somma,Futuro,Studenti\n";

  // Righe dati
  righeFiltrate.forEach(r => {
    const somma = r.U + r.D + r.GU + r.GD;
    csv += `"${r.gruppo}","${r.tipo}","${r.sezione}",${r.U},${r.D},${r.GU},${r.GD},${somma},${r.FUT},${r.STU}\n`;
  });

  // Crea e scarica il file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `dati_${capitolo}_${mese}_${anno}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Funzione per la stampa
function stampa() {
  window.print();
}

// Inizializza l'applicazione
document.addEventListener("DOMContentLoaded", caricaDati);
