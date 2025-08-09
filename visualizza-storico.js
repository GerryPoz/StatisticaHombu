// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDatabase, ref, get, child } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

// Variabili globali
let app, auth, database;
let datiStorici = [];
let gruppiDisponibili = [];
let chartInstances = {};
let gruppoToCapitolo = {};

// Inizializzazione
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await inizializzaApp();
        console.log('App inizializzata con successo');
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        alert('Errore durante l\'inizializzazione dell\'applicazione');
    }
});

// Inizializza l'applicazione
async function inizializzaApp() {
    // Inizializza Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    database = getDatabase(app);
    
    // Verifica autenticazione
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('Utente autenticato:', user.email);
            await caricaDatiStorici();
            inizializzaFiltri();
            inizializzaDatePicker();
            applicaFiltriDefault();
        } else {
            console.log('Utente non autenticato');
            window.location.href = 'login.html';
        }
    });
}

// Carica dati storici da Firebase
async function caricaDatiStorici() {
    try {
        console.log('Caricamento dati storici...');
        
        // Carica dati zadankai
        const zadankaiRef = ref(database, 'zadankai');
        const zadankaiSnapshot = await get(zadankaiRef);
        
        if (zadankaiSnapshot.exists()) {
            const zadankaiData = zadankaiSnapshot.val();
            console.log('Dati zadankai caricati:', Object.keys(zadankaiData).length, 'record');
            
            // Elabora dati zadankai
            Object.entries(zadankaiData).forEach(([id, record]) => {
                if (record.data && record.gruppo) {
                    datiStorici.push({
                        id: id,
                        data: record.data,
                        gruppo: record.gruppo,
                        settore: record.settore || '',
                        capitolo: record.capitolo || '',
                        tipo: 'zadankai',
                        categoria: 'membri',
                        valore: parseInt(record.membri) || 0,
                        ospiti: parseInt(record.ospiti) || 0,
                        simpatizzanti: parseInt(record.simpatizzanti) || 0
                    });
                }
            });
        }
        
        // Carica gruppi da gruppi.json
        try {
            const response = await fetch('gruppi.json');
            const gruppiData = await response.json();
            gruppiDisponibili = gruppiData.gruppi || [];
            
            // Crea mappa gruppo -> capitolo
            gruppiDisponibili.forEach(gruppo => {
                gruppoToCapitolo[gruppo.nome] = gruppo.capitolo;
            });
            
            console.log('Gruppi caricati:', gruppiDisponibili.length);
        } catch (error) {
            console.error('Errore caricamento gruppi:', error);
        }
        
        console.log('Dati storici totali:', datiStorici.length);
        
        if (datiStorici.length === 0) {
            console.log('Nessun dato trovato, genero dati di esempio');
            generaDatiEsempio();
        }
        
    } catch (error) {
        console.error('Errore durante il caricamento dei dati:', error);
        generaDatiEsempio();
    }
}

// Genera dati di esempio
function generaDatiEsempio() {
    console.log('Generazione dati di esempio...');
    
    const gruppiEsempio = ['Gruppo A', 'Gruppo B', 'Gruppo C'];
    const oggi = new Date();
    
    for (let i = 0; i < 30; i++) {
        const data = new Date(oggi);
        data.setDate(data.getDate() - i);
        
        gruppiEsempio.forEach(gruppo => {
            datiStorici.push({
                id: `esempio_${i}_${gruppo}`,
                data: data.toISOString().split('T')[0],
                gruppo: gruppo,
                settore: 'Settore ' + (Math.floor(Math.random() * 3) + 1),
                capitolo: 'Capitolo ' + gruppo.slice(-1),
                tipo: 'zadankai',
                categoria: 'membri',
                valore: Math.floor(Math.random() * 50) + 10,
                ospiti: Math.floor(Math.random() * 10),
                simpatizzanti: Math.floor(Math.random() * 5)
            });
        });
    }
    
    gruppiDisponibili = gruppiEsempio.map(nome => ({ nome, capitolo: 'Capitolo ' + nome.slice(-1) }));
    console.log('Dati di esempio generati:', datiStorici.length, 'record');
}

// Inizializza filtri
function inizializzaFiltri() {
    const gruppoSelect = document.getElementById('gruppoFiltro');
    if (gruppoSelect) {
        gruppoSelect.innerHTML = '<option value="tutti">Tutti i gruppi</option>';
        
        gruppiDisponibili.forEach(gruppo => {
            const option = document.createElement('option');
            option.value = gruppo.nome;
            option.textContent = gruppo.nome;
            gruppoSelect.appendChild(option);
        });
    }
    
    // Event listener per il pulsante applica filtri
    const applicaBtn = document.getElementById('applicaFiltri');
    if (applicaBtn) {
        applicaBtn.addEventListener('click', applicaFiltri);
    }
}

// Inizializza DatePicker
function inizializzaDatePicker() {
    const periodoInput = document.getElementById('periodo');
    if (periodoInput && typeof $ !== 'undefined') {
        $(periodoInput).daterangepicker({
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
                daysOfWeek: ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'],
                monthNames: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                           'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
                firstDay: 1
            },
            ranges: {
                'Ultimi 7 giorni': [moment().subtract(6, 'days'), moment()],
                'Ultimi 30 giorni': [moment().subtract(29, 'days'), moment()],
                'Questo mese': [moment().startOf('month'), moment().endOf('month')],
                'Mese scorso': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
                'Ultimi 3 mesi': [moment().subtract(3, 'months'), moment()],
                'Ultimi 12 mesi': [moment().subtract(12, 'months'), moment()]
            }
        });
    }
}

// Applica filtri di default
function applicaFiltriDefault() {
    setTimeout(() => {
        applicaFiltri();
    }, 1000);
}

// Applica filtri
function applicaFiltri() {
    const periodoInput = document.getElementById('periodo');
    const gruppoSelect = document.getElementById('gruppoFiltro');
    const aggregazioneSelect = document.getElementById('aggregazione');
    
    let dataInizio, dataFine;
    
    // Gestisci date
    if (periodoInput && $(periodoInput).data('daterangepicker')) {
        const dateRange = $(periodoInput).data('daterangepicker');
        dataInizio = dateRange.startDate.toDate();
        dataFine = dateRange.endDate.toDate();
    } else {
        // Default: ultimi 12 mesi
        dataFine = new Date();
        dataInizio = new Date();
        dataInizio.setFullYear(dataInizio.getFullYear() - 1);
    }
    
    const filtri = {
        dataInizio: dataInizio,
        dataFine: dataFine,
        gruppo: gruppoSelect ? gruppoSelect.value : 'tutti',
        aggregazione: aggregazioneSelect ? aggregazioneSelect.value : 'mensile'
    };
    
    console.log('Applicazione filtri:', filtri);
    mostraLoading(true);
    
    setTimeout(() => {
        elaboraDati(filtri);
        mostraLoading(false);
    }, 500);
}

// Mostra/nascondi loading
function mostraLoading(mostra) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = mostra ? 'block' : 'none';
    }
}

// Elabora dati
function elaboraDati(filtri) {
    console.log('Elaborazione dati con filtri:', filtri);
    
    // Filtra dati
    const datiFiltrati = datiStorici.filter(record => {
        const dataRecord = new Date(record.data);
        const dentroRange = dataRecord >= filtri.dataInizio && dataRecord <= filtri.dataFine;
        const gruppoOk = filtri.gruppo === 'tutti' || record.gruppo === filtri.gruppo;
        
        return dentroRange && gruppoOk;
    });
    
    console.log('Dati filtrati:', datiFiltrati.length);
    
    // Aggrega dati
    const datiAggregati = aggregaDati(datiFiltrati, filtri.aggregazione);
    
    // Aggiorna visualizzazioni
    aggiornaGrafici(datiAggregati, filtri);
    aggiornaTabella(datiFiltrati);
}

// Aggrega dati
function aggregaDati(dati, tipoAggregazione) {
    const aggregati = {};
    
    dati.forEach(record => {
        const data = new Date(record.data);
        let chiavePeriodo;
        
        switch (tipoAggregazione) {
            case 'giornaliera':
                chiavePeriodo = data.toISOString().split('T')[0];
                break;
            case 'settimanale':
                const lunedi = new Date(data);
                lunedi.setDate(data.getDate() - data.getDay() + 1);
                chiavePeriodo = lunedi.toISOString().split('T')[0];
                break;
            case 'mensile':
                chiavePeriodo = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
                break;
            case 'trimestrale':
                const trimestre = Math.floor(data.getMonth() / 3) + 1;
                chiavePeriodo = `${data.getFullYear()}-T${trimestre}`;
                break;
            case 'annuale':
                chiavePeriodo = data.getFullYear().toString();
                break;
            default:
                chiavePeriodo = data.toISOString().split('T')[0];
        }
        
        if (!aggregati[record.gruppo]) {
            aggregati[record.gruppo] = {};
        }
        
        if (!aggregati[record.gruppo][chiavePeriodo]) {
            aggregati[record.gruppo][chiavePeriodo] = {
                totale: 0,
                count: 0,
                media: 0
            };
        }
        
        aggregati[record.gruppo][chiavePeriodo].totale += record.valore;
        aggregati[record.gruppo][chiavePeriodo].count += 1;
        aggregati[record.gruppo][chiavePeriodo].media = 
            aggregati[record.gruppo][chiavePeriodo].totale / aggregati[record.gruppo][chiavePeriodo].count;
    });
    
    return aggregati;
}

// Aggiorna grafici
function aggiornaGrafici(datiAggregati, filtri) {
    // Distruggi grafico esistente
    if (chartInstances.main) {
        chartInstances.main.destroy();
    }
    
    const mainCanvas = document.getElementById('mainChart');
    if (!mainCanvas) {
        console.error('Canvas mainChart non trovato');
        return;
    }
    
    const ctx = mainCanvas.getContext('2d');
    
    // Prepara dati per il grafico
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

// Aggiorna tabella
function aggiornaTabella(dati) {
    const tbody = document.getElementById('storicoTableBody');
    if (!tbody) {
        console.error('Tbody storicoTableBody non trovato');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Ordina dati per data decrescente
    const datiOrdinati = dati.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    datiOrdinati.forEach((record, index) => {
        const row = tbody.insertRow();
        
        // Calcola variazione
        let variazione = '';
        if (index < datiOrdinati.length - 1) {
            const recordPrecedente = datiOrdinati[index + 1];
            if (recordPrecedente.gruppo === record.gruppo) {
                const diff = record.valore - recordPrecedente.valore;
                const percentuale = recordPrecedente.valore > 0 ? 
                    ((diff / recordPrecedente.valore) * 100).toFixed(1) : 0;
                variazione = `${diff > 0 ? '+' : ''}${diff} (${percentuale}%)`;
            }
        }
        
        // Determina categoria
        let categoria = 'Membri';
        if (record.ospiti > 0) categoria = 'Ospiti';
        if (record.simpatizzanti > 0) categoria = 'Simpatizzanti';
        
        row.innerHTML = `
            <td>${new Date(record.data).toLocaleDateString('it-IT')}</td>
            <td>${record.gruppo}</td>
            <td>${record.settore}</td>
            <td>${record.capitolo}</td>
            <td>${record.tipo}</td>
            <td><span class="badge bg-primary">${categoria}</span></td>
            <td>${record.valore}</td>
            <td>${variazione}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="mostraDettagli('${record.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
    });
}

// Mostra dettagli
function mostraDettagli(id) {
    const record = datiStorici.find(r => r.id === id);
    if (record) {
        alert(`Dettagli record:\n\nData: ${record.data}\nGruppo: ${record.gruppo}\nValore: ${record.valore}\nOspiti: ${record.ospiti || 0}\nSimpatizzanti: ${record.simpatizzanti || 0}`);
    }
}

// Esporta CSV
function esportaCSV() {
    const headers = ['Data', 'Gruppo', 'Settore', 'Capitolo', 'Tipo', 'Valore', 'Ospiti', 'Simpatizzanti'];
    const csvContent = [headers.join(',')];
    
    datiStorici.forEach(record => {
        const row = [
            record.data,
            record.gruppo,
            record.settore,
            record.capitolo,
            record.tipo,
            record.valore,
            record.ospiti || 0,
            record.simpatizzanti || 0
        ];
        csvContent.push(row.join(','));
    });
    
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'storico_dati.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Esporta Excel
function esportaExcel() {
    const ws = XLSX.utils.json_to_sheet(datiStorici);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Storico');
    XLSX.writeFile(wb, 'storico_dati.xlsx');
}

// Esporta PDF
function esportaPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Storico Dati Statistiche', 20, 20);
    
    let y = 40;
    datiStorici.slice(0, 20).forEach(record => {
        doc.setFontSize(10);
        doc.text(`${record.data} - ${record.gruppo}: ${record.valore}`, 20, y);
        y += 10;
        
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
    });
    
    doc.save('storico_dati.pdf');
}

// Logout
function logout() {
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Errore durante il logout:', error);
    });
}

// Esponi funzioni globalmente
window.esportaCSV = esportaCSV;
window.esportaExcel = esportaExcel;
window.esportaPDF = esportaPDF;
window.logout = logout;
window.mostraDettagli = mostraDettagli;
