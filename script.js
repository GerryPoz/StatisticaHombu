import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  // Popola Anno
  const anno = new Date().getFullYear();
  document.getElementById("anno").innerHTML = `
    <option value="${anno}" selected>${anno}</option>
    <option value="${anno + 1}">${anno + 1}</option>
  `;

  // Popola Mese
  const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  document.getElementById("mese").innerHTML = '<option value="">–</option>' + mesi.map(m => `<option>${m}</option>`).join("");

  // Popola Gruppo da gruppi.json
  fetch("gruppi.json")
    .then(res => res.json())
    .then(data => {
      const gruppi = [];
      for (const capitolo of Object.values(data["HOMBU 9"])) {
        for (const settore of Object.values(capitolo)) {
          gruppi.push(...settore);
        }
      }
      document.getElementById("gruppo").innerHTML = '<option value="">–</option>' + gruppi.map(g => `<option>${g}</option>`).join("");
    });
});

// Calcolo totali Zadankai
function calcolaTotaliZadankai() {
  const sezioni = ["m", "s", "o"];
  let totaleGenerale = 0;

  sezioni.forEach(sezione => {
    const u = +document.querySelector(`[name="zadankai_${sezione}_u"]`).value || 0;
    const d = +document.querySelector(`[name="zadankai_${sezione}_d"]`).value || 0;
    const gu = +document.querySelector(`[name="zadankai_${sezione}_gu"]`).value || 0;
    const gd = +document.querySelector(`[name="zadankai_${sezione}_gd"]`).value || 0;
    const somma = u + d + gu + gd;
    document.querySelector(`[name="zadankai_${sezione}_tot"]`).value = somma;
    totaleGenerale += somma;
  });

  document.querySelector(`[name="zadankai_totale_generale"]`).value = totaleGenerale;
}

// Calcolo totali Praticanti
function calcolaTotaliPraticanti() {
  const sezioni = ["m", "s"];
  let totaleGenerale = 0;

  sezioni.forEach(sezione => {
    const u = +document.querySelector(`[name="praticanti_${sezione}_u"]`).value || 0;
    const d = +document.querySelector(`[name="praticanti_${sezione}_d"]`).value || 0;
    const gu = +document.querySelector(`[name="praticanti_${sezione}_gu"]`).value || 0;
    const gd = +document.querySelector(`[name="praticanti_${sezione}_gd"]`).value || 0;
    const somma = u + d + gu + gd;
    document.querySelector(`[name="praticanti_${sezione}_tot"]`).value = somma;
    totaleGenerale += somma;
  });

  document.querySelector(`[name="praticanti_totale_generale"]`).value = totaleGenerale;
}

// Attiva i calcoli in tempo reale
document.querySelectorAll('#zadankai-table input[type="number"]').forEach(input => {
  input.addEventListener("input", calcolaTotaliZadankai);
});
document.querySelectorAll('#praticanti-table input[type="number"]').forEach(input => {
  input.addEventListener("input", calcolaTotaliPraticanti);
});

// Salvataggio su Firebase
document.getElementById("dati-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  const key = `${data.anno}-${data.mese}-${data.gruppo}`;

  const payload = {
    gruppo: data.gruppo,
    zadankai: {
      membri: {
        U: +data.zadankai_m_u || 0,
        D: +data.zadankai_m_d || 0,
        GU: +data.zadankai_m_gu || 0,
        GD: +data.zadankai_m_gd || 0,
        FUT: +data.zadankai_m_fut || 0,
        STU: +data.zadankai_m_stu || 0
      },
      simpatizzanti: {
        U: +data.zadankai_s_u || 0,
        D: +data.zadankai_s_d || 0,
        GU: +data.zadankai_s_gu || 0,
        GD: +data.zadankai_s_gd || 0,
        FUT: +data.zadankai_s_fut || 0,
        STU: +data.zadankai_s_stu || 0
      },
      ospiti: {
        U: +data.zadankai_o_u || 0,
        D: +data.zadankai_o_d || 0,
        GU: +data.zadankai_o_gu || 0,
        GD: +data.zadankai_o_gd || 0
      }
    },
    praticanti: {
      membri: {
        U: +data.praticanti_m_u || 0,
        D: +data.praticanti_m_d || 0,
        GU: +data.praticanti_m_gu || 0,
        GD: +data.praticanti_m_gd || 0
      },
      simpatizzanti: {
        U: +data.praticanti_s_u || 0,
        D: +data.praticanti_s_d || 0,
        GU: +data.praticanti_s_gu || 0,
        GD: +data.praticanti_s_gd || 0
      }
    }
  };

  set(ref(db, `zadankai/${key}`), payload)
    .then(() => {
      document.getElementById("messaggio-successo").style.display = "block";
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    })
    .catch(err => alert("❌ Errore nel salvataggio: " + err.message));
});
