// ─── CSV ─────────────────────────────────────────────────────────────
function dlTemplate(){
  const hdr='id,name,cat,sec,stg,sup,unit,qty,up,tot,pc,bld,div,dt,lab,co2key,co2custom,transport_id,lc_stage';
  const pcs=[...Object.values(S.projects).map(p=>p.pc),'NABL'].join('|');
  const rows=[
    '# Localworks Project Evaluations — Export (add rows below the header, then re-upload)',
    `# Generated: ${new Date().toISOString().slice(0,10)} | Project codes: ${pcs} | CO2 keys: ${Object.keys(S.co2).join('|')} | custom`,
    '# Lifecycle stages (EN15978): A1-A3, A4, A5, B1, B2, B4, C1, C2, C3, C4',
    hdr,
    ...materials.map(m=>[
      m.id,
      '"'+String(m.name||'').replace(/"/g,'""')+'"',
      m.cat||'',m.sec||'',m.stg||'',
      '"'+String(m.sup||'').replace(/"/g,'""')+'"',
      m.unit||'',m.qty||0,m.up||0,m.tot||0,
      m.pc||'',m.bld||'All',m.div||'EcoPrefab',m.dt||'',
      m.lab?'true':'false',m.co2key||'',
      m.co2custom!=null?m.co2custom:'',
      m.transport_id||'',m.lc_stage||'A1-A3'
    ].join(','))
  ];
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));
  a.download=`localworks_export_${new Date().toISOString().slice(0,10)}.csv`;a.click();
}


function parseCSVLine(line){
  const out=[];let cur='';let q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}
    else if(c===','&&!q){out.push(cur.trim());cur='';}
    else cur+=c;
  }
  out.push(cur.trim());return out;
}
function handleCSV(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const allLines=ev.target.result.split('\n').map(l=>l.trim()).filter(Boolean);
      const dataLines=allLines.filter(l=>!l.startsWith('#'));
      if(dataLines.length<2){showCSVMsg('No data rows found. Keep the # comment lines but make sure there is a header row starting with "id,name,..."',false);return;}
      let hdrIdx=0;
      for(let i=0;i<Math.min(5,dataLines.length);i++){
        if(/^id[,\s]/i.test(dataLines[i])){hdrIdx=i;break;}
      }
      const hdrs=parseCSVLine(dataLines[hdrIdx]).map(h=>h.toLowerCase().trim());
      if(!hdrs.includes('name')){showCSVMsg('Header row not found. File must have a row starting with: id,name,cat,...',false);return;}
      let added=0,updated=0,skipped=0;
      dataLines.slice(hdrIdx+1).forEach(line=>{
        if(!line||line.startsWith('#'))return;
        const vs=parseCSVLine(line);
        const r={};hdrs.forEach((h,i)=>{r[h]=(vs[i]||'').trim();});
        r.qty=parseFloat(r.qty)||0;r.up=parseFloat(r.up)||0;
        r.tot=parseFloat(r.tot)||(r.qty*r.up);
        r.lab=r.lab==='true'||r.lab==='1';
        r.bld=r.bld||'All';r.co2key=r.co2key||'';
        r.co2custom=r.co2custom?parseFloat(r.co2custom):null;
        r.div=r.div||'EcoPrefab';
        r.transport_id=r.transport_id||'';r.lc_stage=r.lc_stage||'A1-A3';
        if(!r.name){skipped++;return;}
        if(!r.id)r.id=gid(r.lab?'L':'M');
        const idx=materials.findIndex(m=>m.id===r.id);
        if(idx>-1){materials[idx]={...materials[idx],...r};updated++;}
        else{materials.push(r);added++;}
      });
      showCSVMsg(`Imported: ${added} new, ${updated} updated${skipped?' | '+skipped+' skipped (no name)':''}.`,true);
      renderAll();
    }catch(err){showCSVMsg('CSV error: '+err.message,false);console.error('CSV:',err);}
  };
  reader.readAsText(file);input.value='';
}


function showCSVMsg(msg,ok){
  const el=document.getElementById('csv-msg-wrap');if(!el)return;
  el.innerHTML=`<div class="csv-msg" style="background:${ok?C.sageP:C.clayP};color:${ok?C.forest:C.clay}">${msg}<button onclick="this.parentElement.remove()">✕</button></div>`;
}

