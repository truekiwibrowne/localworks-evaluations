// ─── MAT MODAL ───────────────────────────────────────────────────────
let currentIsLabour=false;

function co2FactorOptions(){
  return`<option value="">-- No CO₂ calculation --</option>
    ${Object.entries(S.co2).map(([k,f])=>`<option value="${k}">${f.label}</option>`).join("")}
    <option value="custom">Custom factor…</option>`;
}

function populateSelects(){
  const sec=document.getElementById('f-sec'),stg=document.getElementById('f-stg');
  if(sec)sec.innerHTML=S.sections.map(s=>`<option>${s}</option>`).join("")+'<option>Other</option>';
  if(stg)stg.innerHTML=S.stages.map(s=>`<option>${s}</option>`).join("")+'<option>Other</option>';
  const co2sel=document.getElementById('f-co2key');
  if(co2sel)co2sel.innerHTML=co2FactorOptions();
  // Populate project code dropdown dynamically
  const pcSel=document.getElementById('f-pc');
  if(pcSel){
    const opts=[...Object.entries(S.projects).map(([k,p])=>`<option value="${p.pc}">${p.pc} — ${p.label}</option>`),
      `<option value="NABL">NABL — Shared / Both Sites</option>`];
    // add any unique pc codes from materials not in projects
    const knownPcs=new Set([...Object.values(S.projects).map(p=>p.pc),"NABL"]);
    const extraPcs=[...new Set(materials.map(m=>m.pc))].filter(pc=>pc&&!knownPcs.has(pc));
    extraPcs.forEach(pc=>opts.push(`<option value="${pc}">${pc}</option>`));
    pcSel.innerHTML=opts.join("");
  }
  // Populate division select
  const fDiv=document.getElementById('f-div');
  if(fDiv) fDiv.value=S.activeDiv!=="All"?S.activeDiv:"EcoPrefab";
  // Populate building checkboxes (filtered to current division)
  const bldChecks=document.getElementById('f-bld-checks');
  if(bldChecks){
    const vBldgs=S.activeDiv==="All"?S.bldgs:
      Object.fromEntries(Object.entries(S.bldgs).filter(([,b])=>(b.div||"EcoPrefab")===S.activeDiv));
    bldChecks.innerHTML=Object.entries(vBldgs).map(([k,b])=>
      `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;background:var(--cream);border:1px solid var(--rule);border-radius:4px;padding:5px 10px;font-size:12px">
        <input type="checkbox" name="f-bld-cb" value="${k}" checked style="accent-color:var(--clay);width:14px;height:14px">
        <strong>${k}</strong><span style="color:var(--stone);font-size:10px;margin-left:2px">${b.area}m²</span>
      </label>`
    ).join('');
  }
  // Populate unit datalist
  const dl=document.getElementById('unit-datalist');
  if(dl)dl.innerHTML=S.unitOptions.map(u=>`<option value="${u}"></option>`).join("");
}

function setType(t){
  currentIsLabour=t==="lab";
  const tm=document.getElementById('type-mat'),tl=document.getElementById('type-lab');
  if(tm)tm.className='btn btn-sm '+(currentIsLabour?'btn-ghost':'btn-pri');
  if(tl)tl.className='btn btn-sm '+(currentIsLabour?'btn-ok':'btn-ghost');
  const co2sec=document.getElementById('co2-factor-section');
  if(co2sec)co2sec.style.display=currentIsLabour?'none':'block';
}

function onCO2KeyChange(){
  const key=document.getElementById('f-co2key')?.value;
  const cw=document.getElementById('co2-custom-wrap');
  const prev=document.getElementById('co2-factor-preview');
  if(cw)cw.style.display=key==="custom"?"block":"none";
  if(prev){
    if(!key){prev.textContent="No CO₂ will be calculated for this material.";}
    else if(key==="custom"){prev.textContent="Enter the emission factor in tCO₂e per 1 unit of this material.";}
    else if(S.co2[key]){
      const f=S.co2[key];
      let txt=`${f.label}: ${f.v} ${f.unit}. ${f.desc}`;
      if(key==="timber"&&f.seq)txt+=` Net sequestration: ${f.seq} tCO₂/piece.`;
      prev.textContent=txt;
    }
  }
}

function updateTransportPreview(){
  const tid=(document.getElementById('f-transport-id')?.value||'').trim();
  const prev=document.getElementById('transport-preview');
  if(!prev)return;
  if(!tid){prev.style.display='none';return;}
  const t=materials.find(m=>m.id===tid);
  if(!t){prev.innerHTML=`\u26a0 No entry found with ID "<strong>${tid}</strong>". Create a material row with this ID to represent the transport event.`;prev.style.display='block';return;}
  const tCO2=calcCO2Base(t,null).e;
  const linked=materials.filter(m=>(m.transport_id||'')===tid&&m.id!==(document.getElementById('f-name')?.dataset?.id||''));
  const myTot=parseFloat(document.getElementById('f-tot')?.value)||0;
  const combinedTot=linked.reduce((a,m)=>a+(m.tot||0),0)+myTot;
  const myShare=combinedTot>0&&myTot>0?myTot/combinedTot:1/(linked.length+1);
  prev.innerHTML=`\ud83d\ude9b Transport: <strong>${t.name}</strong> | CO\u2082: <strong>${fco2(tCO2)}</strong> | Est. your share: ~${(myShare*100).toFixed(0)}% \u2248 <strong>${fco2(tCO2*myShare)}</strong> (${linked.length} other item${linked.length!==1?'s':''} also linked)`;
  prev.style.display='block';
}

function openMatModal(isLab){
  editingMatId=null;currentIsLabour=isLab||false;
  document.getElementById('mat-modal-title').textContent=isLab?'Add Labour':'Add Material';
  ['f-name','f-cat','f-sup','f-unit','f-qty','f-up','f-tot'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('f-dt').value='';
  document.getElementById('f-pc').value=Object.values(S.projects)[0]?.pc||'KSS';
  document.getElementById('f-tot-hint').textContent='';
  document.getElementById('f-unit').value='Item';
  populateSelects();
  setType(isLab?'lab':'mat');
  document.getElementById('f-co2key').value='';
  document.getElementById('co2-custom-wrap').style.display='none';
  document.getElementById('co2-factor-preview').textContent='No CO₂ will be calculated for this material.';
  const _ftid=document.getElementById('f-transport-id');if(_ftid)_ftid.value='';
  const _flcs=document.getElementById('f-lc-stage');if(_flcs)_flcs.value='A1-A3';
  const _ftp=document.getElementById('transport-preview');if(_ftp)_ftp.style.display='none';
  document.getElementById('mat-modal').classList.add('open');
}

function editMat(id){
  const m=materials.find(x=>x.id===id);if(!m)return;
  editingMatId=id;currentIsLabour=m.lab;
  document.getElementById('mat-modal-title').textContent='Edit Entry';
  document.getElementById('f-name').value=m.name||'';
  document.getElementById('f-cat').value=m.cat||'';
  document.getElementById('f-sup').value=m.sup||'';
  document.getElementById('f-unit').value=m.unit||'';
  document.getElementById('f-qty').value=m.qty||'';
  document.getElementById('f-up').value=m.up||'';
  document.getElementById('f-tot').value=m.tot||'';
  document.getElementById('f-dt').value=m.dt||'';
  document.getElementById('f-pc').value=m.pc||'KSS';
  // restore div
  setTimeout(()=>{
    const fd=document.getElementById('f-div');if(fd)fd.value=m.div||'EcoPrefab';
    const blds=(m.bld||'All')==='All'?Object.keys(S.bldgs):(m.bld||'').split(',').map(x=>x.trim());
    document.querySelectorAll('input[name="f-bld-cb"]').forEach(cb=>{cb.checked=blds.includes(cb.value);});
  },20);
  document.getElementById('f-tot-hint').textContent='';
  populateSelects();
  document.getElementById('f-sec').value=m.sec||'';
  document.getElementById('f-stg').value=m.stg||'';
  setType(m.lab?'lab':'mat');
  document.getElementById('f-co2key').value=m.co2key||'';
  const isCustom=m.co2key==="custom";
  document.getElementById('co2-custom-wrap').style.display=isCustom?'block':'none';
  document.getElementById('f-co2custom').value=m.co2custom||'';
  onCO2KeyChange();
  const _etid=document.getElementById('f-transport-id');if(_etid)_etid.value=m.transport_id||'';
  const _elcs=document.getElementById('f-lc-stage');if(_elcs)_elcs.value=m.lc_stage||'A1-A3';
  updateTransportPreview();
  document.getElementById('mat-modal').classList.add('open');
}

function autoTotal(){
  const q=parseFloat(document.getElementById('f-qty').value)||0;
  const p=parseFloat(document.getElementById('f-up').value)||0;
  if(q&&p){
    document.getElementById('f-tot').value=q*p;
    document.getElementById('f-tot-hint').textContent='Auto-calculated: '+fnum(q*p)+' UGX';
  }
}

function saveMat(){
  const qty=parseFloat(document.getElementById('f-qty').value)||0;
  const up=parseFloat(document.getElementById('f-up').value)||0;
  const tot=parseFloat(document.getElementById('f-tot').value)||(qty*up);
  const co2key=document.getElementById('f-co2key')?.value||'';
  const co2custom=co2key==="custom"?parseFloat(document.getElementById('f-co2custom').value)||null:null;
  const m={
    id:editingMatId||gid(currentIsLabour?'L':'M'),
    name:document.getElementById('f-name').value,
    cat:document.getElementById('f-cat').value,
    sec:document.getElementById('f-sec').value,
    stg:document.getElementById('f-stg').value,
    sup:document.getElementById('f-sup').value,
    unit:document.getElementById('f-unit').value,
    qty,up,tot,
    pc:document.getElementById('f-pc').value,
    div:document.getElementById('f-div')?.value||'EcoPrefab',
    bld:(()=>{const cbs=[...document.querySelectorAll('input[name="f-bld-cb"]:checked')].map(cb=>cb.value);const allKeys=Object.keys(S.bldgs);return cbs.length===allKeys.length||cbs.length===0?'All':cbs.join(',');})(),
    dt:document.getElementById('f-dt').value,
    lab:currentIsLabour,
    co2key:currentIsLabour?'':co2key,
    co2custom,
    transport_id:document.getElementById('f-transport-id')?.value?.trim()||'',
    lc_stage:document.getElementById('f-lc-stage')?.value||'A1-A3'
  };
  if(editingMatId){materials=materials.map(x=>x.id===editingMatId?m:x);}
  else{materials.push(m);}
  closeModal('mat-modal');renderAll();
}

function delMat(id){if(confirm('Delete this entry?')){materials=materials.filter(x=>x.id!==id);renderAll();}}

