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

  //----------------Crea le tabelle dei gruppi
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
        const tr = document.createElement("tr");
  
        tr.classList.add("riga-gruppo");
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
  
        tr.innerHTML += `
          <td>${r.sezione}</td>
          <td>${r.U}</td>
          <td>${r.D}</td>
          <td>${r.GU}</td>
          <td>${r.GD}</td>
          <td>${somma}</td>
          <td>${somma}</td>
          <td>${r.FUT}</td>
          <td>${r.STU}</td>
        `;
        tbody.appendChild(tr);
      });
    });
  });
  //----------------------------------------------

}
