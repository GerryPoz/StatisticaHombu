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
        // Carica struttura gruppi
        const gruppiResponse = await fetch('gruppi.json');
        const gruppiData = await gruppiResponse.json();
        const struttura = gruppiData["HOMBU 9"];
        
        // Mappa gruppo -> capitolo
        gruppiDisponibili = [];
        for (const [capitolo, settori] of Object.entries(struttura)) {
            for (const [settore, gruppi] of Object.entries(settori)) {
                gruppi.forEach(gruppo => {
                    gruppoToCapitolo[gruppo] = { capitolo, settore };
                    gruppiDisponibili.push({
                        nome: gruppo,
                        capitolo: capitolo,
                        settore: settore
                    });
                });
            }
        }
        
        // Carica dati zadankai da Firebase
        const snapshot = await get(child(ref(database), "zadankai"));
        
        if (snapshot.exists()) {
            const dati = snapshot.val();
            datiStorici = [];
            
            // Elabora i dati da Firebase
            for (const key in dati) {
                const [anno, mese, gruppo] = key.split("-");
                const sezioni = dati[key];
                
                // Crea una data dal mese e anno
                const mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                                   "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
                const meseIndex = mesiOrdine.indexOf(mese);
                const data = new Date(parseInt(anno), meseIndex, 1);
                
                // Calcola totali per zadankai
                if (sezioni.zadankai) {
                    let totaleZadankai = 0;
                    for (const categoria in sezioni.zadankai) {
                        const r = sezioni.zadankai[categoria];
                        const totaleCategoria = (r.U || 0) + (r.D || 0) + (r.GU || 0) + (r.GD || 0) + (r.FUT || 0) + (r.STU || 0);
                        totaleZadankai += totaleCategoria;
                    }
                    
                    datiStorici.push({
                        id: `${key}_zadankai`,
                        data: data,
                        gruppo: gruppo,
                        settore: gruppoToCapitolo[gruppo]?.settore || 'N/A',
                        capitolo: gruppoToCapitolo[gruppo]?.capitolo || 'N/A',
                        valore: totaleZadankai,
                        tipo: 'zadankai',
                        dettagli: sezioni.zadankai,
                        anno: anno,
                        mese: mese
                    });
                }
                
                // Calcola totali per praticanti
                if (sezioni.praticanti) {
                    let totalePraticanti = 0;
                    for (const categoria in sezioni.praticanti) {
                        const r = sezioni.praticanti[categoria];
                        const totaleCategoria = (r.U || 0) + (r.D || 0) + (r.GU || 0) + (r.GD || 0);
                        totalePraticanti += totaleCategoria;
                    }
                    
                    datiStorici.push({
                        id: `${key}_praticanti`,
                        data: data,
                        gruppo: gruppo,
                        settore: gruppoToCapitolo[gruppo]?.settore || 'N/A',
                        capitolo: gruppoToCapitolo[gruppo]?.capitolo || 'N/A',
                        valore: totalePraticanti,
                        tipo: 'praticanti',
                        dettagli: sezioni.praticanti,
                        anno: anno,
                        mese: mese
                    });
                }
            }
        } else {
            console.log('Nessun dato trovato in Firebase');
            datiStorici = [];
        }
        
    } catch (error) {
        console.error('Errore caricamento dati:', error);
        // Fallback ai dati di esempio se Firebase non è disponibile
        generaDatiEsempio();
    }
}

// ... existing code ...

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
    
    // Aggiungi filtro per tipo di dato
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

// ... existing code ...

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

// ... existing code ...

// Aggiorna dashboard
function aggiornaDashboard(datiAggregati, filtri, datiFiltrati) {
    const statsCards = document.getElementById('statsCards');
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

// ... existing code ...

// Aggiorna tabella
function aggiornaTabella(dati) {
    const tbody = document.getElementById('storicoTableBody');
    tbody.innerHTML = '';
    
    // Ordina per data decrescente
    const datiOrdinati = dati.sort((a, b) => b.data - a.data).slice(0, 100); // Limita a 100 righe
    
    datiOrdinati.forEach((dato, index) => {
        const row = document.createElement('tr');
        
        // Calcola variazione rispetto al record precedente dello stesso gruppo e tipo
        let variazione = '';
        const precedente = datiOrdinati.find((d, i) => 
            i > index && d.gruppo === dato.gruppo && d.tipo === dato.tipo
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
        
        row.innerHTML = `
            <td>${dato.data.toLocaleDateString('it-IT')}</td>
            <td>${dato.gruppo}</td>
            <td>${dato.settore}</td>
            <td>${dato.capitolo}</td>
            <td>
                <span class="badge bg-${dato.tipo === 'zadankai' ? 'primary' : 'secondary'}">
                    ${dato.tipo.toUpperCase()}
                </span>
                ${dato.valore}
            </td>
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

// Mostra dettagli di un record
function mostraDettagli(id) {
    const dato = datiStorici.find(d => d.id === id);
    if (!dato) return;
    
    let dettagliHtml = `
        <h5>${dato.gruppo} - ${dato.mese} ${dato.anno}</h5>
        <p><strong>Tipo:</strong> ${dato.tipo.toUpperCase()}</p>
        <p><strong>Totale:</strong> ${dato.valore}</p>
        <hr>
        <h6>Dettagli:</h6>
    `;
    
    for (const [categoria, valori] of Object.entries(dato.dettagli)) {
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

// ... existing code ...

// Funzioni di esportazione aggiornate
function esportaCSV() {
    let csv = 'Data,Gruppo,Settore,Capitolo,Tipo,Valore,Anno,Mese\n';
    
    datiStorici.forEach(dato => {
        csv += `${dato.data.toLocaleDateString('it-IT')},"${dato.gruppo}","${dato.settore}","${dato.capitolo}","${dato.tipo}",${dato.valore},"${dato.anno}","${dato.mese}"\n`;
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
        Settore: dato.settore,
        Capitolo: dato.capitolo,
        Tipo: dato.tipo.toUpperCase(),
        Valore: dato.valore,
        Anno: dato.anno,
        Mese: dato.mese
    }));
    
    const ws = XLSX.utils.json_to_sheet(dati);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Storico');
    XLSX.writeFile(wb, `storico_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ... existing code ...

// Esponi funzioni globali
window.esportaCSV = esportaCSV;
window.esportaExcel = esportaExcel;
window.esportaPDF = esportaPDF;
window.logout = logout;
window.mostraDettagli = mostraDettagli;
