import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
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
  
  // Aggiungi listener per caricamento dati esistenti
  aggiungiListenerCaricamentoDati();
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

// Aggiungi listener per caricamento dati esistenti
function aggiungiListenerCaricamentoDati() {
  const annoSelect = document.getElementById("anno");
  const meseSelect = document.getElementById("mese");
  const gruppoSelect = document.getElementById("gruppo");
  
  [annoSelect, meseSelect, gruppoSelect].forEach(select => {
    select.addEventListener("change", verificaECaricaDatiEsistenti);
  });
}

// Verifica e carica dati esistenti
async function verificaECaricaDatiEsistenti() {
  const anno = document.getElementById("anno").value;
  const mese = document.getElementById("mese").value;
  const gruppo = document.getElementById("gruppo").value;
  
  if (!anno || !mese || !gruppo) return;
  
  const key = `${anno}-${mese}-${gruppo}`;
  
  try {
    const snapshot = await get(child(ref(db), `zadankai/${key}`));
    
    if (snapshot.exists()) {
      const conferma = confirm(
        `Sono già presenti dati per ${gruppo} - ${mese} ${anno}.\n\n` +
        "Vuoi caricare i dati esistenti per modificarli?"
      );
      
      if (conferma) {
        caricaDatiNelForm(snapshot.val());
      }
    }
  } catch (error) {
    console.error("Errore nel controllo dati esistenti:", error);
  }
}

// Carica dati nel form
function caricaDatiNelForm(dati) {
  // Carica dati Zadankai
  if (dati.zadankai) {
    Object.entries(dati.zadankai).forEach(([categoria, valori]) => {
      const prefisso = categoria === "membri" ? "m" : categoria === "simpatizzanti" ? "s" : "o";
      
      Object.entries(valori).forEach(([campo, valore]) => {
        const input = document.querySelector(`[name="zadankai_${prefisso}_${campo.toLowerCase()}"]`);
        if (input) {
          input.value = valore || '';
        }
      });
    });
  }
  
  // Carica dati Praticanti
  if (dati.praticanti) {
    Object.entries(dati.praticanti).forEach(([categoria, valori]) => {
      const prefisso = categoria === "membri" ? "m" : "s";
      
      Object.entries(valori).forEach(([campo, valore]) => {
        const input = document.querySelector(`[name="praticanti_${prefisso}_${campo.toLowerCase()}"]`);
        if (input) {
          input.value = valore || '';
        }
      });
    });
  }
  
  // Ricalcola i totali
  calcolaTotaliZadankai();
  calcolaTotaliPraticanti();
  
  showToast("Dati caricati con successo!", "success");
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
        <td><strong>${sezione.label}</strong></td>
        <td class="text-center">${u}</td>
        <td class="text-center">${d}</td>
        <td class="text-center">${gu}</td>
        <td class="text-center">${gd}</td>
        <td class="text-center"><strong>${totale}</strong></td>
        ${extraCells}
      </tr>
    `;
  });
  
  html += `
      </tbody>
      <tfoot class="table-secondary">
        <tr>
          <th>TOTALE GENERALE</th>
          <th colspan="4"></th>
          <th class="text-center">${totaleGenerale}</th>
          ${includiExtra ? '<th colspan="2"></th>' : ''}
        </tr>
      </tfoot>
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
  const successDiv = document.getElementById("success-message");
  successDiv.style.display = "block";
  successDiv.scrollIntoView({ behavior: "smooth" });
  
  // Nascondi dopo 5 secondi
  setTimeout(() => {
    successDiv.style.display = "none";
  }, 5000);
  
  // Reset form
  document.getElementById("dati-form").reset();
  
  // Reset totali
  document.querySelectorAll('input[readonly]').forEach(input => {
    input.value = '';
  });
}

// Funzione toast
function showToast(message, type = "info") {
  // Crea elemento toast
  const toast = document.createElement("div");
  toast.className = `alert alert-${type === "error" ? "danger" : type === "warning" ? "warning" : type === "success" ? "success" : "info"} alert-dismissible fade show position-fixed`;
  toast.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;";
  toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(toast);
  
  // Rimuovi automaticamente dopo 4 secondi
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 4000);
}
