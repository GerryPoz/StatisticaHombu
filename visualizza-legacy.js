// 🔹 Configurazione bordi centralizzata
var BORDER_CONFIG = {
  vertical: {
    thickness: "2px",
    style: "solid",
    color: "#3282F6"
  },
  horizontal: {
    thickness: "4px",
    style: "solid",
    color: "#EE8AF8"
  },
  // Funzioni helper per generare le stringhe CSS
  getVerticalBorder: function() {
    return this.vertical.thickness + " " + this.vertical.style + " " + this.vertical.color;
  },
  getHorizontalBorder: function() {
    return this.horizontal.thickness + " " + this.horizontal.style + " " + this.horizontal.color;
  }
};

// 🔹 Variabili globali Firebase (già inizializzate nell'HTML)
// var database, auth sono già disponibili

// 🔹 Riferimenti DOM
var filtroAnno = document.getElementById("filtro-anno");
var filtroMese = document.getElementById("filtro-mese");
var filtroCapitolo = document.getElementById("filtro-capitolo");
var filtroGruppo = document.getElementById("filtro-gruppo");
var tbody = document.querySelector("#tabella-dati tbody");
var btnExportExcel = document.getElementById("btn-export-excel");
var btnExportPdf = document.getElementById("btn-export-pdf");
var btnPrint = document.getElementById("btn-print");
var btnApplicaFiltri = document.getElementById("applica-filtri");
var btnResetFiltri = document.getElementById("reset-filtri");
var chartZadankai = document.getElementById("chart-zadankai");
var chartConfronto = document.getElementById("chart-confronto");

var mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

// Variabili globali
var righe = [];
var gruppoToCapitolo = {};
var gruppiData;
var graficoZadankaiInstance = null;
var graficoConfrontoInstance = null;

// 🔹 Funzione per calcolare il mese precedente
function mesePrecedente(mese, anno) {
  var indiceMese = mesiOrdine.indexOf(mese);
  if (indiceMese === 0) {
    return { mese: "Dicembre", anno: anno - 1 };
  }
  return { mese: mesiOrdine[indiceMese - 1], anno: anno };
}

// 🔹 Funzione per caricare i dati
function caricaDati() {
  console.log("📊 Caricamento dati in corso...");
  
  // Carica dati statistiche
  database.ref('statistiche').once('value')
    .then(function(snapshot) {
      var dati = snapshot.val();
      if (dati) {
        righe = [];
        
        // Converti i dati in array
        for (var key in dati) {
          if (dati.hasOwnProperty(key)) {
            var riga = dati[key];
            riga.id = key;
            righe.push(riga);
          }
        }
        
        console.log("✅ Dati caricati:", righe.length, "righe");
        
        // Carica gruppi
        return database.ref('gruppi').once('value');
      } else {
        throw new Error('Nessun dato trovato');
      }
    })
    .then(function(snapshot) {
      gruppiData = snapshot.val();
      if (gruppiData) {
        // Costruisci mappa gruppo -> capitolo
        for (var capitolo in gruppiData) {
          if (gruppiData.hasOwnProperty(capitolo)) {
            var gruppiCapitolo = gruppiData[capitolo];
            if (Array.isArray(gruppiCapitolo)) {
              for (var i = 0; i < gruppiCapitolo.length; i++) {
                gruppoToCapitolo[gruppiCapitolo[i]] = capitolo;
              }
            }
          }
        }
        
        console.log("✅ Gruppi caricati:", Object.keys(gruppiData).length, "capitoli");
        
        // Inizializza filtri e tabella
        inizializzaFiltri();
        aggiornaTabella();
        aggiornaStatistiche();
      }
    })
    .catch(function(error) {
      console.error("❌ Errore nel caricamento:", error);
      alert("Errore nel caricamento dei dati: " + error.message);
    });
}

// 🔹 Inizializza i filtri
function inizializzaFiltri() {
  var anni = [];
  var mesi = [];
  var capitoli = [];
  var gruppi = [];
  
  // Estrai valori unici
  for (var i = 0; i < righe.length; i++) {
    var riga = righe[i];
    
    if (anni.indexOf(riga.anno) === -1) anni.push(riga.anno);
    if (mesi.indexOf(riga.mese) === -1) mesi.push(riga.mese);
    
    var capitolo = gruppoToCapitolo[riga.gruppo];
    if (capitolo && capitoli.indexOf(capitolo) === -1) capitoli.push(capitolo);
    if (gruppi.indexOf(riga.gruppo) === -1) gruppi.push(riga.gruppo);
  }
  
  // Ordina
  anni.sort(function(a, b) { return b - a; });
  mesi.sort(function(a, b) { return mesiOrdine.indexOf(a) - mesiOrdine.indexOf(b); });
  capitoli.sort();
  gruppi.sort();
  
  // Popola select
  popolaSelect(filtroAnno, anni);
  popolaSelect(filtroMese, mesi);
  popolaSelect(filtroCapitolo, capitoli);
  popolaSelect(filtroGruppo, gruppi);
  
  // Imposta valori predefiniti (ultimo anno e mese)
  if (anni.length > 0) filtroAnno.value = anni[0];
  if (mesi.length > 0) filtroMese.value = mesi[mesi.length - 1];
}

// 🔹 Popola un select
function popolaSelect(selectElement, valori) {
  // Mantieni la prima opzione ("Tutti")
  var primaOpzione = selectElement.children[0];
  selectElement.innerHTML = '';
  selectElement.appendChild(primaOpzione);
  
  for (var i = 0; i < valori.length; i++) {
    var option = document.createElement('option');
    option.value = valori[i];
    option.textContent = valori[i];
    selectElement.appendChild(option);
  }
}

// 🔹 Aggiorna la tabella
function aggiornaTabella() {
  var anno = filtroAnno.value;
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;
  var gruppo = filtroGruppo.value;
  
  // Filtra i dati
  var righeFiltrate = righe.filter(function(riga) {
    return (!anno || riga.anno == anno) &&
           (!mese || riga.mese === mese) &&
           (!capitolo || gruppoToCapitolo[riga.gruppo] === capitolo) &&
           (!gruppo || riga.gruppo === gruppo);
  });
  
  console.log("🔍 Righe filtrate:", righeFiltrate.length);
  
  // Pulisci tabella
  tbody.innerHTML = '';
  
  if (righeFiltrate.length === 0) {
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = 20;
    td.className = 'text-center text-muted';
    td.textContent = 'Nessun dato trovato per i filtri selezionati';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  
  // Genera intestazioni se non esistono
  var tabella = document.getElementById('tabella-dati');
  if (!tabella.querySelector('thead')) {
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    
    var intestazioni = [
      'Gruppo', 'Capitolo', 'Mese', 'Anno',
      'Z-Membri U', 'Z-Membri D', 'Z-Membri GU', 'Z-Membri GD', 'Z-Membri TOT',
      'Z-Simp U', 'Z-Simp D', 'Z-Simp GU', 'Z-Simp GD', 'Z-Simp TOT',
      'Z-Ospiti U', 'Z-Ospiti D', 'Z-Ospiti GU', 'Z-Ospiti GD', 'Z-Ospiti TOT',
      'P-Membri TOT', 'P-Simp TOT'
    ];
    
    for (var i = 0; i < intestazioni.length; i++) {
      var th = document.createElement('th');
      th.textContent = intestazioni[i];
      th.className = 'text-center';
      headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    tabella.insertBefore(thead, tabella.firstChild);
  }
  
  // Popola righe
  for (var i = 0; i < righeFiltrate.length; i++) {
    var riga = righeFiltrate[i];
    var tr = document.createElement('tr');
    
    var valori = [
      riga.gruppo,
      gruppoToCapitolo[riga.gruppo] || 'N/A',
      riga.mese,
      riga.anno,
      riga.zadankai_m_u || 0,
      riga.zadankai_m_d || 0,
      riga.zadankai_m_gu || 0,
      riga.zadankai_m_gd || 0,
      riga.zadankai_m_tot || 0,
      riga.zadankai_s_u || 0,
      riga.zadankai_s_d || 0,
      riga.zadankai_s_gu || 0,
      riga.zadankai_s_gd || 0,
      riga.zadankai_s_tot || 0,
      riga.zadankai_o_u || 0,
      riga.zadankai_o_d || 0,
      riga.zadankai_o_gu || 0,
      riga.zadankai_o_gd || 0,
      riga.zadankai_o_tot || 0,
      riga.praticanti_m_tot || 0,
      riga.praticanti_s_tot || 0
    ];
    
    for (var j = 0; j < valori.length; j++) {
      var td = document.createElement('td');
      td.textContent = valori[j];
      td.className = 'text-center';
      tr.appendChild(td);
    }
    
    tbody.appendChild(tr);
  }
  
  // Aggiorna grafici
  aggiornaGrafici(righeFiltrate, anno, mese, capitolo);
  
  // Mostra gruppi mancanti
  mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo);
}

// 🔹 Aggiorna le statistiche generali
function aggiornaStatistiche() {
  var anno = filtroAnno.value;
  var mese = filtroMese.value;
  
  var righeFiltrate = righe.filter(function(riga) {
    return (!anno || riga.anno == anno) && (!mese || riga.mese === mese);
  });
  
  var totZadankai = 0;
  var totPraticanti = 0;
  var gruppiAttivi = righeFiltrate.length;
  var ultimoAggiornamento = '';
  
  for (var i = 0; i < righeFiltrate.length; i++) {
    var riga = righeFiltrate[i];
    totZadankai += (riga.zadankai_m_tot || 0) + (riga.zadankai_s_tot || 0) + (riga.zadankai_o_tot || 0);
    totPraticanti += (riga.praticanti_m_tot || 0) + (riga.praticanti_s_tot || 0);
    
    if (riga.timestamp && riga.timestamp > ultimoAggiornamento) {
      ultimoAggiornamento = riga.timestamp;
    }
  }
  
  document.getElementById('stat-zadankai').textContent = totZadankai;
  document.getElementById('stat-praticanti').textContent = totPraticanti;
  document.getElementById('stat-gruppi').textContent = gruppiAttivi;
  
  if (ultimoAggiornamento) {
    var data = new Date(ultimoAggiornamento);
    document.getElementById('stat-ultimo').textContent = data.toLocaleDateString('it-IT');
  }
}

// 🔹 Mostra gruppi mancanti
function mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo) {
  var container = document.getElementById('gruppi-mancanti');
  
  if (!anno || !mese) {
    container.style.display = 'none';
    return;
  }
  
  var gruppiConDati = righeFiltrate.map(function(riga) { return riga.gruppo; });
  var tuttiGruppi = [];
  
  if (capitolo) {
    tuttiGruppi = gruppiData[capitolo] || [];
  } else {
    for (var cap in gruppiData) {
      if (gruppiData.hasOwnProperty(cap)) {
        tuttiGruppi = tuttiGruppi.concat(gruppiData[cap] || []);
      }
    }
  }
  
  var gruppiMancanti = tuttiGruppi.filter(function(gruppo) {
    return gruppiConDati.indexOf(gruppo) === -1;
  });
  
  if (gruppiMancanti.length > 0) {
    container.className = 'alert alert-warning';
    container.innerHTML = '<strong>⚠️ Gruppi senza dati per ' + mese + ' ' + anno + ':</strong><br>' +
                         gruppiMancanti.join(', ');
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

// 🔹 Aggiorna i grafici
function aggiornaGrafici(righeFiltrate, anno, mese, capitolo) {
  // Distruggi grafici esistenti
  if (graficoZadankaiInstance) {
    graficoZadankaiInstance.destroy();
  }
  if (graficoConfrontoInstance) {
    graficoConfrontoInstance.destroy();
  }
  
  // Calcola dati per grafico Zadankai
  var totMembri = 0, totSimp = 0, totOspiti = 0;
  
  for (var i = 0; i < righeFiltrate.length; i++) {
    var riga = righeFiltrate[i];
    totMembri += riga.zadankai_m_tot || 0;
    totSimp += riga.zadankai_s_tot || 0;
    totOspiti += riga.zadankai_o_tot || 0;
  }
  
  // Grafico Zadankai (Pie)
  graficoZadankaiInstance = new Chart(chartZadankai, {
    type: 'pie',
    data: {
      labels: ['Membri', 'Simpatizzanti', 'Ospiti'],
      datasets: [{
        data: [totMembri, totSimp, totOspiti],
        backgroundColor: ['#007bff', '#28a745', '#ffc107']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
  
  // Grafico confronto mensile (se abbiamo mese e anno)
  if (mese && anno) {
    var mesePrec = mesePrecedente(mese, parseInt(anno));
    
    var righeMeseCorrente = righeFiltrate;
    var righeMesePrec = righe.filter(function(riga) {
      return riga.mese === mesePrec.mese && 
             riga.anno == mesePrec.anno &&
             (!capitolo || gruppoToCapitolo[riga.gruppo] === capitolo);
    });
    
    var totCorrenteMembri = 0, totCorrenteSimp = 0;
    var totPrecMembri = 0, totPrecSimp = 0;
    
    for (var i = 0; i < righeMeseCorrente.length; i++) {
      var riga = righeMeseCorrente[i];
      totCorrenteMembri += riga.zadankai_m_tot || 0;
      totCorrenteSimp += riga.zadankai_s_tot || 0;
    }
    
    for (var i = 0; i < righeMesePrec.length; i++) {
      var riga = righeMesePrec[i];
      totPrecMembri += riga.zadankai_m_tot || 0;
      totPrecSimp += riga.zadankai_s_tot || 0;
    }
    
    graficoConfrontoInstance = new Chart(chartConfronto, {
      type: 'bar',
      data: {
        labels: ['Membri', 'Simpatizzanti'],
        datasets: [
          {
            label: mesePrec.mese + ' ' + mesePrec.anno,
            data: [totPrecMembri, totPrecSimp],
            backgroundColor: '#6c757d'
          },
          {
            label: mese + ' ' + anno,
            data: [totCorrenteMembri, totCorrenteSimp],
            backgroundColor: '#007bff'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}

// 🔹 Esporta Excel
function esportaExcel() {
  var anno = filtroAnno.value;
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;
  var gruppo = filtroGruppo.value;
  
  var righeFiltrate = righe.filter(function(riga) {
    return (!anno || riga.anno == anno) &&
           (!mese || riga.mese === mese) &&
           (!capitolo || gruppoToCapitolo[riga.gruppo] === capitolo) &&
           (!gruppo || riga.gruppo === gruppo);
  });
  
  if (righeFiltrate.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }
  
  // Prepara dati per Excel
  var datiExcel = [];
  
  // Intestazioni
  datiExcel.push([
    'Gruppo', 'Capitolo', 'Mese', 'Anno',
    'Z-Membri U', 'Z-Membri D', 'Z-Membri GU', 'Z-Membri GD', 'Z-Membri TOT',
    'Z-Simp U', 'Z-Simp D', 'Z-Simp GU', 'Z-Simp GD', 'Z-Simp TOT',
    'Z-Ospiti U', 'Z-Ospiti D', 'Z-Ospiti GU', 'Z-Ospiti GD', 'Z-Ospiti TOT',
    'P-Membri TOT', 'P-Simp TOT'
  ]);
  
  // Dati
  for (var i = 0; i < righeFiltrate.length; i++) {
    var riga = righeFiltrate[i];
    datiExcel.push([
      riga.gruppo,
      gruppoToCapitolo[riga.gruppo] || 'N/A',
      riga.mese,
      riga.anno,
      riga.zadankai_m_u || 0,
      riga.zadankai_m_d || 0,
      riga.zadankai_m_gu || 0,
      riga.zadankai_m_gd || 0,
      riga.zadankai_m_tot || 0,
      riga.zadankai_s_u || 0,
      riga.zadankai_s_d || 0,
      riga.zadankai_s_gu || 0,
      riga.zadankai_s_gd || 0,
      riga.zadankai_s_tot || 0,
      riga.zadankai_o_u || 0,
      riga.zadankai_o_d || 0,
      riga.zadankai_o_gu || 0,
      riga.zadankai_o_gd || 0,
      riga.zadankai_o_tot || 0,
      riga.praticanti_m_tot || 0,
      riga.praticanti_s_tot || 0
    ]);
  }
  
  // Crea workbook
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(datiExcel);
  XLSX.utils.book_append_sheet(wb, ws, 'Dati');
  
  // Scarica file
  var nomeFile = 'statistiche_hombu9_' + 
                 (anno || 'tutti_anni') + '_' + 
                 (mese || 'tutti_mesi') + '.xlsx';
  
  XLSX.writeFile(wb, nomeFile);
}

// 🔹 Esporta PDF (versione semplificata)
function esportaPdf() {
  var anno = filtroAnno.value;
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;
  
  var righeFiltrate = righe.filter(function(riga) {
    return (!anno || riga.anno == anno) &&
           (!mese || riga.mese === mese) &&
           (!capitolo || gruppoToCapitolo[riga.gruppo] === capitolo);
  });
  
  if (righeFiltrate.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }
  
  var doc = new jsPDF();
  
  // Titolo
  doc.setFontSize(16);
  doc.text('Statistiche HOMBU 9', 20, 20);
  
  if (mese && anno) {
    doc.setFontSize(12);
    doc.text('Periodo: ' + mese + ' ' + anno, 20, 30);
  }
  
  // Prepara dati per tabella
  var intestazioni = [['Gruppo', 'Capitolo', 'Z-Membri', 'Z-Simp', 'Z-Ospiti', 'P-Membri', 'P-Simp']];
  var righeTabella = [];
  
  for (var i = 0; i < righeFiltrate.length; i++) {
    var riga = righeFiltrate[i];
    righeTabella.push([
      riga.gruppo,
      gruppoToCapitolo[riga.gruppo] || 'N/A',
      riga.zadankai_m_tot || 0,
      riga.zadankai_s_tot || 0,
      riga.zadankai_o_tot || 0,
      riga.praticanti_m_tot || 0,
      riga.praticanti_s_tot || 0
    ]);
  }
  
  doc.autoTable({
    head: intestazioni,
    body: righeTabella,
    startY: 40,
    styles: { fontSize: 8 }
  });
  
  var nomeFile = 'statistiche_hombu9_' + 
                 (anno || 'tutti_anni') + '_' + 
                 (mese || 'tutti_mesi') + '.pdf';
  
  doc.save(nomeFile);
}

// 🔹 Stampa
function stampa() {
  window.print();
}

// 🔹 Logout
function logout() {
  auth.signOut().then(function() {
    console.log('✅ Logout effettuato');
    window.location.href = 'index.html';
  }).catch(function(error) {
    console.error('❌ Errore logout:', error);
    alert('Errore durante il logout');
  });
}

// 🔹 Event Listeners
document.addEventListener("DOMContentLoaded", function() {
  // Controllo autenticazione
  auth.onAuthStateChanged(function(user) {
    if (user) {
      console.log("✅ Utente autenticato:", user.email);
      caricaDati();
      
      // Event listeners
      btnApplicaFiltri.addEventListener('click', function() {
        aggiornaTabella();
        aggiornaStatistiche();
      });
      
      btnResetFiltri.addEventListener('click', function() {
        filtroAnno.value = '';
        filtroMese.value = '';
        filtroCapitolo.value = '';
        filtroGruppo.value = '';
        aggiornaTabella();
        aggiornaStatistiche();
      });
      
      btnExportExcel.addEventListener('click', esportaExcel);
      btnExportPdf.addEventListener('click', esportaPdf);
      btnPrint.addEventListener('click', stampa);
      document.getElementById('logoutBtn').addEventListener('click', logout);
      
    } else {
      console.warn("⛔ Nessun utente loggato, reindirizzo...");
      window.location.href = "index.html";
    }
  });
});