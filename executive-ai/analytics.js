'use strict';
(() => {
 const id='G-7GSWXLVWV9',key='dayta-executive-ai-analytics-v1';
 const panel=document.querySelector('#analytics-choice');
 let allowed=false,loaded=false;
 const params=new URLSearchParams(location.search),qa=params.get('utm_source')==='qa';
 const cleanUrl=new URL('https://daytanalytics.com/executive-ai/');
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){
  const value=params.get(key);if(value&&/^[a-zA-Z0-9 _+.:-]{1,160}$/.test(value))cleanUrl.searchParams.set(key,value);
 }
 window.dataLayer=window.dataLayer||[];
 const tag=function(){window.dataLayer.push(arguments);};
 tag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 function start(){
  allowed=true;window['ga-disable-'+id]=false;
  tag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  if(loaded)return;loaded=true;
  tag('js',new Date());
  tag('config',id,{send_page_view:false,page_location:cleanUrl.href,page_referrer:'',allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:2592000,debug_mode:qa});
  tag('event',qa?'qa_page_view':'page_view',{page_location:cleanUrl.href,page_referrer:'',page_title:'Executive AI implementation',debug_mode:qa});
  const script=document.createElement('script');script.async=true;script.referrerPolicy='no-referrer';script.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.append(script);
 }
 function choose(value){
  try{localStorage.setItem(key,JSON.stringify({value,expires:Date.now()+2592000000}));}catch{}
  panel.hidden=true;
  if(value==='yes')start();else{
   allowed=false;window['ga-disable-'+id]=true;
   if(loaded)tag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   for(const cookie of document.cookie.split(';')){const name=cookie.split('=')[0].trim();if(name==='_ga'||name.startsWith('_ga_'))for(const domain of ['', ';domain='+location.hostname,';domain=.'+location.hostname])document.cookie=name+'=;max-age=0;path=/'+domain;}
  }
 }
 document.querySelector('#analytics-accept').addEventListener('click',()=>choose('yes'));
 document.querySelector('#analytics-decline').addEventListener('click',()=>choose('no'));
 document.querySelector('#analytics-settings').addEventListener('click',()=>{panel.hidden=false;panel.focus();});
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&saved.expires>Date.now()){panel.hidden=true;if(saved.value==='yes')start();}}catch{}
 window.addEventListener('dayta-inquiry-accepted',event=>{
  if(allowed)tag('event',qa?'qa_generate_lead':'generate_lead',{form_id:'executive-ai',lead_id:event.detail.lead_id,debug_mode:qa});
 });
 document.querySelector('#inquiry-confirmation a.button').addEventListener('click',()=>{
  if(allowed)tag('event',qa?'qa_booking_link_click':'booking_link_click',{form_id:'executive-ai',debug_mode:qa});
 });
})();
