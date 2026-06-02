// ─── RENDER HELPERS ──────────────────────────────────────────────────
function kpi(label,value,sub,color){
  return`<div class="kpi"><div style="position:absolute;top:0;left:0;bottom:0;width:3px;background:${color};border-radius:6px 0 0 6px;"></div>
    <div class="kpi-label">${label}</div>
    <div class="kpi-value" style="color:${color}">${value}</div>
    ${sub?`<div class="kpi-sub">${sub}</div>`:""}
  </div>`;
}
function spk(pct,color){return`<div class="spk-wrap"><div class="spk-fill" style="width:${Math.min(100,Math.max(0,pct)).toFixed(1)}%;background:${color}"></div></div>`;}
function tag(tx,co,bg){return`<span class="tag" style="background:${bg||C.parchment};color:${co||C.stone}">${tx}</span>`;}
function btn(label,onclick,cls,style=""){return`<button class="btn ${cls}" onclick="${onclick}" style="${style}">${label}</button>`;}

