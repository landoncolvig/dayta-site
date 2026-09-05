'use strict';
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const pct=n=>n===null?'Unavailable':(n*100).toFixed(1)+'%';
const signed=n=>(n>0?'+':'')+money(n);
let data;
function render(){
 const period=document.querySelector('#month').value, office=document.querySelector('#office').value;
 const r=data.results.find(r=>r.month===period), x=office==='Company'?r.company:r.byOffice.find(o=>o.office===office);
 const month=period==='2026-08'?'August':'July';
 const revenueDiff=x.revenueActual-x.revenueBudget,expenseDiff=x.expensesActual-x.expensesBudget;
 const rows=x.bridge.map(b=>`<tr><td>${b.metric}</td><td>${money(b.actual)}</td><td>${money(b.budget)}</td><td class="${b.impact<0?'unfavorable':'favorable'}">${signed(b.impact)}</td><td><a href="#source-caption" class="source-link">${b.sourceIds.join(', ')}</a></td></tr>`).join('');
 let context='';
 if(period==='2026-08'&&(office==='Company'||office==='North')) context='<p><strong>Investigate North first.</strong> Its $290,000 profit shortfall is partly offset by Central. North payroll is $20,000 over budget despite average FTE being 67 versus 70 planned. Contractor cost is $80,000 over budget.</p><p>That does not establish a staffing cause. Project mix, billing timing, and revenue-recognition records are missing. Ask the relevant owners before drawing conclusions. Workforce source: S-N.</p>';
 else if(period==='2026-07')context='<p>July is a separate period. Company operating profit is $15,000 above budget. Workforce data was not supplied for July and remains missing in the warehouse.</p>';
 else context='<p>This office view shows measured differences. The source does not establish whether changes are recurring, timing-related, or caused by delivery mix. Confirm those explanations with supporting records.</p>';
 document.querySelector('#demo-output').innerHTML=`<h3 class="result-title">${month} 2026 · ${office==='Company'?'Company total':office+' office'}</h3><div class="metrics"><div class="metric"><span>Revenue</span><strong>${money(x.revenueActual)}</strong><small>${signed(revenueDiff)} vs budget</small></div><div class="metric"><span>Operating profit</span><strong>${money(x.profitActual)}</strong><small>${signed(x.profitVariance)} vs budget</small></div><div class="metric"><span>Operating margin</span><strong>${pct(x.marginActual)}</strong><small>${pct(x.marginBudget)} budget</small></div></div><div class="table-scroll"><table><caption>Profit bridge · USD. Positive impact is favorable; negative is unfavorable.</caption><thead><tr><th>Metric</th><th>Actual</th><th>Budget</th><th>Profit impact</th><th>Source rows</th></tr></thead><tbody>${rows}<tr><td><strong>Operating profit</strong></td><td>${money(x.profitActual)}</td><td>${money(x.profitBudget)}</td><td>${signed(x.profitVariance)}</td><td>Sum of bridge</td></tr></tbody></table></div><div class="context">${context}</div><p class="fine">Expenses total ${money(x.expensesActual)}, ${signed(expenseDiff)} vs budget. Simplified operating profit excludes tax, interest, depreciation, and amortization. Fictional data; human review required.</p>`;
 document.querySelector('#source-rows').innerHTML=r.source.filter(row=>office==='Company'||row.office===office).map(row=>`<tr><td>${row.id}</td><td>${row.office}</td><td>${row.metric}</td><td>${money(row.actual)}</td><td>${money(row.budget)}</td></tr>`).join('');
 document.querySelectorAll('.source-link').forEach(a=>a.addEventListener('click',()=>{document.querySelector('.source-details').open=true;}));
}
fetch('demo/outputs/results.json').then(r=>{if(!r.ok)throw Error('Missing example data');return r.json();}).then(d=>{data=d;render();}).catch(()=>{document.querySelector('#demo-output').textContent='';const error=document.querySelector('#demo-error');error.hidden=false;error.textContent='The prepared example could not load. Run the local build and reload the page. No live company systems are connected.';});
document.querySelectorAll('#month,#office').forEach(el=>el.addEventListener('change',()=>{if(data)render();}));
