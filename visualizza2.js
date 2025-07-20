import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const filtroAnno = document.getElementById("filtro-anno");
const filtroMese = document.getElementById("filtro-mese");
const tbody = document.querySelector("#tabella-dati tbody");

const mesiOrdine = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

let righe = [];

get(child(ref(db), "zadankai")).then(snapshot => {
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

  // Popola filtro anno/mese
  [...new Set(righe.map(r => r.anno))].sort().forEach(v => filtroAnno.add(new Option(v, v)));

  const mesiPresenti = [...new Set(righe.map(r => r.mese))];
  mesiOrdine.forEach(m => {
    if (mesiPresenti.includes(m)) {
      filtroMese.add(new Option(m, m));
    }
  });

  filtroAnno.addEventListener("change", aggiornaTabella);
  filtroMese.addEventListener("change", aggiornaTabella);
  aggiornaTabella();
});

function aggiornaTabella() {
  tbody.innerHTML = "";

  const anno = filtroAnno.value;
  const mese = filtroMese.value;

  const righeFiltrate = righe.filter(r => r.anno === anno && r.mese === mese);
  if (righeFiltrate.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12">Nessun dato per ${mese} ${anno}</td></tr>`;
    return;
  }

  righeFiltrate.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.gruppo}</td>
      <td>${r.tipo}</td>
      <td>${r.sezione}</td>
      <td>${r.U}</td>
      <td>${r.D}</td>
      <td>${r.GU}</td>
      <td>${r.GD}</td>
      <td>${r.U + r.D + r.GU + r.GD}</td>
      <td>${r.FUT}</td>
      <td>${r.STU}</td>
    `;
    tbody.appendChild(tr);
  });
}
