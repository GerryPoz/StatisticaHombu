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
  
  // Prima carica i gruppi dal JSON
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'gruppi.json', true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          gruppiData = JSON.parse(xhr.responseText);
          
          // Popola la mappa gruppoToCapitolo
          for (var hombu in gruppiData) {
            for (var capitolo in gruppiData[hombu]) {
              for (var settore in gruppiData[hombu][capitolo]) {
                var gruppi = gruppiData[hombu][capitolo][settore];
                for (var i = 0; i < gruppi.length; i++) {
                  gruppoToCapitolo[gruppi[i]] = capitolo;
                }
              }
            }
          }
          
          console.log("✅ Gruppi caricati dal JSON:", Object.keys(gruppiData.HOMBU || {}).length, "capitoli");
          
          // Ora carica i dati da Firebase
          caricaDatiFirebase();
          
        } catch (e) {
          console.error("❌ Errore nel parsing del JSON gruppi:", e);
          // Continua comunque con Firebase
          caricaDatiFirebase();
        }
      } else {
        console.error("❌ Errore nel caricamento gruppi.json:", xhr.status);
        // Continua comunque con Firebase
        caricaDatiFirebase();
      }
    }
  };
  xhr.send();
}

function caricaDatiFirebase() {
    console.log("🔄 Caricamento dati da Firebase Realtime Database...");
    
    // Usa Realtime Database invece di Firestore
    database.ref('zadankai').once('value').then(function(snapshot) {
        righe = [];
        
        snapshot.forEach(function(childSnapshot) {
            var data = childSnapshot.val();
            
            // Converti i dati dal formato Realtime Database
            righe.push({
                id: childSnapshot.key,
                anno: parseInt(data.anno) || 0,
                mese: parseInt(data.mese) || 0,
                gruppo: data.gruppo || '',
                tipo: data.tipo || 'ZADANKAI',
                sezione: data.sezione || 'membri',
                
                // Valori numerici
                totaleGruppo: parseInt(data.totaleGruppo) || 0,
                futuro: parseInt(data.futuro) || 0,
                studenti: parseInt(data.studenti) || 0,
                
                // Settore per il raggruppamento
                settore: data.settore || 'Non specificato',
                
                // Altri campi se presenti
                note: data.note || '',
                dataInserimento: data.dataInserimento || new Date().toISOString()
            });
        });
        
        console.log("✅ Dati caricati:", righe.length, "righe");
        
        // Inizializza i filtri e aggiorna la visualizzazione
        inizializzaFiltri();
        aggiornaTabella();
        aggiornaStatistiche();
        
    }).catch(function(error) {
        console.error("❌ Errore nel caricamento da Realtime Database:", error);
        alert("Errore nel caricamento dei dati: " + error.message);
    });
}
    
    console.log("✅ Dati caricati:", righe.length, "righe");
    
    // Inizializza i filtri e aggiorna la visualizzazione
    inizializzaFiltri();
    aggiornaTabella();
    aggiornaStatistiche();
    
  }).catch(function(error) {
    console.error("❌ Errore nel caricamento:", error);
  });
}

// 🔹 Inizializza i filtri
function inizializzaFiltri() {
  console.log("🔍 Inizializzazione filtri...");
  console.log("📊 Righe disponibili:", righe.length);
  console.log("📋 Esempio prima riga:", righe[0]);
  console.log("🗂️ GruppoToCapitolo:", gruppoToCapitolo);
  
  // Estrai valori unici per i filtri
  var anni = [];
  var mesi = [];
  var capitoli = [];
  var gruppi = [];
  
  for (var i = 0; i < righe.length; i++) {
    var riga = righe[i];
    
    if (riga.anno && anni.indexOf(riga.anno) === -1) {
      anni.push(riga.anno);
    }
    
    if (riga.mese && mesi.indexOf(riga.mese) === -1) {
      mesi.push(riga.mese);
    }
    
    if (riga.gruppo && gruppi.indexOf(riga.gruppo) === -1) {
      gruppi.push(riga.gruppo);
    }
    
    var cap = gruppoToCapitolo[riga.gruppo];
    if (cap && capitoli.indexOf(cap) === -1) {
      capitoli.push(cap);
    }
  }
  
  // Ordina gli array
  anni.sort();
  mesi.sort(function(a, b) {
    return mesiOrdine.indexOf(a) - mesiOrdine.indexOf(b);
  });
  capitoli.sort();
  gruppi.sort();
  
  console.log("📅 Anni trovati:", anni);
  console.log("📆 Mesi trovati:", mesi);
  console.log("📖 Capitoli trovati:", capitoli);
  console.log("👥 Gruppi trovati:", gruppi);
  
  // Popola i select
  popolaSelect(filtroAnno, anni);
  popolaSelect(filtroMese, mesi);
  popolaSelect(filtroCapitolo, capitoli);
  popolaSelect(filtroGruppo, gruppi);
}

// 🔹 Popola un elemento select
function popolaSelect(selectElement, valori) {
  // Mantieni la prima opzione ("Tutti")
  var primaOpzione = selectElement.firstElementChild;
  selectElement.innerHTML = '';
  if (primaOpzione) {
    selectElement.appendChild(primaOpzione);
  }
  
  // Aggiungi le nuove opzioni
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
  
  // Raggruppa per settore
  var settori = {};
  
  for (var i = 0; i < righeFiltrate.length; i++) {
    var riga = righeFiltrate[i];
    var cap = gruppoToCapitolo[riga.gruppo] || 'Sconosciuto';
    
    // Trova il settore per questo gruppo
    var settore = 'Sconosciuto';
    if (gruppiData && gruppiData.HOMBU && gruppiData.HOMBU[cap]) {
      for (var s in gruppiData.HOMBU[cap]) {
        if (gruppiData.HOMBU[cap][s].indexOf(riga.gruppo) !== -1) {
          settore = s;
          break;
        }
      }
    }
    
    if (!settori[settore]) {
      settori[settore] = {};
    }
    if (!settori[settore][riga.gruppo]) {
      settori[settore][riga.gruppo] = [];
    }
    settori[settore][riga.gruppo].push(riga);
  }
  
  // Genera intestazioni se non esistono
  var tabella = document.getElementById('tabella-dati');
  if (!tabella.querySelector('thead')) {
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    
    var intestazioni = [
      'Gruppo', 'ZADANKAI', '', '', '', '', 'PRATICANTI', '', 'Totale Gruppo', 'Futuro', 'Studenti'
    ];
    
    var subIntestazioni = [
      '', 'Membri', 'Simpatizzanti', 'Ospiti', 'Totale', 'Δ', 'Membri', 'Simpatizzanti', '', '', ''
    ];
    
    // Prima riga di intestazioni
    for (var i = 0; i < intestazioni.length; i++) {
      var th = document.createElement('th');
      th.textContent = intestazioni[i];
      th.className = 'text-center';
      if (i === 0) th.rowSpan = 2;
      else if (i === 8 || i === 9 || i === 10) th.rowSpan = 2;
      else if (i === 1) th.colSpan = 5;
      else if (i === 6) th.colSpan = 2;
      headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    
    // Seconda riga di intestazioni
    var subHeaderRow = document.createElement('tr');
    for (var i = 1; i < subIntestazioni.length - 3; i++) {
      var th = document.createElement('th');
      th.textContent = subIntestazioni[i];
      th.className = 'text-center';
      subHeaderRow.appendChild(th);
    }
    
    thead.appendChild(subHeaderRow);
    tabella.insertBefore(thead, tabella.firstChild);
  }
  
  // Ordina settori
  var nomiSettori = Object.keys(settori).sort();
  
  for (var s = 0; s < nomiSettori.length; s++) {
    var nomeSettore = nomiSettori[s];
    var gruppiSettore = settori[nomeSettore];
    
    // Intestazione settore
    var trSettore = document.createElement('tr');
    trSettore.style.backgroundColor = '#f8f9fa';
    var tdSettore = document.createElement('td');
    tdSettore.colSpan = 11;
    tdSettore.innerHTML = '<strong>' + nomeSettore + '</strong>';
    tdSettore.style.borderTop = BORDER_CONFIG.getHorizontalBorder();
    trSettore.appendChild(tdSettore);
    tbody.appendChild(trSettore);
    
    // Ordina gruppi nel settore
    var nomiGruppi = Object.keys(gruppiSettore).sort();
    
    var totaleSettoreMembri = 0, totaleSettoreSimp = 0, totaleSettoreOspiti = 0;
    var totaleSettorePratMembri = 0, totaleSettorePratSimp = 0;
    var totaleSettoreFuturo = 0, totaleSettoreStudenti = 0;
    
    for (var g = 0; g < nomiGruppi.length; g++) {
      var nomeGruppo = nomiGruppi[g];
      var righeGruppo = gruppiSettore[nomeGruppo];
      
      // Somma i valori per il gruppo
      var totMembri = 0, totSimp = 0, totOspiti = 0;
      var totPratMembri = 0, totPratSimp = 0;
      var totFuturo = 0, totStudenti = 0;
      
      for (var r = 0; r < righeGruppo.length; r++) {
        var riga = righeGruppo[r];
        totMembri += riga.zadankai_m_tot || 0;
        totSimp += riga.zadankai_s_tot || 0;
        totOspiti += riga.zadankai_o_tot || 0;
        totPratMembri += riga.praticanti_m_tot || 0;
        totPratSimp += riga.praticanti_s_tot || 0;
        totFuturo += riga.futuro || 0;
        totStudenti += riga.studenti || 0;
      }
      
      // Calcola delta (differenza con mese precedente)
      var delta = 0;
      if (mese && anno) {
        var mesePrec = mesePrecedente(mese, parseInt(anno));
        var righeMesePrec = righe.filter(function(r) {
          return r.mese === mesePrec.mese && 
                 r.anno == mesePrec.anno &&
                 r.gruppo === nomeGruppo;
        });
        
        var totPrecedente = 0;
        for (var rp = 0; rp < righeMesePrec.length; rp++) {
          totPrecedente += (righeMesePrec[rp].zadankai_m_tot || 0) + 
                          (righeMesePrec[rp].zadankai_s_tot || 0) + 
                          (righeMesePrec[rp].zadankai_o_tot || 0);
        }
        
        delta = (totMembri + totSimp + totOspiti) - totPrecedente;
      }
      
      // Crea riga gruppo
      var trGruppo = document.createElement('tr');
      
      var valori = [
        nomeGruppo,
        totMembri,
        totSimp,
        totOspiti,
        totMembri + totSimp + totOspiti,
        delta > 0 ? '+' + delta : delta,
        totPratMembri,
        totPratSimp,
        totMembri + totSimp + totOspiti + totPratMembri + totPratSimp,
        totFuturo,
        totStudenti
      ];
      
      for (var v = 0; v < valori.length; v++) {
        var td = document.createElement('td');
        td.textContent = valori[v];
        td.className = 'text-center';
        
        // Bordi verticali
        if (v === 0 || v === 5 || v === 8) {
          td.style.borderRight = BORDER_CONFIG.getVerticalBorder();
        }
        
        // Colore delta
        if (v === 5) {
          if (delta > 0) td.style.color = 'green';
          else if (delta < 0) td.style.color = 'red';
        }
        
        // Grassetto per totale gruppo
        if (v === 8) {
          td.style.fontWeight = 'bold';
        }
        
        trGruppo.appendChild(td);
      }
      
      tbody.appendChild(trGruppo);
      
      // Aggiungi ai totali settore
      totaleSettoreMembri += totMembri;
      totaleSettoreSimp += totSimp;
      totaleSettoreOspiti += totOspiti;
      totaleSettorePratMembri += totPratMembri;
      totaleSettorePratSimp += totPratSimp;
      totaleSettoreFuturo += totFuturo;
      totaleSettoreStudenti += totStudenti;
    }
    
    // Riga totale settore
    var trTotaleSettore = document.createElement('tr');
    trTotaleSettore.style.backgroundColor = '#e9ecef';
    trTotaleSettore.style.fontWeight = 'bold';
    
    var valoriTotale = [
      'TOTALE ' + nomeSettore,
      totaleSettoreMembri,
      totaleSettoreSimp,
      totaleSettoreOspiti,
      totaleSettoreMembri + totaleSettoreSimp + totaleSettoreOspiti,
      '',
      totaleSettorePratMembri,
      totaleSettorePratSimp,
      totaleSettoreMembri + totaleSettoreSimp + totaleSettoreOspiti + totaleSettorePratMembri + totaleSettorePratSimp,
      totaleSettoreFuturo,
      totaleSettoreStudenti
    ];
    
    for (var vt = 0; vt < valoriTotale.length; vt++) {
      var tdTot = document.createElement('td');
      tdTot.textContent = valoriTotale[vt];
      tdTot.className = 'text-center';
      
      // Bordi
      if (vt === 0 || vt === 5 || vt === 8) {
        tdTot.style.borderRight = BORDER_CONFIG.getVerticalBorder();
      }
      tdTot.style.borderBottom = BORDER_CONFIG.getHorizontalBorder();
      
      trTotaleSettore.appendChild(tdTot);
    }
    
    tbody.appendChild(trTotaleSettore);
  }
  
  // Aggiorna grafici
  aggiornaGrafici(righeFiltrate, anno, mese, capitolo);
  
  // Mostra gruppi mancanti
  mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo);
}

// 🔹 Aggiorna le statistiche
function aggiornaStatistiche() {
  var anno = filtroAnno.value;
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;
  
  var righeFiltrate = righe.filter(function(riga) {
    return (!anno || riga.anno == anno) &&
           (!mese || riga.mese === mese) &&
           (!capitolo || gruppoToCapitolo[riga.gruppo] === capitolo);
  });
  
  var totMembri = 0, totSimp = 0, totOspiti = 0;
  var totPratMembri = 0, totPratSimp = 0;
  
  for (var i = 0; i < righeFiltrate.length; i++) {
    var riga = righeFiltrate[i];
    totMembri += riga.zadankai_m_tot || 0;
    totSimp += riga.zadankai_s_tot || 0;
    totOspiti += riga.zadankai_o_tot || 0;
    totPratMembri += riga.praticanti_m_tot || 0;
    totPratSimp += riga.praticanti_s_tot || 0;
  }
  
  // Aggiorna elementi statistiche se esistono
  var elemTotMembri = document.getElementById('stat-membri');
  var elemTotSimp = document.getElementById('stat-simpatizzanti');
  var elemTotOspiti = document.getElementById('stat-ospiti');
  
  if (elemTotMembri) elemTotMembri.textContent = totMembri;
  if (elemTotSimp) elemTotSimp.textContent = totSimp;
  if (elemTotOspiti) elemTotOspiti.textContent = totOspiti;
}

// 🔹 Mostra gruppi mancanti
function mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo) {
  if (!anno || !mese) return;
  
  var gruppiPresenti = [];
  for (var i = 0; i < righeFiltrate.length; i++) {
    var gruppo = righeFiltrate[i].gruppo;
    if (gruppiPresenti.indexOf(gruppo) === -1) {
      gruppiPresenti.push(gruppo);
    }
  }
  
  var tuttiGruppi = [];
  if (capitolo) {
    // Solo gruppi del capitolo selezionato
    for (var gruppo in gruppoToCapitolo) {
      if (gruppoToCapitolo[gruppo] === capitolo) {
        tuttiGruppi.push(gruppo);
      }
    }
  } else {
    // Tutti i gruppi
    tuttiGruppi = Object.keys(gruppoToCapitolo);
  }
  
  var gruppiMancanti = [];
  for (var i = 0; i < tuttiGruppi.length; i++) {
    if (gruppiPresenti.indexOf(tuttiGruppi[i]) === -1) {
      gruppiMancanti.push(tuttiGruppi[i]);
    }
  }
  
  var elemGruppiMancanti = document.getElementById('gruppi-mancanti');
  if (elemGruppiMancanti) {
    if (gruppiMancanti.length > 0) {
      elemGruppiMancanti.innerHTML = '<strong>Gruppi senza dati:</strong> ' + gruppiMancanti.join(', ');
      elemGruppiMancanti.style.display = 'block';
    } else {
      elemGruppiMancanti.style.display = 'none';
    }
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
  if (chartZadankai) {
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
  }
  
  // Grafico confronto mensile (se abbiamo mese e anno)
  if (mese && anno && chartConfronto) {
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
        datasets: [{
          label: mesePrec.mese + ' ' + mesePrec.anno,
          data: [totPrecMembri, totPrecSimp],
          backgroundColor: '#6c757d'
        }, {
          label: mese + ' ' + anno,
          data: [totCorrenteMembri, totCorrenteSimp],
          backgroundColor: '#007bff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}

// 🔹 Esporta in Excel
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
  
  // Crea il workbook
  var wb = XLSX.utils.book_new();
  
  // Prepara i dati per l'export
  var datiExport = [];
  
  // Intestazioni
  datiExport.push([
    'Gruppo', 'Capitolo', 'Mese', 'Anno',
    'Z-Membri U', 'Z-Membri D', 'Z-Membri GU', 'Z-Membri GD', 'Z-Membri TOT',
    'Z-Simp U', 'Z-Simp D', 'Z-Simp GU', 'Z-Simp GD', 'Z-Simp TOT',
    'Z-Ospiti U', 'Z-Ospiti D', 'Z-Ospiti GU', 'Z-Ospiti GD', 'Z-Ospiti TOT',
    'P-Membri TOT', 'P-Simp TOT', 'Futuro', 'Studenti'
  ]);
  
  // Dati
  for (var i = 0; i < righeFiltrate.length; i++) {
    var riga = righeFiltrate[i];
    datiExport.push([
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
      riga.praticanti_s_tot || 0,
      riga.futuro || 0,
      riga.studenti || 0
    ]);
  }
  
  // Crea il worksheet
  var ws = XLSX.utils.aoa_to_sheet(datiExport);
  
  // Aggiungi il worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Statistiche');
  
  // Genera il nome del file
  var nomeFile = 'statistiche';
  if (anno) nomeFile += '_' + anno;
  if (mese) nomeFile += '_' + mese;
  if (capitolo) nomeFile += '_' + capitolo.replace(/\s+/g, '_');
  if (gruppo) nomeFile += '_' + gruppo;
  nomeFile += '.xlsx';
  
  // Scarica il file
  XLSX.writeFile(wb, nomeFile);
}

// 🔹 Esporta in PDF
function esportaPdf() {
  var elemento = document.getElementById('tabella-dati');
  
  var opt = {
    margin: 1,
    filename: 'statistiche.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
  };
  
  html2pdf().set(opt).from(elemento).save();
}

// 🔹 Stampa
function stampa() {
  window.print();
}

// 🔹 Logout
function logout() {
  auth.signOut().then(function() {
    console.log("👋 Logout effettuato");
    window.location.href = "index.html";
  }).catch(function(error) {
    console.error("❌ Errore durante il logout:", error);
  });
}

// 🔹 Inizializzazione
document.addEventListener("DOMContentLoaded", function() {
  // Controllo autenticazione
  auth.onAuthStateChanged(function(user) {
    if (user) {
      console.log("✅ Utente autenticato:", user.email);
      caricaDati();
      
      // Event listeners
      if (btnApplicaFiltri) {
        btnApplicaFiltri.addEventListener('click', function() {
          aggiornaTabella();
          aggiornaStatistiche();
        });
      }
      
      if (btnResetFiltri) {
        btnResetFiltri.addEventListener('click', function() {
          filtroAnno.value = '';
          filtroMese.value = '';
          filtroCapitolo.value = '';
          filtroGruppo.value = '';
          aggiornaTabella();
          aggiornaStatistiche();
        });
      }
      
      if (btnExportExcel) btnExportExcel.addEventListener('click', esportaExcel);
      if (btnExportPdf) btnExportPdf.addEventListener('click', esportaPdf);
      if (btnPrint) btnPrint.addEventListener('click', stampa);
      
      var logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) logoutBtn.addEventListener('click', logout);
      
    } else {
      console.warn("⛔ Nessun utente loggato, reindirizzo...");
      window.location.href = "index.html";
    }
  });
});
