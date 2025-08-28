// Configurazione Firebase (da firebase-config.js)
var firebaseConfig = {
  apiKey: "AIzaSyBvqKZKvhKGKGKGKGKGKGKGKGKGKGKGKGK",
  authDomain: "hombu9-statistics.firebaseapp.com",
  databaseURL: "https://hombu9-statistics-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hombu9-statistics",
  storageBucket: "hombu9-statistics.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnopqrstuvwxyz"
};

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

// Funzioni di riepilogo (da implementare seguendo la logica del file originale)
function generaRiepilogoHombu(righeFiltrate, mese, anno, mesePrec, annoPrec) {
    // Implementazione semplificata - da completare con la logica completa
    var contenitore = document.getElementById('contenitore-riepiloghi');
    var div = document.createElement('div');
    div.className = 'card mb-4';
    div.innerHTML = '<div class="card-header bg-success text-white"><h5>Riepilogo HOMBU 9</h5></div><div class="card-body">Riepilogo generale in sviluppo...</div>';
    contenitore.appendChild(div);
}

function generaRiepiloghiCapitoli(righeFiltrate, mese, anno, mesePrec, annoPrec) {
    // Implementazione semplificata - da completare con la logica completa
    var contenitore = document.getElementById('contenitore-riepiloghi');
    var div = document.createElement('div');
    div.className = 'card mb-4';
    div.innerHTML = '<div class="card-header bg-info text-white"><h5>Riepiloghi Capitoli</h5></div><div class="card-body">Riepiloghi capitoli in sviluppo...</div>';
    contenitore.appendChild(div);
}

// Funzioni di esportazione
function esportaExcel() {
    alert("Funzione di esportazione Excel in sviluppo per la versione legacy");
}

function esportaPdf() {
    alert("Funzione di esportazione PDF in sviluppo per la versione legacy");
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