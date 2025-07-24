// 🔹 Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

// 🔹 Inizializza Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🔹 Riferimenti DOM
const filtroAnno = document.getElementById("filtro-anno");
const filtroMese = document.getElementById("filtro-mese");
const filtroCapitolo = document.getElementById("filtro-capitolo");
const tbody = document.querySelector("#tabella-dati tbody");

const mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

function mesePrecedente(mese, anno) {
  const idx = mesiOrdine.indexOf(mese);
  const nuovoIdx = (idx - 1 + 12) % 12;
  const nuovoAnno = idx === 0 ? String(Number(anno) - 1) : anno;
  return { mese: mesiOrdine[nuovoIdx], anno: nuovoAnno };
}

let righe = [];
let gruppoToCapitolo = {};
let gruppiData; // 🔑 per elenco gruppi capitolo

// 🔹 Carica dati da gruppi.json e Firebase
Promise.all([
  fetch("gruppi.json").then(res => res.json()),
  get(child(ref(db), "zadankai"))
]).then(([data, snapshot]) => {
  gruppiData = data;
  const struttura = gruppiData["HOMBU 9"];
  for (const [capitolo, settori] of Object.entries(struttura)) {
    for (const gruppi of Object.values(settori)) {
      gruppi.forEach(gr => gruppoToCapitolo[gr] = capitolo);
    }
    filtroCapitolo.add(new Option(capitolo, capitolo));
  }

  if (!snapshot.exists()) return;
  const dati = snapshot.val();

  for (const key in dati) {
    const [anno, mese, gruppo] = key.split("-");
    const sezioni = dati[key];

    for (const categoria in sezioni.zadankai) {
      const r = sezioni.zadankai[categoria];
      righe.push({ anno, mese, gruppo, tipo: "ZADANKAI", sezione: categoria,
        U: r.U ?? 0, D: r.D ?? 0, GU: r.GU ?? 0, GD: r.GD ?? 0, FUT: r.FUT ?? 0, STU: r.STU ?? 0 });
    }

    for (const categoria in sezioni.praticanti) {
      const r = sezioni.praticanti[categoria];
      righe.push({ anno, mese, gruppo, tipo: "PRATICANTI", sezione: categoria,
        U: r.U ?? 0, D: r.D ?? 0, GU: r.GU ?? 0, GD: r.GD ?? 0, FUT: 0, STU: 0 });
    }
  }

  [...new Set(righe.map(r => r.anno))].sort().forEach(v => filtroAnno.add(new Option(v, v)));
  const mesiPresenti = [...new Set(righe.map(r => r.mese))];
  mesiOrdine.forEach(m => { if (mesiPresenti.includes(m)) filtroMese.add(new Option(m, m)); });

  [filtroAnno, filtroMese, filtroCapitolo].forEach(f => f.addEventListener("change", aggiornaTabella));
  aggiornaTabella();
});

//#######################################################################################
// FUNZIONI AGGIORNA TABELLA GRUPPI
//#########################################
function aggiornaTabella() {
  tbody.innerHTML = "";
  const anno = filtroAnno.value;
  const mese = filtroMese.value;
  const capitolo = filtroCapitolo.value;
  const { mese: mesePrec, anno: annoPrec } = mesePrecedente(mese, anno);

  const righeFiltrate = righe.filter(r =>
    r.anno === anno &&
    r.mese === mese &&
    gruppoToCapitolo[r.gruppo] === capitolo
  );

  const settorePerGruppo = {};
  const strutturaCapitolo = gruppiData["HOMBU 9"][capitolo];
  for (const [settore, listaGruppi] of Object.entries(strutturaCapitolo)) {
    listaGruppi.forEach(gr => settorePerGruppo[gr] = settore);
  }
  
  const gruppi = [...new Set(righeFiltrate.map(r => r.gruppo))];

  let settoreCorrente = null;
  
  gruppi.forEach(gruppo => {
    const settore = settorePerGruppo[gruppo];
    if (settore !== settoreCorrente) {
      const separatore = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 12;
      td.textContent = `Settore: ${settore}`;
      td.style.textAlign = "center";
      td.style.fontWeight = "bold";
      td.style.backgroundColor = "#eee";
      td.style.borderTop = "4px solid #333";
      td.style.borderBottom = "2px solid #999";
      separatore.appendChild(td);
      tbody.appendChild(separatore);
    
      settoreCorrente = settore;
    }
    
    const righeGruppo = righeFiltrate.filter(r => r.gruppo === gruppo);
    let gruppoStampato = false;
    let tipoStampati = {};
    let totaleStampati = {};
  
    ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
      let righeCategoria = righeGruppo.filter(r => r.tipo === tipo);
  
      if (righeCategoria.length === 0) return;
  
      // 🧩 Ordina sezioni ZADANKAI
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
        tr.style.backgroundColor = tipo === "ZADANKAI" ? "#fff3cd" : "#d1ecf1";
  
        // 👥 Nome Gruppo
        if (!gruppoStampato && index === 0) {
          const tdGruppo = document.createElement("td");
          tdGruppo.textContent = gruppo;
          tdGruppo.rowSpan = righeGruppo.length;
          tdGruppo.style.fontWeight = "bold";
          tdGruppo.style.backgroundColor = "#FFFD55"; 
          tdGruppo.style.borderTop = "3px solid #333"; // ⬆️ Bordo superiore spesso sul nome gruppo
          tr.style.borderTop = "3px solid #333"; // ⬆️ Bordo superiore spesso sul resto della riga
          tr.appendChild(tdGruppo);
          gruppoStampato = true;
        }
  
        // 📦 Categoria
        if (!tipoStampati[tipo]) {
          const tdTipo = document.createElement("td");
          tdTipo.textContent = tipo;
          tdTipo.rowSpan = righeCategoria.length;
          tdTipo.style.borderRight = "2px solid #333";
          tr.appendChild(tdTipo);
          tipoStampati[tipo] = true;
        }
  
        // 📊 Dati ordinati
        const celle = [
          r.sezione, r.U, r.D, r.GU, r.GD,
          somma,
          sommaPrec
        ];
  
        celle.forEach((val, i) => {
          const td = document.createElement("td");
          td.textContent = val;
          if (i === 1) td.style.borderLeft = "2px solid #333";
          if (i === 4) td.style.borderRight = "2px solid #333";
          tr.appendChild(td);
        });
  
        // 📦 Totale categoria (ora prima di Futuro/Studente)
        if (!totaleStampati[tipo]) {
          const tdTot = document.createElement("td");
          tdTot.rowSpan = righeCategoria.length;
          tdTot.innerHTML = `
            <div><strong>${totaleCategoria}</strong></div>
            <div style="font-size:0.9em;">Prec: ${totalePrec}</div>
            <div style="color:${delta >= 0 ? 'green' : 'red'}; font-weight:bold;">
              Δ Tot: ${delta >= 0 ? "+" : ""}${delta}
            </div>`;
          tdTot.style.borderLeft = "2px solid #333";
          tdTot.style.borderRight = "2px solid #333";
          tdTot.style.textAlign = "center";
          tdTot.style.backgroundColor = tipo === "ZADANKAI" ? "#fff3cd" : "#d1ecf1";
          tr.appendChild(tdTot);
          totaleStampati[tipo] = true;
        }
  
        // 🎯 Futuro e Studenti
        const tdFuturo = document.createElement("td");
        tdFuturo.textContent = r.FUT;
        const tdStudenti = document.createElement("td");
        tdStudenti.textContent = r.STU;
        tr.appendChild(tdFuturo);
        tr.appendChild(tdStudenti);
  
        tbody.appendChild(tr);
      });
    });
  });
  //#######################################################################################


  //#######################################################################################
  // FUNZIONI PER GRUPPI MANCANTI
  //#########################################
  // 🔍 Gruppi del capitolo selezionato
  const gruppiCapitolo = Object.values(gruppiData["HOMBU 9"][capitolo]).flat();

  // ✅ Gruppi presenti nei dati per quel mese
  const gruppiPresenti = righeFiltrate.map(r => r.gruppo);
  const gruppiMancanti = gruppiCapitolo.filter(gr => !gruppiPresenti.includes(gr));

  // 📢 Mostra lista ritardatari
  const contenitoreLista = document.getElementById("gruppi-mancanti");
  contenitoreLista.innerHTML = "";

  if (gruppiMancanti.length > 0) {
    const ul = document.createElement("ul");
    gruppiMancanti.forEach(gr => {
      const li = document.createElement("li");
      li.textContent = `🔴 ${gr}`;
      ul.appendChild(li);
    });
    contenitoreLista.innerHTML = `<strong>Gruppi senza dati per ${mese} ${anno}:</strong>`;
    contenitoreLista.appendChild(ul);
  } else {
    contenitoreLista.textContent = "✅ Tutti i gruppi del capitolo hanno inserito dati!";
  }
  //#######################################################################################
  generaRiepiloghiCapitoloESettori(righeFiltrate, mese, anno, mesePrec, annoPrec, capitolo);

  //#######################################################################################
  // FUNZIONI PER RIEPILOGO SETTORI E CAPITOLO
  //############################################
  function generaRiepiloghiCapitoloESettori(righeFiltrate, mese, anno, mesePrec, annoPrec, capitolo) {
    const contenitore = document.getElementById("riepilogo-capitolo");
    contenitore.innerHTML = "";
  
    const struttura = gruppiData["HOMBU 9"][capitolo];
    const settori = Object.entries(struttura);
  
    settori.forEach(([settore, gruppiSettore]) => {
      const righeSettore = righeFiltrate.filter(r => gruppiSettore.includes(r.gruppo));
      if (righeSettore.length === 0) return;
  
      const tabella = document.createElement("table");
      tabella.className = "riepilogo";
      tabella.style.marginTop = "2em";
  
      const intestazione = document.createElement("caption");
      intestazione.textContent = `Riepilogo ${settore}`;
      intestazione.style.fontWeight = "bold";
      tabella.appendChild(intestazione);
  
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
          tr.style.backgroundColor = tipo === "ZADANKAI" ? "#e1f5fe" : "#fff8dc";
  
          if (index === 0) {
            const tdTipo = document.createElement("td");
            tdTipo.textContent = tipo;
            tdTipo.rowSpan = tipoRowSpan;
            tdTipo.style.borderRight = "2px solid #333";
            tdTipo.style.fontWeight = "bold";
            tdTipo.style.backgroundColor = tipo === "ZADANKAI" ? "#d1ecf1" : "#fff3cd";
            tr.appendChild(tdTipo);
          }
  
          const celle = [
            sezione, sum.U, sum.D, sum.GU, sum.GD,
            sommaTot, sommaPrec
          ];
          celle.forEach(val => {
            const td = document.createElement("td");
            td.textContent = val;
            tr.appendChild(td);
          });
  
          if (index === 0) {
            const tdTot = document.createElement("td");
            tdTot.rowSpan = tipoRowSpan;
            tdTot.innerHTML = `
              <div><strong>${totaleMese}</strong></div>
              <div style="font-size:0.9em;">Prec: ${totalePrec}</div>
              <div style="color:${delta >= 0 ? 'green' : 'red'}; font-weight:bold;">
                Δ Tot: ${delta >= 0 ? "+" : ""}${delta}
              </div>`;
            tdTot.style.textAlign = "center";
            tdTot.style.backgroundColor = tipo === "ZADANKAI" ? "#d1ecf1" : "#fff3cd";
            tr.appendChild(tdTot);
          }
  
          const tdFUT = document.createElement("td");
          tdFUT.textContent = sum.FUT;
          const tdSTU = document.createElement("td");
          tdSTU.textContent = sum.STU;
          tr.appendChild(tdFUT);
          tr.appendChild(tdSTU);
  
          tbody.appendChild(tr);
        });
      });
  
      tabella.appendChild(tbody);
      contenitore.appendChild(tabella);
    });
      // 🔷 Riepilogo Capitolo
    const tabellaCap = document.createElement("table");
    tabellaCap.className = "riepilogo";
    tabellaCap.style.marginTop = "2em";
  
    const intestazioneCap = document.createElement("caption");
    intestazioneCap.textContent = `Totale ${capitolo}`;
    intestazioneCap.style.fontWeight = "bold";
    tabellaCap.appendChild(intestazioneCap);
  
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
        tr.style.backgroundColor = tipo === "ZADANKAI" ? "#d1ecf1" : "#fff3cd";
  
        if (index === 0) {
          const tdTipo = document.createElement("td");
          tdTipo.textContent = tipo;
          tdTipo.rowSpan = tipoRowSpan;
          tdTipo.style.borderRight = "2px solid #333";
          tdTipo.style.fontWeight = "bold";
          tdTipo.style.backgroundColor = tipo === "ZADANKAI" ? "#d1ecf1" : "#fff3cd";
          tr.appendChild(tdTipo);
        }
  
        const celle = [
          sezione, sum.U, sum.D, sum.GU, sum.GD,
          sommaTot, sommaPrec
        ];
        celle.forEach((val, i) => {
          const td = document.createElement("td");
          td.textContent = val;
          if (i === 0 || i === 1) td.style.borderLeft = "2px solid #333";
          if (i === 4) td.style.borderRight = "2px solid #333";
          tr.appendChild(td);
        });

  
        if (index === 0) {
          const tdTot = document.createElement("td");
          tdTot.rowSpan = tipoRowSpan;
          tdTot.innerHTML = `
            <div><strong>${totaleMese}</strong></div>
            <div style="font-size:0.9em;">Prec: ${totalePrec}</div>
            <div style="color:${delta >= 0 ? 'green' : 'red'}; font-weight:bold;">
              Δ Tot: ${delta >= 0 ? "+" : ""}${delta}
            </div>`;
          tdTot.style.textAlign = "center";
          tdTot.style.backgroundColor = tipo === "ZADANKAI" ? "#cbe8f6" : "#fff1b3";
          tdTot.style.borderLeft = "2px solid #333";
          tdTot.style.borderRight = "2px solid #333";
          tr.appendChild(tdTot);
        }
  
        const tdFUT = document.createElement("td");
        tdFUT.textContent = sum.FUT;
        const tdSTU = document.createElement("td");
        tdSTU.textContent = sum.STU;
        tr.appendChild(tdFUT);
        tr.appendChild(tdSTU);
  
        tbodyCap.appendChild(tr);
      });
    });
  
    tabellaCap.appendChild(tbodyCap);
    contenitore.appendChild(tabellaCap);
  }
  

  
}
