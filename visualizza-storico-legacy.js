// Inizializzazione Firebase (SDK v8)
firebase.initializeApp(firebaseConfig);
var database = firebase.database();
var auth = firebase.auth();

// Variabili globali
var datiStorici = [];
var gruppiDisponibili = [];
var chartInstance = null;
var gruppoToCapitolo = {};
var gruppoToSettore = {};

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
    var sottoCat = ['U', 'D', 'GU', 'GD'];
    for (var i = 0; i < sottoCat.length; i++) {
        if (categoria[sottoCat[i]] !== undefined) {
            totale += parseInt(categoria[sottoCat[i]]) || 0;
        }
    }
    
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

// Inizializza l'applicazione
function inizializzaApp() {
    return new Promise(function(resolve, reject) {
        auth.onAuthStateChanged(function(user) {
            if (user) {
                console.log('Utente autenticato:', user.email);
                Promise.all([
                    caricaDatiStorici(),
                    caricaGruppi()
                ]).then(function() {
                    inizializzaFiltri();
                    applicaFiltri();
                    resolve();
                }).catch(function(error) {
                    console.error('Errore nel caricamento dati:', error);
                    reject(error);
                });
            } else {
                console.log('Utente non autenticato, reindirizzamento al login');
                window.location.href = 'index1.html';
                reject(new Error('Utente non autenticato'));
            }
        });
    });
}

function caricaDatiStorici() {
    return new Promise(function(resolve, reject) {
        console.log('Caricamento dati storici...');
        mostraLoading(true);
        
        // Reset array dati
        datiStorici = [];
        
        // Prima carica i gruppi per avere la mappatura gruppo->capitolo/settore
        caricaGruppi().then(function() {
            // Carica dati zadankai dal database reale
            var zadankaiRef = database.ref('zadankai');
            return zadankaiRef.once('value');
        }).then(function(zadankaiSnapshot) {
            if (zadankaiSnapshot.exists()) {
                var zadankaiData = zadankaiSnapshot.val();
                console.log('Dati zadankai trovati:', Object.keys(zadankaiData).length, 'record');
                
                // Elabora dati zadankai dal database reale
                for (var chiave in zadankaiData) {
                    if (zadankaiData.hasOwnProperty(chiave)) {
                        var sezioni = zadankaiData[chiave];
                        console.log('Elaborando chiave:', chiave, 'Sezioni:', sezioni);
                        var parti = chiave.split('-');
                        var anno = parti[0];
                        var mese = parti[1];
                        var gruppo = parti[2];
                        
                        if (!anno || !mese || !gruppo) {
                            console.warn('Formato chiave non valido:', chiave);
                            continue;
                        }
                        
                        // Converti il mese da nome a numero
                        var numeroMese = convertiMeseInNumero(mese);
                        var data = new Date(parseInt(anno), numeroMese - 1, 1);
                        var capitolo = gruppoToCapitolo[gruppo] || 'Sconosciuto';
                        var settore = gruppoToSettore[gruppo] || 'Sconosciuto';
                        
                        console.log('Data elaborata:', data, 'Gruppo:', gruppo, 'Capitolo:', capitolo, 'Settore:', settore);
                        
                        // Elabora sezione zadankai
                        if (sezioni.zadankai) {
                            var zadankai = sezioni.zadankai;
                            console.log('Dati zadankai per', gruppo, ':', zadankai);
                            
                            // Membri Zadankai - somma tutte le sottocategorie
                            if (zadankai.membri) {
                                var membri = calcolaTotaleCategoria(zadankai.membri);
                                console.log('Aggiungendo membri zadankai:', membri, 'Dettaglio:', zadankai.membri);
                                datiStorici.push({
                                    id: chiave + '-zadankai-membri',
                                    data: data,
                                    gruppo: gruppo,
                                    settore: settore,
                                    capitolo: capitolo,
                                    tipo: 'zadankai',
                                    categoria: 'membri',
                                    valore: membri
                                });
                            }
                            
                            // Presenze Zadankai - calcola come somma di membri + simpatizzanti + ospiti
                            var presenzeTotali = calcolaTotaleCategoria(zadankai.membri) + 
                                               calcolaTotaleCategoria(zadankai.simpatizzanti) + 
                                               calcolaTotaleCategoria(zadankai.ospiti);
                            
                            console.log('Aggiungendo presenze zadankai:', presenzeTotali);
                            datiStorici.push({
                                id: chiave + '-zadankai-presenze',
                                data: data,
                                gruppo: gruppo,
                                settore: settore,
                                capitolo: capitolo,
                                tipo: 'zadankai',
                                categoria: 'presenze',
                                valore: presenzeTotali
                            });
                        }
                        
                        // Elabora sezione praticanti
                        if (sezioni.praticanti) {
                            var praticanti = sezioni.praticanti;
                            console.log('Dati praticanti per', gruppo, ':', praticanti);
                            
                            // Calcola totale praticanti sommando membri e simpatizzanti
                            var totalePraticanti = calcolaTotaleCategoria(praticanti.membri) + 
                                                  calcolaTotaleCategoria(praticanti.simpatizzanti);
                            
                            console.log('Totale praticanti calcolato:', totalePraticanti, 
                                      'Membri:', calcolaTotaleCategoria(praticanti.membri),
                                      'Simpatizzanti:', calcolaTotaleCategoria(praticanti.simpatizzanti));
                            
                            datiStorici.push({
                                id: chiave + '-praticanti-totale',
                                data: data,
                                gruppo: gruppo,
                                settore: settore,
                                capitolo: capitolo,
                                tipo: 'praticanti',
                                categoria: 'totale',
                                valore: totalePraticanti
                            });
                        }
                    }
                }
            }
            
            // Se non ci sono dati reali, genera dati di esempio
            if (datiStorici.length === 0) {
                console.log('Nessun dato reale trovato, generazione dati di esempio...');
                datiStorici = generaDatiEsempio();
            }
            
            console.log('Dati storici caricati totali:', datiStorici.length);
            console.log('Primi 5 dati:', datiStorici.slice(0, 5));
            mostraLoading(false);
            resolve();
            
        }).catch(function(error) {
            console.error('Errore durante il caricamento dei dati:', error);
            mostraLoading(false);
            // Fallback ai dati di esempio in caso di errore
            datiStorici = generaDatiEsempio();
            resolve();
        });
    });
}

function caricaGruppi() {
    return new Promise(function(resolve, reject) {
        var gruppiRef = database.ref('gruppi/HOMBU 9');
        gruppiRef.once('value').then(function(snapshot) {
            var gruppiData = snapshot.val();
            
            if (!gruppiData) {
                console.log('Nessun gruppo trovato');
                resolve();
                return;
            }
            
            gruppiDisponibili = [];
            gruppoToCapitolo = {};
            gruppoToSettore = {};
            
            for (var capitolo in gruppiData) {
                if (gruppiData.hasOwnProperty(capitolo)) {
                    for (var settore in gruppiData[capitolo]) {
                        if (gruppiData[capitolo].hasOwnProperty(settore)) {
                            var gruppiSettore = gruppiData[capitolo][settore];
                            for (var i = 0; i < gruppiSettore.length; i++) {
                                var gruppo = gruppiSettore[i];
                                gruppiDisponibili.push(gruppo);
                                gruppoToCapitolo[gruppo] = capitolo;
                                gruppoToSettore[gruppo] = settore;
                            }
                        }
                    }
                }
            }
            
            console.log('Gruppi caricati:', gruppiDisponibili.length);
            resolve();
        }).catch(function(error) {
            console.error('Errore nel caricamento gruppi:', error);
            resolve();
        });
    });
}

function generaDatiEsempio() {
    var datiEsempio = [];
    var oggi = new Date();
    var mesiNomi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                   'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    
    // Genera dati per gli ultimi 12 mesi
    for (var i = 0; i < 12; i++) {
        var data = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
        var anno = data.getFullYear();
        var meseIndice = data.getMonth();
        var mese = mesiNomi[meseIndice];
        
        // Genera dati per alcuni gruppi di esempio
        var gruppiEsempio = ['Gruppo A', 'Gruppo B', 'Gruppo C'];
        for (var j = 0; j < gruppiEsempio.length; j++) {
            var gruppo = gruppiEsempio[j];
            var baseValue = 50 + Math.floor(Math.random() * 30);
            
            datiEsempio.push({
                anno: anno,
                mese: mese,
                meseNumero: meseIndice + 1,
                gruppo: gruppo,
                totaleResponsabili: Math.floor(baseValue * 0.1),
                totaleYD: Math.floor(baseValue * 0.2),
                totaleYM: Math.floor(baseValue * 0.2),
                totaleMD: Math.floor(baseValue * 0.25),
                totaleMM: Math.floor(baseValue * 0.2),
                totaleSimpatizzanti: Math.floor(baseValue * 0.05),
                totaleGenerale: baseValue
            });
        }
    }
    
    return datiEsempio;
}

function inizializzaFiltri() {
    var capitoloSelect = document.getElementById('capitoloFiltro');
    var settoreSelect = document.getElementById('settoreFiltro');
    var gruppoSelect = document.getElementById('gruppoFiltro');
    
    // Popola filtro capitoli
    var capitoli = [];
    for (var gruppo in gruppoToCapitolo) {
        if (gruppoToCapitolo.hasOwnProperty(gruppo)) {
            var capitolo = gruppoToCapitolo[gruppo];
            if (capitoli.indexOf(capitolo) === -1) {
                capitoli.push(capitolo);
            }
        }
    }
    
    capitoli.sort();
    for (var i = 0; i < capitoli.length; i++) {
        var option = document.createElement('option');
        option.value = capitoli[i];
        option.textContent = capitoli[i];
        capitoloSelect.appendChild(option);
    }
    
    // Event listener per aggiornare sottofiltri
    capitoloSelect.addEventListener('change', aggiornaSottofiltri);
    settoreSelect.addEventListener('change', aggiornaSottofiltri);
    
    aggiornaSottofiltri();
}

function aggiornaSottofiltri() {
    var capitoloSelezionato = document.getElementById('capitoloFiltro').value;
    var settoreSelect = document.getElementById('settoreFiltro');
    var gruppoSelect = document.getElementById('gruppoFiltro');
    
    // Reset settori
    settoreSelect.innerHTML = '<option value="tutti">Tutti i settori</option>';
    
    if (capitoloSelezionato !== 'tutti') {
        var settori = [];
        for (var gruppo in gruppoToSettore) {
            if (gruppoToSettore.hasOwnProperty(gruppo) && gruppoToCapitolo[gruppo] === capitoloSelezionato) {
                var settore = gruppoToSettore[gruppo];
                if (settori.indexOf(settore) === -1) {
                    settori.push(settore);
                }
            }
        }
        
        settori.sort();
        for (var i = 0; i < settori.length; i++) {
            var option = document.createElement('option');
            option.value = settori[i];
            option.textContent = settori[i];
            settoreSelect.appendChild(option);
        }
    }
    
    // Reset gruppi
    var settoreSelezionato = settoreSelect.value;
    gruppoSelect.innerHTML = '<option value="tutti">Tutti i gruppi</option>';
    
    var gruppiFiltrati = gruppiDisponibili.filter(function(gruppo) {
        var matchCapitolo = capitoloSelezionato === 'tutti' || gruppoToCapitolo[gruppo] === capitoloSelezionato;
        var matchSettore = settoreSelezionato === 'tutti' || gruppoToSettore[gruppo] === settoreSelezionato;
        return matchCapitolo && matchSettore;
    });
    
    gruppiFiltrati.sort();
    for (var i = 0; i < gruppiFiltrati.length; i++) {
        var option = document.createElement('option');
        option.value = gruppiFiltrati[i];
        option.textContent = gruppiFiltrati[i];
        gruppoSelect.appendChild(option);
    }
}

function mostraLoading(mostra) {
    var spinner = document.getElementById('loadingSpinner');
    spinner.style.display = mostra ? 'block' : 'none';
}

function applicaFiltri() {
    var capitolo = document.getElementById('capitoloFiltro').value;
    var settore = document.getElementById('settoreFiltro').value;
    var gruppo = document.getElementById('gruppoFiltro').value;
    
    var datiAggregati = aggregaDatiUltimi12Mesi(capitolo, settore, gruppo);
    var filtri = { capitolo: capitolo, settore: settore, gruppo: gruppo };
    
    aggiornaGrafico(datiAggregati, filtri);
    aggiornaRisultatiTestuali(datiAggregati, filtri);
}

function aggregaDatiUltimi12Mesi(capitolo, settore, gruppo) {
    var oggi = new Date();
    var risultati = [];
    
    // Genera gli ultimi 12 mesi
    for (var i = 0; i < 12; i++) {
        var data = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
        var anno = data.getFullYear();
        var meseNumero = data.getMonth() + 1;
        
        // Filtra i dati per questo mese
        var datiMese = datiStorici.filter(function(record) {
            var matchAnno = record.anno === anno;
            var matchMese = record.meseNumero === meseNumero;
            var matchCapitolo = capitolo === 'tutti' || gruppoToCapitolo[record.gruppo] === capitolo;
            var matchSettore = settore === 'tutti' || gruppoToSettore[record.gruppo] === settore;
            var matchGruppo = gruppo === 'tutti' || record.gruppo === gruppo;
            
            return matchAnno && matchMese && matchCapitolo && matchSettore && matchGruppo;
        });
        
        // Aggrega i dati del mese
        var totali = {
            responsabili: 0,
            giovaniDonne: 0,
            giovaniUomini: 0,
            donne: 0,
            uomini: 0,
            simpatizzanti: 0,
            generale: 0
        };
        
        for (var j = 0; j < datiMese.length; j++) {
            var record = datiMese[j];
            totali.responsabili += record.totaleResponsabili || 0;
            totali.giovaniDonne += record.totaleYD || 0;
            totali.giovaniUomini += record.totaleYM || 0;
            totali.donne += record.totaleMD || 0;
            totali.uomini += record.totaleMM || 0;
            totali.simpatizzanti += record.totaleSimpatizzanti || 0;
            totali.generale += record.totaleGenerale || 0;
        }
        
        risultati.push({
            anno: anno,
            mese: meseNumero,
            meseNome: moment().month(meseNumero - 1).format('MMMM'),
            totali: totali,
            numeroGruppi: datiMese.length
        });
    }
    
    // Ordina dal più vecchio al più recente per il grafico
    risultati.reverse();
    
    return risultati;
}

function aggiornaGrafico(datiAggregati, filtri) {
    var ctx = document.getElementById('mainChart').getContext('2d');
    
    // Distruggi il grafico esistente se presente
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Prepara i dati per Chart.js v2
    var labels = datiAggregati.map(function(item) {
        return item.meseNome + ' ' + item.anno;
    });
    
    var datasets = [
        {
            label: 'Totale Generale',
            data: datiAggregati.map(function(item) { return item.totali.generale; }),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
        },
        {
            label: 'Responsabili',
            data: datiAggregati.map(function(item) { return item.totali.responsabili; }),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
        },
        {
            label: 'Giovani Donne',
            data: datiAggregati.map(function(item) { return item.totali.giovaniDonne; }),
            borderColor: 'rgb(255, 205, 86)',
            backgroundColor: 'rgba(255, 205, 86, 0.2)',
            tension: 0.1
        },
        {
            label: 'Giovani Uomini',
            data: datiAggregati.map(function(item) { return item.totali.giovaniUomini; }),
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.1
        },
        {
            label: 'Donne',
            data: datiAggregati.map(function(item) { return item.totali.donne; }),
            borderColor: 'rgb(153, 102, 255)',
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            tension: 0.1
        },
        {
            label: 'Uomini',
            data: datiAggregati.map(function(item) { return item.totali.uomini; }),
            borderColor: 'rgb(255, 159, 64)',
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            tension: 0.1
        }
    ];
    
    // Crea il nuovo grafico
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }],
                xAxes: [{
                    ticks: {
                        maxRotation: 45
                    }
                }]
            },
            legend: {
                position: 'top'
            },
            title: {
                display: true,
                text: 'Andamento Ultimi 12 Mesi'
            }
        }
    });
    
    // Aggiorna il titolo
    var titoloFiltro = 'Tutti';
    if (filtri.gruppo !== 'tutti') {
        titoloFiltro = filtri.gruppo;
    } else if (filtri.settore !== 'tutti') {
        titoloFiltro = filtri.settore;
    } else if (filtri.capitolo !== 'tutti') {
        titoloFiltro = filtri.capitolo;
    }
    
    document.getElementById('titoloGrafico').innerHTML = 
        '<i class="fas fa-chart-line mr-2"></i>Andamento Ultimi 12 Mesi - ' + titoloFiltro;
}

function aggiornaRisultatiTestuali(datiAggregati, filtri) {
    var container = document.getElementById('risultatiTestuali');
    
    if (datiAggregati.length === 0) {
        container.innerHTML = '<p class="text-muted">Nessun dato disponibile per i filtri selezionati.</p>';
        return;
    }
    
    var html = '';
    
    // Inverti l'ordine per mostrare dal più recente
    var datiInvertiti = datiAggregati.slice().reverse();
    
    for (var i = 0; i < datiInvertiti.length; i++) {
        var item = datiInvertiti[i];
        var totali = item.totali;
        
        html += '<div class="month-result">';
        html += '<div class="month-title">' + item.meseNome + ' ' + item.anno + '</div>';
        html += '<span class="metric">Totale: <span class="metric-value">' + totali.generale + '</span></span>';
        html += '<span class="metric">Responsabili: <span class="metric-value">' + totali.responsabili + '</span></span>';
        html += '<span class="metric">GD: <span class="metric-value">' + totali.giovaniDonne + '</span></span>';
        html += '<span class="metric">GU: <span class="metric-value">' + totali.giovaniUomini + '</span></span>';
        html += '<span class="metric">Donne: <span class="metric-value">' + totali.donne + '</span></span>';
        html += '<span class="metric">Uomini: <span class="metric-value">' + totali.uomini + '</span></span>';
        html += '<span class="metric">Simpatizzanti: <span class="metric-value">' + totali.simpatizzanti + '</span></span>';
        html += '<span class="metric">Gruppi: <span class="metric-value">' + item.numeroGruppi + '</span></span>';
        html += '</div>';
    }
    
    container.innerHTML = html;
}

function logout() {
    auth.signOut().then(function() {
        console.log('Logout effettuato');
        window.location.href = 'index1.html';
    }).catch(function(error) {
        console.error('Errore durante il logout:', error);
        window.location.href = 'index1.html';
    });
}

// Esponi le funzioni globalmente
window.logout = logout;
window.applicaFiltri = applicaFiltri;
