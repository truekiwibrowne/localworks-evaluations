// ─── PRINT / PDF ─────────────────────────────────────────────────────
function togglePrintBar(){
  const el=document.getElementById('print-btns');
  el.style.display=el.style.display==='none'?'flex':'none';
}

function printQuickReport(){
  // Show only dashboard + carbon for print
  document.querySelectorAll('.view').forEach(v=>{
    v.dataset.wasActive=v.classList.contains('active')?'1':'0';
  });
  // Add a print-only report header
  injectPrintHeader('Quick Report — Dashboard & Carbon Summary');
  // Set views: show dashboard + carbon, hide rest
  document.querySelectorAll('.view').forEach(v=>{
    if(v.id==='view-dashboard'||v.id==='view-carbon') v.classList.add('active');
    else v.classList.remove('active');
  });
  window.print();
  // Restore after print
  setTimeout(()=>{
    removePrintHeader();
    document.querySelectorAll('.view').forEach(v=>{
      if(v.dataset.wasActive==='1') v.classList.add('active');
      else v.classList.remove('active');
    });
  },500);
}

function printFullReport(){
  document.querySelectorAll('.view').forEach(v=>{
    v.dataset.wasActive=v.classList.contains('active')?'1':'0';
    v.classList.add('active'); // show all views
  });
  injectPrintHeader('Full Report — All Sections');
  window.print();
  setTimeout(()=>{
    removePrintHeader();
    document.querySelectorAll('.view').forEach(v=>{
      if(v.dataset.wasActive==='1') v.classList.add('active');
      else v.classList.remove('active');
    });
  },500);
}

function injectPrintHeader(title){
  const ta=Object.values(S.bldgs).reduce((a,b)=>a+b.area,0);
  const ss=S.seedSchool.ratePerM2*ta;
  const el=document.createElement('div');
  el.id='print-header-el';
  el.className='print-header';
  el.style.cssText='display:flex;justify-content:space-between;align-items:flex-end;padding:0 0 14px 0;border-bottom:2px solid #2C4A2E;margin-bottom:16px;';
  el.innerHTML=`
    <div>
      <div style="font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#C4622D;margin-bottom:3px">Localworks — EcoPrefab Programme</div>
      <div style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#1E1E1A">${title}</div>
      <div style="font-size:10px;color:#5C5850;margin-top:2px">Project: ${S.activeProject==="All"?"All projects":S.projects[S.activeProject]?.label||S.activeProject} · Building: ${S.bv} · Generated: ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#5C5850">
      <div><strong>Total Cost:</strong> ${fmt(calcStats(S.bv).tot)}</div>
      <div><strong>Net CO₂:</strong> ${fco2(Math.abs(calcStats(S.bv).net))} ${calcStats(S.bv).net<0?"(carbon negative)":"(carbon positive)"}</div>
      <div><strong>Seed School baseline:</strong> ${ss.toFixed(2)} tCO₂e</div>
    </div>`;
  document.getElementById('page').prepend(el);
}

function removePrintHeader(){
  const el=document.getElementById('print-header-el');
  if(el)el.remove();
}

