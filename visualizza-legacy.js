// 🔹 Configurazione bordi
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
  getVerticalBorder: function() {
    return this.vertical.thickness + " " + this.vertical.style + " " + this.vertical.color;
  },
  getHorizontalBorder: function() {
    return this.horizontal.thickness + " " + this.horizontal.style + " " + this.horizontal.color;
  }
};

// 🔹 Variabili globali
var database;
var filtroAnno = document.getElementById("filtro-anno");
var filtroMese = document.getElementById("filtro-mese");
var filtroCapitolo = document.getElementById("filtro-capitolo");
var tbody = document.querySelector("#tabella-dati tbody");
var btnExportExcel = document.getElementById("btn-export-excel");
var btnExportPdf = document.getElementById("btn-export-pdf");
var btnPrint = document.getElementById("btn-print");
var chartCategorie = document.getElementById("chart-categorie");
var chartConfronto = document.getElementById("chart-confronto");

var mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

// 🔹 Dati globali
var righe = [];
var gruppoToCapitolo = {};
var gruppiData;
var graficoCategorieInstance = null;
var graficoConfrontoInstance = null;

// 🔹 Funzione per calcolare il mese precedente
function mesePrecedente(mese, anno) {
  var indiceMese = mesiOrdine.indexOf(mese);
  if (indiceMese > 0) {
    return { mese: mesiOrdine[indiceMese - 1], anno: anno };
  } else {
    return { mese: "Dicembre", anno: (parseInt(anno) - 1).toString() };
  }
}

// 🔹 Carica dati da gruppi.json
function caricaDati() {
  fetch("gruppi.json")
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Errore nel caricamento di gruppi.json: " + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      console.log("📁 Dati gruppi caricati:", data);
      gruppiData = data;
      
      // Popola gruppoToCapitolo e filtro capitolo
      var struttura = gruppiData["HOMBU 9"];
      for (var capitolo in struttura) {
        var settori = struttura[capitolo];
        for (var settore in settori) {
          var gruppi = settori[settore];
          for (var i = 0; i < gruppi.length; i++) {
            gruppoToCapitolo[gruppi[i]] = capitolo;
          }
        }
        
        var option = document.createElement("option");
        option.value = capitolo;
        option.textContent = capitolo;
        filtroCapitolo.appendChild(option);
      }
      
      console.log("🗂️ Mapping gruppo->capitolo:", gruppoToCapitolo);
      
      // Carica dati da Firebase
      caricaDatiFirebase();
    })
    .catch(function(error) {
      console.error("❌ Errore caricamento gruppi.json:", error);
      alert("Errore nel caricamento dei dati dei gruppi: " + error.message);
    });
}

// 🔹 Carica dati da Firebase
function caricaDatiFirebase() {
  console.log("🔥 Caricamento dati da Firebase...");
  
  database.ref('zadankai').once('value')
    .then(function(snapshot) {
      if (!snapshot.exists()) {
        console.log("⚠️ Nessun dato trovato in Firebase");
        return;
      }
      
      var dati = snapshot.val();
      console.log("📊 Dati Firebase ricevuti:", Object.keys(dati).length, "record");
      
      righe = [];
      
      // Elabora i dati da Firebase
      for (var key in dati) {
        var parti = key.split("-");
        var anno = parti[0];
        var mese = parti[1];
        var gruppo = parti[2];
        var sezioni = dati[key];
        
        // Zadankai
        if (sezioni.zadankai) {
          for (var categoria in sezioni.zadankai) {
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
        
        // Praticanti
        if (sezioni.praticanti) {
          for (var categoria in sezioni.praticanti) {
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
              FUT: 0,
              STU: 0
            });
          }
        }
      }
      
      console.log("✅ Dati elaborati:", righe.length, "righe");
      
      inizializzaFiltri();
      aggiornaTabella();
      aggiornaStatistiche();
    })
    .catch(function(error) {
      console.error("❌ Errore caricamento Firebase:", error);
      alert("Errore nel caricamento dei dati da Firebase: " + error.message);
    });
}

// 🔹 Inizializza i filtri
function inizializzaFiltri() {
  var anni = [];
  var mesi = [];
  
  for (var i = 0; i < righe.length; i++) {
    var riga = righe[i];
    
    if (riga.anno && anni.indexOf(riga.anno) === -1) {
      anni.push(riga.anno);
    }
    
    if (riga.mese && mesi.indexOf(riga.mese) === -1) {
      mesi.push(riga.mese);
    }
  }
  
  // Ordina gli array
  anni.sort();
  mesi.sort(function(a, b) {
    return mesiOrdine.indexOf(a) - mesiOrdine.indexOf(b);
  });
  
  console.log("📅 Anni trovati:", anni);
  console.log("📆 Mesi trovati:", mesi);
  
  // Popola i filtri
  anni.forEach(function(anno) {
    var option = document.createElement("option");
    option.value = anno;
    option.textContent = anno;
    filtroAnno.appendChild(option);
  });
  
  mesiOrdine.forEach(function(mese) {
    if (mesi.indexOf(mese) !== -1) {
      var option = document.createElement("option");
      option.value = mese;
      option.textContent = mese;
      filtroMese.appendChild(option);
    }
  });
  
  // Aggiungi event listeners
  filtroAnno.addEventListener("change", aggiornaTabella);
  filtroMese.addEventListener("change", aggiornaTabella);
  filtroCapitolo.addEventListener("change", aggiornaTabella);
  
  if (btnExportExcel) btnExportExcel.addEventListener("click", esportaExcel);
  if (btnExportPdf) btnExportPdf.addEventListener("click", esportaPdf);
  if (btnPrint) btnPrint.addEventListener("click", stampa);
}

// 🔹 Aggiorna la tabella
function aggiornaTabella() {
  tbody.innerHTML = "";
  var anno = String(filtroAnno.value);
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;
  var meseAnnoPrec = mesePrecedente(mese, anno);
  var mesePrec = meseAnnoPrec.mese;
  var annoPrec = meseAnnoPrec.anno;
  
  // Filtra le righe in base ai filtri selezionati
  var righeFiltrate = righe.filter(function(r) {
    return String(r.anno) === String(anno) &&
           r.mese === mese &&
           gruppoToCapitolo[r.gruppo] === capitolo;
  });
  
  // Ottieni la struttura dei settori e gruppi
  var settorePerGruppo = {};
  var strutturaCapitolo = gruppiData["HOMBU 9"][capitolo];
  for (var settore in strutturaCapitolo) {
    var listaGruppi = strutturaCapitolo[settore];
    for (var i = 0; i < listaGruppi.length; i++) {
      settorePerGruppo[listaGruppi[i]] = settore;
    }
  }
  
  // Raggruppa i gruppi per settore e ordina alfabeticamente
  var gruppiPresenti = [];
  for (var i = 0; i < righeFiltrate.length; i++) {
    var gruppo = righeFiltrate[i].gruppo;
    if (gruppiPresenti.indexOf(gruppo) === -1) {
      gruppiPresenti.push(gruppo);
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
  
  if (righeFiltrate.length === 0) {
    var tr = document.createElement("tr");
    var td = document.createElement("td");
    td.colSpan = 12;
    td.textContent = "Nessun dato disponibile per i filtri selezionati";
    td.style.textAlign = "center";
    td.style.fontStyle = "italic";
    td.style.color = "#666";
    tr.appendChild(td);
    tbody.appendChild(tr);
    
    // Nascondi i riepiloghi
    document.getElementById("riepilogo-settori").innerHTML = "";
    document.getElementById("riepilogo-capitolo").innerHTML = "";
    
    return;
  }
  
  var settoreCorrente = null;
  
  // Genera la tabella
  for (var g = 0; g < gruppiOrdinati.length; g++) {
    var gruppo = gruppiOrdinati[g];
    var settore = settorePerGruppo[gruppo];
    
    // Intestazione settore
    if (settore !== settoreCorrente) {
      // Riga separatrice settore
      var separatore = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 12;
      td.textContent = "Settore: " + settore;
      td.style.backgroundColor = "#6c757d";
      td.style.color = "white";
      td.style.fontWeight = "bold";
      td.style.textAlign = "center";
      td.style.padding = "8px";
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
        th.style.backgroundColor = "#f8f9fa";
        th.style.fontWeight = "bold";
        th.style.textAlign = "center";
        th.style.padding = "8px";
        th.style.border = "1px solid #dee2e6";
        headerRow.appendChild(th);
      }
      tbody.appendChild(headerRow);
      
      settoreCorrente = settore;
    }
    
    // Righe dei dati per gruppo
    var righeGruppo = righeFiltrate.filter(function(r) {
      return r.gruppo === gruppo;
    });
    
    var gruppoStampato = false;
    var tipoStampati = {};
    var totaleStampati = {};
    var primaRigaGruppo = true;
    
    var tipi = ["ZADANKAI", "PRATICANTI"];
    for (var t = 0; t < tipi.length; t++) {
      var tipo = tipi[t];
      var righeCategoria = righeGruppo.filter(function(r) {
        return r.tipo === tipo;
      });
      
      if (righeCategoria.length === 0) continue;
      
      // Ordina sezioni ZADANKAI
      if (tipo === "ZADANKAI") {
        var sezioniOrdinate = ["membri", "simpatizzanti", "ospiti"];
        righeCategoria.sort(function(a, b) {
          return sezioniOrdinate.indexOf(a.sezione) - sezioniOrdinate.indexOf(b.sezione);
        });
      }
      
      // Calcola totale categoria
      var totaleCategoria = 0;
      for (var rc = 0; rc < righeCategoria.length; rc++) {
        var r = righeCategoria[rc];
        totaleCategoria += r.U + r.D + r.GU + r.GD;
      }
      
      // Calcola totale precedente
      var righePrec = righe.filter(function(r) {
        return String(r.anno) === String(annoPrec) &&
               r.mese === mesePrec &&
               r.gruppo === gruppo &&
               r.tipo === tipo;
      });
      
      var totalePrec = 0;
      for (var rp = 0; rp < righePrec.length; rp++) {
        var r = righePrec[rp];
        totalePrec += r.U + r.D + r.GU + r.GD;
      }
      
      var delta = totaleCategoria - totalePrec;
      
      for (var rc = 0; rc < righeCategoria.length; rc++) {
        var r = righeCategoria[rc];
        var somma = r.U + r.D + r.GU + r.GD;
        
        // Calcola precedente per sezione
        var righePrecSezione = righePrec.filter(function(x) {
          return x.sezione === r.sezione;
        });
        var sommaPrec = 0;
        for (var rps = 0; rps < righePrecSezione.length; rps++) {
          var x = righePrecSezione[rps];
          sommaPrec += x.U + x.D + x.GU + x.GD;
        }
        
        var tr = document.createElement("tr");
        if (tipo === "ZADANKAI") {
          tr.style.backgroundColor = "#fff9c4"; // Giallo chiaro
        } else {
          tr.style.backgroundColor = "#e3f2fd"; // Azzurro chiaro
        }
        
        // Applica bordo più spesso per separare i gruppi
        if (primaRigaGruppo && rc === 0 && g > 0) {
          tr.style.borderTop = BORDER_CONFIG.getHorizontalBorder();
        }
        
        var colIndex = 0;
        
        // Nome Gruppo
        if (!gruppoStampato && rc === 0) {
          var tdGruppo = document.createElement("td");
          tdGruppo.textContent = gruppo;
          tdGruppo.rowSpan = righeGruppo.length;
          tdGruppo.style.fontWeight = "bold";
          tdGruppo.style.textAlign = "center";
          tdGruppo.style.verticalAlign = "middle";
          tdGruppo.style.border = "1px solid #dee2e6";
          tr.appendChild(tdGruppo);
          gruppoStampato = true;
        }
        colIndex++;
        
        // Categoria
        if (!tipoStampati[tipo]) {
          var tdTipo = document.createElement("td");
          tdTipo.textContent = tipo;
          tdTipo.rowSpan = righeCategoria.length;
          tdTipo.style.fontWeight = "bold";
          tdTipo.style.textAlign = "center";
          tdTipo.style.verticalAlign = "middle";
          tdTipo.style.border = "1px solid #dee2e6";
          tr.appendChild(tdTipo);
          tipoStampati[tipo] = true;
        }
        colIndex++;
        
        // Dati ordinati con bordi blu applicati direttamente
        var celle = [
          r.sezione, r.U, r.D, r.GU, r.GD,
          somma,
          sommaPrec
        ];
        
        for (var c = 0; c < celle.length; c++) {
          var val = celle[c];
          var td = document.createElement("td");
          td.textContent = val;
          td.style.border = "1px solid #dee2e6";
          td.style.textAlign = "center";
          
          // Applica bordi blu per le colonne specifiche
          var currentCol = colIndex + c + 1;
          if (currentCol === 4) { // Separazione tra Sezione e U
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (currentCol === 8) { // Separazione tra GD e Somma
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (currentCol === 10) { // Separazione tra Prec. e Totale Gruppo
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          }
          
          // Applica grassetto alla colonna Somma (indice 5 nell'array celle)
          if (c === 5) {
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
          tdTot.style.border = "1px solid #dee2e6";
          tdTot.style.textAlign = "center";
          tdTot.style.verticalAlign = "middle";
          
          var contenutoTotale = '<div style="font-size: 1.2em;"><strong>' + totaleCategoria + '</strong></div>';
          contenutoTotale += '<div style="font-size: 0.8em;">Prec: ' + totalePrec + '</div>';
          if (delta >= 0) {
            contenutoTotale += '<div style="color: #28a745; font-weight: bold;">Δ +' + delta + '</div>';
          } else {
            contenutoTotale += '<div style="color: #dc3545; font-weight: bold;">Δ ' + delta + '</div>';
          }
          
          tdTot.innerHTML = contenutoTotale;
          tr.appendChild(tdTot);
          totaleStampati[tipo] = true;
        }
        colIndex++;
        
        // Futuro e Studenti
        var tdFuturo = document.createElement("td");
        tdFuturo.textContent = r.FUT;
        tdFuturo.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        tdFuturo.style.border = "1px solid #dee2e6";
        tdFuturo.style.textAlign = "center";
        tr.appendChild(tdFuturo);
        
        var tdStudenti = document.createElement("td");
        tdStudenti.textContent = r.STU;
        tdStudenti.style.border = "1px solid #dee2e6";
        tdStudenti.style.textAlign = "center";
        tr.appendChild(tdStudenti);
        
        tbody.appendChild(tr);
        
        if (primaRigaGruppo && rc === 0) {
          primaRigaGruppo = false;
        }
      }
    }
  }
  
  // Aggiorna le altre sezioni
  mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo);
  generaRiepiloghiCapitoloESettori(righeFiltrate, mese, anno, mesePrec, annoPrec, capitolo);
  aggiornaGrafici(righeFiltrate, anno, mese, capitolo, annoPrec, mesePrec);
}

// 🔹 Aggiorna le statistiche
function aggiornaStatistiche() {
  var totaleZadankai = 0;
  var totalePraticanti = 0;
  
  for (var i = 0; i < righe.length; i++) {
    var riga = righe[i];
    var totale = riga.U + riga.D + riga.GU + riga.GD;
    
    if (riga.tipo === "ZADANKAI") {
      totaleZadankai += totale;
    } else if (riga.tipo === "PRATICANTI") {
      totalePraticanti += totale;
    }
  }
  
  console.log("📊 Statistiche - Zadankai:", totaleZadankai, "Praticanti:", totalePraticanti);
}

// 🔹 Mostra gruppi mancanti
function mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo) {
  if (!gruppiData || !gruppiData["HOMBU 9"] || !gruppiData["HOMBU 9"][capitolo]) {
    return;
  }
  
  var strutturaCapitolo = gruppiData["HOMBU 9"][capitolo];
  var tuttiIGruppi = [];
  
  for (var settore in strutturaCapitolo) {
    var gruppi = strutturaCapitolo[settore];
    tuttiIGruppi = tuttiIGruppi.concat(gruppi);
  }
  
  var gruppiPresenti = [];
  for (var i = 0; i < righeFiltrate.length; i++) {
    var gruppo = righeFiltrate[i].gruppo;
    if (gruppiPresenti.indexOf(gruppo) === -1) {
      gruppiPresenti.push(gruppo);
    }
  }
  
  var gruppiMancanti = [];
  for (var i = 0; i < tuttiIGruppi.length; i++) {
    if (gruppiPresenti.indexOf(tuttiIGruppi[i]) === -1) {
      gruppiMancanti.push(tuttiIGruppi[i]);
    }
  }
  
  if (gruppiMancanti.length > 0) {
    console.log("⚠️ Gruppi mancanti per", mese, anno, ":", gruppiMancanti);
  }
}

// 🔹 Genera riepiloghi capitolo e settori
// 🔹 Genera riepiloghi capitolo e settori
function generaRiepiloghiCapitoloESettori(righeFiltrate, mese, anno, mesePrec, annoPrec, capitolo) {
  console.log("📋 Generazione riepiloghi per", capitolo, mese, anno);
  
  // Trova i container per i riepiloghi
  var containerRiepilogoCapitolo = document.getElementById("riepilogo-capitolo");
  
  if (!containerRiepilogoCapitolo) {
    console.log("⚠️ Container riepiloghi non trovati");
    return;
  }
  
  // Pulisci il container
  containerRiepilogoCapitolo.innerHTML = "";
  
  if (!righeFiltrate || righeFiltrate.length === 0) {
    return;
  }
  
  var struttura = gruppiData["HOMBU 9"][capitolo];
  var settori = Object.keys(struttura);
  
  // Genera riepiloghi per settori
  for (var s = 0; s < settori.length; s++) {
    var settore = settori[s];
    var gruppiSettore = struttura[settore];
    
    var righeSettore = righeFiltrate.filter(function(r) {
      return gruppiSettore.indexOf(r.gruppo) !== -1;
    });
    
    if (righeSettore.length === 0) continue;
    
    // Crea card per il settore
    var cardSettore = document.createElement("div");
    cardSettore.className = "card shadow-sm mb-4";
    
    var cardHeader = document.createElement("div");
    cardHeader.className = "card-header bg-warning text-dark";
    cardHeader.innerHTML = '<h5 class="mb-0"><i class="fas fa-chart-pie me-2"></i>Riepilogo: ' + settore + '</h5>';
    cardSettore.appendChild(cardHeader);
    
    var cardBody = document.createElement("div");
    cardBody.className = "card-body table-responsive";
    
    // Crea tabella
    var tabella = document.createElement("table");
    tabella.className = "table table-striped table-bordered";
    
    var thead = document.createElement("thead");
    thead.innerHTML = '<tr><th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th><th>Somma</th><th>Prec.</th><th>Totale Gruppi</th><th>Futuro</th><th>Studenti</th></tr>';
    tabella.appendChild(thead);
    
    var tbody = document.createElement("tbody");
    
    ["ZADANKAI", "PRATICANTI"].forEach(function(tipo) {
      var righeTipo = righeSettore.filter(function(r) { return r.tipo === tipo; });
      if (righeTipo.length === 0) return;
      
      var sezioni = [];
      for (var i = 0; i < righeTipo.length; i++) {
        if (sezioni.indexOf(righeTipo[i].sezione) === -1) {
          sezioni.push(righeTipo[i].sezione);
        }
      }
      
      if (tipo === "ZADANKAI") {
        var ordine = ["membri", "simpatizzanti", "ospiti"];
        sezioni.sort(function(a, b) {
          return ordine.indexOf(a) - ordine.indexOf(b);
        });
      }
      
      var tipoRowSpan = sezioni.length;
      
      var sezioniRilevanti = tipo === "ZADANKAI"
        ? ["membri", "simpatizzanti", "ospiti"]
        : ["membri", "simpatizzanti"];
      
      var righeTotali = righeTipo.filter(function(r) {
        return sezioniRilevanti.indexOf(r.sezione) !== -1;
      });
      
      var sumTot = righeTotali.reduce(function(acc, r) {
        return {
          U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
          GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
        };
      }, {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
      
      var totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
      
      var righePrecTot = righe.filter(function(r) {
        return r.anno === annoPrec && r.mese === mesePrec &&
               r.tipo === tipo &&
               sezioniRilevanti.indexOf(r.sezione) !== -1 &&
               gruppiSettore.indexOf(r.gruppo) !== -1;
      });
      
      var totalePrec = righePrecTot.reduce(function(acc, r) {
        return acc + r.U + r.D + r.GU + r.GD;
      }, 0);
      
      var delta = totaleMese - totalePrec;
      
      for (var j = 0; j < sezioni.length; j++) {
        var sezione = sezioni[j];
        var righeSezione = righeTipo.filter(function(r) { return r.sezione === sezione; });
        
        var sum = righeSezione.reduce(function(acc, r) {
          return {
            U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
            GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
          };
        }, {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
        
        var sommaTot = sum.U + sum.D + sum.GU + sum.GD;
        
        var righePrec = righe.filter(function(r) {
          return r.anno === annoPrec && r.mese === mesePrec &&
                 r.tipo === tipo && r.sezione === sezione &&
                 gruppiSettore.indexOf(r.gruppo) !== -1;
        });
        
        var sommaPrec = righePrec.reduce(function(acc, r) {
          return acc + r.U + r.D + r.GU + r.GD;
        }, 0);
        
        var tr = document.createElement("tr");
        tr.className = tipo === "ZADANKAI" ? "table-warning" : "table-info";
        // DEBUG: Aggiungi queste righe per il debug
        console.log("🔍 DEBUG - Tipo:", tipo);
        console.log("🔍 DEBUG - Classe assegnata:", tr.className);
        
        if (j === 0) {
          var tdTipo = document.createElement("td");
          tdTipo.textContent = tipo;
          tdTipo.rowSpan = tipoRowSpan;
          tdTipo.className = "fw-bold";
          tr.appendChild(tdTipo);
        }
        
        var celle = [sezione, sum.U, sum.D, sum.GU, sum.GD, sommaTot, sommaPrec];
        
        for (var k = 0; k < celle.length; k++) {
          var val = celle[k];
          var td = document.createElement("td");
          td.textContent = val;
          
          // Applica bordi blu per le colonne specifiche
          if (k === 1) { // U (dopo Sezione)
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (k === 5) { // Somma (dopo GD)
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
            td.style.fontWeight = "bold";
          }
          
          tr.appendChild(td);
        }
        
        if (j === 0) {
          var tdTot = document.createElement("td");
          tdTot.rowSpan = tipoRowSpan;
          tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          tdTot.innerHTML = '<div style="font-size: 1.2em;"><strong>' + totaleMese + '</strong></div>' +
                           '<div class="small">Prec: ' + totalePrec + '</div>' +
                           '<div class="' + (delta >= 0 ? 'text-success' : 'text-danger') + ' fw-bold">' +
                           'Δ ' + (delta >= 0 ? "+" : "") + delta + '</div>';
          tdTot.className = "text-center";
          tr.appendChild(tdTot);
        }
        
        var tdFUT = document.createElement("td");
        tdFUT.textContent = sum.FUT;
        tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        var tdSTU = document.createElement("td");
        tdSTU.textContent = sum.STU;
        tr.appendChild(tdFUT);
        tr.appendChild(tdSTU);
        
        tbody.appendChild(tr);
        // DEBUG: Verifica gli stili applicati
        setTimeout(() => {
            const computedStyle = window.getComputedStyle(tr);
            console.log("🎨 DEBUG - Background color calcolato:", computedStyle.backgroundColor);
            console.log("🎨 DEBUG - Classi CSS attive:", tr.classList.toString());
            
            // Verifica se ci sono stili inline che sovrascrivono
            console.log("🎨 DEBUG - Stili inline:", tr.style.cssText);
            
            // Verifica le celle
            const cells = tr.querySelectorAll('td');
            cells.forEach((cell, index) => {
                const cellStyle = window.getComputedStyle(cell);
                console.log(`🎨 DEBUG - Cella ${index} background:`, cellStyle.backgroundColor);
            });
        }, 100);
      }
    });
    
    tabella.appendChild(tbody);
    cardBody.appendChild(tabella);
    cardSettore.appendChild(cardBody);
    containerRiepilogoCapitolo.appendChild(cardSettore);
  }
  
  // Genera riepilogo capitolo
  var cardCapitolo = document.createElement("div");
  cardCapitolo.className = "card shadow-sm mb-4";
  
  var cardHeaderCap = document.createElement("div");
  cardHeaderCap.className = "card-header bg-primary text-white";
  cardHeaderCap.innerHTML = '<h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Riepilogo: ' + capitolo + '</h5>';
  cardCapitolo.appendChild(cardHeaderCap);
  
  var cardBodyCap = document.createElement("div");
  cardBodyCap.className = "card-body table-responsive";
  
  var tabellaCap = document.createElement("table");
  tabellaCap.className = "table table-striped table-bordered";
  
  var theadCap = document.createElement("thead");
  theadCap.innerHTML = '<tr><th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th><th>Somma</th><th>Prec.</th><th>Totale Gruppi</th><th>Futuro</th><th>Studenti</th></tr>';
  tabellaCap.appendChild(theadCap);
  
  var tbodyCap = document.createElement("tbody");
  
  ["ZADANKAI", "PRATICANTI"].forEach(function(tipo) {
    var righeTipo = righeFiltrate.filter(function(r) { return r.tipo === tipo; });
    if (righeTipo.length === 0) return;
    
    var sezioni = [];
    for (var i = 0; i < righeTipo.length; i++) {
      if (sezioni.indexOf(righeTipo[i].sezione) === -1) {
        sezioni.push(righeTipo[i].sezione);
      }
    }
    
    if (tipo === "ZADANKAI") {
      var ordine = ["membri", "simpatizzanti", "ospiti"];
      sezioni.sort(function(a, b) {
        return ordine.indexOf(a) - ordine.indexOf(b);
      });
    }
    
    var tipoRowSpan = sezioni.length;
    var sezioniRilevanti = tipo === "ZADANKAI"
      ? ["membri", "simpatizzanti", "ospiti"]
      : ["membri", "simpatizzanti"];
    
    var righeTotali = righeTipo.filter(function(r) {
      return sezioniRilevanti.indexOf(r.sezione) !== -1;
    });
    
    var sumTot = righeTotali.reduce(function(acc, r) {
      return {
        U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
        GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
      };
    }, {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
    
    var totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
    
    var righePrecTot = righe.filter(function(r) {
      return r.anno === annoPrec && r.mese === mesePrec &&
             r.tipo === tipo &&
             sezioniRilevanti.indexOf(r.sezione) !== -1 &&
             gruppoToCapitolo[r.gruppo] === capitolo;
    });
    
    var totalePrec = righePrecTot.reduce(function(acc, r) {
      return acc + r.U + r.D + r.GU + r.GD;
    }, 0);
    
    var delta = totaleMese - totalePrec;
    
    for (var j = 0; j < sezioni.length; j++) {
      var sezione = sezioni[j];
      var righeSezione = righeTipo.filter(function(r) { return r.sezione === sezione; });
      
      var sum = righeSezione.reduce(function(acc, r) {
        return {
          U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
          GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
        };
      }, {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
      
      var sommaTot = sum.U + sum.D + sum.GU + sum.GD;
      
      var righePrec = righe.filter(function(r) {
        return r.anno === annoPrec && r.mese === mesePrec &&
               r.tipo === tipo && r.sezione === sezione &&
               gruppoToCapitolo[r.gruppo] === capitolo;
      });
      
      var sommaPrec = righePrec.reduce(function(acc, r) {
        return acc + r.U + r.D + r.GU + r.GD;
      }, 0);
      
      var tr = document.createElement("tr");
      tr.className = tipo === "ZADANKAI" ? "table-warning" : "table-info";
      
      if (j === 0) {
        var tdTipo = document.createElement("td");
        tdTipo.textContent = tipo;
        tdTipo.rowSpan = tipoRowSpan;
        tdTipo.className = "fw-bold";
        tr.appendChild(tdTipo);
      }
      
      var celle = [sezione, sum.U, sum.D, sum.GU, sum.GD, sommaTot, sommaPrec];
      
      for (var k = 0; k < celle.length; k++) {
        var val = celle[k];
        var td = document.createElement("td");
        td.textContent = val;
        
        // Applica bordi blu per le colonne specifiche
        if (k === 1) { // U (dopo Sezione)
          td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        } else if (k === 5) { // Somma (dopo GD)
          td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          td.style.fontWeight = "bold";
        }
        
        tr.appendChild(td);
      }
      
      if (j === 0) {
        var tdTot = document.createElement("td");
        tdTot.rowSpan = tipoRowSpan;
        tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        tdTot.innerHTML = '<div style="font-size: 1.2em;"><strong>' + totaleMese + '</strong></div>' +
                         '<div class="small">Prec: ' + totalePrec + '</div>' +
                         '<div class="' + (delta >= 0 ? 'text-success' : 'text-danger') + ' fw-bold">' +
                         'Δ ' + (delta >= 0 ? "+" : "") + delta + '</div>';
        tdTot.className = "text-center";
        tr.appendChild(tdTot);
      }
      
      var tdFUT = document.createElement("td");
      tdFUT.textContent = sum.FUT;
      tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
      var tdSTU = document.createElement("td");
      tdSTU.textContent = sum.STU;
      tr.appendChild(tdFUT);
      tr.appendChild(tdSTU);
      
      tbodyCap.appendChild(tr);
    }
  });
  
  tabellaCap.appendChild(tbodyCap);
  cardBodyCap.appendChild(tabellaCap);
  cardCapitolo.appendChild(cardBodyCap);
  containerRiepilogoCapitolo.appendChild(cardCapitolo);
}

// 🔹 Aggiorna i grafici
function aggiornaGrafici(righeFiltrate, anno, mese, capitolo, annoPrec, mesePrec) {
  // Implementazione semplificata per compatibilità
  console.log("📈 Aggiornamento grafici per", capitolo, mese, anno);
}

// 🔹 Esporta in Excel
function esportaExcel() {
  alert("Funzione di esportazione Excel non implementata nella versione legacy");
}

// 🔹 Esporta in PDF
function esportaPdf() {
  alert("Funzione di esportazione PDF non implementata nella versione legacy");
}

// 🔹 Stampa
function stampa() {
  window.print();
}

// 🔹 Logout
function logout() {
  if (confirm("Sei sicuro di voler uscire?")) {
    firebase.auth().signOut().then(function() {
      window.location.href = "login.html";
    });
  }
}

// 🔹 Inizializzazione
document.addEventListener("DOMContentLoaded", function() {
  console.log("🚀 Inizializzazione visualizza-legacy.js");
  
  // Verifica autenticazione
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      console.log("✅ Utente autenticato:", user.email);
      database = firebase.database();
      caricaDati();
    } else {
      console.log("❌ Utente non autenticato, reindirizzamento al login");
      window.location.href = "login.html";
    }
  });
  
  // Event listener per logout
  var logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});
