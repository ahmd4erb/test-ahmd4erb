// ==========================================
// main.js - ASGate CRM Dashboard PRO v2.0
// احترافي - سريع - متكامل
// ==========================================
import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, setDoc, getDoc, deleteDoc, writeBatch, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


let firestoreRawData = { visits: [], opportunities: [], sales: [], customers: [] };
let achievedChart, gaugeChart, pendingChart, staffChart;
let q1Chart, q2Chart, q3Chart, q4Chart;
let monthlyCompletedChart, monthlyVisitsChart;
let isEditingTargets = false;
const defaultMonthlyTarget = 15000;
let monthlyTargetsArr = Array(12).fill(defaultMonthlyTarget);
const monthsNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const monthsShort = ["ينا","فبر","مار","أبر","ماي","يون","يول","أغس","سبت","أكت","نوف","ديس"];
let oppCountEl, visitCountEl, salesValueEl, pendingValueEl, tbody;

const CRM_COLORS = { primary:'#0a3a22', accent:'#10b981', warning:'#f59e0b', info:'#3b82f6', danger:'#ef4444', palette:['#0a3a22','#10b981','#34d399','#6ee7b7','#059669','#047857','#065f46','#064e3b'] };

function debounce(fn, delay=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>{ try{fn(...a);}catch(e){console.error(e);} },delay); }; }
function parseDateParts(v){
 if(!v && v!==0) return {day:null,month:null,year:null};
 let d=null;
 try{
  if(typeof v==='number' && v>1000 && v<60000) d=new Date((v-25569)*86400*1000);
  else if(typeof v?.toDate==='function') d=v.toDate();
  else if(v && typeof v==='object' && v.seconds) d=new Date(v.seconds*1000);
  else if(v instanceof Date) d=v;
  else if(typeof v==='string'){
   const c=v.trim();
   if(c.includes('T')) d=new Date(c);
   else { const p=c.split(' ')[0].split(/[-/]/); if(p.length===3){ let [p0,p1,p2]=p; if(p0.length===4) return {year:p0,month:p1.padStart(2,'0'),day:p2.padStart(2,'0')}; else if(p2.length===4) return {year:p2,month:p1.padStart(2,'0'),day:p0.padStart(2,'0')}; } d=new Date(c); }
  }
  if(d && !isNaN(d.getTime())) return {year:d.getFullYear().toString(), month:(d.getMonth()+1).toString().padStart(2,'0'), day:d.getDate().toString().padStart(2,'0')};
 }catch(e){}
 return {day:null,month:null,year:null};
}
function parseMonthFromDate(s){ return parseDateParts(s).month; }
function parseYearFromDate(s){ return parseDateParts(s).year; }
function isDark(){ return document.body.classList.contains('dark-mode'); }
function generateHeatmapColors(vals, rgb){
 const isD=isDark(); const empty=isD?'#1e293b':'#f1f5f9'; const zero=isD?'#0f172a':'#f8fafc';
 if(!vals || vals.length===0) return Array(12).fill(empty);
 const max=Math.max(...vals); if(max===0) return Array(12).fill(empty);
 return vals.map(v=>{ if(v===0) return zero; const op=Math.min(1,Math.max(0.25,0.25+(0.75*(v/max)))); return `rgba(${rgb}, ${op})`; });
}
function getStoredTargets(){ try{ const s=localStorage.getItem('monthlyTargets'); if(s){ const p=JSON.parse(s); if(Array.isArray(p)&&p.length===12) return p; } }catch(e){} return monthlyTargetsArr; }
const saveTargetsToFirestore=debounce(async(arr)=>{
 updateSyncStatus('saving');
 try{ await setDoc(doc(db,"settings","monthlyTargets"),{values:arr,updatedAt:new Date().toISOString()},{merge:true}); updateSyncStatus('saved'); }catch(e){ console.error(e); updateSyncStatus('error'); }
},800);
function saveStoredTargets(arr){ monthlyTargetsArr=arr; try{localStorage.setItem('monthlyTargets',JSON.stringify(arr));}catch(e){} saveTargetsToFirestore(arr); }
function updateSyncStatus(st){
 const el=document.getElementById('syncStatus'); if(!el) return;
 el.classList.remove('sync-saving','sync-saved','sync-loading','sync-error');
 switch(st){
  case 'saving': el.innerHTML='<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'; el.classList.add('sync-saving'); break;
  case 'saved': el.innerHTML='<i class="fas fa-check"></i> تم الحفظ'; el.classList.add('sync-saved'); setTimeout(()=>{el.textContent=''; el.classList.remove('sync-saved');},3000); break;
  case 'loading': el.innerHTML='<i class="fas fa-sync fa-spin"></i> تحديث...'; el.classList.add('sync-loading'); break;
  case 'error': el.innerHTML='<i class="fas fa-exclamation-triangle"></i> خطأ'; el.classList.add('sync-error'); break;
  default: el.textContent=''; break;
 }
}
function initBlurToggle(){
 const btn=document.getElementById('toggleBlurBtn'); const tbl=document.querySelector('.yearly-table'); if(!btn||!tbl) return;
 try{ if(localStorage.getItem('tableBlurred')==='true'){ tbl.classList.add('is-blurred'); btn.classList.add('active'); const ic=document.getElementById('eyeIcon'); if(ic) ic.className='fas fa-eye'; } }catch(e){}
 btn.addEventListener('click',()=>{
  const b=tbl.classList.toggle('is-blurred'); btn.classList.toggle('active',b);
  const ic=document.getElementById('eyeIcon'); if(ic) ic.className=b?'fas fa-eye':'fas fa-eye-slash';
  try{localStorage.setItem('tableBlurred',b?'true':'false');}catch(e){}
 });
}
function initTargetEditToggle(){
 const btn=document.getElementById('editTargetBtn'); if(!btn) return;
 btn.addEventListener('click',()=>{
  isEditingTargets=!isEditingTargets; btn.classList.toggle('active',isEditingTargets);
  btn.innerHTML=isEditingTargets?'<i class="fas fa-check"></i>':'<i class="fas fa-pen"></i>';
  updateDashboard();
 });
}
function getChartDefaults(){ const d=isDark(); return {color:d?'#94a3b8':'#64748b', borderColor:d?'#1e293b':'#f1f5f9', font:{family:'Cairo',weight:'700',size:11}}; }
function initCharts(){
 const def=getChartDefaults(); Chart.defaults.color=def.color; Chart.defaults.borderColor=def.borderColor; Chart.defaults.font.family='Cairo';
 const ac=document.getElementById('achievedChart');
 if(ac){ achievedChart=new Chart(ac,{type:'doughnut', data:{labels:['مكتمل','متبقي'], datasets:[{data:[0,100], backgroundColor:[CRM_COLORS.accent, isDark()?'#1e293b':'#f1f5f9'], borderWidth:0, borderRadius:8, spacing:2, hoverOffset:4}]}, options:{cutout:'78%', responsive:true, maintainAspectRatio:false, animation:{animateRotate:true,duration:1200,easing:'easeOutQuart'}, plugins:{legend:{display:false}, tooltip:{backgroundColor:'#0f172a', padding:10, cornerRadius:10}}}}); }
 const gc=document.getElementById('gaugeChart');
 if(gc){ gaugeChart=new Chart(gc,{type:'doughnut', data:{labels:['إنجاز','متبقي'], datasets:[{data:[0,100], backgroundColor:[CRM_COLORS.primary, isDark()?'#1e293b':'#e2e8f0'], borderWidth:0, circumference:180, rotation:270, borderRadius:10, spacing:2}]}, options:{cutout:'75%', responsive:true, maintainAspectRatio:false, animation:{duration:1500}, plugins:{legend:{display:false}, tooltip:{enabled:false}}}}); }
 const pc=document.getElementById('pendingChart');
 if(pc){ pendingChart=new Chart(pc,{type:'doughnut', data:{labels:['معلق','متبقي'], datasets:[{data:[0,100], backgroundColor:[CRM_COLORS.warning, isDark()?'#1e293b':'#f1f5f9'], borderWidth:0, borderRadius:8, spacing:2}]}, options:{cutout:'78%', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}}); }
 ['q1','q2','q3','q4'].forEach((q,i)=>{ const ctx=document.getElementById(q+'Chart'); if(ctx){ const ch=new Chart(ctx,{type:'doughnut', data:{labels:['محقق','متبقي'], datasets:[{data:[0,100], backgroundColor:[CRM_COLORS.palette[i], isDark()?'#1e293b':'#f1f5f9'], borderWidth:0, borderRadius:6, spacing:2}]}, options:{cutout:'72%', responsive:true, maintainAspectRatio:false, animation:{duration:1000, delay:i*150}, plugins:{legend:{display:false}}}}); if(q==='q1') q1Chart=ch; if(q==='q2') q2Chart=ch; if(q==='q3') q3Chart=ch; if(q==='q4') q4Chart=ch; } });
 const mcc=document.getElementById('monthlyCompletedChart');
 if(mcc){ monthlyCompletedChart=new Chart(mcc,{type:'doughnut', data:{labels:monthsShort, datasets:[{data:Array(12).fill(0), backgroundColor:generateHeatmapColors(Array(12).fill(1),'16, 185, 129'), borderWidth:0, borderRadius:4, spacing:1}]}, options:{cutout:'62%', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}}); }
 const mvc=document.getElementById('monthlyVisitsChart');
 if(mvc){ monthlyVisitsChart=new Chart(mvc,{type:'doughnut', data:{labels:monthsShort, datasets:[{data:Array(12).fill(0), backgroundColor:generateHeatmapColors(Array(12).fill(1),'59, 130, 246'), borderWidth:0, borderRadius:4, spacing:1}]}, options:{cutout:'62%', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}}); }
 const sc=document.getElementById('staffChart');
 if(sc){ staffChart=new Chart(sc,{type:'bar', data:{labels:[], datasets:[{label:'مكتمل', data:[], backgroundColor:CRM_COLORS.accent, borderRadius:{topLeft:8,topRight:8}, barThickness:22},{label:'معلق', data:[], backgroundColor:CRM_COLORS.warning, borderRadius:{topLeft:8,topRight:8}, barThickness:22}]}, options:{responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, animation:{duration:1000}, plugins:{legend:{position:'top', align:'end', labels:{font:{family:'Cairo',weight:'700',size:11}, usePointStyle:true, pointStyle:'circle', padding:16}}, tooltip:{backgroundColor:'#0f172a', padding:12, cornerRadius:10}}, scales:{x:{grid:{display:false}, border:{display:false}}, y:{grid:{color:isDark()?'#1e293b':'#f1f5f9'}, border:{display:false}}}}}); }
}
function watchThemeChanges(){ window.addEventListener('themeChanged',()=>{ const d=getChartDefaults(); Chart.defaults.color=d.color; Chart.defaults.borderColor=d.borderColor; [achievedChart,gaugeChart,pendingChart,q1Chart,q2Chart,q3Chart,q4Chart,monthlyCompletedChart,monthlyVisitsChart,staffChart].forEach(c=>{ if(c) c.update(); }); }); }
function updateQuarterChart(chart,pctId,m1,m2,m3,target){ if(!chart) return; const total=(m1||0)+(m2||0)+(m3||0); const pct=target>0?Math.min(100,Math.round((total/target)*100)):0; chart.data.datasets[0].data=[pct,100-pct]; chart.update(); const el=document.getElementById(pctId); if(el){ el.textContent=pct+'%'; el.style.color=pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444'; } }
function updateCharts(comp,pend,total){
 const ach=total>0?Math.min(100,Math.round((comp/total)*100)):0; const pen=total>0?Math.min(100,Math.round((pend/total)*100)):0;
 if(achievedChart){ achievedChart.data.datasets[0].data=[ach,100-ach]; achievedChart.update(); }
 if(gaugeChart){ gaugeChart.data.datasets[0].data=[ach,100-ach]; gaugeChart.update(); }
 if(pendingChart){ pendingChart.data.datasets[0].data=[pen,100-pen]; pendingChart.update(); }
 const aE=document.getElementById('achievedPct'), pE=document.getElementById('pendingPct'), gE=document.getElementById('gaugePct'), aS=document.getElementById('achievedSubLabel'), pS=document.getElementById('pendingSubLabel');
 if(aE) aE.textContent=ach+'%'; if(pE) pE.textContent=pen+'%'; if(gE) gE.textContent=ach+'%';
 if(aS) aS.textContent=`${comp.toLocaleString('en-US')} / ${total.toLocaleString('en-US')}`; if(pS) pS.textContent=`${pend.toLocaleString('en-US')} / ${total.toLocaleString('en-US')}`;
}
function updateMonthlyDistributionCharts(salesArr,visitsArr){
 if(monthlyCompletedChart){ const v=salesArr.map(x=>x||0); monthlyCompletedChart.data.datasets[0].data=v.map(x=>x>0?x:0.5); monthlyCompletedChart.data.datasets[0].backgroundColor=generateHeatmapColors(v,'16, 185, 129'); monthlyCompletedChart.update(); }
 if(monthlyVisitsChart){ const v=visitsArr; monthlyVisitsChart.data.datasets[0].data=v.map(x=>x>0?x:0.5); monthlyVisitsChart.data.datasets[0].backgroundColor=generateHeatmapColors(v,'59, 130, 246'); monthlyVisitsChart.update(); }
}
function updateStaffChart(sales,visits,opps){
 if(!staffChart) return; const map={};
 sales.forEach(s=>{ const o=(s.owner||s.salesman||'غير محدد').trim()||'غير محدد'; if(!map[o]) map[o]={completed:0,pending:0}; map[o].completed+=(s.completedSum||0); map[o].pending+=(s.pendingSum||0); });
 const sorted=Object.entries(map).sort((a,b)=>(b[1].completed+b[1].pending)-(a[1].completed+a[1].pending)).slice(0,8);
 staffChart.data.labels=sorted.map(([n])=>n); staffChart.data.datasets[0].data=sorted.map(([,d])=>d.completed); staffChart.data.datasets[1].data=sorted.map(([,d])=>d.pending); staffChart.update();
}
function listenToFirestoreData(){
 updateSyncStatus('loading'); let loaded=0;
 ['visits','opportunities','sales','customers'].forEach(col=>{
  onSnapshot(collection(db,col),(snap)=>{ const arr=[]; snap.forEach(d=>{ const o=d.data(); o.id=d.id; arr.push(o); }); firestoreRawData[col]=arr; loaded++; if(loaded>=4) updateSyncStatus('saved'); updateDashboard(); },()=>{ updateSyncStatus('error'); });
 });
}
function applyFilters(){
 const year=document.getElementById('filterYear')?.value||'all'; const month=document.getElementById('filterMonth')?.value||'all'; const salesman=document.getElementById('filterSalesman')?.value||'all';
 let s=[...firestoreRawData.sales], v=[...firestoreRawData.visits], o=[...firestoreRawData.opportunities];
 if(year!=='all'){ s=s.filter(x=>parseYearFromDate(x.saleDate||x.createdAt)===year); v=v.filter(x=>parseYearFromDate(x.visitDate||x.date)===year); o=o.filter(x=>parseYearFromDate(x.oppDate||x.date)===year); }
 if(month!=='all'){ const mc=month.padStart(2,'0'); s=s.filter(x=>parseMonthFromDate(x.saleDate||x.createdAt)===mc); v=v.filter(x=>parseMonthFromDate(x.visitDate||x.date)===mc); o=o.filter(x=>parseMonthFromDate(x.oppDate||x.date)===mc); }
 if(salesman!=='all'){ const low=salesman.toLowerCase(); s=s.filter(x=>(x.owner||x.salesman||'').toLowerCase().includes(low)); v=v.filter(x=>(x.owner||'').toLowerCase().includes(low)); o=o.filter(x=>(x.owner||'').toLowerCase().includes(low)); }
 return {sales:s, visits:v, opportunities:o};
}
function updateDashboard(){
 const {sales,visits,opportunities}=applyFilters();
 let totalComp=0,totalPend=0; const monthlySales=Array(12).fill(0), monthlyVisits=Array(12).fill(0);
 sales.forEach(s=>{ const m=parseInt(parseMonthFromDate(s.saleDate||s.createdAt)||'0',10)-1; if(m>=0&&m<12) monthlySales[m]+=(s.completedSum||0); totalComp+=(s.completedSum||0); totalPend+=(s.pendingSum||0); });
 visits.forEach(v=>{ const m=parseInt(parseMonthFromDate(v.visitDate||v.date)||'0',10)-1; if(m>=0&&m<12) monthlyVisits[m]++; });
 const targets=getStoredTargets(); const totalTarget=targets.reduce((a,b)=>a+b,0);
 if(document.getElementById('yearlyTargetCardVal')) document.getElementById('yearlyTargetCardVal').textContent=totalTarget.toLocaleString('en-US');
 if(salesValueEl) salesValueEl.textContent=totalComp.toLocaleString('en-US');
 if(pendingValueEl) pendingValueEl.textContent=totalPend.toLocaleString('en-US');
 if(visitCountEl) visitCountEl.textContent=visits.length.toLocaleString('en-US');
 if(oppCountEl) oppCountEl.textContent=opportunities.length.toLocaleString('en-US');
 updateYearlyTable(sales,opportunities,visits); updateCharts(totalComp,totalPend,totalTarget); updateQuarterlyAnalysis(monthlySales,targets); updateMonthlyDistributionCharts(monthlySales,monthlyVisits); updateStaffChart(sales,visits,opportunities);
}
function updateQuarterlyAnalysis(monthlySalesArr,targets){
 const q1T=(targets[0]+targets[1]+targets[2])||45000, q2T=(targets[3]+targets[4]+targets[5])||45000, q3T=(targets[6]+targets[7]+targets[8])||45000, q4T=(targets[9]+targets[10]+targets[11])||45000;
 const avg=Math.round((q1T+q2T+q3T+q4T)/4);
 if(document.getElementById('quarterTitleHeader')) document.getElementById('quarterTitleHeader').innerText=`تحليل الأرباع (متوسط: ${Math.round(avg/1000)}k)`;
 updateQuarterChart(q1Chart,'q1Pct',monthlySalesArr[0],monthlySalesArr[1],monthlySalesArr[2],q1T);
 updateQuarterChart(q2Chart,'q2Pct',monthlySalesArr[3],monthlySalesArr[4],monthlySalesArr[5],q2T);
 updateQuarterChart(q3Chart,'q3Pct',monthlySalesArr[6],monthlySalesArr[7],monthlySalesArr[8],q3T);
 updateQuarterChart(q4Chart,'q4Pct',monthlySalesArr[9],monthlySalesArr[10],monthlySalesArr[11],q4T);
}
function updateYearlyTable(sales,opps,visits){
 if(!tbody) return; tbody.innerHTML=''; const targets=getStoredTargets();
 let totT=0,totC=0,totP=0,totV=0,totO=0;
 monthsNames.forEach((name,i)=>{
  const mc=(i+1).toString().padStart(2,'0');
  const mS=sales.filter(s=>parseMonthFromDate(s.saleDate||s.createdAt)===mc);
  const mO=opps.filter(o=>parseMonthFromDate(o.oppDate||o.date||o.visitDate)===mc);
  const mV=visits.filter(v=>parseMonthFromDate(v.visitDate||v.date||v.oppDate)===mc);
  let c=0,p=0; mS.forEach(s=>{c+=(s.completedSum||0); p+=(s.pendingSum||0);});
  const cur=targets[i]||0; totT+=cur; totC+=c; totP+=p; totV+=mV.length; totO+=mO.length;
  const disp=isEditingTargets?`<input type="number" class="target-input" min="0" data-index="${i}" value="${cur}">`:cur.toLocaleString('en-US');
  const col=c>=cur?'#10b981':c>=cur*0.7?'#f59e0b':'#ef4444';
  tbody.insertAdjacentHTML('beforeend',`<tr><td style="font-weight:800; color:var(--crm-primary);">${name}</td><td>${disp}</td><td style="color:${col}; font-weight:800;">${c>0?c.toLocaleString('en-US'):'-'}</td><td class="thick-border" style="color:#d97706; font-weight:800;">${p>0?p.toLocaleString('en-US'):'-'}</td><td><span style="background:${mV.length>0?'#dbeafe':'transparent'}; color:${mV.length>0?'#1e40af':'#94a3b8'}; padding:2px 8px; border-radius:20px; font-size:11px;">${mV.length>0?mV.length:'-'}</span></td><td><span style="background:${mO.length>0?'#fef3c7':'transparent'}; color:${mO.length>0?'#92400e':'#94a3b8'}; padding:2px 8px; border-radius:20px; font-size:11px;">${mO.length>0?mO.length:'-'}</span></td></tr>`);
 });
 if(isEditingTargets){ document.querySelectorAll('.target-input').forEach(inp=>{ inp.addEventListener('input',(e)=>{ const idx=parseInt(e.target.dataset.index); targets[idx]=Math.max(0,parseFloat(e.target.value)||0); saveStoredTargets(targets); if(document.getElementById('totTarget')) document.getElementById('totTarget').innerText=targets.reduce((a,b)=>a+b,0).toLocaleString('en-US'); if(document.getElementById('yearlyTargetCardVal')) document.getElementById('yearlyTargetCardVal').innerText=targets.reduce((a,b)=>a+b,0).toLocaleString('en-US'); }); }); }
 if(document.getElementById('totTarget')) document.getElementById('totTarget').innerText=totT.toLocaleString('en-US');
 if(document.getElementById('totCompleted')) document.getElementById('totCompleted').innerText=totC>0?totC.toLocaleString('en-US'):'0';
 if(document.getElementById('totPending')) document.getElementById('totPending').innerText=totP>0?totP.toLocaleString('en-US'):'0';
 if(document.getElementById('totVisits')) document.getElementById('totVisits').innerText=totV>0?totV.toLocaleString('en-US'):'0';
 if(document.getElementById('totOpps')) document.getElementById('totOpps').innerText=totO>0?totO.toLocaleString('en-US'):'0';
}
function initResetFilters(){
 const btn=document.getElementById('resetFiltersBtn'); if(!btn) return;
 btn.addEventListener('click',()=>{
  ['filterRegion','filterSupervisor','filterSalesman','filterMonth'].forEach(id=>{ if(document.getElementById(id)) document.getElementById(id).value='all'; });
  if(document.getElementById('filterYear')) document.getElementById('filterYear').value='2026';
  updateDashboard(); const orig=btn.innerHTML; btn.innerHTML='<i class="fas fa-check"></i>'; setTimeout(()=>btn.innerHTML=orig,800);
 });
}
function initCsvExport(){
 const btn=document.getElementById('exportCsvBtn'); if(!btn) return;
 btn.addEventListener('click',()=>{
  const targets=getStoredTargets(); let csv="\uFEFFالشهر,الهدف,المكتمل,المعلق,الزيارات,الفرص\n";
  monthsNames.forEach((m,i)=>{ const mc=(i+1).toString().padStart(2,'0'); const mS=firestoreRawData.sales.filter(s=>parseMonthFromDate(s.saleDate||s.createdAt)===mc); const mO=firestoreRawData.opportunities.filter(o=>parseMonthFromDate(o.oppDate||o.date||o.visitDate)===mc); const mV=firestoreRawData.visits.filter(v=>parseMonthFromDate(v.visitDate||v.date||v.oppDate)===mc); let c=0,p=0; mS.forEach(s=>{c+=(s.completedSum||0); p+=(s.pendingSum||0);}); csv+=`"${m}",${targets[i]||0},${c},${p},${mV.length},${mO.length}\n`; });
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`ASGate_CRM_Report_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
 });
}
function initDashboard(){
 oppCountEl=document.getElementById('oppCount'); visitCountEl=document.getElementById('visitCount'); salesValueEl=document.getElementById('salesValue'); pendingValueEl=document.getElementById('pendingValue'); tbody=document.getElementById('monthsBody');
 watchThemeChanges(); initBlurToggle(); initTargetEditToggle(); initCharts(); initResetFilters(); initCsvExport(); listenToFirestoreData();
 document.querySelectorAll('.filters-grid select').forEach(s=>s.addEventListener('change',updateDashboard));
 (async()=>{ try{ const snap=await getDoc(doc(db,"settings","monthlyTargets")); if(snap.exists()){ const v=snap.data().values; if(Array.isArray(v)&&v.length===12){ monthlyTargetsArr=v; try{localStorage.setItem('monthlyTargets',JSON.stringify(v));}catch(e){} } } }catch(e){} })();
}
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',initDashboard); } else { initDashboard(); }
