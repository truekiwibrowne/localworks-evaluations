// ═══════════════════════════════════════════════════════════════════════
// SHAREPOINT INTEGRATION — MSAL auth + Graph API read/write
// ═══════════════════════════════════════════════════════════════════════
const SP = (() => {
  // ── Configuration ────────────────────────────────────────────────────────
  const CLIENT_ID   = 'f9eaf739-0337-4ea5-b95f-e1f6eccb5621';
  const TENANT_ID   = '2c89247d-e557-4d55-acaf-a9e3d9a83323';
  const SITE_URL    = 'https://localworksuga.sharepoint.com/sites/LocalworksProjectEvaluation';
  const GRAPH       = 'https://graph.microsoft.com/v1.0';
  const CACHE_KEY   = 'lw_sp_cache_v1';
  const SCOPES      = ['Sites.ReadWrite.All','User.Read','offline_access'];

  // SharePoint list names → internal keys
  const LISTS = {
    materials:      'LW_Materials',
    products:       'LW_Products',
    projects:       'LW_Projects',
    buildings:      'LW_Buildings',
    co2factors:     'LW_CO2Factors',
    settings:       'LW_Settings',
    impactProjects: 'LW_ImpactProjects',
  };

  let msalApp = null;
  let account  = null;
  let siteId   = null;          // resolved on first auth
  let listIds  = {};            // {listName: spListId}
  let _token   = null;
  let _saveQueue = {};          // debounced save queue per list
  let _online  = true;

  // ── MSAL bootstrap ───────────────────────────────────────────────────────
  function demoMode() {
    _online = false;
    document.getElementById('sp-overlay')?.classList.add('hidden');
    setSyncStatus('offline', 'Demo mode');
    renderAll();
  }

  function init() {
    // Auto-engage demo mode when running from the local filesystem
    if (location.protocol === 'file:' || new URLSearchParams(location.search).get('demo') === '1') {
      demoMode();
      return;
    }

    // Gracefully handle missing MSAL (CDN blocked, offline, etc.)
    if (typeof msal === 'undefined') {
      _showError('Microsoft Sign-In library failed to load. Check your internet connection, or open with ?demo=1 to preview with seed data.');
      return;
    }

    msalApp = new msal.PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.href.split('?')[0].split('#')[0],
      },
      cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false },
    });

    // Handle redirect after login
    msalApp.handleRedirectPromise().then(resp => {
      if (resp && resp.account) {
        account = resp.account;
        _afterSignIn();
      } else {
        // Check for existing session
        const accounts = msalApp.getAllAccounts();
        if (accounts.length > 0) {
          account = accounts[0];
          _afterSignIn();
        } else {
          // Show overlay — user must sign in
          setSyncStatus('offline', 'Sign in required');
        }
      }
    }).catch(err => {
      let msg = err.message || String(err);
      if (msg.includes('700016') || msg.includes('not found in the directory')) {
        msg = 'Sign-in error: Your Microsoft account is from a different organisation than where this app is registered. ' +
              'Please sign in with your LOCALWORKS.UG account (caleb@localworks.ug), or ask your IT admin to grant consent for your organisation. ' +
              'Technical: ' + msg;
      }
      _showError(msg);
    });
  }

  function signIn() {
    msalApp.loginRedirect({ scopes: SCOPES });
  }

  function signOut() {
    if (!confirm('Sign out of Localworks?')) return;
    msalApp.logoutRedirect({ account });
  }

  function showUserMenu() {
    if (!account) return;
    const menu = [
      `Signed in as: ${account.name || account.username}`,
      '',
      'Sign out'
    ].join('\n');
    if (window.confirm(menu.replace('Sign out', 'Click OK to sign out'))) signOut();
  }

  async function _afterSignIn() {
    document.getElementById('sp-overlay')?.classList.add('hidden');
    const unEl = document.getElementById('user-name');
    if (unEl) unEl.textContent = (account.name || account.username || '').split(' ')[0];
    setSyncStatus('syncing', 'Loading…');
    const ldEl = document.getElementById('sp-loading');
    if (ldEl) ldEl.style.display = 'block';
    try {
      await _resolveSiteId();
      await _resolveListIds();
      await loadFromSharePoint();
      setSyncStatus('synced', 'Synced');
    } catch(e) {
      console.error('SP load error:', e);
      setSyncStatus('error', 'Load error');
      _showError('Could not load from SharePoint: ' + e.message + '. Loading from local cache.');
      _loadFromCache();
      renderAll();
    }
    const ldEl2 = document.getElementById('sp-loading');
    if (ldEl2) ldEl2.style.display = 'none';
  }

  // ── Token acquisition ─────────────────────────────────────────────────
  async function getToken() {
    try {
      const res = await msalApp.acquireTokenSilent({ scopes: SCOPES, account });
      _token = res.accessToken;
      _online = true;
      return _token;
    } catch(e) {
      // Silent failed — try interactive
      try {
        const res = await msalApp.acquireTokenPopup({ scopes: SCOPES });
        _token = res.accessToken;
        account = res.account;
        return _token;
      } catch(e2) {
        _online = false;
        setSyncStatus('offline', 'Offline');
        throw e2;
      }
    }
  }

  // ── Graph API helpers ─────────────────────────────────────────────────
  async function gGet(url) {
    const token = await getToken();
    const res = await fetch(GRAPH + url, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(`Graph GET ${url} → ${res.status} ${await res.text()}`);
    return res.json();
  }

  async function gPost(url, body) {
    const token = await getToken();
    const res = await fetch(GRAPH + url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Graph POST ${url} → ${res.status} ${await res.text()}`);
    return res.json();
  }

  async function gPatch(url, body) {
    const token = await getToken();
    const res = await fetch(GRAPH + url, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Graph PATCH ${url} → ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }

  async function gDelete(url) {
    const token = await getToken();
    const res = await fetch(GRAPH + url, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error(`Graph DELETE ${url} → ${res.status}`);
  }

  // Fetch all pages of a list (handles >100 items via @odata.nextLink)
  async function getAllItems(listName, select) {
    const lid = listIds[listName];
    if (!lid) throw new Error(`List ID not found for ${listName}`);
    let url = `/sites/${siteId}/lists/${lid}/items?expand=fields&$top=999`;
    if (select) url += `&$select=${select}`;
    let items = [];
    while (url) {
      const data = await gGet(url.startsWith('/') ? url : url.replace(GRAPH,''));
      items = items.concat(data.value || []);
      url = data['@odata.nextLink'] ? data['@odata.nextLink'].replace(GRAPH,'') : null;
    }
    return items.map(i => i.fields);
  }

  // ── Site + List resolution ────────────────────────────────────────────
  async function _resolveSiteId() {
    if (siteId) return;
    // Extract hostname and path from SITE_URL
    const u = new URL(SITE_URL);
    const host = u.hostname;
    const path = u.pathname.split('?')[0];
    const data = await gGet(`/sites/${host}:${path}`);
    siteId = data.id;
    console.log('SharePoint site ID:', siteId);
  }

  async function _resolveListIds() {
    const data = await gGet(`/sites/${siteId}/lists?$select=id,name&$top=100`);
    const spLists = data.value || [];
    Object.entries(LISTS).forEach(([key, spName]) => {
      const found = spLists.find(l => l.name === spName);
      if (found) { listIds[key] = found.id; }
      else { console.warn(`SharePoint list not found: ${spName}`); }
    });
  }

  // ── LOAD from SharePoint ──────────────────────────────────────────────
  async function loadFromSharePoint() {
    setSyncStatus('syncing', 'Loading…');

    // Fetch all lists in parallel
    const [spMats, spProds, spProjs, spBldgs, spCO2, spSettings, spImpact] = await Promise.all([
      getAllItems('materials').catch(()=>[]),
      getAllItems('products').catch(()=>[]),
      getAllItems('projects').catch(()=>[]),
      getAllItems('buildings').catch(()=>[]),
      getAllItems('co2factors').catch(()=>[]),
      getAllItems('settings').catch(()=>[]),
      getAllItems('impactProjects').catch(()=>[]),
    ]);

    // ── Map SharePoint fields → app data structures ──────────────────────

    // Materials
    if (spMats.length > 0) {
      materials = spMats.map(f => ({
        _spId: f.id,  // SharePoint item ID for updates
        id: f.mat_id || f.id,
        name: f.Title || f.mat_name || '',
        cat: f.mat_cat||'', sec: f.mat_sec||'', stg: f.mat_stg||'',
        sup: f.mat_sup||'', unit: f.mat_unit||'',
        qty: Number(f.mat_qty)||0, up: Number(f.mat_up)||0, tot: Number(f.mat_tot)||0,
        pc: f.mat_pc||'', bld: f.mat_bld||'All', div: f.mat_div||'EcoPrefab',
        dt: f.mat_dt||'', lab: f.mat_lab===true||f.mat_lab==='true',
        co2key: f.mat_co2key||'',
        co2custom: f.mat_co2custom?Number(f.mat_co2custom):null,
        transport_id: f.mat_transport_id||'',
        lc_stage: f.mat_lc_stage||'A1-A3',
      }));
    }

    // Products
    if (spProds.length > 0) {
      products = spProds.map(f => ({
        _spId: f.id,
        id: f.prod_id || f.id,
        name: f.Title || f.prod_name || '',
        desc: f.prod_desc||'', unit: f.prod_unit||'',
        qty: Number(f.prod_qty)||0, stg: f.prod_stg||'',
        starred: f.prod_starred===true||f.prod_starred==='true',
        ings: _parseJSON(f.prod_ings, []),
        labs: _parseJSON(f.prod_labs, []),
      }));
    }

    // Projects → S.projects
    if (spProjs.length > 0) {
      S.projects = {};
      spProjs.forEach(f => {
        const key = f.proj_key || f.Title;
        if (key) S.projects[key] = {
          _spId: f.id, label: f.Title||f.proj_label||key,
          pc: f.proj_pc||'', desc: f.proj_desc||'', div: f.proj_div||'EcoPrefab'
        };
      });
    }

    // Buildings → S.bldgs
    if (spBldgs.length > 0) {
      S.bldgs = {};
      spBldgs.forEach(f => {
        const key = f.Title || f.bld_key;
        if (key) S.bldgs[key] = {
          _spId: f.id, area: Number(f.bld_area)||0,
          desc: f.bld_desc||'', div: f.bld_div||'EcoPrefab'
        };
      });
    }

    // CO2 factors → S.co2
    if (spCO2.length > 0) {
      S.co2 = {};
      spCO2.forEach(f => {
        const key = f.co2_key || f.Title;
        if (key) S.co2[key] = {
          _spId: f.id, label: f.Title||f.co2_label||key,
          v: Number(f.co2_v)||0, unit: f.co2_unit||'',
          desc: f.co2_desc||'',
          ...(f.co2_seq ? {seq: Number(f.co2_seq)} : {})
        };
      });
    }

    // Settings (key/value rows)
    if (spSettings.length > 0) {
      spSettings.forEach(f => {
        const key = f.Title || f.setting_key;
        const val = _parseJSON(f.setting_value, null);
        if (!key || val === null) return;
        switch(key) {
          case 'sections':      if(Array.isArray(val)) S.sections=val; break;
          case 'stages':        if(Array.isArray(val)) S.stages=val; break;
          case 'unitOptions':   if(Array.isArray(val)) S.unitOptions=val; break;
          case 'unitWeights':   if(Array.isArray(val)) S.unitWeights=val; break;
          case 'seedSchool':    if(typeof val==='object') S.seedSchool={...S.seedSchool,...val}; break;
          case 'currency':      S.currency=val; break;
          case 'rate':          S.rate=Number(val)||S.rate; break;
          case 'impactSettings': Object.assign(impactSettings,val); break;
          case 'impactCostSections': impactCostSections=val; break;
        }
      });
    }

    // Impact projects
    if (spImpact.length > 0) {
      impactProjects = spImpact.map(f => ({
        _spId: f.id,
        id: Number(f.imp_id)||f.id,
        name: f.Title||f.imp_name||'',
        code: f.imp_code||'', location: f.imp_location||'',
        status: f.imp_status||'In Progress',
        building_type: f.imp_building_type||'Classroom',
        start_date: f.imp_start_date||'', end_date: f.imp_end_date||'',
        completion_pct: Number(f.imp_completion_pct)||0,
        tracker_pc: f.imp_tracker_pc||'',
        num_buildings: Number(f.imp_num_buildings)||0,
        floor_area_sqm: Number(f.imp_floor_area_sqm)||0,
        num_classrooms: Number(f.imp_num_classrooms)||0,
        num_students: Number(f.imp_num_students)||0,
        contract_value_ugx: Number(f.imp_contract_value_ugx)||0,
        cost_sections: _parseJSON(f.imp_cost_sections, {}),
        timber_kg: Number(f.imp_timber_kg)||0,
        lime_kg: Number(f.imp_lime_kg)||0,
        sawdust_kg: Number(f.imp_sawdust_kg)||0,
        steel_kg: Number(f.imp_steel_kg)||0,
        cement_kg: Number(f.imp_cement_kg)||0,
        co2_saved_tonnes: Number(f.imp_co2_saved_tonnes)||0,
        conventional_co2_equiv: Number(f.imp_conventional_co2_equiv)||0,
        trees_planted: Number(f.imp_trees_planted)||0,
        water_harvested_litres: Number(f.imp_water_harvested_litres)||0,
        jobs_direct: Number(f.imp_jobs_direct)||0,
        jobs_indirect: Number(f.imp_jobs_indirect)||0,
        local_workers_pct: Number(f.imp_local_workers_pct)||0,
        female_workers: Number(f.imp_female_workers)||0,
        trainees: Number(f.imp_trainees)||0,
        foresters_income_ugx: Number(f.imp_foresters_income_ugx)||0,
        lime_supplier_income_ugx: Number(f.imp_lime_supplier_income_ugx)||0,
        notes: f.imp_notes||'',
      }));
    }

    // Cache locally for offline fallback
    _saveToCache();
    setSyncStatus('synced', 'Synced');
    renderAll();
  }

  // ── SAVE to SharePoint — debounced per list ───────────────────────────
  // Called from renderAll(). Queues a save, debounces 1.5s to batch edits.
  function scheduleSave(listKey) {
    clearTimeout(_saveQueue[listKey]);
    _saveQueue[listKey] = setTimeout(() => _doSave(listKey), 1500);
    setSyncStatus('syncing', 'Saving…');
  }

  async function _doSave(listKey) {
    if (!siteId || !listIds[listKey]) return;
    try {
      switch(listKey) {
        case 'materials':      await _syncList('materials', materials, _matToSP); break;
        case 'products':       await _syncList('products', products, _prodToSP); break;
        case 'projects':       await _syncProjects(); break;
        case 'buildings':      await _syncBuildings(); break;
        case 'co2factors':     await _syncCO2Factors(); break;
        case 'settings':       await _syncSettings(); break;
        case 'impactProjects': await _syncList('impactProjects', impactProjects, _impactToSP); break;
      }
      _saveToCache();
      setSyncStatus('synced', 'Synced');
    } catch(e) {
      console.error('SP save error:', e);
      setSyncStatus('error', 'Save error — ' + e.message.slice(0,40));
    }
  }

  // Generic list sync: upsert changed items, delete removed items
  async function _syncList(listKey, appItems, toSPFields) {
    const lid = listIds[listKey];
    const existing = await getAllItems(listKey);
    const existingById = {};
    existing.forEach(f => { existingById[f.mat_id||f.prod_id||f.imp_id||f.id] = f; });

    for (const item of appItems) {
      const spFields = toSPFields(item);
      const appId = item.id;
      const spItem = existing.find(f => (f.mat_id||f.prod_id||f.imp_id) === String(appId));
      if (spItem) {
        // Update existing
        await gPatch(`/sites/${siteId}/lists/${lid}/items/${spItem.id}/fields`, spFields);
        item._spId = spItem.id;
      } else {
        // Create new
        const created = await gPost(`/sites/${siteId}/lists/${lid}/items`, {fields: spFields});
        item._spId = created.id;
      }
    }

    // Delete rows removed from app
    const appIds = new Set(appItems.map(i => String(i.id)));
    for (const f of existing) {
      const fId = f.mat_id||f.prod_id||f.imp_id;
      if (fId && !appIds.has(String(fId))) {
        await gDelete(`/sites/${siteId}/lists/${lid}/items/${f.id}`);
      }
    }
  }

  // Field mappers: app object → SharePoint fields object
  function _matToSP(m) {
    return {
      Title: m.name, mat_id: String(m.id), mat_name: m.name,
      mat_cat: m.cat||'', mat_sec: m.sec||'', mat_stg: m.stg||'',
      mat_sup: m.sup||'', mat_unit: m.unit||'',
      mat_qty: m.qty||0, mat_up: m.up||0, mat_tot: m.tot||0,
      mat_pc: m.pc||'', mat_bld: m.bld||'All', mat_div: m.div||'EcoPrefab',
      mat_dt: m.dt||'', mat_lab: !!m.lab,
      mat_co2key: m.co2key||'',
      mat_co2custom: m.co2custom!=null?m.co2custom:null,
      mat_transport_id: m.transport_id||'',
      mat_lc_stage: m.lc_stage||'A1-A3',
    };
  }

  function _prodToSP(p) {
    return {
      Title: p.name, prod_id: String(p.id), prod_name: p.name,
      prod_desc: p.desc||'', prod_unit: p.unit||'',
      prod_qty: p.qty||0, prod_stg: p.stg||'',
      prod_starred: !!p.starred,
      prod_ings: JSON.stringify(p.ings||[]),
      prod_labs: JSON.stringify(p.labs||[]),
    };
  }

  function _impactToSP(p) {
    return {
      Title: p.name, imp_id: String(p.id), imp_name: p.name,
      imp_code: p.code||'', imp_location: p.location||'',
      imp_status: p.status||'', imp_building_type: p.building_type||'',
      imp_start_date: p.start_date||'', imp_end_date: p.end_date||'',
      imp_completion_pct: p.completion_pct||0,
      imp_tracker_pc: p.tracker_pc||'',
      imp_num_buildings: p.num_buildings||0,
      imp_floor_area_sqm: p.floor_area_sqm||0,
      imp_num_classrooms: p.num_classrooms||0,
      imp_num_students: p.num_students||0,
      imp_contract_value_ugx: p.contract_value_ugx||0,
      imp_cost_sections: JSON.stringify(p.cost_sections||{}),
      imp_timber_kg: p.timber_kg||0, imp_lime_kg: p.lime_kg||0,
      imp_sawdust_kg: p.sawdust_kg||0, imp_steel_kg: p.steel_kg||0,
      imp_cement_kg: p.cement_kg||0,
      imp_co2_saved_tonnes: p.co2_saved_tonnes||0,
      imp_conventional_co2_equiv: p.conventional_co2_equiv||0,
      imp_trees_planted: p.trees_planted||0,
      imp_water_harvested_litres: p.water_harvested_litres||0,
      imp_jobs_direct: p.jobs_direct||0, imp_jobs_indirect: p.jobs_indirect||0,
      imp_local_workers_pct: p.local_workers_pct||0,
      imp_female_workers: p.female_workers||0, imp_trainees: p.trainees||0,
      imp_foresters_income_ugx: p.foresters_income_ugx||0,
      imp_lime_supplier_income_ugx: p.lime_supplier_income_ugx||0,
      imp_notes: p.notes||'',
    };
  }

  // Sync S.projects as SP rows
  async function _syncProjects() {
    const lid = listIds['projects'];
    const existing = await getAllItems('projects');
    const existingByKey = {};
    existing.forEach(f => { existingByKey[f.proj_key||f.Title] = f; });
    for (const [key, p] of Object.entries(S.projects)) {
      const fields = { Title: p.label||key, proj_key: key, proj_pc: p.pc||'', proj_desc: p.desc||'', proj_div: p.div||'EcoPrefab' };
      const sp = existingByKey[key];
      if (sp) await gPatch(`/sites/${siteId}/lists/${lid}/items/${sp.id}/fields`, fields);
      else await gPost(`/sites/${siteId}/lists/${lid}/items`, {fields});
    }
    // Delete removed
    const appKeys = new Set(Object.keys(S.projects));
    for (const f of existing) {
      const k = f.proj_key||f.Title;
      if (k && !appKeys.has(k)) await gDelete(`/sites/${siteId}/lists/${lid}/items/${f.id}`);
    }
  }

  async function _syncBuildings() {
    const lid = listIds['buildings'];
    const existing = await getAllItems('buildings');
    const existingByKey = {};
    existing.forEach(f => { existingByKey[f.Title||f.bld_key] = f; });
    for (const [key, b] of Object.entries(S.bldgs)) {
      const fields = { Title: key, bld_area: b.area||0, bld_desc: b.desc||'', bld_div: b.div||'EcoPrefab' };
      const sp = existingByKey[key];
      if (sp) await gPatch(`/sites/${siteId}/lists/${lid}/items/${sp.id}/fields`, fields);
      else await gPost(`/sites/${siteId}/lists/${lid}/items`, {fields});
    }
    const appKeys = new Set(Object.keys(S.bldgs));
    for (const f of existing) {
      const k = f.Title||f.bld_key;
      if (k && !appKeys.has(k)) await gDelete(`/sites/${siteId}/lists/${lid}/items/${f.id}`);
    }
  }

  async function _syncCO2Factors() {
    const lid = listIds['co2factors'];
    const existing = await getAllItems('co2factors');
    const existingByKey = {};
    existing.forEach(f => { existingByKey[f.co2_key||f.Title] = f; });
    for (const [key, f] of Object.entries(S.co2)) {
      const fields = { Title: f.label||key, co2_key: key, co2_v: f.v||0, co2_unit: f.unit||'', co2_desc: f.desc||'', co2_seq: f.seq||null };
      const sp = existingByKey[key];
      if (sp) await gPatch(`/sites/${siteId}/lists/${lid}/items/${sp.id}/fields`, fields);
      else await gPost(`/sites/${siteId}/lists/${lid}/items`, {fields});
    }
    const appKeys = new Set(Object.keys(S.co2));
    for (const f of existing) {
      const k = f.co2_key||f.Title;
      if (k && !appKeys.has(k)) await gDelete(`/sites/${siteId}/lists/${lid}/items/${f.id}`);
    }
  }

  async function _syncSettings() {
    const lid = listIds['settings'];
    const existing = await getAllItems('settings');
    const existingByKey = {};
    existing.forEach(f => { existingByKey[f.Title||f.setting_key] = f; });

    const settingsToSave = {
      sections:          S.sections,
      stages:            S.stages,
      unitOptions:       S.unitOptions,
      unitWeights:       S.unitWeights,
      seedSchool:        S.seedSchool,
      currency:          S.currency,
      rate:              S.rate,
      impactSettings:    impactSettings,
      impactCostSections: impactCostSections,
    };

    for (const [key, val] of Object.entries(settingsToSave)) {
      const fields = { Title: key, setting_key: key, setting_value: JSON.stringify(val) };
      const sp = existingByKey[key];
      if (sp) await gPatch(`/sites/${siteId}/lists/${lid}/items/${sp.id}/fields`, fields);
      else await gPost(`/sites/${siteId}/lists/${lid}/items`, {fields});
    }
  }

  // ── Offline cache ─────────────────────────────────────────────────────
  function _saveToCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        materials, products, settings: S,
        impactProjects, impactSettings, cachedAt: new Date().toISOString()
      }));
    } catch(e) { console.warn('Cache write failed:', e); }
  }

  function _loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const c = JSON.parse(raw);
      if (Array.isArray(c.materials) && c.materials.length>0) materials = c.materials;
      if (Array.isArray(c.products) && c.products.length>0) products = c.products;
      if (c.settings) {
        if (c.settings.co2) S.co2 = {...S.co2,...c.settings.co2};
        ['bldgs','projects','sections','stages','unitOptions','unitWeights',
         'seedSchool','currency','rate','activeDiv'].forEach(k=>{if(c.settings[k]!==undefined)S[k]=c.settings[k];});
      }
      if (Array.isArray(c.impactProjects)) impactProjects = c.impactProjects;
      if (c.impactSettings) Object.assign(impactSettings, c.impactSettings);
      console.log('Loaded from offline cache, cached at:', c.cachedAt);
      return true;
    } catch(e) { console.warn('Cache read failed:', e); return false; }
  }

  // ── UI helpers ────────────────────────────────────────────────────────
  function setSyncStatus(state, text) {
    const badge = document.getElementById('sync-badge');
    const label = document.getElementById('sync-text');
    if (!badge || !label) return;
    badge.className = `${state}`;
    badge.id = 'sync-badge';
    badge.classList.add(state);
    label.textContent = text;
  }

  function _showError(msg) {
    const el = document.getElementById('sp-error');
    if (el) { el.innerHTML = msg; el.style.display = 'block'; }
    // Also show a retry button
    const overlay = document.getElementById('sp-overlay');
    if (overlay && !overlay.querySelector('.sp-retry')) {
      const btn = document.createElement('button');
      btn.className = 'sp-signin-btn sp-retry';
      btn.style.marginTop = '8px';
      btn.style.background = 'rgba(255,255,255,0.15)';
      btn.style.color = '#fff';
      btn.style.border = '1px solid rgba(255,255,255,0.3)';
      btn.textContent = '↻ Try again';
      btn.onclick = () => { el.style.display='none'; SP.signIn(); };
      overlay.appendChild(btn);
    }
    console.error('SP Error:', msg);
  }

  function _parseJSON(str, fallback) {
    if (!str) return fallback;
    try { return JSON.parse(str); } catch { return fallback; }
  }

  // ── Public API ────────────────────────────────────────────────────────
  return { init, demoMode, signIn, signOut, showUserMenu, scheduleSave,
           loadFromSharePoint, setSyncStatus, isOnline: ()=>_online };
})();
