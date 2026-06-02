const C={clay:"#C4622D",clayL:"#E8895A",clayP:"#F5E4D8",forest:"#2C4A2E",moss:"#4A7C59",sage:"#8BAF7C",sageP:"#E8F2E3",charcoal:"#1E1E1A",stone:"#5C5850",sand:"#BFB89E",parchment:"#F2EDE4",cream:"#FAF8F4",rule:"#DDD8CD",j4:"#2b4a7a",j4p:"#dde8f5",cr3:"#7a2b4a",cr3p:"#f5dde8"};

// ─── STATE ────────────────────────────────────────────────────────
let S={
  currency:"UGX",rate:3550,
  activeDiv:"All",      // "All" | "EcoPrefab" | "Bespoke"
  bv:"All",             // building view: "All" or a building key
  projects:{
    Kibuye:{label:"Kibuye",pc:"KSS",desc:"Kibuye EcoPrefab site",div:"EcoPrefab"},
    Budondo:{label:"Budondo",pc:"SSS",desc:"Budondo EcoPrefab site",div:"EcoPrefab"}
  },
  sections:["Preliminaries","Substructure","Structural Frame","Roof Construction","Mechanical","Windows & Doors"],
  stages:["Preliminaries","Excavations","Substructure","Structural Frame","Roof Construction","Mechanical","Finishing"],
  bldgs:{J4:{area:121.576,desc:"Building type J4",div:"EcoPrefab"},CR3:{area:121.576,desc:"Building type CR3",div:"EcoPrefab"}},
  // CO2 emission factors: value = tCO2e per PURCHASE UNIT (already converted)
  // e.g. cem1: 50kg bag × 0.9 tCO2/t = 0.045 tCO2/bag
  co2:{
    cem1:{v:0.045,label:"Cement CEM I",unit:"tCO2/bag",desc:"50kg bag × 900 kg CO2/t = 0.045 tCO2/bag. Source: IPCC 2006."},
    cem2:{v:0.039,label:"Cement CEM II",unit:"tCO2/bag",desc:"50kg bag × 780 kg CO2/t = 0.039 tCO2/bag. Source: EN 197-1."},
    cem4:{v:0.030,label:"Cement CEM IV",unit:"tCO2/bag",desc:"50kg bag × 600 kg CO2/t = 0.030 tCO2/bag. Source: IStructE 2012."},
    rebar:{v:0.0925,label:"Reinforcing steel rebar",unit:"tCO2/piece",desc:"~50kg/piece × 1.85 tCO2/t = 0.0925 tCO2/piece. Source: World Steel Assoc 2021."},
    galv:{v:0.131,label:"Galvanised steel sheet",unit:"tCO2/sheet",desc:"8×4ft×2mm ≈ 46.8kg × 2.8 tCO2/t = 0.131 tCO2/sheet. Source: Bath ICE v3."},
    ppaz:{v:0.00793,label:"PPAZ roofing sheet",unit:"tCO2/linear metre",desc:"0.9m wide × 0.4mm × 7850 kg/m³ × 2.8 tCO2/t ≈ 0.00793 tCO2/m. Source: Bath ICE v3."},
    lime:{v:0.01875,label:"Hydrated lime",unit:"tCO2/bag",desc:"25kg bag × 0.75 tCO2/t = 0.01875 tCO2/bag. Source: IEA 2018."},
    timber:{v:0.000790,label:"Kiln-dried timber (piece)",unit:"tCO2/piece (net)",desc:"Avg piece 0.0158m³. Emit: 0.0158×0.05=0.00079 tCO2. Seq: −0.0158×0.9=−0.01422 tCO2. Net: −0.01343 tCO2/piece. IPCC 2006.",seq:-0.01422},
    agg:{v:0.04,label:"Aggregates/hardcore",unit:"tCO2/trip",desc:"~8 tonnes/trip × 5 kg CO2/t = 0.04 tCO2/trip. Source: Bath ICE v3."},
    hcb:{v:0.00012,label:"Hollow concrete block",unit:"tCO2/block",desc:"~12kg × 10 kg CO2/kg ≈ 0.00012 tCO2/block. Estimated from mix data."}
  },
  // Extra material unit weights (for reference / display only, factors above do the actual calc)
  unitWeights:[
    {id:"w1",label:"Cement bag",value:50,unit:"kg/bag",desc:"Standard East Africa cement bag"},
    {id:"w2",label:"Lime bag",value:25,unit:"kg/bag",desc:"Hydrated lime bag weight"},
    {id:"w3",label:"Pine piece (avg)",value:0.0158,unit:"m3/piece",desc:"Avg volume per sawn pine piece"},
    {id:"w4",label:"Rebar piece (H-10/H-12)",value:50,unit:"kg/piece",desc:"Approx mass per 6m rebar bar"},
    {id:"w5",label:"Hardcore trip",value:8,unit:"t/trip",desc:"Approx payload per lorry trip"},
    {id:"w6",label:"Galv. sheet (8x4x2mm)",value:46.8,unit:"kg/sheet",desc:"Mass of standard galvanised sheet"}
  ],
  // Seed School baseline CO2 parameters — fully editable
  seedSchool:{
    ratePerM2:0.219, // tCO2e per m² — default 53.2t / 243.15m² = 0.219 tCO2e/m²
    cement:40.6,     // t cement used (reference, not used in calculation)
    hcb:4000,        // HCB blocks (reference)
    steel:12.6,      // t steel (reference)
    desc:"Equivalent concrete block school: cement plaster, RC foundations & slab, steel roof trusses. No timber, no sequestration. Default 0.219 tCO2e/m² (from 53.2t / 243.15m² ref building)."
  },
  // Material unit options — shown as datalist in add/edit modal
  unitOptions:["Bag","Pcs","Item","Kgs","Tonnes","m2","m3","Metre","lm","Trip","Roll","Litre","Box","Pkt","Bundle","Set","Sheet","Pair","Tin","Bucket"]
};

let materials=[
  {id:"M001",name:'HCB 4" Blocks',cat:"Bricks/Blocks",sec:"Substructure",stg:"Substructure",sup:"Multiple Industries Ltd",unit:"Pcs",qty:424,up:2909.88,tot:1233789,pc:"KSS",bld:"J4",div:"EcoPrefab",dt:"2025-11-29",lab:false,co2key:"hcb",co2custom:null},
  {id:"M002",name:'HCB 6" Blocks',cat:"Bricks/Blocks",sec:"Substructure",stg:"Substructure",sup:"Multiple Industries Ltd",unit:"Pcs",qty:38,up:4012,tot:152456,pc:"KSS",bld:"CR3",div:"EcoPrefab",dt:"2025-11-29",lab:false,co2key:"hcb",co2custom:null},
  {id:"M003",name:"Cement CEM I",cat:"Cement",sec:"Substructure",stg:"Substructure",sup:"Apollo Hardware",unit:"Bag",qty:65,up:45000,tot:2925000,pc:"KSS",bld:"All",div:"EcoPrefab",dt:"2025-12-09",lab:false,co2key:"cem1",co2custom:null},
  {id:"M004",name:"Cement CEM II",cat:"Cement",sec:"Substructure",stg:"Substructure",sup:"Apollo Hardware",unit:"Bag",qty:200,up:31000,tot:6200000,pc:"KSS",bld:"All",div:"EcoPrefab",dt:"2025-11-29",lab:false,co2key:"cem2",co2custom:null},
  {id:"M005",name:"Cement CEM II",cat:"Cement",sec:"Substructure",stg:"Substructure",sup:"Apollo Hardware",unit:"Bag",qty:75,up:30000,tot:2250000,pc:"SSS",bld:"All",div:"EcoPrefab",dt:"2025-12-09",lab:false,co2key:"cem2",co2custom:null},
  {id:"M006",name:"Cement CEM IV",cat:"Cement",sec:"Substructure",stg:"Substructure",sup:"Apollo Hardware",unit:"Bag",qty:60,up:29500,tot:1770000,pc:"SSS",bld:"All",div:"EcoPrefab",dt:"2026-02-11",lab:false,co2key:"cem4",co2custom:null},
  {id:"M007",name:"Hardcore",cat:"Hardcore/Aggregates",sec:"Substructure",stg:"Substructure",sup:"MM Mining",unit:"Trip",qty:198,up:52000,tot:10280160,pc:"KSS",bld:"All",div:"EcoPrefab",dt:"2025-12-10",lab:false,co2key:"agg",co2custom:null},
  {id:"M008",name:"Lake Sand",cat:"Hardcore/Aggregates",sec:"Substructure",stg:"Substructure",sup:"MM Mining",unit:"Trip",qty:25,up:90080,tot:2252000,pc:"KSS",bld:"All",div:"EcoPrefab",dt:"2025-12-15",lab:false,co2key:"agg",co2custom:null},
  {id:"M009",name:"H-10 Steel Bars",cat:"Reinforcing",sec:"Substructure",stg:"Substructure",sup:"Apollo Hardware",unit:"Pcs",qty:85,up:27000,tot:2295000,pc:"KSS",bld:"All",div:"EcoPrefab",dt:"2025-12-05",lab:false,co2key:"rebar",co2custom:null},
  {id:"M010",name:"H-12 Steel Bars",cat:"Reinforcing",sec:"Substructure",stg:"Substructure",sup:"Apollo Hardware",unit:"Pcs",qty:82,up:35000,tot:2870000,pc:"SSS",bld:"All",div:"EcoPrefab",dt:"2025-12-08",lab:false,co2key:"rebar",co2custom:null},
  {id:"M011",name:"Kiln Dried Pine 46x96x3.6M",cat:"Wall Panels",sec:"Structural Frame",stg:"Structural Frame",sup:"Busoga Forestry",unit:"Pcs",qty:722,up:15532,tot:11214349,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2025-10-31",lab:false,co2key:"timber",co2custom:null},
  {id:"M012",name:"Kiln Dried Pine 46x71x3.6M",cat:"Wall Panels",sec:"Structural Frame",stg:"Structural Frame",sup:"Busoga Forestry",unit:"Pcs",qty:1068,up:11487,tot:12268436,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2025-10-31",lab:false,co2key:"timber",co2custom:null},
  {id:"M013",name:"Kiln Dried Pine 46x146x3.6M",cat:"Wall Panels",sec:"Structural Frame",stg:"Structural Frame",sup:"Busoga Forestry",unit:"Pcs",qty:143,up:23622,tot:3378006,pc:"NABL",bld:"J4",div:"EcoPrefab",dt:"2025-10-31",lab:false,co2key:"timber",co2custom:null},
  {id:"M014",name:"Kiln Dried Pine 46x146x4.2M",cat:"Wall Panels",sec:"Structural Frame",stg:"Structural Frame",sup:"Busoga Forestry",unit:"Pcs",qty:145,up:27560,tot:3996212,pc:"NABL",bld:"CR3",div:"EcoPrefab",dt:"2025-10-31",lab:false,co2key:"timber",co2custom:null},
  {id:"M015",name:"Hydrated Lime for Infill Blocks",cat:"Infill Blocks",sec:"Structural Frame",stg:"Structural Frame",sup:"AUM Limited",unit:"Bag",qty:160,up:24000,tot:3840000,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2025-12-17",lab:false,co2key:"lime",co2custom:null},
  {id:"M016",name:"Cement CEM IV for Infill Blocks",cat:"Infill Blocks",sec:"Structural Frame",stg:"Structural Frame",sup:"AUM Limited",unit:"Bag",qty:100,up:29500,tot:2950000,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2026-01-28",lab:false,co2key:"cem4",co2custom:null},
  {id:"M017",name:"Coarse Saw Dust (Infill)",cat:"Infill Blocks",sec:"Structural Frame",stg:"Structural Frame",sup:"AUM Limited",unit:"Bag",qty:398,up:5000,tot:1990000,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2026-01-22",lab:false,co2key:"",co2custom:null},
  {id:"M018",name:"Fine Saw Dust (Infill)",cat:"Infill Blocks",sec:"Structural Frame",stg:"Structural Frame",sup:"AUM Limited",unit:"Bag",qty:272,up:5000,tot:1360000,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2026-01-23",lab:false,co2key:"",co2custom:null},
  {id:"M019",name:"Hydrated Lime 2nd batch",cat:"Infill Blocks",sec:"Structural Frame",stg:"Structural Frame",sup:"AUM Limited",unit:"Bag",qty:90,up:24072,tot:2166480,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2026-03-02",lab:false,co2key:"lime",co2custom:null},
  {id:"M020",name:"Cement CEM IV Infill 2nd",cat:"Infill Blocks",sec:"Structural Frame",stg:"Structural Frame",sup:"AUM Limited",unit:"Bag",qty:150,up:30500,tot:4575000,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2026-02-10",lab:false,co2key:"cem4",co2custom:null},
  {id:"M021",name:"Galvanized Sheet 8x4x2mm",cat:"Steel",sec:"Structural Frame",stg:"Structural Frame",sup:"Erianah Glass",unit:"Pcs",qty:34,up:288999,tot:9825990,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2025-12-18",lab:false,co2key:"galv",co2custom:null},
  {id:"M022",name:"Angle Iron 60x60x4mm",cat:"Steel",sec:"Structural Frame",stg:"Structural Frame",sup:"Erianah Glass",unit:"Pcs",qty:42,up:106799,tot:4485576,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2026-03-06",lab:false,co2key:"",co2custom:null},
  {id:"M023",name:"Boric Acid Powder",cat:"Timber Treatment",sec:"Structural Frame",stg:"Structural Frame",sup:"Busoga Forestry",unit:"Kgs",qty:250,up:7200,tot:1800000,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2025-11-19",lab:false,co2key:"",co2custom:null},
  {id:"M024",name:"PPAZ Corrugated 0.4mm",cat:"Roofing",sec:"Roof Construction",stg:"Roof Construction",sup:"Roofings Uganda",unit:"Metre",qty:962,up:24250,tot:23328673,pc:"SSS",bld:"All",div:"EcoPrefab",dt:"2026-03-11",lab:false,co2key:"ppaz",co2custom:null},
  {id:"M025",name:"Round Iron Bars 16mm",cat:"Reinforcing",sec:"Roof Construction",stg:"Roof Construction",sup:"Doshi Hardware",unit:"Pcs",qty:25,up:45500,tot:1137490,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2026-02-23",lab:false,co2key:"rebar",co2custom:null},
  {id:"M026",name:"20mm PVC Conduit",cat:"Electrical",sec:"Mechanical",stg:"Mechanical",sup:"A1 Electricals",unit:"Pcs",qty:130,up:3776,tot:490880,pc:"SSS",bld:"All",div:"EcoPrefab",dt:"2026-01-20",lab:false,co2key:"",co2custom:null},
  {id:"M027",name:"MCB Distribution Board",cat:"Electrical",sec:"Mechanical",stg:"Mechanical",sup:"A1 Electricals",unit:"Pcs",qty:6,up:182900,tot:1097400,pc:"SSS",bld:"All",div:"EcoPrefab",dt:"2026-01-20",lab:false,co2key:"",co2custom:null},
  {id:"L001",name:"Site Setup Labour — Kibuye",cat:"Labour",sec:"Preliminaries",stg:"Preliminaries",sup:"KSS Trade Leader",unit:"Item",qty:1,up:9836952,tot:9836952,pc:"KSS",bld:"All",div:"EcoPrefab",dt:"2025-11-01",lab:true,co2key:"",co2custom:null},
  {id:"L002",name:"Site Setup Labour — Budondo",cat:"Labour",sec:"Preliminaries",stg:"Preliminaries",sup:"SSS Trade Leader",unit:"Item",qty:1,up:9128952,tot:9128952,pc:"SSS",bld:"All",div:"EcoPrefab",dt:"2025-11-01",lab:true,co2key:"",co2custom:null},
  {id:"L003",name:"Foundations Labour",cat:"Labour",sec:"Substructure",stg:"Substructure",sup:"KSS Site Team",unit:"Item",qty:1,up:3500000,tot:3500000,pc:"KSS",bld:"All",div:"EcoPrefab",dt:"2025-12-01",lab:true,co2key:"",co2custom:null},
  {id:"L004",name:"Frame Erection Labour",cat:"Labour",sec:"Structural Frame",stg:"Structural Frame",sup:"Tenet Ventures",unit:"Item",qty:1,up:8000000,tot:8000000,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2025-12-15",lab:true,co2key:"",co2custom:null},
  {id:"L005",name:"Infill Block Making Labour",cat:"Labour",sec:"Structural Frame",stg:"Structural Frame",sup:"NABL Site Team",unit:"Item",qty:1,up:2500000,tot:2500000,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2026-01-15",lab:true,co2key:"",co2custom:null},
  {id:"L006",name:"Roofing Labour",cat:"Labour",sec:"Roof Construction",stg:"Roof Construction",sup:"NABL Site Team",unit:"Item",qty:1,up:3200000,tot:3200000,pc:"NABL",bld:"All",div:"EcoPrefab",dt:"2026-03-01",lab:true,co2key:"",co2custom:null}
];

let products=[
  {id:"P001",name:"Infill Block",desc:"Lime-cement-sawdust block",unit:"Block",qty:1200,stg:"Structural Frame",starred:true,ings:[{mid:"M015",qpu:0.208,note:"Lime"},{mid:"M016",qpu:0.13,note:"CEM IV"},{mid:"M017",qpu:0.517,note:"Coarse sawdust"},{mid:"M018",qpu:0.353,note:"Fine sawdust"}],labs:["L005"]},
  {id:"P002",name:"Wall Panel (Pine)",desc:"Kiln-dried pine structural panel",unit:"m2",qty:486,stg:"Structural Frame",starred:true,ings:[{mid:"M011",qpu:1.485,note:"Pine 46x96"},{mid:"M012",qpu:2.197,note:"Pine 46x71"}],labs:["L004"]}
];

let editingMatId=null, editingProdId=null, editingIngredients=[], editingLabIds=[];
let matFilter={sec:"",cat:"",search:"",type:"",proj:"",bld:"",div:""};
let monthModal=null; // currently open month key
