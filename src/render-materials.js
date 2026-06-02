// ─── MATERIALS ───────────────────────────────────────────────────────
function renderMaterials(){
  const cats=[...new Set(materials.map(m=>m.cat).filter(Boolean))].sort();
  const vis=materials.filter(m=>{
    if(!projFilter(m))return false;
    if(matFilter.type==="mat"&&m.lab)return false;
    if(matFilter.type==="lab"&&m.lab===false)return false;
    if(matFilter.sec&&m.sec!==matFilter.sec)return false;
    if(matFilter.cat&&m.cat!==matFilter.cat)return false;
    if(matFilter.search&&!m.name.toLowerCase().includes(matFilter.search.toLowerCase()))return false;
    if(matFilter.div&&(m.div||"EcoPrefab")!==matFilter.div)return false;
    // Project filter on materials page (independent of global project filter)
    if(matFilter.proj){
      if(matFilter.proj==="NABL"){if(m.pc!=="NABL")return false;}
      else{const pp=S.projects[matFilter.proj];if(pp&&m.pc!==pp.pc&&m.pc!=="NABL")return false;}
    }
    // Building filter on materials page
    if(matFilter.bld){
      if(matFilter.bld==="All"){if(m.bld!=="All")return false;}
      else{if(m.bld!==matFilter.bld&&m.bld!=="All")return false;}
    }
    return true;
  });
  const tot=vis.reduce((a,m)=>a+m.tot,0);
  const co2Label=key=>{
    if(!key||key==="")return"—";
    if(key==="custom")return"Custom";
    return S.co2[key]?S.co2[key].label.split(" ").slice(0,2).join(" "):"?";
  };

  document.getElementById('view-materials').innerHTML=`
  <div class="sh">
    <div class="sh-left"><div class="sh-num">02 / Data</div><h2>Materials &amp; Labour</h2><p>Edit entries or bulk-import via CSV</p></div>
    <div class="sh-right">
      ${btn("↓ CSV Template","dlTemplate()","btn btn-ghost btn-sm")}
      ${btn("↑ Upload CSV","document.getElementById('csv-file').click()","btn btn-ghost btn-sm")}
      ${btn("+ Material","openMatModal(false)","btn btn-pri btn-sm")}
      ${btn("+ Labour","openMatModal(true)","btn btn-ok btn-sm")}
    </div>
  </div>
  <div id="csv-msg-wrap"></div>
  <div class="hint"><strong>CO₂ column:</strong> Shows the assigned emission factor. Edit any row to assign or change the factor. "All" building materials are split proportionally by floor area when viewing a specific building.</div>
  <div class="filter-bar">
    <input class="inp" style="width:150px" placeholder="Search…" oninput="matFilter.search=this.value;renderMaterials()" value="${matFilter.search}">
    <select class="inp" style="width:140px" onchange="matFilter.proj=this.value;renderMaterials()">
      <option value="">All Projects</option>
      ${Object.entries(S.projects).map(([k,p])=>`<option value="${k}" ${matFilter.proj===k?"selected":""}>${p.label}</option>`).join("")}
      <option value="NABL" ${matFilter.proj==="NABL"?"selected":""}>NABL (Shared)</option>
    </select>
    <select class="inp" style="width:130px" onchange="matFilter.bld=this.value;renderMaterials()">
      <option value="">All Buildings</option>
      ${Object.keys(S.bldgs).map(k=>`<option value="${k}" ${matFilter.bld===k?"selected":""}>${k}</option>`).join("")}
      <option value="All" ${matFilter.bld==="All"?"selected":""}>All (shared)</option>
    </select>
    <select class="inp" style="width:140px" onchange="matFilter.sec=this.value;renderMaterials()">
      <option value="">All Sections</option>${S.sections.map(s=>`<option value="${s}" ${matFilter.sec===s?"selected":""}>${s}</option>`).join("")}
    </select>
    <select class="inp" style="width:130px" onchange="matFilter.cat=this.value;renderMaterials()">
      <option value="">All Categories</option>${cats.map(c=>`<option value="${c}" ${matFilter.cat===c?"selected":""}>${c}</option>`).join("")}
    </select>
    <select class="inp" style="width:120px" onchange="matFilter.type=this.value;renderMaterials()">
      <option value="">All Types</option>
      <option value="mat" ${matFilter.type==="mat"?"selected":""}>Materials only</option>
      <option value="lab" ${matFilter.type==="lab"?"selected":""}>Labour only</option>
    </select>
    <select class="inp" style="width:120px" onchange="matFilter.div=this.value;renderMaterials()">
      <option value="">All Divisions</option>
      <option value="EcoPrefab" ${matFilter.div==="EcoPrefab"?"selected":""}>EcoPrefab</option>
      <option value="Bespoke" ${matFilter.div==="Bespoke"?"selected":""}>Bespoke</option>
    </select>
    <button class="btn btn-ghost btn-sm" onclick="matFilter={sec:'',cat:'',search:'',type:'',proj:'',bld:'',div:''};renderMaterials()">Clear</button>
    <span style="margin-left:auto;font-size:11px;color:${C.stone}">${vis.length} rows | ${fmt(tot)}</span>
  </div>
  <div class="card"><div class="tbl-scroll"><table>
    <thead><tr><th>ID</th><th>Type</th><th>Name</th><th>Div</th><th>Stage</th><th>Section</th><th>Bldg</th><th>Proj</th><th>Unit</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>CO₂ Factor</th><th>Date</th><th></th></tr></thead>
    <tbody>
      ${vis.map(m=>`<tr>
        <td class="td-mo" style="color:${C.stone};font-size:10px">${m.id}</td>
        <td>${tag(m.lab?"Labour":"Mat",m.lab?C.forest:C.clay,m.lab?C.sageP:C.clayP)}</td>
        <td style="font-weight:500;max-width:180px">${m.name}</td>
        <td>${tag(m.div||"EP",m.div==="Bespoke"?"#7a2b4a":"#2b4a7a",m.div==="Bespoke"?"#f5dde8":"#dde8f5")}</td>
        <td style="font-size:10px;color:${C.stone};font-family:monospace">${m.lc_stage||'A1-A3'}${m.transport_id?` <span style="color:${C.moss}">🚛${m.transport_id}</span>`:''}</td>
        <td style="color:${C.stone}">${m.sec}</td>
        <td>${(m.bld&&m.bld!=="All"?m.bld:"All").split(",").map(b=>b.trim()).map(b=>tag(b,b==="J4"?C.j4:b==="CR3"?C.cr3:C.stone,b==="J4"?C.j4p:b==="CR3"?C.cr3p:C.parchment)).join(" ")}</td>
        <td>${tag(m.pc)}</td>
        <td class="td-mo">${m.unit}</td>
        <td class="td-r td-mo">${m.qty.toLocaleString()}</td>
        <td class="td-r td-mo">${fmt(m.up)}</td>
        <td class="td-r td-mo td-bd" style="color:${C.clay}">${fmt(m.tot)}</td>
        <td>${m.lab?"":tag(co2Label(m.co2key||""),m.co2key?C.forest:C.stone,m.co2key?C.sageP:C.parchment)}</td>
        <td class="td-mo" style="color:${C.stone};font-size:10px">${m.dt}</td>
        <td><div style="display:flex;gap:4px">
          ${btn("Edit",`editMat('${m.id}')","btn btn-ghost btn-sm`)}
          ${btn("✕",`delMat('${m.id}')","btn btn-danger btn-sm`)}
        </div></td>
      </tr>`).join("")}
    </tbody>
  </table></div></div>`;
}

