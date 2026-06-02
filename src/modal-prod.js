// ─── PROD MODAL ──────────────────────────────────────────────────────
// FIX: editingIngredients and editingLabIds are module-level arrays.
// We must deep-copy them when opening, and read them (not rebuild) on save.

function openProdModal(id){
  editingProdId=id;
  const p=id?products.find(x=>x.id===id):null;
  // Deep copy so modal edits don't mutate the product until saved
  editingIngredients=p?p.ings.map(i=>({mid:i.mid,qpu:i.qpu,note:i.note})):[];
  editingLabIds=p?(p.labs||[]).slice():[];

  document.getElementById('prod-modal-title').textContent=id?'Edit Product':'New Product';
  document.getElementById('p-name').value=p?p.name:'';
  document.getElementById('p-unit').value=p?p.unit:'';
  document.getElementById('p-desc').value=p?p.desc:'';
  document.getElementById('p-qty').value=p?p.qty:'';

  const stgSel=document.getElementById('p-stg');
  stgSel.innerHTML=S.stages.map(s=>`<option value="${s}">${s}</option>`).join('');
  if(p&&p.stg)stgSel.value=p.stg;

  const matSel=document.getElementById('ing-mat');
  matSel.innerHTML='<option value="">Select material…</option>'+
    materials.filter(m=>!m.lab).map(m=>`<option value="${m.id}">${m.name} [${m.unit}]</option>`).join('');
  document.getElementById('ing-qty').value='';
  document.getElementById('ing-note').value='';
  const starCb=document.getElementById('p-starred');
  if(starCb)starCb.checked=p?!!p.starred:false;

  renderIngList();
  renderLabBtns();
  document.getElementById('prod-modal').classList.add('open');
}

function renderIngList(){
  const el=document.getElementById('ing-list');if(!el)return;
  el.innerHTML=editingIngredients.map((ig,i)=>{
    const m=materials.find(x=>x.id===ig.mid);
    return`<div class="ing-row">
      <span style="flex:1;font-size:12px;font-weight:500">${m?m.name:ig.mid}</span>
      <span style="font-family:monospace;font-size:11px;color:${C.clay}">${ig.qpu} ${m?m.unit:''}</span>
      <span style="font-size:11px;color:${C.stone};min-width:60px">${ig.note}</span>
      <button onclick="remIng(${i})" style="background:none;border:none;color:#9b2226;cursor:pointer;font-size:15px;padding:0 3px">✕</button>
    </div>`;
  }).join('');
}

function renderLabBtns(){
  const el=document.getElementById('lab-btn-list');if(!el)return;
  const labs=materials.filter(m=>m.lab);
  if(!labs.length){el.innerHTML=`<p style="font-size:12px;color:${C.stone}">No labour entries yet.</p>`;return;}
  el.innerHTML=labs.map(l=>`<button class="lab-btn ${editingLabIds.includes(l.id)?'active':''}" onclick="togLab('${l.id}')">${l.name}</button>`).join('');
}

function addIng(){
  const mid=document.getElementById('ing-mat').value;
  const qpu=parseFloat(document.getElementById('ing-qty').value);
  const note=document.getElementById('ing-note').value||'';
  if(!mid||!qpu){alert("Select a material and enter qty per unit.");return;}
  editingIngredients.push({mid,qpu,note});
  document.getElementById('ing-qty').value='';
  document.getElementById('ing-note').value='';
  renderIngList();
}

function remIng(i){editingIngredients.splice(i,1);renderIngList();}

function togLab(id){
  const idx=editingLabIds.indexOf(id);
  if(idx>-1)editingLabIds.splice(idx,1);else editingLabIds.push(id);
  renderLabBtns();
}

function saveProd(){
  const name=document.getElementById('p-name').value.trim();
  if(!name){alert("Product name is required.");return;}
  const p={
    id:editingProdId||`P${String(products.length+1).padStart(3,'0')}`,
    name,
    desc:document.getElementById('p-desc').value.trim(),
    unit:document.getElementById('p-unit').value.trim()||'unit',
    qty:parseFloat(document.getElementById('p-qty').value)||0,
    stg:document.getElementById('p-stg').value,
    // IMPORTANT: copy arrays by value so future modal opens don't reference same objects
    ings:editingIngredients.map(i=>({...i})),
    labs:editingLabIds.slice(),
    starred:document.getElementById('p-starred')?.checked||false
  };
  if(editingProdId){
    products=products.map(x=>x.id===editingProdId?p:x);
  } else {
    products.push(p);
  }
  closeModal('prod-modal');
  renderAll();
}

function toggleStar(id){products=products.map(p=>p.id===id?{...p,starred:!p.starred}:p);renderAll();}
function delProd(id){if(confirm('Delete product?')){products=products.filter(x=>x.id!==id);renderAll();}}
function closeModal(id){document.getElementById(id).classList.remove('open');}

