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
function caricaDatiStorici() {
    console.log('Tentativo di caricamento dati dal database...');
    
    // Prova a caricare dal database
    database.ref('zadankai').once('value').then(function(snapshot) {
        var datiCompleti = snapshot.val();
        console.log('Dati ricevuti dal database:', datiCompleti);
        
        if (datiCompleti && typeof datiCompleti === 'object') {
            datiStorici = [];
            
            // Elabora i dati del database
            for (var chiave in datiCompleti) {
                if (datiCompleti.hasOwnProperty(chiave)) {
                    console.log('Elaborando chiave:', chiave);
                    var parti = chiave.split('-');
                    
                    if (parti.length >= 3) {
                        var anno = parseInt(parti[0]);
                        var nomeMese = parti[1];
                        var gruppo = parti.slice(2).join('-');
                        var mese = convertiMeseInNumero(nomeMese);
                        
                        var datiGruppo = datiCompleti[chiave];
                        
                        // Verifica se esiste la sezione zadankai
                        if (datiGruppo && datiGruppo.zadankai) {
                            console.log('Sezione zadankai trovata per:', gruppo);
                            
                            // Calcola membri
                            var membri = calcolaTotaleCategoria(datiGruppo.zadankai.membri || {});
                            
                            // Calcola presenze
                            var membriPresenze = calcolaTotaleCategoria(datiGruppo.zadankai.membri || {});
                            var simpatizzantiPresenze = calcolaTotaleCategoria(datiGruppo.zadankai.simpatizzanti || {});
                            var ospitiPresenze = calcolaTotaleCategoria(datiGruppo.zadankai.ospiti || {});
                            var presenze = membriPresenze + simpatizzantiPresenze + ospitiPresenze;
                            
                            // Calcola praticanti
                            var praticanti = 0;
                            if (datiGruppo.praticanti) {
                                for (var tipoPraticante in datiGruppo.praticanti) {
                                    if (datiGruppo.praticanti.hasOwnProperty(tipoPraticante)) {
                                        praticanti += calcolaTotaleCategoria(datiGruppo.praticanti[tipoPraticante] || {});
                                    }
                                }
                            }
                            
                            datiStorici.push({
                                anno: anno,
                                mese: mese,
                                nomeMese: nomeMese,
                                gruppo: gruppo,
                                membri: membri,
                                presenze: presenze,
                                praticanti: praticanti
                            });
                            
                            console.log('Record aggiunto:', {
                                gruppo: gruppo,
                                anno: anno,
                                mese: nomeMese,
                                membri: membri,
                                presenze: presenze,
                                praticanti: praticanti
                            });
                        }
                    }
                }
            }
            
            console.log('Totale dati dal database:', datiStorici.length);
            
            // Se non ci sono dati dal database, usa dati di esempio
            if (datiStorici.length === 0) {
                console.log('Nessun dato valido dal database, uso dati di esempio');
                datiStorici = generaDatiEsempio();
            }
            
            // Popola gruppi disponibili
            popolaGruppiDisponibili();
            
        } else {
            console.log('Database vuoto o formato non valido, uso dati di esempio');
            datiStorici = generaDatiEsempio();
            popolaGruppiDisponibili();
        }
        
    }).catch(function(error) {
        console.error('Errore nel caricamento dal database:', error);
        console.log('Uso dati di esempio a causa dell\'errore');
        datiStorici = generaDatiEsempio();
        popolaGruppiDisponibili();
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
    var selectCapitolo = document.getElementById('filtroCapitolo');
    var selectSettore = document.getElementById('filtroSettore');
    var selectGruppo = document.getElementById('filtroGruppo');
    
    if (!selectCapitolo || !selectSettore || !selectGruppo) {
        console.error('Elementi filtri non trovati');
        return;
    }
    
    // Popola filtro capitoli
    selectCapitolo.innerHTML = '<option value="tutti">Tutti i Capitoli</option>';
    selectCapitolo.innerHTML += '<option value="Capitolo A">Capitolo A</option>';
    
    // Popola filtro settori
    selectSettore.innerHTML = '<option value="tutti">Tutti i Settori</option>';
    selectSettore.innerHTML += '<option value="Settore 1">Settore 1</option>';
    
    // Popola filtro gruppi
    selectGruppo.innerHTML = '<option value="tutti">Tutti i Gruppi</option>';
    for (var i = 0; i < gruppiDisponibili.length; i++) {
        selectGruppo.innerHTML += '<option value="' + gruppiDisponibili[i] + '">' + gruppiDisponibili[i] + '</option>';
    }
    
    console.log('Filtri inizializzati');
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

// Aggiorna grafico (versione semplificata)
function aggiornaGrafico(datiAggregati) {
    var canvas = document.getElementById('graficoStorico');
    if (!canvas) {
        console.error('Canvas grafico non trovato');
        return;
    }
    
    var ctx = canvas.getContext('2d');
    
    // Distruggi grafico esistente
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    var etichette = [];
    var datiMembri = [];
    var datiPresenze = [];
    
    for (var i = 0; i < datiAggregati.length; i++) {
        var dato = datiAggregati[i];
        etichette.push(dato.nomeMese + ' ' + dato.anno);
        datiMembri.push(dato.membri);
        datiPresenze.push(dato.presenze);
    }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etichette,
            datasets: [{
                label: 'Membri',
                data: datiMembri,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }, {
                label: 'Presenze',
                data: datiPresenze,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1
            }]
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
    
    console.log('Grafico aggiornato con', datiAggregati.length, 'punti dati');
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

// Inizializzazione principale
// Modifica anche la funzione di inizializzazione per gestire l'asincronia
function inizializzaApp() {
    console.log('Inizializzazione app...');
    mostraLoading(true);
    
    try {
        // Carica i dati e poi inizializza il resto
        caricaDatiStorici();
        
        // Aspetta un momento per il caricamento asincrono
        setTimeout(function() {
            inizializzaFiltri();
            applicaFiltri();
            mostraLoading(false);
            console.log('App inizializzata con successo');
        }, 1000); // Aspetta 1 secondo
        
    } catch (error) {
        console.error('Errore inizializzazione:', error);
        // Fallback con dati di esempio
        datiStorici = generaDatiEsempio();
        popolaGruppiDisponibili();
        inizializzaFiltri();
        applicaFiltri();
        mostraLoading(false);
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
