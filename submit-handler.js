import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("dati-form");
  const popup = document.getElementById("popup-conferma");
  const btnConferma = document.getElementById("confermaBtn");
  const btnAnnulla = document.getElementById("annullaBtn");

  // Intercetta il submit e mostra il popup
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    popup.style.display = "flex";
  });

  // Conferma: salva i dati su Firebase
  btnConferma.addEventListener("click", () => {
    popup.style.display = "none";
    salvaDati();
  });

  // Annulla: chiude il popup e NON invia
  btnAnnulla.addEventListener("click", () => {
    popup.style.display = "none";
  });
});

function salvaDati() {
  const form = document.getElementById("dati-form");
  const formData = new FormData(form);
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
        STU: +data.zadankai_m_stu || 0,
      },
      simpatizzanti: {
        U: +data.zadankai_s_u || 0,
        D: +data.zadankai_s_d || 0,
        GU: +data.zadankai_s_gu || 0,
        GD: +data.zadankai_s_gd || 0,
        FUT: +data.zadankai_s_fut || 0,
        STU: +data.zadankai_s_stu || 0,
      },
      ospiti: {
        U: +data.zadankai_o_u || 0,
        D: +data.zadankai_o_d || 0,
        GU: +data.zadankai_o_gu || 0,
        GD: +data.zadankai_o_gd || 0,
      },
    },
    praticanti: {
      membri: {
        U: +data.praticanti_m_u || 0,
        D: +data.praticanti_m_d || 0,
        GU: +data.praticanti_m_gu || 0,
        GD: +data.praticanti_m_gd || 0,
      },
      simpatizzanti: {
        U: +data.praticanti_s_u || 0,
        D: +data.praticanti_s_d || 0,
        GU: +data.praticanti_s_gu || 0,
        GD: +data.praticanti_s_gd || 0,
      },
    },
  };

  set(ref(db, `zadankai/${key}`), payload)
    .then(() => {
      document.getElementById("messaggio-successo").style.display = "block";
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    })
    .catch((err) => alert("❌ Errore nel salvataggio: " + err.message));
}
