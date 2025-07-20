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

// 🔹 Carica dati da gruppi.json e Firebase
Promise.all([
  fetch("gruppi.json").then(res => res.json()),
  get(child(ref(db), "zadankai"))
]).then(([gruppiData, snapshot]) => {
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

function aggiornaTabella() {
  tbody.innerHTML = "";
  const anno = filtroAnno.value;
  const mese = filtroMese.value;
  const capitolo = filtroCapitolo.value;
  const { mese: mesePrec, anno: annoPrec } = mesePrecedente(mese, anno);

  const righeFiltrate = righe.filter(r =>
    r.anno === anno && r.mese === mese &&
    gruppoToCapitolo[r.gruppo] === capitolo
  );

  const gruppi = [...new Set(righeFiltrate.map(r => r.gruppo))];

  gruppi.forEach(gruppo => {
    const righeGruppo = righeFiltrate.filter(r => r.gruppo === gruppo);

    ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
      const righeCategoria = righeGruppo.filter(r => r.tipo === tipo);
      if (righeCategoria.length === 0) return;

      const totaleCategoria = righeCategoria.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
      const righePrec = righe.filter(r =>
        r.anno === annoPrec && r.mese === mesePrec && r.gruppo === gruppo && r.tipo === tipo
      );
      const totalePrec = righePrec.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
      const delta = totaleCategoria - totalePrec;

      let categoriaStampata = false;
      let gruppoStampato = false;
      let totaleStampato = false;

      righeCategoria.forEach((r, index) => {
        const somma = r.U + r.D + r.GU + r.GD;
        const tr = document.createElement("tr");

        if (!gruppoStampato) {
          const tdGruppo = document.createElement("td");
          tdGruppo.textContent = gruppo;
          tdGruppo.rowSpan = righeGruppo.length;
          tdGruppo.style.fontWeight = "bold";
          tr.appendChild(tdGruppo);
          gruppoStampato = true;
        }

        if (!categoriaStampata) {
          const tdTipo = document.createElement("td");
          tdTipo.textContent = tipo;
          tdTipo.rowSpan = righeCategoria.length;
          tdTipo.style.borderRight = "3px solid #333";
          tr.appendChild(tdTipo);
          categoriaStampata = true;
        }

        const celle = [r.sezione, r.U, r.D, r.GU, r.GD, somma, r.FUT, r.STU];
        celle.forEach((val, i) => {
          const td = document.createElement("td");
          td.textContent = val;
          if (i === 1) td.style.borderLeft = "3px solid #333";
          if (i === 4) td.style.borderRight = "3px solid #333";
          tr.appendChild(td);
        });

        if (!totaleStampato) {
          const tdTot = document.createElement("td");
          tdTot.rowSpan = righeCategoria.length;
          tdTot.innerHTML = `
            <div><strong>${totaleCategoria}</strong></div>
            <div style="font-size:0.9em;">Prec: ${totalePrec}</div>
            <div style="color:${delta >= 0 ? 'green' : 'red'}; font-weight:bold;">
              Δ Tot: ${delta >= 0 ? "+" : ""}${delta}
            </div>`;
          tdTot.style.backgroundColor = "#fff3cd";
          tdTot.style.borderLeft = "3px solid #333";
          tdTot.style.borderRight = "3px solid #333";
          tdTot.style.textAlign = "center";
          tr.appendChild(tdTot);
          totaleStampato = true;
        }

        tbody.appendChild(tr);
      });
    });
  });
}
