/* NAVO V57: cloud-first master profiles, email settings and first-device auth */
(()=>{
'use strict';
const ROOT='https://wvixivswjqxyunpoiqrl.supabase.co';
const KEY='sb_publishable_5rU0FOrKI2HO_kYI-FGYmQ_9Gxq3SwP';
const AK='navo-auth-session-v43';
const $=id=>document.getElementById(id);
const session=()=>{try{return JSON.parse(localStorage.getItem(AK)||sessionStorage.getItem(AK)||'null')}catch{return null}};
async function api(path,method='GET',body){
 const s=session();if(!s?.access_token)throw Error('Войдите по SMS в свой NAVO аккаунт');
 const r=await fetch(ROOT+path,{method,headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json',...(method!=='GET'?{Prefer:'return=representation,resolution=merge-duplicates'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const v=await r.json().catch(()=>null);if(!r.ok)throw Error((v&&(v.message||v.msg||v.error_description||v.error))||'Ошибка Supabase '+r.status);return v;
}
const esc=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function who(){const u=await api('/auth/v1/user');if(!u?.id)throw Error('Аккаунт не найден');return u;}
async function catalog(){return api('/rest/v1/service_catalog?select=id,category,name&limit=500');}
async function syncMaster(){
 const u=await who(),rows=await api('/rest/v1/master_profiles?select=*&user_id=eq.'+encodeURIComponent(u.id));
 if(!rows?.length)return false;
 const p=rows[0],id='cloud-'+u.id,workerId='own-cloud-'+u.id;
 const services=await api('/rest/v1/master_services?select=service_id,price_somoni,duration_minutes&master_id=eq.'+encodeURIComponent(u.id));
 const items=await catalog(),chosen={};
 for(const row of services||[]){const cat=items.find(x=>Number(x.id)===Number(row.service_id));if(!cat)continue;
 for(const [gi,[group,names]] of Object.entries(navoRegistry).entries()){const si=names.indexOf(cat.name);if(si>=0){chosen[gi+'-'+si]={active:true,price:Number(row.price_somoni),minutes:Number(row.duration_minutes)};break;}}
 }
 const obj={id,workerId,name:p.salon_name||p.display_name,master:p.display_name,area:p.city||'',address:p.work_address||'',landmark:p.landmark||'',phone:p.phone||'',price:Math.min(...(services||[]).map(x=>Number(x.price_somoni)).filter(Number.isFinite),999999),rating:'—',reviews:0,color:'#254a3c',accent:'#b7d5a6',tag:'Мастер NAVO',isOwn:true,slots:['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00'],regionId:navoDetectRegion(p.city||''),directionId:'beauty',categoryId:'mens-hair'};
 const old=navoOwn.find(x=>String(x.id)===id);if(old)Object.assign(old,obj);else navoOwn.push(obj);
 if(!salons.some(x=>String(x.id)===id))salons.push(old||obj);
 navoStaff[id]=[{id:workerId,name:obj.master}];
 localStorage.setItem(navoOwnKey,JSON.stringify(navoOwn));
 localStorage.setItem('navo-worker-services-'+workerId,JSON.stringify(chosen));
 localStorage.setItem(navoMasterBoundKey,id);
 localStorage.setItem(navoMasterLoggedKey,'yes');
 return true;
}
async function saveMaster(form){
 const u=await who();
 if(!u.phone_confirmed_at)throw Error('Сначала подтвердите телефон');
 if(!u.email||!u.email_confirmed_at||u.new_email)throw Error('Сначала подтвердите электронную почту');
 const f=new FormData(form),val=k=>String(f.get(k)||'').trim();
 const boxes=[...form.querySelectorAll('[data-nv25-id]:checked')];if(!boxes.length)throw Error('Выберите хотя бы одну услугу');
 const cats=await catalog(),rows=[];
 for(const cb of boxes){const sid=cb.dataset.nv25Id,[gi,si]=sid.split('-').map(Number),group=Object.keys(navoRegistry)[gi],name=navoRegistry[group]?.[si];
 const cat=cats.find(x=>x.name===name);if(!cat)throw Error('Услуга «'+name+'» отсутствует в облачном справочнике. Обратитесь к администратору.');
 const price=Number(form.querySelector('[data-nv25-price="'+sid+'"]').value),duration=Number(form.querySelector('[data-nv25-minutes="'+sid+'"]').value);
 if(!(price>0&&duration>=5&&duration<=600))throw Error('Проверьте цену и длительность услуги '+name);
 rows.push({master_id:u.id,service_id:cat.id,price_somoni:price,duration_minutes:duration});}
 const profile={user_id:u.id,display_name:val('master'),salon_name:val('salon'),city:val('area'),work_address:val('street'),landmark:val('landmark'),phone:val('phone')||u.phone};
 if(!profile.display_name||!profile.salon_name||!profile.city||!profile.work_address)throw Error('Заполните обязательные поля');
 await api('/rest/v1/master_profiles?on_conflict=user_id','POST',profile);
 await api('/rest/v1/master_services?on_conflict=master_id,service_id','POST',rows);
 const ids=rows.map(x=>x.service_id),existing=await api('/rest/v1/master_services?select=service_id&master_id=eq.'+encodeURIComponent(u.id));
 for(const x of existing){if(!ids.includes(x.service_id))await api('/rest/v1/master_services?master_id=eq.'+encodeURIComponent(u.id)+'&service_id=eq.'+x.service_id,'DELETE');}
 await syncMaster();
}
function installForm(){
 const form=$('navo-new-master-form');if(!form||form.dataset.cloudV57)return;
 form.dataset.cloudV57='1';
 const warn=document.querySelector('.navo-save-warning');if(warn)warn.textContent='Профиль и услуги сохраняются в NAVO Supabase и доступны на других устройствах после входа.';
 const hint=form.querySelector('.navo-reg-submit p');if(hint)hint.textContent='Публикация только после подтверждения сохранения в облаке.';
 form.addEventListener('submit',async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  const btn=form.querySelector('[type="submit"]');btn.disabled=true;const label=btn.textContent;btn.textContent='Сохраняем в Supabase…';
  try{await saveMaster(form);navoEditingMaster=false;view='master';render();alert('✓ Профиль и услуги сохранены в Supabase. Они доступны на других устройствах.');}
  catch(err){alert('Не удалось сохранить: '+err.message+'\nДанные не считаются опубликованными.');}
  finally{btn.disabled=false;btn.textContent=label;}
 },true);
}
async function openMaster(){
 try{const exists=await syncMaster();if(exists){view='master';render();}else window.navoNewMaster();}
 catch(e){alert('Не удалось загрузить профиль из Supabase: '+e.message);}
}
function masterButtons(){
 const panel=document.querySelector('#app .nv23-panel');if(!panel||!panel.textContent.includes('Мой профиль'))return;
 if(!$('nv57-profile')){const b=document.createElement('button');b.id='nv57-profile';b.className='btn ghost';b.type='button';b.textContent='✎ Изменить профиль и электронную почту';b.onclick=async()=>{await openMaster();if(typeof navoEditMaster==='function'&&navoCurrentMaster())navoEditMaster();};panel.append(b);}
 if(!$('nv57-email')){const b=document.createElement('button');b.id='nv57-email';b.className='btn ghost';b.type='button';b.style.margin='8px';b.textContent='✉ Электронная почта';b.onclick=()=>window.navoEmailStep();panel.append(b);}
}
function firstVisit(){
 if(session()?.access_token||sessionStorage.getItem('nv57-visited'))return;
 const modal=document.createElement('div');modal.id='nv57-welcome';modal.style.cssText='position:fixed;inset:0;background:#102c25b8;z-index:15000;display:grid;place-items:center;padding:20px';
 modal.innerHTML='<section style="background:white;color:#173f35;border-radius:22px;padding:25px;width:min(420px,100%);box-shadow:0 14px 50px #0004"><h2>NAVO Services</h2><p>Добро пожаловать! У вас уже есть аккаунт или вы впервые в NAVO?</p><button class="btn full" id="nv57-login">Войти в аккаунт</button><button class="btn full" id="nv57-register" style="margin-top:12px">Регистрация</button><button class="btn ghost full" id="nv57-guest" style="margin-top:12px">Посмотреть каталог</button><p style="font-size:12px">Оба способа используют номер телефона и SMS. Существующий аккаунт откроется без повторной регистрации.</p></section>';
 document.body.append(modal);
 const proceed=kind=>{sessionStorage.setItem('nv57-visited','1');modal.remove();const b=$('nv42-launch');if(b)b.click();const t=$('navo-phone-status');if(t)t.textContent=kind==='login'?'Введите номер, к которому привязан ваш аккаунт.':'Введите свой номер. Если аккаунт уже есть, он откроется автоматически.';};
 $('nv57-login').onclick=()=>proceed('login');$('nv57-register').onclick=()=>proceed('register');
 $('nv57-guest').onclick=()=>{sessionStorage.setItem('nv57-visited','1');modal.remove();};
}
let lastUser='',busy=false;
async function recover(){if(busy||!session()?.access_token)return;busy=true;try{const u=await who();if(u.id!==lastUser){lastUser=u.id;await syncMaster();if(view==='master')render();}}catch(e){}finally{busy=false;}}
const observer=new MutationObserver(()=>{installForm();if(view==='master')masterButtons();});
document.addEventListener('DOMContentLoaded',()=>{
 observer.observe($('app'),{childList:true,subtree:true});
 installForm();masterButtons();firstVisit();recover();
 setInterval(recover,12000);
 const role=$('role');if(role)role.addEventListener('click',()=>setTimeout(recover,400));
});
window.nv57SyncMaster=syncMaster;
})();