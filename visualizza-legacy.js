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
  var anno = filtroAnno.value;
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;
  var meseAnnoPrec = mesePrecedente(mese, anno);
  var mesePrec = meseAnnoPrec.mese;
  var annoPrec = meseAnnoPrec.anno;
  
  // Filtra le righe in base ai filtri selezionati
  var righeFiltrate = righe.filter(function(r) {
    return r.anno === anno &&
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
  
  var settoreCorrente = null;
  
  // Genera la tabella
  for (var index = 0; index < gruppiOrdinati.length; index++) {
    var gruppo = gruppiOrdinati[index];
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
          th.style.borderRight = BORDER_CONFIG.getVerticalBorder();
        }
        
        headerRow.appendChild(th);
      }
      tbody.appendChild(headerRow);
      
      settoreCorrente = settore;
    }
    
    // Righe dei dati per gruppo
    var righeGruppo = righeFiltrate.filter(function(r) { return r.gruppo === gruppo; });
    var gruppoStampato = false;
    var tipoStampati = {};
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
        if (!tipoStampati[tipo]) {
          var tdTipo = document.createElement("td");
          tdTipo.textContent = tipo;
          tdTipo.rowSpan = righeCategoria.length;
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
            td.style.borderRight = BORDER_CONFIG.getVerticalBorder();
          }
          
          tr.appendChild(td);
        }
        
        // Totale Gruppo (solo per la prima riga di ogni categoria)
        if (i === 0) {
          var tdTotaleGruppo = document.createElement("td");
          tdTotaleGruppo.textContent = totaleCategoria;
          tdTotaleGruppo.rowSpan = righeCategoria.length;
          tdTotaleGruppo.style.borderLeft = BORDER_CONFIG.getVerticalBorder(); // Bordo blu per Totale Gruppo
          tdTotaleGruppo.style.borderRight = BORDER_CONFIG.getVerticalBorder(); // Bordo blu per Totale Gruppo
          tr.appendChild(tdTotaleGruppo);
          
          // Futuro e Studenti (solo per ZADANKAI)
          if (tipo === "ZADANKAI") {
            var futuroTotale = righeCategoria.reduce(function(acc, x) { return acc + x.FUT; }, 0);
            var studentiTotale = righeCategoria.reduce(function(acc, x) { return acc + x.STU; }, 0);
            
            var tdFuturo = document.createElement("td");
            tdFuturo.textContent = futuroTotale;
            tdFuturo.rowSpan = righeGruppo.length;
            tr.appendChild(tdFuturo);
            
            var tdStudenti = document.createElement("td");
            tdStudenti.textContent = studentiTotale;
            tdStudenti.rowSpan = righeGruppo.length;
            tr.appendChild(tdStudenti);
          } else {
            // Per PRATICANTI, aggiungi celle vuote se è la prima categoria
            if (!tipoStampati["ZADANKAI"]) {
              var tdFuturoVuoto = document.createElement("td");
              tdFuturoVuoto.textContent = "0";
              tdFuturoVuoto.rowSpan = righeGruppo.length;
              tr.appendChild(tdFuturoVuoto);
              
              var tdStudentiVuoto = document.createElement("td");
              tdStudentiVuoto.textContent = "0";
              tdStudentiVuoto.rowSpan = righeGruppo.length;
              tr.appendChild(tdStudentiVuoto);
            }
          }
        }
        
        tbody.appendChild(tr);
        primaRigaGruppo = false;
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
function generaRiepiloghiCapitoloESettori(righeFiltrate, mese, anno, mesePrec, annoPrec, capitolo) {
  console.log("📋 Generazione riepiloghi per", capitolo, mese, anno);
  
  // Trova i container per i riepiloghi
  var containerRiepilogoSettori = document.getElementById("riepilogo-settori");
  var containerRiepilogoCapitolo = document.getElementById("riepilogo-capitolo");
  
  if (!containerRiepilogoSettori || !containerRiepilogoCapitolo) {
    console.log("⚠️ Container riepiloghi non trovati");
    return;
  }
  
  // Pulisci i container
  containerRiepilogoSettori.innerHTML = "";
  containerRiepilogoCapitolo.innerHTML = "";
  
  if (!righeFiltrate || righeFiltrate.length === 0) {
    return;
  }
  
  // Ottieni la struttura dei settori
  var strutturaCapitolo = gruppiData["HOMBU 9"][capitolo];
  var settorePerGruppo = {};
  
  for (var settore in strutturaCapitolo) {
    var listaGruppi = strutturaCapitolo[settore];
    for (var i = 0; i < listaGruppi.length; i++) {
      settorePerGruppo[listaGruppi[i]] = settore;
    }
  }
  
  // Calcola totali per settore
  var totaliPerSettore = {};
  var totaliPrecPerSettore = {};
  
  for (var i = 0; i < righeFiltrate.length; i++) {
    var riga = righeFiltrate[i];
    var settore = settorePerGruppo[riga.gruppo];
    
    if (!totaliPerSettore[settore]) {
      totaliPerSettore[settore] = {
        ZADANKAI: { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 },
        PRATICANTI: { U: 0, D: 0, GU: 0, GD: 0 }
      };
    }
    
    if (riga.tipo === "ZADANKAI") {
      totaliPerSettore[settore].ZADANKAI.U += riga.U;
      totaliPerSettore[settore].ZADANKAI.D += riga.D;
      totaliPerSettore[settore].ZADANKAI.GU += riga.GU;
      totaliPerSettore[settore].ZADANKAI.GD += riga.GD;
      totaliPerSettore[settore].ZADANKAI.FUT += riga.FUT;
      totaliPerSettore[settore].ZADANKAI.STU += riga.STU;
    } else if (riga.tipo === "PRATICANTI") {
      totaliPerSettore[settore].PRATICANTI.U += riga.U;
      totaliPerSettore[settore].PRATICANTI.D += riga.D;
      totaliPerSettore[settore].PRATICANTI.GU += riga.GU;
      totaliPerSettore[settore].PRATICANTI.GD += riga.GD;
    }
  }
  
  // Calcola totali del mese precedente per settore
  var righePrecedenti = righe.filter(function(r) {
    return r.anno === annoPrec &&
           r.mese === mesePrec &&
           gruppoToCapitolo[r.gruppo] === capitolo;
  });
  
  for (var i = 0; i < righePrecedenti.length; i++) {
    var riga = righePrecedenti[i];
    var settore = settorePerGruppo[riga.gruppo];
    
    if (!totaliPrecPerSettore[settore]) {
      totaliPrecPerSettore[settore] = {
        ZADANKAI: { U: 0, D: 0, GU: 0, GD: 0 },
        PRATICANTI: { U: 0, D: 0, GU: 0, GD: 0 }
      };
    }
    
    if (riga.tipo === "ZADANKAI") {
      totaliPrecPerSettore[settore].ZADANKAI.U += riga.U;
      totaliPrecPerSettore[settore].ZADANKAI.D += riga.D;
      totaliPrecPerSettore[settore].ZADANKAI.GU += riga.GU;
      totaliPrecPerSettore[settore].ZADANKAI.GD += riga.GD;
    } else if (riga.tipo === "PRATICANTI") {
      totaliPrecPerSettore[settore].PRATICANTI.U += riga.U;
      totaliPrecPerSettore[settore].PRATICANTI.D += riga.D;
      totaliPrecPerSettore[settore].PRATICANTI.GU += riga.GU;
      totaliPrecPerSettore[settore].PRATICANTI.GD += riga.GD;
    }
  }
  
  // Crea tabella riepilogo settori
  var tabellaSettori = document.createElement("table");
  tabellaSettori.className = "table table-bordered table-sm";
  
  // Intestazione tabella settori
  var theadSettori = document.createElement("thead");
  var headerRowSettori = document.createElement("tr");
  var headersSettori = ["Categoria", "Sezione", "U", "D", "GU", "GD", "Somma", "Prec.", "Totale Gruppi", "Futuro", "Studenti"];
  
  for (var i = 0; i < headersSettori.length; i++) {
    var th = document.createElement("th");
    th.textContent = headersSettori[i];
    th.className = "bg-light text-center";
    
    // Applica bordi verticali
    if (i === 2) { // Separazione tra Sezione e U
      th.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
    } else if (i === 6) { // Separazione tra GD e Somma
      th.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
    }
    
    headerRowSettori.appendChild(th);
  }
  
  theadSettori.appendChild(headerRowSettori);
  tabellaSettori.appendChild(theadSettori);
  
  // Corpo tabella settori
  var tbodySettori = document.createElement("tbody");
  var settoriOrdinati = Object.keys(totaliPerSettore).sort();
  
  for (var s = 0; s < settoriOrdinati.length; s++) {
    var settore = settoriOrdinati[s];
    var datiSettore = totaliPerSettore[settore];
    var datiPrecSettore = totaliPrecPerSettore[settore] || { ZADANKAI: { U: 0, D: 0, GU: 0, GD: 0 }, PRATICANTI: { U: 0, D: 0, GU: 0, GD: 0 } };
    
    ["ZADANKAI", "PRATICANTI"].forEach(function(categoria, catIndex) {
      var dati = datiSettore[categoria];
      var datiPrec = datiPrecSettore[categoria];
      
      var sommaAttuale = dati.U + dati.D + dati.GU + dati.GD;
      var sommaPrec = datiPrec.U + datiPrec.D + datiPrec.GU + datiPrec.GD;
      
      if (sommaAttuale > 0 || sommaPrec > 0) {
        var tr = document.createElement("tr");
        
        // Settore (solo per la prima categoria)
        if (catIndex === 0) {
          var tdSettore = document.createElement("td");
          tdSettore.textContent = settore;
          tdSettore.rowSpan = 2;
          tdSettore.className = "fw-bold";
          tr.appendChild(tdSettore);
        }
        
        // Categoria
        var tdCategoria = document.createElement("td");
        tdCategoria.textContent = categoria;
        tr.appendChild(tdCategoria);
        
        // Dati numerici
        var valori = [dati.U, dati.D, dati.GU, dati.GD, sommaAttuale, sommaPrec, sommaAttuale];
        
        if (categoria === "ZADANKAI") {
          valori.push(dati.FUT, dati.STU);
        } else {
          valori.push(0, 0);
        }
        
        for (var v = 0; v < valori.length; v++) {
          var td = document.createElement("td");
          td.textContent = valori[v];
          td.className = "text-center";
          
          // Applica bordi verticali
          if (v === 0) { // Separazione tra Sezione e U
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (v === 4) { // Separazione tra GD e Somma
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          }
          } else if (v === 10) { // Separazione tra GD e Somma
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          }
          
          tr.appendChild(td);
        }
        
        tbodySettori.appendChild(tr);
      }
    });
  }
  
  tabellaSettori.appendChild(tbodySettori);
  
  // Aggiungi titolo e tabella al container
  var titoloSettori = document.createElement("h4");
  titoloSettori.textContent = "Riepilogo per Settori - " + capitolo + " (" + mese + " " + anno + ")";
  titoloSettori.className = "mt-4 mb-3";
  
  containerRiepilogoSettori.appendChild(titoloSettori);
  containerRiepilogoSettori.appendChild(tabellaSettori);
  
  // Crea tabella riepilogo capitolo
  var tabellaCapitolo = document.createElement("table");
  tabellaCapitolo.className = "table table-bordered table-sm";
  
  // Intestazione tabella capitolo
  var theadCapitolo = document.createElement("thead");
  var headerRowCapitolo = document.createElement("tr");
  var headersCapitolo = ["Categoria", "U", "D", "GU", "GD", "Somma", "Prec.", "Totale Gruppi", "Futuro", "Studenti"];
  
  for (var i = 0; i < headersCapitolo.length; i++) {
    var th = document.createElement("th");
    th.textContent = headersCapitolo[i];
    th.className = "bg-light text-center";
    
    // Applica bordi verticali
    if (i === 1) { // Separazione tra Categoria e U
      th.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
    } else if (i === 5) { // Separazione tra GD e Somma
      th.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
    } else if (i === 7) { // Separazione tra Prec. e Totale Gruppi
      th.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
    } else if (i === 8) { // Separazione tra Totale Gruppi e Futuro
      th.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
    }
    
    headerRowCapitolo.appendChild(th);
  }
  
  theadCapitolo.appendChild(headerRowCapitolo);
  tabellaCapitolo.appendChild(theadCapitolo);
  
  // Corpo tabella capitolo
  var tbodyCapitolo = document.createElement("tbody");
  
  // Calcola totali del capitolo
  var totaliCapitolo = {
    ZADANKAI: { U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0 },
    PRATICANTI: { U: 0, D: 0, GU: 0, GD: 0 }
  };
  
  var totaliPrecCapitolo = {
    ZADANKAI: { U: 0, D: 0, GU: 0, GD: 0 },
    PRATICANTI: { U: 0, D: 0, GU: 0, GD: 0 }
  };
  
  // Somma tutti i settori per il capitolo
  for (var settore in totaliPerSettore) {
    var datiSettore = totaliPerSettore[settore];
    var datiPrecSettore = totaliPrecPerSettore[settore] || { ZADANKAI: { U: 0, D: 0, GU: 0, GD: 0 }, PRATICANTI: { U: 0, D: 0, GU: 0, GD: 0 } };
    
    totaliCapitolo.ZADANKAI.U += datiSettore.ZADANKAI.U;
    totaliCapitolo.ZADANKAI.D += datiSettore.ZADANKAI.D;
    totaliCapitolo.ZADANKAI.GU += datiSettore.ZADANKAI.GU;
    totaliCapitolo.ZADANKAI.GD += datiSettore.ZADANKAI.GD;
    totaliCapitolo.ZADANKAI.FUT += datiSettore.ZADANKAI.FUT;
    totaliCapitolo.ZADANKAI.STU += datiSettore.ZADANKAI.STU;
    
    totaliCapitolo.PRATICANTI.U += datiSettore.PRATICANTI.U;
    totaliCapitolo.PRATICANTI.D += datiSettore.PRATICANTI.D;
    totaliCapitolo.PRATICANTI.GU += datiSettore.PRATICANTI.GU;
    totaliCapitolo.PRATICANTI.GD += datiSettore.PRATICANTI.GD;
    
    totaliPrecCapitolo.ZADANKAI.U += datiPrecSettore.ZADANKAI.U;
    totaliPrecCapitolo.ZADANKAI.D += datiPrecSettore.ZADANKAI.D;
    totaliPrecCapitolo.ZADANKAI.GU += datiPrecSettore.ZADANKAI.GU;
    totaliPrecCapitolo.ZADANKAI.GD += datiPrecSettore.ZADANKAI.GD;
    
    totaliPrecCapitolo.PRATICANTI.U += datiPrecSettore.PRATICANTI.U;
    totaliPrecCapitolo.PRATICANTI.D += datiPrecSettore.PRATICANTI.D;
    totaliPrecCapitolo.PRATICANTI.GU += datiPrecSettore.PRATICANTI.GU;
    totaliPrecCapitolo.PRATICANTI.GD += datiPrecSettore.PRATICANTI.GD;
  }
  
  // Crea righe per il riepilogo capitolo
  ["ZADANKAI", "PRATICANTI"].forEach(function(categoria) {
    var dati = totaliCapitolo[categoria];
    var datiPrec = totaliPrecCapitolo[categoria];
    
    var sommaAttuale = dati.U + dati.D + dati.GU + dati.GD;
    var sommaPrec = datiPrec.U + datiPrec.D + datiPrec.GU + datiPrec.GD;
    
    var tr = document.createElement("tr");
    
    // Categoria
    var tdCategoria = document.createElement("td");
    tdCategoria.textContent = categoria;
    tdCategoria.className = "fw-bold";
    tr.appendChild(tdCategoria);
    
    // Dati numerici
    var valori = [dati.U, dati.D, dati.GU, dati.GD, sommaAttuale, sommaPrec, sommaAttuale];
    
    if (categoria === "ZADANKAI") {
      valori.push(dati.FUT, dati.STU);
    } else {
      valori.push(0, 0);
    }
    
    for (var v = 0; v < valori.length; v++) {
      var td = document.createElement("td");
      td.textContent = valori[v];
      td.className = "text-center";
      
      // Applica bordi verticali
      if (v === 0) { // Separazione tra Categoria e U
        td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
      } else if (v === 4) { // Separazione tra GD e Somma
        td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
      } else if (v === 6) { // Separazione tra Prec. e Totale Gruppi
        td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
      } else if (v === 7) { // Separazione tra Totale Gruppi e Futuro
        td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
      }
      
      tr.appendChild(td);
    }
    
    tbodyCapitolo.appendChild(tr);
  });
  
  tabellaCapitolo.appendChild(tbodyCapitolo);
  
  // Aggiungi titolo e tabella al container
  var titoloCapitolo = document.createElement("h4");
  titoloCapitolo.textContent = "Riepilogo Capitolo - " + capitolo + " (" + mese + " " + anno + ")";
  titoloCapitolo.className = "mt-4 mb-3";
  
  containerRiepilogoCapitolo.appendChild(titoloCapitolo);
  containerRiepilogoCapitolo.appendChild(tabellaCapitolo);
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
