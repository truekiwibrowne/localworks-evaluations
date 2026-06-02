const impactCharts = {};
function destroyChart(id){if(impactCharts[id]){impactCharts[id].destroy();delete impactCharts[id];}}

const IC = {
  rust:"#8B4513",rustMid:"#A0522D",rustPale:"#F5EDE6",
  cyan:"#0AADDC",cyanDark:"#0889AE",cyanPale:"#E6F7FC",
  charcoal:"#2C2C2A",charcoalMid:"#444441",
  lightGray:"#F1EFE8",borderGray:"#D3D1C7",midGray:"#888780",
  green:"#3B6D11",greenLight:"#EAF3DE",greenMid:"#639922",
  amber:"#BA7517",amberLight:"#FAEEDA",white:"#fff",
};
const COST_SECTIONS = [
  {key:"preliminaries",label:"Preliminaries",color:IC.charcoalMid},
  {key:"substructure",label:"Substructure",color:IC.rust},
  {key:"structural_frame",label:"Structural Frame & Panels",color:IC.cyan},
  {key:"windows_doors",label:"Windows & Doors",color:IC.amber},
  {key:"mechanical",label:"Mechanical & Electrical",color:IC.cyanDark},
  {key:"roof",label:"Roof Construction",color:IC.green},
  {key:"labour",label:"Labour",color:IC.rustMid},
  {key:"other",label:"Other / Variations",color:IC.midGray},
];

function ifmtUSD(v){if(!v&&v!==0)return"—";const n=Number(v);if(n>=1e6)return"$"+(n/1e6).toFixed(2)+"M";if(n>=1e3)return"$"+(n/1e3).toFixed(0)+"K";return"$"+Math.round(n).toLocaleString();}
function ifmtUGX(v){if(!v)return"—";const n=Number(v);if(n>=1e9)return"UGX "+(n/1e9).toFixed(2)+"B";if(n>=1e6)return"UGX "+(n/1e6).toFixed(1)+"M";if(n>=1e3)return"UGX "+(n/1e3).toFixed(0)+"K";return"UGX "+Math.round(n).toLocaleString();}
function ifmtNum(v){if(v===undefined||v===null||v==="")return"—";const n=Number(v);if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(0)+"K";return Math.round(n).toLocaleString();}
function iToUSD(ugx){return Math.round(Number(ugx)/impactSettings.ugxUsd);}
function iPcOf(v,t){if(!t||!v)return 0;return Math.min(100,Math.round((Number(v)/Number(t))*100));}
function iTotalCost(p){return COST_SECTIONS.reduce((s,sec)=>s+(Number(p[sec.key])||0),0);}
function iCostPerSqm(p){const tc=iTotalCost(p);const a=Number(p.floor_area_sqm);return(tc&&a)?Math.round(iToUSD(tc)/a):0;}
function iBadgeStyle(pct){return pct>=75?`background:${IC.greenLight};color:${IC.green}`:pct>=30?`background:${IC.amberLight};color:${IC.amber}`:`background:${IC.rustPale};color:${IC.rust}`;}

// Auto-populate cost sections from tracker materials for a matching project
function autoCostFromTracker(impProj){
  // Match by project code (pc)
  const pc = impProj.tracker_pc;
  if(!pc) return {};
  const ms = materials.filter(m=>m.pc===pc||m.pc==="NABL");
  const totals = {};
  const sectionMap = {
    "Preliminaries":"preliminaries","Substructure":"substructure",
    "Structural Frame":"structural_frame","Windows & Doors":"windows_doors",
    "Mechanical":"mechanical","Roof Construction":"roof",
  };
  ms.forEach(m=>{
    const key = m.lab ? "labour" : (sectionMap[m.sec]||"other");
    totals[key] = (totals[key]||0) + m.tot;
  });
  return totals;
}

// Pull tracker net CO2 for a project
function trackerNetCO2(pc){
  if(!pc) return 0;
  const ms = materials.filter(m=>!m.lab&&(m.pc===pc||m.pc==="NABL"));
  let e=0,q=0;
  ms.forEach(m=>{const c=calcCO2(m,null);e+=c.e;q+=c.q;});
  return e-q; // negative = carbon negative
}

// Aggregate impact stats
function iAgg(){
  const ps = impactProjects;
  const a = {
    count: ps.length,
    revenue: ps.reduce((s,p)=>s+iToUSD(p.contract_value_ugx||0),0),
    classrooms: ps.reduce((s,p)=>s+(Number(p.num_classrooms)||0),0),
    buildings: ps.reduce((s,p)=>s+(Number(p.num_buildings)||0),0),
    people: ps.reduce((s,p)=>s+(Number(p.num_students)||0),0),
    jobs_direct: ps.reduce((s,p)=>s+(Number(p.jobs_direct)||0),0),
    jobs_indirect: ps.reduce((s,p)=>s+(Number(p.jobs_indirect)||0),0),
    trees: ps.reduce((s,p)=>s+(Number(p.trees_planted)||0),0),
    co2_saved: ps.reduce((s,p)=>s+(Number(p.co2_saved_tonnes)||0),0),
    water: ps.reduce((s,p)=>s+(Number(p.water_harvested_litres)||0),0),
    floor_area: ps.reduce((s,p)=>s+(Number(p.floor_area_sqm)||0),0),
    foresters: ps.reduce((s,p)=>s+iToUSD(p.foresters_income_ugx||0),0),
    lime: ps.reduce((s,p)=>s+iToUSD(p.lime_supplier_income_ugx||0),0),
    total_cost_ugx: ps.reduce((s,p)=>s+iTotalCost(p),0),
    timber_kg: ps.reduce((s,p)=>s+(Number(p.timber_kg)||0),0),
    lime_kg: ps.reduce((s,p)=>s+(Number(p.lime_kg)||0),0),
    sawdust_kg: ps.reduce((s,p)=>s+(Number(p.sawdust_kg)||0),0),
    steel_kg: ps.reduce((s,p)=>s+(Number(p.steel_kg)||0),0),
    cement_kg: ps.reduce((s,p)=>s+(Number(p.cement_kg)||0),0),
    female_workers: ps.reduce((s,p)=>s+(Number(p.female_workers)||0),0),
    training: ps.reduce((s,p)=>s+(Number(p.trainees)||0),0),
  };
  a.jobs_total = a.jobs_direct + a.jobs_indirect;
  a.avg_cost_sqm = a.floor_area>0?Math.round(iToUSD(a.total_cost_ugx)/a.floor_area):0;
  return a;
}

// Impact view tab state
let impTab = "overview";
let impView = "dashboard"; // "dashboard" | "form"
let impEditId = null;
let impForm = {};

function emptyImpForm(){
  return {
    id:null,name:"",code:"",location:"",start_date:"",end_date:"",
    status:"In Progress",building_type:"Classroom",completion_pct:"",tracker_pc:"",
    num_buildings:"",floor_area_sqm:"",num_classrooms:"",num_students:"",
    contract_value_ugx:"",preliminaries:"",substructure:"",structural_frame:"",
    windows_doors:"",mechanical:"",roof:"",labour:"",other:"",
    timber_kg:"",lime_kg:"",sawdust_kg:"",steel_kg:"",cement_kg:"",
    co2_saved_tonnes:"",conventional_co2_equiv:"",trees_planted:"",water_harvested_litres:"",
    jobs_direct:"",jobs_indirect:"",local_workers_pct:"",female_workers:"",trainees:"",
    foresters_income_ugx:"",lime_supplier_income_ugx:"",notes:"",
  };
}

// ── renderImpact — main entry ──────────────────────────────────────────────
function renderImpact(){
  const el = document.getElementById('view-impact');
  if(!el) return;
  if(impView==="form"){ renderImpactForm(el); return; }
  renderImpactDashboard(el);
}

// ── IMPACT FORM ──────────────────────────────────────────────────────────
function renderImpactForm(el){
  const isEdit = impEditId !== null;
  // Auto-fill cost from tracker if pc is set
  const autoFilled = impForm.tracker_pc ? autoCostFromTracker(impForm) : {};
  // Pull available project codes from tracker
  const tPcOptions = ["",...Object.values(S.projects).map(p=>p.pc),"NABL"];

  el.innerHTML = `
  <div style="max-width:1100px;margin:0 auto;padding:20px 0 60px">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">
      <button onclick="impView='dashboard';impForm=emptyImpForm();impEditId=null;renderImpact()"
        style="padding:8px 18px;background:transparent;border:1px solid ${C.rule};border-radius:6px;font-size:13px;cursor:pointer;font-family:inherit">← Back</button>
      <div>
        <div style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:${C.charcoal}">${isEdit?"Edit Impact Project":"Add Impact Project"}</div>
        <div style="font-size:12px;color:${C.stone}">Impact-specific fields. Cost data can be auto-filled from the tracker by linking a Project Code.</div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Identity -->
      <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;border-left:4px solid ${IC.rust};padding:18px 20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${IC.rust};margin-bottom:14px">Project Identity</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${iField("Project Name *","name","text")}
          ${iField("Project Code","code","text")}
          ${iField("Location","location","text")}
          ${iSelectField("Status","status",["In Progress","Completed","On Hold","Planned"])}
          ${iField("Start Date","start_date","date")}
          ${iField("End / Expected Date","end_date","date")}
          ${iSelectField("Building Type","building_type",["Classroom","Housing","Health Centre","Community Hub","Mixed"])}
          ${iField("Completion %","completion_pct","number","0–100")}
          <div style="grid-column:span 2">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:4px">Link to Tracker Project Code</label>
            <div style="display:flex;gap:8px">
              <select id="imp-tracker-pc" onchange="impForm.tracker_pc=this.value;renderImpact()"
                style="flex:1;padding:6px 9px;border:1px solid ${C.rule};border-radius:4px;font-size:12px;background:${C.cream}">
                ${tPcOptions.map(pc=>`<option value="${pc}" ${impForm.tracker_pc===pc?"selected":""}>${pc||"-- Not linked --"}</option>`).join("")}
              </select>
              ${impForm.tracker_pc?`<button onclick="autoFillFromTracker()" class="btn btn-ok btn-sm">Auto-fill costs from tracker</button>`:""}
            </div>
            ${impForm.tracker_pc?`<div style="font-size:10px;color:${C.moss};margin-top:3px">✓ Linked to ${impForm.tracker_pc} — tracker net CO₂: ${fco2(Math.abs(trackerNetCO2(impForm.tracker_pc)))} ${trackerNetCO2(impForm.tracker_pc)<0?"(carbon negative)":"(carbon positive)"}</div>`:""}
          </div>
        </div>
      </div>

      <!-- Building metrics -->
      <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;border-left:4px solid ${IC.cyan};padding:18px 20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${IC.cyan};margin-bottom:14px">Building Metrics</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${iField("No. of Buildings","num_buildings","number")}
          ${iField("Total Floor Area (m²)","floor_area_sqm","number")}
          ${iField("No. of Classrooms","num_classrooms","number")}
          ${iField("Students / Beneficiaries","num_students","number")}
        </div>
      </div>

      <!-- Cost breakdown — dynamic sections -->
      <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;border-left:4px solid ${IC.amber};padding:18px 20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${IC.amber}">Cost Breakdown (UGX)</div>
          <div style="display:flex;gap:7px">
            ${impForm.tracker_pc?`<button onclick="autoFillFromTracker()" class="btn btn-ok btn-sm">↻ Sync from tracker</button>`:""}
          </div>
        </div>
        <div style="font-size:11px;color:${C.stone};margin-bottom:12px">Sections are configurable in Impact Settings. Costs sync from tracker if a project code is linked.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${iField("Total Contract Value (UGX)","contract_value_ugx","number")}
          ${impactCostSections.map(sec=>`<div>
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:4px">${sec.label} (UGX)</label>
            <input type="number" min="0" value="${(impForm.cost_sections&&impForm.cost_sections[sec.key])||''}"
              style="width:100%;padding:6px 9px;border:1px solid ${C.rule};border-radius:4px;font-size:12px;background:${C.cream};font-family:inherit"
              oninput="if(!impForm.cost_sections)impForm.cost_sections={};impForm.cost_sections['${sec.key}']=parseFloat(this.value)||0">
          </div>`).join("")}
        </div>
      </div>

      <!-- Materials -->
      <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;border-left:4px solid ${IC.green};padding:18px 20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${IC.green};margin-bottom:14px">Materials Used (kg)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${iField("Timber — FSC pine (kg)","timber_kg","number")}
          ${iField("Hydrated Lime (kg)","lime_kg","number")}
          ${iField("Sawdust — infill blocks (kg)","sawdust_kg","number")}
          ${iField("Cement (kg)","cement_kg","number")}
          ${iField("Steel (kg)","steel_kg","number")}
        </div>
      </div>

      <!-- Environmental -->
      <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;border-left:4px solid ${IC.greenMid};padding:18px 20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${IC.greenMid};margin-bottom:14px">Environmental Impact</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${iField("CO₂ Saved vs Conventional (tonnes)","co2_saved_tonnes","number")}
          ${iField("Conventional Build CO₂ Equiv. (tonnes)","conventional_co2_equiv","number")}
          ${iField("Indigenous Trees Planted","trees_planted","number")}
          ${iField("Water Harvested (litres/yr)","water_harvested_litres","number")}
        </div>
      </div>

      <!-- Social -->
      <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;border-left:4px solid ${IC.rustMid};padding:18px 20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${IC.rustMid};margin-bottom:14px">Social &amp; Economic Impact</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${iField("Direct Jobs Created (FTEs)","jobs_direct","number")}
          ${iField("Indirect Jobs (value chain)","jobs_indirect","number")}
          ${iField("Local Workforce %","local_workers_pct","number")}
          ${iField("Female Workers","female_workers","number")}
          ${iField("People Trained in EcoPrefab","trainees","number")}
          ${iField("Foresters Income (UGX)","foresters_income_ugx","number")}
          ${iField("Lime Supplier Income (UGX)","lime_supplier_income_ugx","number")}
        </div>
      </div>

      <!-- Notes -->
      <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;padding:18px 20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.stone};margin-bottom:10px">Notes</div>
        <textarea id="imp-notes" rows="3" placeholder="Context, milestones, design variations…"
          style="width:100%;padding:7px 10px;border:1px solid ${C.rule};border-radius:4px;font-family:inherit;font-size:12px;resize:vertical"
          onchange="impForm.notes=this.value">${impForm.notes||""}</textarea>
      </div>

    </div>

    <div style="display:flex;gap:12px;margin-top:18px">
      <button onclick="saveImpactProject()" class="btn btn-pri">
        ${isEdit?"Update Project":"Save Impact Project"}
      </button>
      <button onclick="impView='dashboard';impForm=emptyImpForm();impEditId=null;renderImpact()" class="btn btn-ghost">Cancel</button>
    </div>
  </div>`;
}

function iField(label, key, type, placeholder){
  const val = impForm[key]!==undefined?impForm[key]:"";
  return `<div>
    <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:4px">${label}</label>
    <input type="${type}" min="0" value="${val}" placeholder="${placeholder||""}"
      style="width:100%;padding:6px 9px;border:1px solid ${C.rule};border-radius:4px;font-size:12px;background:${C.cream};color:${C.charcoal};font-family:inherit"
      oninput="impForm['${key}']=this.value">
  </div>`;
}

function iSelectField(label, key, options){
  const val = impForm[key]||options[0];
  return `<div>
    <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:4px">${label}</label>
    <select style="width:100%;padding:6px 9px;border:1px solid ${C.rule};border-radius:4px;font-size:12px;background:${C.cream};font-family:inherit"
      onchange="impForm['${key}']=this.value">
      ${options.map(o=>`<option value="${o}" ${val===o?"selected":""}>${o}</option>`).join("")}
    </select>
  </div>`;
}

function autoFillFromTracker(){
  const pc = impForm.tracker_pc;
  if(!pc){alert("Link a tracker project code first.");return;}
  const costs = autoCostFromTracker(impForm);
  Object.assign(impForm, costs);
  // Also auto-fill floor area if buildings data is known
  const bldArea = Object.values(S.bldgs).reduce((a,b)=>a+b.area,0);
  if(!impForm.floor_area_sqm && bldArea>0) impForm.floor_area_sqm = bldArea;
  renderImpact();
}

function saveImpactProject(){
  if(!impForm.name||!impForm.name.trim()){alert("Project name is required.");return;}
  const p = {...emptyImpForm(),...impForm};
  const strKeys = ["id","name","code","location","start_date","end_date","status","building_type","notes","tracker_pc"];
  Object.keys(p).forEach(k=>{if(!strKeys.includes(k)&&p[k]!=="")p[k]=Number(p[k])||0;});
  if(impEditId!==null){
    impactProjects = impactProjects.map(x=>x.id===impEditId?{...p,id:impEditId}:x);
  } else {
    impactProjects = [...impactProjects,{...p,id:Date.now()}];
  }
  impView="dashboard"; impForm=emptyImpForm(); impEditId=null;
  renderImpact();
}

function editImpactProject(id){
  const p = impactProjects.find(x=>x.id===id);
  if(!p) return;
  impForm = {...p};
  impEditId = id;
  impView = "form";
  renderImpact();
}

function delImpactProject(id){
  if(!confirm("Delete this impact project?")) return;
  impactProjects = impactProjects.filter(x=>x.id!==id);
  renderImpact();
}

// ── IMPACT DASHBOARD ────────────────────────────────────────────────────────
function renderImpactDashboard(el){
  const a = iAgg();
  const T = impactSettings.targets;
  const ps = impactProjects;

  // Chart data
  const costBk = COST_SECTIONS.map(sec=>({
    name:sec.label,
    usd:Math.round(iToUSD(ps.reduce((s,p)=>s+(Number(p[sec.key])||0),0))),
    color:sec.color
  })).filter(d=>d.usd>0);
  const matData = [
    {name:"Timber",kg:a.timber_kg,color:IC.rust},
    {name:"Lime",kg:a.lime_kg,color:IC.cyan},
    {name:"Sawdust",kg:a.sawdust_kg,color:IC.green},
    {name:"Steel",kg:a.steel_kg,color:IC.charcoalMid},
    {name:"Cement",kg:a.cement_kg,color:IC.amber},
  ].filter(d=>d.kg>0);
  const carbonData = ps.map(p=>({
    name:p.code||p.name.slice(0,12),
    ep:Number(p.co2_saved_tonnes)||0,
    conv:Number(p.conventional_co2_equiv)||0,
  }));

  // Helper: ring SVG
  const ring=(v,t,color,sz=52)=>{
    const p=Math.min(100,(Number(v)/Number(t))*100)||0;
    const r=(sz-10)/2; const circ=2*Math.PI*r;
    return `<svg width="${sz}" height="${sz}" style="transform:rotate(-90deg)">
      <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="${IC.lightGray}" stroke-width="7"/>
      <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="${color}" stroke-width="7"
        stroke-dasharray="${(p/100)*circ} ${circ}" stroke-linecap="round"/>
    </svg>`;
  };
  const kpiCard=(label,val,tgt,fmtV,fmtT,color)=>{
    const p=tgt?iPcOf(val,tgt):null;
    const bc=p!==null?(p>=75?`background:${IC.greenLight};color:${IC.green}`:p>=30?`background:${IC.amberLight};color:${IC.amber}`:`background:${IC.rustPale};color:${IC.rust}`):"";
    return `<div style="background:${IC.white};border-radius:8px;border:1px solid ${IC.borderGray};padding:14px 14px;border-left:4px solid ${color}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <div style="font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:${IC.midGray};margin-bottom:3px">${label}</div>
          <div style="font-size:20px;font-weight:700;color:${IC.charcoal};line-height:1.1">${fmtV?fmtV(val):ifmtNum(val)}</div>
          ${tgt?`<div style="font-size:10px;color:${IC.midGray};margin-top:2px">Target: ${fmtT?fmtT(tgt):ifmtNum(tgt)}</div>`:""}
        </div>
        ${tgt?`<div style="display:flex;flex-direction:column;align-items:center;gap:3px">${ring(val,tgt,color)}<span style="display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;${bc}">${p}%</span></div>`:""}
      </div>
      ${tgt?`<div style="height:4px;border-radius:3px;background:${IC.lightGray};overflow:hidden;margin-top:7px"><div style="height:100%;border-radius:3px;width:${Math.min(100,p)}%;background:${color}"></div></div>`:""}
    </div>`;
  };

  // Tabs
  const tabs = [["overview","Overview"],["projects","Projects"],["environment","Environmental"],["finance","Financial"],["funder","Funder Metrics"],["isettings","⚙ Impact Settings"]];

  el.innerHTML = `
  <div style="font-family:Georgia,'Times New Roman',serif;color:${IC.charcoal}">
    <div style="max-width:1280px;margin:0 auto;padding:20px 0 60px">

      <!-- Impact page header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px">
        <div>
          <div style="width:32px;height:4px;background:${IC.rust};border-radius:2px;margin-bottom:6px"></div>
          <div style="font-size:22px;font-weight:700;margin-bottom:2px">EcoPrefab Impact Dashboard</div>
          <div style="font-size:12px;color:${IC.midGray};font-family:sans-serif">
            ${ps.length===0?"No impact projects yet — click '+ Add project' to get started.":
              `${ps.length} project${ps.length>1?"s":""} · ${a.floor_area.toFixed(1)} m² total · ${ifmtUSD(impactSettings.ugxUsd)} per USD`}
          </div>
        </div>
        <button onclick="impForm=emptyImpForm();impEditId=null;impView='form';renderImpact()"
          style="padding:8px 18px;background:${IC.cyan};color:#fff;border:none;border-radius:20px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer">
          + Add impact project
        </button>
      </div>

      <!-- Tabs -->
      <div style="display:flex;border-bottom:2px solid ${IC.borderGray};margin-bottom:18px;overflow-x:auto">
        ${tabs.map(([id,label])=>`<button onclick="impTab='${id}';renderImpact()"
          style="padding:9px 16px;border:none;background:none;font-family:inherit;font-size:12px;cursor:pointer;white-space:nowrap;
            color:${impTab===id?IC.rust:IC.midGray};font-weight:${impTab===id?700:400};
            border-bottom:${impTab===id?`3px solid ${IC.rust}`:"3px solid transparent"};margin-bottom:-2px">${label}</button>`).join("")}
      </div>

      <!-- ═══ OVERVIEW ═══ -->
      ${impTab==="overview"?`
        <!-- Hero strip -->
        <div style="background:linear-gradient(135deg,${IC.charcoal} 0%,#3a3530 100%);border-radius:12px;padding:22px 28px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
          ${[
            {v:a.count,l:"Impact Projects"},
            {v:a.classrooms,l:"Classrooms Delivered"},
            {v:ifmtNum(a.people),l:"Students Benefiting"},
            {v:ifmtNum(a.jobs_total),l:"Jobs Created"},
            {v:ifmtNum(a.female_workers),l:"Female Workers"},
            {v:ifmtNum(a.trees)+" trees",l:"Trees Planted"},
            {v:ifmtNum(a.co2_saved)+"t",l:"CO₂ Saved"},
          ].map((m,i)=>`<div style="display:flex;align-items:center;gap:16px">
            ${i>0?`<div style="width:1px;height:44px;background:rgba(255,255,255,.12)"></div>`:""}
            <div style="text-align:center">
              <div style="font-size:26px;font-weight:800;color:#fff;line-height:1">${m.v}</div>
              <div style="font-size:10px;color:${IC.midGray};margin-top:2px;font-family:sans-serif">${m.l}</div>
            </div>
          </div>`).join("")}
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">
          ${kpiCard("EcoPrefab Revenue",a.revenue,T.revenue_usd,ifmtUSD,ifmtUSD,IC.rust)}
          ${kpiCard("Classrooms",a.classrooms,T.classrooms,null,null,IC.cyan)}
          ${kpiCard("Students benefiting",a.people,T.people,null,null,IC.green)}
          ${kpiCard("Jobs created",a.jobs_total,T.jobs,null,null,IC.amber)}
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
          ${kpiCard("Trees planted",a.trees,T.trees,null,null,IC.greenMid)}
          ${kpiCard("CO₂ saved (t)",a.co2_saved,T.co2_saved,null,null,IC.cyanDark)}
          ${kpiCard("Water harvested (l/yr)",a.water,T.water_litres,ifmtNum,ifmtNum,IC.cyan)}
          ${kpiCard("Avg cost/m² (USD)",a.avg_cost_sqm,T.cost_per_sqm_usd,v=>v?"$"+Math.round(v):"—",v=>"$"+v,IC.rustMid)}
        </div>
        ${ps.length>0?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div style="background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray};padding:16px">
            <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${IC.midGray};margin-bottom:10px;font-family:sans-serif">Cost breakdown by section (USD)</div>
            <canvas id="imp-donut" height="180"></canvas>
            <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:10px">
              ${costBk.map(d=>`<span style="display:flex;align-items:center;gap:4px;font-size:10px;font-family:sans-serif;color:${IC.charcoalMid}"><span style="width:8px;height:8px;border-radius:2px;background:${d.color};display:inline-block"></span>${d.name.split("&")[0].trim()}: ${ifmtUSD(d.usd)}</span>`).join("")}
            </div>
          </div>
          <div style="background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray};padding:16px">
            <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${IC.midGray};margin-bottom:10px;font-family:sans-serif">Cost/m² vs completion % by project</div>
            <canvas id="imp-bar-proj" height="200"></canvas>
          </div>
        </div>`:""}
      `:""}

      <!-- ═══ PROJECTS ═══ -->
      ${impTab==="projects"?`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="font-size:13px;color:${IC.midGray};font-family:sans-serif">${ps.length} project${ps.length!==1?"s":""} recorded</div>
          <button onclick="impForm=emptyImpForm();impEditId=null;impView='form';renderImpact()"
            style="padding:8px 18px;background:${IC.cyan};color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">+ Add project</button>
        </div>
        ${ps.length===0?`<div style="text-align:center;padding:60px 20px;background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray}">
          <div style="font-size:14px;color:${IC.midGray};font-family:sans-serif">No impact projects yet.</div>
          <button onclick="impForm=emptyImpForm();impEditId=null;impView='form';renderImpact()"
            style="margin-top:14px;padding:9px 22px;background:${IC.cyan};color:#fff;border:none;border-radius:7px;font-size:13px;cursor:pointer;font-family:inherit">+ Add first project</button>
        </div>`:
        ps.map(p=>{
          const tc=iTotalCost(p),cps=iCostPerSqm(p);
          const sc=p.status==="Completed"?`background:${IC.greenLight};color:${IC.green}`:p.status==="In Progress"?`background:${IC.cyanPale};color:${IC.cyanDark}`:`background:${IC.amberLight};color:${IC.amber}`;
          const pct=Number(p.completion_pct)||0;
          const tNetCO2 = p.tracker_pc ? trackerNetCO2(p.tracker_pc) : null;
          return `<div style="background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray};padding:16px 18px;margin-bottom:12px;border-left:4px solid ${IC.cyan}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:9px;margin-bottom:3px;flex-wrap:wrap">
                  <div style="font-size:16px;font-weight:700">${p.name}</div>
                  ${p.code?`<div style="font-size:10px;font-family:sans-serif;color:${IC.cyanDark};background:${IC.cyanPale};padding:2px 8px;border-radius:5px">${p.code}</div>`:""}
                  <div style="display:inline-block;padding:3px 9px;border-radius:9px;font-size:10px;font-family:sans-serif;font-weight:600;${sc}">${p.status}</div>
                  ${p.tracker_pc?`<div style="font-size:10px;font-family:sans-serif;color:${C.forest};background:${C.sageP};padding:2px 8px;border-radius:5px">↔ Tracker: ${p.tracker_pc}</div>`:""}
                </div>
                ${p.location?`<div style="font-size:11px;color:${IC.midGray};font-family:sans-serif;margin-bottom:7px">📍 ${p.location}</div>`:""}
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                  <div style="flex:1;height:4px;border-radius:3px;background:${IC.lightGray};overflow:hidden"><div style="height:100%;border-radius:3px;width:${Math.min(100,pct)}%;background:${IC.cyan}"></div></div>
                  <span style="font-size:11px;font-family:sans-serif;color:${IC.cyanDark};font-weight:700">${pct}%</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;font-family:sans-serif">
                  ${[
                    {l:"Floor area",v:p.floor_area_sqm?p.floor_area_sqm+" m²":"—"},
                    {l:"Classrooms",v:p.num_classrooms||"—"},
                    {l:"Students",v:ifmtNum(p.num_students)},
                    {l:"Contract",v:ifmtUGX(p.contract_value_ugx)},
                    {l:"Cost/m²",v:cps?"$"+cps:"—"},
                    {l:"CO₂ saved",v:p.co2_saved_tonnes?p.co2_saved_tonnes+"t":"—"},
                    {l:"Jobs",v:((Number(p.jobs_direct)||0)+(Number(p.jobs_indirect)||0))||"—"},
                    {l:"Female workers",v:p.female_workers||"—"},
                    {l:"Trees planted",v:p.trees_planted||"—"},
                    {l:"Trainees",v:p.trainees||"—"},
                    ...(tNetCO2!==null?[{l:"Tracker net CO₂",v:`${tNetCO2<0?"−":"+"}${fco2(Math.abs(tNetCO2))}`}]:[]),
                  ].map(m=>`<div style="background:${IC.lightGray};border-radius:5px;padding:6px 9px">
                    <div style="font-size:9px;color:${IC.midGray};text-transform:uppercase;letter-spacing:.06em">${m.l}</div>
                    <div style="font-size:12px;font-weight:700;color:${IC.charcoal}">${m.v}</div>
                  </div>`).join("")}
                </div>
                ${p.notes?`<div style="font-size:11px;color:${IC.midGray};margin-top:8px;font-style:italic;font-family:sans-serif">${p.notes}</div>`:""}
              </div>
              <div style="display:flex;gap:7px;flex-shrink:0">
                <button onclick="editImpactProject(${p.id})"
                  style="padding:5px 11px;background:transparent;color:${IC.cyan};border:1px solid ${IC.cyan};border-radius:5px;font-size:11px;font-family:sans-serif;cursor:pointer">Edit</button>
                <button onclick="delImpactProject(${p.id})"
                  style="padding:5px 11px;background:transparent;color:#E24B4A;border:1px solid #E24B4A;border-radius:5px;font-size:11px;font-family:sans-serif;cursor:pointer">Delete</button>
              </div>
            </div>
          </div>`;
        }).join("")}
      `:""}

      <!-- ═══ ENVIRONMENTAL ═══ -->
      ${impTab==="environment"?`
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
          ${kpiCard("CO₂ saved (t)",a.co2_saved,T.co2_saved,null,null,IC.green)}
          ${kpiCard("Trees planted",a.trees,T.trees,null,null,IC.greenMid)}
          ${kpiCard("Water harvested (l/yr)",a.water,T.water_litres,ifmtNum,ifmtNum,IC.cyan)}
        </div>
        ${ps.length>0?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
          <div style="background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray};padding:16px">
            <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${IC.midGray};margin-bottom:10px;font-family:sans-serif">Carbon savings by project (t CO₂)</div>
            <canvas id="imp-carbon-bar" height="190"></canvas>
          </div>
          <div style="background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray};padding:16px">
            <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${IC.midGray};margin-bottom:10px;font-family:sans-serif">Materials used — regenerative inputs (kg)</div>
            <canvas id="imp-mat-bar" height="190"></canvas>
          </div>
        </div>`:""}
        <div style="background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray};padding:16px">
          <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${IC.midGray};margin-bottom:12px;font-family:sans-serif">Key environmental facts — EcoPrefab vs conventional</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
            ${[
              {val:"75%",sub:"Carbon footprint reduction",detail:"vs conventional brick-and-mortar"},
              {val:"< 8t",sub:"CO₂ per 2-unit block",detail:"vs ~28t for conventional build"},
              {val:"0",sub:"Fired clay bricks required",detail:"No brick-firing needed"},
              {val:"100%",sub:"FSC-certified timber",detail:"Busoga Forestry Company"},
              {val:"Carbon sink",sub:"Lime plaster finish",detail:"Replaces cement plaster"},
              {val:"Regenerative",sub:"All key materials",detail:"Sawdust, lime, pine, compressed earth"},
            ].map(m=>`<div style="background:${IC.greenLight};border-radius:8px;padding:12px 14px;font-family:sans-serif">
              <div style="font-size:22px;font-weight:800;color:${IC.green}">${m.val}</div>
              <div style="font-size:12px;font-weight:600;color:${IC.charcoal};margin-top:2px">${m.sub}</div>
              <div style="font-size:10px;color:${IC.midGray};margin-top:2px">${m.detail}</div>
            </div>`).join("")}
          </div>
        </div>
      `:""}

      <!-- ═══ FINANCIAL ═══ -->
      ${impTab==="finance"?`
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
          ${kpiCard("Total EcoPrefab Revenue",a.revenue,T.revenue_usd,ifmtUSD,ifmtUSD,IC.rust)}
          ${kpiCard("Average cost per m²",a.avg_cost_sqm,T.cost_per_sqm_usd,v=>v?"$"+Math.round(v):"—",v=>"$"+v,IC.amber)}
          ${kpiCard("Foresters income (USD)",a.foresters,T.foresters_income_usd,ifmtUSD,ifmtUSD,IC.green)}
        </div>
        <div style="background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray};padding:16px;margin-bottom:14px;overflow-x:auto">
          <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${IC.midGray};margin-bottom:12px;font-family:sans-serif">Cost section breakdown — all projects (USD)</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:sans-serif;min-width:460px">
            <thead><tr>
              <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${IC.midGray};border-bottom:2px solid ${IC.borderGray}">Section</th>
              ${ps.map(p=>`<th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${IC.midGray};border-bottom:2px solid ${IC.borderGray}">${p.code||p.name.slice(0,10)}</th>`).join("")}
              <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${IC.midGray};border-bottom:2px solid ${IC.borderGray}">Total (USD)</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${IC.midGray};border-bottom:2px solid ${IC.borderGray}">%</th>
            </tr></thead>
            <tbody>
              ${COST_SECTIONS.map((sec,i)=>{
                const secUGX=ps.reduce((s,p)=>s+(Number(p[sec.key])||0),0);
                const secUSD=iToUSD(secUGX);
                const grandUSD=iToUSD(a.total_cost_ugx);
                const pct2=grandUSD>0?Math.round((secUSD/grandUSD)*100):0;
                return `<tr style="background:${i%2===0?IC.white:IC.lightGray+'80'}">
                  <td style="padding:8px 10px;border-bottom:1px solid ${IC.lightGray}">
                    <span style="display:flex;align-items:center;gap:7px">
                      <span style="width:8px;height:8px;border-radius:2px;background:${sec.color};flex-shrink:0"></span>${sec.label}
                    </span>
                  </td>
                  ${ps.map(p=>`<td style="padding:8px 10px;border-bottom:1px solid ${IC.lightGray};text-align:right">${p[sec.key]?ifmtUSD(iToUSD(p[sec.key])):"—"}</td>`).join("")}
                  <td style="padding:8px 10px;border-bottom:1px solid ${IC.lightGray};text-align:right;font-weight:700">${secUSD>0?ifmtUSD(secUSD):"—"}</td>
                  <td style="padding:8px 10px;border-bottom:1px solid ${IC.lightGray};text-align:right">${pct2>0?`<span style="display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;${iBadgeStyle(pct2)}">${pct2}%</span>`:"—"}</td>
                </tr>`;
              }).join("")}
              <tr style="background:${IC.charcoal}">
                <td style="padding:8px 10px;color:#fff;font-weight:700">TOTAL</td>
                ${ps.map(p=>`<td style="padding:8px 10px;color:#fff;font-weight:700;text-align:right">${ifmtUSD(iToUSD(iTotalCost(p)))}</td>`).join("")}
                <td style="padding:8px 10px;color:#fff;font-weight:700;text-align:right">${ifmtUSD(iToUSD(a.total_cost_ugx))}</td>
                <td style="padding:8px 10px;color:#fff">100%</td>
              </tr>
              <tr style="background:${IC.rustPale}">
                <td style="padding:8px 10px;font-weight:700;color:${IC.rust}">Cost per m²</td>
                ${ps.map(p=>`<td style="padding:8px 10px;text-align:right;font-weight:700;color:${IC.rust}">${iCostPerSqm(p)?"$"+iCostPerSqm(p):"—"}</td>`).join("")}
                <td style="padding:8px 10px;text-align:right;font-weight:700;color:${IC.rust}">${a.avg_cost_sqm?"$"+a.avg_cost_sqm+" avg":"—"}</td>
                <td style="padding:8px 10px">${a.avg_cost_sqm?`<span style="font-size:11px;color:${a.avg_cost_sqm<=T.cost_per_sqm_usd?IC.green:IC.amber}">${a.avg_cost_sqm<=T.cost_per_sqm_usd?"✓ Within $"+T.cost_per_sqm_usd+" target":"Above $"+T.cost_per_sqm_usd+" target"}</span>`:""}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `:""}

      <!-- ═══ FUNDER METRICS ═══ -->
      ${impTab==="funder"?`
        <div style="background:${IC.cyanPale};border:1px solid ${IC.cyan}40;border-radius:8px;padding:12px 16px;margin-bottom:14px;font-size:12px;color:${IC.cyanDark};font-family:sans-serif;line-height:1.6">
          <strong>Structured for international funders</strong> — World Bank, Green Climate Fund, African Development Bank, USAID, Enabel. Indicators follow DIME / OECD-DAC reporting frameworks.
        </div>
        <div style="background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray};padding:16px;margin-bottom:14px;overflow-x:auto">
          <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${IC.midGray};margin-bottom:12px;font-family:sans-serif">Core development indicators</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:sans-serif;min-width:440px">
            <thead><tr>
              ${["Indicator","Category","Current","2028 Target","Progress"].map((h,i)=>`<th style="padding:8px 10px;text-align:${i>=2?"right":"left"};font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${IC.midGray};border-bottom:2px solid ${IC.borderGray}">${h}</th>`).join("")}
            </tr></thead>
            <tbody>
              ${[
                {l:"Direct beneficiaries (students)",cat:"Social",v:a.people,t:T.people,f:ifmtNum},
                {l:"Female beneficiaries (est. 50%)",cat:"Gender",v:Math.round(a.people*0.5),t:Math.round(T.people*0.5),f:ifmtNum},
                {l:"Female workers",cat:"Gender",v:a.female_workers,t:Math.round(T.jobs*0.4),f:ifmtNum},
                {l:"People trained in EcoPrefab",cat:"Skills",v:a.training,t:500,f:ifmtNum},
                {l:"Classrooms delivered",cat:"Infrastructure",v:a.classrooms,t:T.classrooms,f:ifmtNum},
                {l:"Green buildings completed",cat:"Infrastructure",v:a.buildings,t:T.buildings,f:ifmtNum},
                {l:"Total floor area (m²)",cat:"Infrastructure",v:a.floor_area,t:T.classrooms*70,f:v=>v.toFixed(0)},
                {l:"Direct jobs created",cat:"Economic",v:a.jobs_direct,t:Math.round(T.jobs*0.6),f:ifmtNum},
                {l:"Total jobs (direct + indirect)",cat:"Economic",v:a.jobs_total,t:T.jobs,f:ifmtNum},
                {l:"Foresters income (USD/yr)",cat:"Economic",v:a.foresters,t:T.foresters_income_usd,f:ifmtUSD},
                {l:"GHG emissions avoided (tCO₂e)",cat:"Climate",v:a.co2_saved,t:T.co2_saved,f:ifmtNum},
                {l:"Trees planted",cat:"Climate",v:a.trees,t:T.trees,f:ifmtNum},
                {l:"Water harvested (litres/yr)",cat:"Water",v:a.water,t:T.water_litres,f:ifmtNum},
                {l:"EcoPrefab revenue (USD)",cat:"Financial",v:a.revenue,t:T.revenue_usd,f:ifmtUSD},
              ].map((m,i)=>{
                const p2=iPcOf(m.v,m.t);
                const bc=iBadgeStyle(p2);
                return `<tr style="border-bottom:1px solid ${IC.lightGray}">
                  <td style="padding:8px 10px">${m.l}</td>
                  <td style="padding:8px 10px;font-size:11px;color:${IC.midGray}">${m.cat}</td>
                  <td style="padding:8px 10px;text-align:right;font-weight:700">${m.v?m.f(m.v):"—"}</td>
                  <td style="padding:8px 10px;text-align:right;color:${IC.midGray}">${m.f(m.t)}</td>
                  <td style="padding:8px 10px;text-align:right">
                    <div style="display:flex;align-items:center;gap:7px;justify-content:flex-end">
                      <div style="width:70px;height:4px;border-radius:3px;background:${IC.lightGray};overflow:hidden"><div style="height:100%;border-radius:3px;width:${p2}%;background:${p2>=75?IC.green:p2>=30?IC.amber:IC.rust}"></div></div>
                      <span style="display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;${bc}">${p2}%</span>
                    </div>
                  </td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div style="background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray};padding:16px">
            <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${IC.midGray};margin-bottom:12px;font-family:sans-serif">SDG alignment — ${impactSettings.sdgGoals.length} goals addressed</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${impactSettings.sdgGoals.map(g=>`<div style="display:flex;align-items:center;gap:7px;padding:7px 11px;border-radius:7px;background:${g.color}18;border:1px solid ${g.color}40;font-family:sans-serif;font-size:11px;font-weight:600;color:${g.color}">
                <div style="width:20px;height:20px;border-radius:4px;background:${g.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0">${g.no}</div>
                ${g.label}
              </div>`).join("")}
            </div>
          </div>
          <div style="background:${IC.white};border-radius:10px;border:1px solid ${IC.borderGray};padding:16px">
            <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${IC.midGray};margin-bottom:12px;font-family:sans-serif">Additionality &amp; attribution</div>
            ${impactSettings.additionality.map(m=>`<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid ${IC.lightGray};font-family:sans-serif;font-size:12px;line-height:1.5">
              <span style="color:${IC.green};font-weight:700;flex-shrink:0">✓</span>
              <div><strong>${m.l}:</strong> ${m.v}</div>
            </div>`).join("")}
          </div>
        </div>
      `:""}

      <!-- ═══ IMPACT SETTINGS ═══ -->
      ${impTab==="isettings"?`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

          <!-- Exchange rate -->
          <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;padding:16px">
            <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.stone};margin-bottom:12px">Exchange Rate</div>
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.stone};margin-bottom:4px">UGX per 1 USD</label>
            <input type="number" value="${impactSettings.ugxUsd}"
              style="padding:6px 9px;border:1px solid ${C.rule};border-radius:4px;font-size:13px;background:${C.cream};width:180px"
              oninput="impactSettings.ugxUsd=parseFloat(this.value)||3700;renderImpact()">
            <div style="font-size:10px;color:${C.stone};margin-top:4px">Default: 3,700 UGX = 1 USD (impact dashboard uses its own rate separate from the tracker)</div>
          </div>

          <!-- 2028 Targets -->
          <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;padding:16px">
            <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.stone};margin-bottom:12px">2028 Targets</div>
            <div style="display:flex;flex-direction:column;gap:9px">
              ${[
                ["Revenue target (USD)","revenue_usd"],
                ["Classrooms target","classrooms"],
                ["Buildings target","buildings"],
                ["Students target","people"],
                ["Jobs target","jobs"],
                ["Trees target","trees"],
                ["CO₂ saved target (t)","co2_saved"],
                ["Water harvested target (l/yr)","water_litres"],
                ["Cost/m² target (USD)","cost_per_sqm_usd"],
                ["Foresters income target (USD)","foresters_income_usd"],
                ["Lime supplier income target (USD)","lime_income_usd"],
              ].map(([label,key])=>`<div style="display:grid;grid-template-columns:1fr 140px;gap:8px;align-items:center">
                <div style="font-size:11px;font-weight:600;color:${C.charcoal}">${label}</div>
                <input type="number" value="${T[key]}"
                  style="padding:5px 8px;border:1px solid ${C.rule};border-radius:4px;font-size:12px;background:${C.cream};text-align:right"
                  oninput="impactSettings.targets['${key}']=parseFloat(this.value)||0;renderImpact()">
              </div>`).join("")}
            </div>
          </div>

          <!-- SDG Goals -->
          <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;padding:16px">
            <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.stone};margin-bottom:10px">SDG Goals Addressed</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
              ${impactSettings.sdgGoals.map((g,i)=>`<div style="display:flex;align-items:center;gap:5px;background:${g.color}18;border:1px solid ${g.color}40;border-radius:5px;padding:4px 9px;font-size:11px;font-weight:600;color:${g.color}">
                <div style="width:16px;height:16px;border-radius:3px;background:${g.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800">${g.no}</div>
                ${g.label}
                <button onclick="impactSettings.sdgGoals.splice(${i},1);renderImpact()" style="background:none;border:none;cursor:pointer;color:${g.color};font-size:14px;line-height:1;padding:0 2px">×</button>
              </div>`).join("")}
            </div>
            <div style="display:grid;grid-template-columns:50px 1fr 100px auto;gap:7px;align-items:center">
              <input type="number" id="sdg-no" placeholder="No" min="1" max="17" style="padding:5px 7px;border:1px solid ${C.rule};border-radius:4px;font-size:12px;background:${C.cream}">
              <input type="text" id="sdg-label" placeholder="Label" style="padding:5px 7px;border:1px solid ${C.rule};border-radius:4px;font-size:12px;background:${C.cream}">
              <input type="color" id="sdg-color" value="#3B6D11" style="padding:2px;border:1px solid ${C.rule};border-radius:4px;height:30px;width:100%">
              <button onclick="addSDG()" class="btn btn-pri btn-sm">Add</button>
            </div>
          </div>

          <!-- Cost Sections — fully editable -->
          <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;padding:16px">
            <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.stone};margin-bottom:10px">Impact Project Cost Sections</div>
            <p style="font-size:11px;color:${C.stone};margin-bottom:10px">These sections appear in the Impact project cost breakdown form. Add, rename or remove as needed.</p>
            ${impactCostSections.map((sec,i)=>`<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
              <input class="inp" style="flex:1" value="${sec.label}"
                oninput="impactCostSections[${i}].label=this.value;renderImpact()">
              <span style="font-size:10px;color:${C.stone};font-family:monospace;min-width:80px">${sec.key}</span>
              <button onclick="impactCostSections.splice(${i},1);renderImpact()" style="background:none;border:none;color:#9b2226;cursor:pointer;font-size:16px">×</button>
            </div>`).join("")}
            <div style="display:flex;gap:7px;margin-top:8px">
              <input class="inp" id="new-cost-sec-label" placeholder="Section label (e.g. External Works)">
              <button onclick="addImpactCostSection()" class="btn btn-pri btn-sm">Add Section</button>
            </div>
          </div>

          <!-- Additionality -->
          <div style="background:${C.cream};border:1px solid ${C.rule};border-radius:6px;padding:16px">
            <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.stone};margin-bottom:10px">Additionality Points</div>
            ${impactSettings.additionality.map((m,i)=>`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid ${C.rule}">
              <div><div style="font-size:11px;font-weight:600;color:${C.charcoal}">${m.l}</div><div style="font-size:10px;color:${C.stone}">${m.v}</div></div>
              <button onclick="impactSettings.additionality.splice(${i},1);renderImpact()" style="background:none;border:none;cursor:pointer;color:#9b2226;font-size:16px;padding:0 4px">×</button>
            </div>`).join("")}
            <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:7px;margin-top:10px;align-items:center">
              <input type="text" id="add-label" placeholder="Label" style="padding:5px 7px;border:1px solid ${C.rule};border-radius:4px;font-size:12px;background:${C.cream}">
              <input type="text" id="add-value" placeholder="Description" style="padding:5px 7px;border:1px solid ${C.rule};border-radius:4px;font-size:12px;background:${C.cream}">
              <button onclick="addAdditionality()" class="btn btn-pri btn-sm">Add</button>
            </div>
          </div>
        </div>
      `:""}

    </div>
  </div>`;

  // Draw Chart.js charts after DOM is set
  requestAnimationFrame(()=>{
    if(impTab==="overview"&&ps.length>0){
      if(costBk.length>0){
        destroyChart('imp-donut');
        const cv=document.getElementById('imp-donut');
        if(cv) impactCharts['imp-donut']=new Chart(cv,{type:"doughnut",data:{labels:costBk.map(d=>d.name.split("&")[0].trim()),datasets:[{data:costBk.map(d=>d.usd),backgroundColor:costBk.map(d=>d.color),borderWidth:2,borderColor:"#fff"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>"$"+ctx.parsed.toLocaleString()}}}}});
      }
      const pBars=ps.map(p=>({name:p.code||p.name.slice(0,12),cost:iCostPerSqm(p)||0,completion:Number(p.completion_pct)||0}));
      if(pBars.length>0){
        destroyChart('imp-bar-proj');
        const cv2=document.getElementById('imp-bar-proj');
        if(cv2) impactCharts['imp-bar-proj']=new Chart(cv2,{type:"bar",data:{labels:pBars.map(d=>d.name),datasets:[{label:"Cost/m² (USD)",data:pBars.map(d=>d.cost),backgroundColor:IC.rust,borderRadius:4,yAxisID:"y"},{label:"Completion %",data:pBars.map(d=>d.completion),backgroundColor:IC.cyan,borderRadius:4,yAxisID:"y1"}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{position:"left",ticks:{callback:v=>"$"+v}},y1:{position:"right",grid:{drawOnChartArea:false},ticks:{callback:v=>v+"%"}}},plugins:{legend:{position:"bottom",labels:{font:{size:10},boxWidth:10}}}}});
      }
    }
    if(impTab==="environment"&&ps.length>0){
      if(carbonData.some(d=>d.ep>0||d.conv>0)){
        destroyChart('imp-carbon-bar');
        const cv=document.getElementById('imp-carbon-bar');
        if(cv) impactCharts['imp-carbon-bar']=new Chart(cv,{type:"bar",data:{labels:carbonData.map(d=>d.name),datasets:[{label:"Conventional equiv.",data:carbonData.map(d=>d.conv),backgroundColor:IC.borderGray,borderRadius:4},{label:"EcoPrefab actual",data:carbonData.map(d=>d.ep),backgroundColor:IC.green,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{font:{size:10},boxWidth:10}}}}});
      }
      if(matData.length>0){
        destroyChart('imp-mat-bar');
        const cv=document.getElementById('imp-mat-bar');
        if(cv) impactCharts['imp-mat-bar']=new Chart(cv,{type:"bar",data:{labels:matData.map(d=>d.name),datasets:[{label:"kg",data:matData.map(d=>d.kg),backgroundColor:matData.map(d=>d.color),borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v>=1000?(v/1000).toFixed(0)+"t":v}}}}});
      }
    }
  });
}

function addImpactCostSection(){
  const label=(document.getElementById('new-cost-sec-label')?.value||'').trim();
  if(!label){alert('Section label required.');return;}
  const key=label.toLowerCase().replace(/[^a-z0-9]+/g,'_');
  if(impactCostSections.find(s=>s.key===key)){alert('A section with this key already exists.');return;}
  impactCostSections.push({key,label});
  SP.scheduleSave('settings');
  renderImpact();
}
function addSDG(){
  const no=parseInt(document.getElementById('sdg-no').value);
  const label=(document.getElementById('sdg-label').value||"").trim();
  const color=document.getElementById('sdg-color').value||"#3B6D11";
  if(!no||!label){alert("SDG number and label required.");return;}
  impactSettings.sdgGoals.push({no,label,color});
  renderImpact();
}
function addAdditionality(){
  const l=(document.getElementById('add-label').value||"").trim();
  const v=(document.getElementById('add-value').value||"").trim();
  if(!l){alert("Label required.");return;}
  impactSettings.additionality.push({l,v});
  renderImpact();
}

