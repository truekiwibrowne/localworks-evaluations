// ─── BUILDING / PROJECT CRUD ─────────────────────────────────────────
function addBuilding(){
  const key=(document.getElementById('new-bld-key').value||'').trim().toUpperCase();
  const area=parseFloat(document.getElementById('new-bld-area').value)||0;
  const div=document.getElementById('new-bld-div')?.value||'EcoPrefab';
  const desc=document.getElementById('new-bld-desc').value.trim();
  if(!key||!area){alert("Key and area are required.");return;}
  if(S.bldgs[key]){alert(`Building "${key}" already exists.`);return;}
  S.bldgs[key]={area,desc,div};
  renderAll();
}
function delBuilding(k){
  if(!confirm(`Delete building "${k}"? Materials tagged "${k}" will remain but won't match any building filter.`))return;
  delete S.bldgs[k];
  if(S.bv===k)S.bv="All";
  renderAll();
}
function addProject(){
  const key=(document.getElementById('new-proj-key').value||'').trim();
  const pc=(document.getElementById('new-proj-pc').value||'').trim().toUpperCase();
  const div=document.getElementById('new-proj-div')?.value||'EcoPrefab';
  const label=(document.getElementById('new-proj-label').value||'').trim();
  const desc=(document.getElementById('new-proj-desc').value||'').trim();
  if(!key||!pc||!label){alert("Key, PC and Label are required.");return;}
  if(S.projects[key]){alert(`Project "${key}" already exists.`);return;}
  S.projects[key]={pc,label,desc,div};
  renderAll();
}
function delProject(k){
  if(!confirm(`Delete project "${S.projects[k]?.label}"?`))return;
  delete S.projects[k];
  if(S.activeProject===k)S.activeProject="All";
  renderAll();
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPACT DASHBOARD — State, Data & Rendering
// ═══════════════════════════════════════════════════════════════════════════

// Impact projects — independent of cost-tracker materials
let impactProjects = [];
// Flexible cost sections for impact projects — stored in LW_Settings
// Users can add/rename/remove sections in Impact Settings
let impactCostSections = [
  {key:"preliminaries",  label:"Preliminaries"},
  {key:"substructure",   label:"Substructure"},
  {key:"structural_frame",label:"Structural Frame & Panels"},
  {key:"windows",        label:"Windows"},
  {key:"doors",          label:"Doors"},
  {key:"mechanical",     label:"Mechanical & Electrical"},
  {key:"roof",           label:"Roof Construction"},
  {key:"labour",         label:"Labour"},
  {key:"other",          label:"Other / Variations"},
];
let impactSettings = {
  ugxUsd: 3700,
  targets: {
    revenue_usd: 1800000,
    classrooms: 100,
    buildings: 300,
    people: 18000,
    jobs: 1000,
    trees: 72000,
    co2_saved: 1071,
    water_litres: 8100000,
    cost_per_sqm_usd: 500,
    foresters_income_usd: 295900,
    lime_income_usd: 177500,
  },
  sdgGoals: [
    {no:1,label:"No Poverty",color:"#E5243B"},
    {no:2,label:"Zero Hunger",color:"#DDA63A"},
    {no:3,label:"Good Health",color:"#4C9F38"},
    {no:5,label:"Gender Equality",color:"#FF3A21"},
    {no:6,label:"Clean Water",color:"#26BDE2"},
    {no:7,label:"Clean Energy",color:"#FCC30B"},
    {no:8,label:"Decent Work",color:"#A21942"},
    {no:9,label:"Innovation",color:"#FD6925"},
    {no:11,label:"Sustainable Cities",color:"#FD9D24"},
    {no:13,label:"Climate Action",color:"#3F7E44"},
  ],
  additionality: [
    {l:"Regenerative material use",v:"75% less embodied carbon vs conventional"},
    {l:"No fired bricks",v:"Zero deforestation for brick-firing"},
    {l:"Local supply chain",v:"Sawdust, lime, FSC timber — all Uganda-sourced"},
    {l:"Circular economy",v:"Sawdust waste → infill blocks"},
    {l:"Technology transfer",v:"Training local craftsmen in EcoPrefab techniques"},
    {l:"Replicability",v:"Factory-based system scalable across East Africa"},
  ]
};

// Chart instances registry — destroy before redraw
