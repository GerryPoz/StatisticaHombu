// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

// Variabili globali
let app, auth, database;
let datiStorici = [];
let gruppiDisponibili = [];
let chartInstance = null;
let gruppoToCapitolo = {};
let gruppoToSettore = {};

function convertiMeseInNumero(nomeMese) {
    const mesi = {
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
    
    let totale = 0;
    ['U', 'D', 'GU', 'GD'].forEach(sottoCat => {
        if (categoria[sottoCat] !== undefined) {
            totale += parseInt(categoria[sottoCat]) || 0;
        }
    });
    
    return totale;
}

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
            // Applica filtri automaticamente dopo il caricamento
            setTimeout(() => {
                applicaFiltri();
            }, 1000);
        } else {
            console.log('Utente non autenticato');
            window.location.href = 'login.html';
        }
    });
}

async function caricaDatiStorici() {
    try {
        console.log('Caricamento dati storici...');
        mostraLoading(true);
        
        // Reset array dati
        datiStorici = [];
        
        // Prima carica i gruppi per avere la mappatura gruppo->capitolo/settore
        await caricaGruppi();
        
        // Carica dati zadankai dal database reale
        const zadankaiRef = ref(database, 'zadankai');
        const zadankaiSnapshot = await get(zadankaiRef);
        
        if (zadankaiSnapshot.exists()) {
            const zadankaiData = zadankaiSnapshot.val();
            console.log('Dati zadankai trovati:', Object.keys(zadankaiData).length, 'record');
            
            // Elabora dati zadankai dal database reale
            Object.entries(zadankaiData).forEach(([chiave, sezioni]) => {
                console.log('Elaborando chiave:', chiave, 'Sezioni:', sezioni);
                const [anno, mese, gruppo] = chiave.split('-');
                
                if (!anno || !mese || !gruppo) {
                    console.warn('Formato chiave non valido:', chiave);
                    return;
                }
                
                // Converti il mese da nome a numero
                const numeroMese = convertiMeseInNumero(mese);
                const data = new Date(parseInt(anno), numeroMese - 1, 1);
                const capitolo = gruppoToCapitolo[gruppo] || 'Sconosciuto';
                const settore = gruppoToSettore[gruppo] || 'Sconosciuto';
                
                console.log('Data elaborata:', data, 'Gruppo:', gruppo, 'Capitolo:', capitolo, 'Settore:', settore);
                
                // Elabora sezione zadankai
                if (sezioni.zadankai) {
                    const zadankai = sezioni.zadankai;
                    console.log('Dati zadankai per', gruppo, ':', zadankai);
                    
                    // Membri Zadankai - somma tutte le sottocategorie
                    if (zadankai.membri) {
                        const membri = calcolaTotaleCategoria(zadankai.membri);
                        console.log('Aggiungendo membri zadankai:', membri, 'Dettaglio:', zadankai.membri);
                        datiStorici.push({
                            id: `${chiave}-zadankai-membri`,
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
                    const presenzeTotali = calcolaTotaleCategoria(zadankai.membri) + 
                                         calcolaTotaleCategoria(zadankai.simpatizzanti) + 
                                         calcolaTotaleCategoria(zadankai.ospiti);
                    
                    console.log('Aggiungendo presenze zadankai:', presenzeTotali);
                    datiStorici.push({
                        id: `${chiave}-zadankai-presenze`,
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
                    const praticanti = sezioni.praticanti;
                    console.log('Dati praticanti per', gruppo, ':', praticanti);
                    
                    // Calcola totale praticanti sommando membri e simpatizzanti
                    const totalePraticanti = calcolaTotaleCategoria(praticanti.membri) + 
                                            calcolaTotaleCategoria(praticanti.simpatizzanti);
                    
                    console.log('Totale praticanti calcolato:', totalePraticanti, 
                              'Membri:', calcolaTotaleCategoria(praticanti.membri),
                              'Simpatizzanti:', calcolaTotaleCategoria(praticanti.simpatizzanti));
                    
                    datiStorici.push({
                        id: `${chiave}-praticanti-totale`,
                        data: data,
                        gruppo: gruppo,
                        settore: settore,
                        capitolo: capitolo,
                        tipo: 'praticanti',
                        categoria: 'totale',
                        valore: totalePraticanti
                    });
                }
            });
        }
        
        // Se non ci sono dati reali, genera dati di esempio
        if (datiStorici.length === 0) {
            console.log('Nessun dato reale trovato, generazione dati di esempio...');
            generaDatiEsempio();
        }
        
        console.log('Dati storici caricati totali:', datiStorici.length);
        console.log('Primi 5 dati:', datiStorici.slice(0, 5));
        mostraLoading(false);
        
    } catch (error) {
        console.error('Errore durante il caricamento dei dati:', error);
        mostraLoading(false);
        // Fallback ai dati di esempio in caso di errore
        generaDatiEsempio();
    }
}

// Carica gruppi da file JSON
async function caricaGruppi() {
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
                        gruppoToSettore[gruppo] = settore;
                    });
                });
            });
        }
        
        console.log('Gruppi caricati:', gruppiDisponibili.length);
    } catch (error) {
        console.error('Errore caricamento gruppi:', error);
        // Crea struttura di esempio se il file non esiste
        gruppiDisponibili = [
            { nome: 'Gruppo A', capitolo: 'Capitolo 1', settore: 'Settore 1' },
            { nome: 'Gruppo B', capitolo: 'Capitolo 1', settore: 'Settore 2' },
            { nome: 'Gruppo C', capitolo: 'Capitolo 2', settore: 'Settore 1' }
        ];
        
        gruppiDisponibili.forEach(g => {
            gruppoToCapitolo[g.nome] = g.capitolo;
            gruppoToSettore[g.nome] = g.settore;
        });
    }
}

// Genera dati di esempio per test
function generaDatiEsempio() {
    console.log('Generazione dati di esempio...');
    datiStorici = [];
    
    const oggi = new Date();
    
    // Genera dati per gli ultimi 12 mesi
    for (let i = 11; i >= 0; i--) {
        const data = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
        
        gruppiDisponibili.forEach(gruppo => {
            // Membri Zadankai
            const membriValue = Math.floor(Math.random() * 50) + 20;
            datiStorici.push({
                id: `esempio-${data.getTime()}-${gruppo.nome}-zadankai-membri`,
                data: data,
                gruppo: gruppo.nome,
                settore: gruppo.settore,
                capitolo: gruppo.capitolo,
                tipo: 'zadankai',
                categoria: 'membri',
                valore: membriValue
            });
            
            // Presenze Zadankai
            const presenzeValue = Math.floor(Math.random() * 40) + 15;
            datiStorici.push({
                id: `esempio-${data.getTime()}-${gruppo.nome}-zadankai-presenze`,
                data: data,
                gruppo: gruppo.nome,
                settore: gruppo.settore,
                capitolo: gruppo.capitolo,
                tipo: 'zadankai',
                categoria: 'presenze',
                valore: presenzeValue
            });
            
            // Totale Praticanti
            const praticanti = Math.floor(Math.random() * 80) + 30;
            datiStorici.push({
                id: `esempio-${data.getTime()}-${gruppo.nome}-praticanti-totale`,
                data: data,
                gruppo: gruppo.nome,
                settore: gruppo.settore,
                capitolo: gruppo.capitolo,
                tipo: 'praticanti',
                categoria: 'totale',
                valore: praticanti
            });
        });
    }
    
    console.log('Dati di esempio generati:', datiStorici.length);
}

// Inizializza i filtri
function inizializzaFiltri() {
    // Popola filtro capitoli
    const capitoli = [...new Set(gruppiDisponibili.map(g => g.capitolo))].sort();
    const capitoloSelect = document.getElementById('capitoloFiltro');
    if (capitoloSelect) {
        capitoloSelect.innerHTML = '<option value="tutti">Tutti i capitoli</option>';
        capitoli.forEach(capitolo => {
            const option = document.createElement('option');
            option.value = capitolo;
            option.textContent = capitolo;
            capitoloSelect.appendChild(option);
        });
    }
    
    // Popola filtro settori
    const settori = [...new Set(gruppiDisponibili.map(g => g.settore))].sort();
    const settoreSelect = document.getElementById('settoreFiltro');
    if (settoreSelect) {
        settoreSelect.innerHTML = '<option value="tutti">Tutti i settori</option>';
        settori.forEach(settore => {
            const option = document.createElement('option');
            option.value = settore;
            option.textContent = settore;
            settoreSelect.appendChild(option);
        });
    }
    
    // Popola filtro gruppi
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
    
    // Aggiungi event listeners per filtri dipendenti
    if (capitoloSelect) capitoloSelect.addEventListener('change', aggiornaSottofiltri);
    if (settoreSelect) settoreSelect.addEventListener('change', aggiornaSottofiltri);
}

// Aggiorna sottofiltri in base alla selezione
function aggiornaSottofiltri() {
    const capitoloSelezionato = document.getElementById('capitoloFiltro')?.value || 'tutti';
    const settoreSelezionato = document.getElementById('settoreFiltro')?.value || 'tutti';
    
    // Filtra gruppi disponibili
    let gruppiFiltrati = gruppiDisponibili;
    
    if (capitoloSelezionato !== 'tutti') {
        gruppiFiltrati = gruppiFiltrati.filter(g => g.capitolo === capitoloSelezionato);
    }
    
    if (settoreSelezionato !== 'tutti') {
        gruppiFiltrati = gruppiFiltrati.filter(g => g.settore === settoreSelezionato);
    }
    
    // Aggiorna filtro settori se capitolo è selezionato
    if (capitoloSelezionato !== 'tutti') {
        const settoriDisponibili = [...new Set(gruppiFiltrati.map(g => g.settore))].sort();
        const settoreSelect = document.getElementById('settoreFiltro');
        if (settoreSelect) {
            const valoreCorrente = settoreSelect.value;
            
            settoreSelect.innerHTML = '<option value="tutti">Tutti i settori</option>';
            settoriDisponibili.forEach(settore => {
                const option = document.createElement('option');
                option.value = settore;
                option.textContent = settore;
                if (settore === valoreCorrente) option.selected = true;
                settoreSelect.appendChild(option);
            });
        }
    }
    
    // Aggiorna filtro gruppi
    const gruppoSelect = document.getElementById('gruppoFiltro');
    if (gruppoSelect) {
        const valoreCorrente = gruppoSelect.value;
        
        gruppoSelect.innerHTML = '<option value="tutti">Tutti i gruppi</option>';
        gruppiFiltrati.forEach(gruppo => {
            const option = document.createElement('option');
            option.value = gruppo.nome;
            option.textContent = gruppo.nome;
            if (gruppo.nome === valoreCorrente) option.selected = true;
            gruppoSelect.appendChild(option);
        });
    }
}

// Mostra/nasconde loading
function mostraLoading(mostra) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = mostra ? 'block' : 'none';
    }
}

// Applica filtri e aggiorna grafico
function applicaFiltri() {
    const capitolo = document.getElementById('capitoloFiltro')?.value || 'tutti';
    const settore = document.getElementById('settoreFiltro')?.value || 'tutti';
    const gruppo = document.getElementById('gruppoFiltro')?.value || 'tutti';
    
    console.log('Applicazione filtri:', { capitolo, settore, gruppo });
    console.log('Dati storici disponibili:', datiStorici.length);
    
    const datiAggregati = aggregaDatiUltimi12Mesi(capitolo, settore, gruppo);
    console.log('Dati aggregati ottenuti:', datiAggregati.length);
    
    aggiornaGrafico(datiAggregati, { capitolo, settore, gruppo });
}

// Aggrega dati per gli ultimi 12 mesi con filtri
function aggregaDatiUltimi12Mesi(capitolo = 'tutti', settore = 'tutti', gruppo = 'tutti') {
    const oggi = new Date();
    const dataInizio = new Date(oggi.getFullYear(), oggi.getMonth() - 11, 1);
    const dataFine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0);
    
    console.log('Periodo filtro:', dataInizio, 'a', dataFine);
    
    // Filtra dati per periodo e filtri selezionati
    let datiFiltrati = datiStorici.filter(dato => {
        const dentroPerido = dato.data >= dataInizio && dato.data <= dataFine;
        const matchCapitolo = capitolo === 'tutti' || dato.capitolo === capitolo;
        const matchSettore = settore === 'tutti' || dato.settore === settore;
        const matchGruppo = gruppo === 'tutti' || dato.gruppo === gruppo;
        
        return dentroPerido && matchCapitolo && matchSettore && matchGruppo;
    });
    
    console.log(`Dati filtrati: ${datiFiltrati.length} su ${datiStorici.length}`);
    
    // Aggrega per mese
    const aggregati = {};
    
    datiFiltrati.forEach(dato => {
        const chiaveMese = `${dato.data.getFullYear()}-${String(dato.data.getMonth() + 1).padStart(2, '0')}`;
        
        if (!aggregati[chiaveMese]) {
            aggregati[chiaveMese] = {
                data: new Date(dato.data.getFullYear(), dato.data.getMonth(), 1),
                membriZadankai: 0,
                presenzeZadankai: 0,
                totalePraticanti: 0
            };
        }
        
        if (dato.tipo === 'zadankai' && dato.categoria === 'membri') {
            aggregati[chiaveMese].membriZadankai += dato.valore;
        } else if (dato.tipo === 'zadankai' && dato.categoria === 'presenze') {
            aggregati[chiaveMese].presenzeZadankai += dato.valore;
        } else if (dato.tipo === 'praticanti' && dato.categoria === 'totale') {
            aggregati[chiaveMese].totalePraticanti += dato.valore;
        }
    });
    
    // Converti in array ordinato
    const risultato = Object.values(aggregati).sort((a, b) => a.data - b.data);
    
    console.log('Dati aggregati finali:', risultato.length, 'mesi');
    console.log('Dettaglio aggregati:', risultato);
    return risultato;
}

// Aggiorna il grafico
function aggiornaGrafico(datiAggregati, filtri) {
    console.log('Aggiornamento grafico con', datiAggregati.length, 'punti dati');
    
    const ctx = document.getElementById('mainChart');
    if (!ctx) {
        console.error('Elemento canvas mainChart non trovato!');
        return;
    }
    
    // Distruggi grafico esistente
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    if (datiAggregati.length === 0) {
        console.log('Nessun dato da visualizzare - mostro messaggio');
        
        // Mostra messaggio di nessun dato
        const container = ctx.parentElement;
        container.innerHTML = `
            <h5 id="titoloGrafico"><i class="fas fa-chart-line me-2"></i>Andamento Ultimi 12 Mesi - Nessun Dato</h5>
            <div class="text-center p-5">
                <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                <p class="text-muted">Nessun dato disponibile per i filtri selezionati</p>
            </div>
            <canvas id="mainChart" width="400" height="300"></canvas>
        `;
        return;
    }
    
    // Prepara dati per il grafico
    const labels = datiAggregati.map(d => {
        return d.data.toLocaleDateString('it-IT', { year: 'numeric', month: 'short' });
    });
    
    const membriZadankaiData = datiAggregati.map(d => d.membriZadankai);
    const presenzeZadankaiData = datiAggregati.map(d => d.presenzeZadankai);
    const totalePraticanti = datiAggregati.map(d => d.totalePraticanti);
    
    console.log('Labels:', labels);
    console.log('Membri Zadankai:', membriZadankaiData);
    console.log('Presenze Zadankai:', presenzeZadankaiData);
    console.log('Totale Praticanti:', totalePraticanti);
    
    // Aggiorna titolo grafico
    let titoloFiltro = 'Tutti';
    if (filtri.gruppo !== 'tutti') {
        titoloFiltro = filtri.gruppo;
    } else if (filtri.settore !== 'tutti') {
        titoloFiltro = filtri.settore;
    } else if (filtri.capitolo !== 'tutti') {
        titoloFiltro = filtri.capitolo;
    }
    
    const titoloElement = document.getElementById('titoloGrafico');
    if (titoloElement) {
        titoloElement.innerHTML = `<i class="fas fa-chart-line me-2"></i>Andamento Ultimi 12 Mesi - ${titoloFiltro}`;
    }
    
    // Crea nuovo grafico
    try {
        chartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Membri Zadankai',
                        data: membriZadankaiData,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Presenze Zadankai',
                        data: presenzeZadankaiData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Totale Praticanti',
                        data: totalePraticanti,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Andamento ${titoloFiltro}`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
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
                            text: 'Numero'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Mese'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
        aggiornaRisultatiTestuali(datiAggregati, filtri);
        console.log('Grafico e risultati testuali aggiornati con successo!');
    } catch (error) {
        console.error('Errore nella creazione del grafico:', error);
    }
}

function aggiornaRisultatiTestuali(datiAggregati, filtri) {
    const risultatiDiv = document.getElementById('risultatiTestuali');
    
    if (!datiAggregati || datiAggregati.length === 0) {
        risultatiDiv.innerHTML = '<p class="text-muted">Nessun dato disponibile per i filtri selezionati.</p>';
        return;
    }
    
    let html = '';
    
    // Dettaglio per ogni mese
    datiAggregati.forEach(dato => {
        const dataFormatted = dato.data.toLocaleDateString('it-IT', { 
            year: 'numeric', 
            month: 'long' 
        });
        
        html += `
            <div class="month-result">
                <div class="month-title">📅 ${dataFormatted}</div>
                <div class="metric">👥 Membri Zadankai: <span class="metric-value">${dato.membriZadankai}</span></div>
                <div class="metric">✋ Presenze Zadankai: <span class="metric-value">${dato.presenzeZadankai}</span></div>
                <div class="metric">🏛️ Totale Praticanti: <span class="metric-value">${dato.totalePraticanti}</span></div>
            </div>
        `;
    });
    
    // Informazioni sui filtri applicati
    const filtroInfo = [];
    if (filtri.capitolo !== 'tutti') filtroInfo.push(`Capitolo: ${filtri.capitolo}`);
    if (filtri.settore !== 'tutti') filtroInfo.push(`Settore: ${filtri.settore}`);
    if (filtri.gruppo !== 'tutti') filtroInfo.push(`Gruppo: ${filtri.gruppo}`);
    
    if (filtroInfo.length > 0) {
        html += `
            <div class="month-result" style="background: #fff3e0; border-left: 4px solid #f57c00;">
                <div class="month-title">🔍 Filtri Applicati</div>
                <div style="color: #f57c00;">${filtroInfo.join(' • ')}</div>
            </div>
        `;
    }
    
    risultatiDiv.innerHTML = html;
}

// Logout
function logout() {
    signOut(auth).then(() => {
        console.log('Logout effettuato');
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Errore durante il logout:', error);
        alert('Errore durante il logout');
    });
}

// Esporta funzioni globali
window.logout = logout;
window.applicaFiltri = applicaFiltri;
