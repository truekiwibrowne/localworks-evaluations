function renderSettings(){
  document.getElementById('view-settings').innerHTML=`
  <div class="sh"><div class="sh-left"><div class="sh-num">05 / Settings</div><h2>Settings &amp; Configuration</h2><p>Currency, buildings, CO\u2082 factors, unit weights, sections and stages</p></div></div>

  <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;padding:16px 18px;margin-bottom:18px;border-left:4px solid ${C.forest}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.forest}">SharePoint Data Store</div>
      <div id="sync-badge-settings" style="font-size:11px;color:${C.moss}">Loading status…</div>
    </div>
    <div style="font-size:12px;color:${C.stone};margin-bottom:12px;line-height:1.6">
      All data is stored in <strong>SharePoint Lists</strong> on <code>localworksuga.sharepoint.com</code> and shared across all users.
      Changes save automatically within ~2 seconds. A local cache is kept for offline use.
    </div>
    <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center">
      <button onclick="SP.loadFromSharePoint()" class="btn btn-ok">↻ Force reload from SharePoint</button>
      <button onclick="exportBackup()" class="btn btn-ghost">↓ Export JSON backup</button>
      <label class="btn btn-ghost" style="cursor:pointer">↑ Import JSON backup<input type="file" accept=".json" style="display:none" onchange="importBackup(this)"></label>
      <button onclick="clearAllData()" class="btn btn-danger" style="margin-left:auto">⚠ Clear all data</button>
    </div>
    <div style="font-size:10px;color:${C.stone};margin-top:8px">
      <strong>Signed in as:</strong> <span id="settings-user">…</span> ·
      <button onclick="SP.signOut()" style="background:none;border:none;cursor:pointer;color:${C.clay};font-size:10px;text-decoration:underline">Sign out</button>
    </div>
  </div>

  <div class="g2">
    <!-- Currency -->
    <div class="card"><div class="card-title">Currency &amp; Exchange Rate</div>
      <div class="setting-group">
        <div><div class="fld-label" style="margin-bottom:7px">Display Currency</div>
          <div class="curr-toggle">
            <button class="curr-btn ${S.currency==="UGX"?"active":""}" onclick="setCurrency('UGX')">UGX</button>
            <button class="curr-btn ${S.currency==="USD"?"active":""}" onclick="setCurrency('USD')">USD</button>
          </div>
        </div>
        <div><div class="fld-label" style="margin-bottom:4px">UGX per 1 USD</div>
          <input class="inp" type="number" value="${S.rate}" oninput="S.rate=parseFloat(this.value)||3550;renderAll()" style="max-width:180px">
          <div style="font-size:10px;color:${C.stone};margin-top:3px">Default: 3,550 UGX = 1 USD</div>
        </div>
        <div style="background:${C.parchment};border-radius:4px;padding:9px 13px;font-size:12px">
          <strong>Preview:</strong> 1,000,000 UGX = ${S.currency==="USD"?`$${(1000000/S.rate).toFixed(2)}`:"UGX 1,000,000"}
        </div>
      </div>
    </div>
    <!-- Buildings -->
    <div class="card"><div class="card-title">Building Types</div>
      <div class="setting-group">
        ${Object.entries(S.bldgs).map(([k,b])=>`
        <div style="border:1px solid ${C.rule};border-radius:5px;padding:12px;border-left:3px solid ${k==="J4"?C.j4:k==="CR3"?C.cr3:C.moss}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-weight:700;font-size:12px;color:${k==="J4"?C.j4:k==="CR3"?C.cr3:C.moss}">${k}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <select class="inp" style="padding:3px 7px;font-size:11px" onchange="S.bldgs['${k}'].div=this.value">
                <option value="EcoPrefab" ${(b.div||'EcoPrefab')==='EcoPrefab'?'selected':''}>EcoPrefab</option>
                <option value="Bespoke" ${b.div==='Bespoke'?'selected':''}>Bespoke</option>
              </select>
              <button onclick="delBuilding('${k}')" style="background:none;border:none;color:#9b2226;cursor:pointer;font-size:12px">✕ Remove</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div><div class="fld-label" style="margin-bottom:3px">Floor Area (m²)</div>
              <input class="inp" type="number" value="${b.area}" oninput="S.bldgs['${k}'].area=parseFloat(this.value)||0;renderAll()"></div>
            <div><div class="fld-label" style="margin-bottom:3px">Description</div>
              <input class="inp" value="${b.desc}" oninput="S.bldgs['${k}'].desc=this.value"></div>
          </div>
        </div>`).join("")}
        <div style="font-size:10px;color:${C.stone};padding:4px 0">
          Total combined: ${Object.values(S.bldgs).reduce((a,b)=>a+b.area,0).toFixed(2)} m²
          ${Object.entries(S.bldgs).map(([k,b])=>`| ${k}: ${(b.area/Object.values(S.bldgs).reduce((a,x)=>a+x.area,0)*100).toFixed(1)}%`).join("")}
        </div>
        <div style="border-top:1px solid ${C.rule};padding-top:10px">
          <div class="fld-label" style="margin-bottom:7px">Add New Building Type</div>
          <div style="display:grid;grid-template-columns:70px 80px 100px 1fr auto;gap:7px;align-items:center">
            <input class="inp" id="new-bld-key" placeholder="Key (A1)" style="font-family:monospace;text-transform:uppercase">
            <input class="inp" type="number" id="new-bld-area" placeholder="Area m²">
            <select class="inp" id="new-bld-div"><option value="EcoPrefab">EcoPrefab</option><option value="Bespoke">Bespoke</option></select>
            <input class="inp" id="new-bld-desc" placeholder="Description">
            <button class="btn btn-pri btn-sm" onclick="addBuilding()">Add</button>
          </div>
        </div>
      </div>
    </div>
    <!-- Projects -->
    <div class="card"><div class="card-title">Projects</div>
      <div class="setting-group">
        ${Object.entries(S.projects).map(([k,p])=>`
        <div style="border:1px solid ${C.rule};border-radius:5px;padding:12px;border-left:3px solid ${C.clay}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-weight:700;font-size:12px;color:${C.clay}">${p.label}</div>
            <button onclick="delProject('${k}')" style="background:none;border:none;color:#9b2226;cursor:pointer;font-size:12px">✕ Remove</button>
          </div>
          <div style="display:grid;grid-template-columns:80px 110px 1fr 1fr;gap:8px">
            <div><div class="fld-label" style="margin-bottom:3px">Code</div>
              <input class="inp" value="${p.pc}" oninput="S.projects['${k}'].pc=this.value;renderAll()" style="font-family:monospace;text-transform:uppercase"></div>
            <div><div class="fld-label" style="margin-bottom:3px">Division</div>
              <select class="inp" onchange="S.projects['${k}'].div=this.value;renderAll()">
                <option value="EcoPrefab" ${(p.div||'EcoPrefab')==='EcoPrefab'?'selected':''}>EcoPrefab</option>
                <option value="Bespoke" ${p.div==='Bespoke'?'selected':''}>Bespoke</option>
              </select></div>
            <div><div class="fld-label" style="margin-bottom:3px">Label</div>
              <input class="inp" value="${p.label}" oninput="S.projects['${k}'].label=this.value;renderAll()"></div>
            <div><div class="fld-label" style="margin-bottom:3px">Description</div>
              <input class="inp" value="${p.desc}" oninput="S.projects['${k}'].desc=this.value"></div>
          </div>
        </div>`).join("")}
        <div style="border-top:1px solid ${C.rule};padding-top:10px">
          <div class="fld-label" style="margin-bottom:7px">Add New Project</div>
          <div style="display:grid;grid-template-columns:70px 70px 100px 1fr 1fr auto;gap:7px;align-items:center">
            <input class="inp" id="new-proj-key" placeholder="Key" style="font-family:monospace">
            <input class="inp" id="new-proj-pc" placeholder="PC" style="font-family:monospace;text-transform:uppercase">
            <select class="inp" id="new-proj-div"><option value="EcoPrefab">EcoPrefab</option><option value="Bespoke">Bespoke</option></select>
            <input class="inp" id="new-proj-label" placeholder="Label">
            <input class="inp" id="new-proj-desc" placeholder="Description">
            <button class="btn btn-pri btn-sm" onclick="addProject()">Add</button>
          </div>
        </div>
      </div>
    </div>
    <!-- CO2 Factors -->
    <div class="card g-wide"><div class="card-title">CO₂ Emission Factors — editable. Values are tCO₂e per purchase unit.</div>
      <div style="padding:14px 16px">
        <div class="co2-grid">
          ${Object.entries(S.co2).map(([k,f])=>`
          <div class="co2-row">
            <div><div class="co2-row-name">${f.label}</div><div class="co2-row-desc">${f.desc.slice(0,60)}…</div></div>
            <input class="inp" type="number" value="${f.v}" step="0.0001" style="text-align:right" oninput="S.co2['${k}'].v=parseFloat(this.value)||0">
            <div style="font-size:10px;color:${C.stone};font-family:monospace">${f.unit}</div>
            <button class="btn btn-danger btn-sm" onclick="delCO2Factor('${k}')" title="Delete factor">✕</button>
          </div>`).join("")}
        </div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid ${C.rule}">
          <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.stone};margin-bottom:8px">Add New CO₂ Factor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 90px 100px auto;gap:8px;align-items:center">
            <input class="inp" id="new-co2-key" placeholder="ID key (e.g. steel2)" style="font-family:monospace">
            <input class="inp" id="new-co2-label" placeholder="Label (e.g. Structural Steel)">
            <input class="inp" type="number" id="new-co2-v" placeholder="Value" step="0.0001">
            <input class="inp" id="new-co2-unit" placeholder="Unit (e.g. tCO2/t)">
            <button class="btn btn-pri btn-sm" onclick="addCO2Factor()">Add</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-top:7px">
            <input class="inp" id="new-co2-desc" placeholder="Description / source reference">
          </div>
          <div style="font-size:10px;color:${C.stone};margin-top:4px">The value must be in <strong>tCO₂e per purchase unit</strong> (e.g. if material is sold per kg and factor is 2.5 kgCO₂/kg, enter 0.0025 tCO₂/kg).</div>
        </div>
      </div>
    </div>
    <!-- Unit Weights -->
    <div class="card g-wide"><div class="card-title">Material Unit Weights &amp; Reference Values</div>
      <div style="padding:14px 16px">
        <p style="font-size:11px;color:${C.stone};margin-bottom:10px">These are reference values used in calculations. The CO₂ factors above already have units baked in — these are for documentation and display.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 18px;margin-bottom:12px">
          ${S.unitWeights.map(w=>`
          <div class="wt-row">
            <div><div style="font-size:11px;font-weight:600;color:${C.charcoal}">${w.label}</div><div style="font-size:10px;color:${C.stone}">${w.desc}</div></div>
            <input class="inp" type="number" value="${w.value}" style="text-align:right" oninput="S.unitWeights.find(x=>x.id==='${w.id}').value=parseFloat(this.value)||0">
            <div style="font-size:10px;color:${C.stone};font-family:monospace">${w.unit}</div>
            <button class="btn btn-danger btn-sm" onclick="delUnitWeight('${w.id}')" title="Delete">✕</button>
          </div>`).join("")}
        </div>
        <div style="border-top:1px solid ${C.rule};padding-top:12px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.stone};margin-bottom:8px">Add New Unit Weight</div>
          <div style="display:grid;grid-template-columns:1fr 90px 100px 1fr auto;gap:8px;align-items:center">
            <input class="inp" id="new-wt-label" placeholder="Label (e.g. Sand bag)">
            <input class="inp" type="number" id="new-wt-value" placeholder="Value">
            <input class="inp" id="new-wt-unit" placeholder="Unit (e.g. kg/bag)">
            <input class="inp" id="new-wt-desc" placeholder="Description">
            <button class="btn btn-pri btn-sm" onclick="addUnitWeight()">Add</button>
          </div>
        </div>
      </div>
    </div>
    <!-- Seed School -->
    <div class="card g-wide"><div class="card-title">Seed School Baseline — CO₂ Reference per m² (editable)</div>
      <div style="padding:14px 16px">
        <div style="background:${C.sageP};border:1px solid ${C.moss};border-radius:5px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:${C.forest}">
          <strong>How this works:</strong> Enter a CO₂ rate per m². This is multiplied by the total building area to get a like-for-like comparison.
          Currently: <strong>${S.seedSchool.ratePerM2} tCO₂/m²</strong> × <strong>${Object.values(S.bldgs).reduce((a,b)=>a+b.area,0).toFixed(2)} m²</strong> = <strong>${(S.seedSchool.ratePerM2*Object.values(S.bldgs).reduce((a,b)=>a+b.area,0)).toFixed(2)} tCO₂e total</strong>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px">
          <div><label class="fld-label" style="margin-bottom:3px">Rate (tCO₂e per m²)</label>
            <input class="inp" type="number" step="0.001" value="${S.seedSchool.ratePerM2}" oninput="S.seedSchool.ratePerM2=parseFloat(this.value)||0;renderAll()">
            <div style="font-size:10px;color:${C.stone};margin-top:2px">Default: 0.219 tCO₂/m²</div></div>
          <div><label class="fld-label" style="margin-bottom:3px">Cement used (t, ref)</label>
            <input class="inp" type="number" step="0.1" value="${S.seedSchool.cement}" oninput="S.seedSchool.cement=parseFloat(this.value)||0"></div>
          <div><label class="fld-label" style="margin-bottom:3px">HCB blocks (pcs, ref)</label>
            <input class="inp" type="number" value="${S.seedSchool.hcb}" oninput="S.seedSchool.hcb=parseFloat(this.value)||0"></div>
          <div><label class="fld-label" style="margin-bottom:3px">Steel (t, ref)</label>
            <input class="inp" type="number" step="0.1" value="${S.seedSchool.steel}" oninput="S.seedSchool.steel=parseFloat(this.value)||0"></div>
        </div>
        <div><label class="fld-label" style="margin-bottom:3px">Description / notes</label>
          <input class="inp" value="${S.seedSchool.desc}" oninput="S.seedSchool.desc=this.value"></div>
      </div>
    </div>
    <!-- Unit options for material modal -->
    <div class="card"><div class="card-title">Material Unit Options</div>
      <div class="setting-group">
        <p style="font-size:11px;color:${C.stone}">These appear as suggestions when adding/editing a material unit.</p>
        <div class="tags-wrap">
          ${S.unitOptions.map(u=>`<div class="rm-tag"><span>${u}</span><button onclick="S.unitOptions=S.unitOptions.filter(x=>x!=='${u}');renderAll()">✕</button></div>`).join("")}
        </div>
        <div class="add-new">
          <input class="inp" id="new-unit-opt" placeholder="New unit (e.g. Drum)…" onkeydown="if(event.key==='Enter')addUnitOption()">
          <button class="btn btn-pri btn-sm" onclick="addUnitOption()">Add</button>
        </div>
      </div>
    </div>
    <!-- Sections -->
    <div class="card"><div class="card-title">Construction Sections</div>
      <div class="setting-group">
        <div class="tags-wrap">
          ${S.sections.map(s=>`<div class="rm-tag"><span>${s}</span><button onclick="S.sections=S.sections.filter(x=>x!=='${s}');renderAll()">✕</button></div>`).join("")}
        </div>
        <div class="add-new">
          <input class="inp" id="new-sec" placeholder="New section…" onkeydown="if(event.key==='Enter')addSection()">
          <button class="btn btn-pri btn-sm" onclick="addSection()">Add</button>
        </div>
      </div>
    </div>
    <!-- Stages -->
    <div class="card"><div class="card-title">Construction Stages</div>
      <div class="setting-group">
        <div class="tags-wrap">
          ${S.stages.map(s=>`<div class="rm-tag"><span>${s}</span><button onclick="S.stages=S.stages.filter(x=>x!=='${s}');renderAll()">✕</button></div>`).join("")}
        </div>
        <div class="add-new">
          <input class="inp" id="new-stg" placeholder="New stage…" onkeydown="if(event.key==='Enter')addStage()">
          <button class="btn btn-pri btn-sm" onclick="addStage()">Add</button>
        </div>
      </div>
    </div>
  </div>`;
}

function addSection(){const i=document.getElementById('new-sec');if(i&&i.value.trim()&&!S.sections.includes(i.value.trim())){S.sections.push(i.value.trim());i.value="";renderAll();}}
function addUnitOption(){const i=document.getElementById('new-unit-opt');if(i&&i.value.trim()&&!S.unitOptions.includes(i.value.trim())){S.unitOptions.push(i.value.trim());i.value="";renderAll();}}
function addStage(){const i=document.getElementById('new-stg');if(i&&i.value.trim()&&!S.stages.includes(i.value.trim())){S.stages.push(i.value.trim());i.value="";renderAll();}}
function setCurrency(c){S.currency=c;renderAll();}
function delCO2Factor(k){if(confirm(`Delete factor "${S.co2[k]?.label}"?`)){delete S.co2[k];renderAll();}}
function addCO2Factor(){
  const key=document.getElementById('new-co2-key').value.trim().replace(/\s+/g,"_");
  const label=document.getElementById('new-co2-label').value.trim();
  const v=parseFloat(document.getElementById('new-co2-v').value);
  const unit=document.getElementById('new-co2-unit').value.trim();
  const desc=document.getElementById('new-co2-desc').value.trim();
  if(!key||!label||!v||!unit){alert("Please fill in all fields (Key, Label, Value, Unit).");return;}
  if(S.co2[key]){alert(`Key "${key}" already exists.`);return;}
  S.co2[key]={v,label,unit,desc};
  renderAll();
}
function delUnitWeight(id){S.unitWeights=S.unitWeights.filter(w=>w.id!==id);renderAll();}
function addUnitWeight(){
  const label=document.getElementById('new-wt-label').value.trim();
  const value=parseFloat(document.getElementById('new-wt-value').value);
  const unit=document.getElementById('new-wt-unit').value.trim();
  const desc=document.getElementById('new-wt-desc').value.trim();
  if(!label||!value||!unit){alert("Please fill Label, Value and Unit.");return;}
  S.unitWeights.push({id:newWid(),label,value,unit,desc});
  renderAll();
}

