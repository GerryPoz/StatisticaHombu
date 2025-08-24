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
  var anno = parseInt(filtroAnno.value); // Converti in numero
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;
  
  // Aggiungi controllo per valori validi
  if (!anno || !mese || !capitolo) {
    var tr = document.createElement("tr");
    var td = document.createElement("td");
    td.colSpan = 12;
    td.textContent = "Seleziona tutti i filtri per visualizzare i dati";
    td.className = "text-center text-muted";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  
  var meseAnnoPrec = mesePrecedente(mese, anno);
  var mesePrec = meseAnnoPrec.mese;
  var annoPrec = meseAnnoPrec.anno;
  
  // Filtra le righe in base ai filtri selezionati
  var righeFiltrate = righe.filter(function(r) {
    return r.anno === anno &&
           r.mese === mese &&
           gruppoToCapitolo[r.gruppo] === capitolo;
  });
  
  // Debug: aggiungi questo log temporaneo per verificare
  console.log('🔍 Filtri:', { anno: anno, mese: mese, capitolo: capitolo });
  console.log('📊 Righe filtrate:', righeFiltrate.length);
  
  if (righeFiltrate.length === 0) {
    var tr = document.createElement("tr");
    var td = document.createElement("td");
    td.colSpan = 12;
    td.textContent = "Nessun dato disponibile per i filtri selezionati";
    td.className = "text-center text-muted";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  
  // Raggruppa per settore
  var settori = {};
  righeFiltrate.forEach(function(r) {
    var settore = r.gruppo.split(" ")[0]; // Primo carattere/numero
    if (!settori[settore]) settori[settore] = [];
    settori[settore].push(r.gruppo);
  });
  
  // Ordina settori e gruppi
  var settoriOrdinati = Object.keys(settori).sort();
  settoriOrdinati.forEach(function(settore) {
    settori[settore] = Array.from(new Set(settori[settore])).sort();
  });
  
  var gruppiOrdinati = [];
  settoriOrdinati.forEach(function(settore) {
    gruppiOrdinati = gruppiOrdinati.concat(settori[settore]);
  });
  
  var settoreCorrente = null;
  
  // Genera le righe per ogni gruppo
  for (var g = 0; g < gruppiOrdinati.length; g++) {
    var gruppo = gruppiOrdinati[g];
    var settore = gruppo.split(" ")[0];
    
    // Intestazione settore
    if (settore !== settoreCorrente) {
      var headerRow = document.createElement("tr");
      headerRow.className = "table-primary";
      
      var headers = [
        "Nome Gruppo", "Categoria", "Sezione", "U", "D", "GU", "GD",
        "Somma", "Prec.", "Totale Gruppo", "Futuro", "Studenti"
      ];
      for (var i = 0; i < headers.length; i++) {
        var th = document.createElement("th");
        th.textContent = headers[i];
        th.className = "bg-light";
        
        // Applica bordi verticali alle intestazioni
        if (i === 3) { // Separazione tra Sezione e U
          th.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        } else if (i === 7) { // Separazione tra GD e Somma
          th.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        } else if (i === 9) { // Separazione tra Prec. e Totale Gruppo
          th.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        } else if (i === 10) { // Separazione tra Totale Gruppo e Futuro
          th.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        }
        
        headerRow.appendChild(th);
      }
      tbody.appendChild(headerRow);
      
      settoreCorrente = settore;
    }
    
    // Righe dei dati per gruppo
    var righeGruppo = righeFiltrate.filter(function(r) { return r.gruppo === gruppo; });
    var gruppoStampato = false;
    var totaleStampati = {};
    var primaRigaGruppo = true;
    
    ["ZADANKAI", "PRATICANTI"].forEach(function(tipo) {
      var righeCategoria = righeGruppo.filter(function(r) { return r.tipo === tipo; });
      
      if (righeCategoria.length === 0) return;
      
      // Ordina sezioni ZADANKAI
      if (tipo === "ZADANKAI") {
        var sezioniOrdinate = ["membri", "simpatizzanti", "ospiti"];
        righeCategoria.sort(function(a, b) {
          return sezioniOrdinate.indexOf(a.sezione) - sezioniOrdinate.indexOf(b.sezione);
        });
      }
      
      var totaleCategoria = righeCategoria.reduce(function(acc, r) {
        return acc + r.U + r.D + r.GU + r.GD;
      }, 0);
      
      var righePrec = righe.filter(function(r) {
        return r.anno === annoPrec &&
               r.mese === mesePrec &&
               r.gruppo === gruppo &&
               r.tipo === tipo;
      });
      
      var totalePrec = righePrec.reduce(function(acc, r) {
        return acc + r.U + r.D + r.GU + r.GD;
      }, 0);
      var delta = totaleCategoria - totalePrec;
      
      for (var i = 0; i < righeCategoria.length; i++) {
        var r = righeCategoria[i];
        var somma = r.U + r.D + r.GU + r.GD;
        var righePrecSezione = righePrec.filter(function(x) { return x.sezione === r.sezione; });
        var sommaPrec = righePrecSezione.reduce(function(acc, x) {
          return acc + x.U + x.D + x.GU + x.GD;
        }, 0);
        
        var tr = document.createElement("tr");
        tr.className = tipo === "ZADANKAI" ? "zadankai" : "praticanti";
        
        // Applica bordo più spesso per separare i gruppi
        if (primaRigaGruppo && i === 0 && gruppo !== gruppiOrdinati[0]) {
          tr.style.borderTop = BORDER_CONFIG.getHorizontalBorder();
        }
        
        var colIndex = 0;
        
        // Nome Gruppo
        if (!gruppoStampato && i === 0) {
          var tdGruppo = document.createElement("td");
          tdGruppo.textContent = gruppo;
          tdGruppo.rowSpan = righeGruppo.length;
          tdGruppo.className = "nome-gruppo";
          tr.appendChild(tdGruppo);
          gruppoStampato = true;
        }
        colIndex++;
        
        // Categoria
        if (!totaleStampati[tipo]) {
          var tdTipo = document.createElement("td");
          tdTipo.textContent = tipo;
          tdTipo.rowSpan = righeCategoria.length;
          tr.appendChild(tdTipo);
        }
        colIndex++;
        
        // Dati ordinati con bordi blu applicati direttamente
        var celle = [
          r.sezione, r.U, r.D, r.GU, r.GD,
          somma,
          sommaPrec
        ];
        
        for (var j = 0; j < celle.length; j++) {
          var val = celle[j];
          var td = document.createElement("td");
          td.textContent = val;
          
          // Applica bordi blu per le colonne specifiche
          var currentCol = colIndex + j + 1;
          if (currentCol === 4) { // Separazione tra Sezione e U
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (currentCol === 8) { // Separazione tra GD e Somma
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (currentCol === 10) { // Separazione tra Prec. e Totale Gruppo
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          }
          
          // Applica grassetto alla colonna Somma (indice 5 nell'array celle)
          if (j === 5) {
            td.style.fontWeight = "bold";
          }
          
          tr.appendChild(td);
        }
        colIndex += celle.length;
        
        // Totale categoria
        if (!totaleStampati[tipo]) {
          var tdTot = document.createElement("td");
          tdTot.rowSpan = righeCategoria.length;
          // Aggiungere il bordo sinistro per separare da "Prec"
          tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          // Aggiungere il bordo destro blu per la colonna "Totale Gruppo"
          tdTot.style.borderRight = BORDER_CONFIG.getVerticalBorder();
          tdTot.innerHTML = 
            '<div style="font-size: 1.2em;"><strong>' + totaleCategoria + '</strong></div>' +
            '<div class="small">Prec: ' + totalePrec + '</div>' +
            '<div class="' + (delta >= 0 ? 'text-success' : 'text-danger') + ' fw-bold">' +
            'Δ ' + (delta >= 0 ? "+" : "") + delta +
            '</div>';
          tr.appendChild(tdTot);
          totaleStampati[tipo] = true;
        }
        colIndex++; // Colonna Totale Gruppo
        
        // Futuro e Studenti
        var tdFuturo = document.createElement("td");
        tdFuturo.textContent = r.FUT;
        // Separazione tra Totale Gruppo e Futuro
        tdFuturo.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        tr.appendChild(tdFuturo);
        
        var tdStudenti = document.createElement("td");
        tdStudenti.textContent = r.STU;
        tr.appendChild(tdStudenti);
        
        tbody.appendChild(tr);
        
        if (primaRigaGruppo && i === 0) {
          primaRigaGruppo = false;
        }
      }
    });
  }
  
  // Mostra gruppi mancanti
  mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo);
  
  // Genera riepiloghi
  generaRiepiloghiCapitoloESettori(righeFiltrate, mese, anno, mesePrec, annoPrec, capitolo);
  
  // Aggiorna grafici
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
