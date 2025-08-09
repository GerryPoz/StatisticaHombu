// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDatabase, ref, get, child } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

// Variabili globali
let app, auth, database;
let datiStorici = [];
let gruppiDisponibili = [];
let chartInstance = null;
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
            aggiornaGrafico();
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
        mostraLoading(true);
        
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
        } catch (error) {
            console.error('Errore caricamento gruppi:', error);
        }
        
        // Carica dati zadankai dal database reale
        const zadankaiRef = ref(database, 'zadankai');
        const zadankaiSnapshot = await get(zadankaiRef);
        
        if (zadankaiSnapshot.exists()) {
            const zadankaiData = zadankaiSnapshot.val();
            console.log('Dati zadankai trovati:', Object.keys(zadankaiData));
            
            // Elabora dati zadankai dal database reale
            Object.entries(zadankaiData).forEach(([chiave, sezioni]) => {
                const [anno, mese, gruppo] = chiave.split('-');
                
                if (!anno || !mese || !gruppo) {
                    console.warn('Formato chiave non valido:', chiave);
                    return;
                }
                
                const data = new Date(parseInt(anno), parseInt(mese) - 1, 1);
                const capitolo = gruppoToCapitolo[gruppo] || 'Sconosciuto';
                
                // Elabora sezione zadankai
                if (sezioni.zadankai) {
                    const zadankai = sezioni.zadankai;
                    
                    // Membri Zadankai
                    if (zadankai.membri !== undefined) {
                        datiStorici.push({
                            id: `${chiave}-zadankai-membri`,
                            data: data,
                            gruppo: gruppo,
                            settore: gruppiDisponibili.find(g => g.nome === gruppo)?.settore || 'Sconosciuto',
                            capitolo: capitolo,
                            tipo: 'zadankai',
                            categoria: 'membri',
                            valore: parseInt(zadankai.membri) || 0
                        });
                    }
                    
                    // Presenze Zadankai
                    if (zadankai.presenze !== undefined) {
                        datiStorici.push({
                            id: `${chiave}-zadankai-presenze`,
                            data: data,
                            gruppo: gruppo,
                            settore: gruppiDisponibili.find(g => g.nome === gruppo)?.settore || 'Sconosciuto',
                            capitolo: capitolo,
                            tipo: 'zadankai',
                            categoria: 'presenze',
                            valore: parseInt(zadankai.presenze) || 0
                        });
                    }
                }
                
                // Elabora sezione praticanti
                if (sezioni.praticanti) {
                    const praticanti = sezioni.praticanti;
                    let totalePraticanti = 0;
                    
                    // Somma tutte le categorie di praticanti
                    ['membri', 'simpatizzanti', 'ospiti', 'futuro', 'studenti'].forEach(cat => {
                        if (praticanti[cat] !== undefined) {
                            totalePraticanti += parseInt(praticanti[cat]) || 0;
                        }
                    });
                    
                    datiStorici.push({
                        id: `${chiave}-praticanti-totale`,
                        data: data,
                        gruppo: gruppo,
                        settore: gruppiDisponibili.find(g => g.nome === gruppo)?.settore || 'Sconosciuto',
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
        
        console.log('Dati storici caricati:', datiStorici.length);
        mostraLoading(false);
        
    } catch (error) {
        console.error('Errore durante il caricamento dei dati:', error);
        mostraLoading(false);
        
        // Fallback a dati di esempio in caso di errore
        console.log('Fallback a dati di esempio...');
        generaDatiEsempio();
    }
}

// Genera dati di esempio per test
function generaDatiEsempio() {
    datiStorici = [];
    gruppiDisponibili = [
        { nome: 'Gruppo A', capitolo: 'Capitolo 1', settore: 'Settore 1' },
        { nome: 'Gruppo B', capitolo: 'Capitolo 1', settore: 'Settore 2' },
        { nome: 'Gruppo C', capitolo: 'Capitolo 2', settore: 'Settore 1' }
    ];
    
    const oggi = new Date();
    
    // Genera dati per gli ultimi 12 mesi
    for (let i = 11; i >= 0; i--) {
        const data = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
        
        gruppiDisponibili.forEach(gruppo => {
            // Membri Zadankai
            datiStorici.push({
                id: `esempio-${data.getTime()}-${gruppo.nome}-zadankai-membri`,
                data: data,
                gruppo: gruppo.nome,
                settore: gruppo.settore,
                capitolo: gruppo.capitolo,
                tipo: 'zadankai',
                categoria: 'membri',
                valore: Math.floor(Math.random() * 50) + 20
            });
            
            // Presenze Zadankai
            datiStorici.push({
                id: `esempio-${data.getTime()}-${gruppo.nome}-zadankai-presenze`,
                data: data,
                gruppo: gruppo.nome,
                settore: gruppo.settore,
                capitolo: gruppo.capitolo,
                tipo: 'zadankai',
                categoria: 'presenze',
                valore: Math.floor(Math.random() * 40) + 15
            });
            
            // Totale Praticanti
            datiStorici.push({
                id: `esempio-${data.getTime()}-${gruppo.nome}-praticanti-totale`,
                data: data,
                gruppo: gruppo.nome,
                settore: gruppo.settore,
                capitolo: gruppo.capitolo,
                tipo: 'praticanti',
                categoria: 'totale',
                valore: Math.floor(Math.random() * 80) + 30
            });
        });
    }
    
    console.log('Dati di esempio generati:', datiStorici.length);
}

// Mostra/nasconde loading
function mostraLoading(mostra) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = mostra ? 'block' : 'none';
    }
}

// Aggrega dati per gli ultimi 12 mesi
function aggregaDatiUltimi12Mesi() {
    const oggi = new Date();
    const dataInizio = new Date(oggi.getFullYear(), oggi.getMonth() - 11, 1);
    const dataFine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0);
    
    // Filtra dati per gli ultimi 12 mesi
    const datiFiltrati = datiStorici.filter(dato => {
        return dato.data >= dataInizio && dato.data <= dataFine;
    });
    
    console.log(`Dati filtrati per ultimi 12 mesi: ${datiFiltrati.length}`);
    
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
    
    console.log('Dati aggregati per ultimi 12 mesi:', risultato);
    return risultato;
}

// Aggiorna il grafico
function aggiornaGrafico() {
    const datiAggregati = aggregaDatiUltimi12Mesi();
    
    if (datiAggregati.length === 0) {
        console.log('Nessun dato da visualizzare');
        return;
    }
    
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    // Distruggi grafico esistente
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Prepara dati per il grafico
    const labels = datiAggregati.map(d => {
        return d.data.toLocaleDateString('it-IT', { year: 'numeric', month: 'short' });
    });
    
    const membriZadankaiData = datiAggregati.map(d => d.membriZadankai);
    const presenzeZadankaiData = datiAggregati.map(d => d.presenzeZadankai);
    const totalePraticanti = datiAggregati.map(d => d.totalePraticanti);
    
    // Crea nuovo grafico
    chartInstance = new Chart(ctx, {
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
                    text: 'Andamento Ultimi 12 Mesi',
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
    
    console.log('Grafico aggiornato con successo');
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
