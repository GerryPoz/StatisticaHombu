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
        
        // Reset array dati
        datiStorici = [];
        
        // Prima carica i gruppi per avere la mappatura gruppo->capitolo
        try {
            const response = await fetch('gruppi.json');
            const gruppiData = await response.json();
            
            // Estrai gruppi dalla struttura HOMBU 9
            if (gruppiData['HOMBU 9']) {
                const struttura = gruppiData['HOMBU 9'];
                gruppiDisponibili = [];
                
                Object.entries(struttura).forEach(([capitolo, settori]) => {
                    Object.entries(settori).forEach(([settore, gruppi]) => {
                        gruppi.forEach(gruppo => {
                            gruppiDisponibili.push({
                                nome: gruppo,
                                capitolo: capitolo,
                                settore: settore
                            });
                            gruppoToCapitolo[gruppo] = capitolo;
                        });
                    });
                });
            }
            
            console.log('Gruppi caricati:', gruppiDisponibili.length);
            console.log('Mappatura gruppi:', gruppoToCapitolo);
        } catch (error) {
            console.error('Errore caricamento gruppi:', error);
        }
        
        // Carica dati zadankai dal database reale
        const zadankaiRef = ref(database, 'zadankai');
        const zadankaiSnapshot = await get(zadankaiRef);
        
        if (zadankaiSnapshot.exists()) {
            const zadankaiData = zadankaiSnapshot.val();
            console.log('Dati zadankai trovati:', Object.keys(zadankaiData));
            console.log('Numero record zadankai:', Object.keys(zadankaiData).length);
            
            // Elabora dati zadankai dal database reale
            Object.entries(zadankaiData).forEach(([chiave, sezioni]) => {
                console.log('Elaborando chiave:', chiave, 'Sezioni:', Object.keys(sezioni));
                
                // La chiave è nel formato: anno-mese-gruppo
                const [anno, mese, gruppo] = chiave.split('-');
                
                if (!anno || !mese || !gruppo) {
                    console.warn('Chiave malformata:', chiave);
                    return;
                }
                
                // Converti mese da nome a numero per creare una data valida
                const mesiMap = {
                    'Gennaio': '01', 'Febbraio': '02', 'Marzo': '03', 'Aprile': '04',
                    'Maggio': '05', 'Giugno': '06', 'Luglio': '07', 'Agosto': '08',
                    'Settembre': '09', 'Ottobre': '10', 'Novembre': '11', 'Dicembre': '12'
                };
                
                const meseNumero = mesiMap[mese] || '01';
                const dataRecord = `${anno}-${meseNumero}-01`;
                
                // Processa dati zadankai
                if (sezioni.zadankai) {
                    Object.entries(sezioni.zadankai).forEach(([categoria, dati]) => {
                        console.log('Zadankai - Categoria:', categoria, 'Dati:', dati);
                        
                        // Calcola totali per ogni sottocategoria
                        const membri = (dati.U || 0) + (dati.D || 0) + (dati.GU || 0) + (dati.GD || 0);
                        const futuro = dati.FUT || 0;
                        const studenti = dati.STU || 0;
                        const totale = membri + futuro + studenti;
                        
                        datiStorici.push({
                            id: `${chiave}_zadankai_${categoria}`,
                            data: dataRecord,
                            gruppo: gruppo,
                            settore: gruppoToCapitolo[gruppo] || 'Non definito',
                            capitolo: gruppoToCapitolo[gruppo] || 'Non definito',
                            tipo: 'zadankai',
                            categoria: categoria,
                            valore: totale,
                            membri: membri,
                            simpatizzanti: categoria === 'simpatizzanti' ? membri : 0,
                            ospiti: categoria === 'ospiti' ? membri : 0,
                            futuro: futuro,
                            studenti: studenti,
                            dettagli: {
                                U: dati.U || 0,
                                D: dati.D || 0,
                                GU: dati.GU || 0,
                                GD: dati.GD || 0,
                                FUT: dati.FUT || 0,
                                STU: dati.STU || 0
                            }
                        });
                    });
                }
                
                // Processa dati praticanti
                if (sezioni.praticanti) {
                    Object.entries(sezioni.praticanti).forEach(([categoria, dati]) => {
                        console.log('Praticanti - Categoria:', categoria, 'Dati:', dati);
                        
                        const membri = (dati.U || 0) + (dati.D || 0) + (dati.GU || 0) + (dati.GD || 0);
                        
                        datiStorici.push({
                            id: `${chiave}_praticanti_${categoria}`,
                            data: dataRecord,
                            gruppo: gruppo,
                            settore: gruppoToCapitolo[gruppo] || 'Non definito',
                            capitolo: gruppoToCapitolo[gruppo] || 'Non definito',
                            tipo: 'praticanti',
                            categoria: categoria,
                            valore: membri,
                            membri: membri,
                            simpatizzanti: categoria === 'simpatizzanti' ? membri : 0,
                            ospiti: 0,
                            futuro: 0,
                            studenti: 0,
                            dettagli: {
                                U: dati.U || 0,
                                D: dati.D || 0,
                                GU: dati.GU || 0,
                                GD: dati.GD || 0
                            }
                        });
                    });
                }
            });
        } else {
            console.log('Nessun dato zadankai trovato nel database');
            // Genera alcuni dati di esempio per test
            generaDatiEsempio();
        }
        
        console.log('Dati storici totali caricati:', datiStorici.length);
        console.log('Primi 3 record:', datiStorici.slice(0, 3));
        
        if (datiStorici.length === 0) {
            console.log('Nessun dato trovato nel database');
            alert('Nessun dato trovato nel database. Verificare la connessione e i dati.');
        }
        
    } catch (error) {
        console.error('Errore durante il caricamento dei dati:', error);
        alert('Errore durante il caricamento dei dati: ' + error.message);
        // In caso di errore, genera dati di esempio
        generaDatiEsempio();
    }
}

// Genera dati di esempio
function generaDatiEsempio() {
    console.log('Generazione dati di esempio...');
    
    const gruppiEsempio = ['Gruppo A', 'Gruppo B', 'Gruppo C'];
    const categorie = ['membri', 'simpatizzanti', 'ospiti'];
    const tipi = ['zadankai', 'praticanti'];
    const oggi = new Date();
    
    for (let i = 0; i < 12; i++) {
        const data = new Date(oggi);
        data.setMonth(data.getMonth() - i);
        
        gruppiEsempio.forEach(gruppo => {
            tipi.forEach(tipo => {
                categorie.forEach(categoria => {
                    const membri = Math.floor(Math.random() * 30) + 10;
                    const futuro = tipo === 'zadankai' ? Math.floor(Math.random() * 5) : 0;
                    const studenti = tipo === 'zadankai' ? Math.floor(Math.random() * 8) : 0;
                    
                    datiStorici.push({
                        id: `esempio_${i}_${gruppo}_${tipo}_${categoria}`,
                        data: data.toISOString().split('T')[0],
                        gruppo: gruppo,
                        settore: 'Settore ' + (Math.floor(Math.random() * 3) + 1),
                        capitolo: 'Capitolo ' + gruppo.slice(-1),
                        tipo: tipo,
                        categoria: categoria,
                        valore: membri + futuro + studenti,
                        membri: membri,
                        simpatizzanti: categoria === 'simpatizzanti' ? membri : 0,
                        ospiti: categoria === 'ospiti' ? membri : 0,
                        futuro: futuro,
                        studenti: studenti
                    });
                });
            });
        });
    }
    
    gruppiDisponibili = gruppiEsempio.map(nome => ({ 
        nome, 
        capitolo: 'Capitolo ' + nome.slice(-1),
        settore: 'Settore 1'
    }));
    
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
    
    // Event listener per i filtri che cambiano automaticamente
    const filtriAuto = ['tipoFiltro', 'categoriaFiltro', 'aggregazione'];
    filtriAuto.forEach(filtroId => {
        const elemento = document.getElementById(filtroId);
        if (elemento) {
            elemento.addEventListener('change', applicaFiltri);
        }
    });
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
        
        // Event listener per quando cambia il periodo
        $(periodoInput).on('apply.daterangepicker', function(ev, picker) {
            applicaFiltri();
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
    const tipoSelect = document.getElementById('tipoFiltro');
    const categoriaSelect = document.getElementById('categoriaFiltro');
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
        tipo: tipoSelect ? tipoSelect.value : 'tutto',
        categoria: categoriaSelect ? categoriaSelect.value : 'totale',
        aggregazione: aggregazioneSelect ? aggregazioneSelect.value : 'mensile'
    };
    
    console.log('Applicazione filtri:', filtri);
    console.log('Dati disponibili:', datiStorici.length);
    
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
    let datiFiltrati = datiStorici.filter(record => {
        const dataRecord = new Date(record.data);
        const dentroRange = dataRecord >= filtri.dataInizio && dataRecord <= filtri.dataFine;
        const gruppoOk = filtri.gruppo === 'tutti' || record.gruppo === filtri.gruppo;
        const tipoOk = filtri.tipo === 'tutto' || record.tipo === filtri.tipo;
        
        return dentroRange && gruppoOk && tipoOk;
    });
    
    console.log('Dati filtrati:', datiFiltrati.length);
    
    // Aggrega dati
    const datiAggregati = aggregaDati(datiFiltrati, filtri.aggregazione, filtri.categoria);
    
    // Aggiorna visualizzazioni
    aggiornaGrafici(datiAggregati, filtri);
    aggiornaTabella(datiFiltrati);
}

// Aggrega dati
function aggregaDati(dati, tipoAggregazione, categoria) {
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
                membri: 0,
                simpatizzanti: 0,
                ospiti: 0,
                futuro: 0,
                studenti: 0,
                count: 0
            };
        }
        
        // Aggrega in base alla categoria selezionata
        let valore = 0;
        switch (categoria) {
            case 'totale':
                valore = record.valore;
                break;
            case 'membri':
                valore = record.membri || 0;
                break;
            case 'simpatizzanti':
                valore = record.simpatizzanti || 0;
                break;
            case 'ospiti':
                valore = record.ospiti || 0;
                break;
            case 'futuro':
                valore = record.futuro || 0;
                break;
            case 'studenti':
                valore = record.studenti || 0;
                break;
            default:
                valore = record.valore;
        }
        
        aggregati[record.gruppo][chiavePeriodo].totale += valore;
        aggregati[record.gruppo][chiavePeriodo].membri += record.membri || 0;
        aggregati[record.gruppo][chiavePeriodo].simpatizzanti += record.simpatizzanti || 0;
        aggregati[record.gruppo][chiavePeriodo].ospiti += record.ospiti || 0;
        aggregati[record.gruppo][chiavePeriodo].futuro += record.futuro || 0;
        aggregati[record.gruppo][chiavePeriodo].studenti += record.studenti || 0;
        aggregati[record.gruppo][chiavePeriodo].count += 1;
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
        'rgb(255, 159, 64)',
        'rgb(255, 159, 164)',
        'rgb(255, 206, 84)',
        'rgb(75, 192, 92)'
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
            return datiAggregati[gruppo][periodo] ? datiAggregati[gruppo][periodo].totale : 0;
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
    
    // Determina il titolo del grafico in base alla categoria
    let titoloCategoria = '';
    switch (filtri.categoria) {
        case 'totale':
            titoloCategoria = 'Totali';
            break;
        case 'membri':
            titoloCategoria = 'Membri';
            break;
        case 'simpatizzanti':
            titoloCategoria = 'Simpatizzanti';
            break;
        case 'ospiti':
            titoloCategoria = 'Ospiti';
            break;
        case 'futuro':
            titoloCategoria = 'Futuro';
            break;
        case 'studenti':
            titoloCategoria = 'Studenti';
            break;
        default:
            titoloCategoria = 'Totali';
    }
    
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
                    text: `Andamento ${titoloCategoria} - ${filtri.aggregazione.charAt(0).toUpperCase() + filtri.aggregazione.slice(1)}`
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
                        text: titoloCategoria
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
            if (recordPrecedente.gruppo === record.gruppo && recordPrecedente.categoria === record.categoria) {
                const diff = record.valore - recordPrecedente.valore;
                const percentuale = recordPrecedente.valore > 0 ? 
                    ((diff / recordPrecedente.valore) * 100).toFixed(1) : 0;
                variazione = `${diff > 0 ? '+' : ''}${diff} (${percentuale}%)`;
            }
        }
        
        row.innerHTML = `
            <td>${new Date(record.data).toLocaleDateString('it-IT')}</td>
            <td>${record.gruppo}</td>
            <td>${record.settore}</td>
            <td>${record.capitolo}</td>
            <td><span class="badge bg-info">${record.tipo.toUpperCase()}</span></td>
            <td><span class="badge bg-primary">${record.categoria.charAt(0).toUpperCase() + record.categoria.slice(1)}</span></td>
            <td><strong>${record.valore}</strong></td>
            <td>${record.membri || 0}</td>
            <td>${record.simpatizzanti || 0}</td>
            <td>${record.ospiti || 0}</td>
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
        let dettagliText = `Dettagli record:\n\n`;
        dettagliText += `Data: ${new Date(record.data).toLocaleDateString('it-IT')}\n`;
        dettagliText += `Gruppo: ${record.gruppo}\n`;
        dettagliText += `Settore: ${record.settore}\n`;
        dettagliText += `Capitolo: ${record.capitolo}\n`;
        dettagliText += `Tipo: ${record.tipo.toUpperCase()}\n`;
        dettagliText += `Categoria: ${record.categoria}\n`;
        dettagliText += `Valore Totale: ${record.valore}\n\n`;
        
        if (record.dettagli) {
            dettagliText += `Dettagli per genere/età:\n`;
            dettagliText += `- Uomini (U): ${record.dettagli.U || 0}\n`;
            dettagliText += `- Donne (D): ${record.dettagli.D || 0}\n`;
            dettagliText += `- Giovani Uomini (GU): ${record.dettagli.GU || 0}\n`;
            dettagliText += `- Giovani Donne (GD): ${record.dettagli.GD || 0}\n`;
            if (record.dettagli.FUT) dettagliText += `- Futuro (FUT): ${record.dettagli.FUT}\n`;
            if (record.dettagli.STU) dettagliText += `- Studenti (STU): ${record.dettagli.STU}\n`;
        }
        
        alert(dettagliText);
    }
}

// Esporta CSV
function esportaCSV() {
    const headers = ['Data', 'Gruppo', 'Settore', 'Capitolo', 'Tipo', 'Categoria', 'Valore', 'Membri', 'Simpatizzanti', 'Ospiti'];
    const csvContent = [headers.join(',')];
    
    datiStorici.forEach(record => {
        const row = [
            record.data,
            record.gruppo,
            record.settore,
            record.capitolo,
            record.tipo,
            record.categoria,
            record.valore,
            record.membri || 0,
            record.simpatizzanti || 0,
            record.ospiti || 0
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
    if (typeof XLSX === 'undefined') {
        alert('Libreria XLSX non caricata. Impossibile esportare in Excel.');
        return;
    }
    
    const ws = XLSX.utils.json_to_sheet(datiStorici);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Storico');
    XLSX.writeFile(wb, 'storico_dati.xlsx');
}

// Esporta PDF
function esportaPDF() {
    if (typeof window.jspdf === 'undefined') {
        alert('Libreria jsPDF non caricata. Impossibile esportare in PDF.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Storico Dati Statistiche', 20, 20);
    
    let y = 40;
    datiStorici.slice(0, 20).forEach(record => {
        doc.setFontSize(10);
        doc.text(`${record.data} - ${record.gruppo} (${record.categoria}): ${record.valore}`, 20, y);
        y += 10;
        
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
    });
    
    if (datiStorici.length > 20) {
        doc.setFontSize(8);
        doc.text(`... e altri ${datiStorici.length - 20} record`, 20, y);
    }
    
    doc.save('storico_dati.pdf');
}

// Logout
function logout() {
    signOut(auth).then(() => {
        console.log('Logout effettuato');
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Errore durante il logout:', error);
    });
}

// Esporta funzioni globali
window.esportaCSV = esportaCSV;
window.esportaExcel = esportaExcel;
window.esportaPDF = esportaPDF;
window.logout = logout;
window.mostraDettagli = mostraDettagli;
