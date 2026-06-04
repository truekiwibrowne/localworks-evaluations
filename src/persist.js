// ── Intercept saveToStorage → schedule SP saves ───────────────────────────
function saveToStorage() {
  // Keep local cache as offline backup
  SP._saveToCache && SP._saveToCache();
  // Schedule saves per list (debounced)
  SP.scheduleSave('materials');
  SP.scheduleSave('products');
  SP.scheduleSave('projects');
  SP.scheduleSave('buildings');
  SP.scheduleSave('co2factors');
  SP.scheduleSave('settings');
  SP.scheduleSave('impactProjects');
}

// ── Export / Import JSON backup (kept for emergency use) ──────────────────
function exportBackup() {
  const snapshot = {
    materials, products, settings: S,
    impactProjects, impactSettings,
    exportedAt: new Date().toISOString(), version: 'lw_ecoprefab_v1'
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `localworks-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function importBackup(input) {
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const snap = JSON.parse(e.target.result);
      if (!snap.materials) { alert('Not a valid backup file.'); return; }
      if (!confirm(`Import backup from ${snap.exportedAt||'unknown'}? This replaces all current data.`)) return;
      materials = snap.materials || materials;
      products = snap.products || products;
      if (snap.settings) Object.assign(S, snap.settings);
      if (snap.impactProjects) impactProjects = snap.impactProjects;
      if (snap.impactSettings) Object.assign(impactSettings, snap.impactSettings);
      renderAll();
      alert('Backup imported. Data will sync to SharePoint on next save.');
    } catch(err) { alert('Error reading backup: ' + err.message); }
  };
  reader.readAsText(file); input.value = '';
}

function clearAllData() {
  if (!confirm('WARNING: This deletes all data from SharePoint. This cannot be undone.\n\nAre you absolutely sure?')) return;
  if (!confirm('Final confirmation — delete everything?')) return;
  materials=[]; products=[]; impactProjects=[];
  renderAll();
  alert('Data cleared and will sync to SharePoint.');
}
