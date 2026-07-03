const fileInput = document.getElementById('fileInput');
const userEmailEl = document.getElementById('userEmail');
const statusEl = document.getElementById('status');
const metaEl = document.getElementById('meta');
const tipoSelect = document.getElementById('tipoSelect');
const annoSelect = document.getElementById('annoSelect');
const meseSelect = document.getElementById('meseSelect');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const countsEl = document.getElementById('counts');
const recordsBody = document.getElementById('recordsBody');
const logoutBtn = document.getElementById('logoutBtn');

const detailModalEl = document.getElementById('detailModal');
const detailTitleEl = document.getElementById('detailTitle');
const detailPreEl = document.getElementById('detailPre');
const copyBtn = document.getElementById('copyBtn');
const detailModal = new bootstrap.Modal(detailModalEl);

const mesiOrdine = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

let currentUser = null;
let backupPayload = null;
let flatIndex = [];

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('text-danger', isError);
  statusEl.classList.toggle('text-muted', !isError);
}

function setEnabled(enabled) {
  tipoSelect.disabled = !enabled;
  annoSelect.disabled = !enabled;
  meseSelect.disabled = !enabled;
  resetFiltersBtn.disabled = !enabled;
}

function parseKey(key) {
  const parts = String(key).split('-');
  const anno = parts[0] ?? '';
  const mese = parts[1] ?? '';
  const gruppo = parts.slice(2).join('-') ?? '';
  return { anno, mese, gruppo };
}

function buildIndex() {
  const data = backupPayload?.data ?? {};
  const allowedRoots = ['zadankai', 'studio_gosho'];
  flatIndex = [];
  for (const root of allowedRoots) {
    const node = data[root];
    if (!node || typeof node !== 'object') continue;
    for (const key of Object.keys(node)) {
      const { anno, mese, gruppo } = parseKey(key);
      flatIndex.push({ root, key, anno, mese, gruppo, value: node[key] });
    }
  }
}

function uniqueSorted(values, cmp) {
  const set = new Set(values.filter(v => v !== null && v !== undefined && String(v).trim() !== ''));
  return Array.from(set).sort(cmp);
}

function fillSelect(selectEl, values, placeholder) {
  selectEl.innerHTML = '';
  const opt = document.createElement('option');
  opt.value = '';
  opt.textContent = placeholder;
  selectEl.appendChild(opt);
  values.forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    selectEl.appendChild(o);
  });
}

function applyFilters() {
  const root = tipoSelect.value;
  const anno = annoSelect.value;
  const mese = meseSelect.value;
  const filtered = flatIndex.filter(r => {
    if (root && r.root !== root) return false;
    if (anno && String(r.anno) !== String(anno)) return false;
    if (mese && String(r.mese) !== String(mese)) return false;
    return true;
  });

  const total = flatIndex.filter(r => r.root === root).length;
  countsEl.textContent = total ? `${filtered.length} / ${total} record` : '';

  if (!filtered.length) {
    recordsBody.innerHTML = '<tr><td colspan="4" class="text-muted">Nessun record per i filtri selezionati.</td></tr>';
    return;
  }

  filtered.sort((a, b) => {
    const aAnno = Number(a.anno);
    const bAnno = Number(b.anno);
    if (!Number.isNaN(aAnno) && !Number.isNaN(bAnno) && aAnno !== bAnno) return aAnno - bAnno;
    const miA = mesiOrdine.indexOf(a.mese);
    const miB = mesiOrdine.indexOf(b.mese);
    if (miA !== miB) return miA - miB;
    return String(a.gruppo).localeCompare(String(b.gruppo));
  });

  recordsBody.innerHTML = '';
  filtered.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.anno}</td>
      <td>${r.mese}</td>
      <td>${r.gruppo}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" data-key="${encodeURIComponent(r.key)}" data-root="${r.root}">
          <i class="fas fa-eye me-1"></i>Apri
        </button>
      </td>
    `;
    recordsBody.appendChild(tr);
  });
}

function refreshFilterOptions() {
  const root = tipoSelect.value;
  const entries = flatIndex.filter(r => r.root === root);
  const anni = uniqueSorted(entries.map(e => e.anno), (a, b) => Number(a) - Number(b));
  const mesi = uniqueSorted(entries.map(e => e.mese), (a, b) => mesiOrdine.indexOf(a) - mesiOrdine.indexOf(b));
  fillSelect(annoSelect, anni, 'Tutti');
  fillSelect(meseSelect, mesi, 'Tutti');
}

function showDetail(root, key) {
  const record = flatIndex.find(r => r.root === root && r.key === key);
  if (!record) return;
  detailTitleEl.textContent = `${root.toUpperCase()} – ${record.anno} ${record.mese} – ${record.gruppo}`;
  detailPreEl.textContent = JSON.stringify(record.value ?? {}, null, 2);
  detailModal.show();
}

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setEnabled(false);
  setStatus('Lettura file…');
  metaEl.textContent = 'Caricamento…';
  countsEl.textContent = '';
  recordsBody.innerHTML = '<tr><td colspan="4" class="text-muted">Caricamento…</td></tr>';

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const hasData = parsed && typeof parsed === 'object' && 'data' in parsed;
    backupPayload = hasData ? parsed : { data: parsed };
    buildIndex();

    const exportedAt = backupPayload.exportedAt ? new Date(backupPayload.exportedAt).toLocaleString('it-IT') : '–';
    const exportedBy = backupPayload.exportedBy ?? '–';
    const roots = Object.keys(backupPayload.data ?? {});
    metaEl.textContent = `Export: ${exportedAt} • Da: ${exportedBy} • Radici: ${roots.join(', ') || '–'}`;

    tipoSelect.value = (backupPayload.data && backupPayload.data.studio_gosho) ? 'studio_gosho' : 'zadankai';
    refreshFilterOptions();
    setEnabled(true);
    setStatus('Pronto.');
    applyFilters();
  } catch (error) {
    backupPayload = null;
    flatIndex = [];
    setEnabled(false);
    metaEl.textContent = 'File non valido.';
    recordsBody.innerHTML = '<tr><td colspan="4" class="text-muted">Carica un file valido per vedere i record.</td></tr>';
    setStatus(`Errore: ${error?.message ?? error}`, true);
  }
});

tipoSelect.addEventListener('change', () => {
  refreshFilterOptions();
  applyFilters();
});
annoSelect.addEventListener('change', applyFilters);
meseSelect.addEventListener('change', applyFilters);
resetFiltersBtn.addEventListener('click', () => {
  annoSelect.value = '';
  meseSelect.value = '';
  applyFilters();
});

recordsBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-key]');
  if (!btn) return;
  const root = btn.getAttribute('data-root');
  const key = decodeURIComponent(btn.getAttribute('data-key'));
  showDetail(root, key);
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(detailPreEl.textContent || '');
    copyBtn.innerHTML = '<i class="fas fa-check me-2"></i>Copiato';
    setTimeout(() => {
      copyBtn.innerHTML = '<i class="fas fa-copy me-2"></i>Copia JSON';
    }, 900);
  } catch {
    copyBtn.innerHTML = '<i class="fas fa-triangle-exclamation me-2"></i>Non copiato';
    setTimeout(() => {
      copyBtn.innerHTML = '<i class="fas fa-copy me-2"></i>Copia JSON';
    }, 900);
  }
});

logoutBtn.addEventListener('click', async () => {
  window.location.href = 'index.html';
});

currentUser = { email: null };
userEmailEl.textContent = '–';
setStatus('Pronto. Carica un file JSON.');

