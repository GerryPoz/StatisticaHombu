// Importa Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBJgZgQ9X8X8X8X8X8X8X8X8X8X8X8X8X8",
  authDomain: "trae-sgi.firebaseapp.com",
  databaseURL: "https://trae-sgi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "trae-sgi",
  storageBucket: "trae-sgi.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnopqr"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Variabili globali
let modalConferma;

// Caricamento DOM
document.addEventListener("DOMContentLoaded", async () => {
  // Inizializza modal
  modalConferma = new bootstrap.Modal(document.getElementById("modal-conferma"));
  
  // Popola dropdown anni (dal 2020 al 2030)
  const annoSelect = document.getElementById("anno");
  for (let anno = 2020; anno <= 2030; anno++) {
    const option = document.createElement("option");
    option.value = anno;
    option.textContent = anno;
    if (anno === new Date().getFullYear()) {
      option.selected = true;
    }
    annoSelect.appendChild(option);
  }
  
  // Popola dropdown mesi
  const mesi = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];
  const meseSelect = document.getElementById("mese");
  mesi.forEach((mese, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1).padStart(2, '0');
    option.textContent = mese;
    if (index + 1 === new Date().getMonth() + 1) {
      option.selected = true;
    }
    meseSelect.appendChild(option);
  });
  
  // Carica gruppi da file JSON
  try {
    const response = await fetch('gruppi.json');
    const gruppi = await response.json();
    const gruppoSelect = document.getElementById("gruppo");
    
    gruppi.forEach(gruppo => {
      const option = document.createElement("option");
      option.value = gruppo;
      option.textContent = gruppo;
      gruppoSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Errore nel caricamento gruppi:", error);
  }
  
  // Setup input numerici
  setupInputNumerici();
  
  // Aggiungi listener per caricamento dati esistenti
  aggiungiListenerCaricamentoDati();
});

// Event listener per controllare se esistono dati quando cambiano anno, mese o gruppo
function aggiungiListenerCaricamentoDati() {
  const annoSelect = document.getElementById("anno");
  const meseSelect = document.getElementById("mese");
  const gruppoSelect = document.getElementById("gruppo");
  
  [annoSelect, meseSelect, gruppoSelect].forEach(select => {
    select.addEventListener("change", verificaECaricaDatiEsistenti);
  });
}

// Verifica se esistono dati per la combinazione anno-mese-gruppo selezionata
async function verificaECaricaDatiEsistenti() {
  const anno = document.getElementById("anno").value;
  const mese = document.getElementById("mese").value;
  const gruppo = document.getElementById("gruppo").value;
  
  // Se non sono selezionati tutti e tre i valori, non fare nulla
  if (!anno || !mese || !gruppo) {
    return;
  }
  
  const key = `${anno}-${mese}-${gruppo}`;
  
  try {
    const snapshot = await get(ref(db, `zadankai/${key}`));
    
    if (snapshot.exists()) {
      const dati = snapshot.val();
      
      // Mostra un messaggio di conferma
      if (confirm(`Sono già presenti dati per ${gruppo} - ${mese}/${anno}. Vuoi caricarli nel form per modificarli?`)) {
        caricaDatiNelForm(dati);
        showToast("Dati caricati con successo! Puoi ora modificarli.", "success");
      }
    }
  } catch (error) {
    console.error("Errore nel controllo dati esistenti:", error);
  }
}

// Carica i dati esistenti nel form
function caricaDatiNelForm(dati) {
  // Carica dati Zadankai
  if (dati.zadankai) {
    // Membri
    if (dati.zadankai.membri) {
      document.querySelector('[name="zadankai_m_u"]').value = dati.zadankai.membri.U || 0;
      document.querySelector('[name="zadankai_m_d"]').value = dati.zadankai.membri.D || 0;
      document.querySelector('[name="zadankai_m_gu"]').value = dati.zadankai.membri.GU || 0;
      document.querySelector('[name="zadankai_m_gd"]').value = dati.zadankai.membri.GD || 0;
      document.querySelector('[name="zadankai_m_fut"]').value = dati.zadankai.membri.FUT || 0;
      document.querySelector('[name="zadankai_m_stu"]').value = dati.zadankai.membri.STU || 0;
    }
    
    // Simpatizzanti
    if (dati.zadankai.simpatizzanti) {
      document.querySelector('[name="zadankai_s_u"]').value = dati.zadankai.simpatizzanti.U || 0;
      document.querySelector('[name="zadankai_s_d"]').value = dati.zadankai.simpatizzanti.D || 0;
      document.querySelector('[name="zadankai_s_gu"]').value = dati.zadankai.simpatizzanti.GU || 0;
      document.querySelector('[name="zadankai_s_gd"]').value = dati.zadankai.simpatizzanti.GD || 0;
      document.querySelector('[name="zadankai_s_fut"]').value = dati.zadankai.simpatizzanti.FUT || 0;
      document.querySelector('[name="zadankai_s_stu"]').value = dati.zadankai.simpatizzanti.STU || 0;
    }
    
    // Ospiti
    if (dati.zadankai.ospiti) {
      document.querySelector('[name="zadankai_o_u"]').value = dati.zadankai.ospiti.U || 0;
      document.querySelector('[name="zadankai_o_d"]').value = dati.zadankai.ospiti.D || 0;
      document.querySelector('[name="zadankai_o_gu"]').value = dati.zadankai.ospiti.GU || 0;
      document.querySelector('[name="zadankai_o_gd"]').value = dati.zadankai.ospiti.GD || 0;
    }
  }
  
  // Carica dati Praticanti
  if (dati.praticanti) {
    // Membri
    if (dati.praticanti.membri) {
      document.querySelector('[name="praticanti_m_u"]').value = dati.praticanti.membri.U || 0;
      document.querySelector('[name="praticanti_m_d"]').value = dati.praticanti.membri.D || 0;
      document.querySelector('[name="praticanti_m_gu"]').value = dati.praticanti.membri.GU || 0;
      document.querySelector('[name="praticanti_m_gd"]').value = dati.praticanti.membri.GD || 0;
    }
    
    // Simpatizzanti
    if (dati.praticanti.simpatizzanti) {
      document.querySelector('[name="praticanti_s_u"]').value = dati.praticanti.simpatizzanti.U || 0;
      document.querySelector('[name="praticanti_s_d"]').value = dati.praticanti.simpatizzanti.D || 0;
      document.querySelector('[name="praticanti_s_gu"]').value = dati.praticanti.simpatizzanti.GU || 0;
      document.querySelector('[name="praticanti_s_gd"]').value = dati.praticanti.simpatizzanti.GD || 0;
    }
  }
  
  // Ricalcola i totali automaticamente
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.dispatchEvent(new Event('input'));
  });
}

// Setup input numerici con calcolo automatico
function setupInputNumerici() {
  const inputs = document.querySelectorAll('input[type="number"]');
  
  inputs.forEach(input => {
    // Imposta valore predefinito a 0
    if (!input.value) {
      input.value = 0;
    }
    
    // Aggiungi listener per calcolo automatico
    input.addEventListener('input', () => {
      calcolaTotaliAutomatici();
    });
    
    // Previeni valori negativi
    input.addEventListener('change', () => {
      if (parseInt(input.value) < 0) {
        input.value = 0;
      }
    });
  });
}

// Calcolo automatico dei totali
function calcolaTotaliAutomatici() {
  // Calcola totali per ogni riga
  const righe = [
    'zadankai_m', 'zadankai_s', 'zadankai_o',
    'praticanti_m', 'praticanti_s'
  ];
  
  righe.forEach(riga => {
    const u = parseInt(document.querySelector(`[name="${riga}_u"]`).value) || 0;
    const d = parseInt(document.querySelector(`[name="${riga}_d"]`).value) || 0;
    const gu = parseInt(document.querySelector(`[name="${riga}_gu"]`).value) || 0;
    const gd = parseInt(document.querySelector(`[name="${riga}_gd"]`).value) || 0;
    
    const totale = u + d + gu + gd;
    const totaleElement = document.getElementById(`${riga}_totale`);
    if (totaleElement) {
      totaleElement.textContent = totale;
    }
  });
}

// Validazione form
function validaForm() {
  const anno = document.getElementById("anno").value;
  const mese = document.getElementById("mese").value;
  const gruppo = document.getElementById("gruppo").value;
  
  if (!anno || !mese || !gruppo) {
    showToast("Seleziona anno, mese e gruppo prima di procedere.", "warning");
    return false;
  }
  
  return true;
}

// Genera riepilogo per modal
function generaRiepilogo() {
  // Riepilogo Zadankai
  const zadankaiHtml = generaRiepilogoTabella("zadankai", [
    { key: "m", label: "Membri" },
    { key: "s", label: "Simpatizzanti" },
    { key: "o", label: "Ospiti" }
  ], true);
  document.getElementById("riepilogo-zadankai").innerHTML = zadankaiHtml;
  
  // Riepilogo Praticanti
  const praticantiHtml = generaRiepilogoTabella("praticanti", [
    { key: "m", label: "Membri" },
    { key: "s", label: "Simpatizzanti" }
  ], false);
  document.getElementById("riepilogo-praticanti").innerHTML = praticantiHtml;
}

// Genera HTML per tabella riepilogo
function generaRiepilogoTabella(tipo, sezioni, includiExtra) {
  let html = `
    <table class="table table-sm table-bordered">
      <thead class="table-dark">
        <tr>
          <th>Categoria</th><th>U</th><th>D</th><th>GU</th><th>GD</th><th>Totale</th>
          ${includiExtra ? '<th>FUT</th><th>STU</th>' : ''}
        </tr>
      </thead>
      <tbody>
  `;

  let totaleGenerale = 0;
  
  sezioni.forEach(sezione => {
    const u = parseInt(document.querySelector(`[name="${tipo}_${sezione.key}_u"]`).value) || 0;
    const d = parseInt(document.querySelector(`[name="${tipo}_${sezione.key}_d"]`).value) || 0;
    const gu = parseInt(document.querySelector(`[name="${tipo}_${sezione.key}_gu"]`).value) || 0;
    const gd = parseInt(document.querySelector(`[name="${tipo}_${sezione.key}_gd"]`).value) || 0;
    const totale = u + d + gu + gd;
    totaleGenerale += totale;
    
    let extraCells = '';
    if (includiExtra) {
      if (sezione.key !== 'o') { // Ospiti non hanno FUT e STU
        const fut = parseInt(document.querySelector(`[name="${tipo}_${sezione.key}_fut"]`).value) || 0;
        const stu = parseInt(document.querySelector(`[name="${tipo}_${sezione.key}_stu"]`).value) || 0;
        extraCells = `<td class="text-center">${fut}</td><td class="text-center">${stu}</td>`;
      } else {
        extraCells = '<td colspan="2" class="text-muted text-center">–</td>';
      }
    }
    
    html += `
      <tr>
        <td class="fw-bold">${sezione.label}</td>
        <td class="text-center">${u}</td>
        <td class="text-center">${d}</td>
        <td class="text-center">${gu}</td>
        <td class="text-center">${gd}</td>
        <td class="text-center fw-bold">${totale}</td>
        ${extraCells}
      </tr>
    `;
  });
  
  html += `
        <tr class="table-primary">
          <td colspan="5" class="text-end fw-bold">TOTALE GENERALE</td>
          <td class="text-center fw-bold">${totaleGenerale}</td>
          ${includiExtra ? '<td colspan="2"></td>' : ''}
        </tr>
      </tbody>
    </table>
  `;
  
  return html;
}

// Gestione submit form
document.getElementById("dati-form").addEventListener("submit", (e) => {
  e.preventDefault();
  
  if (!validaForm()) {
    return;
  }
  
  // Genera riepilogo e mostra modal
  generaRiepilogo();
  modalConferma.show();
});

// Conferma invio dal modal
document.getElementById("conferma-invio").addEventListener("click", async () => {
  modalConferma.hide();
  
  try {
    await salvasuFirebase();
    showSuccessMessage();
  } catch (error) {
    console.error("Errore nel salvataggio:", error);
    showToast("Errore nel salvataggio: " + error.message, "error");
  }
});

// Salvataggio su Firebase
async function salvasuFirebase() {
  const formData = new FormData(document.getElementById("dati-form"));
  const data = Object.fromEntries(formData.entries());
  const key = `${data.anno}-${data.mese}-${data.gruppo}`;

  const payload = {
    gruppo: data.gruppo,
    zadankai: {
      membri: {
        U: parseInt(data.zadankai_m_u) || 0,
        D: parseInt(data.zadankai_m_d) || 0,
        GU: parseInt(data.zadankai_m_gu) || 0,
        GD: parseInt(data.zadankai_m_gd) || 0,
        FUT: parseInt(data.zadankai_m_fut) || 0,
        STU: parseInt(data.zadankai_m_stu) || 0
      },
      simpatizzanti: {
        U: parseInt(data.zadankai_s_u) || 0,
        D: parseInt(data.zadankai_s_d) || 0,
        GU: parseInt(data.zadankai_s_gu) || 0,
        GD: parseInt(data.zadankai_s_gd) || 0,
        FUT: parseInt(data.zadankai_s_fut) || 0,
        STU: parseInt(data.zadankai_s_stu) || 0
      },
      ospiti: {
        U: parseInt(data.zadankai_o_u) || 0,
        D: parseInt(data.zadankai_o_d) || 0,
        GU: parseInt(data.zadankai_o_gu) || 0,
        GD: parseInt(data.zadankai_o_gd) || 0
      }
    },
    praticanti: {
      membri: {
        U: parseInt(data.praticanti_m_u) || 0,
        D: parseInt(data.praticanti_m_d) || 0,
        GU: parseInt(data.praticanti_m_gu) || 0,
        GD: parseInt(data.praticanti_m_gd) || 0
      },
      simpatizzanti: {
        U: parseInt(data.praticanti_s_u) || 0,
        D: parseInt(data.praticanti_s_d) || 0,
        GU: parseInt(data.praticanti_s_gu) || 0,
        GD: parseInt(data.praticanti_s_gd) || 0
      }
    }
  };

  await set(ref(db, `zadankai/${key}`), payload);
}

// Mostra messaggio di successo
function showSuccessMessage() {
  const successDiv = document.getElementById("messaggio-successo");
  successDiv.classList.remove("d-none");
  
  // Scroll al messaggio
  successDiv.scrollIntoView({ behavior: "smooth", block: "center" });
  
  // Reset form dopo 3 secondi
  setTimeout(() => {
    if (confirm("Vuoi inserire altri dati o tornare alla visualizzazione?")) {
      location.reload();
    } else {
      window.location.href = "visualizza3.html";
    }
  }, 3000);
}

// Sistema di notifiche toast
function showToast(message, type = "info") {
  // Rimuovi toast esistenti
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());
  
  const toastContainer = document.createElement('div');
  toastContainer.className = 'position-fixed top-0 end-0 p-3';
  toastContainer.style.zIndex = '9999';
  
  const toastColors = {
    success: 'text-bg-success',
    error: 'text-bg-danger',
    warning: 'text-bg-warning',
    info: 'text-bg-info'
  };
  
  const toastIcons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-triangle',
    warning: 'fas fa-exclamation-circle',
    info: 'fas fa-info-circle'
  };
  
  toastContainer.innerHTML = `
    <div class="toast ${toastColors[type]}" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <i class="${toastIcons[type]} me-2"></i>
        <strong class="me-auto">Notifica</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `;
  
  document.body.appendChild(toastContainer);
  
  const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
  toast.show();
  
  // Rimuovi il container dopo che il toast è nascosto
  toastContainer.querySelector('.toast').addEventListener('hidden.bs.toast', () => {
    toastContainer.remove();
  });
}
