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
var containerTabelle = document.getElementById("container-tabelle");
var btnExportExcel = document.getElementById("btn-export-excel");
var btnExportPdf = document.getElementById("btn-export-pdf");
var btnPrint = document.getElementById("btn-print");

var mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

// 🔹 Dati globali
var righe = [];
var gruppoToCapitolo = {};
var gruppiData;

function getFiltroTipoVal() {
  var radio = document.querySelector('input[name="filtro-tipo"]:checked');
  return radio ? radio.value : "ZADANKAI";
}

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
  
  database.ref(getFiltroTipoVal() === 'STUDIO_GOSHO' ? 'studio_gosho' : 'zadankai').once('value')
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
              G: (r.G != null ? r.G : ((r.GU || 0) + (r.GD || 0))) || 0,
              GU: (r.G != null ? (r.G || 0) : (r.GU || 0)) || 0,
              GD: (r.G != null ? 0 : (r.GD || 0)) || 0,
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
              G: (r.G != null ? r.G : ((r.GU || 0) + (r.GD || 0))) || 0,
              GU: (r.G != null ? (r.G || 0) : (r.GU || 0)) || 0,
              GD: (r.G != null ? 0 : (r.GD || 0)) || 0,
              FUT: 0,
              STU: 0
            });
          }
        }
      }
      
      console.log("✅ Dati elaborati:", righe.length, "righe");
      
      inizializzaFiltri();
      aggiornaTabella();
    })
    .catch(function(error) {
      console.error("❌ Errore caricamento Firebase:", error);
      alert("Errore nel caricamento dei dati da Firebase: " + error.message);
    });
}

// 🔹 Inizializza i filtri
function inizializzaFiltri() {
  // Pulisce filtri per evitare duplicazioni
  if (filtroAnno) filtroAnno.innerHTML = "";
  if (filtroMese) filtroMese.innerHTML = "";
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

  var prevFiltri = window.__prevFiltriVisualizzaLegacy__;
  if (prevFiltri) {
    if (prevFiltri.anno && filtroAnno && Array.from(filtroAnno.options).some(function(o) { return o.value === prevFiltri.anno; })) {
      filtroAnno.value = prevFiltri.anno;
    }
    if (prevFiltri.mese && filtroMese && Array.from(filtroMese.options).some(function(o) { return o.value === prevFiltri.mese; })) {
      filtroMese.value = prevFiltri.mese;
    }
    if (prevFiltri.capitolo && filtroCapitolo && Array.from(filtroCapitolo.options).some(function(o) { return o.value === prevFiltri.capitolo; })) {
      filtroCapitolo.value = prevFiltri.capitolo;
    }
  } else {
    if (anni.length > 0 && filtroAnno) {
      var anniOrdinati = anni.slice().sort(function(a, b) { return parseInt(a, 10) - parseInt(b, 10); });
      var annoRecente = anniOrdinati[anniOrdinati.length - 1];
      if (Array.from(filtroAnno.options).some(function(o) { return o.value === annoRecente; })) {
        filtroAnno.value = annoRecente;
      }
      if (filtroMese) {
        var mesiAnno = [];
        for (var j = 0; j < righe.length; j++) {
          if (String(righe[j].anno) === String(annoRecente) && righe[j].mese && mesiAnno.indexOf(righe[j].mese) === -1) {
            mesiAnno.push(righe[j].mese);
          }
        }
        var meseRecente = null;
        for (var k = 0; k < mesiAnno.length; k++) {
          if (meseRecente === null || mesiOrdine.indexOf(mesiAnno[k]) > mesiOrdine.indexOf(meseRecente)) {
            meseRecente = mesiAnno[k];
          }
        }
        if (meseRecente && Array.from(filtroMese.options).some(function(o) { return o.value === meseRecente; })) {
          filtroMese.value = meseRecente;
        }
      }
    }
  }
  
  // Aggiungi event listeners
  filtroAnno.addEventListener("change", aggiornaTabella);
  filtroMese.addEventListener("change", aggiornaTabella);
  filtroCapitolo.addEventListener("change", aggiornaTabella);
  // Evita di aggiungere più volte i listener sui radio
  if (!window.__tipoListenerInitVL__) {
    window.__tipoListenerInitVL__ = true;
    var radiosTipo = document.querySelectorAll('input[name="filtro-tipo"]');
    radiosTipo.forEach(function(radio) {
      radio.addEventListener("change", function() {
        window.__prevFiltriVisualizzaLegacy__ = {
          anno: filtroAnno ? filtroAnno.value : "",
          mese: filtroMese ? filtroMese.value : "",
          capitolo: filtroCapitolo ? filtroCapitolo.value : ""
        };
        if (filtroAnno) filtroAnno.innerHTML = "";
        if (filtroMese) filtroMese.innerHTML = "";
        righe = [];
        caricaDatiFirebase();
      });
    });
  }
  
  if (btnExportExcel) btnExportExcel.addEventListener("click", esportaExcel);
  if (btnExportPdf) btnExportPdf.addEventListener("click", esportaPdf);
  if (btnPrint) btnPrint.addEventListener("click", stampa);
}

// 🔹 Aggiorna la tabella
function aggiornaTabella() {
  containerTabelle.innerHTML = "";
  var anno = String(filtroAnno.value);
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;
  var meseAnnoPrec = mesePrecedente(mese, anno);
  var mesePrec = meseAnnoPrec.mese;
  var annoPrec = meseAnnoPrec.anno;
  
  // Filtra i dati base
  var datiAnnoMese = righe.filter(function(r) {
    return String(r.anno) === String(anno) &&
           r.mese === mese &&
           gruppoToCapitolo[r.gruppo] === capitolo;
  });
  var datiPrec = righe.filter(function(r) {
    return String(r.anno) === String(annoPrec) &&
           r.mese === mesePrec &&
           gruppoToCapitolo[r.gruppo] === capitolo;
  });
  
  // Struttura gerarchica e totali
  var strutturaCapitolo = gruppiData["HOMBU 9"][capitolo];
  var datiGerarchici = [];
  var totCapitoloZ = { membri: initTot(), simp: initTot(), ospiti: initTot(), totG: 0, var: 0, fut: 0, stu: 0 };
  var totCapitoloP = { membri: initTot(), simp: initTot(), totG: 0, var: 0 };
  
  for (var settore in strutturaCapitolo) {
    var gruppi = strutturaCapitolo[settore].slice().sort();
    var datiSettore = {
      nome: settore,
      gruppi: [],
      totZ: { membri: initTot(), simp: initTot(), ospiti: initTot(), totG: 0, var: 0, fut: 0, stu: 0 },
      totP: { membri: initTot(), simp: initTot(), totG: 0, var: 0 }
    };
    
    for (var i = 0; i < gruppi.length; i++) {
      var gruppo = gruppi[i];
      // Zadankai
      var rz = datiAnnoMese.filter(function(r){ return r.gruppo === gruppo && r.tipo === "ZADANKAI"; });
      var rzPrec = datiPrec.filter(function(r){ return r.gruppo === gruppo && r.tipo === "ZADANKAI"; });
      var zM = trovaDatiSezione(rz, "membri");
      var zS = trovaDatiSezione(rz, "simpatizzanti");
      var zO = trovaDatiSezione(rz, "ospiti");
      var zTotG = zM.Tot + zS.Tot + zO.Tot;
      var zFut = (zM.FUT||0) + (zS.FUT||0);
      var zStu = (zM.STU||0) + (zS.STU||0);
      var zTotPrec = 0; for (var a=0;a<rzPrec.length;a++){ var rr=rzPrec[a]; var gPrec = (rr.G != null ? rr.G : ((rr.GU||0) + (rr.GD||0))); zTotPrec += (rr.U||0) + (rr.D||0) + (gPrec||0); }
      var zVar = zTotG - zTotPrec;
      var datiGruppoZ = { membri: zM, simp: zS, ospiti: zO, totG: zTotG, var: zVar, fut: zFut, stu: zStu };
      sommaTotali(datiSettore.totZ.membri, zM);
      sommaTotali(datiSettore.totZ.simp, zS);
      sommaTotali(datiSettore.totZ.ospiti, zO);
      datiSettore.totZ.totG += zTotG; datiSettore.totZ.var += zVar; datiSettore.totZ.fut += zFut; datiSettore.totZ.stu += zStu;
      
      // Praticanti
      var rp = datiAnnoMese.filter(function(r){ return r.gruppo === gruppo && r.tipo === "PRATICANTI"; });
      var rpPrec = datiPrec.filter(function(r){ return r.gruppo === gruppo && r.tipo === "PRATICANTI"; });
      var pM = trovaDatiSezione(rp, "membri");
      var pS = trovaDatiSezione(rp, "simpatizzanti");
      var pTotG = pM.Tot + pS.Tot;
      var pTotPrec = 0; for (var b=0;b<rpPrec.length;b++){ var rrp=rpPrec[b]; var gPrecP = (rrp.G != null ? rrp.G : ((rrp.GU||0) + (rrp.GD||0))); pTotPrec += (rrp.U||0) + (rrp.D||0) + (gPrecP||0); }
      var pVar = pTotG - pTotPrec;
      var datiGruppoP = { membri: pM, simp: pS, totG: pTotG, var: pVar };
      sommaTotali(datiSettore.totP.membri, pM);
      sommaTotali(datiSettore.totP.simp, pS);
      datiSettore.totP.totG += pTotG; datiSettore.totP.var += pVar;
      
      datiSettore.gruppi.push({ nome: gruppo, zadankai: datiGruppoZ, praticanti: datiGruppoP });
    }
    
    // Accumula capitolo
    sommaTotali(totCapitoloZ.membri, datiSettore.totZ.membri);
    sommaTotali(totCapitoloZ.simp, datiSettore.totZ.simp);
    sommaTotali(totCapitoloZ.ospiti, datiSettore.totZ.ospiti);
    totCapitoloZ.totG += datiSettore.totZ.totG; totCapitoloZ.var += datiSettore.totZ.var; totCapitoloZ.fut += datiSettore.totZ.fut; totCapitoloZ.stu += datiSettore.totZ.stu;
    sommaTotali(totCapitoloP.membri, datiSettore.totP.membri);
    sommaTotali(totCapitoloP.simp, datiSettore.totP.simp);
    totCapitoloP.totG += datiSettore.totP.totG; totCapitoloP.var += datiSettore.totP.var;
    
    datiGerarchici.push(datiSettore);
  }
  
  // Genera Tabella Zadankai
  var tableZ = document.createElement("table"); tableZ.className = "table-custom table-zadankai mb-5"; tableZ.innerHTML = getHeaderZadankaiLegacy();
  var tbodyZ = document.createElement("tbody");
  for (var s=0; s<datiGerarchici.length; s++){
    var settore = datiGerarchici[s];
    for (var g=0; g<settore.gruppi.length; g++){
      var gruppo = settore.gruppi[g];
      tbodyZ.appendChild(creaRigaZadankaiLegacy(gruppo.nome, gruppo.zadankai));
    }
    tbodyZ.appendChild(creaRigaZadankaiLegacy("- " + settore.nome.toUpperCase(), settore.totZ, "riga-settore"));
  }
  tbodyZ.appendChild(creaRigaZadankaiLegacy(("- " + capitolo).toUpperCase(), totCapitoloZ, "riga-capitolo"));
  tableZ.appendChild(tbodyZ); containerTabelle.appendChild(tableZ);
  
  if (getFiltroTipoVal() !== "STUDIO_GOSHO") {
    var tableP = document.createElement("table"); tableP.className = "table-custom table-praticanti mb-5"; tableP.innerHTML = getHeaderPraticantiLegacy();
    var tbodyP = document.createElement("tbody");
    for (var s2=0; s2<datiGerarchici.length; s2++){
      var settore2 = datiGerarchici[s2];
      for (var g2=0; g2<settore2.gruppi.length; g2++){
        var gruppo2 = settore2.gruppi[g2];
        tbodyP.appendChild(creaRigaPraticantiLegacy(gruppo2.nome, gruppo2.praticanti));
      }
      tbodyP.appendChild(creaRigaPraticantiLegacy("- " + settore2.nome.toUpperCase(), settore2.totP, "riga-settore"));
    }
    tbodyP.appendChild(creaRigaPraticantiLegacy(("- " + capitolo).toUpperCase(), totCapitoloP, "riga-capitolo"));
    tableP.appendChild(tbodyP); containerTabelle.appendChild(tableP);
  }
  
  // Aggiorna altre sezioni
  mostraGruppiMancanti(datiAnnoMese, anno, mese, capitolo);
}
 
function initTot(){ return { U:0, D:0, G:0, Tot:0, FUT:0, STU:0 }; }
function sommaTotali(dest, src){ dest.U+=src.U; dest.D+=src.D; dest.G+=src.G; dest.Tot+=src.Tot; dest.FUT+=(src.FUT||0); dest.STU+=(src.STU||0); }
function trovaDatiSezione(righe, sezione){
  for (var i=0; i<righe.length; i++){
    if (righe[i].sezione === sezione){
      var r = righe[i];
      var g = (r.G != null ? r.G : ((r.GU || 0) + (r.GD || 0))) || 0;
      return { U:r.U, D:r.D, G:g, Tot:(r.U+r.D+g), FUT:r.FUT, STU:r.STU };
    }
  }
  return { U:0, D:0, G:0, Tot:0, FUT:0, STU:0 };
}
function getHeaderZadankaiLegacy(){
  var headerTitle = (getFiltroTipoVal() === "STUDIO_GOSHO" ? "REPORT STUDIO GOSHO" : "REPORT ZADANKAI");
  return [
    '<thead>',
    '<tr class="header-main">',
    '<th rowspan="2" class="col-zona">' + headerTitle + '<br>ZONA</th>',
    '<th colspan="6" class="col-membri">MEMBRI</th>',
    '<th colspan="6" class="col-simp">SIMPATIZZANTI</th>',
    '<th colspan="4" class="col-nuove">OSPITI</th>',
    '<th colspan="4" class="col-totali">TOTALI</th>',
    '</tr>',
    '<tr class="header-sub">',
    '<th>U</th><th>D</th><th>G</th><th>TOT</th><th>FUT</th><th>STU</th>',
    '<th>U</th><th>D</th><th>G</th><th>TOT</th><th>FUT</th><th>STU</th>',
    '<th>U</th><th>D</th><th>G</th><th>TOT</th>',
    '<th>TOT G.</th><th>VAR</th><th>FUT</th><th>STU</th>',
    '</tr>',
    '</thead>'
  ].join('');
}
function getHeaderPraticantiLegacy(){
  return [
    '<thead>',
    '<tr class="header-main">',
    '<th rowspan="2" class="col-zona">Report Praticanti<br>Zona</th>',
    '<th colspan="4" class="col-praticanti-membri">Praticanti Membri</th>',
    '<th colspan="4" class="col-praticanti-simp">Praticanti Simpatizzanti</th>',
    '<th rowspan="2" class="col-totg">TOT G.</th>',
    '<th rowspan="2" class="col-var">Var</th>',
    '</tr>',
    '<tr class="header-sub">',
    '<th>U</th><th>D</th><th>G</th><th>Tot</th>',
    '<th>U</th><th>D</th><th>G</th><th>Tot</th>',
    '</tr>',
    '</thead>'
  ].join('');
}
function creaRigaZadankaiLegacy(nome, dati, classe){
  var tr = document.createElement("tr");
  if (classe) tr.className = classe;
  var celle = [
    nome,
    dati.membri.U, dati.membri.D, dati.membri.G, dati.membri.Tot, dati.membri.FUT, dati.membri.STU,
    dati.simp.U, dati.simp.D, dati.simp.G, dati.simp.Tot, dati.simp.FUT, dati.simp.STU,
    dati.ospiti.U, dati.ospiti.D, dati.ospiti.G, dati.ospiti.Tot,
    dati.totG, dati.var, dati.fut, dati.stu
  ];
  for (var i=0;i<celle.length;i++){
    var td = document.createElement("td");
    td.textContent = (i === 18 && typeof celle[i] === 'number' && celle[i] > 0) ? ('+' + celle[i]) : celle[i];
    if (i===0) td.className = "text-start fw-bold cella-nome";
    if (i===4 || i===10 || i===16 || i===17 || i===18) td.classList.add('fw-bold');
    tr.appendChild(td);
  }
  return tr;
}
function creaRigaPraticantiLegacy(nome, dati, classe){
  var tr = document.createElement("tr");
  if (classe) tr.className = classe;
  var celle = [
    nome,
    dati.membri.U, dati.membri.D, dati.membri.G, dati.membri.Tot,
    dati.simp.U, dati.simp.D, dati.simp.G, dati.simp.Tot,
    dati.totG, dati.var
  ];
  for (var i=0;i<celle.length;i++){
    var td = document.createElement("td");
    td.textContent = (i === 10 && typeof celle[i] === 'number' && celle[i] > 0) ? ('+' + celle[i]) : celle[i];
    if (i===0) td.className = "text-start fw-bold cella-nome";
    if (i===4 || i===8 || i===9 || i===10) td.classList.add('fw-bold');
    tr.appendChild(td);
  }
  return tr;
}

// 🔹 Mostra gruppi mancanti
function mostraGruppiMancanti(righeFiltrate, anno, mese, capitolo) {
  var contenitoreLista = document.getElementById("gruppi-mancanti");
  contenitoreLista.innerHTML = "";

  // Gruppi del capitolo selezionato
  var strutturaCapitolo = gruppiData["HOMBU 9"][capitolo];
  var gruppiCapitolo = [];
  for (var settore in strutturaCapitolo) {
    gruppiCapitolo = gruppiCapitolo.concat(strutturaCapitolo[settore]);
  }

  // Gruppi presenti nei dati per quel mese
  var gruppiPresenti = [];
  for (var i = 0; i < righeFiltrate.length; i++) {
    var gruppo = righeFiltrate[i].gruppo;
    if (gruppiPresenti.indexOf(gruppo) === -1) {
      gruppiPresenti.push(gruppo);
    }
  }
  
  var gruppiMancanti = [];
  for (var i = 0; i < gruppiCapitolo.length; i++) {
    if (gruppiPresenti.indexOf(gruppiCapitolo[i]) === -1) {
      gruppiMancanti.push(gruppiCapitolo[i]);
    }
  }

  if (gruppiMancanti.length > 0) {
    contenitoreLista.className = "alert alert-warning";
    var ul = document.createElement("ul");
    ul.className = "mb-0 list-unstyled";
    for (var i = 0; i < gruppiMancanti.length; i++) {
      var li = document.createElement("li");
      li.innerHTML = '<i class="fas fa-exclamation-triangle text-danger me-2"></i>' + gruppiMancanti[i];
      ul.appendChild(li);
    }
    contenitoreLista.innerHTML = '<strong>Gruppi senza dati per ' + mese + ' ' + anno + ':</strong>';
    contenitoreLista.appendChild(ul);
  } else {
    contenitoreLista.className = "alert alert-success";
    contenitoreLista.innerHTML = '<i class="fas fa-check-circle me-2"></i>Tutti i gruppi del capitolo hanno inserito dati!';
  }
}

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
    thead.innerHTML = '<tr><th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>G</th><th>Somma</th><th>Prec.</th><th>Totale Gruppi</th><th>Futuro</th><th>Studenti</th></tr>';
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
          U: acc.U + r.U, D: acc.D + r.D, G: acc.G + r.G,
          FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
        };
      }, {U: 0, D: 0, G: 0, FUT: 0, STU: 0});
      
      var totaleMese = sumTot.U + sumTot.D + sumTot.G;
      
      var righePrecTot = righe.filter(function(r) {
        return r.anno === annoPrec && r.mese === mesePrec &&
               r.tipo === tipo &&
               sezioniRilevanti.indexOf(r.sezione) !== -1 &&
               gruppiSettore.indexOf(r.gruppo) !== -1;
      });
      
      var totalePrec = righePrecTot.reduce(function(acc, r) {
        return acc + r.U + r.D + r.G;
      }, 0);
      
      var delta = totaleMese - totalePrec;
      
      for (var j = 0; j < sezioni.length; j++) {
        var sezione = sezioni[j];
        var righeSezione = righeTipo.filter(function(r) { return r.sezione === sezione; });
        
        var sum = righeSezione.reduce(function(acc, r) {
          return {
            U: acc.U + r.U, D: acc.D + r.D, G: acc.G + r.G,
            FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
          };
        }, {U: 0, D: 0, G: 0, FUT: 0, STU: 0});
        
        var sommaTot = sum.U + sum.D + sum.G;
        
        var righePrec = righe.filter(function(r) {
          return r.anno === annoPrec && r.mese === mesePrec &&
                 r.tipo === tipo && r.sezione === sezione &&
                 gruppiSettore.indexOf(r.gruppo) !== -1;
        });
        
        var sommaPrec = righePrec.reduce(function(acc, r) {
          return acc + r.U + r.D + r.G;
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
        
        var celle = [sezione, sum.U, sum.D, sum.G, sommaTot, sommaPrec];
        
        for (var k = 0; k < celle.length; k++) {
          var val = celle[k];
          var td = document.createElement("td");
          td.textContent = val;
          
          // Applica bordi blu per le colonne specifiche
          if (k === 1) { // U (dopo Sezione)
            td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
          } else if (k === 4) { // Somma (dopo G)
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
  theadCap.innerHTML = '<tr><th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>G</th><th>Somma</th><th>Prec.</th><th>Totale Gruppi</th><th>Futuro</th><th>Studenti</th></tr>';
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
        U: acc.U + r.U, D: acc.D + r.D, G: acc.G + r.G,
        FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
      };
    }, {U: 0, D: 0, G: 0, FUT: 0, STU: 0});
    
    var totaleMese = sumTot.U + sumTot.D + sumTot.G;
    
    var righePrecTot = righe.filter(function(r) {
      return r.anno === annoPrec && r.mese === mesePrec &&
             r.tipo === tipo &&
             sezioniRilevanti.indexOf(r.sezione) !== -1 &&
             gruppoToCapitolo[r.gruppo] === capitolo;
    });
    
    var totalePrec = righePrecTot.reduce(function(acc, r) {
      return acc + r.U + r.D + r.G;
    }, 0);
    
    var delta = totaleMese - totalePrec;
    
    for (var j = 0; j < sezioni.length; j++) {
      var sezione = sezioni[j];
      var righeSezione = righeTipo.filter(function(r) { return r.sezione === sezione; });
      
      var sum = righeSezione.reduce(function(acc, r) {
        return {
          U: acc.U + r.U, D: acc.D + r.D, G: acc.G + r.G,
          FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
        };
      }, {U: 0, D: 0, G: 0, FUT: 0, STU: 0});
      
      var sommaTot = sum.U + sum.D + sum.G;
      
      var righePrec = righe.filter(function(r) {
        return r.anno === annoPrec && r.mese === mesePrec &&
               r.tipo === tipo && r.sezione === sezione &&
               gruppoToCapitolo[r.gruppo] === capitolo;
      });
      
      var sommaPrec = righePrec.reduce(function(acc, r) {
        return acc + r.U + r.D + r.G;
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
      
      var celle = [sezione, sum.U, sum.D, sum.G, sommaTot, sommaPrec];
      
      for (var k = 0; k < celle.length; k++) {
        var val = celle[k];
        var td = document.createElement("td");
        td.textContent = val;
        
        // Applica bordi blu per le colonne specifiche
        if (k === 1) { // U (dopo Sezione)
          td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
        } else if (k === 4) { // Somma (dopo G)
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

// 🔹 Esporta in Excel
function esportaExcel() {
  var anno = filtroAnno.value;
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;

  var tables = Array.prototype.slice.call(containerTabelle.querySelectorAll("table"));
  if (tables.length === 0) {
    alert("Nessun dato da esportare");
    return;
  }

  function sanitizeSheetName(name) {
    var n = String(name || "Dati");
    n = n.replace(/[:\\/?*\[\]]/g, " ").replace(/\s+/g, " ").trim();
    if (!n) n = "Dati";
    if (n.length > 31) n = n.slice(0, 31);
    return n;
  }

  function autosizeColumns(ws) {
    var range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    var colWidths = [];
    for (var c = range.s.c; c <= range.e.c; c++) colWidths[c] = 0;
    for (var r = range.s.r; r <= range.e.r; r++) {
      for (var c2 = range.s.c; c2 <= range.e.c; c2++) {
        var addr = XLSX.utils.encode_cell({ r: r, c: c2 });
        var cell = ws[addr];
        if (!cell || cell.v == null) continue;
        var v = String(cell.v);
        if (v.length > colWidths[c2]) colWidths[c2] = v.length;
      }
    }
    ws["!cols"] = colWidths.map(function(w) { return { wch: Math.min(Math.max(w + 2, 6), 40) }; });
  }

  var wb = XLSX.utils.book_new();

  for (var i = 0; i < tables.length; i++) {
    var table = tables[i];
    var sheetBase = "Dati " + (i + 1);
    if (table.classList && table.classList.contains("table-zadankai")) {
      sheetBase = (getFiltroTipoVal() === "STUDIO_GOSHO") ? "Studio Gosho" : "Zadankai";
    } else if (table.classList && table.classList.contains("table-praticanti")) {
      sheetBase = "Praticanti";
    }

    var ws = XLSX.utils.table_to_sheet(table);
    autosizeColumns(ws);
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheetBase));
  }

  XLSX.writeFile(wb, "dati_" + capitolo + "_" + mese + "_" + anno + ".xlsx");
}

function esportaPdf() {
  var anno = filtroAnno.value;
  var mese = filtroMese.value;
  var capitolo = filtroCapitolo.value;
  var tables = Array.prototype.slice.call(containerTabelle.querySelectorAll("table"));
  if (tables.length === 0) {
    alert("Nessun dato da esportare");
    return;
  }

  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF('l', 'pt', 'a4');
  var tipoLabel = (getFiltroTipoVal() === "STUDIO_GOSHO") ? "Studio Gosho" : "Zadankai";

  doc.setFontSize(12);
  doc.text("Statistica " + tipoLabel + " " + capitolo + " - " + mese + " " + anno, 40, 30);

  var y = 40;
  for (var i = 0; i < tables.length; i++) {
    var table = tables[i];
    var fontSize = (table.classList && table.classList.contains("table-zadankai")) ? 6 : 7;

    doc.autoTable({
      html: table,
      startY: y,
      theme: "grid",
      styles: { fontSize: fontSize, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: "bold" }
    });

    y = doc.lastAutoTable.finalY + 20;
    if (y > 520 && i < tables.length - 1) {
      doc.addPage();
      y = 40;
    }
  }

  doc.save("statistica_" + tipoLabel.replace(/\s+/g, "_") + "_" + capitolo + "_" + mese + "_" + anno + ".pdf");
}

// Funzione per generare il dettaglio gruppi per settore
function generaDettaglioGruppiPerSettore(doc, righeFiltrate, anno, mese, capitolo, annoPrec, mesePrec) {
  var yPosition = 20;
  
  // Titolo principale
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Statistica ' + capitolo + ' - ' + mese + ' ' + anno, 20, yPosition);
  yPosition += 20;
  
  // Sottotitolo sezione
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('DETTAGLIO GRUPPI PER SETTORE', 20, yPosition);
  yPosition += 10;
  
  // Ottieni la struttura dei settori
  var struttura = gruppiData["HOMBU 9"][capitolo];
  var settori = Object.keys(struttura);
  
  // Prepara intestazioni tabella
  var intestazioni = [[
    "Gruppo", "Categoria", "Sezione", "U", "D", "G",
    "Somma", "Prec.", "Totale Gruppo", "Futuro", "Studenti"
  ]];
  
  // Itera attraverso i settori
  for (var s = 0; s < settori.length; s++) {
    var settore = settori[s];
    var gruppiSettore = struttura[settore];
    
    // Trova i gruppi presenti per questo settore
    var gruppiPresentiSettore = ottieniGruppiPresentiPerSettore(righeFiltrate, gruppiSettore);
    
    if (gruppiPresentiSettore.length === 0) continue;
    
    // Nuova pagina per ogni settore (tranne il primo)
    if (s > 0) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Crea la tabella per questo settore
    var righeTabella = [];
    
    // Aggiungi intestazione settore come prima riga
    righeTabella.push(creaIntestazioneSettore(settore));
    
    // Aggiungi i dati dei gruppi per questo settore
    for (var g = 0; g < gruppiPresentiSettore.length; g++) {
      var gruppo = gruppiPresentiSettore[g];
      var righeGruppo = righeFiltrate.filter(function(r) {
        return r.gruppo === gruppo;
      });
      
      // Aggiungi separatore tra gruppi (tranne per il primo)
      if (g > 0) {
        righeTabella.push(creaRigaSeparatore());
      }
      
      // Aggiungi le righe per questo gruppo
      var righeGruppoTabella = generaRighePerGruppo(righeGruppo, gruppo, annoPrec, mesePrec);
      righeTabella = righeTabella.concat(righeGruppoTabella);
    }
    
    // Crea la tabella per questo settore
    doc.autoTable({
      head: intestazioni,
      body: righeTabella,
      startY: yPosition,
      styles: { 
        fontSize: 6,
        cellPadding: 2
      },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        6: { fontStyle: 'bold' }, // Somma
        8: { fontStyle: 'bold' }  // Totale Gruppo
      },
      //alternateRowStyles: {
      //  fillColor: false // Disabilita l'alternanza automatica
      //},
      willDrawCell: function(data) {
        // Colora TUTTE le celle della PRIMA riga (intestazione settore) in blu
        if (data.row.index === 0) {
          //data.cell.styles.fillColor = [41, 128, 185]; // Blu
          //data.cell.styles.textColor = [255, 255, 255]; // Bianco
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.halign = 'center';
        }
      }
    });
    
    // Aggiorna la posizione Y per la prossima tabella
    yPosition = doc.lastAutoTable.finalY + 20;
  }
}

// Funzione per generare i riepiloghi dei settori
function generaRiepiloghiSettori(doc, righeFiltrate, anno, mese, capitolo, annoPrec, mesePrec) {
  var struttura = gruppiData["HOMBU 9"][capitolo];
  var settori = Object.keys(struttura);
  
  for (var s = 0; s < settori.length; s++) {
    var settore = settori[s];
    var gruppiSettore = struttura[settore];
    
    var righeSettore = righeFiltrate.filter(function(r) {
      return gruppiSettore.indexOf(r.gruppo) !== -1;
    });
    
    if (righeSettore.length === 0) continue;
    
    // Nuova pagina per ogni settore
    doc.addPage();
    var yPosition = 20;
    
    // Titolo settore
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('RIEPILOGO SETTORE: ' + settore.toUpperCase(), 20, yPosition);
    yPosition += 15;
    
    // Genera la tabella riepilogo per il settore
    var righeSettoreTabella = generaRiepilogoPerTipo(righeSettore, annoPrec, mesePrec, gruppiSettore, "settore");
    
    var intestazioniSettore = [[
      "Categoria", "Sezione", "U", "D", "G",
      "Somma", "Prec.", "Totale Settore", "Futuro", "Studenti"
    ]];
    
    doc.autoTable({
      head: intestazioniSettore,
      body: righeSettoreTabella,
      startY: yPosition,
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [255, 193, 7],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        5: { fontStyle: 'bold' }, // Somma
        7: { fontStyle: 'bold' }  // Totale Settore
      }
    });
  }
}

// Funzione per generare il riepilogo del capitolo
function generaRiepilogoCapitolo(doc, righeFiltrate, anno, mese, capitolo, annoPrec, mesePrec) {
  doc.addPage();
  var yPosition = 20;
  
  // Titolo capitolo
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('RIEPILOGO CAPITOLO: ' + capitolo.toUpperCase(), 20, yPosition);
  yPosition += 15;
  
  // Genera la tabella riepilogo per il capitolo
  var righeCapitoloTabella = generaRiepilogoPerTipo(righeFiltrate, annoPrec, mesePrec, null, "capitolo");
  
  var intestazioniCapitolo = [[
    "Categoria", "Sezione", "U", "D", "G",
    "Somma", "Prec.", "Totale Capitolo", "Futuro", "Studenti"
  ]];
  
  doc.autoTable({
    head: intestazioniCapitolo,
    body: righeCapitoloTabella,
    startY: yPosition,
    styles: { 
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: { 
      fillColor: [13, 110, 253],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      5: { fontStyle: 'bold' }, // Somma
      7: { fontStyle: 'bold' }  // Totale Capitolo
    }
  });
}

// Funzioni di utilità
function ottieniGruppiPresentiPerSettore(righeFiltrate, gruppiSettore) {
  var gruppiPresenti = [];
  for (var i = 0; i < righeFiltrate.length; i++) {
    var gruppo = righeFiltrate[i].gruppo;
    if (gruppiSettore.indexOf(gruppo) !== -1 && gruppiPresenti.indexOf(gruppo) === -1) {
      gruppiPresenti.push(gruppo);
    }
  }
  return gruppiPresenti.sort();
}

function getGVal(r) {
  if (!r) return 0;
  if (r.G != null) return r.G || 0;
  return (r.GU || 0) + (r.GD || 0);
}

function getTipoLabel(tipo) {
  if (getFiltroTipoVal() === "STUDIO_GOSHO" && tipo === "ZADANKAI") return "STUDIO GOSHO";
  return tipo;
}

function creaRigaSeparatore() {
  return ["", "", "", "", "", "", "", "", "", "", ""];
}

function creaIntestazioneSettore(settore) {
  return ["SETTORE: " + settore.toUpperCase(), "", "", "", "", "", "", "", "", "", ""];
}

function generaRighePerGruppo(righeGruppo, gruppo, annoPrec, mesePrec) {
  var righeTabella = [];
  var tipi = ["ZADANKAI", "PRATICANTI"];
  
  for (var t = 0; t < tipi.length; t++) {
    var tipo = tipi[t];
    var righeCategoria = righeGruppo.filter(function(r) {
      return r.tipo === tipo;
    });
    
    if (righeCategoria.length === 0) continue;
    
    // Ordina le sezioni per ZADANKAI
    if (tipo === "ZADANKAI") {
      var sezioniOrdinate = ["membri", "simpatizzanti", "ospiti"];
      righeCategoria.sort(function(a, b) {
        return sezioniOrdinate.indexOf(a.sezione) - sezioniOrdinate.indexOf(b.sezione);
      });
    }
    
    // Calcola totali per la categoria
    var totaleCategoria = calcolaTotaleCategoria(righeCategoria);
    var totalePrec = calcolaTotalePrecedente(gruppo, tipo, annoPrec, mesePrec);
    var delta = totaleCategoria - totalePrec;
    
    // Aggiungi le righe per ogni sezione
    for (var rc = 0; rc < righeCategoria.length; rc++) {
      var r = righeCategoria[rc];
      var g = getGVal(r);
      var somma = r.U + r.D + g;
      
      var sommaPrec = calcolaSommaPrecedenteSezione(gruppo, tipo, r.sezione, annoPrec, mesePrec);
      
      var totaleGruppo = "";
      if (rc === 0) {
        var deltaStr = delta >= 0 ? "+" + delta : "" + delta;
        totaleGruppo = totaleCategoria + " (Prec: " + totalePrec + ", Δ: " + deltaStr + ")";
      }
      
      righeTabella.push([
        gruppo, getTipoLabel(tipo), r.sezione, r.U, r.D, g,
        somma, sommaPrec, totaleGruppo, r.FUT, r.STU
      ]);
    }
  }
  
  return righeTabella;
}

function generaRiepilogoPerTipo(righeFiltrate, annoPrec, mesePrec, gruppiSettore, tipoRiepilogo) {
  var righeTabella = [];
  var tipi = ["ZADANKAI", "PRATICANTI"];
  
  for (var t = 0; t < tipi.length; t++) {
    var tipo = tipi[t];
    var righeTipo = righeFiltrate.filter(function(r) { return r.tipo === tipo; });
    if (righeTipo.length === 0) continue;
    
    var sezioni = ottieniSezioniUniche(righeTipo, tipo);
    var sezioniRilevanti = tipo === "ZADANKAI" ? ["membri", "simpatizzanti", "ospiti"] : ["membri", "simpatizzanti"];
    
    // Calcola totali per il tipo
    var righeTotali = righeTipo.filter(function(r) {
      return sezioniRilevanti.indexOf(r.sezione) !== -1;
    });
    
    var totaleMese = calcolaTotaleRighe(righeTotali);
    var totalePrec = calcolaTotalePrecedentePerTipo(tipo, sezioniRilevanti, annoPrec, mesePrec, gruppiSettore, tipoRiepilogo);
    var delta = totaleMese - totalePrec;
    
    // Aggiungi righe per ogni sezione
    for (var j = 0; j < sezioni.length; j++) {
      var sezione = sezioni[j];
      var righeSezione = righeTipo.filter(function(r) { return r.sezione === sezione; });
      
      var sum = calcolaRiepilogoSezione(righeSezione);
      var sommaTot = sum.U + sum.D + sum.G;
      
      var sommaPrec = calcolaSommaPrecedenteRiepilogo(tipo, sezione, annoPrec, mesePrec, gruppiSettore, tipoRiepilogo);
      
      var totaleColonna = "";
      if (j === 0) {
        var deltaStr = delta >= 0 ? "+" + delta : "" + delta;
        var nomeColonna = tipoRiepilogo === "settore" ? "Settore" : "Capitolo";
        totaleColonna = totaleMese + " (Prec: " + totalePrec + ", Δ: " + deltaStr + ")";
      }
      
      var riga = j === 0 ? 
        [getTipoLabel(tipo), sezione, sum.U, sum.D, sum.G, sommaTot, sommaPrec, totaleColonna, sum.FUT, sum.STU] :
        ["", sezione, sum.U, sum.D, sum.G, sommaTot, sommaPrec, "", sum.FUT, sum.STU];
      
      righeTabella.push(riga);
    }
  }
  
  return righeTabella;
}

// Funzioni di calcolo
function calcolaTotaleCategoria(righeCategoria) {
  return righeCategoria.reduce(function(acc, r) {
    return acc + r.U + r.D + getGVal(r);
  }, 0);
}

function calcolaTotalePrecedente(gruppo, tipo, annoPrec, mesePrec) {
  var righePrecedenti = righe.filter(function(r) {
    return r.anno === annoPrec && r.mese === mesePrec &&
           r.gruppo === gruppo && r.tipo === tipo;
  });
  
  return righePrecedenti.reduce(function(acc, r) {
    return acc + r.U + r.D + getGVal(r);
  }, 0);
}

function calcolaSommaPrecedenteSezione(gruppo, tipo, sezione, annoPrec, mesePrec) {
  var righePrecedenti = righe.filter(function(r) {
    return r.anno === annoPrec && r.mese === mesePrec &&
           r.gruppo === gruppo && r.tipo === tipo && r.sezione === sezione;
  });
  
  return righePrecedenti.reduce(function(acc, r) {
    return acc + r.U + r.D + getGVal(r);
  }, 0);
}

function ottieniSezioniUniche(righeTipo, tipo) {
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
  
  return sezioni;
}

function calcolaTotaleRighe(righe) {
  return righe.reduce(function(acc, r) {
    return acc + r.U + r.D + getGVal(r);
  }, 0);
}

function calcolaTotalePrecedentePerTipo(tipo, sezioniRilevanti, annoPrec, mesePrec, gruppiSettore, tipoRiepilogo) {
  var filtro = function(r) {
    var baseCondition = r.anno === annoPrec && r.mese === mesePrec &&
                       r.tipo === tipo && sezioniRilevanti.indexOf(r.sezione) !== -1;
    
    if (tipoRiepilogo === "settore" && gruppiSettore) {
      return baseCondition && gruppiSettore.indexOf(r.gruppo) !== -1;
    } else if (tipoRiepilogo === "capitolo") {
      return baseCondition && gruppoToCapitolo[r.gruppo] === filtroCapitolo.value;
    }
    
    return baseCondition;
  };
  
  var righePrecedenti = righe.filter(filtro);
  return calcolaTotaleRighe(righePrecedenti);
}

function calcolaRiepilogoSezione(righeSezione) {
  return righeSezione.reduce(function(acc, r) {
    return {
      U: acc.U + r.U, D: acc.D + r.D, G: acc.G + getGVal(r),
      FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
    };
  }, {U: 0, D: 0, G: 0, FUT: 0, STU: 0});
}

function calcolaSommaPrecedenteRiepilogo(tipo, sezione, annoPrec, mesePrec, gruppiSettore, tipoRiepilogo) {
  var filtro = function(r) {
    var baseCondition = r.anno === annoPrec && r.mese === mesePrec &&
                       r.tipo === tipo && r.sezione === sezione;
    
    if (tipoRiepilogo === "settore" && gruppiSettore) {
      return baseCondition && gruppiSettore.indexOf(r.gruppo) !== -1;
    } else if (tipoRiepilogo === "capitolo") {
      return baseCondition && gruppoToCapitolo[r.gruppo] === filtroCapitolo.value;
    }
    
    return baseCondition;
  };
  
  var righePrecedenti = righe.filter(filtro);
  return calcolaTotaleRighe(righePrecedenti);
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
      window.location.href = "index.html";
    }
  });
  
  // Event listener per logout
  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});
