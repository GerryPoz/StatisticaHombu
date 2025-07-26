import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Variabili globali
let modalConferma;

document.addEventListener("DOMContentLoaded", () => {
  // Inizializza il modal Bootstrap
  modalConferma = new bootstrap.Modal(document.getElementById('modalConferma'));
  
  // Popola Anno
  const anno = new Date().getFullYear();
  document.getElementById("anno").innerHTML = `
    <option value="">Seleziona anno...</option>
    <option value="${anno}" selected>${anno}</option>
    <option value="${anno + 1}">${anno + 1}</option>
  `;

  // Popola Mese
  const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  const meseCorrente = new Date().getMonth();
  document.getElementById("mese").innerHTML = '<option value="">Seleziona mese...</option>' + 
    mesi.map((m, i) => `<option value="${m}" ${i === meseCorrente ? 'selected' : ''}>${m}</option>`).join("");

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
      gruppi.sort(); // Ordina alfabeticamente
      document.getElementById("gruppo").innerHTML = '<option value="">Seleziona gruppo...</option>' + 
        gruppi.map(g => `<option value="${g}">${g}</option>`).join("");
    })
    .catch(err => {
      console.error("Errore nel caricamento gruppi:", err);
      showToast("Errore nel caricamento dei gruppi", "error");
    });
  
  // Gestione input numerici
  setupNumericInputs();
  
  // Attiva calcoli automatici
  setupAutoCalculations();
});

// Configurazione input numerici
function setupNumericInputs() {
  document.querySelectorAll('input[type="number"]').forEach(input => {
    // Blocca caratteri non numerici
    input.addEventListener("keypress", e => {
      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }
    });
    
    // Gestisce incolla
    input.addEventListener("paste", e => {
      const pasted = (e.clipboardData || window.clipboardData).getData("text");
      if (!/^\d+$/.test(pasted)) {
        e.preventDefault();
        showToast("Puoi incollare solo numeri", "warning");
      }
    });
    
    // Disabilita rotella del mouse
    input.addEventListener("wheel", e => {
      e.target.blur();
      e.preventDefault();
    });
    
    // Validazione valori negativi
    input.addEventListener("input", e => {
      if (parseInt(e.target.value) < 0) {
        e.target.value = 0;
        showToast("I valori non possono essere negativi", "warning");
      }
    });
  });
}

// Configurazione calcoli automatici
function setupAutoCalculations() {
  // Calcoli Zadankai
  document.querySelectorAll('#zadankai-table input[type="number"]:not([readonly])').forEach(input => {
    input.addEventListener("input", calcolaTotaliZadankai);
  });
  
  // Calcoli Praticanti
  document.querySelectorAll('#praticanti-table input[type="number"]:not([readonly])').forEach(input => {
    input.addEventListener("input", calcolaTotaliPraticanti);
  });
}

// Calcolo totali Zadankai
function calcolaTotaliZadankai() {
  const sezioni = ["m", "s", "o"];
  let totaleGenerale = 0;

  sezioni.forEach(sezione => {
    const u = parseInt(document.querySelector(`[name="zadankai_${sezione}_u"]`).value) || 0;
    const d = parseInt(document.querySelector(`[name="zadankai_${sezione}_d"]`).value) || 0;
    const gu = parseInt(document.querySelector(`[name="zadankai_${sezione}_gu"]`).value) || 0;
    const gd = parseInt(document.querySelector(`[name="zadankai_${sezione}_gd"]`).value) || 0;
    const somma = u + d + gu + gd;
    
    const totaleInput = document.querySelector(`[name="zadankai_${sezione}_tot"]`);
    totaleInput.value = somma > 0 ? somma : '';
    totaleGenerale += somma;
  });

  const totaleGeneraleInput = document.querySelector(`[name="zadankai_totale_generale"]`);
  totaleGeneraleInput.value = totaleGenerale > 0 ? totaleGenerale : '';
}

// Calcolo totali Praticanti
function calcolaTotaliPraticanti() {
  const sezioni = ["m", "s"];
  let totaleGenerale = 0;

  sezioni.forEach(sezione => {
    const u = parseInt(document.querySelector(`[name="praticanti_${sezione}_u"]`).value) || 0;
    const d = parseInt(document.querySelector(`[name="praticanti_${sezione}_d"]`).value) || 0;
    const gu = parseInt(document.querySelector(`[name="praticanti_${sezione}_gu"]`).value) || 0;
    const gd = parseInt(document.querySelector(`[name="praticanti_${sezione}_gd"]`).value) || 0;
    const somma = u + d + gu + gd;
    
    const totaleInput = document.querySelector(`[name="praticanti_${sezione}_tot"]`);
    totaleInput.value = somma > 0 ? somma : '';
    totaleGenerale += somma;
  });

  const totaleGeneraleInput = document.querySelector(`[name="praticanti_totale_generale"]`);
  totaleGeneraleInput.value = totaleGenerale > 0 ? totaleGenerale : '';
}

// Validazione form
function validaForm() {
  const anno = document.getElementById("anno").value;
  const mese = document.getElementById("mese").value;
  const gruppo = document.getElementById("gruppo").value;

  if (!anno || !mese || !gruppo) {
    showToast("Seleziona anno, mese e gruppo prima di procedere", "error");
    return false;
  }

  // Verifica se almeno un campo è compilato
  const campiNumerici = document.querySelectorAll('input[type="number"]:not([readonly])');
  const hasDati = Array.from(campiNumerici).some(input => {
    const val = parseInt(input.value) || 0;
    return val > 0;
  });

  if (!hasDati) {
    showToast("Inserisci almeno un valore maggiore di zero", "warning");
    return false;
  }

  return true;
}

// Genera riepilogo per il modal
function generaRiepilogo() {
  const anno = document.getElementById("anno").value;
  const mese = document.getElementById("mese").value;
  const gruppo = document.getElementById("gruppo").value;

  // Riepilogo selezioni
  document.getElementById("riepilogo-selezioni").innerHTML = `
    <div class="col-md-4">
      <strong><i class="fas fa-calendar-alt me-1"></i>Anno:</strong><br>
      <span class="badge bg-primary fs-6">${anno}</span>
    </div>
    <div class="col-md-4">
      <strong><i class="fas fa-calendar me-1"></i>Mese:</strong><br>
      <span class="badge bg-info fs-6">${mese}</span>
    </div>
    <div class="col-md-4">
      <strong><i class="fas fa-users me-1"></i>Gruppo:</strong><br>
      <span class="badge bg-secondary fs-6">${gruppo}</span>
    </div>
  `;

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
