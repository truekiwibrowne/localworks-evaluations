// ─── PRODUCTS ────────────────────────────────────────────────────────
function prodStats(p){
  let mC=0,c2=0,sq=0;
  const ings=p.ings.map(ig=>{
    const m=materials.find(x=>x.id===ig.mid);
    if(!m)return{...ig,nm:"(missing)",cpu:0,unit:"",up:0};
    const fakeM={...m,qty:ig.qpu};
    const{e,q}=calcCO2(fakeM,null);
    c2+=e;sq+=q;
    const cpu=m.up*ig.qpu;mC+=cpu;
    return{...ig,nm:m.name,unit:m.unit,up:m.up,cpu};
  });
  const lC=(p.labs||[]).reduce((a,id)=>{const l=materials.find(m=>m.id===id);return a+(l?l.tot/Math.max(p.qty,1):0);},0);
  return{...p,ings,mC,lC,tC:mC+lC,tot:(mC+lC)*p.qty,c2,sq,nc:c2-sq};
}

function renderProducts(){
  const pStats=products.map(prodStats);
  document.getElementById('view-products').innerHTML=`
  <div class="sh">
    <div class="sh-left"><div class="sh-num">03 / Products</div><h2>Product Configurator</h2><p>Define recipes from raw materials. Costs and CO₂ update live.</p></div>
    <div class="sh-right">${btn("+ New Product","openProdModal(null)","btn btn-pri btn-sm")}</div>
  </div>
  ${pStats.length===0?`<div style="text-align:center;padding:50px 0;color:${C.stone}"><div style="font-size:36px">◎</div><div style="font-weight:600;margin-top:8px">No products yet</div></div>`:""}
  ${pStats.map(p=>`
  <div class="prod-card">
    <div class="prod-hd">
      <div><div class="prod-name">${p.name}</div><div class="prod-desc">${p.desc}</div></div>
      <div style="display:flex;gap:6px;align-items:center">
        ${tag(p.stg,"rgba(255,255,255,.8)","rgba(255,255,255,.1)")}
        <button onclick="toggleStar('${p.id}')" style="background:${p.starred?'rgba(255,200,0,.2)':'rgba(255,255,255,.08)'};border:1px solid rgba(255,255,255,.2);border-radius:4px;padding:4px 10px;color:${p.starred?'#ffd700':'rgba(255,255,255,.5)'};font-size:13px;cursor:pointer" title="${p.starred?'Remove from dashboard':'Show on dashboard'}">${p.starred?'★':'☆'}</button>
        ${btn("Edit",`openProdModal('${p.id}')","btn btn-ghost btn-sm","border-color:rgba(255,255,255,.3);color:#fff`)}
        ${btn("✕",`delProd('${p.id}')","btn btn-danger btn-sm`)}
      </div>
    </div>
    <div class="prod-body">
      <div class="prod-metrics">
        ${[["Target",`${p.qty} ${p.unit}`,C.charcoal],["Mat/unit",fmt(p.mC),C.clay],["Labour/unit",fmt(p.lC),C.forest],["Total/unit",fmt(p.tC),C.charcoal],["Total Cost",fmt(p.tot),C.clay],["Net CO₂/unit",`${fco2(Math.abs(p.nc))} ${p.nc<0?"(stored)":"(emit)"}`,p.nc<0?C.moss:C.clay]].map(([l,v,c])=>`
        <div class="prod-metric"><div class="pm-label">${l}</div><div class="pm-val" style="color:${c}">${v}</div></div>`).join("")}
      </div>
      <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.stone};margin-bottom:7px">Ingredients per ${p.unit}</div>
      <table style="margin-bottom:12px"><thead><tr><th>Material</th><th>Qty/unit</th><th>Unit</th><th>Unit Price</th><th>Cost/unit</th><th>Note</th></tr></thead><tbody>
        ${p.ings.map((ig,i)=>`<tr style="background:${i%2?C.parchment:'transparent'}">
          <td style="font-weight:500">${ig.nm}</td><td class="td-mo">${ig.qpu}</td><td style="color:${C.stone}">${ig.unit||""}</td>
          <td class="td-mo">${fmt(ig.up||0)}</td><td class="td-mo td-bd" style="color:${C.clay}">${fmt(ig.cpu||0)}</td>
          <td style="color:${C.stone};font-size:11px">${ig.note}</td>
        </tr>`).join("")}
      </tbody></table>
      ${p.labs&&p.labs.length?`<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.stone};margin-bottom:7px">Associated Labour</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        ${p.labs.map(id=>{const l=materials.find(m=>m.id===id);return l?`<div style="background:${C.sageP};border-radius:4px;padding:5px 10px;font-size:11px"><span style="font-weight:700;color:${C.forest}">${l.name}</span><span style="color:${C.stone};margin-left:6px">${fmt(l.tot)} → ${fmt(l.tot/p.qty)}/${p.unit}</span></div>`:""}).join("")}
      </div>`:""}
    </div>
  </div>`).join("")}`;
}

