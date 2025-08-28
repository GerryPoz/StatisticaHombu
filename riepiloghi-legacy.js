// Inizializza Firebase
firebase.initializeApp(firebaseConfig);
var database = firebase.database();
var auth = firebase.auth();

// Configurazione bordi
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

// Variabili globali
var righe = [];
var gruppiData;
var gruppoToCapitolo = {};

var mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

// Autenticazione
auth.onAuthStateChanged(function(user) {
    if (user) {
        console.log('Utente autenticato:', user.email);
        caricaDati();
    } else {
        window.location.href = 'index.html';
    }
});

// Funzione per ottenere il mese precedente
function mesePrecedente(mese, anno) {
  var idx = mesiOrdine.indexOf(mese);
  var nuovoIdx = (idx - 1 + 12) % 12;
  var nuovoAnno = idx === 0 ? String(Number(anno) - 1) : anno;
  return { mese: mesiOrdine[nuovoIdx], anno: nuovoAnno };
}

// Carica dati
function caricaDati() {
    console.log('Caricamento dati in corso...');
    
    // Carica gruppi.json
    fetch('gruppi.json')
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            gruppiData = data;
            console.log('Dati gruppi caricati:', gruppiData);
            
            // Popola gruppoToCapitolo
            var struttura = gruppiData["HOMBU 9"];
            for (var capitolo in struttura) {
                var settori = struttura[capitolo];
                for (var settore in settori) {
                    var gruppi = settori[settore];
                    for (var i = 0; i < gruppi.length; i++) {
                        gruppoToCapitolo[gruppi[i]] = capitolo;
                    }
                }
            }
            
            // Carica dati zadankai da Firebase
            return database.ref('zadankai').once('value');
        })
        .then(function(snapshot) {
            if (snapshot.exists()) {
                var dati = snapshot.val();
                console.log('Dati zadankai caricati da Firebase');
                
                // Elabora i dati
                for (var key in dati) {
                    var parts = key.split('-');
                    var anno = parts[0];
                    var mese = parts[1];
                    var gruppo = parts[2];
                    var sezioni = dati[key];
                    
                    // Zadankai
                    for (var categoria in sezioni.zadankai) {
                        var r = sezioni.zadankai[categoria];
                        righe.push({ 
                            anno: anno, mese: mese, gruppo: gruppo, tipo: "ZADANKAI", sezione: categoria,
                            U: r.U || 0, D: r.D || 0, GU: r.GU || 0, GD: r.GD || 0, 
                            FUT: r.FUT || 0, STU: r.STU || 0 
                        });
                    }
                    
                    // Praticanti
                    for (var categoria in sezioni.praticanti) {
                        var r = sezioni.praticanti[categoria];
                        righe.push({ 
                            anno: anno, mese: mese, gruppo: gruppo, tipo: "PRATICANTI", sezione: categoria,
                            U: r.U || 0, D: r.D || 0, GU: r.GU || 0, GD: r.GD || 0, 
                            FUT: r.FUT || 0, STU: r.STU || 0 
                        });
                    }
                }
                
                console.log('Righe elaborate:', righe.length);
                inizializzaFiltri();
            } else {
                console.log('Nessun dato trovato in Firebase');
            }
        })
        .catch(function(error) {
            console.error('Errore nel caricamento dei dati:', error);
        });

    // Aggiungi event listener per i pulsanti
    var btnPrint = document.getElementById('btn-print');
    if (btnPrint) {
        btnPrint.addEventListener('click', stampa);
        console.log('Event listener per stampa aggiunto');
    }

    var btnExportPdf = document.getElementById('btn-export-pdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', esportaPdf);
        console.log('Event listener per esporta PDF aggiunto');
    }

    var btnExportExcel = document.getElementById('btn-export-excel');
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', esportaExcel);
        console.log('Event listener per esporta Excel aggiunto');
    }
}

// Inizializza filtri
function inizializzaFiltri() {
    var filtroAnno = document.getElementById('filtro-anno');
    var filtroMese = document.getElementById('filtro-mese');
    
    // Popola anni
    var anni = [];
    for (var i = 0; i < righe.length; i++) {
        if (anni.indexOf(righe[i].anno) === -1) {
            anni.push(righe[i].anno);
        }
    }
    anni.sort();
    
    for (var i = 0; i < anni.length; i++) {
        var option = document.createElement('option');
        option.value = anni[i];
        option.textContent = anni[i];
        filtroAnno.appendChild(option);
    }
    
    // Popola mesi
    var mesi = [];
    for (var i = 0; i < righe.length; i++) {
        if (mesi.indexOf(righe[i].mese) === -1) {
            mesi.push(righe[i].mese);
        }
    }
    
    var mesiOrdinati = mesi.sort(function(a, b) {
        return mesiOrdine.indexOf(a) - mesiOrdine.indexOf(b);
    });
    
    for (var i = 0; i < mesiOrdinati.length; i++) {
        var option = document.createElement('option');
        option.value = mesiOrdinati[i];
        option.textContent = mesiOrdinati[i];
        filtroMese.appendChild(option);
    }
    
    // Seleziona valori più recenti
    if (anni.length > 0) filtroAnno.value = anni[anni.length - 1];
    if (mesiOrdinati.length > 0) filtroMese.value = mesiOrdinati[mesiOrdinati.length - 1];
    
    // Aggiungi event listeners
    filtroAnno.addEventListener('change', aggiornaRiepiloghi);
    filtroMese.addEventListener('change', aggiornaRiepiloghi);
    
    // Genera riepiloghi iniziali
    aggiornaRiepiloghi();
}

// Aggiorna riepiloghi
function aggiornaRiepiloghi() {
    var annoSelezionato = document.getElementById('filtro-anno').value;
    var meseSelezionato = document.getElementById('filtro-mese').value;
    
    if (!annoSelezionato || !meseSelezionato) {
        console.log('Filtri non completi');
        return;
    }
    
    console.log('Aggiornamento riepiloghi:', { annoSelezionato: annoSelezionato, meseSelezionato: meseSelezionato });

    // Pulisci il contenitore prima di generare i nuovi riepiloghi
    document.getElementById('contenitore-riepiloghi').innerHTML = '';
  
    // Filtra i dati
    var righeFiltrate = righe.filter(function(r) {
        return r.anno === annoSelezionato && r.mese === meseSelezionato;
    });
    
    var mesePrec = mesePrecedente(meseSelezionato, annoSelezionato);
    
    // Genera riepiloghi
    generaRiepilogoHombu(righeFiltrate, meseSelezionato, annoSelezionato, mesePrec.mese, mesePrec.anno);
    generaRiepiloghiCapitoli(righeFiltrate, meseSelezionato, annoSelezionato, mesePrec.mese, mesePrec.anno);
}

// Genera riepilogo Hombu generale
function generaRiepilogoHombu(righeFiltrate, mese, anno, mesePrec, annoPrec) {
    var contenitore = document.getElementById('contenitore-riepiloghi');
    
    // Crea card per Hombu
    var cardHombu = document.createElement('div');
    cardHombu.className = 'card shadow-sm mb-4';
    
    var cardHeader = document.createElement('div');
    cardHeader.className = 'card-header bg-success text-white';
    cardHeader.innerHTML = '<h5 class="mb-0"><i class="fas fa-home me-2"></i>Riepilogo Generale: HOMBU 9 - ' + mese + ' ' + anno + '</h5>';
    cardHombu.appendChild(cardHeader);
    
    var cardBody = document.createElement('div');
    cardBody.className = 'card-body table-responsive';
    
    var tabella = document.createElement('table');
    tabella.className = 'table table-striped table-bordered';
    
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th><th>Somma</th><th>Prec.</th><th>Totale Hombu</th><th>Futuro</th><th>Studenti</th></tr>';
    tabella.appendChild(thead);
    
    var tbody = document.createElement('tbody');
    
    ["ZADANKAI", "PRATICANTI"].forEach(function(tipo) {
        var righeTipo = righeFiltrate.filter(function(r) { return r.tipo === tipo; });
        if (righeTipo.length === 0) return;
        
        var sezioni = righeTipo.map(function(r) { return r.sezione; })
            .filter(function(value, index, self) { return self.indexOf(value) === index; });
        
        if (tipo === "ZADANKAI") {
            var ordine = ["membri", "simpatizzanti", "ospiti"];
            sezioni.sort(function(a, b) { return ordine.indexOf(a) - ordine.indexOf(b); });
        }
        
        var tipoRowSpan = sezioni.length;
        var sezioniRilevanti = tipo === "ZADANKAI" 
            ? ["membri", "simpatizzanti", "ospiti"]
            : ["membri", "simpatizzanti"];
        
        var righeTotali = righeTipo.filter(function(r) { return sezioniRilevanti.indexOf(r.sezione) !== -1; });
        var sumTot = righeTotali.reduce(function(acc, r) {
            return {
                U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
                GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
            };
        }, {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
        var totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
        
        var righePrecTot = righe.filter(function(r) {
            return r.anno === annoPrec && r.mese === mesePrec &&
                   r.tipo === tipo && sezioniRilevanti.indexOf(r.sezione) !== -1;
        });
        var totalePrec = righePrecTot.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
        var delta = totaleMese - totalePrec;
        
        sezioni.forEach(function(sezione, index) {
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
                       r.tipo === tipo && r.sezione === sezione;
            });
            var sommaPrec = righePrec.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
            
            var tr = document.createElement('tr');
            tr.className = tipo === "ZADANKAI" ? "table-warning" : "table-info";
            
            if (index === 0) {
                var tdTipo = document.createElement('td');
                tdTipo.textContent = tipo;
                tdTipo.rowSpan = tipoRowSpan;
                tdTipo.className = 'fw-bold';
                tr.appendChild(tdTipo);
            }
            
            var celle = [sezione, sum.U, sum.D, sum.GU, sum.GD, sommaTot, sommaPrec];
            celle.forEach(function(val, i) {
                var td = document.createElement('td');
                td.textContent = val;
                if (i === 1) { // U
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                } else if (i === 5) { // Somma
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                    td.style.fontWeight = "bold";
                }
                tr.appendChild(td);
            });
            
            if (index === 0) {
                var tdTot = document.createElement('td');
                tdTot.rowSpan = tipoRowSpan;
                tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                tdTot.innerHTML = '<div style="font-size: 1.2em;"><strong>' + totaleMese + '</strong></div>' +
                    '<div class="small">Prec: ' + totalePrec + '</div>' +
                    '<div class="' + (delta >= 0 ? 'text-success' : 'text-danger') + ' fw-bold">' +
                    'Δ ' + (delta >= 0 ? "+" : "") + delta + '</div>';
                tdTot.className = 'text-center';
                tr.appendChild(tdTot);
            }
            
            var tdFUT = document.createElement('td');
            tdFUT.textContent = sum.FUT;
            tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
            var tdSTU = document.createElement('td');
            tdSTU.textContent = sum.STU;
            tr.appendChild(tdFUT);
            tr.appendChild(tdSTU);
            
            tbody.appendChild(tr);
        });
    });
    
    tabella.appendChild(tbody);
    cardBody.appendChild(tabella);
    cardHombu.appendChild(cardBody);
    contenitore.appendChild(cardHombu);
}

// Genera riepiloghi per capitoli
function generaRiepiloghiCapitoli(righeFiltrate, mese, anno, mesePrec, annoPrec) {
    var contenitore = document.getElementById('contenitore-riepiloghi');
    var struttura = gruppiData["HOMBU 9"];
    
    // Per ogni capitolo
    Object.keys(struttura).forEach(function(capitolo) {
        var settori = struttura[capitolo];
        var righeFiltrateCap = righeFiltrate.filter(function(r) { return gruppoToCapitolo[r.gruppo] === capitolo; });
        if (righeFiltrateCap.length === 0) return;
        
        // Genera riepiloghi per settori del capitolo
        Object.keys(settori).forEach(function(settore) {
            var gruppiSettore = settori[settore];
            var righeSettore = righeFiltrateCap.filter(function(r) { return gruppiSettore.indexOf(r.gruppo) !== -1; });
            if (righeSettore.length === 0) return;
            
            generaRiepilogoSettore(righeSettore, settore, mese, anno, mesePrec, annoPrec, gruppiSettore, contenitore);
        });
        
        // Genera riepilogo capitolo
        generaRiepilogoCapitolo(righeFiltrateCap, capitolo, mese, anno, mesePrec, annoPrec, contenitore);
    });
}

// Genera riepilogo per un settore
function generaRiepilogoSettore(righeSettore, settore, mese, anno, mesePrec, annoPrec, gruppiSettore, contenitore) {
    var cardSettore = document.createElement('div');
    cardSettore.className = 'card shadow-sm mb-4';
    
    var cardHeader = document.createElement('div');
    cardHeader.className = 'card-header bg-warning text-dark';
    cardHeader.innerHTML = '<h5 class="mb-0"><i class="fas fa-chart-pie me-2"></i>Riepilogo: ' + settore + '</h5>';
    cardSettore.appendChild(cardHeader);
    
    var cardBody = document.createElement('div');
    cardBody.className = 'card-body table-responsive';
    
    var tabella = document.createElement('table');
    tabella.className = 'table table-striped table-bordered';
    
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th><th>Somma</th><th>Prec.</th><th>Totale Settore</th><th>Futuro</th><th>Studenti</th></tr>';
    tabella.appendChild(thead);
    
    var tbody = document.createElement('tbody');
    
    ["ZADANKAI", "PRATICANTI"].forEach(function(tipo) {
        var righeTipo = righeSettore.filter(function(r) { return r.tipo === tipo; });
        if (righeTipo.length === 0) return;
        
        var sezioni = righeTipo.map(function(r) { return r.sezione; })
            .filter(function(value, index, self) { return self.indexOf(value) === index; });
        
        if (tipo === "ZADANKAI") {
            var ordine = ["membri", "simpatizzanti", "ospiti"];
            sezioni.sort(function(a, b) { return ordine.indexOf(a) - ordine.indexOf(b); });
        }
        
        var tipoRowSpan = sezioni.length;
        var sezioniRilevanti = tipo === "ZADANKAI" 
            ? ["membri", "simpatizzanti", "ospiti"]
            : ["membri", "simpatizzanti"];
        
        var righeTotali = righeTipo.filter(function(r) { return sezioniRilevanti.indexOf(r.sezione) !== -1; });
        var sumTot = righeTotali.reduce(function(acc, r) {
            return {
                U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
                GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
            };
        }, {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
        var totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
        
        var righePrecTot = righe.filter(function(r) {
            return r.anno === annoPrec && r.mese === mesePrec &&
                   r.tipo === tipo && sezioniRilevanti.indexOf(r.sezione) !== -1 &&
                   gruppiSettore.indexOf(r.gruppo) !== -1;
        });
        var totalePrec = righePrecTot.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
        var delta = totaleMese - totalePrec;
        
        sezioni.forEach(function(sezione, index) {
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
            var sommaPrec = righePrec.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
            
            var tr = document.createElement('tr');
            tr.className = tipo === "ZADANKAI" ? "table-warning" : "table-info";
            
            if (index === 0) {
                var tdTipo = document.createElement('td');
                tdTipo.textContent = tipo;
                tdTipo.rowSpan = tipoRowSpan;
                tdTipo.className = 'fw-bold';
                tr.appendChild(tdTipo);
            }
            
            var celle = [sezione, sum.U, sum.D, sum.GU, sum.GD, sommaTot, sommaPrec];
            celle.forEach(function(val, i) {
                var td = document.createElement('td');
                td.textContent = val;
                if (i === 1) { // U
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                } else if (i === 5) { // Somma
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                    td.style.fontWeight = "bold";
                }
                tr.appendChild(td);
            });
            
            if (index === 0) {
                var tdTot = document.createElement('td');
                tdTot.rowSpan = tipoRowSpan;
                tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                tdTot.innerHTML = '<div style="font-size: 1.2em;"><strong>' + totaleMese + '</strong></div>' +
                    '<div class="small">Prec: ' + totalePrec + '</div>' +
                    '<div class="' + (delta >= 0 ? 'text-success' : 'text-danger') + ' fw-bold">' +
                    'Δ ' + (delta >= 0 ? "+" : "") + delta + '</div>';
                tdTot.className = 'text-center';
                tr.appendChild(tdTot);
            }
            
            var tdFUT = document.createElement('td');
            tdFUT.textContent = sum.FUT;
            tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
            var tdSTU = document.createElement('td');
            tdSTU.textContent = sum.STU;
            tr.appendChild(tdFUT);
            tr.appendChild(tdSTU);
            
            tbody.appendChild(tr);
        });
    });
    
    tabella.appendChild(tbody);
    cardBody.appendChild(tabella);
    cardSettore.appendChild(cardBody);
    contenitore.appendChild(cardSettore);
}

// Genera riepilogo per un capitolo
function generaRiepilogoCapitolo(righeFiltrateCap, capitolo, mese, anno, mesePrec, annoPrec, contenitore) {
    var cardCapitolo = document.createElement('div');
    cardCapitolo.className = 'card shadow-sm mb-4';
    
    var cardHeader = document.createElement('div');
    cardHeader.className = 'card-header bg-primary text-white';
    cardHeader.innerHTML = '<h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Riepilogo: ' + capitolo + '</h5>';
    cardCapitolo.appendChild(cardHeader);
    
    var cardBody = document.createElement('div');
    cardBody.className = 'card-body table-responsive';
    
    var tabella = document.createElement('table');
    tabella.className = 'table table-striped table-bordered';
    
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Categoria</th><th>Sezione</th><th>U</th><th>D</th><th>GU</th><th>GD</th><th>Somma</th><th>Prec.</th><th>Totale Capitolo</th><th>Futuro</th><th>Studenti</th></tr>';
    tabella.appendChild(thead);
    
    var tbody = document.createElement('tbody');
    
    ["ZADANKAI", "PRATICANTI"].forEach(function(tipo) {
        var righeTipo = righeFiltrateCap.filter(function(r) { return r.tipo === tipo; });
        if (righeTipo.length === 0) return;
        
        var sezioni = righeTipo.map(function(r) { return r.sezione; })
            .filter(function(value, index, self) { return self.indexOf(value) === index; });
        
        if (tipo === "ZADANKAI") {
            var ordine = ["membri", "simpatizzanti", "ospiti"];
            sezioni.sort(function(a, b) { return ordine.indexOf(a) - ordine.indexOf(b); });
        }
        
        var tipoRowSpan = sezioni.length;
        var sezioniRilevanti = tipo === "ZADANKAI" 
            ? ["membri", "simpatizzanti", "ospiti"]
            : ["membri", "simpatizzanti"];
        
        var righeTotali = righeTipo.filter(function(r) { return sezioniRilevanti.indexOf(r.sezione) !== -1; });
        var sumTot = righeTotali.reduce(function(acc, r) {
            return {
                U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
                GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
            };
        }, {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
        var totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
        
        var righePrecTot = righe.filter(function(r) {
            return r.anno === annoPrec && r.mese === mesePrec &&
                   r.tipo === tipo && sezioniRilevanti.indexOf(r.sezione) !== -1 &&
                   gruppoToCapitolo[r.gruppo] === capitolo;
        });
        var totalePrec = righePrecTot.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
        var delta = totaleMese - totalePrec;
        
        sezioni.forEach(function(sezione, index) {
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
            var sommaPrec = righePrec.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
            
            var tr = document.createElement('tr');
            tr.className = tipo === "ZADANKAI" ? "table-warning" : "table-info";
            
            if (index === 0) {
                var tdTipo = document.createElement('td');
                tdTipo.textContent = tipo;
                tdTipo.rowSpan = tipoRowSpan;
                tdTipo.className = 'fw-bold';
                tr.appendChild(tdTipo);
            }
            
            var celle = [sezione, sum.U, sum.D, sum.GU, sum.GD, sommaTot, sommaPrec];
            celle.forEach(function(val, i) {
                var td = document.createElement('td');
                td.textContent = val;
                if (i === 1) { // U
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                } else if (i === 5) { // Somma
                    td.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                    td.style.fontWeight = "bold";
                }
                tr.appendChild(td);
            });
            
            if (index === 0) {
                var tdTot = document.createElement('td');
                tdTot.rowSpan = tipoRowSpan;
                tdTot.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
                tdTot.innerHTML = '<div style="font-size: 1.2em;"><strong>' + totaleMese + '</strong></div>' +
                    '<div class="small">Prec: ' + totalePrec + '</div>' +
                    '<div class="' + (delta >= 0 ? 'text-success' : 'text-danger') + ' fw-bold">' +
                    'Δ ' + (delta >= 0 ? "+" : "") + delta + '</div>';
                tdTot.className = 'text-center';
                tr.appendChild(tdTot);
            }
            
            var tdFUT = document.createElement('td');
            tdFUT.textContent = sum.FUT;
            tdFUT.style.borderLeft = BORDER_CONFIG.getVerticalBorder();
            var tdSTU = document.createElement('td');
            tdSTU.textContent = sum.STU;
            tr.appendChild(tdFUT);
            tr.appendChild(tdSTU);
            
            tbody.appendChild(tr);
        });
    });
    
    tabella.appendChild(tbody);
    cardBody.appendChild(tabella);
    cardCapitolo.appendChild(cardBody);
    contenitore.appendChild(cardCapitolo);
}

// Funzioni di esportazione
function esportaExcel() {
    alert("Funzione di esportazione Excel in sviluppo per la versione legacy");
}

function esportaPdf() {
    var annoSelezionato = document.getElementById('filtro-anno').value;
    var meseSelezionato = document.getElementById('filtro-mese').value;
    
    if (!annoSelezionato || !meseSelezionato) {
        alert("Seleziona anno e mese per esportare");
        return;
    }
    
    // Filtra i dati
    var righeFiltrate = righe.filter(function(r) {
        return r.anno === annoSelezionato && r.mese === meseSelezionato;
    });
    
    if (righeFiltrate.length === 0) {
        alert("Nessun dato da esportare per il periodo selezionato");
        return;
    }
    
    var mesePrecObj = mesePrecedente(meseSelezionato, annoSelezionato);
    var mesePrec = mesePrecObj.mese;
    var annoPrec = mesePrecObj.anno;
    
    // Crea il documento PDF
    var doc = new jsPDF('landscape');
    
    // Titolo principale
    doc.setFontSize(18);
    doc.text('Riepiloghi HOMBU 9 - ' + meseSelezionato + ' ' + annoSelezionato, 20, 20);
    
    var yPosition = 40;
    
    // ===== RIEPILOGO HOMBU GENERALE DETTAGLIATO =====
    doc.setFontSize(14);
    doc.text('RIEPILOGO HOMBU GENERALE', 20, yPosition);
    yPosition += 10;
    
    // Prepara tabella dettagliata Hombu
    var intestazioniHombu = [['Categoria', 'Sezione', 'U', 'D', 'GU', 'GD', 'Somma', 'Prec.', 'Totale Hombu', 'Futuro', 'Studenti']];
    var righeHombuDettagliate = [];
    
    ["ZADANKAI", "PRATICANTI"].forEach(function(tipo) {
        var righeTipo = righeFiltrate.filter(function(r) { return r.tipo === tipo; });
        if (righeTipo.length === 0) return;
        
        // Raggruppa per sezione
        var sezioni = righeTipo.map(function(r) { return r.sezione; })
            .filter(function(value, index, self) { return self.indexOf(value) === index; });
        if (tipo === "ZADANKAI") {
            var ordine = ["membri", "simpatizzanti", "ospiti"];
            sezioni.sort(function(a, b) { return ordine.indexOf(a) - ordine.indexOf(b); });
        }
        
        var sezioniRilevanti = tipo === "ZADANKAI" 
            ? ["membri", "simpatizzanti", "ospiti"]
            : ["membri", "simpatizzanti"];
        
        var righeTotali = righeTipo.filter(function(r) { return sezioniRilevanti.indexOf(r.sezione) !== -1; });
        var sumTot = righeTotali.reduce(function(acc, r) {
            return {
                U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
                GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
            };
        }, {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
        var totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
        
        var righePrecTot = righe.filter(function(r) {
            return r.anno === annoPrec && r.mese === mesePrec &&
                   r.tipo === tipo && sezioniRilevanti.indexOf(r.sezione) !== -1;
        });
        var totalePrec = righePrecTot.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
        var delta = totaleMese - totalePrec;
        
        sezioni.forEach(function(sezione, index) {
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
                       r.tipo === tipo && r.sezione === sezione;
            });
            var sommaPrec = righePrec.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
            
            var riga = [
                index === 0 ? tipo : '',
                sezione,
                sum.U, sum.D, sum.GU, sum.GD,
                sommaTot,
                sommaPrec,
                index === 0 ? totaleMese + ' (Prec: ' + totalePrec + ', Δ: ' + (delta >= 0 ? "+" : "") + delta + ')' : '',
                sum.FUT,
                sum.STU
            ];
            
            righeHombuDettagliate.push(riga);
        });
    });
    
    doc.autoTable({
        head: intestazioniHombu,
        body: righeHombuDettagliate,
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
            6: { fontStyle: 'bold' }, // Somma
            8: { fontStyle: 'bold' }  // Totale Hombu
        }
    });
    
    yPosition = doc.lastAutoTable.finalY + 20;
    
    // ===== RIEPILOGHI DETTAGLIATI PER CAPITOLO =====
    var capitoli = righeFiltrate.map(function(r) { return gruppoToCapitolo[r.gruppo]; })
        .filter(function(value, index, self) { return value && self.indexOf(value) === index; })
        .sort();
    
    capitoli.forEach(function(capitolo) {
        // Nuova pagina per ogni capitolo
        doc.addPage();
        yPosition = 10;
        
        doc.setFontSize(16);
        doc.text('CAPITOLO: ' + capitolo, 20, yPosition);
        yPosition += 10;
        
        var righeFiltrateCap = righeFiltrate.filter(function(r) { return gruppoToCapitolo[r.gruppo] === capitolo; });
        
        // Raggruppa per settore
        var settori = {};
        righeFiltrateCap.forEach(function(r) {
            if (!gruppiData || !gruppiData["HOMBU 9"] || !gruppiData["HOMBU 9"][capitolo]) return;
            
            for (var settore in gruppiData["HOMBU 9"][capitolo]) {
                var gruppiSettore = gruppiData["HOMBU 9"][capitolo][settore];
                if (Array.isArray(gruppiSettore) && gruppiSettore.indexOf(r.gruppo) !== -1) {
                    if (!settori[settore]) settori[settore] = [];
                    settori[settore].push(r);
                    break;
                }
            }
        });
        
        // ===== TABELLE DETTAGLIATE PER SETTORE =====
        for (var settore in settori) {
            var righeSettore = settori[settore];
            
            doc.setFontSize(12);
            doc.text('Settore: ' + settore, 20, yPosition);
            yPosition += 8;
            
            // Ottieni lista gruppi del settore
            var gruppiSettore = gruppiData["HOMBU 9"][capitolo][settore] || [];
            
            // Prepara dati per tabella settore DETTAGLIATA
            var intestazioniSettore = [['Categoria', 'Sezione', 'U', 'D', 'GU', 'GD', 'Somma', 'Prec.', 'Totale Settore', 'Futuro', 'Studenti']];
            var righeTabSettore = [];
            
            ["ZADANKAI", "PRATICANTI"].forEach(function(tipo) {
                var righeTipo = righeSettore.filter(function(r) { return r.tipo === tipo; });
                if (righeTipo.length === 0) return;
                
                var sezioni = righeTipo.map(function(r) { return r.sezione; })
                    .filter(function(value, index, self) { return self.indexOf(value) === index; });
                if (tipo === "ZADANKAI") {
                    var ordine = ["membri", "simpatizzanti", "ospiti"];
                    sezioni.sort(function(a, b) { return ordine.indexOf(a) - ordine.indexOf(b); });
                }
                
                var sezioniRilevanti = tipo === "ZADANKAI" 
                    ? ["membri", "simpatizzanti", "ospiti"]
                    : ["membri", "simpatizzanti"];
                
                var righeTotali = righeTipo.filter(function(r) { return sezioniRilevanti.indexOf(r.sezione) !== -1; });
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
                var totalePrec = righePrecTot.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
                var delta = totaleMese - totalePrec;
                
                sezioni.forEach(function(sezione, index) {
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
                    
                    var riga = [
                        index === 0 ? tipo : '',
                        sezione,
                        sum.U, sum.D, sum.GU, sum.GD,
                        sommaTot,
                        sommaPrec,
                        index === 0 ? totaleMese + ' (Prec: ' + totalePrec + ', Δ: ' + (delta >= 0 ? "+" : "") + delta + ')' : '',
                        sum.FUT,
                        sum.STU
                    ];
                    
                    righeTabSettore.push(riga);
                });
            });
            
            doc.autoTable({
                head: intestazioniSettore,
                body: righeTabSettore,
                startY: yPosition,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [255, 193, 7] },
                columnStyles: {
                    6: { fontStyle: 'bold' }, // Somma
                    8: { fontStyle: 'bold' }  // Totale Settore
                }
            });
            
            yPosition = doc.lastAutoTable.finalY + 10;
        }
        
        // ===== RIEPILOGO CAPITOLO DETTAGLIATO =====
        doc.setFontSize(12);
        doc.text('Riepilogo Capitolo: ' + capitolo, 20, yPosition);
        yPosition += 8;
        
        // Prepara tabella dettagliata capitolo
        var intestazioniCapitolo = [['Categoria', 'Sezione', 'U', 'D', 'GU', 'GD', 'Somma', 'Prec.', 'Totale Capitolo', 'Futuro', 'Studenti']];
        var righeCapitoloDettagliate = [];
        
        ["ZADANKAI", "PRATICANTI"].forEach(function(tipo) {
            var righeTipo = righeFiltrateCap.filter(function(r) { return r.tipo === tipo; });
            if (righeTipo.length === 0) return;
            
            var sezioni = righeTipo.map(function(r) { return r.sezione; })
                .filter(function(value, index, self) { return self.indexOf(value) === index; });
            if (tipo === "ZADANKAI") {
                var ordine = ["membri", "simpatizzanti", "ospiti"];
                sezioni.sort(function(a, b) { return ordine.indexOf(a) - ordine.indexOf(b); });
            }
            
            var sezioniRilevanti = tipo === "ZADANKAI" 
                ? ["membri", "simpatizzanti", "ospiti"]
                : ["membri", "simpatizzanti"];
            
            var righeTotali = righeTipo.filter(function(r) { return sezioniRilevanti.indexOf(r.sezione) !== -1; });
            var sumTot = righeTotali.reduce(function(acc, r) {
                return {
                    U: acc.U + r.U, D: acc.D + r.D, GU: acc.GU + r.GU,
                    GD: acc.GD + r.GD, FUT: acc.FUT + r.FUT, STU: acc.STU + r.STU
                };
            }, {U: 0, D: 0, GU: 0, GD: 0, FUT: 0, STU: 0});
            var totaleMese = sumTot.U + sumTot.D + sumTot.GU + sumTot.GD;
            
            var righePrecTot = righe.filter(function(r) {
                return r.anno === annoPrec && r.mese === mesePrec &&
                       r.tipo === tipo && sezioniRilevanti.indexOf(r.sezione) !== -1 &&
                       gruppoToCapitolo[r.gruppo] === capitolo;
            });
            var totalePrec = righePrecTot.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
            var delta = totaleMese - totalePrec;
            
            sezioni.forEach(function(sezione, index) {
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
                var sommaPrec = righePrec.reduce(function(acc, r) { return acc + r.U + r.D + r.GU + r.GD; }, 0);
                
                var riga = [
                    index === 0 ? tipo : '',
                    sezione,
                    sum.U, sum.D, sum.GU, sum.GD,
                    sommaTot,
                    sommaPrec,
                    index === 0 ? totaleMese + ' (Prec: ' + totalePrec + ', Δ: ' + (delta >= 0 ? "+" : "") + delta + ')' : '',
                    sum.FUT,
                    sum.STU
                ];
                
                righeCapitoloDettagliate.push(riga);
            });
        });
        
        doc.autoTable({
            head: intestazioniCapitolo,
            body: righeCapitoloDettagliate,
            startY: yPosition,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [40, 167, 69] },
            columnStyles: {
                6: { fontStyle: 'bold' }, // Somma
                8: { fontStyle: 'bold' }  // Totale Capitolo
            }
        });
    });
    
    // Scarica il file
    doc.save('riepiloghi_completi_' + meseSelezionato + '_' + annoSelezionato + '.pdf');
}

function stampa() {
    window.print();
}

function logout() {
    auth.signOut().then(function() {
        window.location.href = 'index.html';
    }).catch(function(error) {
        console.error('Errore durante il logout:', error);
    });
}

// Rendi logout globale
window.logout = logout;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
