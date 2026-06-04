// ─── PRODUCT DETAIL MODAL ────────────────────────────────────────────
function openProductDetailModal(id){
  const prod=products.find(p=>p.id===id);
  if(!prod)return;
  const p=prodStats(prod);
  const el=document.getElementById('prod-detail-modal');
  document.getElementById('prod-detail-title').textContent=`★ ${p.name} — Detail`;
  const ingRows=p.ings.map(ig=>{
    const m=materials.find(x=>x.id===ig.mid);
    const{e,q}=calcCO2({...m,qty:ig.qpu},null);
    const net=e-q;
    return`<tr>
      <td style="font-weight:500;padding:8px 10px">${ig.nm}</td>
      <td style="font-family:monospace;padding:8px 10px;text-align:right">${ig.qpu}</td>
      <td style="padding:8px 10px;color:${C.stone}">${ig.unit||""}</td>
      <td style="font-family:monospace;padding:8px 10px;text-align:right">${fmt(ig.up||0)}</td>
      <td style="font-family:monospace;padding:8px 10px;text-align:right;font-weight:700;color:${C.clay}">${fmt(ig.cpu||0)}</td>
      <td style="font-family:monospace;padding:8px 10px;text-align:right;color:${net<0?C.moss:C.stone}">${net!==0?(net<0?"−":"")+fco2(Math.abs(net)):""}</td>
      <td style="padding:8px 10px;font-size:11px;color:${C.stone}">${ig.note}</td>
    </tr>`;
  }).join("");
  const labRows=(p.labs||[]).map(lid=>{
    const l=materials.find(m=>m.id===lid);if(!l)return"";
    return`<div style="background:${C.sageP};border-radius:4px;padding:8px 12px;margin-bottom:6px">
      <div style="font-weight:700;font-size:12px;color:${C.forest}">${l.name}</div>
      <div style="font-size:11px;color:${C.stone};margin-top:2px">
        Total: ${fmt(l.tot)} → <strong>${fmt(l.tot/Math.max(p.qty,1))}</strong> per ${p.unit} (based on ${p.qty} target units)
      </div>
    </div>`;
  }).join("");
  document.getElementById('prod-detail-body').innerHTML=`
    <!-- Header metrics -->
    <div style="background:${C.forest};margin:-18px -18px 18px -18px;padding:16px 18px;display:grid;grid-template-columns:repeat(6,1fr);gap:10px">
      ${[["Target Qty",`${p.qty} ${p.unit}`,"rgba(255,255,255,.5)","#fff"],
         ["Mat Cost/unit",fmt(p.mC),"rgba(255,255,255,.5)",C.clayL],
         ["Labour/unit",fmt(p.lC),"rgba(255,255,255,.5)",C.sage],
         ["Total/unit",fmt(p.tC),"rgba(255,255,255,.5)","#fff"],
         ["Total Project Cost",fmt(p.tot),"rgba(255,255,255,.5)",C.clayL],
         ["Net CO₂/unit",`${p.nc<0?"−":""}${fco2(Math.abs(p.nc))} ${p.nc<0?"(stored)":"(emit)"}`,
           "rgba(255,255,255,.5)",p.nc<0?C.sage:C.clayL]
       ].map(([l,v,lc,vc])=>`<div>
        <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${lc};margin-bottom:3px">${l}</div>
        <div style="font-weight:700;font-size:14px;color:${vc}">${v}</div>
      </div>`).join("")}
    </div>
    <!-- CO2 summary -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:${C.clayP};border-radius:5px;padding:12px 14px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:4px">Gross Emissions/unit</div>
        <div style="font-weight:700;font-size:18px;color:${C.clay}">${fco2(p.c2)}</div>
        <div style="font-size:11px;color:${C.stone};margin-top:2px">× ${p.qty} units = ${fco2(p.c2*p.qty)}</div>
      </div>
      <div style="background:${C.sageP};border-radius:5px;padding:12px 14px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.moss};margin-bottom:4px">Sequestration/unit</div>
        <div style="font-weight:700;font-size:18px;color:${C.forest}">−${fco2(p.sq)}</div>
        <div style="font-size:11px;color:${C.moss};margin-top:2px">Stored in structure permanently</div>
      </div>
      <div style="background:${p.nc<0?C.sageP:C.clayP};border-radius:5px;padding:12px 14px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:4px">Net CO₂ — ${p.qty} units total</div>
        <div style="font-weight:700;font-size:18px;color:${p.nc<0?C.forest:C.clay}">${p.nc<0?"−":""}${fco2(Math.abs(p.nc*p.qty))}</div>
        <div style="font-size:11px;color:${C.stone};margin-top:2px">${p.nc<0?"Carbon negative ✓":"Carbon positive"}</div>
      </div>
    </div>
    <!-- Ingredients table -->
    <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.stone};margin-bottom:8px">Ingredients per ${p.unit}</div>
    <div style="overflow-x:auto;margin-bottom:14px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:${C.parchment}">
          <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.stone}">Material</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.stone}">Qty/unit</th>
          <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.stone}">Unit</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.stone}">Unit Price</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.stone}">Cost/unit</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.stone}">Net CO₂/unit</th>
          <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.stone}">Note</th>
        </tr></thead>
        <tbody>${ingRows}</tbody>
      </table>
    </div>
    ${(p.labs&&p.labs.length)?`<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.stone};margin-bottom:8px">Associated Labour</div>${labRows}`:""}
    <div class="modal-ft">
      <button class="btn btn-ghost" onclick="closeModal('prod-detail-modal')">Close</button>
      <button class="btn btn-pri" onclick="closeModal('prod-detail-modal');openProdModal('${p.id}')">Edit Product</button>
    </div>`;
  el.classList.add('open');
}

