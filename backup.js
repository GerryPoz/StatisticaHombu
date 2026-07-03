document.addEventListener("DOMContentLoaded", () => {
  // Inizializza Firebase se non è già stato fatto
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.firestore();

  const dataTypeSelect = document.getElementById("dataType");
  const timeRangeSelect = document.getElementById("timeRange");
  const yearSelector = document.getElementById("yearSelector");
  const monthSelector = document.getElementById("monthSelector");
  const backupYearSelect = document.getElementById("backupYear");
  const backupMonthSelect = document.getElementById("backupMonth");
  const generateBackupBtn = document.getElementById("generateBackup");
  const statusMessage = document.getElementById("statusMessage");

  // Funzione per mostrare/nascondere i selettori di anno e mese
  const toggleDateSelectors = () => {
    const selectedTimeRange = timeRangeSelect.value;
    yearSelector.style.display =
      selectedTimeRange === "year" || selectedTimeRange === "month"
        ? "block"
        : "none";
    monthSelector.style.display =
      selectedTimeRange === "month" ? "block" : "none";
  };

  // Event listener per il cambio dell'intervallo di tempo
  timeRangeSelect.addEventListener("change", toggleDateSelectors);

  // Default values will be handled by dynamic population

  // Funzione per aggiornare il messaggio di stato
  const updateStatus = (message, isError = false) => {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "red" : "green";
  };

  // Funzione per popolare dinamicamente i selettori di anno e mese
  const populateDateSelectors = async () => {
    const allYears = new Set();
    const allMonths = new Set(); // YYYY-MM format

    try {
      // Fetch data from Zadankai
      const zadankaiSnapshot = await database.ref("zadankai").once("value");
      if (zadankaiSnapshot.exists()) {
        const zadankaiData = zadankaiSnapshot.val();
        for (const key in zadankaiData) {
          if (zadankaiData.hasOwnProperty(key)) {
            const parts = key.split("-");
            if (parts.length >= 2) {
              allYears.add(parts[0]);
              allMonths.add(`${parts[0]}-${parts[1]}`);
            }
          }
        }
      }

      // Fetch data from Studio Gosho
      const studioGoshoSnapshot = await database
        .ref("studio_gosho")
        .once("value");
      if (studioGoshoSnapshot.exists()) {
        const studioGoshoData = studioGoshoSnapshot.val();
        for (const key in studioGoshoData) {
          if (studioGoshoData.hasOwnProperty(key)) {
            const parts = key.split("-");
            if (parts.length >= 2) {
              allYears.add(parts[0]);
              allMonths.add(`${parts[0]}-${parts[1]}`);
            }
          }
        }
      }

      // Populate Year Select
      backupYearSelect.innerHTML = ""; // Clear existing options
      const sortedYears = Array.from(allYears).sort((a, b) => b - a); // Sort descending
      sortedYears.forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        backupYearSelect.appendChild(option);
      });

      // Populate Month Select
      backupMonthSelect.innerHTML = ""; // Clear existing options
      const sortedMonths = Array.from(allMonths).sort((a, b) => {
        // Sort YYYY-MM descending
        const [yearA, monthA] = a.split("-").map(Number);
        const [yearB, monthB] = b.split("-").map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
      });
      sortedMonths.forEach((month) => {
        const option = document.createElement("option");
        option.value = month;
        option.textContent = month;
        backupMonthSelect.appendChild(option);
      });

      // Set default selected values to the latest ones
      if (sortedYears.length > 0) {
        backupYearSelect.value = sortedYears[0];
      }
      if (sortedMonths.length > 0) {
        backupMonthSelect.value = sortedMonths[0];
      }
    } catch (error) {
      console.error(
        "Errore nel caricamento di anni e mesi disponibili:",
        error,
      );
      updateStatus("Errore nel caricamento dei filtri data.", true);
    }
  };

  // Funzione principale per generare e scaricare il backup
  generateBackupBtn.addEventListener("click", async () => {
    updateStatus("Generazione backup in corso...");
    generateBackupBtn.disabled = true;

    const selectedDataType = dataTypeSelect.value; // 'zadankai' o 'studioGosho'
    const selectedTimeRange = timeRangeSelect.value; // 'all', 'year', 'month'
    const selectedYear = backupYearSelect.value;
    const selectedMonth = backupMonthSelect.value; // Formato YYYY-MM

    let dataToBackup = [];
    let collectionName = "";

    if (selectedDataType === "zadankai") {
      collectionName = "zadankai"; // Collezione Firebase per Zadankai
    } else if (selectedDataType === "studioGosho") {
      collectionName = "studio_gosho"; // Collezione Firebase per Studio Gosho
    }

    try {
      let query = db.collection(collectionName);
      let snapshot;

      if (selectedTimeRange === "year") {
        // Per un anno specifico, supponiamo che i documenti siano nominati 'YYYY-MM-...'
        // Non c'è un filtro diretto per "anno" in Firestore su tutti i campi,
        // quindi dobbiamo recuperare tutto e filtrare lato client, oppure
        // strutturare i dati in Firebase con un campo "anno" per query più efficienti.
        // Per ora, recuperiamo tutto e filtriamo.
        // TODO: Considerare l'aggiunta di un campo 'anno' nei documenti Firebase per query più efficienti.
        snapshot = await query.get();
        snapshot.forEach((doc) => {
          const docId = doc.id; // Es: 2023-01-GruppoA
          if (docId.startsWith(selectedYear)) {
            dataToBackup.push({ id: docId, ...doc.data() });
          }
        });
      } else if (selectedTimeRange === "month") {
        // Per un mese specifico (YYYY-MM)
        snapshot = await query.get();
        snapshot.forEach((doc) => {
          const docId = doc.id; // Es: 2023-01-GruppoA
          if (docId.startsWith(selectedMonth)) {
            dataToBackup.push({ id: docId, ...doc.data() });
          }
        });
      } else {
        // 'all'
        snapshot = await query.get();
        snapshot.forEach((doc) => {
          dataToBackup.push({ id: doc.id, ...doc.data() });
        });
      }

      if (dataToBackup.length === 0) {
        updateStatus("Nessun dato trovato per i criteri selezionati.", true);
        generateBackupBtn.disabled = false;
        return;
      }

      // Elaborazione dei dati per il formato Excel
      const worksheetData = [];
      const headers = getExcelHeaders(selectedDataType);
      worksheetData.push(headers); // Aggiungi le intestazioni

      dataToBackup.forEach((docData) => {
        const parts = docData.id.split("-");
        const anno = parts[0];
        const mese = parts[1];
        const gruppo = parts[2];

        // Zadankai
        if (docData.zadankai && selectedDataType === "zadankai") {
          for (const categoria in docData.zadankai) {
            const r = docData.zadankai[categoria];
            const g = (r.G ?? ((r.GU || 0) + (r.GD || 0))) || 0;
            worksheetData.push([
              anno,
              mese,
              gruppo,
              categoria, // Sezione
              r.U || 0,
              r.D || 0,
              g,
              r.FUT || 0,
              r.STU || 0,
            ]);
          }
        }

        // Studio Gosho (Praticanti)
        if (docData.praticanti && selectedDataType === "studioGosho") {
          for (const categoria in docData.praticanti) {
            const r = docData.praticanti[categoria];
            const g = (r.G ?? ((r.GU || 0) + (r.GD || 0))) || 0;
            worksheetData.push([
              anno,
              mese,
              gruppo,
              categoria, // Sezione
              r.U || 0,
              r.D || 0,
              g,
              r.FUT || 0,
              r.STU || 0,
            ]);
          }
        }
      });

      // Genera il file Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(wb, ws, "Backup Dati");

      const fileName = `${selectedDataType}_backup_${selectedTimeRange}_${selectedYear}${selectedTimeRange === "month" ? `-${selectedMonth.split("-")[1]}` : ""}.xlsx`;
      XLSX.writeFile(wb, fileName);

      updateStatus("Backup generato e scaricato con successo!");
    } catch (error) {
      console.error("Errore durante la generazione del backup:", error);
      updateStatus(`Errore: ${error.message}`, true);
    } finally {
      generateBackupBtn.disabled = false;
    }
  });

  // Funzione per ottenere le intestazioni della tabella Excel in base al tipo di dati
  function getExcelHeaders(dataType) {
    if (dataType === "zadankai") {
      return [
        "Anno",
        "Mese",
        "Gruppo",
        "Sezione",
        "U",
        "D",
        "G",
        "Future",
        "Studenti",
      ];
    } else if (dataType === "studioGosho") {
      return [
        "Anno",
        "Mese",
        "Gruppo",
        "Sezione",
        "U",
        "D",
        "G",
        "Future",
        "Studenti",
      ];
    }
    return [];
  }

  // Inizializza i selettori al caricamento della pagina
  populateDateSelectors().then(() => {
    toggleDateSelectors(); // Assicurati che i selettori siano visibili correttamente dopo il popolamento
  });
});
