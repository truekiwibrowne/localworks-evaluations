// ─── CO2 CALCULATION ─────────────────────────────────────────────────
// Each material now stores co2key (pointing to S.co2 factor) or co2custom (tCO2e per unit)
// For "timber" key, the factor.seq stores the sequestration per unit (negative)
// Building split: if bld==="All", divide qty by number of buildings for per-building view

// Returns the fraction [0..1] of a material's qty/cost attributable to targetBld.
// Replaces duplicated floor-area proportional logic in calcCO2 and effectiveTot.
function allocateFraction(m, targetBld) {
  if (!targetBld || targetBld === "All") return 1;
  const bldStr = m.bld || "All";
  if (bldStr === "All") {
    const ta = Object.values(S.bldgs).reduce((a, x) => a + x.area, 0);
    const ba = S.bldgs[targetBld]?.area || (ta / Math.max(Object.keys(S.bldgs).length, 1));
    return ta > 0 ? ba / ta : 1;
  }
  const blds = bldStr.split(",").map(x => x.trim()).filter(Boolean);
  if (blds.length === 1) return blds[0] === targetBld ? 1 : 0;
  if (!blds.includes(targetBld)) return 0;
  const la = blds.reduce((a, k) => a + (S.bldgs[k]?.area || 0), 0);
  const ba = S.bldgs[targetBld]?.area || 0;
  return la > 0 ? ba / la : 1 / blds.length;
}

function calcCO2(m, targetBld) {
  if (m.lab) return {e:0, q:0};
  const qty = m.qty * allocateFraction(m, targetBld);
  let e = 0, q = 0;
  if (m.co2key === "custom" && m.co2custom) {
    e = qty * m.co2custom;
  } else if (m.co2key && S.co2[m.co2key]) {
    const f = S.co2[m.co2key];
    e = qty * f.v;
    if (f.seq) q = qty * Math.abs(f.seq);
  }
  // Transport CO2 distribution: add proportional share of linked transport entry
  if (m.transport_id && m.transport_id !== '') {
    const t = materials.find(x => x.id === m.transport_id && !x.lab);
    if (t) {
      const te = calcCO2Base(t, null).e;
      const linked = materials.filter(x => (x.transport_id || '') === m.transport_id);
      const totalCost = linked.reduce((a, x) => a + (x.tot || 0), 0);
      const share = totalCost > 0 ? (m.tot || 0) / totalCost : 1 / Math.max(linked.length, 1);
      e += te * share;
    }
  }
  return {e: Math.max(0, e), q: Math.max(0, q)};
}

function calcCO2Base(m, targetBld) {
  // Non-recursive base calculation used for transport lookup
  if (m.lab) return {e:0, q:0};
  const qty = m.qty || 0; let e = 0, q = 0;
  if (m.co2key === 'custom' && m.co2custom) { e = qty * m.co2custom; }
  else if (m.co2key && S.co2[m.co2key]) { const f = S.co2[m.co2key]; e = qty * f.v; if (f.seq) q = qty * Math.abs(f.seq); }
  return {e: Math.max(0, e), q: Math.max(0, q)};
}

// ─── FORMATTING ──────────────────────────────────────────────────────
function fmt(ugx) {
  if (ugx === null || ugx === undefined) return "—";
  if (S.currency === "USD") { const u = ugx / S.rate; return u >= 1e6 ? `$${(u/1e6).toFixed(2)}M` : u >= 1e3 ? `$${(u/1e3).toFixed(1)}K` : `$${u.toFixed(0)}`; }
  return ugx >= 1e6 ? `${(ugx/1e6).toFixed(2)}M UGX` : ugx >= 1e3 ? `${(ugx/1e3).toFixed(1)}K UGX` : `${ugx.toFixed(0)} UGX`;
}
function fco2(v) { return v >= 1 ? `${v.toFixed(2)} t` : v > 0 ? `${(v*1000).toFixed(1)} kg` : "—"; }
function fnum(n) { return (n || 0).toLocaleString(undefined, {maximumFractionDigits: 0}); }
function gid(prefix) { const n = materials.filter(m => m.id.startsWith(prefix)).length; return `${prefix}${String(n+1).padStart(3, "0")}`; }
function newWid() { const n = S.unitWeights.length; return `w${n+1}`; }

// ─── FILTER / STATS ──────────────────────────────────────────────────
function projFilter(m) {
  if (S.activeDiv === "All") return true;
  const mDiv = m.div || "EcoPrefab";
  if (mDiv !== S.activeDiv) return false;
  return true;
}
function allPcs() { return Object.values(S.projects).map(p => p.pc); }
function divProjects() {
  if (S.activeDiv === "All") return S.projects;
  return Object.fromEntries(Object.entries(S.projects).filter(([,p]) => (p.div || "EcoPrefab") === S.activeDiv));
}
function divBldgs() {
  if (S.activeDiv === "All") return S.bldgs;
  return Object.fromEntries(Object.entries(S.bldgs).filter(([,b]) => (b.div || "EcoPrefab") === S.activeDiv));
}
function bldFilter(m, b) {
  b = b || S.bv;
  if (b === "All") return true;
  if (!m.bld || m.bld === "All") return true;
  return m.bld.split(",").map(x => x.trim()).includes(b);
}

function effectiveTot(m, b) {
  return m.tot * allocateFraction(m, b || "All");
}

function calcStats(b) {
  const ms = materials.filter(m => !m.lab && projFilter(m) && bldFilter(m, b));
  const ls = materials.filter(m => m.lab && projFilter(m) && bldFilter(m, b));
  const tM = ms.reduce((a, m) => a + effectiveTot(m, b), 0);
  const tL = ls.reduce((a, m) => a + effectiveTot(m, b), 0);
  let e = 0, q = 0;
  ms.forEach(m => { const c = calcCO2(m, b); e += c.e; q += c.q; });
  // bS: keyed by section — include ALL defined sections (even if 0)
  const bS = {};
  S.sections.forEach(s => { bS[s] = {mat:0, lab:0}; });
  ms.forEach(m => { const s = m.sec || "Other"; if (!bS[s]) bS[s] = {mat:0, lab:0}; bS[s].mat += effectiveTot(m, b); });
  ls.forEach(m => { const s = m.sec || "Other"; if (!bS[s]) bS[s] = {mat:0, lab:0}; bS[s].lab += effectiveTot(m, b); });
  // lS: keyed by stage — include ALL defined stages (even if 0)
  const lS = {};
  S.stages.forEach(s => { lS[s] = {mat:0, lab:0}; });
  ms.forEach(m => { const k = m.stg || m.sec || "Other"; if (!lS[k]) lS[k] = {mat:0, lab:0}; lS[k].mat += effectiveTot(m, b); });
  ls.forEach(m => { const k = m.stg || m.sec || "Other"; if (!lS[k]) lS[k] = {mat:0, lab:0}; lS[k].lab += effectiveTot(m, b); });
  const mo = {};
  [...ms, ...ls].forEach(m => { const k = (m.dt || "").slice(0, 7) || "?"; if (!mo[k]) mo[k] = 0; mo[k] += effectiveTot(m, b); });
  return {tM, tL, tot: tM+tL, e, q, net: e-q, bS, lS, mo};
}
