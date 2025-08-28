// Versione Legacy compatibile con vecchi browser (ES5)
// Rimozione degli import ES6 e utilizzo di Firebase SDK v8

// Variabili globali
var app, auth, database;
var datiStorici = [];
var gruppiDisponibili = [];
var chartInstance = null;
var gruppoToCapitolo = {};
var gruppoToSettore = {};

// Array dei mesi in italiano
var mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
"Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

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

// Funzione per ottenere il nome del mese in italiano
function ottieniNomeMese(numeroMese) {
    return mesiOrdine[numeroMese - 1] || 'Gennaio';
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

function inizializzaApp() {
    return new Promise(function(resolve, reject) {
        try {
            mostraLoading(true);
            
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
            console.error('Errore nell\'inizializzazione:', error);
            mostraLoading(false);
            reject(error);
        }
    });
}

function caricaDatiStorici() {
    return new Promise(function(resolve, reject) {
        console.log('🔄 Inizio caricamento dati storici...');
        
        database.ref('zadankai').once('value')
            .then(function(snapshot) {
                var datiFirebase = snapshot.val();
                console.log('📊 Dati ricevuti dal database:', datiFirebase);
                
                if (!datiFirebase) {
                    console.warn('⚠️ Nessun dato trovato nel database');
                    datiStorici = [];
                    resolve();
                    return;
                }
                
                datiStorici = [];
                
                Object.keys(datiFirebase).forEach(function(anno) {
                    console.log('📅 Elaborando anno:', anno);
                    var datiAnno = datiFirebase[anno];
                    
                    Object.keys(datiAnno).forEach(function(mese) {
                        console.log('📅 Elaborando mese:', mese, 'dell\'anno', anno);
                        var datiMese = datiAnno[mese];
                        
                        Object.keys(datiMese).forEach(function(gruppo) {
                            var datiGruppo = datiMese[gruppo];
                            console.log('👥 Elaborando gruppo:', gruppo, 'dati:', datiGruppo);
                            
                            if (datiGruppo && typeof datiGruppo === 'object') {
                                var zadankaiData = datiGruppo.zadankai || {};
                                var praticantiData = datiGruppo.praticanti || {};
                                
                                console.log('🏮 Dati zadankai per', gruppo + ':', zadankaiData);
                                console.log('🙏 Dati praticanti per', gruppo + ':', praticantiData);
                                
                                // Calcola membri dalla sezione zadankai
                                var membri = 0;
                                if (zadankaiData.membri) {
                                    membri = calcolaTotaleCategoria(zadankaiData.membri);
                                }
                                
                                // Calcola presenze dalla sezione zadankai (membri + simpatizzanti + ospiti)
                                var presenze = 0;
                                if (zadankaiData.membri) {
                                    presenze += calcolaTotaleCategoria(zadankaiData.membri);
                                }
                                if (zadankaiData.simpatizzanti) {
                                    presenze += calcolaTotaleCategoria(zadankaiData.simpatizzanti);
                                }
                                if (zadankaiData.ospiti) {
                                    presenze += calcolaTotaleCategoria(zadankaiData.ospiti);
                                }
                                
                                // Calcola praticanti
                                var praticanti = 0;
                                if (praticantiData.membri) {
                                    praticanti += calcolaTotaleCategoria(praticantiData.membri);
                                }
                                if (praticantiData.simpatizzanti) {
                                    praticanti += calcolaTotaleCategoria(praticantiData.simpatizzanti);
                                }
                                
                                console.log('📊 Totali calcolati per', gruppo + ':', {
                                    membri: membri,
                                    presenze: presenze,
                                    praticanti: praticanti
                                });
                                
                                datiStorici.push({
                                    anno: parseInt(anno),
                                    mese: convertiMeseInNumero(mese),
                                    nomeMese: mese.toLowerCase(),
                                    gruppo: gruppo,
                                    membri: membri,
                                    presenze: presenze,
                                    praticanti: praticanti
                                });
                            }
                        });
                    });
                });
                
                console.log('✅ Dati storici caricati:', datiStorici.length, 'record');
                console.log('📋 Primi 3 record:', datiStorici.slice(0, 3));
                resolve();
            })
            .catch(function(error) {
                console.error('❌ Errore nel caricamento dati storici:', error);
                reject(error);
            });
    });
}

function caricaGruppi() {
    return new Promise(function(resolve, reject) {
        fetch('gruppi.json')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Errore nel caricamento del file gruppi.json');
                }
                return response.json();
            })
            .then(function(data) {
                if (!data || !data.gruppi || !Array.isArray(data.gruppi)) {
                    throw new Error('Struttura del file gruppi.json non valida');
                }
                
                gruppiDisponibili = data.gruppi;
                
                // Costruisci le mappe gruppo -> capitolo e gruppo -> settore
                gruppiDisponibili.forEach(function(gruppo) {
                    gruppoToCapitolo[gruppo.nome] = gruppo.capitolo;
                    gruppoToSettore[gruppo.nome] = gruppo.settore;
                });
                
                console.log('Gruppi caricati:', gruppiDisponibili.length);
                resolve();
            })
            .catch(function(error) {
                console.error('Errore nel caricamento gruppi:', error);
                resolve(); // Non bloccare l'app se i gruppi non si caricano
            });
    });
}

function inizializzaFiltri() {
    var filtroCapitolo = document.getElementById('filtroCapitolo');
    var filtroSettore = document.getElementById('filtroSettore');
    var filtroGruppo = document.getElementById('filtroGruppo');
    
    if (!filtroCapitolo || !filtroSettore || !filtroGruppo) {
        console.error('Elementi filtro non trovati nel DOM');
        return;
    }
    
    // Popola filtro capitoli
    var capitoli = [];
    gruppiDisponibili.forEach(function(gruppo) {
        if (capitoli.indexOf(gruppo.capitolo) === -1) {
            capitoli.push(gruppo.capitolo);
        }
    });
    
    capitoli.forEach(function(capitolo) {
        var option = document.createElement('option');
        option.value = capitolo;
        option.textContent = 'Capitolo ' + capitolo;
        filtroCapitolo.appendChild(option);
    });
    
    // Aggiungi event listeners
    filtroCapitolo.addEventListener('change', aggiornaSottofiltri);
    filtroSettore.addEventListener('change', aggiornaSottofiltri);
    filtroGruppo.addEventListener('change', applicaFiltri);
    
    aggiornaSottofiltri();
}

function aggiornaSottofiltri() {
    var filtroCapitolo = document.getElementById('filtroCapitolo');
    var filtroSettore = document.getElementById('filtroSettore');
    var filtroGruppo = document.getElementById('filtroGruppo');
    
    if (!filtroCapitolo || !filtroSettore || !filtroGruppo) {
        console.error('Elementi filtro non trovati');
        return;
    }
    
    var capitoloSelezionato = filtroCapitolo.value;
    var settoreSelezionato = filtroSettore.value;
    
    // Filtra settori in base al capitolo
    filtroSettore.innerHTML = '<option value="tutti">Tutti i Settori</option>';
    var settori = [];
    gruppiDisponibili.forEach(function(gruppo) {
        if ((capitoloSelezionato === 'tutti' || gruppo.capitolo === capitoloSelezionato) &&
            settori.indexOf(gruppo.settore) === -1) {
            settori.push(gruppo.settore);
        }
    });
    
    settori.forEach(function(settore) {
        var option = document.createElement('option');
        option.value = settore;
        option.textContent = 'Settore ' + settore;
        filtroSettore.appendChild(option);
    });
    
    // Filtra gruppi in base a capitolo e settore
    filtroGruppo.innerHTML = '<option value="tutti">Tutti i Gruppi</option>';
    var gruppiFiltrati = gruppiDisponibili.filter(function(g) {
        return (capitoloSelezionato === 'tutti' || g.capitolo === capitoloSelezionato) &&
               (settoreSelezionato === 'tutti' || g.settore === settoreSelezionato);
    });
    
    gruppiFiltrati.forEach(function(gruppo) {
        var option = document.createElement('option');
        option.value = gruppo.nome;
        option.textContent = gruppo.nome;
        filtroGruppo.appendChild(option);
    });
    
    applicaFiltri();
}

function mostraLoading(mostra) {
    var loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = mostra ? 'block' : 'none';
    }
}

function applicaFiltri() {
    var filtroCapitolo = document.getElementById('filtroCapitolo');
    var filtroSettore = document.getElementById('filtroSettore');
    var filtroGruppo = document.getElementById('filtroGruppo');
    
    if (!filtroCapitolo || !filtroSettore || !filtroGruppo) {
        console.error('Elementi filtro non trovati');
        return;
    }
    
    var filtri = {
        capitolo: filtroCapitolo.value,
        settore: filtroSettore.value,
        gruppo: filtroGruppo.value
    };
    
    var datiAggregati = aggregaDatiUltimi12Mesi(filtri.capitolo, filtri.settore, filtri.gruppo);
    
    aggiornaGrafico(datiAggregati, filtri);
    aggiornaRisultatiTestuali(datiAggregati, filtri);
}

function aggregaDatiUltimi12Mesi(capitolo, settore, gruppo) {
    if (capitolo === undefined) { capitolo = 'tutti'; }
    if (settore === undefined) { settore = 'tutti'; }
    if (gruppo === undefined) { gruppo = 'tutti'; }
    
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
                var chiave = dato.anno + '-' + (dato.mese < 10 ? '0' + dato.mese : dato.mese);
                
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
    
    var risultato = [];
    Object.keys(datiAggregati).forEach(function(chiave) {
        risultato.push(datiAggregati[chiave]);
    });
    
    return risultato.sort(function(a, b) {
        if (a.anno !== b.anno) return a.anno - b.anno;
        return a.mese - b.mese;
    });
}

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

function aggiornaRisultatiTestuali(datiAggregati, filtri) {
    var risultatiDiv = document.getElementById('risultatiTestuali');
    
    if (datiAggregati.length === 0) {
        risultatiDiv.innerHTML = '<p class="text-muted">Nessun dato disponibile per i filtri selezionati.</p>';
        return;
    }
    
    var html = '<div class="row">';
    
    datiAggregati.forEach(function(dato, index) {
        var nomeMeseCapitalizzato = dato.nomeMese.charAt(0).toUpperCase() + dato.nomeMese.slice(1);
        
        html += '<div class="col-md-4 mb-3">';
        html += '<div class="card h-100">';
        html += '<div class="card-body">';
        html += '<h6 class="card-title">' + nomeMeseCapitalizzato + ' ' + dato.anno + '</h6>';
        html += '<div class="row text-center">';
        html += '<div class="col-4"><small class="text-muted">Membri</small><br><strong>' + dato.membri + '</strong></div>';
        html += '<div class="col-4"><small class="text-muted">Presenze</small><br><strong>' + dato.presenze + '</strong></div>';
        html += '<div class="col-4"><small class="text-muted">Praticanti</small><br><strong>' + dato.praticanti + '</strong></div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
    });
    
    html += '</div>';
    risultatiDiv.innerHTML = html;
}

function logout() {
    auth.signOut().then(function() {
        window.location.href = 'index.html';
    }).catch(function(error) {
        console.error('Errore durante il logout:', error);
        alert('Errore durante il logout');
    });
}

// Esporta le funzioni globalmente per compatibilità
window.logout = logout;
window.applicaFiltri = applicaFiltri;
