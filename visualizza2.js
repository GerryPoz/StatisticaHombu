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

  const mesiPresenti = [...new Set(righe.map(r => r.mese))];
  mesiOrdine.forEach(mese => {
    if (mesiPresenti.includes(mese)) {
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

  const gruppiValidi = Object.entries(gruppoToCapitolo)
    .filter(([gruppo, cap]) => cap === capitolo)
    .map(([gruppo]) => gruppo);

  const righeFiltrate = righe.filter(r =>
    r.anno === anno &&
    r.mese === mese &&
    gruppiValidi.includes(r.gruppo)
  );

  const gruppi = [...new Set(righeFiltrate.map(r => r.gruppo))];

  gruppi.forEach(gruppo => {
    const righeGruppo = righeFiltrate.filter(r => r.gruppo === gruppo);
    const { mese: mesePrec, anno: annoPrec } = mesePrecedente(mese, anno);
    let gruppoStampato = false;

    ["ZADANKAI", "PRATICANTI"].forEach(tipo => {
      const righeCategoria = righeGruppo.filter(r => r.tipo === tipo);
      if (righeCategoria.length === 0) return;

      const totaleCategoria = righeCategoria.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
      const righePrecCat = righe.filter(r =>
        r.anno === annoPrec &&
        r.mese === mesePrec &&
        r.gruppo === gruppo &&
        r.tipo === tipo
      );
      const totalePrecCat = righePrecCat.reduce((acc, r) => acc + r.U + r.D + r.GU + r.GD, 0);
      const deltaTotCat = totaleCategoria - totalePrecCat;

      let categoriaStampata = false;
      let totaleStampato = false;

      righeCategoria.forEach((r, index) => {
        const somma = r.U + r.D + r.GU + r.GD;
        const rPrec = righe.find(x =>
          x.anno === annoPrec &&
          x.mese === mesePrec &&
          x.gruppo === r.gruppo &&
          x.tipo === r.tipo &&
          x.sezione === r.sezione
        );

        const sommaPrec = rPrec ? rPrec.U + rPrec.D + rPrec.GU + rPrec.GD : 0;
        const deltaSomma = somma - sommaPrec;

        const tr = document.createElement("tr");

        if (!gruppoStampato) {
          const tdGruppo = document.createElement("td");
          tdGruppo.textContent = gruppo;
          tdGruppo.rowSpan = righeGruppo.length;
          tr.appendChild(tdGruppo);
          gruppoStampato = true;
        }

        if (!categoriaStampata) {
          const tdCategoria = document.createElement("td");
          tdCategoria.textContent = tipo;
          tdCategoria.rowSpan = righeCategoria.length;
          tr.appendChild(tdCategoria);
          categoriaStampata = true;
        }

        const celle = [
          r.sezione, r.U, r.D, r.GU, r.GD,
          somma, sommaPrec,
          deltaSomma >= 0 ? "+" + deltaSomma : deltaSomma,
          r.FUT, r.STU
        ];

        celle.forEach((val, i) => {
          const td = document.createElement("td");
          td.textContent = val;

          if (i === 1) td.style.borderLeft = "3px solid #333";
          if ([4, 5, 6, 7].includes(i)) td.style.borderRight = "3px solid #333";
          if (i === 7) td.style.color = val.startsWith("+") ? "green" : "red";

          tr.appendChild(td);

          if (!totaleStampato && i === 5) {
            const tdTotCat = document.createElement("td");
            tdTotCat.rowSpan = righeCategoria.length;
            tdTotCat.innerHTML = `
              <div><strong>${totaleCategoria}</strong></div>
              <div style="font-size:0.9em;">Prec: ${totalePrecCat}</div>
              <div style="color:${deltaTotCat >= 0 ? 'green' : 'red'};
                          font-weight:bold;">
                Δ Tot: ${deltaTotCat >= 0 ? "+" : ""}${deltaTotCat}
              </div>
            `;
            tdTotCat.style.backgroundColor = "#fff3cd";
            tdTotCat.style.borderLeft = "3px solid #333";
            tdTotCat.style.borderRight = "3px solid #333";
            tdTotCat.style.textAlign = "center";
            tr.appendChild(tdTotCat);
            totaleStampato = true;
          }
        });

        tbody.appendChild(tr);
      });
    });
  });
}
