// 🔹 Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

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
    color: "#EE8AF8"
  },
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
const filtroLivello = document.getElementById("filtro-livello");
const filtroCapitolo = document.getElementById("filtro-capitolo");
const filtroCapitoloContainer = document.getElementById("filtro-capitolo-container");
const contenitoreRiepiloghi = document.getElementById("contenitore-riepiloghi");
const btnExportExcel = document.getElementById("btn-export-excel");
const btnExportPdf = document.getElementById("btn-export-pdf");
const btnPrint = document.getElementById("btn-print");

const mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

// Variabili globali
let righe = [];
let gruppoToCapitolo = {};
let gruppiData;

function mesePrecedente(mese, anno) {
  const idx = mesiOrdine.indexOf(mese);
  return idx === 0 ? { mese: "Dicembre", anno: anno - 1 } : { mese: mesiOrdine[idx - 1], anno };
}

async function caricaDati() {
  try {
    console.log("Inizio caricamento dati...");
    const snapshot = await get(child(ref(db), '/'));
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log("Dati caricati:", data);
      
      // Carica dati gruppi - CORREZIONE: usa la struttura reale
      gruppiData = data.gruppi || data; // Prova prima 'gruppi', poi i dati root
      console.log("Gruppi data:", gruppiData);
      
      // Costruisci mappa gruppo -> capitolo
      Object.entries(gruppiData["HOMBU 9"] || {}).forEach(([capitolo, settori]) => {
        Object.values(settori).forEach(gruppiSettore => {
          gruppiSettore.forEach(gruppo => {
            gruppoToCapitolo[gruppo] = capitolo;
          });
        });
      });
      
      // Carica dati statistici - CORREZIONE: usa la struttura reale
      righe = [];
      const datiStatistici = data.dati || data.zadankai || data;
      console.log("Dati statistici grezzi:", datiStatistici);
      
      // Se i dati sono sotto 'zadankai', adatta la struttura
      if (data.zadankai) {
        Object.entries(data.zadankai).forEach(([anno, mesi]) => {
          Object.entries(mesi).forEach(([mese, gruppi]) => {
            Object.entries(gruppi).forEach(([gruppo, tipi]) => {
              Object.entries(tipi).forEach(([tipo, sezioni]) => {
                Object.entries(sezioni).forEach(([sezione, valori]) => {
                  righe.push({
                    anno: parseInt(anno),
                    mese,
                    gruppo,
                    tipo,
                    sezione,
                    U: valori.U || 0,
                    D: valori.D || 0,
                    GU: valori.GU || 0,
                    GD: valori.GD || 0,
                    FUT: valori.FUT || 0,
                    STU: valori.STU || 0
                  });
                });
              });
            });
          });
        });
      } else {
        // Struttura originale
        Object.entries(datiStatistici || {}).forEach(([anno, mesi]) => {
          Object.entries(mesi).forEach(([mese, gruppi]) => {
            Object.entries(gruppi).forEach(([gruppo, tipi]) => {
              Object.entries(tipi).forEach(([tipo, sezioni]) => {
                Object.entries(sezioni).forEach(([sezione, valori]) => {
                  righe.push({
                    anno: parseInt(anno),
                    mese,
                    gruppo,
                    tipo,
                    sezione,
                    U: valori.U || 0,
                    D: valori.D || 0,
                    GU: valori.GU || 0,
                    GD: valori.GD || 0,
                    FUT: valori.FUT || 0,
                    STU: valori.STU || 0
                  });
                });
              });
            });
          });
        });
      }
      
      console.log("Righe caricate:", righe.length, righe);
      
      inizializzaFiltri();
      aggiornaRiepiloghi();
    } else {
      console.log("Nessun dato trovato nel database");
    }
  } catch (error) {
    console.error("Errore nel caricamento dati:", error);
  }
}

function inizializzaFiltri() {
  // Popola anni
  const anni = [...new Set(righe.map(r => r.anno))].sort((a, b) => b - a);
  filtroAnno.innerHTML = anni.map(anno => `<option value="${anno}">${anno}</option>`).join("");
  
  // Popola mesi
  filtroMese.innerHTML = mesiOrdine.map(mese => `<option value="${mese}">${mese}</option>`).join("");
  
  // Popola capitoli
  const capitoli = Object.keys(gruppiData["HOMBU 9"] || {});
  filtroCapitolo.innerHTML = capitoli.map(cap => `<option value="${cap}">${cap}</option>`).join("");
  
  // Event listeners
  filtroAnno.addEventListener("change", aggiornaRiepiloghi);
  filtroMese.addEventListener("change", aggiornaRiepiloghi);
  filtroLivello.addEventListener("change", () => {
    const livello = filtroLivello.value;
    filtroCapitoloContainer.style.display = livello === "settori" ? "block" : "none";
    aggiornaRiepiloghi();
  });
  filtroCapitolo.addEventListener("change", aggiornaRiepiloghi);
}

function aggiornaRiepiloghi() {
  const anno = parseInt(filtroAnno.value);
  const mese = filtroMese.value;
  const livello = filtroLivello.value;
  const capitolo = filtroCapitolo.value;
  
  const { mese: mesePrec, anno: annoPrec } = mesePrecedente(mese, anno);
  
  contenitoreRiepiloghi.innerHTML = "";
  
  switch (livello) {
    case "hombu":
      generaRiepilogoHombu(anno, mese, annoPrec, mesePrec);
      break;
    case "capitoli":
      generaRiepiloghiCapitoli(anno, mese, annoPrec, mesePrec);
      break;
    case "settori":
      generaRiepiloghiSettori(anno, mese, annoPrec, mesePrec, capitolo);
      break;
  }
}

function generaRiepilogoHombu(anno, mese, annoPrec, mesePrec) {
  const righeFiltrate = righe.filter(r => r.anno === anno && r.mese === mese);
  
  const card = document.createElement("div");
  card.className = "card shadow-sm mb-4";
  
  const cardHeader = document.createElement("div");
  cardHeader.className = "card-header bg-success text-white";
  cardHeader.innerHTML = `<h4 class="mb-0"><i class="fas fa-building me-2"></i>Riepilogo Generale HOMBU 9 - ${mese} ${anno}</h4>`;
  card.appendChild(cardHeader);
  
  const cardBody = document.createElement("div");
  cardBody.className = "card-body table-responsive";
  
  const tabella = creaTabella(righeFiltrate, annoPrec, mesePrec, "hombu");
  cardBody.appendChild(tabella);
  card.appendChild(cardBody);
  contenitoreRiepiloghi.appendChild(card);
}

function generaRiepiloghiCapitoli(anno, mese, annoPrec, mesePrec) {
  const capitoli = Object.keys(gruppiData["HOMBU 9"] || {});
  
  capitoli.forEach(capitolo => {
    const righeFiltrate = righe.filter(r => 
      r.anno === anno && r.mese === mese && gruppoToCapitolo[r.gruppo] === capitolo
    );
    
    if (righeFiltrate.length === 0) return;
    
    const card = document.createElement("div");
    card.className = "card shadow-sm mb-4";
    
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header bg-primary text-white";
    cardHeader.innerHTML = `<h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Riepilogo: ${capitolo}</h5>`;
    card.appendChild(cardHeader);
    
    const cardBody = document.createElement("div");
    cardBody.className = "card-body table-responsive";
    
    const tabella = creaTabella(righeFiltrate, annoPrec, mesePrec, "capitolo", capitolo);
    cardBody.appendChild(tabella);
    card.appendChild(cardBody);
    contenitoreRiepiloghi.appendChild(card);
  });
}

function generaRiepiloghiSettori(anno, mese, annoPrec, mesePrec, capitolo) {
  const struttura = gruppiData["HOMBU 9"][capitolo];
  const settori = Object.entries(struttura);
  
  settori.forEach(([settore, gruppiSettore]) => {
    const righeFiltrate = righe.filter(r => 
      r.anno === anno && r.mese === mese && gruppiSettore.includes(r.gruppo)
    );
    
    if (righeFiltrate.length === 0) return;
    
    const card = document.createElement("div");
    card.className = "card shadow-sm mb-4";
    
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header bg-warning text-dark";
    cardHeader.innerHTML = `<h5 class="mb-0"><i class="fas fa-chart-pie me-2"></i>Riepilogo: ${settore} (${capitolo})</h5>`;
    card.appendChild(cardHeader);
    
    const cardBody = document.createElement("div");
    cardBody.className = "card-body table-responsive";
    
    const tabella = creaTabella(righeFiltrate, annoPrec, mesePrec, "settore", settore, gruppiSettore);
    cardBody.appendChild(tabella);
    card.appendChild(cardBody);
    contenitoreRiepiloghi.appendChild(card);
  });
}

function creaTabella(righeFiltrate, annoPrec, mesePrec, tipo, nome = "", gruppiSettore = null) {
  const tabella = document.createElement("table");
  tabella.className = "table table-striped table-bordered";
  
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr>
    <th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th>
    <th>Somma</th><th>Prec.</th><th>Totale Gruppi</th><th>Futuro</th><th>Studenti</th>
  </tr>`;
  tabella.appendChild(thead);
  
  const tbody = document.createElement("tbody");
  
  ["ZADANKAI", "PRATICANTI"].forEach(categoria => {
    const righeTipo = righeFiltrate.filter(r => r.tipo === categoria);
    if (righeTipo.length === 0) return;
    
    const sezioni = [...new Set(righeTipo.map(r => r.sezione))];
    if (categoria === "ZADANKAI") {
      const ordine = ["membri", "simpatizzanti", "ospiti"];
      sezioni.sort((a, b) => ordine.indexOf(a) - ordine.indexOf(b));
    }
    
    const tipoRowSpan = sezioni.length;
    const sezioniRilevanti = categoria === "ZADANKAI"
      ? ["membri", "simpatizzanti", "ospiti"]
      : ["membri", "simpatizzanti"];
    
    const righeTotali = righeTipo.filter(r => sezioniRilevanti.includes(r.sezione));
    const sumTot = righeTotali.reduce((acc, r) => ({
      U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
      GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
    }), {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
    const totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
    
    // Calcola totale precedente
    let righePrecTot;
    if (tipo === "hombu") {
      righePrecTot = righe.filter(r =>
        r.anno === annoPrec && r.mese === mesePrec &&
        r.tipo === categoria &&
        sezioniRilevanti.includes(r.sezione)
      );
    } else if (tipo === "capitolo") {
      righePrecTot = righe.filter(r =>
        r.anno === annoPrec && r.mese === mesePrec &&
        r.tipo === categoria &&
        sezioniRilevanti.includes(r.sezione) &&
        gruppoToCapitolo[r.gruppo] === nome
      );
    } else { // settore
      righePrecTot = righe.filter(r =>
        r.anno === annoPrec && r.mese === mesePrec &&
        r.tipo === categoria &&
        sezioniRilevanti.includes(r.sezione) &&
        gruppiSettore.includes(r.gruppo)
      );
    }
    
    const totalePrec = righePrecTot.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
    const delta = totaleMese - totalePrec;
    
    sezioni.forEach((sezione, index) => {
      const righeSezione = righeTipo.filter(r => r.sezione === sezione);
      const sum = righeSezione.reduce((acc, r) => ({
        U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
        GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
      }), {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
      const sommaTot = sum.U + sum.D + sum.GU + sum.GD;
      
      // Calcola precedente per sezione
      let righePrec;
      if (tipo === "hombu") {
        righePrec = righe.filter(r =>
          r.anno === annoPrec && r.mese === mesePrec &&
          r.tipo === categoria && r.sezione === sezione
        );
      } else if (tipo === "capitolo") {
        righePrec = righe.filter(r =>
          r.anno === annoPrec && r.mese === mesePrec &&
          r.tipo === categoria && r.sezione === sezione &&
          gruppoToCapitolo[r.gruppo] === nome
        );
      } else { // settore
        righePrec = righe.filter(r =>
          r.anno === annoPrec && r.mese === mesePrec &&
          r.tipo === categoria && r.sezione === sezione &&
          gruppiSettore.includes(r.gruppo)
        );
      }
      
      const sommaPrec = righePrec.reduce((acc, r) =>
        acc + r.U + r.D + r.GU + r.GD, 0);
      
      const tr = document.createElement("tr");
      tr.className = categoria === "ZADANKAI" ? "table-warning" : "table-info";
      
      if (index === 0) {
        const tdTipo = document.createElement("td");
        tdTipo.textContent = categoria;
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
        if (i === 1) { // U
          td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        } else if (i === 5) { // Somma
          td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          td.style.fontWeight = "bold";
        }
        tr.appendChild(td);
      });
      
      if (index === 0) {
        const tdTot = document.createElement("td");
        tdTot.rowSpan = tipoRowSpan;
        tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        tdTot.innerHTML = `
          <div style="font-size: 1.2em;"><strong>${totaleMese}</strong></div>
          <div class="small">Prec: ${totalePrec}</div>
          <div class="${delta >= 0 ? 'text-success' : 'text-danger'} fw-bold">
            Δ ${delta >= 0 ? "+" : ""}${delta}
          </div>`;
        tdTot.className = "text-center";
        tr.appendChild(tdTot);
      }
      
      const tdFUT = document.createElement("td");
      tdFUT.textContent = sum.FUT;
      tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
      const tdSTU = document.createElement("td");
      tdSTU.textContent = sum.STU;
      tr.appendChild(tdFUT);
      tr.appendChild(tdSTU);
      
      tbody.appendChild(tr);
    });
  });
  
  tabella.appendChild(tbody);
  return tabella;
}

function esportaExcel() {
  // Implementazione esportazione Excel
  console.log("Esportazione Excel non ancora implementata");
}

function esportaPdf() {
  // Implementazione esportazione PDF
  console.log("Esportazione PDF non ancora implementata");
}

function stampa() {
  window.print();
}

function logout() {
  const auth = getAuth();
  signOut(auth).then(() => {
    window.location.href = "login.html";
  }).catch((error) => {
    console.error("Errore durante il logout:", error);
  });
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth();
  onAuthStateChanged(auth, (user) => {
    if (user) {
      caricaDati();
    } else {
      window.location.href = "login.html";
    }
  });
  
  btnExportExcel.addEventListener("click", esportaExcel);
  btnExportPdf.addEventListener("click", esportaPdf);
  btnPrint.addEventListener("click", stampa);
  document.getElementById("logoutBtn").addEventListener("click", logout);
});
