// ─── NAV ─────────────────────────────────────────────────────────────
function showView(id,el){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
  if(el)el.classList.add('active');
  renderAll();
}
function setProject(p,el){ renderAll(); } // legacy shim
function setDiv(d,el){
  S.activeDiv=d;
  document.querySelectorAll('#nav-div-tabs .proj-tab').forEach(b=>{
    b.classList.toggle('active', b.textContent.trim()===d);
  });
  renderAll();
}
function rebuildNavTabs(){
  // Keep division tab active state in sync
  document.querySelectorAll('#nav-div-tabs .proj-tab').forEach(b=>{
    b.classList.toggle('active', b.textContent.trim()===S.activeDiv);
  });
}
function setBldView(b){
  S.bv=b;
  document.querySelectorAll('.bld-tab').forEach(t=>{
    const isA=t.dataset.b===b;
    t.style.background=isA?(b==="J4"?C.j4:b==="CR3"?C.cr3:C.clay):"transparent";
    t.style.color=isA?"#fff":C.stone;
  });
  renderAll();
}
function renderAll(){
  rebuildNavTabs();
  renderDashboard();renderMaterials();renderProducts();renderCarbon();renderSettings();renderImpact();
  document.getElementById('nav-currency').textContent=S.currency;
  // Update settings page user display
  const su=document.getElementById('settings-user');
  const un=document.getElementById('user-name');
  const acct=window._msalAccount;
  if(su&&acct)su.textContent=acct.name||acct.username||'Unknown';
  saveToStorage();
}

