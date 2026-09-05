'use strict';
(() => {
 const form=document.querySelector('#scope-form');
 const submit=form.querySelector('button[type=submit]');
 const status=document.querySelector('#form-result');
 const confirmation=document.querySelector('#inquiry-confirmation');
 const query=new URLSearchParams(location.search);
 const campaignKeys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
 const clickKeys=['gclid','gbraid','wbraid','msclkid'];
 const cleanCampaign=value=>value&&/^[a-zA-Z0-9 _+.:-]{1,160}$/.test(value)?value:'';
 let leadId=crypto.randomUUID(),busy=false,complete=false;
 const field=(name,value)=>{let input=form.elements.namedItem(name);if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.append(input);}input.value=value;};
 field('lead_id',leadId);field('page','https://daytanalytics.com/executive-ai/');
 for(const key of campaignKeys)field(key,cleanCampaign(query.get(key)));
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||complete||!form.reportValidity())return;
  if(form.elements.namedItem('_honey').value){status.textContent='Unable to submit. Please email landon@daytanalytics.com.';return;}
  busy=true;submit.disabled=true;submit.textContent='Sending…';status.textContent='';status.className='';
  const fd=new FormData(form);
  const payload={version:1,lead_id:leadId,submitted_at:new Date().toISOString(),page:'/executive-ai/',
   name:String(fd.get('name')).trim(),email:String(fd.get('email')).trim(),company:String(fd.get('company')).trim(),
   role:fd.get('role'),revenue_band:fd.get('revenue'),onboarding_count:Number(fd.get('users')),
   tools:String(fd.get('tools')).trim(),question:String(fd.get('question')).trim(),attribution:{},
   ad_measurement_consent:fd.get('ad_measurement')==='yes'};
  for(const key of campaignKeys){const value=cleanCampaign(query.get(key));if(value)payload.attribution[key]=value;}
  if(payload.ad_measurement_consent)for(const key of clickKeys){const value=query.get(key);if(value&&/^[A-Za-z0-9_.-]{1,250}$/.test(value))payload.attribution[key]=value;}
  // Query strings and contact data are never sent to analytics or the booking URL.
  const body=Object.fromEntries(fd.entries());delete body.ad_measurement;
  body.lead_record=JSON.stringify(payload);body._replyto=payload.email;
  body._subject='Executive AI inquiry | '+leadId;body._url='https://daytanalytics.com/executive-ai/';
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);
  try{
   const response=await fetch('https://formsubmit.co/ajax/landon@daytanalytics.com',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),signal:controller.signal});
   const result=await response.json();
   if(!response.ok||!(result.success===true||result.success==='true'))throw Error('Submission not confirmed');
   complete=true;form.hidden=true;confirmation.hidden=false;
   document.querySelector('#inquiry-reference').textContent=leadId;
   confirmation.focus();
   window.dispatchEvent(new CustomEvent('dayta-inquiry-accepted',{detail:{lead_id:leadId,form_id:'executive-ai'}}));
  }catch{
   status.textContent='We could not confirm receipt. Your entries are still here. You can retry, or email landon@daytanalytics.com and include reference '+leadId+'.';status.className='form-error';
   submit.disabled=false;submit.textContent='Send implementation inquiry';
  }finally{clearTimeout(timeout);busy=false;}
 });
})();
