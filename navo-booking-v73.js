(()=>{
'use strict';
const $=id=>document.getElementById(id),api=()=>window.navoV72;
const token=()=>api().getAuth()?.access_token;
async function get(path,t=token()){return api().request(path,null,t,'GET')}
async function rpc(name,args,t=token()){return api().request('/rest/v1/rpc/'+name,args,t,'POST')}
const dateText=d=>new Date(d).toLocaleString('ru-RU',{timeZone:'Asia/Dushanbe',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e}
function button(label,action){const b=document.createElement('button');b.type='button';b.className='primary full';b.textContent=label;b.onclick=action;return b}
function dateTimeControls(initialDate,initialTime){
 const date=document.createElement('select'),time=document.createElement('select');
 date.className='navo-date-select';time.className='navo-time-select';
 date.setAttribute('aria-label','Дата посещения');time.setAttribute('aria-label','Время посещения');
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const base=new Date(today+'T12:00:00+05:00');
 const formatter=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Dushanbe',weekday:'short',day:'numeric',month:'long'});
 for(let i=0;i<91;i++){
 const d=new Date(base.getTime()+i*86400000),key=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
 const opt=document.createElement('option');opt.value=key;opt.textContent=formatter.format(d);date.append(opt);
 }
 if(initialDate&&initialDate>=today&&initialDate<=date.options[date.options.length-1].value)date.value=initialDate;
 for(let h=0;h<24;h++)for(const m of ['00','30']){
 const val=String(h).padStart(2,'0')+':'+m,opt=document.createElement('option');opt.value=val;opt.textContent=val;time.append(opt)
 }
 time.value=initialTime||'10:00';
 return {date,time}
}
const mobileDateCss=document.createElement('style');mobileDateCss.textContent='.navo-date-select,.navo-time-select{display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;border:1px solid #9eafa5;border-radius:12px;background:#fff;color:#173f35;font:inherit;font-size:16px;padding:13px;margin:10px 0 15px;appearance:auto}';document.head.append(mobileDateCss);
async function openMaster(master){
 const box=$('catalog-items');
 const search=$('navo-catalog-search'),searchValue=search?.value||'';
 const previousScroll=window.scrollY;
 const goBack=async()=>{await api().catalog();if(search){search.value=searchValue;search.dispatchEvent(new Event('input',{bubbles:true}))}requestAnimationFrame(()=>window.scrollTo(0,previousScroll))};
 box.replaceChildren();$('catalog')?.classList.add('navo-master-detail-open');
 const bar=document.createElement('div');bar.className='navo-profile-topbar';
 const back=button('← Назад в каталог',goBack);back.className='navo-profile-back';
 const brand=text('strong','NAVO');brand.className='navo-profile-brand';
 const share=button('↗ Поделиться',async()=>{const url=new URL(window.location.href);url.searchParams.set('master',master.master_id);try{if(navigator.share)await navigator.share({title:master.display_name||'Мастер NAVO',url:url.href});else if(navigator.clipboard){await navigator.clipboard.writeText(url.href);share.textContent='✓ Ссылка скопирована'}else prompt('Ссылка на мастера',url.href)}catch(e){if(e.name!=='AbortError')console.warn(e)}});share.className='navo-profile-share';
 bar.append(back,brand,share);box.append(bar);window.scrollTo(0,0);
 const profile=document.createElement('div');profile.className='navo-selected-master-profile';
 const avatar=document.createElement('div');avatar.className='navo-selected-master-avatar';
 if(master.photo_url&&/^https:\/\//i.test(master.photo_url)){const photo=document.createElement('img');photo.src=master.photo_url;photo.alt='Фото профиля мастера '+(master.display_name||'NAVO');photo.loading='eager';photo.decoding='async';photo.fetchPriority='high';photo.onerror=()=>{photo.remove();avatar.textContent='✂'};avatar.append(photo)}else{avatar.textContent='✂'}
 const info=document.createElement('div');info.className='navo-selected-master-info';info.append(text('h3',master.display_name||'Мастер NAVO'),text('p','📍 '+[master.city,master.work_address].filter(Boolean).join(', ')));const rating=master.navoRating;const stars=text('div',rating&&Number(rating.reviews_count)>0?'★'.repeat(Math.max(0,Math.min(5,Math.round(Number(rating.average_stars)))))+'☆'.repeat(5-Math.max(0,Math.min(5,Math.round(Number(rating.average_stars)))))+'  '+Number(rating.average_stars).toFixed(1)+' / 5 · '+rating.reviews_count+' оценок':'☆☆☆☆☆  Пока нет оценок');stars.className='navo-selected-master-rating';info.append(stars);
 const experience=Number(master.experience_years);
 if(Number.isFinite(experience)&&experience>0){const badge=text('span','Опыт '+experience+' '+(experience===1?'год':experience<5?'года':'лет'));badge.className='navo-master-experience';info.append(badge)}
 profile.append(avatar,info);box.append(profile);
 const landmark=master.landmark||master.reference_point||master.address_landmark||'';
 const address=[master.city,master.work_address].filter(Boolean).join(', ');
 const fullAddress=address+(landmark?' (ор-р '+landmark+')':'');
 const latitude=Number(master.latitude??master.lat),longitude=Number(master.longitude??master.lng??master.lon);
 const hasCoordinates=Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180&&!(latitude===0&&longitude===0);
 const destination=hasCoordinates?latitude+','+longitude:address+', Таджикистан';
 if(address){
  const location=document.createElement('section');location.className='navo-master-location';
  location.append(text('h3','📍 Как найти мастера'));
  location.append(text('p',fullAddress));
  const map=document.createElement('iframe');map.className='navo-master-map';map.title='Карта расположения мастера';map.loading='lazy';map.referrerPolicy='no-referrer-when-downgrade';map.src='https://maps.google.com/maps?q='+encodeURIComponent(destination)+'&z=16&output=embed';location.append(map);
  const openMap=document.createElement('a');openMap.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(destination);openMap.target='_blank';openMap.rel='noopener noreferrer';openMap.textContent='Открыть в Картах ↗';openMap.className='navo-map-open';location.insertBefore(openMap,map);
  const directions=document.createElement('a');directions.className='navo-master-directions';directions.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(address+', Таджикистан');directions.target='_blank';directions.rel='noopener noreferrer';directions.textContent='🧭 Построить маршрут в Google Картах';location.append(directions);
  location.append(text('small','Местоположение найдено по адресу мастера. Перед поездкой проверьте точку на карте.'));
  box.append(location)
 }

 const album=document.createElement('section');album.className='navo-master-album';
 const albumTitle=text('h3','Альбом работ');const albumHint=text('p','Примеры работ мастера');albumHint.className='muted';
 const albumCount=text('span','');albumCount.className='navo-album-count';
 const albumHead=document.createElement('div');albumHead.className='navo-album-heading';albumHead.append(albumTitle,albumCount);
 const photos=document.createElement('div');photos.className='navo-album-strip';
 album.append(albumHead,albumHint,photos);box.append(album);
 const renderPhotos=urls=>{
  const safe=[...new Set(urls.filter(x=>typeof x==='string'&&/^https:\/\//i.test(x)))].slice(0,20);
  albumCount.textContent=safe.length+' фото';photos.replaceChildren();
  if(!safe.length){photos.append(text('p','Мастер пока не добавил фотографии работ.'));return}
  safe.forEach((url,i)=>{const thumb=document.createElement('button');thumb.type='button';thumb.className='navo-album-thumb';
   const img=document.createElement('img');img.src=url;img.alt='Работа мастера '+(i+1);img.loading='lazy';thumb.append(img);
   thumb.onclick=()=>{const overlay=document.createElement('div');overlay.className='navo-photo-lightbox';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    const close=button('✕',()=>overlay.remove());close.className='navo-photo-close';const full=document.createElement('img');full.src=url;full.alt=img.alt;
    overlay.append(close,full);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});document.body.append(overlay)};
   photos.append(thumb)});
 };
 renderPhotos(Array.isArray(master.portfolio_urls)?master.portfolio_urls:[]);
 if(!Array.isArray(master.portfolio_urls)||!master.portfolio_urls.length){
  get('/rest/v1/master_applications?select=portfolio_urls,experience_years&user_id=eq.'+encodeURIComponent(master.master_id)+'&limit=1').then(rows=>{
   if(rows[0]?.portfolio_urls&&box.contains(album))renderPhotos(rows[0].portfolio_urls);
   if(rows[0]?.experience_years&&!info.querySelector('.navo-master-experience')){const badge=text('span','Опыт '+rows[0].experience_years+' лет');badge.className='navo-master-experience';info.append(badge)}
  }).catch(()=>{});
 }
 const status=text('p','Загружаем услуги…');box.append(status);
 try{
 const rows=await get('/rest/v1/navo_test_master_prices?select=service_id,name,category,price_somoni&master_id=eq.'+encodeURIComponent(master.master_id)+'&order=category.asc,name.asc');
 status.textContent=rows.length?'Выберите одну или несколько услуг':'Мастер ещё не указал цены. Попросите мастера сохранить прайс-лист в личном кабинете.';
 if(!rows.length)return;
 const chosen=new Map(),groups={};for(const x of rows)(groups[x.category]??=[]).push(x);
 const total=text('h3','Итого к оплате: 0 сомони');total.className='navo-profile-total';
 const refresh=()=>{const sum=[...chosen.values()].reduce((a,x)=>a+Number(x.price_somoni),0);total.textContent='Итого к оплате: '+sum.toFixed(2)+' сомони';if(typeof checkSlot==='function')checkSlot()};
 for(const [category,items] of Object.entries(groups)){
 const group=document.createElement('div');group.className='item navo-profile-service-group';const title=text('h3',category+' ('+items.length+')');title.style.cssText='font-weight:700;cursor:pointer;padding:10px 0';group.append(title);
 for(const item of items){const line=document.createElement('label');line.className='navo-profile-service-row';line.style.cssText='display:flex;align-items:center;gap:12px;padding:10px 0;font-weight:400';
 const check=document.createElement('input');check.type='checkbox';check.style.width='auto';check.onchange=()=>{if(check.checked)chosen.set(item.service_id,item);else chosen.delete(item.service_id);refresh()};
 const name=text('span',item.name);name.style.flex='1';const price=text('strong',item.price_somoni+' сом.');line.append(check,name,price);group.append(line)}box.append(group)
 }
 box.append(total,text('h3','Дата и время посещения'));
 const {date,time}=dateTimeControls();
 const note=text('p','Время указано по Душанбе. NAVO подтверждает запись автоматически, если мастер работает и выбранный интервал свободен.');
 const result=text('p','');const submit=button('Записаться к мастеру',async()=>{
 try{
 if(!chosen.size)throw Error('Сначала выберите услуги');
 if(!date.value||!time.value)throw Error('Выберите дату и время');
 const starts=new Date(date.value+'T'+time.value+':00+05:00');if(!Number.isFinite(starts.getTime()))throw Error('Неверная дата');
 submit.disabled=true;result.textContent='Создаём запись…';
 const created=await rpc('navo_create_booking',{p_master:master.master_id,p_services:[...chosen.keys()],p_starts:starts.toISOString()});
 box.replaceChildren();box.append(text('h3','✓ Запись создана'),text('p',master.display_name),text('p',dateText(starts)),text('p','Сумма: '+created.total_somoni+' сомони'),text('h2','Ваш код: '+created.code),text('p','Покажите код мастеру после обслуживания. Код также доступен в разделе «Мои записи».'));
 api().show('bookings');api().bookings();
 }catch(e){result.textContent='Ошибка: '+e.message;submit.disabled=false}
 });
 const availability=text('p','');let checkSeq=0;
 const checkSlot=async()=>{const seq=++checkSeq;if(!chosen.size){availability.textContent='Выберите услуги, чтобы проверить время';submit.disabled=false;return}
 availability.textContent='Проверяем свободное время…';submit.disabled=true;
 try{const dt=new Date(date.value+'T'+time.value+':00+05:00');const ok=await rpc('navo_slot_available',{p_master:master.master_id,p_starts:dt.toISOString(),p_minutes:chosen.size*30,p_exclude:null});if(seq!==checkSeq)return;
 availability.textContent=ok?'✓ Время свободно. Запись подтвердится автоматически.':'Это время занято или вне графика мастера. Выберите другое.';submit.disabled=!ok
 }catch(e){if(seq===checkSeq){availability.textContent='Не удалось проверить время: '+e.message;submit.disabled=true}}};
 date.onchange=checkSlot;time.onchange=checkSlot;
 const schedule=document.createElement('div');schedule.className='navo-profile-schedule';schedule.append(date,time);submit.className='navo-profile-submit';box.append(schedule,note,availability,submit,result);
 checkSlot();
 }catch(e){status.textContent='Ошибка загрузки услуг: '+e.message}
}
async function attachMasterCards(){
 const box=$('catalog-items');if(!box||box.dataset.navoBookingWired)return;box.dataset.navoBookingWired='1';
 box.addEventListener('click',async e=>{
 const card=e.target.closest('.navo-master-card,.item');if(!card||!box.contains(card))return;
 if(e.target.closest('button:not(.navo-master-action),a'))return;
 try{
 const masters=await get('/rest/v1/navo_test_master_catalog?select=master_id,display_name,city,work_address,photo_url&limit=100');
 const master=card.dataset.masterId?masters.find(x=>String(x.master_id)===card.dataset.masterId):masters.find(x=>x.display_name===card.querySelector('strong')?.textContent);
 if(master)await openMaster(master);
 }catch(err){alert('Не удалось открыть мастера: '+err.message)}

 },true);
}
async function markChatRead(bookingId,viewerId,accessToken){
 const response=await fetch(api().ROOT+'/rest/v1/navo_message_reads?on_conflict=booking_id,user_id',{method:'POST',headers:{apikey:api().KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({booking_id:bookingId,user_id:viewerId,last_read_at:new Date().toISOString()})});
 if(response.ok){const dot=document.querySelector('[data-booking-card="'+bookingId+'"] [data-unread-dot]');if(dot){dot.hidden=true;dot.style.display='none'}const card=document.querySelector('[data-booking-card="'+bookingId+'"]');if(card){card.querySelectorAll('[data-chat-unread]').forEach(x=>x.hidden=true);card.querySelectorAll('.navo-chat').forEach(x=>x.classList.remove('has-unread'))}}
}
const chatCss=document.createElement('style');chatCss.textContent=`
.navo-chat{margin:14px 0 18px}.navo-chat-button{display:flex;align-items:center;gap:12px;cursor:pointer;list-style:none;border:1px solid #c8ded2;border-radius:17px;background:#e7f2eb;color:#174c3d;padding:13px 16px;font-weight:700;min-height:62px;box-shadow:0 2px 7px #0a302014}.navo-chat-button::-webkit-details-marker{display:none}.navo-chat-glyph{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#174c3d;color:white;font-size:22px;flex-shrink:0}.navo-chat-title{flex:1}.navo-chat-dot{display:none;background:#f8c52a;color:#342700;border-radius:999px;min-width:25px;height:25px;padding:0 6px;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 0 3px #fff5c2}.navo-chat.has-unread .navo-chat-dot:not([hidden]){display:flex;animation:navoPulse 1.5s ease-in-out infinite}.navo-chat.has-unread .navo-chat-button{border:2px solid #e2ac13;background:#fff6d6}.navo-chat[open]>.navo-chat-button{border-radius:17px 17px 8px 8px}.navo-chat .item{margin-top:5px!important}.navo-chat [data-chat-unread][hidden]{display:none!important}@keyframes navoPulse{0%,100%{box-shadow:0 0 0 2px #fff5c2;opacity:1}50%{box-shadow:0 0 0 8px #f8c52a40;opacity:.65}}
`;document.head.append(chatCss);
let navoAudio=null,navoAudioReady=false;const navoSeenMessages=new Map();
function navoTone(kind){
 if(!navoAudioReady)return;
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;navoAudio=navoAudio||new C();if(navoAudio.state==='suspended')navoAudio.resume();
 const now=navoAudio.currentTime,notes=kind==='incoming'?[660,880]:[740,590];
 notes.forEach((hz,i)=>{const osc=navoAudio.createOscillator(),gain=navoAudio.createGain();osc.type='sine';osc.frequency.value=hz;gain.gain.setValueAtTime(0.0001,now+i*0.13);gain.gain.exponentialRampToValueAtTime(0.045,now+i*0.13+0.02);gain.gain.exponentialRampToValueAtTime(0.0001,now+i*0.13+0.19);osc.connect(gain);gain.connect(navoAudio.destination);osc.start(now+i*0.13);osc.stop(now+i*0.13+0.2)})
 }catch(e){}
}
document.addEventListener('pointerdown',()=>{navoAudioReady=true},{once:true});
async function updateBookingUnread(){
 const session=api()?.getSession?.(),masterView=!!session?.access_token&&!$('ml-dashboard')?.classList.contains('hide');
 const auth=masterView?session:api()?.getAuth?.();if(!auth?.access_token||!auth?.user?.id)return;
 const uid=auth.user.id,role=masterView?'master_id':'client_id';
 const bookings=await get('/rest/v1/bookings?select=id&'+role+'=eq.'+encodeURIComponent(uid)+'&limit=100',auth.access_token);
 const ids=bookings.map(b=>b.id);if(!ids.length)return;
 const [msgs,reads]=await Promise.all([
 get('/rest/v1/navo_booking_messages?select=booking_id,sender_id,created_at&booking_id=in.('+ids.join(',')+')&order=created_at.desc&limit=500',auth.access_token),
 get('/rest/v1/navo_message_reads?select=booking_id,last_read_at&user_id=eq.'+encodeURIComponent(uid),auth.access_token)]);
 const last=new Map(reads.map(x=>[x.booking_id,new Date(x.last_read_at).getTime()]));const counts=new Map();
 for(const m of msgs){if(m.sender_id!==uid&&new Date(m.created_at).getTime()>(last.get(m.booking_id)||0))counts.set(m.booking_id,(counts.get(m.booking_id)||0)+1)}
 const key=role+':'+uid;const latest=msgs.filter(m=>m.sender_id!==uid).reduce((max,m)=>Math.max(max,new Date(m.created_at).getTime()),0);
 if(navoSeenMessages.has(key)&&latest>navoSeenMessages.get(key))navoTone('incoming');
 navoSeenMessages.set(key,Math.max(latest,navoSeenMessages.get(key)||0));
 for(const card of document.querySelectorAll('[data-booking-card]')){const count=counts.get(card.dataset.bookingCard)||0;
 for(const bubble of card.querySelectorAll('[data-chat-unread]')){bubble.hidden=!count;bubble.textContent=count>9?'9+':String(count)}
 for(const chat of card.querySelectorAll('.navo-chat'))chat.classList.toggle('has-unread',count>0);
 let dot=card.querySelector('[data-unread-dot]');if(!dot){dot=document.createElement('span');dot.dataset.unreadDot='1';dot.style.cssText='display:inline-block;background:#f7c94a;color:#3a2b00;border-radius:30px;padding:5px 10px;margin:8px 0;font-weight:700';card.insertBefore(dot,card.firstChild)}dot.textContent='🟡 '+count+' новых сообщений';dot.hidden=!count;dot.style.display=count?'inline-block':'none'}
 const clientTab=$('tab-bookings');if(clientTab&&!masterView){const n=[...counts.values()].reduce((a,b)=>a+b,0);clientTab.textContent=n?'Мои записи 🟡 '+n:'Мои записи'}
}
function chatPanel(bookingId,viewerId,accessToken,active,role,meta={}){
 const wrap=document.createElement('div');wrap.className='item navo-chat-content';wrap.style.marginTop='10px';wrap.style.background='transparent';
 const header=text('div',(meta.name||(role==='master'?'Клиент':'Мастер NAVO'))+(role==='client'?' (Мастер)':''));header.className='navo-messenger-heading';const info=text('p',[meta.service,meta.date].filter(Boolean).join(' · ')||'Переписка по записи');info.className='muted navo-messenger-subtitle';const head=document.createElement('div');head.className='navo-messenger-head';const back=button('← Назад',()=>{details.open=false});back.className='navo-chat-back';head.append(back);if(meta.photo){const avatar=document.createElement('img');avatar.src=meta.photo;avatar.alt='Фото мастера';avatar.className='navo-chat-avatar';head.append(avatar)}head.append(header,info);if(meta.phone){const call=document.createElement('a');call.href='tel:'+String(meta.phone).replace(/[^+\d]/g,'');call.textContent='📞';call.className='navo-messenger-call';call.setAttribute('aria-label','Позвонить мастеру');head.append(call)}
 const messages=document.createElement('div');messages.className='navo-messenger-messages';
 const status=text('p','');status.className='muted';
 const input=document.createElement('input');input.type='text';input.className='navo-chat-input';input.maxLength=500;input.placeholder='Напишите сообщение…';input.disabled=!active;
 const send=button('✈',async()=>{const body=input.value.trim();if(!body)return;send.disabled=true;try{
 const response=await fetch(api().ROOT+'/rest/v1/navo_booking_messages',{method:'POST',headers:{apikey:api().KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({booking_id:bookingId,sender_id:viewerId,body})});
 if(!response.ok){const err=await response.json().catch(()=>({}));throw Error(err.message||'Не удалось отправить сообщение')}
 input.value='';navoTone('outgoing');await refresh()
 }catch(e){status.textContent='Ошибка: '+e.message}finally{send.disabled=false}});
 send.className='navo-messenger-send';send.setAttribute('aria-label','Отправить сообщение');input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();if(!send.disabled)send.click()}});
 const refresh=async()=>{try{const rows=await get('/rest/v1/navo_booking_messages?select=id,sender_id,body,created_at&booking_id=eq.'+bookingId+'&order=created_at.asc&limit=100',accessToken);
 messages.replaceChildren();if(!rows.length)messages.append(text('p','Сообщений пока нет'));
 for(const m of rows){const p=document.createElement('div');p.className='navo-message-bubble '+(m.sender_id===viewerId?'navo-message-out':'navo-message-in');const body=text('span',m.body);const time=text('small',new Date(m.created_at).toLocaleTimeString('ru-RU',{timeZone:'Asia/Dushanbe',hour:'2-digit',minute:'2-digit'}));p.append(body,time);if(m.sender_id===viewerId)p.append(text('small','✓✓'));messages.append(p)}
 requestAnimationFrame(()=>{messages.scrollTop=messages.scrollHeight});
 status.textContent='Сообщений: '+rows.length;await markChatRead(bookingId,viewerId,accessToken);
 }catch(e){status.textContent='Ошибка загрузки переписки: '+e.message}};
 const quick=document.createElement('div');quick.className='navo-messenger-quick';
 if(active)for(const phrase of ['Я в дороге','Буду через 5 минут','Опаздываю на 10 мин','Жду вас']){const b=document.createElement('button');b.type='button';b.className='secondary';b.style.cssText='width:auto;padding:8px;font-size:13px';b.textContent=phrase;b.onclick=()=>{input.value=phrase;send.click()};quick.append(b)}
 const composer=document.createElement('div');composer.className='navo-messenger-composer';const attachment=document.createElement('span');attachment.className='navo-chat-attachment';attachment.textContent='📎';attachment.title='Вложения пока не поддерживаются';composer.append(attachment,input,send);wrap.append(head,messages,status,quick,composer);if(!active){composer.hidden=true;quick.hidden=true;wrap.append(text('p','Запись закрыта. Переписка доступна только для чтения.'))}
 const details=document.createElement('details');details.dataset.chatBooking=bookingId;details.className='navo-chat navo-messenger';
 const summary=document.createElement('summary');summary.className='navo-chat-button';
 const glyph=document.createElement('span');glyph.textContent='💬';glyph.className='navo-chat-glyph';
 const title=document.createElement('span');title.textContent=role==='master'?'Чат с клиентом':'Чат с мастером';title.className='navo-chat-title';
 const dot=document.createElement('span');dot.className='navo-chat-dot';dot.dataset.chatUnread='1';dot.hidden=true;dot.textContent='1';
 summary.append(glyph,title,dot);details.append(summary,wrap);
 let chatPlaceholder=null;
 const closeChat=()=>{details.open=false;if(role==='client')navoSetBookingFocus(null)};
 back.onclick=closeChat;
 details.addEventListener('toggle',()=>{
  if(details.open){
   if(!chatPlaceholder){chatPlaceholder=document.createComment('NAVO chat original location');details.parentNode?.insertBefore(chatPlaceholder,details)}
   document.body.append(details);
   details.classList.add('navo-chat-fullscreen');
   document.body.classList.add('navo-chat-screen-open');
   refresh();
   requestAnimationFrame(()=>{messages.scrollTop=messages.scrollHeight});
  }else{
   details.classList.remove('navo-chat-fullscreen');
   document.body.classList.remove('navo-chat-screen-open');
   if(chatPlaceholder?.parentNode){chatPlaceholder.replaceWith(details);chatPlaceholder=null}
  }
 });
 return details
}
let clientRenderRunning=false,clientRenderQueued=false;
let cachedBookings=null,cachedBookingUser=null;
let navoFocusedBookingId=null;
function navoSetBookingFocus(id){
 navoFocusedBookingId=id;
 const box=$('bookings-items');if(!box)return;
 box.classList.toggle('navo-focused-booking',!!id);
 for(const tile of box.querySelectorAll('.navo-booking-tile')){
  const active=!!id&&tile.dataset.bookingCard===String(id);
  tile.hidden=!!id&&!active;
  tile.classList.toggle('navo-active-booking',active);
  const d=tile.querySelector('.navo-client-booking-details');if(d)d.hidden=!active;
  const btn=tile.querySelector('.navo-client-booking-open');if(btn)btn.textContent=active?'← К списку записей':'Открыть запись';
 }
 if(!id){for(const chat of document.querySelectorAll('details.navo-chat[open]'))chat.open=false;document.body.classList.remove('navo-chat-screen-open')}
}
window.navoShowAllBookings=()=>navoSetBookingFocus(null);

window.navoChatPanel=chatPanel;
async function clientCards(force=false){
 const uid=api()?.getAuth?.()?.user?.id;
 if(!uid)return;
 const box=$('bookings-items'),status=$('bookings-status');
 if(cachedBookingUser!==uid){cachedBookings=null;cachedBookingUser=uid;navoFocusedBookingId=null;if(box)box.replaceChildren()}
 if(cachedBookings&&!force){
  navoSetBookingFocus(null);
  if(box&&box.childElementCount)box.style.visibility='visible';
  if(status)status.textContent='';
  // Existing DOM is the in-memory cache: no blocking Supabase call or redraw.
  get('/rest/v1/bookings?select=id,master_id,starts_at,status,total_somoni&client_id=eq.'+encodeURIComponent(uid)+'&order=starts_at.desc&limit=100')
   .then(rows=>{const fingerprint=JSON.stringify(rows.map(b=>[b.id,b.starts_at,b.status,b.total_somoni]));if(fingerprint!==cachedBookings&&$('bookings')&&!$('bookings').classList.contains('hide'))clientCards(true).catch(console.error)})
   .catch(console.warn);
  return;
 }
 if(clientRenderRunning){clientRenderQueued=true;return}
 clientRenderRunning=true;
 try{await renderClientCards();cachedBookings=box?.dataset.bookingFingerprint||'[]';if(status)status.textContent=''}
 finally{clientRenderRunning=false;if(clientRenderQueued){clientRenderQueued=false;clientCards(true).catch(console.error)}}
}
function navoTimeBadge(iso){
 const wrap=document.createElement('div');wrap.className='navo-time-badge';
 const heading=text('div','Дата и время');heading.className='navo-time-heading';
 const when=text('div',dateText(iso).replace(', ',' в '));when.className='navo-time-when';
 wrap.append(heading,when);
 return wrap;
}
function navoCompactSection(title,child,open=false){
 const section=document.createElement('details');section.className='navo-compact-section';section.open=open;
 const summary=document.createElement('summary');summary.textContent=title;
 section.append(summary,child);return section;
}
let cachedMasterDirectory=null,cachedMasterDirectoryAt=0;
async function renderClientCards(){
 const box=$('bookings-items');if(!box)return;
 const user=api().getAuth()?.user;if(!user)return;
 const directoryPromise=cachedMasterDirectory&&Date.now()-cachedMasterDirectoryAt<300000?Promise.resolve(cachedMasterDirectory):get('/rest/v1/navo_test_master_catalog?select=*&limit=100').then(data=>{cachedMasterDirectory=data;cachedMasterDirectoryAt=Date.now();return data}).catch(()=>cachedMasterDirectory||[]);
 const rawRows=await get('/rest/v1/bookings?select=id,master_id,starts_at,status,total_somoni&client_id=eq.'+encodeURIComponent(user.id)+'&order=starts_at.desc&limit=100');const rows=[...new Map(rawRows.map(b=>[b.id,b])).values()];
 box.dataset.bookingFingerprint=JSON.stringify(rows.map(b=>[b.id,b.starts_at,b.status,b.total_somoni]));box.replaceChildren();if(!rows.length){navoFocusedBookingId=null;box.append(text('p','У вас пока нет записей'));return}
 const masters=await directoryPromise;const masterMap=new Map(masters.map(m=>[m.master_id,m]));
 const bookingData=rows.map(b=>Promise.all([
  get('/rest/v1/navo_booking_items?select=service_name,price_somoni&booking_id=eq.'+b.id).catch(()=>[]),
  b.status!=='completed'&&b.status!=='cancelled'?rpc('navo_get_booking_code',{p_booking:b.id}).catch(()=>null):Promise.resolve(null)
 ]).then(([items,code])=>({items,code})));
 for(const [bookingIndex,b] of rows.entries()){
 const card=document.createElement('div');card.className='item navo-booking-tile bg-white rounded-2xl p-4 border-2 border-emerald-600/20 shadow-sm space-y-3 mb-3';card.dataset.bookingCard=b.id;
 const master=masterMap.get(b.master_id);const title=text('strong',master?.display_name?'Мастер: '+master.display_name:'Мастер NAVO');const status=text('span',({completed:'Завершена',cancelled:'Отменена',requested:'Ожидает подтверждения',confirmed:'Подтверждена'}[b.status]||b.status));status.className='navo-booking-status navo-status-'+b.status;
 const detail=document.createElement('div');detail.hidden=true;const appointmentDate=navoTimeBadge(b.starts_at);const top=document.createElement('div');top.className='navo-client-booking-top';top.append(appointmentDate,status);card.append(top,title);const address=text('p',[master?.city,master?.work_address].filter(Boolean).join(', ')||'Адрес уточняется');address.className='navo-booking-address';card.append(address);
 const toggle=button('Открыть запись',()=>{const opening=detail.hidden;navoSetBookingFocus(opening?b.id:null);});toggle.className='secondary navo-client-booking-open';detail.className='navo-client-booking-details';card.append(toggle,detail);
 card.addEventListener('click',event=>{if(event.target.closest('button,a,input,select,textarea,label,details,summary'))return;if(detail.hidden)navoSetBookingFocus(b.id)});

 if(master?.photo_url){const photo=document.createElement('img');photo.src=master.photo_url;photo.alt='Фото мастера';photo.style.cssText='width:48px;height:48px;object-fit:cover;border-radius:10px;float:right;margin:0 0 6px 8px';detail.append(photo)}
 const info=document.createElement('div');info.className='navo-client-info-grid';info.append(text('p','📍 '+([master?.city,master?.work_address].filter(Boolean).join(', ')||'Адрес не указан')),text('p','🕒 '+dateText(b.starts_at)));detail.append(info,text('h4','Услуги и стоимость'));
 const items=[];let cachedCode=null;
 const serviceLine=text('p','Услуги: '+Number(b.total_somoni||0)+' сом');serviceLine.className='navo-booking-services';card.append(serviceLine);detail.append(text('p','Итого: '+b.total_somoni+' сомони'));const chat=chatPanel(b.id,user.id,token(),b.status!=='cancelled','client',{name:master?.display_name||'Мастер NAVO',service:items.map(x=>x.service_name+' — '+x.price_somoni+' сом').join(', '),date:dateText(b.starts_at),phone:master?.phone,photo:master?.photo_url});detail.append(chat);
 let codeBox=null;
 if(b.status!=='completed'&&b.status!=='cancelled'){
  codeBox=document.createElement('div');codeBox.className='item navo-code-ticket';codeBox.style.textAlign='center';
  codeBox.append(text('p','Код подтверждения обслуживания'),text('h2','••••'),text('p','Покажите код мастеру после выполнения услуги.'));
  detail.append(codeBox);
 }
 bookingData[bookingIndex].then(({items:loadedItems,code})=>{
  if(!card.isConnected)return;
  const service=loadedItems.length?loadedItems.map(x=>x.service_name+' · '+x.price_somoni+' сом').join(' / '):'Услуги не указаны';
  serviceLine.textContent=service;
  const subtitle=chat.querySelector('.navo-messenger-subtitle');
  if(subtitle)subtitle.textContent=[loadedItems.map(x=>x.service_name+' — '+x.price_somoni+' сом').join(', '),dateText(b.starts_at)].filter(Boolean).join(' · ');
  if(codeBox){if(code){const digits=codeBox.querySelector('h2');digits.className='navo-ticket-digits';digits.textContent=String(code).padStart(4,'0').split('').join(' ')}else codeBox.querySelector('h2').textContent='Код недоступен'}
 }).catch(console.warn);
 if(['requested','confirmed'].includes(b.status)){
 const edit=button('Перенести запись',()=>{form.hidden=!form.hidden});const form=document.createElement('div');form.hidden=true;
 const currentDate=new Date(b.starts_at);const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(currentDate).replace(' ','T');
 const {date,time}=dateTimeControls(fmt.slice(0,10),fmt.slice(11,16));
 const feedback=text('p','');
 const save=button('Сохранить новое время',async()=>{try{if(!date.value||!time.value)throw Error('Выберите дату и время');const dt=new Date(date.value+'T'+time.value+':00+05:00');if(!Number.isFinite(dt.getTime()))throw Error('Некорректная дата');save.disabled=true;await rpc('navo_manage_booking',{p_booking:b.id,p_action:'reschedule',p_starts:dt.toISOString()});await clientCards(true)}catch(e){feedback.textContent='Ошибка: '+e.message;save.disabled=false}});
 form.append(text('p','Новая дата'),date,text('p','Новое время'),time,save,feedback);
 const cancel=button('Отменить запись',async()=>{try{cancel.disabled=true;cancel.textContent='Отменяем запись…';await rpc('navo_manage_booking',{p_booking:b.id,p_action:'cancel'});await clientCards(true)}catch(e){feedback.textContent='Ошибка отмены: '+e.message;cancel.disabled=false;cancel.textContent='Отменить запись'}});
 cancel.className='secondary full';const changes=document.createElement('div');changes.append(edit,form,cancel);const actions=document.createElement('div');actions.className='navo-booking-actions';const chatBtn=button('💬 Чат с мастером',()=>{chat.open=true});chatBtn.className='secondary';actions.append(chatBtn);{const call=document.createElement('a');call.href=master?.phone?'tel:'+String(master.phone).replace(/[^+\d]/g,''):'#';call.className='navo-booking-call';call.textContent='📞 Позвонить';if(!master?.phone){call.setAttribute('aria-disabled','true');call.onclick=e=>e.preventDefault()}actions.append(call)}const changeBtn=button('Отменить запись',()=>{changes.hidden=!changes.hidden});changeBtn.className='secondary';changes.hidden=true;actions.append(changeBtn);detail.append(actions,changes)
 }
 if(b.status==='completed'){
 const reviews=await get('/rest/v1/navo_reviews?select=stars&booking_id=eq.'+b.id).catch(()=>[]);
 if(reviews.length)detail.append(text('p','Ваша оценка: '+('★'.repeat(reviews[0].stars))));else{
 const row=document.createElement('div');row.append(text('p','Оцените мастера:'));
 for(let n=1;n<=5;n++){const star=button(n+' ★',async()=>{try{await rpc('navo_rate_booking',{p_booking:b.id,p_stars:n});await clientCards(true)}catch(e){alert(e.message)}});star.style.cssText='width:18%;display:inline-block;margin-right:1%;padding:10px 0';row.append(star)}detail.append(row)
 }}
 box.append(card)
 }
 navoSetBookingFocus(navoFocusedBookingId);
 // Chat messages are fetched only after opening a conversation.
}
let masterRenderRunning=false,masterRenderQueued=false;
async function masterCards(){
 if(masterRenderRunning){masterRenderQueued=true;return}
 masterRenderRunning=true;
 try{await renderMasterCards()}finally{
 masterRenderRunning=false;
 if(masterRenderQueued){masterRenderQueued=false;masterCards().catch(console.error)}
 }
}
async function renderMasterCards(){
 const s=api().getSession();if(!s)return;
 const rawRows=await get('/rest/v1/bookings?select=id,starts_at,status,client_phone,total_somoni&master_id=eq.'+encodeURIComponent(s.user.id)+'&order=starts_at.asc&limit=200',s.access_token);const rows=[...new Map(rawRows.map(b=>[b.id,b])).values()];
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const dateKey=x=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x));
 const numberedBookings=new Map();for(const [kind,items] of [['today',rows.filter(x=>dateKey(x.starts_at)===today)],['upcoming',rows.filter(x=>dateKey(x.starts_at)!==today&&new Date(x.starts_at).getTime()>=Date.now())]])items.forEach((b,i)=>numberedBookings.set(String(b.id),{number:i+1,kind}));window.navoMasterBookingNumbers=numberedBookings;
 try{const summary=await get('/rest/v1/navo_master_review_summary?select=average_stars,reviews_count&master_id=eq.'+s.user.id,s.access_token);const dash=$('ml-dashboard');if(dash){let rating=$('navo-master-rating');if(!rating){rating=document.createElement('p');rating.id='navo-master-rating';dash.insertBefore(rating,dash.firstChild)}rating.textContent=summary.length?'⭐ Рейтинг мастера: '+summary[0].average_stars+' / 5 · Оценок: '+summary[0].reviews_count:'⭐ Рейтинг мастера: пока нет оценок'}}catch(e){}
 for(const [kind,items] of [['today',rows.filter(x=>dateKey(x.starts_at)===today)],['upcoming',rows.filter(x=>dateKey(x.starts_at)!==today&&new Date(x.starts_at).getTime()>=Date.now())]]){
 const box=$('md-'+kind+'-list');if(!box)continue;box.replaceChildren();
 for(const [index,b] of items.entries()){const card=document.createElement('div');card.className='item navo-booking-tile';card.dataset.bookingCard=b.id;const shortStatus={confirmed:'Подтверждена',requested:'Ожидает',completed:'Завершена',cancelled:'Отменена'}[b.status]||b.status;
 const summary=document.createElement('div');summary.className='navo-booking-summary';
 const appointmentTime=navoTimeBadge(b.starts_at);const bookingNumber=text('span','№ '+(index+1));bookingNumber.className='navo-booking-number';summary.append(bookingNumber,appointmentTime,text('span','👤 '+(b.client_phone||'Клиент без номера')),text('span',shortStatus+' · '+b.total_somoni+' сом.'));
 const details=document.createElement('div');details.className='navo-master-booking-details';details.hidden=true;
 const open=button('Открыть клиента',()=>{const opening=details.hidden;box.classList.toggle('navo-focused-booking',opening);for(const tile of box.querySelectorAll('.navo-booking-tile')){tile.hidden=opening&&tile!==card;tile.classList.toggle('navo-active-booking',opening&&tile===card);const d=tile.querySelector('.navo-master-booking-details');if(d)d.hidden=true;const btn=tile.querySelector('.navo-booking-open');if(btn)btn.textContent='Открыть клиента'}details.hidden=!opening;open.textContent=opening?'← К списку клиентов':'Открыть клиента';if(!opening){for(const tile of box.querySelectorAll('.navo-booking-tile'))tile.hidden=false}});
 open.className='secondary navo-booking-open';
 card.append(summary,open,details);
 const serviceRows=await get('/rest/v1/navo_booking_items?select=service_name&booking_id=eq.'+b.id,s.access_token);details.append(text('p','Услуги: '+serviceRows.map(x=>x.service_name).join(', ')));details.append(chatPanel(b.id,s.user.id,s.access_token,b.status!=='cancelled','master'));
 if(['confirmed','requested'].includes(b.status)){
 const panel=document.createElement('div');panel.hidden=true;panel.className='item';
 panel.append(text('p','Попросите у клиента его четырёхзначный код после оказания услуги.'));
 const code=document.createElement('input');code.type='text';code.placeholder='Введите 4 цифры';code.inputMode='numeric';code.pattern='[0-9]{4}';code.maxLength=4;code.autocomplete='off';
 const result=text('p','');const confirm=button('Подтвердить обслуживание',async()=>{try{if(!/^[0-9]{4}$/.test(code.value))throw Error('Введите 4 цифры из кабинета клиента');confirm.disabled=true;const ok=await rpc('navo_complete_booking',{p_booking:b.id,p_code:code.value},s.access_token);if(!ok)throw Error('Неверный код. Проверьте четыре цифры.');await masterCards()}catch(e){result.textContent=e.message;confirm.disabled=false}});
 panel.append(code,confirm,result);
 const arrive=button('Клиент пришёл',()=>{panel.hidden=!panel.hidden;arrive.textContent=panel.hidden?'Клиент пришёл':'Скрыть ввод кода';if(!panel.hidden)code.focus()});
 const completion=document.createElement('div');completion.append(arrive,panel);details.append(navoCompactSection('🔑 Завершить обслуживание',completion))
}
 if(b.status==='completed')details.append(text('p','✓ Обслуживание завершено'));
 try{const ratings=await get('/rest/v1/navo_reviews?select=stars&booking_id=eq.'+b.id,s.access_token);if(ratings.length)details.append(text('p','Оценка клиента: '+('★'.repeat(ratings[0].stars))+' ('+ratings[0].stars+'/5)'));else if(b.status==='completed')details.append(text('p','Ожидается оценка клиента'));}catch(e){}
 box.append(card)}
 }
 updateBookingUnread().catch(console.error)
}
async function setupMasterSchedule(){
 const panel=$('md-profile');const session=api().getSession();if(!panel||!session?.access_token)return;
 let area=$('navo-schedule-panel');if(!area){
 area=document.createElement('section');area.id='navo-schedule-panel';area.className='item';
 const heading=text('h3','📅 Моё рабочее расписание');const explanation=text('p','NAVO автоматически подтверждает записи только в рабочее время. Пока длительность каждой услуги — 30 минут.');
 const days=document.createElement('div');days.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px';
 const checks=[];for(const [n,label] of [[1,'Понедельник'],[2,'Вторник'],[3,'Среда'],[4,'Четверг'],[5,'Пятница'],[6,'Суббота'],[7,'Воскресенье']]){const wrap=document.createElement('label');wrap.style.cssText='display:flex;align-items:center;gap:7px;font-weight:400;font-size:13px;margin:5px 0';const cb=document.createElement('input');cb.type='checkbox';cb.value=n;cb.style.width='auto';wrap.append(cb,document.createTextNode(label));days.append(wrap);checks.push(cb)}
 const start=document.createElement('select'),end=document.createElement('select');for(let h=0;h<24;h++)for(const m of ['00','30']){const v=String(h).padStart(2,'0')+':'+m;for(const el of [start,end]){const opt=document.createElement('option');opt.value=v;opt.textContent=v;el.append(opt)}}
 start.className='navo-time-select';end.className='navo-time-select';
 const feedback=text('p','');const save=button('Сохранить расписание',async()=>{try{const working_days=checks.filter(x=>x.checked).map(x=>Number(x.value));if(!working_days.length)throw Error('Выберите рабочие дни');if(start.value>=end.value)throw Error('Время окончания должно быть позже начала');save.disabled=true;await fetch(api().ROOT+'/rest/v1/navo_master_schedules?on_conflict=master_id',{method:'POST',headers:{apikey:api().KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({master_id:session.user.id,start_time:start.value,end_time:end.value,working_days})}).then(async r=>{if(!r.ok)throw Error((await r.json()).message||'Ошибка сохранения')});feedback.textContent='✓ Расписание сохранено. Запись клиентов будет автоматической.'}catch(e){feedback.textContent='Ошибка: '+e.message}finally{save.disabled=false}});
 area.append(heading,explanation,text('p','Рабочие дни'),days,text('p','Начало работы'),start,text('p','Конец работы'),end,save,feedback);
 panel.prepend(area);area._scheduleFields={checks,start,end};
 }
 const rows=await get('/rest/v1/navo_master_schedules?select=*&master_id=eq.'+session.user.id,session.access_token);
 const data=rows[0]||{working_days:[1,2,3,4,5,6,7],start_time:'09:00',end_time:'20:00'};
 const {checks,start,end}=area._scheduleFields;for(const cb of checks)cb.checked=data.working_days.includes(Number(cb.value));start.value=data.start_time.slice(0,5);end.value=data.end_time.slice(0,5);
}
document.addEventListener('DOMContentLoaded',()=>{setInterval(()=>{if(document.querySelector('.navo-chat[open]')||!$('ml-dashboard')?.classList.contains('hide'))updateBookingUnread().catch(console.error)},15000);attachMasterCards();$('tab-bookings')?.addEventListener('click',()=>clientCards().catch(console.error));window.addEventListener('navo-client-bookings-loaded',()=>clientCards().catch(e=>{const x=$('bookings-status');if(x)x.textContent='Ошибка отображения записи: '+e.message}));window.addEventListener('navo-master-open',()=>{setTimeout(()=>masterCards().catch(console.error),200);setupMasterSchedule().catch(console.error)});window.addEventListener('navo-master-bookings-loaded',()=>{masterCards().catch(console.error);setupMasterSchedule().catch(console.error)});});
})();