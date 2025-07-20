import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const filtroAnno = document.getElementById("filtro-anno");
const filtroMese = document.getElementById("filtro-mese");
const filtroCapitolo = document.getElementById("filtro-capitolo");
const tbody = document.querySelector("#tabella-dati tbody");

const mesiOrdine = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

function mesePrecedente(mese, anno) {
  const index = mesiOrdine.indexOf(mese);
  if (index === -1) return { mese: null, anno: null };
  const nuovoIndex = (index - 1 + 12) % 12;
  const nuovoAnno = index === 0 ? String(Number(anno) - 1) : anno;
  return { mese: mesiOrdine[nuovoIndex], anno: nuovoAnno };
}

let gruppoToCapitolo = {};
let righe = [];

Promise.all([
  fetch("gruppi.json").then(res => res.json()),
  get(child(ref(db), "zadankai"))
]).then(([gruppiData, snapshot]) => {
  const struttura = gruppiData["HOMBU 9"];
  for (const [capitolo, settori] of Object.entries(struttura)) {
    for (const gruppi of Object.values(settori)) {
      gruppi.forEach(gr => {
        gruppoToCapitolo[gr] = capitolo;
      });
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
      righe.push({
        anno, mese, gruppo, tipo: "ZADANKAI", sezione: categoria,
        U: r.U ?? 0, D: r.D ?? 0, GU: r.GU ?? 0, GD: r.GD ?? 0,
        FUT: r.FUT ?? 0, STU: r.STU ?? 0
      });
    }

    for (const categoria in sezioni.praticanti) {
      const r = sezioni.praticanti[categoria];
      righe.push({
        anno, mese, gruppo, tipo: "PRATICANTI", sezione: categoria,
        U: r.U ?? 0, D: r.D ?? 0, GU: r.GU ?? 0, GD: r.GD ?? 0,
        FUT: 0, STU: 0
      });
    }
  }

  [...new Set(righe.map(r => r.anno))].sort().forEach(v => filtroAnno.add(new Option(v, v)));
  mesiOrdine.forEach(mese => {
    if (righe.some(r => r.mese === mese)) {
      filtroMese.add(new Option(mese, mese));
    }
  });

  [filtroAnno, filtroMese, filtroCapitolo].forEach(f =>
    f.addEventListener("change", aggiornaTabella)
  );

  aggiornaTabella();
});

function aggiornaTabella() {
  tbody.innerHTML = "";

  const capitolo = filtroCapitolo.value;
  const anno = filtroAnno.value;
  const mese = filtroMese.value;

  // Filtra tutti i gruppi del capitolo selezionato
  const gruppiValidi = Object.entries(gruppoToCapitolo)
    .filter(([gruppo, cap]) => cap === capitolo)
    .map(([gruppo]) => gruppo);

  // Filtra tutte le righe che corrispondono ad anno, mese e gruppo
  const righeFiltrate = righe.filter(r =>
    r.anno === anno &&
    r.mese === mese &&
    gruppiValidi.includes(r.gruppo)
  );

  if (righeFiltrate.length === 0) {
    tbody.innerHTML = `<tr><td colspan="15">Nessun dato disponibile per ${mese} ${anno} nel capitolo "${capitolo}".</td></tr>`;
    return;
  }

  // ✅ Ricostruisci la tabella usando solo righe valide
  const gruppi = [...new Set(righeFiltrate.map(r => r.gruppo))];

  gruppi.forEach(gruppo => {
    const righeGruppo = righeFiltrate.filter(r => r.gruppo === gruppo);
    const categorie = ["ZADANKAI", "PRATICANTI"];
    let gruppoStampato = false;

    categorie.forEach(categoria => {
      const righeCategoria = righeGruppo.filter(r => r.tipo === categoria);
      if (righeCategoria.length === 0) return;

      let categoriaStampata = false;

      righeCategoria.forEach((r, index) => {
        const somma = r.U + r.D + r.GU + r.GD;

        const { mese: mesePrec, anno: annoPrec } = mesePrecedente(r.mese, r.anno);
        const prec = righe.find(x =>
          x.anno === annoPrec &&
          x.mese === mesePrec &&
          x.gruppo === r.gruppo &&
          x.tipo === r.tipo &&
          x.sezione === r.sezione
        );

        const sommaPrec = prec ? prec.U + prec.D + prec.GU + prec.GD : 0;
        const delta = somma - sommaPrec;

        const tr = document.createElement("tr");

        if (!gruppoStampato) {
          const td = document.createElement("td");
          td.textContent = gruppo;
          td.rowSpan = righeGruppo.length;
          tr.appendChild(td);
          gruppoStampato = true;
        }

        if (!categoriaStampata) {
          const td = document.createElement("td");
          td.textContent = categoria;
          td.rowSpan = righeCategoria.length;
          tr.appendChild(td);
          categoriaStampata = true;
        }

        const celle = [
          r.sezione,
          r.U,
          r.D,
          r.GU,
          r.GD,
          somma,
          sommaPrec,
          delta >= 0 ? "+" + delta : delta,
          r.FUT,
          r.STU
        ];

        celle.forEach((val, i) => {
          const td = document.createElement("td");
          td.textContent = val;
          if (i === 7) td.style.color = val.startsWith("+") ? "green" : "red";
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });
    });
  });
}

