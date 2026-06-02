// ─── CARBON ──────────────────────────────────────────────────────────
function renderCarbon(){
  const st=calcStats(S.bv);
  // Dynamic tabs from S.bldgs — same pattern as dashboard
  const bldKeys=Object.keys(S.bldgs);
  const bldColors={J4:C.j4,CR3:C.cr3};
  const colList=[C.moss,C.sand,C.stone,C.sage,C.clay];
  const bldTabs=`<div class="bld-tabs">${[["All",C.clay],...bldKeys.map((k,i)=>[k,bldColors[k]||colList[i%colList.length]])].map(([b,co])=>
    `<button class="bld-tab" data-b="${b}" onclick="setBldView('${b}')" style="background:${S.bv===b?co:'transparent'};color:${S.bv===b?'#fff':C.stone}">${b}</button>`).join("")}</div>`;

  const visMat=materials.filter(m=>!m.lab&&projFilter(m)&&bldFilter(m));
  const rows=visMat.map((m,i)=>{
    const{e,q}=calcCO2(m,S.bv);
    const net=e-q;
    const hasKey=!!(m.co2key&&m.co2key!=='');
    const factorLabel=m.co2key==='custom'
      ?`Custom ${m.co2custom||0} tCO\u2082/unit`
      :m.co2key&&S.co2[m.co2key]
        ?S.co2[m.co2key].label
        :m.co2key?`\u26a0 Unknown: ${m.co2key}`:'—';
    const bldNote=m.bld==='All'&&S.bv!=='All'?` <span style="font-size:9px;color:${C.moss}">(area-split)</span>`:'';
    if(!hasKey) return `<tr style="background:${i%2===0?C.cream:'transparent'};opacity:.5">
      <td style="font-weight:500">${m.name}</td><td style="color:${C.stone}">${m.sec}</td>
      <td class="td-mo">${m.qty}</td><td style="color:${C.stone}">${m.unit}</td>
      <td style="color:${C.stone};font-size:10px;font-style:italic">No factor assigned</td>
      <td class="td-r" colspan="3" style="color:${C.stone}">—</td></tr>`;
    return `<tr style="background:${i%2===0?C.cream:'transparent'}">
      <td style="font-weight:500">${m.name}${bldNote}</td>
      <td style="color:${C.stone}">${m.sec}</td>
      <td class="td-mo">${m.qty}</td>
      <td style="color:${C.stone}">${m.unit}</td>
      <td style="color:${C.stone};font-size:10px">${factorLabel}</td>
      <td class="td-r td-mo" style="color:${C.clay}">${e>0?e.toFixed(4):'0.0000'}</td>
      <td class="td-r td-mo" style="color:${C.moss}">${q>0?'−'+q.toFixed(4):'—'}</td>
      <td class="td-r td-mo td-bd" style="color:${net<0?C.moss:C.clay}">${net.toFixed(4)}</td>
    </tr>`;
  }).join("");

  const pStats=products.map(prodStats);

  document.getElementById('view-carbon').innerHTML=`
  <div class="sh"><div class="sh-left"><div class="sh-num">04 / Carbon</div><h2>Carbon Tracker</h2><p>Embodied CO₂ with sequestration and Seed School comparison</p></div></div>
  ${bldTabs}
  <div class="kpi-grid">
    ${kpi("Gross Emissions",fco2(st.e),"All materials",C.clay)}
    ${kpi("Sequestration","−"+fco2(st.q),"Stored in timber",C.moss)}
    ${kpi("Net Carbon",(st.net<0?"−":"+")+fco2(Math.abs(st.net)),st.net<0?"Carbon negative ✓":"Carbon positive",st.net<0?C.forest:C.clay)}
    ${(()=>{const ta=Object.values(S.bldgs).reduce((a,b)=>a+b.area,0);const ss=S.seedSchool.ratePerM2*ta;return kpi("Seed School baseline",`+${ss.toFixed(1)}t`,`${S.seedSchool.ratePerM2} tCO₂/m² × ${ta.toFixed(1)} m² — editable in Settings`,C.stone);})()}
  </div>
  <div class="card" style="margin-bottom:12px"><div class="card-title">EcoPrefab vs Seed School</div>
    <div style="padding:12px 18px">
      ${(()=>{const ta=Object.values(S.bldgs).reduce((a,b)=>a+b.area,0);const ss=S.seedSchool.ratePerM2*ta;return[[`Seed School baseline (${S.seedSchool.ratePerM2} tCO₂/m² × ${ta.toFixed(0)} m²)`,ss,C.stone],["EcoPrefab gross emissions",st.e,C.clay],["EcoPrefab net (with sequestration)",st.net,C.moss]]})().map(([l,v,co])=>`
      <div style="margin-bottom:13px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="font-weight:500">${l}</span>
          <span style="font-family:monospace;font-weight:700;color:${v<0?C.moss:C.clay}">${v<0?"−":""}${fco2(Math.abs(v))}</span>
        </div>
        <div style="background:${C.rule};border-radius:99px;height:8px;overflow:hidden">
          <div style="width:${Math.min(100,(Math.abs(v)/90)*100).toFixed(0)}%;height:100%;background:${co};border-radius:99px"></div>
        </div>
      </div>`).join("")}
    </div>
  </div>
  <div class="card" style="margin-bottom:12px"><div class="card-title">CO₂ by Material — factor shown</div>
    <div class="tbl-scroll"><table>
      <thead><tr><th>Material</th><th>Section</th><th>Qty</th><th>Unit</th><th>CO₂ Factor Used</th><th>Emissions (t)</th><th>Sequestration (t)</th><th>Net (t)</th></tr></thead>
      <tbody>${rows||`<tr><td colspan="8" style="text-align:center;color:${C.stone};padding:20px">No materials with CO₂ factors assigned. Edit materials to assign factors.</td></tr>`}</tbody>
    </table></div>
  </div>
  ${pStats.length?`<div class="card" style="margin-bottom:12px"><div class="card-title">CO₂ per Product</div>
    <div style="padding:12px 16px">
      ${pStats.map(p=>`<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid ${C.rule}">
        <div style="display:flex;justify-content:space-between;margin-bottom:7px">
          <span style="font-weight:700">${p.name}</span>
          ${tag(`${fco2(Math.abs(p.nc))}/${p.unit} ${p.nc<0?"(stored)":"(emit)"}`,p.nc<0?C.forest:C.clay,p.nc<0?C.sageP:C.clayP)}
        </div>
        <div class="g3">
          <div style="background:${C.parchment};border-radius:4px;padding:8px 10px"><div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:2px">Emit/unit</div><div style="font-weight:700;color:${C.clay}">${fco2(p.c2)}</div></div>
          <div style="background:${C.sageP};border-radius:4px;padding:8px 10px"><div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.moss};margin-bottom:2px">Seq/unit</div><div style="font-weight:700;color:${C.forest}">−${fco2(p.sq)}</div></div>
          <div style="background:${C.parchment};border-radius:4px;padding:8px 10px"><div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:2px">Net × ${p.qty} units</div><div style="font-weight:700;color:${p.nc<0?C.forest:C.clay}">${fco2(Math.abs(p.nc*p.qty))} ${p.nc<0?"(stored)":""}</div></div>
        </div>
      </div>`).join("")}
    </div>
  </div>`:""}
  <div class="co2-assume">
    <h3>CO₂ Calculation Assumptions — All Factors</h3>
    <div class="co2-assume-grid">
      ${Object.entries(S.co2).map(([k,f])=>`<div class="co2-assume-row">
        <strong style="color:${C.charcoal}">${f.label}:</strong>
        <span style="color:${C.clay};font-family:monospace;margin:0 5px">${f.v} ${f.unit}</span>
        <span>${f.desc}</span>
      </div>`).join("")}
    </div>
    <div class="co2-note">
      <strong>Building split:</strong> When a material is tagged "All buildings" and you view a specific building, its CO₂ is multiplied by that building's share of total floor area. Total area: ${Object.values(S.bldgs).reduce((a,b)=>a+b.area,0).toFixed(2)} m².
      <strong>Sequestration:</strong> Only applied to timber (kiln-dried pine). Stored carbon remains in the structure for the life of the building.
      <strong>Seed School baseline:</strong> ${S.seedSchool.ratePerM2} tCO₂e/m² × ${Object.values(S.bldgs).reduce((a,b)=>a+b.area,0).toFixed(2)} m² = ${(S.seedSchool.ratePerM2*Object.values(S.bldgs).reduce((a,b)=>a+b.area,0)).toFixed(2)} tCO₂e total — ${S.seedSchool.desc}
    </div>
  </div>`;
}

// ─── SETTINGS ────────────────────────────────────────────────────────
