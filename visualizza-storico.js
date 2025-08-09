// ... existing code ...

// Carica dati storici da Firebase
async function caricaDatiStorici() {
    try {
        console.log('Caricamento dati storici...');
        
        // Carica dati zadankai dal database reale
        const zadankaiRef = ref(database, 'zadankai');
        const zadankaiSnapshot = await get(zadankaiRef);
        
        if (zadankaiSnapshot.exists()) {
            const zadankaiData = zadankaiSnapshot.val();
            console.log('Dati zadankai caricati:', Object.keys(zadankaiData).length, 'record');
            
            // Elabora dati zadankai dal database reale
            Object.entries(zadankaiData).forEach(([chiave, sezioni]) => {
                // La chiave è nel formato: anno-mese-gruppo
                const [anno, mese, gruppo] = chiave.split('-');
                
                if (!anno || !mese || !gruppo) return;
                
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
                        datiStorici.push({
                            id: `${chiave}_zadankai_${categoria}`,
                            data: dataRecord,
                            gruppo: gruppo,
                            settore: gruppoToCapitolo[gruppo] || '',
                            capitolo: gruppoToCapitolo[gruppo] || '',
                            tipo: 'zadankai',
                            categoria: categoria,
                            membri: (dati.U || 0) + (dati.D || 0) + (dati.GU || 0) + (dati.GD || 0),
                            simpatizzanti: 0,
                            ospiti: 0,
                            futuro: dati.FUT || 0,
                            studenti: dati.STU || 0,
                            valore: (dati.U || 0) + (dati.D || 0) + (dati.GU || 0) + (dati.GD || 0) + (dati.FUT || 0) + (dati.STU || 0),
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
                        datiStorici.push({
                            id: `${chiave}_praticanti_${categoria}`,
                            data: dataRecord,
                            gruppo: gruppo,
                            settore: gruppoToCapitolo[gruppo] || '',
                            capitolo: gruppoToCapitolo[gruppo] || '',
                            tipo: 'praticanti',
                            categoria: categoria,
                            membri: (dati.U || 0) + (dati.D || 0) + (dati.GU || 0) + (dati.GD || 0),
                            simpatizzanti: 0,
                            ospiti: 0,
                            futuro: 0,
                            studenti: 0,
                            valore: (dati.U || 0) + (dati.D || 0) + (dati.GU || 0) + (dati.GD || 0),
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
        }
        
        // ... existing code per caricamento gruppi ...
        
    } catch (error) {
        console.error('Errore durante il caricamento dei dati:', error);
        alert('Errore durante il caricamento dei dati: ' + error.message);
    }
}

// ... existing code ...

// Applica filtri
function applicaFiltri() {
    mostraLoading(true);
    
    setTimeout(() => {
        const periodo = $('#periodo').data('daterangepicker');
        const gruppo = document.getElementById('gruppoFiltro').value;
        const tipo = document.getElementById('tipoFiltro').value;
        const categoria = document.getElementById('categoriaFiltro').value;
        const aggregazione = document.getElementById('aggregazione').value;
        
        const filtri = {
            dataInizio: periodo ? periodo.startDate.toDate() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            dataFine: periodo ? periodo.endDate.toDate() : new Date(),
            gruppo: gruppo,
            tipo: tipo,
            categoria: categoria,
            aggregazione: aggregazione
        };
        
        elaboraDati(filtri);
        mostraLoading(false);
    }, 500);
}

// ... existing code ...

// Elabora dati
function elaboraDati(filtri) {
    console.log('Elaborazione dati con filtri:', filtri);
    
    // Filtra dati
    const datiFiltrati = datiStorici.filter(record => {
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
function aggregaDati(dati, tipoAggregazione, categoriaFiltro) {
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
                studenti: 0
            };
        }
        
        // Aggrega in base alla categoria selezionata
        switch (categoriaFiltro) {
            case 'totale':
                aggregati[record.gruppo][chiavePeriodo].totale += record.valore;
                break;
            case 'membri':
                aggregati[record.gruppo][chiavePeriodo].totale += record.membri;
                break;
            case 'simpatizzanti':
                aggregati[record.gruppo][chiavePeriodo].totale += record.simpatizzanti;
                break;
            case 'ospiti':
                aggregati[record.gruppo][chiavePeriodo].totale += record.ospiti;
                break;
            case 'futuro':
                aggregati[record.gruppo][chiavePeriodo].totale += record.futuro;
                break;
            case 'studenti':
                aggregati[record.gruppo][chiavePeriodo].totale += record.studenti;
                break;
            default:
                aggregati[record.gruppo][chiavePeriodo].totale += record.valore;
        }
        
        // Mantieni anche i dettagli per categoria
        aggregati[record.gruppo][chiavePeriodo].membri += record.membri;
        aggregati[record.gruppo][chiavePeriodo].simpatizzanti += record.simpatizzanti;
        aggregati[record.gruppo][chiavePeriodo].ospiti += record.ospiti;
        aggregati[record.gruppo][chiavePeriodo].futuro += record.futuro;
        aggregati[record.gruppo][chiavePeriodo].studenti += record.studenti;
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
    
    const categoriaLabel = {
        'totale': 'Totale Gruppo',
        'membri': 'Membri',
        'simpatizzanti': 'Simpatizzanti',
        'ospiti': 'Ospiti',
        'futuro': 'Futuro',
        'studenti': 'Studenti'
    };
    
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
                    text: `Totali Mensili - ${categoriaLabel[filtri.categoria] || 'Totale'}`
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
                        text: 'Totale'
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
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (dati.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center">Nessun dato trovato</td></tr>';
        return;
    }
    
    // Ordina per data decrescente
    const datiOrdinati = dati.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    datiOrdinati.forEach((record, index) => {
        const dataFormattata = new Date(record.data).toLocaleDateString('it-IT');
        
        // Calcola variazione rispetto al record precedente dello stesso gruppo
        let variazione = '';
        if (index < datiOrdinati.length - 1) {
            const recordPrecedente = datiOrdinati.find((r, i) => 
                i > index && r.gruppo === record.gruppo && r.tipo === record.tipo && r.categoria === record.categoria
            );
            if (recordPrecedente) {
                const diff = record.valore - recordPrecedente.valore;
                if (diff > 0) {
                    variazione = `<span class="text-success">+${diff}</span>`;
                } else if (diff < 0) {
                    variazione = `<span class="text-danger">${diff}</span>`;
                } else {
                    variazione = '<span class="text-muted">0</span>';
                }
            }
        }
        
        const badgeClass = record.tipo === 'zadankai' ? 'bg-primary' : 'bg-success';
        
        const row = `
            <tr>
                <td>${dataFormattata}</td>
                <td>${record.gruppo}</td>
                <td>${record.settore}</td>
                <td>${record.capitolo}</td>
                <td><span class="badge ${badgeClass}">${record.tipo}</span></td>
                <td><span class="badge badge-categoria bg-secondary">${record.categoria}</span></td>
                <td>${record.membri}</td>
                <td>${record.simpatizzanti}</td>
                <td>${record.ospiti}</td>
                <td><strong>${record.valore}</strong></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="mostraDettagli('${record.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
        
        tbody.innerHTML += row;
    });
}

// ... existing code ...
