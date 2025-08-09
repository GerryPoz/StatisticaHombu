// Importa la configurazione Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

let app, auth, database;
let datiStorici = [];
let gruppiDisponibili = [];
let chartInstances = {};

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
        const snapshot = await get(ref(database, 'dati_storici'));
        if (snapshot.exists()) {
            datiStorici = Object.entries(snapshot.val()).map(([key, value]) => ({
                id: key,
                ...value,
                data: new Date(value.data)
            }));
        }
        
        // Carica anche i gruppi attuali per riferimento
        const gruppiSnapshot = await get(ref(database, 'gruppi'));
        if (gruppiSnapshot.exists()) {
            gruppiDisponibili = Object.values(gruppiSnapshot.val());
        }
        
    } catch (error) {
        console.error('Errore caricamento dati:', error);
        // Dati di esempio per testing
        generaDatiEsempio();
    }
}

// Genera dati di esempio per testing
function generaDatiEsempio() {
    const gruppiEsempio = ['Gruppo A', 'Gruppo B', 'Gruppo C', 'Gruppo D'];
    const settori = ['Settore 1', 'Settore 2', 'Settore 3'];
    const capitoli = ['Capitolo Nord', 'Capitolo Sud', 'Capitolo Centro'];
    
    datiStorici = [];
    
    // Genera dati per gli ultimi 24 mesi
    for (let i = 24; i >= 0; i--) {
        const data = new Date();
        data.setMonth(data.getMonth() - i);
        
        gruppiEsempio.forEach((gruppo, index) => {
            datiStorici.push({
                id: `${data.getTime()}_${index}`,
                data: data,
                gruppo: gruppo,
                settore: settori[index % settori.length],
                capitolo: capitoli[index % capitoli.length],
                valore: Math.floor(Math.random() * 100) + 50 + (i * 2), // Trend crescente
                tipo: 'presenze'
            });
        });
    }
    
    gruppiDisponibili = gruppiEsempio.map(nome => ({ nome }));
}

// Inizializza filtri
function inizializzaFiltri() {
    const gruppiSelect = document.getElementById('gruppiSelect');
    gruppiSelect.innerHTML = '<option value="tutti">Tutti i gruppi</option>';
    
    gruppiDisponibili.forEach(gruppo => {
        const option = document.createElement('option');
        option.value = gruppo.nome;
        option.textContent = gruppo.nome;
        gruppiSelect.appendChild(option);
    });
}

// Inizializza date picker
function inizializzaDatePicker() {
    $('#daterange').daterangepicker({
        startDate: moment().subtract(12, 'months'),
        endDate: moment(),
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
                        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
        },
        ranges: {
            'Ultimi 30 giorni': [moment().subtract(29, 'days'), moment()],
            'Ultimi 3 mesi': [moment().subtract(3, 'months'), moment()],
            'Ultimi 6 mesi': [moment().subtract(6, 'months'), moment()],
            'Ultimo anno': [moment().subtract(12, 'months'), moment()],
            'Anno corrente': [moment().startOf('year'), moment()]
        }
    });
}

// Applica filtri default
function applicaFiltriDefault() {
    const filtri = {
        dataInizio: moment().subtract(12, 'months').toDate(),
        dataFine: moment().toDate(),
        gruppi: ['tutti'],
        aggregazione: 'mensile'
    };
    
    elaboraDati(filtri);
}

// Applica filtri
function applicaFiltri() {
    const dateRange = $('#daterange').data('daterangepicker');
    const gruppiSelezionati = Array.from(document.getElementById('gruppiSelect').selectedOptions)
        .map(option => option.value);
    const aggregazione = document.getElementById('aggregazione').value;
    
    const filtri = {
        dataInizio: dateRange.startDate.toDate(),
        dataFine: dateRange.endDate.toDate(),
        gruppi: gruppiSelezionati,
        aggregazione: aggregazione
    };
    
    mostraLoading(true);
    
    setTimeout(() => {
        elaboraDati(filtri);
        mostraLoading(false);
    }, 500);
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
    
    // Aggrega dati
    const datiAggregati = aggregaDati(datiFiltrati, filtri.aggregazione);
    
    // Aggiorna visualizzazioni
    aggiornaDashboard(datiAggregati, filtri);
    aggiornaGrafici(datiAggregati, filtri);
    aggiornaTabella(datiFiltrati);
    aggiornaAnalisi(datiAggregati, filtri);
}

// Aggrega dati per periodo
function aggregaDati(dati, tipoAggregazione) {
    const gruppi = {};
    
    dati.forEach(dato => {
        let chiavePeriodo;
        
        switch (tipoAggregazione) {
            case 'mensile':
                chiavePeriodo = `${dato.data.getFullYear()}-${String(dato.data.getMonth() + 1).padStart(2, '0')}`;
                break;
            case 'trimestrale':
                const trimestre = Math.floor(dato.data.getMonth() / 3) + 1;
                chiavePeriodo = `${dato.data.getFullYear()}-T${trimestre}`;
                break;
            case 'annuale':
                chiavePeriodo = dato.data.getFullYear().toString();
                break;
        }
        
        if (!gruppi[dato.gruppo]) {
            gruppi[dato.gruppo] = {};
        }
        
        if (!gruppi[dato.gruppo][chiavePeriodo]) {
            gruppi[dato.gruppo][chiavePeriodo] = {
                valore: 0,
                count: 0,
                periodo: chiavePeriodo
            };
        }
        
        gruppi[dato.gruppo][chiavePeriodo].valore += dato.valore;
        gruppi[dato.gruppo][chiavePeriodo].count++;
    });
    
    // Calcola medie
    Object.keys(gruppi).forEach(gruppo => {
        Object.keys(gruppi[gruppo]).forEach(periodo => {
            gruppi[gruppo][periodo].media = 
                gruppi[gruppo][periodo].valore / gruppi[gruppo][periodo].count;
        });
    });
    
    return gruppi;
}

// Aggiorna dashboard
function aggiornaDashboard(datiAggregati, filtri) {
    const statsCards = document.getElementById('statsCards');
    statsCards.innerHTML = '';
    
    // Calcola statistiche generali
    const stats = calcolaStatistiche(datiAggregati);
    
    // Card statistiche
    const cardStats = [
        { titolo: 'Gruppi Attivi', valore: stats.gruppiAttivi, icona: 'users', colore: 'primary' },
        { titolo: 'Media Generale', valore: stats.mediaGenerale.toFixed(1), icona: 'chart-line', colore: 'success' },
        { titolo: 'Trend Generale', valore: stats.trendGenerale, icona: stats.trendGenerale > 0 ? 'arrow-up' : 'arrow-down', colore: stats.trendGenerale > 0 ? 'success' : 'danger' },
        { titolo: 'Variabilità', valore: stats.variabilita.toFixed(1), icona: 'wave-square', colore: 'info' }
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
}

// Calcola statistiche
function calcolaStatistiche(datiAggregati) {
    const gruppi = Object.keys(datiAggregati);
    let valoriTotali = [];
    let trendTotale = 0;
    
    gruppi.forEach(gruppo => {
        const periodi = Object.keys(datiAggregati[gruppo]).sort();
        const valori = periodi.map(p => datiAggregati[gruppo][p].media);
        
        valoriTotali = valoriTotali.concat(valori);
        
        // Calcola trend per gruppo
        if (valori.length > 1) {
            const primo = valori[0];
            const ultimo = valori[valori.length - 1];
            trendTotale += ((ultimo - primo) / primo) * 100;
        }
    });
    
    const mediaGenerale = valoriTotali.reduce((a, b) => a + b, 0) / valoriTotali.length;
    const varianza = valoriTotali.reduce((acc, val) => acc + Math.pow(val - mediaGenerale, 2), 0) / valoriTotali.length;
    const variabilita = Math.sqrt(varianza);
    
    return {
        gruppiAttivi: gruppi.length,
        mediaGenerale: mediaGenerale || 0,
        trendGenerale: trendTotale / gruppi.length || 0,
        variabilita: variabilita || 0
    };
}

// Aggiorna grafici
function aggiornaGrafici(datiAggregati, filtri) {
    const tipoVis = document.getElementById('tipoVis').value;
    
    switch (tipoVis) {
        case 'linee':
            creaGraficoLinee(datiAggregati);
            break;
        case 'barre':
            creaGraficoBarre(datiAggregati);
            break;
        case 'heatmap':
            creaHeatmap(datiAggregati);
            break;
    }
    
    creaGraficoConfronto(datiAggregati);
}

// Crea grafico a linee
function creaGraficoLinee(datiAggregati) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    if (chartInstances.main) {
        chartInstances.main.destroy();
    }
    
    const datasets = [];
    const colori = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    Object.keys(datiAggregati).forEach((gruppo, index) => {
        const periodi = Object.keys(datiAggregati[gruppo]).sort();
        const valori = periodi.map(p => datiAggregati[gruppo][p].media);
        
        datasets.push({
            label: gruppo,
            data: valori,
            borderColor: colori[index % colori.length],
            backgroundColor: colori[index % colori.length] + '20',
            tension: 0.4,
            fill: false
        });
    });
    
    const labels = Object.keys(datiAggregati[Object.keys(datiAggregati)[0]] || {}).sort();
    
    chartInstances.main = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Andamento Temporale per Gruppo'
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Valore'
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

// Crea grafico a barre
function creaGraficoBarre(datiAggregati) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    if (chartInstances.main) {
        chartInstances.main.destroy();
    }
    
    // Calcola medie per gruppo
    const gruppi = Object.keys(datiAggregati);
    const medie = gruppi.map(gruppo => {
        const valori = Object.values(datiAggregati[gruppo]).map(p => p.media);
        return valori.reduce((a, b) => a + b, 0) / valori.length;
    });
    
    chartInstances.main = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: gruppi,
            datasets: [{
                label: 'Media Periodo',
                data: medie,
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Confronto Medie per Gruppo'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Valore Medio'
                    }
                }
            }
        }
    });
}

// Crea grafico di confronto
function creaGraficoConfronto(datiAggregati) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    if (chartInstances.comparison) {
        chartInstances.comparison.destroy();
    }
    
    // Prendi gli ultimi 6 periodi per il confronto
    const tuttiPeriodi = new Set();
    Object.values(datiAggregati).forEach(gruppo => {
        Object.keys(gruppo).forEach(periodo => tuttiPeriodi.add(periodo));
    });
    
    const periodiOrdinati = Array.from(tuttiPeriodi).sort().slice(-6);
    const gruppi = Object.keys(datiAggregati);
    const colori = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    const datasets = gruppi.map((gruppo, index) => ({
        label: gruppo,
        data: periodiOrdinati.map(periodo => 
            datiAggregati[gruppo][periodo]?.media || 0
        ),
        backgroundColor: colori[index % colori.length] + '80',
        borderColor: colori[index % colori.length],
        borderWidth: 1
    }));
    
    chartInstances.comparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: periodiOrdinati,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Confronto Ultimi Periodi'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Aggiorna tabella
function aggiornaTabella(dati) {
    const tbody = document.getElementById('storicoTableBody');
    tbody.innerHTML = '';
    
    // Ordina per data decrescente
    const datiOrdinati = dati.sort((a, b) => b.data - a.data).slice(0, 100); // Limita a 100 righe
    
    datiOrdinati.forEach((dato, index) => {
        const row = document.createElement('tr');
        
        // Calcola variazione rispetto al record precedente dello stesso gruppo
        let variazione = '';
        if (index < datiOrdinati.length - 1) {
            const precedente = datiOrdinati.find((d, i) => 
                i > index && d.gruppo === dato.gruppo
            );
            if (precedente) {
                const diff = dato.valore - precedente.valore;
                const percentuale = ((diff / precedente.valore) * 100).toFixed(1);
                variazione = `${diff > 0 ? '+' : ''}${diff} (${percentuale}%)`;
            }
        }
        
        row.innerHTML = `
            <td>${dato.data.toLocaleDateString('it-IT')}</td>
            <td>${dato.gruppo}</td>
            <td>${dato.settore || '-'}</td>
            <td>${dato.capitolo || '-'}</td>
            <td>${dato.valore}</td>
            <td class="${variazione.startsWith('+') ? 'trend-up' : variazione.startsWith('-') ? 'trend-down' : ''}">
                ${variazione || '-'}
            </td>
            <td>${dato.note || '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Aggiorna analisi
function aggiornaAnalisi(datiAggregati, filtri) {
    aggiornaTrendAnalysis(datiAggregati);
    aggiornaSeasonalityAnalysis(datiAggregati);
    aggiornaCorrelationAnalysis(datiAggregati);
}

// Trend Analysis
function aggiornaTrendAnalysis(datiAggregati) {
    const container = document.getElementById('trendAnalysis');
    container.innerHTML = '';
    
    Object.keys(datiAggregati).forEach(gruppo => {
        const periodi = Object.keys(datiAggregati[gruppo]).sort();
        const valori = periodi.map(p => datiAggregati[gruppo][p].media);
        
        if (valori.length > 1) {
            const primo = valori[0];
            const ultimo = valori[valori.length - 1];
            const trend = ((ultimo - primo) / primo) * 100;
            
            const trendElement = document.createElement('div');
            trendElement.className = 'mb-2';
            trendElement.innerHTML = `
                <strong>${gruppo}:</strong>
                <span class="${trend > 0 ? 'trend-up' : 'trend-down'}">
                    ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%
                    <i class="fas fa-${trend > 0 ? 'arrow-up' : 'arrow-down'} ms-1"></i>
                </span>
            `;
            container.appendChild(trendElement);
        }
    });
}

// Seasonality Analysis
function aggiornaSeasonalityAnalysis(datiAggregati) {
    const container = document.getElementById('seasonalityAnalysis');
    container.innerHTML = '<p class="text-muted">Analisi stagionalità in sviluppo...</p>';
}

// Correlation Analysis
function aggiornaCorrelationAnalysis(datiAggregati) {
    const container = document.getElementById('correlationAnalysis');
    container.innerHTML = '<p class="text-muted">Analisi correlazioni in sviluppo...</p>';
}

// Cambia visualizzazione
function cambiaVisualizzazione() {
    applicaFiltri();
}

// Mostra/nascondi loading
function mostraLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const dashboard = document.getElementById('dashboardSection');
    
    if (show) {
        spinner.style.display = 'block';
        dashboard.style.opacity = '0.5';
    } else {
        spinner.style.display = 'none';
        dashboard.style.opacity = '1';
    }
}

// Funzioni di esportazione
function esportaCSV() {
    const dati = datiStorici;
    let csv = 'Data,Gruppo,Settore,Capitolo,Valore,Note\n';
    
    dati.forEach(dato => {
        csv += `${dato.data.toLocaleDateString('it-IT')},"${dato.gruppo}","${dato.settore || ''}","${dato.capitolo || ''}",${dato.valore},"${dato.note || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `storico_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function esportaExcel() {
    const dati = datiStorici.map(dato => ({
        Data: dato.data.toLocaleDateString('it-IT'),
        Gruppo: dato.gruppo,
        Settore: dato.settore || '',
        Capitolo: dato.capitolo || '',
        Valore: dato.valore,
        Note: dato.note || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(dati);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Storico');
    XLSX.writeFile(wb, `storico_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function esportaPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Report Storico', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, 20, 30);
    
    // Aggiungi statistiche principali
    let y = 50;
    doc.text('Statistiche Principali:', 20, y);
    y += 10;
    
    const stats = calcolaStatistiche({});
    doc.text(`Gruppi attivi: ${stats.gruppiAttivi}`, 30, y);
    y += 8;
    doc.text(`Media generale: ${stats.mediaGenerale.toFixed(1)}`, 30, y);
    
    doc.save(`report_storico_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Logout
function logout() {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Errore logout:', error);
    });
}

// Esponi funzioni globali
window.esportaCSV = esportaCSV;
window.esportaExcel = esportaExcel;
window.esportaPDF = esportaPDF;
window.logout = logout;