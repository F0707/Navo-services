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
 const area=form.querySelector('.navo-reg-submit');
 if(area&&!$('nv57-email-section')){
  const section=document.createElement('div');section.id='nv57-email-section';
  section.style.cssText='grid-column:1/-1;background:#eef6ec;border:1px solid #d2e3d0;border-radius:14px;padding:15px;margin-top:12px';
  section.innerHTML='<h3>✉ Электронная почта</h3><p id="nv57-email-value">Проверяем адрес…</p><button type="button" class="btn ghost" id="nv57-email-change">Изменить или подтвердить почту</button>';
  area.before(section);
  section.querySelector('#nv57-email-change').onclick=()=>window.navoEmailStep();
  who().then(u=>{const el=$('nv57-email-value');if(el)el.textContent=u.email?(u.email_confirmed_at?'✓ Подтверждена: ':'Не подтверждена: ')+u.email:'Почта ещё не добавлена';}).catch(()=>{const el=$('nv57-email-value');if(el)el.textContent='Войдите в аккаунт для просмотра почты';});
 }
 if(!navoEditingMaster&&!$('nv59-register-password')){
  const p=document.createElement('div');p.id='nv59-register-password';p.style.cssText='padding:16px;border:1px solid #d2e3d0;border-radius:14px;margin:12px 0';
  p.innerHTML='<h3>Доступ к кабинету мастера</h3><p>Имя мастера будет отображаться как имя профиля. Для входа на другом устройстве используйте подтверждённую почту и пароль.</p><label>Пароль мастера<input id="nv59-created-password" type="text" autocomplete="new-password" minlength="8" required style="width:100%;padding:12px"></label><button type="button" class="btn ghost" id="nv59-generate">Сгенерировать пароль</button><p style="font-size:13px">Сохраните пароль в надёжном месте. Он не сохраняется в браузере NAVO.</p>';
  form.querySelector('.navo-reg-submit').before(p);
  const gen=()=>{const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';const arr=new Uint32Array(16);crypto.getRandomValues(arr);$('nv59-created-password').value=Array.from(arr,x=>alphabet[x%alphabet.length]).join('');};
  $('nv59-generate').onclick=gen;gen();
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  const btn=form.querySelector('[type="submit"]');btn.disabled=true;const label=btn.textContent;btn.textContent='Сохраняем в Supabase…';
  try{if(!navoEditingMaster){const p=$('nv59-created-password')?.value;if(!p||p.length<8)throw Error('Укажите пароль длиной от 8 символов');await api('/auth/v1/user','PUT',{password:p});}await saveMaster(form);navoEditingMaster=false;view='master';render();alert('✓ Профиль и услуги сохранены в Supabase. Они доступны на других устройствах.');}
  catch(err){alert('Не удалось сохранить: '+err.message+'\nДанные не считаются опубликованными.');}
  finally{btn.disabled=false;btn.textContent=label;}
 },true);
}
async function openMaster(){
 try{const exists=await syncMaster();if(exists){view='master';render();}else window.navoNewMaster();}
 catch(e){alert('Не удалось загрузить профиль из Supabase: '+e.message);}
}
async function signOutMaster(){
 if(!confirm('Выйти из аккаунта NAVO? При следующем входе потребуется снова подтвердить вашу личность. Профиль и почта сохранятся.'))return;
 const current=session();
 try{if(current?.access_token)await fetch(ROOT+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+current.access_token}});}catch(e){}
 for(const key of [AK,navoMasterLoggedKey,navoMasterBoundKey,'navo-master-email-v48','navo-master-email-v47']){
  localStorage.removeItem(key);sessionStorage.removeItem(key);
 }
 sessionStorage.removeItem('nv57-visited');
 location.replace(location.origin+location.pathname+'?v=58&logout=1');
}
function masterButtons(){
 const app=$('app');if(!app||!['master','register'].includes(view))return;
 if($('nv58-master-account'))return;
 const panel=document.createElement('section');panel.id='nv58-master-account';
 panel.style.cssText='margin:12px auto 20px;padding:18px;background:#fff;border:1px solid #cbdccf;border-radius:18px;max-width:900px;color:#173f35;display:grid;gap:10px';
 panel.innerHTML='<h2 style="font-size:21px;margin:0">Аккаунт мастера</h2><p id="nv58-email-label">Электронная почта: проверяем…</p><button class="btn full" id="nv59-edit" type="button">✎ Изменить профиль мастера</button><button class="btn ghost full" id="nv58-email" type="button">✉ Электронная почта</button><button class="btn ghost full" id="nv59-password" type="button">🔑 Установить или изменить пароль</button><button class="btn ghost full" id="nv58-logout" type="button" style="border:2px solid #a54b40;color:#a54b40">Выйти из аккаунта</button>';
 app.prepend(panel);
 $('nv59-edit').onclick=async()=>{try{await syncMaster();if(navoCurrentMaster())navoEditMaster();else window.navoNewMaster();}catch(e){alert(e.message)}};
 $('nv58-email').onclick=()=>{if(typeof window.navoEmailStep==='function')window.navoEmailStep();else alert('Подтверждение почты недоступно');};
 $('nv59-password').onclick=()=>passwordSetup();
 $('nv58-logout').onclick=signOutMaster;
 who().then(u=>{const el=$('nv58-email-label');if(el)el.textContent=u.email?'Электронная почта: '+u.email+(u.email_confirmed_at?' ✓ подтверждена':' — не подтверждена'):'Электронная почта ещё не указана';}).catch(()=>{const el=$('nv58-email-label');if(el)el.textContent='Войдите в NAVO аккаунт';});
}
function overlay(title,body){
 const box=document.createElement('div');box.id='nv59-overlay';box.style.cssText='position:fixed;inset:0;z-index:18000;background:#09241dcc;display:grid;place-items:center;padding:16px;overflow:auto';
 box.innerHTML='<section style="background:#fff;color:#173f35;border-radius:20px;padding:22px;width:min(430px,100%);max-height:92vh;overflow:auto"><h2>'+esc(title)+'</h2>'+body+'<button type="button" class="btn ghost full" id="nv59-close" style="margin-top:12px">Закрыть</button></section>';
 document.body.append(box);$('nv59-close').onclick=()=>box.remove();return box;
}
async function passwordSetup(){
 let u;try{u=await who();}catch(e){alert(e.message);return}
 if(!u.email||!u.email_confirmed_at){alert('Сначала подтвердите почту в разделе «Электронная почта».');return}
 const b=overlay('Пароль мастера','<p>Для входа с другого устройства используйте подтверждённую почту и пароль. Имя мастера отображается в профиле, но не заменяет электронную почту для входа.</p><label>Новый пароль (не менее 8 символов)<input id="nv59-newpass" type="password" minlength="8" autocomplete="new-password" style="width:100%;padding:12px"></label><button class="btn full" id="nv59-savepass" type="button">Сохранить пароль</button><p id="nv59-msg"></p>');
 $('nv59-savepass').onclick=async()=>{const p=$('nv59-newpass').value;if(p.length<8){$('nv59-msg').textContent='Минимум 8 символов';return}try{await api('/auth/v1/user','PUT',{password:p});$('nv59-msg').textContent='✓ Пароль установлен. Вход по почте доступен после подтверждения адреса.';$('nv59-newpass').value='';}catch(e){$('nv59-msg').textContent='Ошибка: '+e.message}};
}
async function emailLogin(){
 const b=overlay('Войти как мастер','<p>Введите подтверждённую электронную почту и пароль мастера.</p><label>Электронная почта<input id="nv59-loginemail" type="email" autocomplete="email" style="width:100%;padding:12px"></label><label>Пароль<input id="nv59-loginpass" type="password" autocomplete="current-password" style="width:100%;padding:12px"></label><button class="btn full" id="nv59-signin" type="button">Войти в кабинет мастера</button><button class="btn ghost full" id="nv59-forgot" type="button">Забыли пароль?</button><p id="nv59-loginmsg"></p>');
 $('nv59-signin').onclick=async()=>{const email=$('nv59-loginemail').value.trim(),password=$('nv59-loginpass').value;const msg=$('nv59-loginmsg');msg.textContent='Проверяем данные…';try{const res=await fetch(ROOT+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const v=await res.json();if(!res.ok||!v.access_token)throw Error(v.msg||v.error_description||v.error||'Неверная почта или пароль');v.expires_at=Date.now()+(Number(v.expires_in)||3600)*1000;localStorage.setItem(AK,JSON.stringify(v));sessionStorage.setItem(AK,JSON.stringify(v));b.remove();const found=await syncMaster();if(found){view='master';render();}else alert('Вы вошли, но профиль мастера ещё не создан. Нажмите «Регистрация мастера».');}catch(e){msg.textContent='Ошибка: '+e.message}};
 $('nv59-forgot').onclick=async()=>{const email=$('nv59-loginemail').value.trim(),msg=$('nv59-loginmsg');if(!email){msg.textContent='Сначала введите почту';return}try{const r=await fetch(ROOT+'/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email})});if(!r.ok)throw Error('Не удалось отправить письмо');msg.textContent='Письмо для восстановления отправлено. Следуйте инструкции в письме.';}catch(e){msg.textContent=e.message}};
}
function masterChoice(){
 const b=overlay('NAVO · Я мастер','<p>Выберите способ входа.</p><button class="btn full" id="nv59-enter" type="button">Войти — у меня есть кабинет мастера</button><button class="btn ghost full" id="nv59-register" type="button" style="margin-top:10px">Регистрация нового мастера</button><p style="font-size:13px">Клиент продолжает пользоваться NAVO по SMS без пароля. Мастер может входить по электронной почте и паролю.</p>');
 $('nv59-enter').onclick=()=>{b.remove();emailLogin()};
 $('nv59-register').onclick=()=>{b.remove();window.navoMasterEntry()};
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
 const roleBtn=$('role');
 if(roleBtn)roleBtn.addEventListener('click',e=>{if(view==='catalog'||view==='bookings'){e.stopImmediatePropagation();masterChoice();}},true);
 const nav=document.querySelector('header nav');
 if(nav)nav.addEventListener('click',e=>{const button=e.target.closest('button[data-view]');if(!button)return;e.preventDefault();e.stopImmediatePropagation();view=button.dataset.view;render();},true);
 
 observer.observe($('app'),{childList:true,subtree:true});
 installForm();masterButtons();firstVisit();recover();
 setInterval(recover,12000);
 const role=$('role');if(role)role.addEventListener('click',()=>setTimeout(recover,400));
});
window.nv57SyncMaster=syncMaster;
})();