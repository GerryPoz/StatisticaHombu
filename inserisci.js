import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Verifica autenticazione
onAuthStateChanged(auth, (user) => {
  const loadingScreen = document.getElementById('loading-screen');
  
  if (user) {
    console.log('Utente autenticato:', user.email);
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
    inizializzaApp();
  } else {
    console.log('Utente non autenticato, reindirizzamento...');
    window.location.href = 'index.html';
  }
});

// Logout
function logout() {
  auth.signOut().then(() => {
    window.location.href = 'index.html';
  }).catch((error) => {
    console.error('Errore durante il logout:', error);
  });
}

// Rendi la funzione logout globale
window.logout = logout;

function inizializzaApp() {
  // Aspetta che il DOM sia completamente caricato
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupApp);
  } else {
    setupApp();
  }
}

function setupApp() {
  // Popola gli anni (dal 2020 al 2030)
  const annoSelect = document.getElementById("anno");
  if (annoSelect) {
    for (let anno = 2020; anno <= 2030; anno++) {
      const option = document.createElement("option");
      option.value = anno;
      option.textContent = anno;
      annoSelect.appendChild(option);
    }
  }

  // Popola i mesi
  const mesi = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];
  const meseSelect = document.getElementById("mese");
  if (meseSelect) {
    mesi.forEach((mese, index) => {
      const option = document.createElement("option");
      option.value = mese;
      option.textContent = mese;
      meseSelect.appendChild(option);
    });
  }

  // Carica i gruppi da gruppi.json
  fetch("gruppi.json")
    .then(response => response.json())
    .then(data => {
      const gruppoSelect = document.getElementById("gruppo");
      if (gruppoSelect) {
        const hombuData = data["HOMBU 9"];
        
        if (hombuData) {
          Object.keys(hombuData).forEach(capitolo => {
            const settori = hombuData[capitolo];
            Object.keys(settori).forEach(settore => {
              const gruppi = settori[settore];
              gruppi.forEach(gruppo => {
                const option = document.createElement("option");
                option.value = gruppo.nome;
                option.textContent = gruppo.nome;
                gruppoSelect.appendChild(option);
              });
            });
          });
        }
      }
    })
    .catch(error => console.error("Errore nel caricamento dei gruppi:", error));

  // Funzioni per calcolare i totali
  function calcolaTotaliZadankai() {
    const campi = [
      "zadankai_m_u", "zadankai_m_d", "zadankai_m_gu", "zadankai_m_gd", "zadankai_m_fut", "zadankai_m_stu",
      "zadankai_s_u", "zadankai_s_d", "zadankai_s_gu", "zadankai_s_gd", "zadankai_s_fut", "zadankai_s_stu",
      "zadankai_o_u", "zadankai_o_d", "zadankai_o_gu", "zadankai_o_gd"
    ];
    
    let totale = 0;
    campi.forEach(campo => {
      const valore = parseInt(document.getElementById(campo)?.value || 0);
      totale += valore;
    });
    
    const totaleElement = document.getElementById("zadankai_totale");
    if (totaleElement) {
      totaleElement.value = totale;
    }
  }

  function calcolaTotaliPraticanti() {
    const campi = [
      "praticanti_m_u", "praticanti_m_d", "praticanti_m_gu", "praticanti_m_gd",
      "praticanti_s_u", "praticanti_s_d", "praticanti_s_gu", "praticanti_s_gd"
    ];
    
    let totale = 0;
    campi.forEach(campo => {
      const valore = parseInt(document.getElementById(campo)?.value || 0);
      totale += valore;
    });
    
    const totaleElement = document.getElementById("praticanti_totale");
    if (totaleElement) {
      totaleElement.value = totale;
    }
  }

  // Event listeners per il calcolo automatico dei totali
  const zadankaiInputs = document.querySelectorAll('#zadankai-table input[type="number"]');
  zadankaiInputs.forEach(input => {
    input.addEventListener('input', calcolaTotaliZadankai);
  });
  
  const praticantiInputs = document.querySelectorAll('#praticanti-table input[type="number"]');
  praticantiInputs.forEach(input => {
    input.addEventListener('input', calcolaTotaliPraticanti);
  });

  // Gestione del form con la struttura originale
  const form = document.getElementById("dati-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      // Verifica autenticazione prima del salvataggio
      if (!auth.currentUser) {
        alert("❌ Devi essere autenticato per salvare i dati.");
        window.location.href = 'index.html';
        return;
      }

      const data = new FormData(e.target);
      const anno = data.get("anno");
      const mese = data.get("mese");
      const gruppo = data.get("gruppo");
      const key = `${anno}${String(new Date(Date.parse(mese + " 1, 2020")).getMonth() + 1).padStart(2, "0")}_${gruppo}`;

      // Struttura dati identica al file originale
      const payload = {
        anno,
        mese,
        gruppo,
        zadankai: {
          membri: {
            U: +data.get("zadankai_m_u") || 0,
            D: +data.get("zadankai_m_d") || 0,
            GU: +data.get("zadankai_m_gu") || 0,
            GD: +data.get("zadankai_m_gd") || 0,
            FUT: +data.get("zadankai_m_fut") || 0,
            STU: +data.get("zadankai_m_stu") || 0
          },
          simpatizzanti: {
            U: +data.get("zadankai_s_u") || 0,
            D: +data.get("zadankai_s_d") || 0,
            GU: +data.get("zadankai_s_gu") || 0,
            GD: +data.get("zadankai_s_gd") || 0,
            FUT: +data.get("zadankai_s_fut") || 0,
            STU: +data.get("zadankai_s_stu") || 0
          },
          ospiti: {
            U: +data.get("zadankai_o_u") || 0,
            D: +data.get("zadankai_o_d") || 0,
            GU: +data.get("zadankai_o_gu") || 0,
            GD: +data.get("zadankai_o_gd") || 0
          }
        },
        praticanti: {
          membri: {
            U: +data.get("praticanti_m_u") || 0,
            D: +data.get("praticanti_m_d") || 0,
            GU: +data.get("praticanti_m_gu") || 0,
            GD: +data.get("praticanti_m_gd") || 0
          },
          simpatizzanti: {
            U: +data.get("praticanti_s_u") || 0,
            D: +data.get("praticanti_s_d") || 0,
            GU: +data.get("praticanti_s_gu") || 0,
            GD: +data.get("praticanti_s_gd") || 0
          }
        }
      };

      set(ref(db, `zadankai/${key}`), payload)
        .then(() => {
          const successElement = document.getElementById("messaggio-successo");
          if (successElement) {
            successElement.style.display = "block";
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
          }
        })
        .catch(err => alert("❌ Errore nel salvataggio: " + err.message));
    });
  }

  // Gestione del popup di conferma
  const salvaBtn = document.getElementById("salvaBtn");
  if (salvaBtn) {
    salvaBtn.addEventListener("click", function () {
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
        const element = document.getElementById(id);
        const val = element ? element.value.trim() : "";
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

      const riepilogoElement = document.getElementById("riepilogoTesto");
      if (riepilogoElement) {
        riepilogoElement.innerText = `📅 ${mese} ${anno}\n👥 Gruppo: ${gruppo}`;
      }
      
      const popupElement = document.getElementById("popupConferma");
      if (popupElement) {
        popupElement.style.display = "flex";
      }
    });
  }

  const confermaBtn = document.getElementById("confermaBtn");
  if (confermaBtn) {
    confermaBtn.addEventListener("click", function () {
      const popupElement = document.getElementById("popupConferma");
      if (popupElement) {
        popupElement.style.display = "none";
      }
      
      const form = document.getElementById("dati-form");
      if (form) {
        form.requestSubmit();
      }
    });
  }

  const annullaBtn = document.getElementById("annullaBtn");
  if (annullaBtn) {
    annullaBtn.addEventListener("click", function () {
      const popupElement = document.getElementById("popupConferma");
      if (popupElement) {
        popupElement.style.display = "none";
      }
    });
  }
}
