// Versione Legacy compatibile con vecchi browser (ES5)
// Rimozione degli import ES6 e utilizzo di Firebase SDK v8

// Variabili globali
var app, auth, database;
var datiStorici = [];
var gruppiDisponibili = [];
var chartInstance = null;
var gruppoToCapitolo = {};
var gruppoToSettore = {};

// Inizializza Firebase (SDK v8)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
auth = firebase.auth();
database = firebase.database();

function convertiMeseInNumero(nomeMese) {
    var mesi = {
        'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
        'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
        'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
    };
    return mesi[nomeMese.toLowerCase()] || 1;
}

function calcolaTotaleCategoria(categoria) {
    if (!categoria || typeof categoria !== 'object') {
        return 0;
    }
    
    var totale = 0;
    ['U', 'D', 'GU', 'GD'].forEach(function(sottoCat) {
        if (categoria[sottoCat] !== undefined) {
            totale += parseInt(categoria[sottoCat]) || 0;
        }
    });
    
    return totale;
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    inizializzaApp().then(function() {
        console.log('App inizializzata con successo');
    }).catch(function(error) {
        console.error('Errore durante l\'inizializzazione:', error);
        alert('Errore durante l\'inizializzazione dell\'applicazione');
    });
});

// Inizializza l'applicazione (conversione da async/await a Promise)
function inizializzaApp() {
    return new Promise(function(resolve, reject) {
        try {
            mostraLoading(true);
            
            // Carica dati storici e gruppi in parallelo
            Promise.all([
                caricaDatiStorici(),
                caricaGruppi()
            ]).then(function() {
                inizializzaFiltri();
                applicaFiltri();
                mostraLoading(false);
                resolve();
            }).catch(function(error) {
                console.error('Errore durante il caricamento:', error);
                mostraLoading(false);
                reject(error);
            });
        } catch (error) {
            mostraLoading(false);
            reject(error);
        }
    });
}

// Carica dati storici (conversione da async/await a Promise)
function caricaDatiStorici() {
    return new Promise(function(resolve, reject) {
        try {
            database.ref('zadankai').once('value').then(function(snapshot) {
                var datiCompleti = snapshot.val();
                console.log('Dati ricevuti dal database:', datiCompleti);
                
                if (datiCompleti) {
                    datiStorici = [];
                    
                    // Elabora tutti gli anni e mesi
                    Object.keys(datiCompleti).forEach(function(chiave) {
                        var parti = chiave.split('-');
                        if (parti.length >= 3) {
                            var anno = parseInt(parti[0]);
                            var nomeMese = parti[1];
                            var gruppo = parti.slice(2).join('-');
                            var mese = convertiMeseInNumero(nomeMese);
                            
                            var datiGruppo = datiCompleti[chiave];
                            
                            // Sezione zadankai
                            if (datiGruppo.zadankai) {
                                var membri = calcolaTotaleCategoria(datiGruppo.zadankai.membri || {});
                                
                                // CORREZIONE: calcola presenze come somma di membri + simpatizzanti + ospiti
                                var presenze = calcolaTotaleCategoria(datiGruppo.zadankai.membri || {}) + 
                                              calcolaTotaleCategoria(datiGruppo.zadankai.simpatizzanti || {}) + 
                                              calcolaTotaleCategoria(datiGruppo.zadankai.ospiti || {});
                                
                                console.log('Gruppo:', gruppo, 'Membri:', membri, 'Presenze calcolate:', presenze);
                                console.log('Dettaglio presenze - Membri:', calcolaTotaleCategoria(datiGruppo.zadankai.membri || {}), 
                                           'Simpatizzanti:', calcolaTotaleCategoria(datiGruppo.zadankai.simpatizzanti || {}), 
                                           'Ospiti:', calcolaTotaleCategoria(datiGruppo.zadankai.ospiti || {}));
                                
                                datiStorici.push({
                                    anno: anno,
                                    mese: mese,
                                    nomeMese: nomeMese,
                                    gruppo: gruppo,
                                    membri: membri,
                                    presenze: presenze,
                                    praticanti: 0
                                });
                            }
                            
                            // Sezione praticanti
                            if (datiGruppo.praticanti) {
                                var ultimoIndice = datiStorici.length - 1;
                                if (ultimoIndice >= 0 && 
                                    datiStorici[ultimoIndice].anno === anno && 
                                    datiStorici[ultimoIndice].mese === mese && 
                                    datiStorici[ultimoIndice].gruppo === gruppo) {
                                    
                                    var membriPraticanti = calcolaTotaleCategoria(datiGruppo.praticanti.membri || {});
                                    var simpatizzanti = calcolaTotaleCategoria(datiGruppo.praticanti.simpatizzanti || {});
                                    datiStorici[ultimoIndice].praticanti = membriPraticanti + simpatizzanti;
                                    
                                    console.log('Praticanti per', gruppo, ':', datiStorici[ultimoIndice].praticanti, 
                                               '(Membri:', membriPraticanti, 'Simpatizzanti:', simpatizzanti, ')');
                                }
                            }
                        }
                    });
                    
                    // Ordina i dati per data
                    datiStorici.sort(function(a, b) {
                        if (a.anno !== b.anno) return a.anno - b.anno;
                        if (a.mese !== b.mese) return a.mese - b.mese;
                        return a.gruppo.localeCompare(b.gruppo);
                    });
                    
                    console.log('Dati storici elaborati:', datiStorici.length, 'record');
                    console.log('Primi 3 record per verifica:', datiStorici.slice(0, 3));
                } else {
                    console.log('Nessun dato trovato nel database, genero dati di esempio');
                    datiStorici = generaDatiEsempio();
                }
                
                resolve();
            }).catch(function(error) {
                console.error('Errore nel caricamento dati:', error);
                console.log('Genero dati di esempio a causa dell\'errore');
                datiStorici = generaDatiEsempio();
                resolve();
            });
        } catch (error) {
            console.error('Errore nella funzione caricaDatiStorici:', error);
            datiStorici = generaDatiEsempio();
            resolve();
        }
    });
}

// Carica gruppi (conversione da async/await a Promise)
function caricaGruppi() {
    return new Promise(function(resolve, reject) {
        try {
            // Carica il file gruppi.json
            fetch('./gruppi.json')
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Errore nel caricamento del file gruppi.json');
                    }
                    return response.json();
                })
                .then(function(data) {
                    console.log('Dati gruppi ricevuti:', data);
                    if (data && Array.isArray(data.gruppi) && data.gruppi.length > 0) {
                        gruppiDisponibili = data.gruppi;
                        
                        // Crea le mappe gruppo -> capitolo e gruppo -> settore
                        data.gruppi.forEach(function(gruppo) {
                            gruppoToCapitolo[gruppo.nome] = gruppo.capitolo;
                            gruppoToSettore[gruppo.nome] = gruppo.settore;
                        });
                        
                        console.log('Gruppi caricati:', gruppiDisponibili.length);
                    } else {
                        console.warn('Struttura del file gruppi.json non valida o vuota');
                        console.log('Struttura ricevuta:', data);
                    }
                    resolve();
                })
                .catch(function(error) {
                    console.error('Errore nel caricamento gruppi:', error);
                    resolve(); // Continua anche se non riesce a caricare i gruppi
                });
        } catch (error) {
            console.error('Errore nella funzione caricaGruppi:', error);
            resolve();
        }
    });
}

// Genera dati di esempio
function generaDatiEsempio() {
    var datiEsempio = [];
    var gruppiEsempio = ['Gruppo A', 'Gruppo B', 'Gruppo C', 'Gruppo D'];
    var dataInizio = new Date(2025, 0, 1); // Gennaio 2025
    
    for (var i = 0; i < 12; i++) {
        var data = new Date(dataInizio);
        data.setMonth(data.getMonth() + i);
        
        var anno = data.getFullYear();
        var mese = data.getMonth() + 1;
        var nomeMese = moment().month(data.getMonth()).format('MMMM').toLowerCase();
        
        gruppiEsempio.forEach(function(gruppo) {
            var membri = Math.floor(Math.random() * 50) + 20;
            var presenze = Math.floor(membri * (0.6 + Math.random() * 0.3));
            var praticanti = Math.floor(Math.random() * 15) + 5;
            
            datiEsempio.push({
                anno: anno,
                mese: mese,
                nomeMese: nomeMese,
                gruppo: gruppo,
                membri: membri,
                presenze: presenze,
                praticanti: praticanti
            });
        });
    }
    
    return datiEsempio;
}

// Inizializza i filtri
function inizializzaFiltri() {
    var capitoli = new Set();
    var settori = new Set();
    var gruppi = new Set();
    
    // Estrai capitoli, settori e gruppi dai dati storici
    datiStorici.forEach(function(dato) {
        gruppi.add(dato.gruppo);
        if (gruppoToCapitolo[dato.gruppo]) {
            capitoli.add(gruppoToCapitolo[dato.gruppo]);
        }
        if (gruppoToSettore[dato.gruppo]) {
            settori.add(gruppoToSettore[dato.gruppo]);
        }
    });
    
    // Popola il select dei capitoli
    var selectCapitolo = document.getElementById('filtroCapitolo');
    if (selectCapitolo) {
        selectCapitolo.innerHTML = '<option value="tutti">Tutti i Capitoli</option>';
        Array.from(capitoli).sort().forEach(function(capitolo) {
            var option = document.createElement('option');
            option.value = capitolo;
            option.textContent = capitolo;
            selectCapitolo.appendChild(option);
        });
    }
    
    aggiornaSottofiltri();
}

// Aggiorna sottofiltri in base al capitolo selezionato
function aggiornaSottofiltri() {
    var selectCapitolo = document.getElementById('filtroCapitolo');
    var selectSettore = document.getElementById('filtroSettore');
    var selectGruppo = document.getElementById('filtroGruppo');
    
    // Controlli di sicurezza
    if (!selectCapitolo || !selectSettore || !selectGruppo) {
        console.error('Elementi DOM dei filtri non trovati');
        return;
    }
    
    var capitoloSelezionato = selectCapitolo.value;
    
    // Reset settori
    selectSettore.innerHTML = '<option value="tutti">Tutti i Settori</option>';
    selectGruppo.innerHTML = '<option value="tutti">Tutti i Gruppi</option>';
    
    var settoriDisponibili = new Set();
    var gruppiDisponibili = new Set();
    
    datiStorici.forEach(function(dato) {
        var capitoloGruppo = gruppoToCapitolo[dato.gruppo];
        var settoreGruppo = gruppoToSettore[dato.gruppo];
        
        if (capitoloSelezionato === 'tutti' || capitoloGruppo === capitoloSelezionato) {
            if (settoreGruppo) {
                settoriDisponibili.add(settoreGruppo);
            }
            gruppiDisponibili.add(dato.gruppo);
        }
    });
    
    // Popola settori
    Array.from(settoriDisponibili).sort().forEach(function(settore) {
        var option = document.createElement('option');
        option.value = settore;
        option.textContent = settore;
        selectSettore.appendChild(option);
    });
    
    // Popola gruppi
    Array.from(gruppiDisponibili).sort().forEach(function(gruppo) {
        var option = document.createElement('option');
        option.value = gruppo;
        option.textContent = gruppo;
        selectGruppo.appendChild(option);
    });
}

// Mostra/nasconde loading
function mostraLoading(mostra) {
    var spinner = document.querySelector('.loading-spinner');
    if (spinner) {
        spinner.style.display = mostra ? 'block' : 'none';
    }
}

// Applica filtri
function applicaFiltri() {
    var selectCapitolo = document.getElementById('filtroCapitolo');
    var selectSettore = document.getElementById('filtroSettore');
    var selectGruppo = document.getElementById('filtroGruppo');
    
    // Controlli di sicurezza
    if (!selectCapitolo || !selectSettore || !selectGruppo) {
        console.error('Elementi DOM dei filtri non trovati');
        return;
    }
    
    var capitolo = selectCapitolo.value;
    var settore = selectSettore.value;
    var gruppo = selectGruppo.value;
    
    var datiAggregati = aggregaDatiUltimi12Mesi(capitolo, settore, gruppo);
    var filtri = { capitolo: capitolo, settore: settore, gruppo: gruppo };
    
    aggiornaGrafico(datiAggregati, filtri);
    aggiornaRisultatiTestuali(datiAggregati, filtri);
}

// Aggrega dati ultimi 12 mesi
function aggregaDatiUltimi12Mesi(capitolo, settore, gruppo) {
    if (capitolo === void 0) { capitolo = 'tutti'; }
    if (settore === void 0) { settore = 'tutti'; }
    if (gruppo === void 0) { gruppo = 'tutti'; }
    
    var oggi = new Date();
    var dataLimite = new Date(oggi.getFullYear(), oggi.getMonth() - 11, 1);
    
    var datiAggregati = {};
    
    datiStorici.forEach(function(dato) {
        var dataDato = new Date(dato.anno, dato.mese - 1, 1);
        
        if (dataDato >= dataLimite) {
            var capitoloGruppo = gruppoToCapitolo[dato.gruppo] || 'Sconosciuto';
            var settoreGruppo = gruppoToSettore[dato.gruppo] || 'Sconosciuto';
            
            var includiDato = true;
            
            if (capitolo !== 'tutti' && capitoloGruppo !== capitolo) {
                includiDato = false;
            }
            if (settore !== 'tutti' && settoreGruppo !== settore) {
                includiDato = false;
            }
            if (gruppo !== 'tutti' && dato.gruppo !== gruppo) {
                includiDato = false;
            }
            
            if (includiDato) {
                var chiave = dato.anno + '-' + String(dato.mese).padStart(2, '0');
                
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
    });
    
    return Object.values(datiAggregati).sort(function(a, b) {
        if (a.anno !== b.anno) return a.anno - b.anno;
        return a.mese - b.mese;
    });
}

// Aggiorna grafico
function aggiornaGrafico(datiAggregati, filtri) {
    var ctx = document.getElementById('mainChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    var labels = datiAggregati.map(function(dato) {
        return dato.nomeMese.charAt(0).toUpperCase() + dato.nomeMese.slice(1) + ' ' + dato.anno;
    });
    
    var datiMembri = datiAggregati.map(function(dato) { return dato.membri; });
    var datiPresenze = datiAggregati.map(function(dato) { return dato.presenze; });
    var datiPraticanti = datiAggregati.map(function(dato) { return dato.praticanti; });
    
    // Aggiorna titolo grafico
    var titoloGrafico = document.getElementById('titoloGrafico');
    var testoFiltro = 'Tutti';
    if (filtri.gruppo !== 'tutti') {
        testoFiltro = filtri.gruppo;
    } else if (filtri.settore !== 'tutti') {
        testoFiltro = 'Settore ' + filtri.settore;
    } else if (filtri.capitolo !== 'tutti') {
        testoFiltro = 'Capitolo ' + filtri.capitolo;
    }
    titoloGrafico.innerHTML = '<i class="fas fa-chart-line me-2"></i>Andamento Ultimi 12 Mesi - ' + testoFiltro;
    
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
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Presenze',
                    data: datiPresenze,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Praticanti',
                    data: datiPraticanti,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Aggiorna risultati testuali
function aggiornaRisultatiTestuali(datiAggregati, filtri) {
    var container = document.getElementById('risultatiTestuali');
    
    if (datiAggregati.length === 0) {
        container.innerHTML = '<p class="text-muted">Nessun dato disponibile per i filtri selezionati.</p>';
        return;
    }
    
    var html = '<div class="row">';
    
    datiAggregati.forEach(function(dato, index) {
        var percentualePresenze = dato.membri > 0 ? ((dato.presenze / dato.membri) * 100).toFixed(1) : '0.0';
        
        html += '<div class="col-md-6 col-lg-4 mb-3">';
        html += '<div class="card h-100">';
        html += '<div class="card-body">';
        html += '<h6 class="card-title text-primary">';
        html += '<i class="fas fa-calendar-alt me-2"></i>';
        html += dato.nomeMese.charAt(0).toUpperCase() + dato.nomeMese.slice(1) + ' ' + dato.anno;
        html += '</h6>';
        html += '<div class="row text-center">';
        html += '<div class="col-4">';
        html += '<div class="text-info fw-bold fs-5">' + dato.membri + '</div>';
        html += '<small class="text-muted">Membri</small>';
        html += '</div>';
        html += '<div class="col-4">';
        html += '<div class="text-success fw-bold fs-5">' + dato.presenze + '</div>';
        html += '<small class="text-muted">Presenze</small>';
        html += '</div>';
        html += '<div class="col-4">';
        html += '<div class="text-warning fw-bold fs-5">' + dato.praticanti + '</div>';
        html += '<small class="text-muted">Praticanti</small>';
        html += '</div>';
        html += '</div>';
        html += '<hr>';
        html += '<div class="text-center">';
        html += '<span class="badge bg-primary">Partecipazione: ' + percentualePresenze + '%</span>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Funzione logout
function logout() {
    auth.signOut().then(function() {
        console.log('Logout effettuato');
        window.location.href = 'index.html';
    }).catch(function(error) {
        console.error('Errore durante il logout:', error);
        alert('Errore durante il logout');
    });
}

// Esponi funzioni globalmente per compatibilità
window.logout = logout;
window.applicaFiltri = applicaFiltri;
