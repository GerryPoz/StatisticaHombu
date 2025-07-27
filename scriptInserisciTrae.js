// Importa Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Configurazione Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyAGoVq0-DvyqUUH4aDCfOFZP2NobclIg_o",
  authDomain: "hombu-8630c.firebaseapp.com",
  databaseURL: "https://hombu-8630c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hombu-8630c",
  storageBucket: "hombu-8630c.firebasestorage.app",
  messagingSenderId: "886418358212",
  appId: "1:886418358212:web:fa87f614ad5665b3426e91",
  measurementId: "G-D6W8XKCB8Z"
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
  try {
    const response = await fetch('gruppi.json');
    const data = await response.json();
    const gruppi = [];
    for (const capitolo of Object.values(data["HOMBU 9"])) {
      for (const settore of Object.values(capitolo)) {
        gruppi.push(...settore);
      }
    }
    gruppi.sort(); // Ordina alfabeticamente
    document.getElementById("gruppo").innerHTML = '<option value="">Seleziona gruppo...</option>' + 
      gruppi.map(g => `<option value="${g}">${g}</option>`).join("");
  } catch (error) {
    console.error("Errore nel caricamento gruppi:", error);
    showToast("Errore nel caricamento dei gruppi", "error");
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
  calcolaTotaliZadankai();
  calcolaTotaliPraticanti();
}

// Setup input numerici con calcolo automatico
function setupInputNumerici() {
  const inputs = document.querySelectorAll('input[type="number"]');
  
  inputs.forEach(input => {
    // Imposta valore predefinito a 0
    if (!input.value) {
      input.value = 0;
    }
    
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
    
    // Validazione valori negativi e calcolo automatico
    input.addEventListener("input", e => {
      if (parseInt(e.target.value) < 0) {
        e.target.value = 0;
        showToast("I valori non possono essere negativi", "warning");
      }
      
      // Calcola totali automaticamente
      if (e.target.name.includes('zadankai')) {
        calcolaTotaliZadankai();
      } else if (e.target.name.includes('praticanti')) {
        calcolaTotaliPraticanti();
      }
    });
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
    
    const totaleElement = document.querySelector(`[name="zadankai_${sezione}_tot"]`);
    if (totaleElement) {
      totaleElement.value = somma;
    }
    totaleGenerale += somma;
  });

  const totaleGeneraleElement = document.querySelector(`[name="zadankai_totale_generale"]`);
  if (totaleGeneraleElement) {
    totaleGeneraleElement.value = totaleGenerale;
  }
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
    
    const totaleElement = document.querySelector(`[name="praticanti_${sezione}_tot"]`);
    if (totaleElement) {
      totaleElement.value = somma;
    }
    totaleGenerale += somma;
  });

  const totaleGeneraleElement = document.querySelector(`[name="praticanti_totale_generale"]`);
  if (totaleGeneraleElement) {
    totaleGeneraleElement.value = totaleGenerale;
  }
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

// Genera riepilogo per modal
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
