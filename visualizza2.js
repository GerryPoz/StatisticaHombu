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

  const gruppi = Object.keys(gruppoToCapitolo).filter(g => gruppoToCapitolo[g] === capitolo);

  gruppi.forEach(gruppo => {
    const righeGruppo = righe.filter(r =>
      r.gruppo === gruppo &&
      (!anno || r.anno === anno) &&
      (!mese || r.mese === mese)
    );

    if (righeGruppo.length === 0) return;

    const categorie = ["ZADANKAI", "PRATICANTI"];
    let gruppoStampato = false;

    categorie.forEach(categoria => {
      const righeCategoria = righeGruppo.filter(r => r.tipo === categoria);
      if (righeCategoria.length === 0) return;

      let categoriaStampata = false;

      righeCategoria.forEach((r, index) => {
        const somma = r.U + r.D + r.GU + r.GD;

        const { mese: mesePrec, anno: annoPrec } = mesePrecedente(mese, anno);
        const righePrec = righe.filter(x =>
          x.anno === annoPrec &&
          x.mese === mesePrec &&
          x.gruppo === r.gruppo &&
          x.tipo === r.tipo &&
          x.sezione === r.sezione
        );

        const rPrec = righePrec[0];
        const sommaPrec = rPrec ? rPrec.U + rPrec.D + rPrec.GU + rPrec.GD : 0;
        const totalePrec = sommaPrec;
        const deltaSomma = somma - sommaPrec;
        const deltaTotale = somma - totalePrec;

        const tr = document.createElement("tr");
        tr.classList.add(categoria.toLowerCase());
        if (!gruppoStampato) tr.classList.add("inizio-gruppo");
        if (!categoriaStampata) tr.classList.add("inizio-categoria");

        if (!gruppoStampato) {
          tr.innerHTML += `<td rowspan="${righeGruppo.length}" class="nome-gruppo">${gruppo}</td>`;
          gruppoStampato = true;
        }

        if (!categoriaStampata) {
          tr.innerHTML += `<td rowspan="${righeCategoria.length}" class="categoria">${categoria}</td>`;
          categoriaStampata = true;
        }

        const celle = [
          r.sezione,
          r.U,
          r.D,
          r.GU,
          r.GD,
          somma,
          somma,
          sommaPrec,
          totalePrec,
          deltaSomma >= 0 ? "+" + deltaSomma : deltaSomma,
          deltaTotale >= 0 ? "+" + deltaTotale : deltaTotale,
          r.FUT,
          r.STU
        ];
        
        celle.forEach((val, i) => {
          const td = document.createElement("td");
          td.textContent = val;
        
          // Bordo sinistro spesso per colonna U (seconda cella in questo array)
          //if (i === 1) {
          //  td.style.borderLeft = "3px solid #333";
          //}
        
          // Bordo destro spesso per GD, Totale, Totale mese prec., Δ Totale
          if ([1, 5, 7, 9, 11].includes(i)) {
            td.style.borderLeft = "2px solid #333";
          }
        
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });
    });
  });
}
