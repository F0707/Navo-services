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
 const box=$('catalog-items');box.replaceChildren();$('catalog')?.classList.add('navo-master-detail-open');box.append(button('← Назад',()=>api().catalog()),text('h3',master.display_name||'Мастер NAVO'),text('p',[master.city,master.work_address].filter(Boolean).join(', ')));
 const status=text('p','Загружаем услуги…');box.append(status);
 try{
 const rows=await get('/rest/v1/navo_test_master_prices?select=service_id,name,category,price_somoni&master_id=eq.'+encodeURIComponent(master.master_id)+'&order=category.asc,name.asc');
 status.textContent=rows.length?'Выберите одну или несколько услуг':'Мастер ещё не указал цены. Попросите мастера сохранить прайс-лист в личном кабинете.';
 if(!rows.length)return;
 const chosen=new Map(),groups={};for(const x of rows)(groups[x.category]??=[]).push(x);
 const total=text('h3','Итого: 0 сомони');
 const refresh=()=>{const sum=[...chosen.values()].reduce((a,x)=>a+Number(x.price_somoni),0);total.textContent='Итого: '+sum.toFixed(2)+' сомони';if(typeof checkSlot==='function')checkSlot()};
 for(const [category,items] of Object.entries(groups)){
 const group=document.createElement('details');group.className='item';group.open=true;const title=text('summary',category+' ('+items.length+')');title.style.cssText='font-weight:700;cursor:pointer;padding:10px 0';group.append(title);
 for(const item of items){const line=document.createElement('label');line.style.cssText='display:flex;align-items:center;gap:12px;padding:10px 0;font-weight:400';
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
 box.append(button('Перейти в мои записи',()=>{api().show('bookings');api().bookings()}));
 }catch(e){result.textContent='Ошибка: '+e.message;submit.disabled=false}
 });
 const availability=text('p','');let checkSeq=0;
 const checkSlot=async()=>{const seq=++checkSeq;if(!chosen.size){availability.textContent='Выберите услуги, чтобы проверить время';submit.disabled=false;return}
 availability.textContent='Проверяем свободное время…';submit.disabled=true;
 try{const dt=new Date(date.value+'T'+time.value+':00+05:00');const ok=await rpc('navo_slot_available',{p_master:master.master_id,p_starts:dt.toISOString(),p_minutes:chosen.size*30,p_exclude:null});if(seq!==checkSeq)return;
 availability.textContent=ok?'✓ Время свободно. Запись подтвердится автоматически.':'Это время занято или вне графика мастера. Выберите другое.';submit.disabled=!ok
 }catch(e){if(seq===checkSeq){availability.textContent='Не удалось проверить время: '+e.message;submit.disabled=true}}};
 date.onchange=checkSlot;time.onchange=checkSlot;
 box.append(date,time,note,availability,submit,result);
 checkSlot();
 }catch(e){status.textContent='Ошибка загрузки услуг: '+e.message}
}
async function attachMasterCards(){
 const box=$('catalog-items');if(!box||box.dataset.navoBookingWired)return;box.dataset.navoBookingWired='1';
 box.addEventListener('click',async e=>{
 const card=e.target.closest('.navo-master-card,.item');if(!card||!box.contains(card))return;
 if(e.target.closest('button'))return;
 try{
 const masters=await get('/rest/v1/navo_test_master_catalog?select=*&limit=100');
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
function chatPanel(bookingId,viewerId,accessToken,active,role){
 const wrap=document.createElement('div');wrap.className='item navo-chat-content';wrap.style.marginTop='10px';wrap.style.background='transparent';
 const header=text('h3','💬 Сообщения по записи');const info=text('p','Переписка видна только клиенту и мастеру.');info.className='muted';
 const messages=document.createElement('div');messages.style.cssText='max-height:260px;overflow-y:auto;padding:8px 0';
 const status=text('p','');status.className='muted';
 const input=document.createElement('textarea');input.className='navo-chat-input';input.rows=3;input.maxLength=500;input.placeholder='Напишите сообщение…';input.disabled=!active;
 const send=button('Отправить сообщение',async()=>{const body=input.value.trim();if(!body)return;send.disabled=true;try{
 const response=await fetch(api().ROOT+'/rest/v1/navo_booking_messages',{method:'POST',headers:{apikey:api().KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({booking_id:bookingId,sender_id:viewerId,body})});
 if(!response.ok){const err=await response.json().catch(()=>({}));throw Error(err.message||'Не удалось отправить сообщение')}
 input.value='';navoTone('outgoing');await refresh()
 }catch(e){status.textContent='Ошибка: '+e.message}finally{send.disabled=false}});
 const refresh=async()=>{try{const rows=await get('/rest/v1/navo_booking_messages?select=id,sender_id,body,created_at&booking_id=eq.'+bookingId+'&order=created_at.asc&limit=100',accessToken);
 messages.replaceChildren();if(!rows.length)messages.append(text('p','Сообщений пока нет'));
 for(const m of rows){const p=document.createElement('p');p.style.cssText='padding:10px 14px;border-radius:16px;margin:8px 0;max-width:86%;width:fit-content;overflow-wrap:anywhere;background:'+(m.sender_id===viewerId?'#174c3d':'#e8edf3')+';color:'+(m.sender_id===viewerId?'#ffffff':'#253648')+';margin-left:'+(m.sender_id===viewerId?'auto':'0')+';margin-right:'+(m.sender_id===viewerId?'0':'auto')+';text-align:left';p.textContent=(m.sender_id===viewerId?'Вы: ':'Собеседник: ')+m.body;messages.append(p)}
 status.textContent='Сообщений: '+rows.length;await markChatRead(bookingId,viewerId,accessToken);
 }catch(e){status.textContent='Ошибка загрузки переписки: '+e.message}};
 const quick=document.createElement('div');quick.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
 if(active)for(const phrase of ['Я в дороге','Опаздываю на 10 минут','Хорошо, жду','Буду через 5 минут']){const b=document.createElement('button');b.type='button';b.className='secondary';b.style.cssText='width:auto;padding:8px;font-size:13px';b.textContent=phrase;b.onclick=()=>{input.value=phrase;input.focus()};quick.append(b)}
 const refreshButton=document.createElement('button');refreshButton.type='button';refreshButton.className='secondary';refreshButton.textContent='Обновить сообщения';refreshButton.onclick=refresh;
 wrap.append(header,info,messages,status,quick,input,send,refreshButton);if(!active){input.hidden=true;send.hidden=true;quick.hidden=true;wrap.append(text('p','Запись закрыта. Переписка доступна только для чтения.'))}
 const details=document.createElement('details');details.dataset.chatBooking=bookingId;details.className='navo-chat';
 const summary=document.createElement('summary');summary.className='navo-chat-button';
 const glyph=document.createElement('span');glyph.textContent='💬';glyph.className='navo-chat-glyph';
 const title=document.createElement('span');title.textContent=role==='master'?'Чат с клиентом':'Чат с мастером';title.className='navo-chat-title';
 const dot=document.createElement('span');dot.className='navo-chat-dot';dot.dataset.chatUnread='1';dot.hidden=true;dot.textContent='1';
 summary.append(glyph,title,dot);details.append(summary,wrap);
 details.addEventListener('toggle',()=>{if(details.open){refresh();updateBookingUnread().catch(console.error)}});
 return details
}
let clientRenderRunning=false,clientRenderQueued=false;
window.navoChatPanel=chatPanel;
async function clientCards(){if(clientRenderRunning){clientRenderQueued=true;return}clientRenderRunning=true;try{await renderClientCards()}finally{clientRenderRunning=false;if(clientRenderQueued){clientRenderQueued=false;clientCards().catch(console.error)}}}
function navoTimeBadge(iso){
 const wrap=document.createElement('div');wrap.className='navo-time-badge';
 const heading=text('div','ВРЕМЯ ЗАПИСИ');heading.className='navo-time-heading';
 const when=text('div',dateText(iso));when.className='navo-time-when';
 wrap.append(heading,when);
 return wrap;
}
function navoCompactSection(title,child,open=false){
 const section=document.createElement('details');section.className='navo-compact-section';section.open=open;
 const summary=document.createElement('summary');summary.textContent=title;
 section.append(summary,child);return section;
}
async function renderClientCards(){
 const box=$('bookings-items');if(!box)return;
 const user=api().getAuth()?.user;if(!user)return;
 const rawRows=await get('/rest/v1/bookings?select=id,master_id,starts_at,status,total_somoni&client_id=eq.'+encodeURIComponent(user.id)+'&order=starts_at.desc&limit=100');const rows=[...new Map(rawRows.map(b=>[b.id,b])).values()];
 box.replaceChildren();if(!rows.length){box.append(text('p','У вас пока нет записей'));return}
 const masters=await get('/rest/v1/navo_test_master_catalog?select=master_id,display_name,city,work_address,photo_url&limit=100');const masterMap=new Map(masters.map(m=>[m.master_id,m]));
 for(const b of rows){
 const card=document.createElement('div');card.className='item navo-booking-tile';card.dataset.bookingCard=b.id;
 const master=masterMap.get(b.master_id);const title=text('strong',master?.display_name?'Мастер: '+master.display_name:'Мастер NAVO');const status=text('p','Статус: '+({completed:'Обслуживание завершено',cancelled:'Отменена',requested:'Ожидает подтверждения',confirmed:'Подтверждена'}[b.status]||b.status)+' · '+b.total_somoni+' сомони');
 const detail=document.createElement('div');detail.hidden=true;const appointmentDate=navoTimeBadge(b.starts_at);card.append(title,appointmentDate,status);
 const toggle=button('Открыть запись',()=>{const opening=detail.hidden;box.classList.toggle('navo-focused-booking',opening);for(const tile of box.querySelectorAll('.navo-booking-tile')){tile.hidden=opening&&tile!==card;tile.classList.toggle('navo-active-booking',opening&&tile===card);const d=tile.querySelector('.navo-client-booking-details');if(d)d.hidden=true;const btn=tile.querySelector('.navo-client-booking-open');if(btn)btn.textContent='Открыть запись'}detail.hidden=!opening;toggle.textContent=opening?'← К списку записей':'Открыть запись';if(!opening){for(const tile of box.querySelectorAll('.navo-booking-tile'))tile.hidden=false}});toggle.className='secondary navo-client-booking-open';detail.className='navo-client-booking-details';card.append(toggle,detail);
 if(master?.photo_url){const photo=document.createElement('img');photo.src=master.photo_url;photo.alt='Фото мастера';photo.style.cssText='width:48px;height:48px;object-fit:cover;border-radius:10px;float:right;margin:0 0 6px 8px';detail.append(photo)}
 const info=document.createElement('div');info.className='navo-client-info-grid';info.append(text('p','📍 '+([master?.city,master?.work_address].filter(Boolean).join(', ')||'Адрес не указан')),text('p','🕒 '+dateText(b.starts_at)));detail.append(info,text('h4','Услуги и стоимость'));
 const items=await get('/rest/v1/navo_booking_items?select=service_name,price_somoni&booking_id=eq.'+b.id);
 detail.append(text('p',items.length?items.map(x=>x.service_name+' — '+x.price_somoni+' сом.').join('; '):'Список услуг не сохранён'),text('p','Итого: '+b.total_somoni+' сомони'));detail.append(chatPanel(b.id,user.id,token(),b.status!=='cancelled','client'));
 if(b.status!=='completed'&&b.status!=='cancelled'){try{const code=await rpc('navo_get_booking_code',{p_booking:b.id});if(code){const codeBox=document.createElement('div');codeBox.className='item';codeBox.style.textAlign='center';const caption=text('p','Код подтверждения обслуживания');const digits=text('h2',String(code).padStart(4,'0'));digits.style.cssText='font-size:34px;letter-spacing:8px;margin:8px 0';codeBox.append(caption,digits,text('p','После окончания обслуживания сообщите эти 4 цифры мастеру. Мастер введёт код, чтобы завершить запись.'));detail.append(navoCompactSection('🔑 Код завершения услуги',codeBox))}}catch(e){}}
 if(['requested','confirmed'].includes(b.status)){
 const edit=button('Изменить дату и время',()=>{form.hidden=!form.hidden});const form=document.createElement('div');form.hidden=true;
 const currentDate=new Date(b.starts_at);const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(currentDate).replace(' ','T');
 const {date,time}=dateTimeControls(fmt.slice(0,10),fmt.slice(11,16));
 const feedback=text('p','');
 const save=button('Сохранить новое время',async()=>{try{if(!date.value||!time.value)throw Error('Выберите дату и время');const dt=new Date(date.value+'T'+time.value+':00+05:00');if(!Number.isFinite(dt.getTime()))throw Error('Некорректная дата');save.disabled=true;await rpc('navo_manage_booking',{p_booking:b.id,p_action:'reschedule',p_starts:dt.toISOString()});await clientCards()}catch(e){feedback.textContent='Ошибка: '+e.message;save.disabled=false}});
 form.append(text('p','Новая дата'),date,text('p','Новое время'),time,save,feedback);
 const cancel=button('Отменить запись',async()=>{try{cancel.disabled=true;cancel.textContent='Отменяем запись…';await rpc('navo_manage_booking',{p_booking:b.id,p_action:'cancel'});await clientCards()}catch(e){feedback.textContent='Ошибка отмены: '+e.message;cancel.disabled=false;cancel.textContent='Отменить запись'}});
 cancel.className='secondary full';const changes=document.createElement('div');changes.append(edit,form,cancel);detail.append(navoCompactSection('📅 Перенести или отменить запись',changes))
 }
 if(b.status==='completed'){
 const reviews=await get('/rest/v1/navo_reviews?select=stars&booking_id=eq.'+b.id);
 if(reviews.length)detail.append(text('p','Ваша оценка: '+('★'.repeat(reviews[0].stars))));else{
 const row=document.createElement('div');row.append(text('p','Оцените мастера:'));
 for(let n=1;n<=5;n++){const star=button(n+' ★',async()=>{try{await rpc('navo_rate_booking',{p_booking:b.id,p_stars:n});await clientCards()}catch(e){alert(e.message)}});star.style.cssText='width:18%;display:inline-block;margin-right:1%;padding:10px 0';row.append(star)}detail.append(row)
 }}
 box.append(card)
 }
 updateBookingUnread().catch(console.error)
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
document.addEventListener('DOMContentLoaded',()=>{setInterval(()=>updateBookingUnread().catch(console.error),15000);attachMasterCards();$('tab-bookings')?.addEventListener('click',()=>setTimeout(()=>clientCards().catch(console.error),150));window.addEventListener('navo-client-bookings-loaded',()=>clientCards().catch(e=>{const x=$('bookings-status');if(x)x.textContent='Ошибка отображения записи: '+e.message}));window.addEventListener('navo-master-open',()=>{setTimeout(()=>masterCards().catch(console.error),200);setupMasterSchedule().catch(console.error)});window.addEventListener('navo-master-bookings-loaded',()=>{masterCards().catch(console.error);setupMasterSchedule().catch(console.error)});});
})();