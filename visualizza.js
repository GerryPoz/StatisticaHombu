// 🔹 Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// 🔹 Inizializza Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🔹 Riferimenti DOM
const filtroAnno = document.getElementById("filtro-anno");
const filtroMese = document.getElementById("filtro-mese");
const filtroCapitolo = document.getElementById("filtro-capitolo");
const filtroTipo = document.getElementById("filtro-tipo");
const containerTabelle = document.getElementById("container-tabelle");
const btnExportExcel = document.getElementById("btn-export-excel");
const btnExportPdf = document.getElementById("btn-export-pdf");
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
    righe = [];
    filtroAnno.innerHTML = "";
    filtroMese.innerHTML = "";
    const [dataResponse, snapshot] = await Promise.all([
      fetch("gruppi.json").then(res => res.json()),
      get(child(ref(db), (filtroTipo && filtroTipo.value === "STUDIO_GOSHO") ? "studio_gosho" : "zadankai"))
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
    if (filtroTipo) filtroTipo.addEventListener("change", () => { caricaDati(); });
    btnExportExcel.addEventListener("click", esportaExcel);
    btnExportPdf.addEventListener("click", esportaPdf);
    btnPrint.addEventListener("click", stampa);

    // Inizializza la tabella
    aggiornaTabella();
  } catch (error) {
    console.error("Errore nel caricamento dei dati:", error);
    alert("Si è verificato un errore nel caricamento dei dati. Controlla la console per dettagli.");
  }
}

// Avvia il caricamento dei dati
caricaDati();

// Funzione helper per calcolare i totali di una riga
function calcolaTotaliRiga(righe, tipo) {
  return righe.reduce((acc, r) => {
    acc.U += r.U; acc.D += r.D; acc.GU += r.GU; acc.GD += r.GD;
    acc.FUT += r.FUT || 0; acc.STU += r.STU || 0;
    return acc;
  }, { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 });
}

// Funzione helper per trovare i dati di una sezione specifica
function trovaDatiSezione(righe, sezione) {
  const riga = righe.find(r => r.sezione === sezione);
  if (riga) {
    return { 
      U: riga.U, D: riga.D, GU: riga.GU, GD: riga.GD, 
      Tot: riga.U + riga.D + riga.GU + riga.GD,
      FUT: riga.FUT, STU: riga.STU 
    };
  }
  return { U: 0, D: 0, GU: 0, GD: 0, Tot: 0, FUT: 0, STU: 0 };
}

// Funzione principale per aggiornare la visualizzazione
function aggiornaTabella() {
  containerTabelle.innerHTML = "";
  const anno = filtroAnno.value;
  const mese = filtroMese.value;
  const capitolo = filtroCapitolo.value;
  const { mese: mesePrec, anno: annoPrec } = mesePrecedente(mese, anno);

  // Filtra i dati base
  const datiAnnoMese = righe.filter(r => r.anno === anno && r.mese === mese && gruppoToCapitolo[r.gruppo] === capitolo);
  const datiPrec = righe.filter(r => r.anno === annoPrec && r.mese === mesePrec && gruppoToCapitolo[r.gruppo] === capitolo);

  // Struttura dati gerarchica
  const struttura = gruppiData["HOMBU 9"][capitolo];
  const datiGerarchici = [];
  
  // Totali Capitolo
  const totCapitoloZadankai = { membri: initTot(), simp: initTot(), ospiti: initTot(), totG: 0, var: 0, fut: 0, stu: 0 };
  const totCapitoloPraticanti = { membri: initTot(), simp: initTot(), totG: 0, var: 0 };

  // Calcolo dati Centro H9 (Totale Generale) - In questo contesto è uguale al Capitolo se filtrato, 
  // ma lo calcoliamo separatamente se volessimo mostrare più capitoli. Per ora usiamo i dati del capitolo come Centro.
  
  for (const [settore, gruppi] of Object.entries(struttura)) {
    const datiSettore = {
      nome: settore,
      gruppi: [],
      totZadankai: { membri: initTot(), simp: initTot(), ospiti: initTot(), totG: 0, var: 0, fut: 0, stu: 0 },
      totPraticanti: { membri: initTot(), simp: initTot(), totG: 0, var: 0 }
    };

    gruppi.sort().forEach(gruppo => {
      // ZADANKAI
      const righeZadankai = datiAnnoMese.filter(r => r.gruppo === gruppo && r.tipo === "ZADANKAI");
      const righeZadankaiPrec = datiPrec.filter(r => r.gruppo === gruppo && r.tipo === "ZADANKAI");
      
      const zMembri = trovaDatiSezione(righeZadankai, "membri");
      const zSimp = trovaDatiSezione(righeZadankai, "simpatizzanti");
      const zOspiti = trovaDatiSezione(righeZadankai, "ospiti"); // Persone Nuove
      
      const totG = zMembri.Tot + zSimp.Tot + zOspiti.Tot;
      const totFut = zMembri.FUT + zSimp.FUT + zOspiti.FUT;
      const totStu = zMembri.STU + zSimp.STU + zOspiti.STU;

      const totGPrec = righeZadankaiPrec.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
      const variazione = totG - totGPrec;

      const datiGruppoZadankai = {
        membri: zMembri, simp: zSimp, ospiti: zOspiti,
        totG, var: variazione, fut: totFut, stu: totStu
      };

      // Aggiorna totali settore Zadankai
      sommaTotali(datiSettore.totZadankai.membri, zMembri);
      sommaTotali(datiSettore.totZadankai.simp, zSimp);
      sommaTotali(datiSettore.totZadankai.ospiti, zOspiti);
      datiSettore.totZadankai.totG += totG;
      datiSettore.totZadankai.var += variazione;
      datiSettore.totZadankai.fut += totFut;
      datiSettore.totZadankai.stu += totStu;

      // PRATICANTI
      const righePraticanti = datiAnnoMese.filter(r => r.gruppo === gruppo && r.tipo === "PRATICANTI");
      const righePraticantiPrec = datiPrec.filter(r => r.gruppo === gruppo && r.tipo === "PRATICANTI");

      const pMembri = trovaDatiSezione(righePraticanti, "membri");
      const pSimp = trovaDatiSezione(righePraticanti, "simpatizzanti");
      
      const pTotG = pMembri.Tot + pSimp.Tot;
      const pTotGPrec = righePraticantiPrec.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
      const pVariazione = pTotG - pTotGPrec;

      const datiGruppoPraticanti = {
        membri: pMembri, simp: pSimp,
        totG: pTotG, var: pVariazione
      };

      // Aggiorna totali settore Praticanti
      sommaTotali(datiSettore.totPraticanti.membri, pMembri);
      sommaTotali(datiSettore.totPraticanti.simp, pSimp);
      datiSettore.totPraticanti.totG += pTotG;
      datiSettore.totPraticanti.var += pVariazione;

      datiSettore.gruppi.push({
        nome: gruppo,
        zadankai: datiGruppoZadankai,
        praticanti: datiGruppoPraticanti
      });
    });

    // Aggiorna totali capitolo
    sommaTotali(totCapitoloZadankai.membri, datiSettore.totZadankai.membri);
    sommaTotali(totCapitoloZadankai.simp, datiSettore.totZadankai.simp);
    sommaTotali(totCapitoloZadankai.ospiti, datiSettore.totZadankai.ospiti);
    totCapitoloZadankai.totG += datiSettore.totZadankai.totG;
    totCapitoloZadankai.var += datiSettore.totZadankai.var;
    totCapitoloZadankai.fut += datiSettore.totZadankai.fut;
    totCapitoloZadankai.stu += datiSettore.totZadankai.stu;

    sommaTotali(totCapitoloPraticanti.membri, datiSettore.totPraticanti.membri);
    sommaTotali(totCapitoloPraticanti.simp, datiSettore.totPraticanti.simp);
    totCapitoloPraticanti.totG += datiSettore.totPraticanti.totG;
    totCapitoloPraticanti.var += datiSettore.totPraticanti.var;

    datiGerarchici.push(datiSettore);
  }

  // Genera Tabella Zadankai
  const tableZ = document.createElement("table");
  tableZ.className = "table-custom table-zadankai mb-5";
  tableZ.innerHTML = getHeaderZadankai();
  
  const tbodyZ = document.createElement("tbody");
  datiGerarchici.forEach(settore => {
    settore.gruppi.forEach(gruppo => {
      tbodyZ.appendChild(creaRigaZadankai(gruppo.nome, gruppo.zadankai));
    });
    tbodyZ.appendChild(creaRigaZadankai(`SETTORE ${settore.nome.toUpperCase()}`, settore.totZadankai, "riga-settore"));
  });
  tbodyZ.appendChild(creaRigaZadankai(`CAPITOLO ${capitolo.toUpperCase()}`, totCapitoloZadankai, "riga-capitolo"));
  
  tableZ.appendChild(tbodyZ);
  containerTabelle.appendChild(tableZ);

  if (!filtroTipo || filtroTipo.value !== "STUDIO_GOSHO") {
    const tableP = document.createElement("table");
    tableP.className = "table-custom table-praticanti mb-5";
    tableP.innerHTML = getHeaderPraticanti();
    const tbodyP = document.createElement("tbody");
    datiGerarchici.forEach(settore => {
      settore.gruppi.forEach(gruppo => {
        tbodyP.appendChild(creaRigaPraticanti(gruppo.nome, gruppo.praticanti));
      });
      tbodyP.appendChild(creaRigaPraticanti(`SETTORE ${settore.nome.toUpperCase()}`, settore.totPraticanti, "riga-settore"));
    });
    tbodyP.appendChild(creaRigaPraticanti(`CAPITOLO ${capitolo.toUpperCase()}`, totCapitoloPraticanti, "riga-capitolo"));
    tableP.appendChild(tbodyP);
    containerTabelle.appendChild(tableP);
  }

  // Aggiorna Grafici (manteniamo la logica esistente se compatibile o la adattiamo)
  aggiornaGrafici(righe.filter(r => r.anno === anno && r.mese === mese && gruppoToCapitolo[r.gruppo] === capitolo), anno, mese, capitolo, annoPrec, mesePrec);
  mostraGruppiMancanti(datiAnnoMese, anno, mese, capitolo);
}

// Helper init
function initTot() { return { U: 0, D: 0, GU: 0, GD: 0, Tot: 0, FUT: 0, STU: 0 }; }

// Helper somma
function sommaTotali(dest, source) {
  dest.U += source.U; dest.D += source.D; dest.GU += source.GU; dest.GD += source.GD;
  dest.Tot += source.Tot; dest.FUT += source.FUT || 0; dest.STU += source.STU || 0;
}

// HTML Headers
function getHeaderZadankai() {
  return `
    <thead>
      <tr class="header-main">
        <th rowspan="2" class="col-zona">ZADANKAI<br>ZONA</th>
        <th colspan="5" class="col-membri">MEMBRI</th>
        <th colspan="5" class="col-simp">SIMPATIZZANTI</th>
        <th colspan="5" class="col-nuove">OSPITI</th>
        <th colspan="4" class="col-totali">TOTALI</th>
      </tr>
      <tr class="header-sub">
        <th>U</th><th>D</th><th>GU</th><th>GD</th><th>TOT</th>
        <th>U</th><th>D</th><th>GU</th><th>GD</th><th>TOT</th>
        <th>U</th><th>D</th><th>GU</th><th>GD</th><th>Tot</th>
        <th>TOT G.</th><th>VAR</th><th>FUT</th><th>STU</th>
      </tr>
    </thead>
  `;
}

function getHeaderPraticanti() {
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
        <!-- P. Membri -->
        <th>U</th><th>D</th><th>GU</th><th>GD</th><th>Tot</th>
        <!-- P. Simp -->
        <th>U</th><th>D</th><th>GU</th><th>GD</th><th>Tot</th>
      </tr>
    </thead>
  `;
}

function creaRigaZadankai(nome, dati, classeExtra = "") {
  const tr = document.createElement("tr");
  if (classeExtra) tr.className = classeExtra;
  
  // Celle dati
  const celle = [
    nome,
    // Membri
    dati.membri.U, dati.membri.D, dati.membri.GU, dati.membri.GD, dati.membri.Tot,
    // Simp
    dati.simp.U, dati.simp.D, dati.simp.GU, dati.simp.GD, dati.simp.Tot,
    // Ospiti
    dati.ospiti.U, dati.ospiti.D, dati.ospiti.GU, dati.ospiti.GD, dati.ospiti.Tot,
    // Totali
    dati.totG, dati.var, dati.fut, dati.stu
  ];

  celle.forEach((val, i) => {
    const td = document.createElement("td");
    td.textContent = (i === 17 && typeof val === "number" && val > 0) ? `+${val}` : val;
    
    // Gestione colori celle specifiche
    if (i === 0) td.className = "text-start fw-bold cella-nome";
    
    tr.appendChild(td);
  });
  return tr;
}

function creaRigaPraticanti(nome, dati, classeExtra = "") {
  const tr = document.createElement("tr");
  if (classeExtra) tr.className = classeExtra;

  const celle = [
    nome,
    // P. Membri
    dati.membri.U, dati.membri.D, dati.membri.GU, dati.membri.GD, dati.membri.Tot,
    // P. Simp
    dati.simp.U, dati.simp.D, dati.simp.GU, dati.simp.GD, dati.simp.Tot,
    // Totali
    dati.totG, dati.var
  ];

  celle.forEach((val, i) => {
    const td = document.createElement("td");
    td.textContent = (i === 12 && typeof val === "number" && val > 0) ? `+${val}` : val;
    if (i === 0) td.className = "text-start fw-bold cella-nome";
    tr.appendChild(td);
  });
  return tr;
}

function mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo) {
  const contenitoreLista = document.getElementById("gruppi-mancanti");
  contenitoreLista.innerHTML = "";
  const gruppiCapitolo = Object.values(gruppiData["HOMBU 9"][capitolo]).flat();
  const gruppiPresenti = [...new Set(righeFiltrate.map(r => r.gruppo))];
  const gruppiMancanti = gruppiCapitolo.filter(gr => !gruppiPresenti.includes(gr));

  if (gruppiMancanti.length > 0) {
    contenitoreLista.className = "alert alert-warning";
    contenitoreLista.innerHTML = `<strong>Gruppi senza dati:</strong> <ul class="mb-0 list-inline">${gruppiMancanti.map(g => `<li class="list-inline-item"><i class="fas fa-exclamation-triangle text-danger"></i> ${g}</li>`).join('')}</ul>`;
  } else {
    contenitoreLista.className = "alert alert-success";
    contenitoreLista.innerHTML = `<i class="fas fa-check-circle me-2"></i>Tutti i gruppi hanno inserito dati!`;
  }
}

// Funzioni export/print (placeholder - riutilizzare logica esistente se necessario)
function esportaExcel() {
  const wb = XLSX.utils.book_new();
  const tables = containerTabelle.querySelectorAll("table");
  tables.forEach((table, i) => {
    const ws = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, i === 0 ? "Zadankai" : "Praticanti");
  });
  XLSX.writeFile(wb, `Statistica_${filtroCapitolo.value}_${filtroMese.value}_${filtroAnno.value}.xlsx`);
}

function esportaPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'pt', 'a4'); // landscape
  
  const tables = containerTabelle.querySelectorAll("table");
  let y = 40;
  
  doc.text(`Statistica ${filtroCapitolo.value} - ${filtroMese.value} ${filtroAnno.value}`, 40, 30);

  tables.forEach((table) => {
    doc.autoTable({
      html: table,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [255, 193, 7], textColor: 0, fontStyle: 'bold' }
    });
    y = doc.lastAutoTable.finalY + 30;
    if (y > 500) { doc.addPage(); y = 40; }
  });
  
  doc.save(`Statistica_${filtroCapitolo.value}.pdf`);
}

function stampa() {
  window.print();
}

function aggiornaGrafici(righeFiltrate, anno, mese, capitolo, annoPrec, mesePrec) {
  // Implementazione semplificata o placeholder
  // Se necessario, ripristinare la logica originale dei grafici
}
