// Importa la configurazione Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDatabase, ref, get, child } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

let app, auth, database;
let datiStorici = [];
let gruppiDisponibili = [];
let chartInstances = {};
let gruppoToCapitolo = {};

// Inizializzazione
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Inizializza Firebase
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        database = getDatabase(app);
        
        // Verifica autenticazione
        onAuthStateChanged(auth, (user) => {
            if (user) {
                inizializzaApp();
            } else {
                window.location.href = 'index.html';
            }
        });
        
    } catch (error) {
        console.error('Errore inizializzazione:', error);
        alert('Errore durante l\'inizializzazione dell\'applicazione');
    }
});

// Inizializzazione app
async function inizializzaApp() {
    try {
        await caricaDatiStorici();
        inizializzaFiltri();
        inizializzaDatePicker();
        applicaFiltriDefault();
        
        // Event listeners
        document.getElementById('applicaFiltri').addEventListener('click', applicaFiltri);
        document.getElementById('tipoVis').addEventListener('change', cambiaVisualizzazione);
        
    } catch (error) {
        console.error('Errore inizializzazione app:', error);
    }
}

// Carica dati storici da Firebase
async function caricaDatiStorici() {
    try {
        // Carica i dati dal nodo 'zadankai' invece che da 'dati_storici'
        const snapshot = await get(ref(database, 'zadankai'));
        if (snapshot.exists()) {
            const datiFirebase = snapshot.val();
            datiStorici = [];
            
            // Elabora i dati da Firebase
            for (const key in datiFirebase) {
                const [anno, mese, gruppo] = key.split('-');
                const sezioni = datiFirebase[key];
                
                // Crea una data dal mese e anno
                const mesiOrdine = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                                   'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
                const meseIndex = mesiOrdine.indexOf(mese);
                const data = new Date(parseInt(anno), meseIndex, 1);
                
                // Elabora zadankai
                if (sezioni.zadankai) {
                    for (const categoria in sezioni.zadankai) {
                        const r = sezioni.zadankai[categoria];
                        const totale = (r.U || 0) + (r.D || 0) + (r.GU || 0) + (r.GD || 0) + (r.FUT || 0) + (r.STU || 0);
                        
                        datiStorici.push({
                            id: `${key}_zadankai_${categoria}`,
                            data: data,
                            gruppo: gruppo,
                            anno: anno,
                            mese: mese,
                            tipo: 'zadankai',
                            categoria: categoria,
                            valore: totale,
                            dettagli: r
                        });
                    }
                }
                
                // Elabora praticanti
                if (sezioni.praticanti) {
                    for (const categoria in sezioni.praticanti) {
                        const r = sezioni.praticanti[categoria];
                        const totale = (r.U || 0) + (r.D || 0) + (r.GU || 0) + (r.GD || 0);
                        
                        datiStorici.push({
                            id: `${key}_praticanti_${categoria}`,
                            data: data,
                            gruppo: gruppo,
                            anno: anno,
                            mese: mese,
                            tipo: 'praticanti',
                            categoria: categoria,
                            valore: totale,
                            dettagli: r
                        });
                    }
                }
            }
        }
        
        // Carica anche i gruppi dal file JSON
        try {
            const gruppiResponse = await fetch('gruppi.json');
            const gruppiData = await gruppiResponse.json();
            const struttura = gruppiData["HOMBU 9"];
            
            gruppiDisponibili = [];
            for (const [capitolo, settori] of Object.entries(struttura)) {
                for (const [settore, gruppi] of Object.entries(settori)) {
                    gruppi.forEach(gruppo => {
                        gruppiDisponibili.push({
                            nome: gruppo,
                            settore: settore,
                            capitolo: capitolo
                        });
                        gruppoToCapitolo[gruppo] = { settore, capitolo };
                    });
                }
            }
        } catch (error) {
            console.error('Errore caricamento gruppi:', error);
        }
        
    } catch (error) {
        console.error('Errore caricamento dati:', error);
        // Dati di esempio per testing
        generaDatiEsempio();
    }
}

// Genera dati di esempio
function generaDatiEsempio() {
    datiStorici = [];
    gruppiDisponibili = [
        { nome: 'Gruppo A', settore: 'Settore 1', capitolo: 'Capitolo 1' },
        { nome: 'Gruppo B', settore: 'Settore 2', capitolo: 'Capitolo 1' },
        { nome: 'Gruppo C', settore: 'Settore 1', capitolo: 'Capitolo 2' }
    ];
    
    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno'];
    const anni = [2023, 2024];
    const tipi = ['zadankai', 'praticanti'];
    const categorie = ['membri', 'simpatizzanti', 'ospiti'];
    
    anni.forEach(anno => {
        mesi.forEach((mese, meseIndex) => {
            gruppiDisponibili.forEach(gruppo => {
                tipi.forEach(tipo => {
                    categorie.forEach(categoria => {
                        const valore = Math.floor(Math.random() * 50) + 10;
                        datiStorici.push({
                            id: `${anno}-${mese}-${gruppo.nome}_${tipo}_${categoria}`,
                            data: new Date(anno, meseIndex, 1),
                            gruppo: gruppo.nome,
                            anno: anno.toString(),
                            mese: mese,
                            tipo: tipo,
                            categoria: categoria,
                            valore: valore,
                            dettagli: {
                                U: Math.floor(valore * 0.3),
                                D: Math.floor(valore * 0.3),
                                GU: Math.floor(valore * 0.2),
                                GD: Math.floor(valore * 0.2)
                            }
                        });
                    });
                });
            });
        });
    });
}

// Inizializza filtri
function inizializzaFiltri() {
    const gruppiSelect = document.getElementById('gruppiSelect');
    gruppiSelect.innerHTML = '<option value="tutti">Tutti i gruppi</option>';
    
    // Raggruppa per capitolo
    const capitoli = {};
    gruppiDisponibili.forEach(gruppo => {
        if (!capitoli[gruppo.capitolo]) {
            capitoli[gruppo.capitolo] = [];
        }
        capitoli[gruppo.capitolo].push(gruppo);
    });
    
    // Crea optgroup per capitolo
    Object.keys(capitoli).sort().forEach(capitolo => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = capitolo;
        
        capitoli[capitolo].sort((a, b) => a.nome.localeCompare(b.nome)).forEach(gruppo => {
            const option = document.createElement('option');
            option.value = gruppo.nome;
            option.textContent = `${gruppo.nome} (${gruppo.settore})`;
            optgroup.appendChild(option);
        });
        
        gruppiSelect.appendChild(optgroup);
    });
    
    // Aggiungi filtro per tipo di dato se non esiste
    if (!document.getElementById('tipoSelect')) {
        const tipoSelect = document.createElement('select');
        tipoSelect.id = 'tipoSelect';
        tipoSelect.className = 'form-select';
        tipoSelect.innerHTML = `
            <option value="tutti">Tutti i tipi</option>
            <option value="zadankai">Solo Zadankai</option>
            <option value="praticanti">Solo Praticanti</option>
        `;
        
        // Inserisci il filtro tipo dopo il filtro gruppi
        const gruppiContainer = gruppiSelect.parentElement;
        const tipoContainer = document.createElement('div');
        tipoContainer.className = 'col-md-2';
        tipoContainer.innerHTML = '<label class="form-label">Tipo Dato</label>';
        tipoContainer.appendChild(tipoSelect);
        
        gruppiContainer.parentElement.insertBefore(tipoContainer, gruppiContainer.nextSibling);
    }
}

// Inizializza date picker
function inizializzaDatePicker() {
    const oggi = moment();
    const inizioAnno = moment().subtract(12, 'months');
    
    $('#daterange').daterangepicker({
        startDate: inizioAnno,
        endDate: oggi,
        locale: {
            format: 'DD/MM/YYYY',
            separator: ' - ',
            applyLabel: 'Applica',
            cancelLabel: 'Annulla',
            fromLabel: 'Da',
            toLabel: 'A',
            customRangeLabel: 'Personalizzato',
            weekLabel: 'S',
            daysOfWeek: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
            monthNames: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
            firstDay: 1
        },
        ranges: {
            'Ultimi 30 giorni': [moment().subtract(29, 'days'), moment()],
            'Ultimi 3 mesi': [moment().subtract(3, 'months'), moment()],
            'Ultimi 6 mesi': [moment().subtract(6, 'months'), moment()],
            'Ultimo anno': [moment().subtract(12, 'months'), moment()],
            'Anno corrente': [moment().startOf('year'), moment()],
            'Anno precedente': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')]
        }
    });
}

// Applica filtri di default
function applicaFiltriDefault() {
    // Applica filtri con impostazioni di default
    setTimeout(() => {
        applicaFiltri();
    }, 1000);
}

// Applica filtri
function applicaFiltri() {
    const dateRange = $('#daterange').data('daterangepicker');
    const gruppiSelezionati = Array.from(document.getElementById('gruppiSelect').selectedOptions)
        .map(option => option.value);
    const tipoSelezionato = document.getElementById('tipoSelect')?.value || 'tutti';
    const aggregazione = document.getElementById('aggregazione').value;
    
    const filtri = {
        dataInizio: dateRange.startDate.toDate(),
        dataFine: dateRange.endDate.toDate(),
        gruppi: gruppiSelezionati,
        tipo: tipoSelezionato,
        aggregazione: aggregazione
    };
    
    mostraLoading(true);
    
    setTimeout(() => {
        elaboraDati(filtri);
        mostraLoading(false);
    }, 500);
}

// Cambia visualizzazione
function cambiaVisualizzazione() {
    const tipoVis = document.getElementById('tipoVis').value;
    
    // Nascondi tutte le sezioni
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('graficiSection').style.display = 'none';
    document.getElementById('tabellaSection').style.display = 'none';
    document.getElementById('analisiSection').style.display = 'none';
    
    // Mostra la sezione selezionata
    if (tipoVis === 'dashboard') {
        document.getElementById('dashboardSection').style.display = 'block';
    } else if (tipoVis === 'grafici') {
        document.getElementById('graficiSection').style.display = 'block';
    } else if (tipoVis === 'tabella') {
        document.getElementById('tabellaSection').style.display = 'block';
    } else if (tipoVis === 'analisi') {
        document.getElementById('analisiSection').style.display = 'block';
    }
    
    // Riapplica i filtri per aggiornare la visualizzazione
    applicaFiltri();
}

// Mostra/nascondi loading
function mostraLoading(mostra) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = mostra ? 'block' : 'none';
    }
}

// Elabora dati secondo i filtri
function elaboraDati(filtri) {
    // Filtra dati per periodo
    let datiFiltrati = datiStorici.filter(dato => 
        dato.data >= filtri.dataInizio && dato.data <= filtri.dataFine
    );
    
    // Filtra per gruppi
    if (!filtri.gruppi.includes('tutti')) {
        datiFiltrati = datiFiltrati.filter(dato => 
            filtri.gruppi.includes(dato.gruppo)
        );
    }
    
    // Filtra per tipo
    if (filtri.tipo !== 'tutti') {
        datiFiltrati = datiFiltrati.filter(dato => 
            dato.tipo === filtri.tipo
        );
    }
    
    // Aggrega dati
    const datiAggregati = aggregaDati(datiFiltrati, filtri.aggregazione);
    
    // Aggiorna visualizzazioni
    aggiornaDashboard(datiAggregati, filtri, datiFiltrati);
    aggiornaGrafici(datiAggregati, filtri);
    aggiornaTabella(datiFiltrati);
    aggiornaAnalisi(datiAggregati, filtri);
}

// Aggrega dati
function aggregaDati(dati, tipoAggregazione) {
    const aggregati = {};
    
    dati.forEach(dato => {
        let chiave;
        
        if (tipoAggregazione === 'mensile') {
            chiave = `${dato.anno}-${dato.mese}`;
        } else if (tipoAggregazione === 'trimestrale') {
            const trimestre = Math.ceil((new Date(dato.data).getMonth() + 1) / 3);
            chiave = `${dato.anno}-T${trimestre}`;
        } else if (tipoAggregazione === 'annuale') {
            chiave = dato.anno;
        } else {
            chiave = dato.gruppo;
        }
        
        if (!aggregati[dato.gruppo]) {
            aggregati[dato.gruppo] = {};
        }
        
        if (!aggregati[dato.gruppo][chiave]) {
            aggregati[dato.gruppo][chiave] = {
                totale: 0,
                count: 0,
                media: 0
            };
        }
        
        aggregati[dato.gruppo][chiave].totale += dato.valore;
        aggregati[dato.gruppo][chiave].count += 1;
        aggregati[dato.gruppo][chiave].media = aggregati[dato.gruppo][chiave].totale / aggregati[dato.gruppo][chiave].count;
    });
    
    return aggregati;
}

// Aggiorna dashboard
function aggiornaDashboard(datiAggregati, filtri, datiFiltrati) {
    const statsCards = document.getElementById('statsCards');
    if (!statsCards) return;
    
    statsCards.innerHTML = '';
    
    // Calcola statistiche generali
    const stats = calcolaStatistiche(datiAggregati, datiFiltrati);
    
    // Card statistiche
    const cardStats = [
        { titolo: 'Gruppi Attivi', valore: stats.gruppiAttivi, icona: 'users', colore: 'primary' },
        { titolo: 'Media Generale', valore: stats.mediaGenerale.toFixed(1), icona: 'chart-line', colore: 'success' },
        { titolo: 'Totale Periodo', valore: stats.totaleGenerale, icona: 'calculator', colore: 'info' },
        { titolo: 'Trend Generale', valore: `${stats.trendGenerale > 0 ? '+' : ''}${stats.trendGenerale.toFixed(1)}%`, icona: stats.trendGenerale > 0 ? 'arrow-up' : 'arrow-down', colore: stats.trendGenerale > 0 ? 'success' : 'danger' }
    ];
    
    cardStats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'col-md-3';
        card.innerHTML = `
            <div class="text-center">
                <i class="fas fa-${stat.icona} fa-2x mb-2 text-${stat.colore}"></i>
                <h3 class="mb-1">${stat.valore}</h3>
                <p class="mb-0">${stat.titolo}</p>
            </div>
        `;
        statsCards.appendChild(card);
    });
    
    // Mostra breakdown per tipo se necessario
    if (filtri.tipo === 'tutti') {
        const breakdownZadankai = datiFiltrati.filter(d => d.tipo === 'zadankai').reduce((sum, d) => sum + d.valore, 0);
        const breakdownPraticanti = datiFiltrati.filter(d => d.tipo === 'praticanti').reduce((sum, d) => sum + d.valore, 0);
        
        const breakdownCard = document.createElement('div');
        breakdownCard.className = 'col-12 mt-3';
        breakdownCard.innerHTML = `
            <div class="period-comparison">
                <h6><i class="fas fa-chart-pie me-2"></i>Breakdown per Tipo</h6>
                <div class="row">
                    <div class="col-6 text-center">
                        <h4>${breakdownZadankai}</h4>
                        <p class="mb-0">Zadankai</p>
                    </div>
                    <div class="col-6 text-center">
                        <h4>${breakdownPraticanti}</h4>
                        <p class="mb-0">Praticanti</p>
                    </div>
                </div>
            </div>
        `;
        statsCards.appendChild(breakdownCard);
    }
}

// Calcola statistiche
function calcolaStatistiche(datiAggregati, datiFiltrati) {
    const gruppi = Object.keys(datiAggregati);
    let valoriTotali = [];
    let trendTotale = 0;
    let totaleGenerale = 0;
    
    gruppi.forEach(gruppo => {
        const periodi = Object.keys(datiAggregati[gruppo]).sort();
        const valori = periodi.map(p => datiAggregati[gruppo][p].media);
        
        valoriTotali = valoriTotali.concat(valori);
        
        // Calcola trend per gruppo
        if (valori.length > 1) {
            const primo = valori[0];
            const ultimo = valori[valori.length - 1];
            if (primo > 0) {
                trendTotale += ((ultimo - primo) / primo) * 100;
            }
        }
    });
    
    // Calcola totale generale
    totaleGenerale = datiFiltrati.reduce((sum, dato) => sum + dato.valore, 0);
    
    const mediaGenerale = valoriTotali.length > 0 ? valoriTotali.reduce((a, b) => a + b, 0) / valoriTotali.length : 0;
    
    return {
        gruppiAttivi: gruppi.length,
        mediaGenerale: mediaGenerale,
        trendGenerale: gruppi.length > 0 ? trendTotale / gruppi.length : 0,
        totaleGenerale: totaleGenerale
    };
}

// Aggiorna grafici
function aggiornaGrafici(datiAggregati, filtri) {
    // Distruggi grafici esistenti
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    chartInstances = {};
    
    // Grafico principale - Andamento Temporale
    const mainCanvas = document.getElementById('mainChart');
    if (mainCanvas) {
        const ctx = mainCanvas.getContext('2d');
        
        // Prepara dati per tutti i gruppi
        const datasets = [];
        const colori = [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)', 
            'rgb(255, 205, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)'
        ];
        
        let tuttiPeriodi = new Set();
        Object.keys(datiAggregati).forEach(gruppo => {
            Object.keys(datiAggregati[gruppo]).forEach(periodo => {
                tuttiPeriodi.add(periodo);
            });
        });
        
        const periodiOrdinati = Array.from(tuttiPeriodi).sort();
        
        Object.keys(datiAggregati).forEach((gruppo, index) => {
            const valori = periodiOrdinati.map(periodo => {
                return datiAggregati[gruppo][periodo] ? datiAggregati[gruppo][periodo].media : 0;
            });
            
            datasets.push({
                label: gruppo,
                data: valori,
                borderColor: colori[index % colori.length],
                backgroundColor: colori[index % colori.length] + '20',
                tension: 0.1,
                fill: false
            });
        });
        
        chartInstances.main = new Chart(ctx, {
            type: 'line',
            data: {
                labels: periodiOrdinati,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Andamento Temporale per Gruppo'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Valore Medio'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Periodo'
                        }
                    }
                }
            }
        });
    }
    
    // Grafico di confronto - Confronto Gruppi
    const comparisonCanvas = document.getElementById('comparisonChart');
    if (comparisonCanvas) {
        const ctx2 = comparisonCanvas.getContext('2d');
        
        // Calcola media per gruppo
        const gruppiMedie = {};
        Object.keys(datiAggregati).forEach(gruppo => {
            const valori = Object.values(datiAggregati[gruppo]).map(p => p.media);
            gruppiMedie[gruppo] = valori.length > 0 ? valori.reduce((a, b) => a + b, 0) / valori.length : 0;
        });
        
        const gruppiNomi = Object.keys(gruppiMedie);
        const gruppiValori = Object.values(gruppiMedie);
        
        chartInstances.comparison = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: gruppiNomi,
                datasets: [{
                    label: 'Media Periodo',
                    data: gruppiValori,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 205, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Confronto Medie per Gruppo'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Valore Medio'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Gruppi'
                        }
                    }
                }
            }
        });
    }
}

// Aggiorna tabella
function aggiornaTabella(dati) {
    const tbody = document.getElementById('storicoTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Ordina per data decrescente
    const datiOrdinati = dati.sort((a, b) => b.data - a.data).slice(0, 100); // Limita a 100 righe
    
    datiOrdinati.forEach((dato, index) => {
        const row = document.createElement('tr');
        
        // Ottieni informazioni gruppo
        const infoGruppo = gruppoToCapitolo[dato.gruppo] || { settore: 'N/A', capitolo: 'N/A' };
        
        // Calcola variazione rispetto al record precedente dello stesso gruppo e tipo
        let variazione = '';
        const precedente = datiOrdinati.find((d, i) => 
            i > index && d.gruppo === dato.gruppo && d.tipo === dato.tipo && d.categoria === dato.categoria
        );
        
        if (precedente) {
            const diff = dato.valore - precedente.valore;
            if (precedente.valore > 0) {
                const percentuale = ((diff / precedente.valore) * 100).toFixed(1);
                variazione = `${diff > 0 ? '+' : ''}${diff} (${percentuale}%)`;
            } else {
                variazione = `${diff > 0 ? '+' : ''}${diff}`;
            }
        }
        
        // Determina il badge per la categoria
        let badgeCategoria = '';
        if (dato.categoria === 'membri') {
            badgeCategoria = '<span class="badge bg-success">Membri</span>';
        } else if (dato.categoria === 'simpatizzanti') {
            badgeCategoria = '<span class="badge bg-warning">Simpatizzanti</span>';
        } else if (dato.categoria === 'ospiti') {
            badgeCategoria = '<span class="badge bg-info">Ospiti</span>';
        } else {
            badgeCategoria = `<span class="badge bg-secondary">${dato.categoria}</span>`;
        }
        
        row.innerHTML = `
            <td>${dato.data.toLocaleDateString('it-IT')}</td>
            <td>${dato.gruppo}</td>
            <td>${infoGruppo.settore}</td>
            <td>${infoGruppo.capitolo}</td>
            <td>
                <span class="badge bg-${dato.tipo === 'zadankai' ? 'primary' : 'secondary'}">
                    ${dato.tipo.toUpperCase()}
                </span>
            </td>
            <td>${badgeCategoria}</td>
            <td><strong>${dato.valore}</strong></td>
            <td class="${variazione.startsWith('+') ? 'trend-up' : variazione.startsWith('-') ? 'trend-down' : ''}">
                ${variazione || '-'}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="mostraDettagli('${dato.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Aggiorna analisi
function aggiornaAnalisi(datiAggregati, filtri) {
    const analisiContainer = document.getElementById('analisiContainer');
    if (!analisiContainer) return;
    
    analisiContainer.innerHTML = '';
    
    // Analisi per gruppo
    Object.keys(datiAggregati).forEach(gruppo => {
        const periodi = Object.keys(datiAggregati[gruppo]).sort();
        const valori = periodi.map(p => datiAggregati[gruppo][p].media);
        
        if (valori.length > 1) {
            const primo = valori[0];
            const ultimo = valori[valori.length - 1];
            const trend = primo > 0 ? ((ultimo - primo) / primo) * 100 : 0;
            const media = valori.reduce((a, b) => a + b, 0) / valori.length;
            
            const analisiCard = document.createElement('div');
            analisiCard.className = 'col-md-6 mb-3';
            analisiCard.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">${gruppo}</h6>
                        <p class="card-text">
                            <strong>Media periodo:</strong> ${media.toFixed(1)}<br>
                            <strong>Trend:</strong> 
                            <span class="${trend > 0 ? 'text-success' : trend < 0 ? 'text-danger' : 'text-muted'}">
                                ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%
                            </span><br>
                            <strong>Periodi analizzati:</strong> ${periodi.length}
                        </p>
                    </div>
                </div>
            `;
            analisiContainer.appendChild(analisiCard);
        }
    });
}

// Mostra dettagli di un record
function mostraDettagli(id) {
    const dato = datiStorici.find(d => d.id === id);
    if (!dato) return;
    
    let dettagliHtml = `
        <h5>${dato.gruppo} - ${dato.mese} ${dato.anno}</h5>
        <p><strong>Tipo:</strong> ${dato.tipo.toUpperCase()}</p>
        <p><strong>Categoria:</strong> ${dato.categoria}</p>
        <p><strong>Totale:</strong> ${dato.valore}</p>
        <hr>
        <h6>Dettagli:</h6>
    `;
    
    if (dato.dettagli) {
        for (const [categoria, valori] of Object.entries(dato.dettagli)) {
            if (typeof valori === 'object') {
                dettagliHtml += `
                    <div class="mb-2">
                        <strong>${categoria.toUpperCase()}:</strong><br>
                        <small>
                            U: ${valori.U || 0}, D: ${valori.D || 0}, 
                            GU: ${valori.GU || 0}, GD: ${valori.GD || 0}
                            ${valori.FUT !== undefined ? `, FUT: ${valori.FUT || 0}` : ''}
                            ${valori.STU !== undefined ? `, STU: ${valori.STU || 0}` : ''}
                        </small>
                    </div>
                `;
            } else {
                dettagliHtml += `
                    <div class="mb-2">
                        <strong>${categoria.toUpperCase()}:</strong> ${valori}
                    </div>
                `;
            }
        }
    }
    
    // Crea e mostra modal
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Dettagli Record</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    ${dettagliHtml}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// Funzioni di esportazione
function esportaCSV() {
    let csv = 'Data,Gruppo,Settore,Capitolo,Tipo,Categoria,Valore,Anno,Mese\n';
    
    datiStorici.forEach(dato => {
        const infoGruppo = gruppoToCapitolo[dato.gruppo] || { settore: 'N/A', capitolo: 'N/A' };
        csv += `${dato.data.toLocaleDateString('it-IT')},"${dato.gruppo}","${infoGruppo.settore}","${infoGruppo.capitolo}","${dato.tipo}","${dato.categoria}",${dato.valore},"${dato.anno}","${dato.mese}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `storico_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function esportaExcel() {
    const dati = datiStorici.map(dato => {
        const infoGruppo = gruppoToCapitolo[dato.gruppo] || { settore: 'N/A', capitolo: 'N/A' };
        return {
            Data: dato.data.toLocaleDateString('it-IT'),
            Gruppo: dato.gruppo,
            Settore: infoGruppo.settore,
            Capitolo: infoGruppo.capitolo,
            Tipo: dato.tipo.toUpperCase(),
            Categoria: dato.categoria,
            Valore: dato.valore,
            Anno: dato.anno,
            Mese: dato.mese
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(dati);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Storico');
    XLSX.writeFile(wb, `storico_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function esportaPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Titolo
    doc.setFontSize(16);
    doc.text('Report Storico Zadankai e Praticanti', 20, 20);
    
    // Data generazione
    doc.setFontSize(10);
    doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, 20, 30);
    
    // Statistiche generali
    doc.setFontSize(12);
    doc.text('Statistiche Generali:', 20, 45);
    
    const totaleRecords = datiStorici.length;
    const gruppiUnici = [...new Set(datiStorici.map(d => d.gruppo))].length;
    const totaleValore = datiStorici.reduce((sum, d) => sum + d.valore, 0);
    
    doc.setFontSize(10);
    doc.text(`Totale record: ${totaleRecords}`, 20, 55);
    doc.text(`Gruppi coinvolti: ${gruppiUnici}`, 20, 65);
    doc.text(`Valore totale: ${totaleValore}`, 20, 75);
    
    // Tabella dati (primi 20 record)
    const datiLimitati = datiStorici.slice(0, 20);
    const headers = ['Data', 'Gruppo', 'Tipo', 'Valore'];
    const rows = datiLimitati.map(dato => [
        dato.data.toLocaleDateString('it-IT'),
        dato.gruppo,
        dato.tipo,
        dato.valore.toString()
    ]);
    
    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 90,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Salva il PDF
    doc.save(`storico_${new Date().toISOString().split('T')[0]}.pdf`);
}

function logout() {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Errore durante il logout:', error);
        alert('Errore durante il logout');
    });
}

// Esponi funzioni globali
window.esportaCSV = esportaCSV;
window.esportaExcel = esportaExcel;
window.esportaPDF = esportaPDF;
window.logout = logout;
window.mostraDettagli = mostraDettagli;
