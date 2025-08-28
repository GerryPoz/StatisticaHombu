// Versione completamente compatibile ES5 per iPadOS 12
var app, auth, database;
var datiStorici = [];
var gruppiDisponibili = [];
var chartInstance = null;
var gruppoToCapitolo = {};
var gruppoToSettore = {};

// Inizializzazione Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
auth = firebase.auth();
database = firebase.database();

// Funzioni di utilità ES5
function convertiMeseInNumero(nomeMese) {
    var mesi = {
        'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
        'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
        'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
    };
    return mesi[nomeMese.toLowerCase()] || 1;
}

function calcolaTotaleCategoria(categoria) {
    var totale = 0;
    if (!categoria) return totale;
    
    for (var chiave in categoria) {
        if (categoria.hasOwnProperty(chiave)) {
            var valore = parseInt(categoria[chiave]) || 0;
            totale += valore;
        }
    }
    return totale;
}

// Genera dati di esempio semplici
function generaDatiEsempio() {
    var datiEsempio = [];
    var gruppiEsempio = ['Gruppo A', 'Gruppo B', 'Gruppo C'];
    var nomiMesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    
    var oggi = new Date();
    var annoCorrente = oggi.getFullYear();
    
    for (var i = 0; i < 12; i++) {
        var meseIndex = (oggi.getMonth() - 11 + i + 12) % 12;
        var anno = annoCorrente;
        if (oggi.getMonth() - 11 + i < 0) {
            anno = annoCorrente - 1;
        }
        
        for (var j = 0; j < gruppiEsempio.length; j++) {
            var gruppo = gruppiEsempio[j];
            var membri = Math.floor(Math.random() * 30) + 20;
            var presenze = Math.floor(membri * 0.7);
            
            datiEsempio.push({
                anno: anno,
                mese: meseIndex + 1,
                nomeMese: nomiMesi[meseIndex],
                gruppo: gruppo,
                membri: membri,
                presenze: presenze,
                praticanti: Math.floor(Math.random() * 10) + 5
            });
        }
    }
    
    console.log('Generati dati di esempio:', datiEsempio.length, 'record');
    return datiEsempio;
}

// Carica dati dal database con fallback
// Versione semplificata della funzione caricaDatiStorici
function caricaDatiStorici() {
    return new Promise(function(resolve) {
        console.log('Caricamento dati storici...');
        
        try {
            // Verifica autenticazione
            if (!auth || !auth.currentUser) {
                console.log('Utente non autenticato, uso dati di esempio');
                datiStorici = generaDatiEsempio();
                resolve();
                return;
            }
            
            var timeout = setTimeout(function() {
                console.warn('Timeout nel caricamento dati, uso dati di esempio');
                if (datiStorici.length === 0) {
                    datiStorici = generaDatiEsempio();
                }
                resolve();
            }, 15000); // Timeout di 15 secondi
            
            database.ref('statistiche').once('value')
                .then(function(snapshot) {
                    clearTimeout(timeout);
                    
                    var data = snapshot.val();
                    console.log('Dati Firebase ricevuti:', data ? 'Sì' : 'No');
                    
                    if (data) {
                        datiStorici = [];
                        
                        // Elabora i dati usando for...in
                        for (var anno in data) {
                            if (data.hasOwnProperty(anno)) {
                                var datiAnno = data[anno];
                                
                                for (var mese in datiAnno) {
                                    if (datiAnno.hasOwnProperty(mese)) {
                                        var datiMese = datiAnno[mese];
                                        
                                        for (var gruppo in datiMese) {
                                            if (datiMese.hasOwnProperty(gruppo)) {
                                                var datiGruppo = datiMese[gruppo];
                                                
                                                var membri = 0;
                                                var presenze = 0;
                                                var praticanti = 0;
                                                
                                                // Calcola totali
                                                for (var categoria in datiGruppo) {
                                                    if (datiGruppo.hasOwnProperty(categoria)) {
                                                        var valoreCat = datiGruppo[categoria];
                                                        if (typeof valoreCat === 'number') {
                                                            membri += valoreCat;
                                                            if (categoria.toLowerCase().indexOf('presenza') !== -1) {
                                                                presenze += valoreCat;
                                                            }
                                                            if (categoria.toLowerCase().indexOf('praticant') !== -1) {
                                                                praticanti += valoreCat;
                                                            }
                                                        }
                                                    }
                                                }
                                                
                                                datiStorici.push({
                                                    anno: parseInt(anno),
                                                    mese: mese,
                                                    gruppo: gruppo,
                                                    membri: membri,
                                                    presenze: presenze,
                                                    praticanti: praticanti,
                                                    datiOriginali: datiGruppo
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        console.log('Dati storici caricati:', datiStorici.length, 'record');
                    }
                    
                    // Se non ci sono dati, usa quelli di esempio
                    if (datiStorici.length === 0) {
                        console.log('Nessun dato trovato, uso dati di esempio');
                        datiStorici = generaDatiEsempio();
                    }
                    
                    resolve();
                })
                .catch(function(error) {
                    clearTimeout(timeout);
                    console.error('Errore nel caricamento da Firebase:', error);
                    
                    // Fallback ai dati di esempio
                    if (datiStorici.length === 0) {
                        datiStorici = generaDatiEsempio();
                    }
                    
                    resolve();
                });
        } catch (error) {
            console.error('Errore nella funzione caricaDatiStorici:', error);
            
            // Fallback finale
            if (datiStorici.length === 0) {
                datiStorici = generaDatiEsempio();
            }
            
            resolve();
        }
    });
}

// Funzione helper per popolare gruppi disponibili
function popolaGruppiDisponibili() {
    gruppiDisponibili = [];
    gruppoToCapitolo = {};
    gruppoToSettore = {};
    
    for (var i = 0; i < datiStorici.length; i++) {
        var gruppo = datiStorici[i].gruppo;
        var trovato = false;
        
        for (var j = 0; j < gruppiDisponibili.length; j++) {
            if (gruppiDisponibili[j] === gruppo) {
                trovato = true;
                break;
            }
        }
        
        if (!trovato) {
            gruppiDisponibili.push(gruppo);
            // Assegna capitolo e settore di default (puoi personalizzare questa logica)
            gruppoToCapitolo[gruppo] = 'Capitolo A';
            gruppoToSettore[gruppo] = 'Settore 1';
        }
    }
    
    console.log('Gruppi disponibili popolati:', gruppiDisponibili.length);
}

// Inizializza filtri
function inizializzaFiltri() {
    console.log('Inizializzazione filtri...');
    console.log('Dati storici disponibili:', datiStorici.length);
    console.log('Gruppi disponibili:', gruppiDisponibili.length);
    console.log('Mappa capitoli:', gruppoToCapitolo);
    console.log('Mappa settori:', gruppoToSettore);
    
    var capitoli = [];
    var settori = [];
    var gruppi = [];
    
    // Estrai capitoli, settori e gruppi dai dati storici
    for (var i = 0; i < datiStorici.length; i++) {
        var dato = datiStorici[i];
        
        // Aggiungi gruppo se non presente
        var gruppoTrovato = false;
        for (var j = 0; j < gruppi.length; j++) {
            if (gruppi[j] === dato.gruppo) {
                gruppoTrovato = true;
                break;
            }
        }
        if (!gruppoTrovato) {
            gruppi.push(dato.gruppo);
        }
        
        // Aggiungi capitolo se esiste nella mappa
        if (gruppoToCapitolo[dato.gruppo]) {
            var capitoloTrovato = false;
            for (var k = 0; k < capitoli.length; k++) {
                if (capitoli[k] === gruppoToCapitolo[dato.gruppo]) {
                    capitoloTrovato = true;
                    break;
                }
            }
            if (!capitoloTrovato) {
                capitoli.push(gruppoToCapitolo[dato.gruppo]);
            }
        }
        
        // Aggiungi settore se esiste nella mappa
        if (gruppoToSettore[dato.gruppo]) {
            var settoreTrovato = false;
            for (var l = 0; l < settori.length; l++) {
                if (settori[l] === gruppoToSettore[dato.gruppo]) {
                    settoreTrovato = true;
                    break;
                }
            }
            if (!settoreTrovato) {
                settori.push(gruppoToSettore[dato.gruppo]);
            }
        }
    }
    
    console.log('Capitoli estratti:', capitoli);
    console.log('Settori estratti:', settori);
    console.log('Gruppi estratti:', gruppi);
    
    // Popola il select dei capitoli
    var selectCapitolo = document.getElementById('filtroCapitolo');
    if (selectCapitolo) {
        selectCapitolo.innerHTML = '<option value="tutti">Tutti i Capitoli</option>';
        
        // Ordina capitoli
        capitoli.sort();
        
        for (var m = 0; m < capitoli.length; m++) {
            var option = document.createElement('option');
            option.value = capitoli[m];
            option.textContent = capitoli[m];
            selectCapitolo.appendChild(option);
        }
        
        // Aggiungi event listener per il cambio capitolo
        selectCapitolo.onchange = function() {
            aggiornaSottofiltri();
        };
        
        console.log('Select capitolo popolato con', capitoli.length, 'opzioni');
    } else {
        console.error('Elemento filtroCapitolo non trovato');
    }
    
    // Aggiungi event listener per il cambio settore
    var selectSettore = document.getElementById('filtroSettore');
    if (selectSettore) {
        selectSettore.onchange = function() {
            aggiornaGruppiPerSettore();
        };
    } else {
        console.error('Elemento filtroSettore non trovato');
    }
    
    aggiornaSottofiltri();
}

function aggiornaSottofiltri() {
    console.log('Aggiornamento sottofiltri...');
    
    var selectCapitolo = document.getElementById('filtroCapitolo');
    var selectSettore = document.getElementById('filtroSettore');
    var selectGruppo = document.getElementById('filtroGruppo');
    
    if (!selectCapitolo || !selectSettore || !selectGruppo) {
        console.error('Elementi DOM dei filtri non trovati');
        return;
    }
    
    var capitoloSelezionato = selectCapitolo.value;
    console.log('Capitolo selezionato:', capitoloSelezionato);
    
    // Reset settori e gruppi
    selectSettore.innerHTML = '<option value="tutti">Tutti i Settori</option>';
    selectGruppo.innerHTML = '<option value="tutti">Tutti i Gruppi</option>';
    
    var settoriDisponibili = [];
    
    // Se è selezionato "tutti" i capitoli, mostra tutti i settori
    if (capitoloSelezionato === 'tutti') {
        for (var i = 0; i < datiStorici.length; i++) {
            var dato = datiStorici[i];
            var settoreGruppo = gruppoToSettore[dato.gruppo];
            
            if (settoreGruppo) {
                var settoreTrovato = false;
                for (var j = 0; j < settoriDisponibili.length; j++) {
                    if (settoriDisponibili[j] === settoreGruppo) {
                        settoreTrovato = true;
                        break;
                    }
                }
                if (!settoreTrovato) {
                    settoriDisponibili.push(settoreGruppo);
                }
            }
        }
    } else {
        // Mostra solo i settori del capitolo selezionato
        for (var k = 0; k < datiStorici.length; k++) {
            var dato2 = datiStorici[k];
            var capitoloGruppo = gruppoToCapitolo[dato2.gruppo];
            var settoreGruppo2 = gruppoToSettore[dato2.gruppo];
            
            if (capitoloGruppo === capitoloSelezionato && settoreGruppo2) {
                var settoreTrovato2 = false;
                for (var l = 0; l < settoriDisponibili.length; l++) {
                    if (settoriDisponibili[l] === settoreGruppo2) {
                        settoreTrovato2 = true;
                        break;
                    }
                }
                if (!settoreTrovato2) {
                    settoriDisponibili.push(settoreGruppo2);
                }
            }
        }
    }
    
    console.log('Settori disponibili:', settoriDisponibili);
    
    // Ordina e popola settori
    settoriDisponibili.sort();
    for (var m = 0; m < settoriDisponibili.length; m++) {
        var option = document.createElement('option');
        option.value = settoriDisponibili[m];
        option.textContent = settoriDisponibili[m];
        selectSettore.appendChild(option);
    }
    
    // Aggiorna anche i gruppi per il primo settore o tutti
    aggiornaGruppiPerSettore();
}

// Aggiorna gruppi in base al settore selezionato
function aggiornaGruppiPerSettore() {
    console.log('Aggiornamento gruppi per settore...');
    
    var selectCapitolo = document.getElementById('filtroCapitolo');
    var selectSettore = document.getElementById('filtroSettore');
    var selectGruppo = document.getElementById('filtroGruppo');
    
    if (!selectCapitolo || !selectSettore || !selectGruppo) {
        console.error('Elementi DOM dei filtri non trovati');
        return;
    }
    
    var capitoloSelezionato = selectCapitolo.value;
    var settoreSelezionato = selectSettore.value;
    
    console.log('Filtri selezionati - Capitolo:', capitoloSelezionato, 'Settore:', settoreSelezionato);
    
    // Reset gruppi
    selectGruppo.innerHTML = '<option value="tutti">Tutti i Gruppi</option>';
    
    var gruppiDisponibili = [];
    
    for (var i = 0; i < datiStorici.length; i++) {
        var dato = datiStorici[i];
        var capitoloGruppo = gruppoToCapitolo[dato.gruppo];
        var settoreGruppo = gruppoToSettore[dato.gruppo];
        
        var includiGruppo = false;
        
        // Logica di filtro a cascata
        if (capitoloSelezionato === 'tutti' && settoreSelezionato === 'tutti') {
            // Mostra tutti i gruppi
            includiGruppo = true;
        } else if (capitoloSelezionato === 'tutti' && settoreSelezionato !== 'tutti') {
            // Mostra gruppi del settore selezionato (qualsiasi capitolo)
            includiGruppo = (settoreGruppo === settoreSelezionato);
        } else if (capitoloSelezionato !== 'tutti' && settoreSelezionato === 'tutti') {
            // Mostra gruppi del capitolo selezionato (qualsiasi settore)
            includiGruppo = (capitoloGruppo === capitoloSelezionato);
        } else {
            // Mostra gruppi del capitolo E settore selezionati
            includiGruppo = (capitoloGruppo === capitoloSelezionato && settoreGruppo === settoreSelezionato);
        }
        
        if (includiGruppo) {
            var gruppoTrovato = false;
            for (var j = 0; j < gruppiDisponibili.length; j++) {
                if (gruppiDisponibili[j] === dato.gruppo) {
                    gruppoTrovato = true;
                    break;
                }
            }
            if (!gruppoTrovato) {
                gruppiDisponibili.push(dato.gruppo);
            }
        }
    }
    
    console.log('Gruppi disponibili per filtri:', gruppiDisponibili);
    
    // Ordina e popola gruppi
    gruppiDisponibili.sort();
    for (var k = 0; k < gruppiDisponibili.length; k++) {
        var option = document.createElement('option');
        option.value = gruppiDisponibili[k];
        option.textContent = gruppiDisponibili[k];
        selectGruppo.appendChild(option);
    }
}

// Aggrega dati (versione semplificata)
function aggregaDatiUltimi12Mesi(capitolo, settore, gruppo) {
    var oggi = new Date();
    var dataLimite = new Date(oggi.getFullYear(), oggi.getMonth() - 11, 1);
    var datiAggregati = {};
    
    for (var i = 0; i < datiStorici.length; i++) {
        var dato = datiStorici[i];
        var dataDato = new Date(dato.anno, dato.mese - 1, 1);
        
        if (dataDato >= dataLimite) {
            var includiDato = true;
            
            if (capitolo !== 'tutti' && gruppoToCapitolo[dato.gruppo] !== capitolo) {
                includiDato = false;
            }
            if (settore !== 'tutti' && gruppoToSettore[dato.gruppo] !== settore) {
                includiDato = false;
            }
            if (gruppo !== 'tutti' && dato.gruppo !== gruppo) {
                includiDato = false;
            }
            
            if (includiDato) {
                var meseStr = String(dato.mese);
                if (meseStr.length < 2) meseStr = '0' + meseStr;
                var chiave = dato.anno + '-' + meseStr;
                
                if (!datiAggregati[chiave]) {
                    datiAggregati[chiave] = {
                        anno: dato.anno,
                        mese: dato.mese,
                        nomeMese: dato.nomeMese,
                        membri: 0,
                        presenze: 0,
                        praticanti: 0
                    };
                }
                
                datiAggregati[chiave].membri += dato.membri;
                datiAggregati[chiave].presenze += dato.presenze;
                datiAggregati[chiave].praticanti += dato.praticanti;
            }
        }
    }
    
    // Converti in array
    var risultato = [];
    for (var chiave in datiAggregati) {
        if (datiAggregati.hasOwnProperty(chiave)) {
            risultato.push(datiAggregati[chiave]);
        }
    }
    
    // Ordina per anno e mese
    risultato.sort(function(a, b) {
        if (a.anno !== b.anno) return a.anno - b.anno;
        return a.mese - b.mese;
    });
    
    console.log('Dati aggregati:', risultato.length, 'record');
    return risultato;
}

// Applica filtri
function applicaFiltri() {
    var selectCapitolo = document.getElementById('filtroCapitolo');
    var selectSettore = document.getElementById('filtroSettore');
    var selectGruppo = document.getElementById('filtroGruppo');
    
    if (!selectCapitolo || !selectSettore || !selectGruppo) {
        console.error('Elementi filtri non trovati');
        return;
    }
    
    var capitolo = selectCapitolo.value || 'tutti';
    var settore = selectSettore.value || 'tutti';
    var gruppo = selectGruppo.value || 'tutti';
    
    var datiAggregati = aggregaDatiUltimi12Mesi(capitolo, settore, gruppo);
    
    aggiornaGrafico(datiAggregati);
    aggiornaRisultatiTestuali(datiAggregati);
}

// Versione compatibile della funzione aggiornaGrafico
function aggiornaGrafico(datiAggregati, filtri) {
    console.log('Aggiornamento grafico con dati:', datiAggregati);
    
    var canvas = document.getElementById('mainChart');
    if (!canvas) {
        console.error('Canvas mainChart non trovato');
        return;
    }
    
    var ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Impossibile ottenere il context 2D del canvas');
        return;
    }
    
    // Distruggi il grafico esistente se presente
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    // Prepara i dati per il grafico
    var labels = [];
    var datiMembri = [];
    var datiPresenze = [];
    var datiPraticanti = [];
    
    for (var i = 0; i < datiAggregati.length; i++) {
        var dato = datiAggregati[i];
        // Capitalizza il nome del mese
        var nomeMese = dato.nomeMese.charAt(0).toUpperCase() + dato.nomeMese.slice(1);
        labels.push(nomeMese + ' ' + dato.anno);
        datiMembri.push(dato.membri || 0);
        datiPresenze.push(dato.presenze || 0);
        datiPraticanti.push(dato.praticanti || 0);
    }
    
    console.log('Labels grafico:', labels);
    console.log('Dati membri:', datiMembri);
    console.log('Dati presenze:', datiPresenze);
    console.log('Dati praticanti:', datiPraticanti);
    
    // Aggiorna titolo grafico
    var titoloGrafico = document.getElementById('titoloGrafico');
    if (titoloGrafico) {
        var testoFiltro = 'Tutti';
        if (filtri.gruppo !== 'tutti') {
            testoFiltro = filtri.gruppo;
        } else if (filtri.settore !== 'tutti') {
            testoFiltro = 'Settore ' + filtri.settore;
        } else if (filtri.capitolo !== 'tutti') {
            testoFiltro = 'Capitolo ' + filtri.capitolo;
        }
        titoloGrafico.innerHTML = '<i class="fas fa-chart-line me-2"></i>Andamento Ultimi 12 Mesi - ' + testoFiltro;
    }
    
    // Verifica che Chart.js sia disponibile
    if (typeof Chart === 'undefined') {
        console.error('Chart.js non è disponibile');
        // Mostra un messaggio di errore nel canvas
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Grafico non disponibile su questo dispositivo', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    try {
        // Crea il grafico con configurazione compatibile
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Membri',
                        data: datiMembri,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        fill: true
                    },
                    {
                        label: 'Presenze',
                        data: datiPresenze,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        fill: true
                    },
                    {
                        label: 'Praticanti',
                        data: datiPraticanti,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    display: true,
                    position: 'top'
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true
                        },
                        gridLines: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }],
                    xAxes: [{
                        gridLines: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }]
                }
            }
        });
        
        console.log('Grafico creato con successo');
    } catch (error) {
        console.error('Errore nella creazione del grafico:', error);
        // Fallback: mostra un messaggio nel canvas
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Errore nella visualizzazione del grafico', canvas.width / 2, canvas.height / 2);
    }
}

// Aggiorna risultati testuali
function aggiornaRisultatiTestuali(datiAggregati) {
    var container = document.getElementById('risultatiTestuali');
    if (!container) {
        console.error('Container risultati non trovato');
        return;
    }
    
    if (datiAggregati.length === 0) {
        container.innerHTML = '<p>Nessun dato disponibile per i filtri selezionati.</p>';
        return;
    }
    
    var html = '<h3>Riepilogo Ultimi 12 Mesi</h3>';
    html += '<table class="table table-striped">';
    html += '<thead><tr><th>Periodo</th><th>Membri</th><th>Presenze</th><th>Praticanti</th></tr></thead>';
    html += '<tbody>';
    
    for (var i = 0; i < datiAggregati.length; i++) {
        var dato = datiAggregati[i];
        html += '<tr>';
        html += '<td>' + dato.nomeMese + ' ' + dato.anno + '</td>';
        html += '<td>' + dato.membri + '</td>';
        html += '<td>' + dato.presenze + '</td>';
        html += '<td>' + dato.praticanti + '</td>';
        html += '</tr>';
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    console.log('Risultati testuali aggiornati');
}

// Mostra/nascondi loading
function mostraLoading(mostra) {
    var spinner = document.querySelector('.loading-spinner');
    if (spinner) {
        spinner.style.display = mostra ? 'block' : 'none';
    }
}

// Versione semplificata della funzione caricaGruppi che restituisce sempre una Promise
function caricaGruppi() {
    return new Promise(function(resolve) {
        console.log('Caricamento gruppi...');
        
        try {
            // Usa XMLHttpRequest invece di fetch per compatibilità Safari
            var xhr = new XMLHttpRequest();
            xhr.open('GET', './gruppi.json', true);
            xhr.timeout = 10000; // Timeout di 10 secondi
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            var data = JSON.parse(xhr.responseText);
                            console.log('Dati gruppi ricevuti:', data);
                            
                            // Reset delle variabili
                            gruppiDisponibili = [];
                            gruppoToCapitolo = {};
                            gruppoToSettore = {};
                            
                            // Elabora la struttura gerarchica
                            if (data && data['HOMBU 9']) {
                                var hombu = data['HOMBU 9'];
                                
                                // Usa for...in invece di Object.keys per compatibilità
                                for (var nomeCapitolo in hombu) {
                                    if (hombu.hasOwnProperty(nomeCapitolo)) {
                                        var capitolo = hombu[nomeCapitolo];
                                        
                                        for (var nomeSettore in capitolo) {
                                            if (capitolo.hasOwnProperty(nomeSettore)) {
                                                var gruppiSettore = capitolo[nomeSettore];
                                                
                                                if (gruppiSettore && gruppiSettore.length) {
                                                    for (var i = 0; i < gruppiSettore.length; i++) {
                                                        var nomeGruppo = gruppiSettore[i];
                                                        
                                                        var gruppo = {
                                                            nome: nomeGruppo,
                                                            capitolo: nomeCapitolo,
                                                            settore: nomeSettore
                                                        };
                                                        
                                                        gruppiDisponibili.push(gruppo);
                                                        gruppoToCapitolo[nomeGruppo] = nomeCapitolo;
                                                        gruppoToSettore[nomeGruppo] = nomeSettore;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                
                                console.log('Gruppi caricati:', gruppiDisponibili.length);
                                console.log('Mappa capitoli:', gruppoToCapitolo);
                                console.log('Mappa settori:', gruppoToSettore);
                            } else {
                                console.warn('Struttura del file gruppi.json non valida');
                            }
                        } catch (parseError) {
                            console.error('Errore nel parsing JSON:', parseError);
                        }
                    } else {
                        console.error('Errore nel caricamento del file gruppi.json:', xhr.status);
                    }
                    resolve(); // Risolvi sempre la Promise
                }
            };
            
            xhr.onerror = function() {
                console.error('Errore di rete nel caricamento gruppi');
                resolve(); // Risolvi anche in caso di errore
            };
            
            xhr.ontimeout = function() {
                console.error('Timeout nel caricamento gruppi');
                resolve(); // Risolvi anche in caso di timeout
            };
            
            xhr.send();
        } catch (error) {
            console.error('Errore nella funzione caricaGruppi:', error);
            resolve(); // Risolvi sempre
        }
    });
}

// Inizializzazione principale
function inizializzaApp() {
    console.log('Inizializzazione app...');
    
    try {
        mostraLoading(true);
        
        // Carica prima i gruppi, poi i dati storici (sequenziale invece di parallelo)
        caricaGruppi()
            .then(function() {
                console.log('Gruppi caricati, ora carico i dati storici...');
                return caricaDatiStorici();
            })
            .then(function() {
                console.log('Dati storici caricati, inizializzo i filtri...');
                
                // Verifica che abbiamo dati
                if (datiStorici.length === 0) {
                    console.warn('Nessun dato storico disponibile, uso dati di esempio');
                    datiStorici = generaDatiEsempio();
                }
                
                console.log('Dati disponibili:', datiStorici.length);
                console.log('Gruppi disponibili:', gruppiDisponibili.length);
                
                inizializzaFiltri();
                applicaFiltri();
                mostraLoading(false);
                
                console.log('Inizializzazione completata');
            })
            .catch(function(error) {
                console.error('Errore durante il caricamento:', error);
                
                // Fallback: usa dati di esempio
                console.log('Uso dati di esempio come fallback');
                datiStorici = generaDatiEsempio();
                
                // Popola gruppi di esempio se vuoti
                if (gruppiDisponibili.length === 0) {
                    gruppiDisponibili = [
                        { nome: 'Gruppo A', capitolo: 'Capitolo 1', settore: 'Settore 1' },
                        { nome: 'Gruppo B', capitolo: 'Capitolo 1', settore: 'Settore 2' },
                        { nome: 'Gruppo C', capitolo: 'Capitolo 2', settore: 'Settore 1' }
                    ];
                    
                    // Popola le mappe
                    gruppoToCapitolo = {
                        'Gruppo A': 'Capitolo 1',
                        'Gruppo B': 'Capitolo 1',
                        'Gruppo C': 'Capitolo 2'
                    };
                    
                    gruppoToSettore = {
                        'Gruppo A': 'Settore 1',
                        'Gruppo B': 'Settore 2',
                        'Gruppo C': 'Settore 1'
                    };
                }
                
                inizializzaFiltri();
                applicaFiltri();
                mostraLoading(false);
                
                console.log('Inizializzazione completata con dati di esempio');
            });
    } catch (error) {
        console.error('Errore critico nell\'inizializzazione:', error);
        mostraLoading(false);
        
        // Ultimo fallback
        datiStorici = generaDatiEsempio();
        inizializzaFiltri();
        applicaFiltri();
    }
}

// Logout
function logout() {
    if (auth && auth.signOut) {
        auth.signOut();
    }
    window.location.href = 'index.html';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM caricato, inizializzo app...');
    inizializzaApp();
});

// Esporta funzioni globali
window.logout = logout;
window.applicaFiltri = applicaFiltri;
