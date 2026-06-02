// ─── DASHBOARD ───────────────────────────────────────────────────────
function renderDashboard(){
  const st=calcStats(S.bv),sAll=calcStats("All");
  const cols=[C.clay,C.forest,C.moss,C.sand,C.stone,C.sage,C.clayL];

  // Building tabs — dynamic from S.bldgs
  const bldKeys=Object.keys(S.bldgs);
  const bldTabs=`<div class="bld-tabs">${[["All",C.clay],...bldKeys.map(k=>[k,k==="J4"?C.j4:k==="CR3"?C.cr3:C.moss])].map(([b,co])=>
    `<button class="bld-tab" data-b="${b}" onclick="setBldView('${b}')" style="background:${S.bv===b?co:'transparent'};color:${S.bv===b?'#fff':C.stone}">${b}</button>`).join("")}</div>`;

  const bldNote=S.bv!=="All"?`<div class="hint" style="margin-bottom:12px;background:${C.j4p};border-color:${C.j4}"><strong>Building filter: ${S.bv}</strong> — Materials tagged "All" are allocated proportionally by floor area (${S.bldgs[S.bv]?.area||0} m² / ${Object.values(S.bldgs).reduce((a,b)=>a+b.area,0).toFixed(2)} m² total = ${((S.bldgs[S.bv]?.area||0)/Object.values(S.bldgs).reduce((a,b)=>a+b.area,0)*100).toFixed(1)}%).</div>`:"";

  // Building split cards (only when "All" selected)
  const bldSplit=S.bv==="All"?`<div style="display:grid;grid-template-columns:repeat(${bldKeys.length},1fr);gap:10px;margin-bottom:14px">
    ${bldKeys.map((k,i)=>{const s=calcStats(k);const co=k==="J4"?C.j4:k==="CR3"?C.cr3:cols[(i+2)%cols.length];return`
    <div class="bld-card">
      <div class="bld-card-hd" style="background:${co}">
        <span style="color:#fff;font-weight:700;font-size:13px">${k}</span>
        <span style="color:rgba(255,255,255,.65);font-size:11px">${S.bldgs[k]?.area} m²</span>
      </div>
      <div class="bld-card-body">
        <div class="bld-metric"><label>Total</label><div class="val" style="color:${co}">${fmt(s.tot)}</div></div>
        <div class="bld-metric"><label>Materials</label><div class="val" style="color:${C.stone}">${fmt(s.tM)}</div></div>
        <div class="bld-metric"><label>Net CO₂</label><div class="val" style="color:${s.net<0?C.moss:C.clay}">${s.net<0?"−":"+"}${fco2(Math.abs(s.net))}</div></div>
      </div>
    </div>`}).join("")}</div>`:"";

  // Monthly spend — group by month, split by category + CO2
  const monthlyData={};
  const visAll=materials.filter(m=>projFilter(m)&&bldFilter(m,S.bv));
  let undatedCount=0,undatedTotal=0;
  visAll.forEach(m=>{
    const moRaw=(m.dt||'').slice(0,7);
    if(!moRaw){undatedCount++;undatedTotal+=effectiveTot(m,S.bv);return;}
    if(!monthlyData[moRaw])monthlyData[moRaw]={tot:0,cats:{},e:0,q:0};
    const eTot=effectiveTot(m,S.bv);
    monthlyData[moRaw].tot+=eTot;
    const cat=m.cat||'Uncategorised';
    if(!monthlyData[moRaw].cats[cat])monthlyData[moRaw].cats[cat]=0;
    monthlyData[moRaw].cats[cat]+=eTot;
    if(!m.lab){const{e,q}=calcCO2(m,S.bv);monthlyData[moRaw].e+=e;monthlyData[moRaw].q+=q;}
  });
  const moE=Object.entries(monthlyData).sort((a,b)=>a[0]>b[0]?1:-1);
  const maxMo=Math.max(...moE.map(([,v])=>v.tot),1);
  const catKeys=[...new Set(visAll.map(m=>m.cat||"Uncategorised"))];
  const catColors={};catKeys.forEach((k,i)=>{catColors[k]=cols[i%cols.length];});

  const bySec=Object.entries(st.bS).sort((a,b)=>(b[1].mat+b[1].lab)-(a[1].mat+a[1].lab));
  const byStg=Object.entries(st.lS).sort((a,b)=>(b[1].mat+b[1].lab)-(a[1].mat+a[1].lab));

  // Starred products
  const pStats=products.filter(p=>p.starred).map(prodStats);
  const starredHTML=pStats.length===0?"":
    `<div style="margin-bottom:12px">
      <div class="card-title" style="padding:10px 16px 10px;background:${C.cream};border:1px solid ${C.rule};border-bottom:none;border-radius:6px 6px 0 0">★ Key Products</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1px;background:${C.rule};border:1px solid ${C.rule};border-top:none;border-radius:0 0 6px 6px;overflow:hidden">
        ${pStats.map(p=>`<div style="background:${C.cream};padding:14px 16px;cursor:pointer;transition:background .15s" onmouseover="this.style.background='${C.parchment}'" onmouseout="this.style.background='${C.cream}'" onclick="openProductDetailModal('${p.id}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px">
            <div style="font-weight:700;font-size:13px">★ ${p.name}</div>
            <div style="font-size:9px;color:${C.stone};background:${C.parchment};padding:2px 7px;border-radius:3px">Click for detail</div>
          </div>
          <div style="font-size:11px;color:${C.stone};margin-bottom:10px">${p.desc} · target ${p.qty} ${p.unit}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div style="background:${C.parchment};border-radius:4px;padding:7px 9px">
              <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:2px">Cost/unit</div>
              <div style="font-weight:700;font-size:13px;color:${C.clay}">${fmt(p.tC)}</div>
            </div>
            <div style="background:${C.parchment};border-radius:4px;padding:7px 9px">
              <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:2px">CO₂/unit</div>
              <div style="font-weight:700;font-size:13px;color:${p.nc<0?C.moss:C.clay}">${p.nc<0?"−":""}${fco2(Math.abs(p.nc))}</div>
            </div>
            <div style="background:${p.nc<0?C.sageP:C.clayP};border-radius:4px;padding:7px 9px">
              <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:2px">Net CO₂ total</div>
              <div style="font-weight:700;font-size:13px;color:${p.nc<0?C.forest:C.clay}">${p.nc<0?"−":""}${fco2(Math.abs(p.nc*p.qty))}</div>
            </div>
          </div>
        </div>`).join("")}
      </div>
    </div>`;

  document.getElementById('view-dashboard').innerHTML=`
  <div class="sh"><div class="sh-left"><div class="sh-num">01 / Overview</div><h2>Dashboard${S.activeProject!=="All"?" — "+(S.projects[S.activeProject]?.label||S.activeProject):""}</h2><p>Live cost, labour and carbon metrics</p></div></div>
  ${bldTabs}${bldNote}
  <div class="kpi-grid">
    ${kpi("Total Cost",fmt(st.tot),"Materials + Labour",C.clay)}
    ${kpi("Materials",fmt(st.tM),"",C.forest)}
    ${kpi("Labour",fmt(st.tL),"",C.moss)}
    ${kpi("Gross CO₂",fco2(st.e),"Embodied",C.stone)}
    ${kpi("Net Carbon",(st.net<0?"−":"+")+fco2(Math.abs(st.net)),st.net<0?"Carbon negative ✓":"Carbon positive",st.net<0?C.forest:C.clay)}
  </div>
  ${bldSplit}
  ${starredHTML}
  <div class="g2">
    <div class="card"><div class="card-title" style="display:flex;justify-content:space-between">
      <span>Cost by Section</span>
      <span style="font-size:10px;font-weight:400;display:flex;gap:10px">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${C.forest};margin-right:3px"></span>Materials</span>
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${C.moss};margin-right:3px"></span>Labour</span>
      </span>
    </div><div style="padding:12px 16px">
      ${bySec.filter(([s,d])=>d.mat+d.lab>0).map(([sec,d])=>{
        const tot2=d.mat+d.lab;const maxV=Math.max(...bySec.map(([,x])=>x.mat+x.lab),1);
        const matPct=(d.mat/maxV*100).toFixed(1),labPct=(d.lab/maxV*100).toFixed(1);
        return`<div style="margin-bottom:9px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
            <span style="font-weight:500">${sec}</span>
            <span style="font-family:monospace;color:${C.stone}">${fmt(tot2)} <span style="font-size:9px;color:${C.stone}">(M:${fmt(d.mat)} L:${fmt(d.lab)})</span></span>
          </div>
          <div style="background:${C.rule};border-radius:99px;height:7px;overflow:hidden;display:flex">
            <div style="height:100%;background:${C.forest};width:${matPct}%;border-radius:99px 0 0 99px;transition:width .3s"></div>
            <div style="height:100%;background:${C.moss};width:${labPct}%;border-radius:0 99px 99px 0;transition:width .3s"></div>
          </div>
        </div>`}).join("")}
    </div></div>
    <div class="card"><div class="card-title" style="display:flex;justify-content:space-between">
      <span>Cost by Stage</span>
      <span style="font-size:10px;font-weight:400;display:flex;gap:10px">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${C.clay};margin-right:3px"></span>Materials</span>
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${C.sand};margin-right:3px"></span>Labour</span>
      </span>
    </div><div style="padding:12px 16px">
      ${byStg.filter(([s,d])=>d.mat+d.lab>0).length===0
        ?`<p style="color:${C.stone};font-size:12px">No entries for current filter.</p>`
        :byStg.filter(([s,d])=>d.mat+d.lab>0).map(([stg,d])=>{
          const tot2=d.mat+d.lab;const maxV=Math.max(...byStg.map(([,x])=>x.mat+x.lab),1);
          const matPct=(d.mat/maxV*100).toFixed(1),labPct=(d.lab/maxV*100).toFixed(1);
          return`<div style="margin-bottom:9px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
              <span style="font-weight:500">${stg}</span>
              <span style="font-family:monospace;color:${C.stone}">${fmt(tot2)}</span>
            </div>
            <div style="background:${C.rule};border-radius:99px;height:7px;overflow:hidden;display:flex">
              <div style="height:100%;background:${C.clay};width:${matPct}%;border-radius:99px 0 0 99px;transition:width .3s"></div>
              <div style="height:100%;background:${C.sand};width:${labPct}%;border-radius:0 99px 99px 0;transition:width .3s"></div>
            </div>
          </div>`}).join("")}
    </div></div>
  </div>
  <div class="card"><div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
    <span>Monthly Spend — click a bar for breakdown</span>
    <span style="font-size:10px;color:${C.stone};font-weight:400">stacked by category · net CO₂ line</span>
  </div>
  <div style="padding:12px 16px">
    <div style="display:flex;align-items:flex-end;gap:3px;height:130px;position:relative">
      ${moE.map(([mo,md])=>{
        const pct=(md.tot/maxMo*100).toFixed(1);
        const netCO2=md.e-md.q;
        const netPct=Math.min(100,Math.max(0,(netCO2/Math.max(st.e,0.001))*100));
        const isNeg=netCO2<0;
        // stacked mini bars by category
        const catBars=Object.entries(md.cats).map(([c,v])=>{
          const cpct=(v/md.tot*100).toFixed(1);
          return`<div style="width:100%;height:${cpct}%;background:${catColors[c]||C.sand};min-height:1px" title="${c}: ${fmt(v)}"></div>`;
        }).join('');
        return`<div class="bar-col" style="cursor:pointer" onclick="openMonthModal('${mo}')" title="${mo}: ${fmt(md.tot)} — click for breakdown">
          <div style="flex:1;display:flex;flex-direction:column;align-items:stretch;width:100%;justify-content:flex-end">
            <div style="width:100%;height:${pct}%;display:flex;flex-direction:column;justify-content:flex-end;border-radius:2px 2px 0 0;overflow:hidden;position:relative">
              ${catBars}
              <div style="position:absolute;top:0;left:0;right:0;bottom:0;opacity:0;background:rgba(255,255,255,.2)" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"></div>
            </div>
          </div>
          <div class="bar-lbl">${mo.slice(2)}</div>
          <div style="font-size:8px;color:${isNeg?C.moss:C.clay};font-family:monospace;text-align:center">${isNeg?"−":""}${fco2(Math.abs(netCO2)).replace(" t","t")}</div>
        </div>`;
      }).join("")}
    </div>
    <!-- Category legend -->
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
      ${catKeys.map(k=>`<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:${C.stone}">
        <div style="width:10px;height:10px;border-radius:2px;background:${catColors[k]||C.sand};flex-shrink:0"></div>${k}
      </div>`).join("")}
      ${undatedCount>0?`<span style="font-size:10px;color:${C.stone};font-style:italic;margin-left:8px">⚠ ${undatedCount} undated item${undatedCount>1?'s':''} (${fmt(undatedTotal)}) not shown in chart</span>`:''}
    </div>
  </div></div>`;
}

// ─── MONTH MODAL ──────────────────────────────────────────────────────
function openMonthModal(mo){
  const rows=materials.filter(m=>projFilter(m)&&bldFilter(m,S.bv)&&(m.dt||"").slice(0,7)===mo);
  if(!rows.length)return;
  const byDate={};
  rows.forEach(m=>{const d=m.dt||"?";if(!byDate[d])byDate[d]={tot:0,items:[]};const et=effectiveTot(m,S.bv);byDate[d].tot+=et;byDate[d].items.push({...m,et});});
  const dateEntries=Object.entries(byDate).sort((a,b)=>a[0]>b[0]?1:-1);
  const byCat={};rows.forEach(m=>{const c=m.cat||"Uncategorised";if(!byCat[c])byCat[c]=0;byCat[c]+=effectiveTot(m,S.bv);});
  const moTot=rows.reduce((a,m)=>a+effectiveTot(m,S.bv),0);
  let emit=0,seq2=0;
  rows.filter(m=>!m.lab).forEach(m=>{const{e,q}=calcCO2(m,S.bv);emit+=e;seq2+=q;});
  const el=document.getElementById('month-modal');
  el.querySelector('.modal-hd-title').textContent=`${mo} — Monthly Breakdown`;
  el.querySelector('#month-modal-body').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:16px">
      ${[[`Total Spend`,fmt(moTot),C.clay],[`Gross CO₂`,fco2(emit),C.stone],[`Sequestration`,`−${fco2(seq2)}`,C.moss],[`Net CO₂`,`${(emit-seq2)<0?"−":"+"}${fco2(Math.abs(emit-seq2))}`,(emit-seq2)<0?C.forest:C.clay]].map(([l,v,c])=>`
      <div style="background:${C.parchment};border-radius:5px;padding:10px 12px">
        <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:3px">${l}</div>
        <div style="font-weight:700;font-size:16px;color:${c}">${v}</div>
      </div>`).join("")}
    </div>
    <!-- By Category -->
    <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.stone};margin-bottom:7px">Spend by Category</div>
    <div style="margin-bottom:14px">
      ${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="min-width:140px;font-size:12px;font-weight:500">${c}</span>
        <div style="flex:1;background:${C.rule};border-radius:99px;height:6px;overflow:hidden"><div style="width:${(v/moTot*100).toFixed(1)}%;height:100%;background:${C.clay};border-radius:99px"></div></div>
        <span style="font-family:monospace;font-size:11px;color:${C.stone};min-width:100px;text-align:right">${fmt(v)}</span>
      </div>`).join("")}
    </div>
    <!-- By Date -->
    <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.stone};margin-bottom:7px">Spend by Date</div>
    ${dateEntries.map(([dt,{tot,items}])=>`
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid ${C.rule}">
        <span>${dt}</span><span style="font-family:monospace;color:${C.clay}">${fmt(tot)}</span>
      </div>
      ${items.map(m=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0 2px 8px;color:${C.stone}">
        <span>${m.name} <span style="font-size:9px;background:${C.parchment};padding:1px 5px;border-radius:3px">${m.cat||""}</span></span>
        <span style="font-family:monospace">${fmt(m.et)}</span>
      </div>`).join("")}
    </div>`).join("")}`;
  el.classList.add('open');
}


