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
  
  // Prima carica i gruppi dal file JSON locale
  var xhr1 = new XMLHttpRequest();
  xhr1.open('GET', 'gruppi.json', true);
  xhr1.onreadystatechange = function() {
    if (xhr1.readyState === 4 && xhr1.status === 200) {
      try {
        gruppiData = JSON.parse(xhr1.responseText);
        var struttura = gruppiData["HOMBU 9"];
        
        // Costruisci mappa gruppo -> capitolo
        for (var capitolo in struttura) {
          if (struttura.hasOwnProperty(capitolo)) {
            var settori = struttura[capitolo];
            for (var settore in settori) {
              if (settori.hasOwnProperty(settore)) {
                var gruppi = settori[settore];
                if (Array.isArray(gruppi)) {
                  for (var i = 0; i < gruppi.length; i++) {
                    gruppoToCapitolo[gruppi[i]] = capitolo;
                  }
                }
              }
            }
          }
        }
        
        console.log("✅ Gruppi caricati dal JSON:", Object.keys(struttura).length, "capitoli");
        
        // Poi carica i dati da Firebase
        caricaDatiFirebase();
        
      } catch (error) {
        console.error("❌ Errore nel parsing gruppi.json:", error);
        alert("Errore nel caricamento dei gruppi: " + error.message);
      }
    } else if (xhr1.readyState === 4) {
      console.error("❌ Errore nel caricamento gruppi.json:", xhr1.status);
      alert("Errore nel caricamento del file gruppi.json");
    }
  };
  xhr1.send();
}

// Nuova funzione per caricare solo i dati da Firebase
function caricaDatiFirebase() {
  database.ref('zadankai').once('value')
    .then(function(snapshot) {
      var dati = snapshot.val();
      if (dati) {
        righe = [];
        
        for (var key in dati) {
          if (dati.hasOwnProperty(key)) {
            var parti = key.split("-");
            var anno = parti[0];
            var mese = parti[1];
            var gruppo = parti[2];
            var sezioni = dati[key];
            
            // Zadankai
            if (sezioni.zadankai) {
              for (var categoria in sezioni.zadankai) {
                if (sezioni.zadankai.hasOwnProperty(categoria)) {
                  var r = sezioni.zadankai[categoria];
                  righe.push({
                    anno: anno,
                    mese: mese,
                    gruppo: gruppo,
                    tipo: "ZADANKAI",
                    sezione: categoria,
                    U: r.U || 0,
                    D: r.D || 0,
                    GU: r.GU || 0,
                    GD: r.GD || 0,
                    FUT: r.FUT || 0,
                    STU: r.STU || 0
                  });
                }
              }
            }
            
            // Praticanti
            if (sezioni.praticanti) {
              for (var categoria in sezioni.praticanti) {
                if (sezioni.praticanti.hasOwnProperty(categoria)) {
                  var r = sezioni.praticanti[categoria];
                  righe.push({
                    anno: anno,
                    mese: mese,
                    gruppo: gruppo,
                    tipo: "PRATICANTI",
                    sezione: categoria,
                    U: r.U || 0,
                    D: r.D || 0,
                    GU: r.GU || 0,
                    GD: r.GD || 0,
                    FUT: r.FUT || 0,
                    STU: r.STU || 0
                  });
                }
              }
            }
          }
        }
        
        console.log("✅ Dati caricati:", righe.length, "righe");
        
        // Inizializza filtri e tabella
        inizializzaFiltri();
        aggiornaTabella();
        aggiornaStatistiche();
        
      } else {
        throw new Error('Nessun dato trovato');
      }
    })
    .catch(function(error) {
      console.error("❌ Errore nel caricamento:", error);
      alert("Errore nel caricamento dei dati: " + error.message);
    });
}

// 🔹 Inizializza i filtri
function inizializzaFiltri() {
  console.log("🔍 Inizializzazione filtri...");
  console.log("📊 Righe disponibili:", righe.length);
  console.log("📋 Esempio prima riga:", righe[0]);
  console.log("🗂️ GruppoToCapitolo:", gruppoToCapitolo);
  
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
  
  console.log("📅 Anni trovati:", anni);
  console.log("📆 Mesi trovati:", mesi);
  console.log("📖 Capitoli trovati:", capitoli);
  console.log("👥 Gruppi trovati:", gruppi);
  
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
  tbody.innerHTML = "";
  var anno = filtroAnno.value;
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;
  var mesePrec = mesePrecedente(mese, anno);
  var annoPrec = mesePrec.anno;
  var mesePrecedente = mesePrec.mese;

  console.log("🔍 Filtri applicati:", { anno: anno, mese: mese, capitolo: capitolo });

  // Filtra le righe in base ai filtri selezionati
  var righeFiltrate = righe.filter(function(r) {
    return r.anno === anno &&
           r.mese === mese &&
           gruppoToCapitolo[r.gruppo] === capitolo;
  });

  console.log("🔍 Righe filtrate:", righeFiltrate.length);

  // Ottieni la struttura dei settori e gruppi
  var settorePerGruppo = {};
  var strutturaCapitolo = gruppiData["HOMBU 9"][capitolo];
  for (var settore in strutturaCapitolo) {
    if (strutturaCapitolo.hasOwnProperty(settore)) {
      var listaGruppi = strutturaCapitolo[settore];
      for (var i = 0; i < listaGruppi.length; i++) {
        settorePerGruppo[listaGruppi[i]] = settore;
      }
    }
  }
  
  // Raggruppa i gruppi per settore e ordina alfabeticamente
  var gruppiPresenti = [];
  var gruppiVisti = {};
  for (var i = 0; i < righeFiltrate.length; i++) {
    var gruppo = righeFiltrate[i].gruppo;
    if (!gruppiVisti[gruppo]) {
      gruppiPresenti.push(gruppo);
      gruppiVisti[gruppo] = true;
    }
  }
  
  // Crea una mappa settore -> gruppi ordinati alfabeticamente
  var gruppiPerSettore = {};
  for (var i = 0; i < gruppiPresenti.length; i++) {
    var gruppo = gruppiPresenti[i];
    var settore = settorePerGruppo[gruppo];
    if (!gruppiPerSettore[settore]) {
      gruppiPerSettore[settore] = [];
    }
    gruppiPerSettore[settore].push(gruppo);
  }
  
  // Ordina i settori alfabeticamente e i gruppi all'interno di ogni settore
  var settoriOrdinati = Object.keys(gruppiPerSettore).sort();
  var gruppiOrdinati = [];
  for (var i = 0; i < settoriOrdinati.length; i++) {
    var settore = settoriOrdinati[i];
    gruppiPerSettore[settore].sort();
    gruppiOrdinati = gruppiOrdinati.concat(gruppiPerSettore[settore]);
  }

  var settoreCorrente = null;
  
  // Genera la tabella
  for (var groupIndex = 0; groupIndex < gruppiOrdinati.length; groupIndex++) {
    var gruppo = gruppiOrdinati[groupIndex];
    var settore = settorePerGruppo[gruppo];
    
    // Intestazione settore
    if (settore !== settoreCorrente) {
      // Riga separatrice settore
      var separatore = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 12;
      td.textContent = "Settore: " + settore;
      td.className = "bg-secondary text-white fw-bold text-center";
      separatore.appendChild(td);
      tbody.appendChild(separatore);
    
      // Intestazione tabella
      var headerRow = document.createElement("tr");
      var headers = [
        "Nome Gruppo", "Categoria", "Sezione", "U", "D", "GU", "GD",
        "Somma", "Prec.", "Totale Gruppo", "Futuro", "Studenti"
      ];
      for (var h = 0; h < headers.length; h++) {
        var th = document.createElement("th");
        th.textContent = headers[h];
        th.className = "bg-light";
        headerRow.appendChild(th);
      }
      tbody.appendChild(headerRow);
    
      settoreCorrente = settore;
    }
    
    // Righe dei dati per gruppo
    var righeGruppo = righeFiltrate.filter(function(r) { return r.gruppo === gruppo; });
    var gruppoStampato = false;
    var tipoStampati = {};
    var totaleStampati = {};
    var primaRigaGruppo = true;
  
    var tipi = ["ZADANKAI", "PRATICANTI"];
    for (var t = 0; t < tipi.length; t++) {
      var tipo = tipi[t];
      var righeCategoria = righeGruppo.filter(function(r) { return r.tipo === tipo; });
  
      if (righeCategoria.length === 0) continue;
  
      // Ordina sezioni ZADANKAI
      if (tipo === "ZADANKAI") {
        var sezioniOrdinate = ["membri", "simpatizzanti", "ospiti"];
        righeCategoria.sort(function(a, b) {
          return sezioniOrdinate.indexOf(a.sezione) - sezioniOrdinate.indexOf(b.sezione);
        });
      }
  
      var totaleCategoria = 0;
      for (var i = 0; i < righeCategoria.length; i++) {
        var r = righeCategoria[i];
        totaleCategoria += r.U + r.D + r.GU + r.GD;
      }
  
      var righePrec = righe.filter(function(r) {
        return r.anno === annoPrec &&
               r.mese === mesePrecedente &&
               r.gruppo === gruppo &&
               r.tipo === tipo;
      });
  
      var totalePrec = 0;
      for (var i = 0; i < righePrec.length; i++) {
        var r = righePrec[i];
        totalePrec += r.U + r.D + r.GU + r.GD;
      }
      var delta = totaleCategoria - totalePrec;
  
      for (var index = 0; index < righeCategoria.length; index++) {
        var r = righeCategoria[index];
        var somma = r.U + r.D + r.GU + r.GD;
        var righePrecSezione = righePrec.filter(function(x) { return x.sezione === r.sezione; });
        var sommaPrec = 0;
        for (var i = 0; i < righePrecSezione.length; i++) {
          var x = righePrecSezione[i];
          sommaPrec += x.U + x.D + x.GU + x.GD;
        }
  
        var tr = document.createElement("tr");
        tr.className = tipo === "ZADANKAI" ? "zadankai" : "praticanti";
        
        // Applica bordo più spesso per separare i gruppi
        if (primaRigaGruppo && index === 0 && gruppo !== gruppiOrdinati[0]) {
          tr.style.borderTop = BORDER_CONFIG.getHorizontalBorder();
        }
  
        var colIndex = 0;
  
        // Nome Gruppo
        if (!gruppoStampato && index === 0) {
          var tdGruppo = document.createElement("td");
          tdGruppo.textContent = gruppo;
          tdGruppo.rowSpan = righeGruppo.length;
          tdGruppo.className = "nome-gruppo";
          tr.appendChild(tdGruppo);
          gruppoStampato = true;
        }
        colIndex++;
  
        // Categoria
        if (!tipoStampati[tipo]) {
          var tdTipo = document.createElement("td");
          tdTipo.textContent = tipo;
          tdTipo.rowSpan = righeCategoria.length;
          tr.appendChild(tdTipo);
          tipoStampati[tipo] = true;
        }
        colIndex++;
  
        // Dati ordinati con bordi neri applicati direttamente
        var celle = [
          r.sezione, r.U, r.D, r.GU, r.GD,
          somma,
          sommaPrec
        ];
  
        for (var i = 0; i < celle.length; i++) {
          var val = celle[i];
          var td = document.createElement("td");
          td.textContent = val;
          
          // Applica bordi neri per le colonne specifiche
          var currentCol = colIndex + i + 1;
          if (currentCol === 4) { // Separazione tra Sezione e U
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (currentCol === 8) { // Separazione tra GD e Somma
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (currentCol === 10) { // Separazione tra Prec. e Totale Gruppo
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          }

          // Applica grassetto alla colonna Somma (indice 5 nell'array celle)
          if (i === 5) {
            td.style.fontWeight = "bold";
          }
          
          tr.appendChild(td);
        }
        colIndex += celle.length;
  
        // Totale categoria
        if (!totaleStampati[tipo]) {
          var tdTot = document.createElement("td");
          tdTot.rowSpan = righeCategoria.length;
          tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          tdTot.innerHTML = 
            '<div style="font-size: 1.2em;"><strong>' + totaleCategoria + '</strong></div>' +
            '<div class="small">Prec: ' + totalePrec + '</div>' +
            '<div class="' + (delta >= 0 ? 'text-success' : 'text-danger') + ' fw-bold">' +
            'Δ ' + (delta >= 0 ? "+" : "") + delta +
            '</div>';
          tr.appendChild(tdTot);
          totaleStampati[tipo] = true;
        }
        colIndex++;
  
        // Futuro e Studenti
        var tdFuturo = document.createElement("td");
        tdFuturo.textContent = r.FUT;
        tdFuturo.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        tr.appendChild(tdFuturo);
        
        var tdStudenti = document.createElement("td");
        tdStudenti.textContent = r.STU;
        tr.appendChild(tdStudenti);
  
        tbody.appendChild(tr);
        
        if (primaRigaGruppo && index === 0) {
          primaRigaGruppo = false;
        }
      }
    }
  }

  // Aggiorna le altre sezioni
  mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo);
  // generaRiepiloghiCapitoloESettori(righeFiltrate, mese, anno, mesePrecedente, annoPrec, capitolo);
  // aggiornaGrafici(righeFiltrate, anno, mese, capitolo, annoPrec, mesePrecedente);
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
