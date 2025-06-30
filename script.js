import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.getElementById("zadankai-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const key = `${data.anno}-${data.mese}-${data.gruppo}`;
  const categoria = data.categoria;

  const payload = {
    U: parseInt(data.U || 0),
    D: parseInt(data.D || 0),
    GU: parseInt(data.GU || 0),
    GD: parseInt(data.GD || 0),
    FUT: parseInt(data.FUT || 0),
    STU: parseInt(data.STU || 0),
    note: data.note || ""
  };

  set(ref(db, `zadankai/${key}/${categoria}`), payload).then(() => {
    alert("Dati salvati con successo!");
    e.target.reset();
  });
});
