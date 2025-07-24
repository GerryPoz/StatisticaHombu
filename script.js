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
  
  // Blocca caratteri non numerici, incolla e rotella del mouse
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener("keypress", e => {
      if (!/[0-9]/.test(e.key)) e.preventDefault();
    });
    input.addEventListener("paste", e => {
      const pasted = (e.clipboardData || window.clipboardData).getData("text");
      if (!/^\d+$/.test(pasted)) e.preventDefault();
    });
    input.addEventListener("wheel", e => e.target.blur());
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

// 🔽 Inserisci da qui in poi il nuovo codice
document.getElementById("salvaBtn").addEventListener("click", function () {
  const anno = document.getElementById("anno").value;
  const mese = document.getElementById("mese").value;
  const gruppo = document.getElementById("gruppo").value;

  const campi = [
    "zadankai_m_u", "zadankai_m_d", "zadankai_m_gu", "zadankai_m_gd",
    "zadankai_m_fut", "zadankai_m_stu",
    "zadankai_s_u", "zadankai_s_d", "zadankai_s_gu", "zadankai_s_gd",
    "zadankai_s_fut", "zadankai_s_stu",
    "zadankai_o_u", "zadankai_o_d", "zadankai_o_gu", "zadankai_o_gd",
    "praticanti_m_u", "praticanti_m_d", "praticanti_m_gu", "praticanti_m_gd",
    "praticanti_s_u", "praticanti_s_d", "praticanti_s_gu", "praticanti_s_gd"
  ];

  const tuttiVuoti = campi.every(id => {
    const val = document.getElementById(id)?.value.trim();
    return val === "" || val === "0";
  });

  if (!anno || !mese || !gruppo) {
    alert("⚠️ Seleziona anno, mese e gruppo.");
    return;
  }

  if (tuttiVuoti) {
    alert("⚠️ Nessun dato inserito: compila almeno una casella!");
    return;
  }

  document.getElementById("riepilogoTesto").innerText =
    `📅 ${mese} ${anno}\n👥 Gruppo: ${gruppo}`;
  document.getElementById("popupConferma").style.display = "flex";
});

document.getElementById("confermaBtn").addEventListener("click", function () {
  document.getElementById("popupConferma").style.display = "none";
  document.getElementById("dati-form").requestSubmit();
});

document.getElementById("annullaBtn").addEventListener("click", function () {
  document.getElementById("popupConferma").style.display = "none";
});

const form = document.getElementById("dati-form");
const popup = document.getElementById("popup-conferma");
const btnConferma = document.getElementById("btn-conferma");
const btnAnnulla = document.getElementById("btn-annulla");

form.addEventListener("submit", function(event) {
  event.preventDefault();
  popup.style.display = "flex"; // mostra popup
});

btnConferma.addEventListener("click", () => {
  popup.style.display = "none";
  form.submit(); // invia davvero
});

btnAnnulla.addEventListener("click", () => {
  popup.style.display = "none"; // chiudi popup
});
