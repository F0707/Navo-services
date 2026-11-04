(()=>{
'use strict';
const $=id=>document.getElementById(id),api=()=>window.navoV72;
const token=()=>api().getAuth()?.access_token;
async function get(path,t=token()){return api().request(path,null,t,'GET')}
async function rpc(name,args,t=token()){return api().request('/rest/v1/rpc/'+name,args,t,'POST')}
const dateText=d=>new Date(d).toLocaleString('ru-RU',{timeZone:'Asia/Dushanbe',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e}
function button(label,action){const b=document.createElement('button');b.type='button';b.className='primary full';b.textContent=label;b.onclick=action;return b}
async function openMaster(master){
 const box=$('catalog-items');box.replaceChildren();box.append(button('← К списку мастеров',()=>api().catalog()),text('h3',master.display_name||'Мастер NAVO'),text('p',[master.city,master.work_address].filter(Boolean).join(', ')));
 const status=text('p','Загружаем услуги…');box.append(status);
 try{
 const rows=await get('/rest/v1/navo_test_master_prices?select=service_id,name,category,price_somoni&master_id=eq.'+encodeURIComponent(master.master_id)+'&order=category.asc,name.asc');
 status.textContent=rows.length?'Выберите одну или несколько услуг':'Мастер ещё не указал цены. Попросите мастера сохранить прайс-лист в личном кабинете.';
 if(!rows.length)return;
 const chosen=new Map(),groups={};for(const x of rows)(groups[x.category]??=[]).push(x);
 const total=text('h3','Итого: 0 сомони');
 const refresh=()=>{const sum=[...chosen.values()].reduce((a,x)=>a+Number(x.price_somoni),0);total.textContent='Итого: '+sum.toFixed(2)+' сомони'};
 for(const [category,items] of Object.entries(groups)){
 const group=document.createElement('details');group.className='item';group.open=true;const title=text('summary',category+' ('+items.length+')');title.style.cssText='font-weight:700;cursor:pointer;padding:10px 0';group.append(title);
 for(const item of items){const line=document.createElement('label');line.style.cssText='display:flex;align-items:center;gap:12px;padding:10px 0;font-weight:400';
 const check=document.createElement('input');check.type='checkbox';check.style.width='auto';check.onchange=()=>{if(check.checked)chosen.set(item.service_id,item);else chosen.delete(item.service_id);refresh()};
 const name=text('span',item.name);name.style.flex='1';const price=text('strong',item.price_somoni+' сом.');line.append(check,name,price);group.append(line)}box.append(group)
 }
 box.append(total,text('h3','Дата и время посещения'));
 const date=document.createElement('input');date.type='date';const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());date.min=today;date.value=today;
 const time=document.createElement('input');time.type='time';time.value='10:00';time.step=1800;
 const note=text('p','Время указано по Душанбе. Мастер должен подтвердить доступность выбранного времени вне приложения, пока расписание не настроено.');
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
 box.append(date,time,note,submit,result);
 }catch(e){status.textContent='Ошибка загрузки услуг: '+e.message}
}
async function attachMasterCards(){
 const box=$('catalog-items');if(!box||box.dataset.navoBookingWired)return;box.dataset.navoBookingWired='1';
 box.addEventListener('click',async e=>{
 const card=e.target.closest('.item');if(!card||!box.contains(card))return;
 if(e.target.closest('button')){if(e.target.textContent?.includes('Услуги и цены')){e.preventDefault();e.stopImmediatePropagation()}else return}
 const name=card.querySelector('strong')?.textContent;if(!name)return;
 try{const masters=await get('/rest/v1/navo_test_master_catalog?select=*&limit=100');const master=masters.find(x=>x.display_name===name);if(master)await openMaster(master)}catch(err){alert('Не удалось открыть мастера: '+err.message)}
 },true);
}
async function markChatRead(bookingId,viewerId,accessToken){
 const response=await fetch(api().ROOT+'/rest/v1/navo_message_reads?on_conflict=booking_id,user_id',{method:'POST',headers:{apikey:api().KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({booking_id:bookingId,user_id:viewerId,last_read_at:new Date().toISOString()})});
 if(response.ok){const dot=document.querySelector('[data-booking-card="'+bookingId+'"] [data-unread-dot]');if(dot){dot.hidden=true;dot.style.display='none'}}
}
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
 for(const card of document.querySelectorAll('[data-booking-card]')){const count=counts.get(card.dataset.bookingCard)||0;let dot=card.querySelector('[data-unread-dot]');if(!dot){dot=document.createElement('span');dot.dataset.unreadDot='1';dot.style.cssText='display:inline-block;background:#f7c94a;color:#3a2b00;border-radius:30px;padding:5px 10px;margin:8px 0;font-weight:700';card.insertBefore(dot,card.firstChild)}dot.textContent='🟡 '+count+' новых сообщений';dot.hidden=!count;dot.style.display=count?'inline-block':'none'}
 const clientTab=$('tab-bookings');if(clientTab&&!masterView){const n=[...counts.values()].reduce((a,b)=>a+b,0);clientTab.textContent=n?'Мои записи 🟡 '+n:'Мои записи'}
}
function chatPanel(bookingId,viewerId,accessToken,active){
 const wrap=document.createElement('div');wrap.className='item';wrap.style.marginTop='14px';wrap.style.background='transparent';
 const header=text('h3','💬 Сообщения по записи');const info=text('p','Переписка видна только клиенту и мастеру.');info.className='muted';
 const messages=document.createElement('div');messages.style.cssText='max-height:260px;overflow-y:auto;padding:8px 0';
 const status=text('p','');status.className='muted';
 const input=document.createElement('textarea');input.rows=2;input.maxLength=500;input.placeholder='Напишите сообщение…';input.disabled=!active;
 const send=button('Отправить сообщение',async()=>{const body=input.value.trim();if(!body)return;send.disabled=true;try{
 const response=await fetch(api().ROOT+'/rest/v1/navo_booking_messages',{method:'POST',headers:{apikey:api().KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({booking_id:bookingId,sender_id:viewerId,body})});
 if(!response.ok){const err=await response.json().catch(()=>({}));throw Error(err.message||'Не удалось отправить сообщение')}
 input.value='';await refresh()
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
 const details=document.createElement('details');details.dataset.chatBooking=bookingId;details.append(Object.assign(document.createElement('summary'),{textContent:'Открыть чат'}),wrap);details.addEventListener('toggle',()=>{if(details.open)refresh()});return details
}
let clientRenderRunning=false,clientRenderQueued=false;
window.navoChatPanel=chatPanel;
async function clientCards(){if(clientRenderRunning){clientRenderQueued=true;return}clientRenderRunning=true;try{await renderClientCards()}finally{clientRenderRunning=false;if(clientRenderQueued){clientRenderQueued=false;clientCards().catch(console.error)}}}
async function renderClientCards(){
 const box=$('bookings-items');if(!box)return;
 const user=api().getAuth()?.user;if(!user)return;
 const rows=await get('/rest/v1/bookings?select=id,master_id,starts_at,status,total_somoni&client_id=eq.'+encodeURIComponent(user.id)+'&order=starts_at.desc&limit=100');
 box.replaceChildren();if(!rows.length){box.append(text('p','У вас пока нет записей'));return}
 const masters=await get('/rest/v1/navo_test_master_catalog?select=master_id,display_name,city,work_address,photo_url&limit=100');const masterMap=new Map(masters.map(m=>[m.master_id,m]));
 for(const b of rows){
 const card=document.createElement('div');card.className='item';card.dataset.bookingCard=b.id;
 const master=masterMap.get(b.master_id);const title=text('strong',master?.display_name?'Мастер: '+master.display_name:'Мастер NAVO');const status=text('p','Статус: '+({completed:'Обслуживание завершено',cancelled:'Отменена',requested:'Ожидает подтверждения',confirmed:'Подтверждена'}[b.status]||b.status)+' · '+b.total_somoni+' сомони');
 const detail=document.createElement('div');detail.hidden=true;card.append(title,text('p',dateText(b.starts_at)),status);
 const toggle=button('Открыть запись',()=>{detail.hidden=!detail.hidden;toggle.textContent=detail.hidden?'Открыть запись':'Свернуть запись'});card.append(toggle,detail);
 if(master?.photo_url){const photo=document.createElement('img');photo.src=master.photo_url;photo.alt='Фото мастера';photo.style.cssText='width:76px;height:76px;object-fit:cover;border-radius:12px';detail.append(photo)}
 detail.append(text('h3','Ваш мастер'),text('p',master?.display_name||'Мастер NAVO'),text('p','Адрес: '+([master?.city,master?.work_address].filter(Boolean).join(', ')||'Адрес не указан')),text('h3','Дата и время'),text('p',dateText(b.starts_at)),text('h3','Выбранные услуги'));
 const items=await get('/rest/v1/navo_booking_items?select=service_name,price_somoni&booking_id=eq.'+b.id);
 detail.append(text('p',items.length?items.map(x=>x.service_name+' — '+x.price_somoni+' сом.').join('; '):'Для этой старой записи список услуг не сохранён'),text('h3','Итого: '+b.total_somoni+' сомони'));detail.append(chatPanel(b.id,user.id,token(),!['cancelled','completed'].includes(b.status)));
 if(b.status!=='completed'&&b.status!=='cancelled'){try{const code=await rpc('navo_get_booking_code',{p_booking:b.id});if(code){const codeBox=document.createElement('div');codeBox.className='item';codeBox.style.textAlign='center';const caption=text('p','Код подтверждения обслуживания');const digits=text('h2',String(code).padStart(4,'0'));digits.style.cssText='font-size:34px;letter-spacing:8px;margin:8px 0';codeBox.append(caption,digits,text('p','После окончания обслуживания сообщите эти 4 цифры мастеру. Мастер введёт код, чтобы завершить запись.'));detail.append(codeBox)}}catch(e){}}
 if(['requested','confirmed'].includes(b.status)){
 const edit=button('Изменить дату и время',()=>{form.hidden=!form.hidden});const form=document.createElement('div');form.hidden=true;
 const date=document.createElement('input');date.type='date';const time=document.createElement('input');time.type='time';time.step=1800;
 const currentDate=new Date(b.starts_at);const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(currentDate).replace(' ','T');
 date.value=fmt.slice(0,10);date.min=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());time.value=fmt.slice(11,16);
 const feedback=text('p','');
 const save=button('Сохранить новое время',async()=>{try{if(!date.value||!time.value)throw Error('Выберите дату и время');const dt=new Date(date.value+'T'+time.value+':00+05:00');if(!Number.isFinite(dt.getTime()))throw Error('Некорректная дата');save.disabled=true;await rpc('navo_manage_booking',{p_booking:b.id,p_action:'reschedule',p_starts:dt.toISOString()});await clientCards()}catch(e){feedback.textContent='Ошибка: '+e.message;save.disabled=false}});
 form.append(text('p','Новая дата'),date,text('p','Новое время'),time,save,feedback);
 const cancel=button('Отменить запись',async()=>{if(!confirm('Отменить эту запись? Это действие нельзя отменить.'))return;try{cancel.disabled=true;await rpc('navo_manage_booking',{p_booking:b.id,p_action:'cancel'});await clientCards()}catch(e){alert('Ошибка отмены: '+e.message);cancel.disabled=false}});
 cancel.className='secondary full';detail.append(edit,form,cancel)
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
async function masterCards(){
 const s=api().getSession();if(!s)return;
 const rows=await get('/rest/v1/bookings?select=id,starts_at,status,client_phone,total_somoni&master_id=eq.'+encodeURIComponent(s.user.id)+'&order=starts_at.asc&limit=200',s.access_token);
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const dateKey=x=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x));
 try{const summary=await get('/rest/v1/navo_master_review_summary?select=average_stars,reviews_count&master_id=eq.'+s.user.id,s.access_token);const dash=$('ml-dashboard');if(dash){let rating=$('navo-master-rating');if(!rating){rating=document.createElement('p');rating.id='navo-master-rating';dash.insertBefore(rating,dash.firstChild)}rating.textContent=summary.length?'⭐ Рейтинг мастера: '+summary[0].average_stars+' / 5 · Оценок: '+summary[0].reviews_count:'⭐ Рейтинг мастера: пока нет оценок'}}catch(e){}
 for(const [kind,items] of [['today',rows.filter(x=>dateKey(x.starts_at)===today)],['upcoming',rows.filter(x=>new Date(x.starts_at).getTime()>=Date.now())]]){
 const box=$('md-'+kind+'-list');if(!box)continue;box.replaceChildren();
 for(const b of items){const card=document.createElement('div');card.className='item';card.dataset.bookingCard=b.id;card.append(text('strong',dateText(b.starts_at)),text('p','Клиент: '+(b.client_phone||'номер не указан')+' · '+b.total_somoni+' сомони · '+b.status));
 const serviceRows=await get('/rest/v1/navo_booking_items?select=service_name&booking_id=eq.'+b.id,s.access_token);card.append(text('p',serviceRows.map(x=>x.service_name).join(', ')));card.append(chatPanel(b.id,s.user.id,s.access_token,!['cancelled','completed'].includes(b.status)));
 if(['confirmed','requested'].includes(b.status)){
 const panel=document.createElement('div');panel.hidden=true;panel.className='item';
 panel.append(text('p','Попросите у клиента его четырёхзначный код после оказания услуги.'));
 const code=document.createElement('input');code.type='text';code.placeholder='Введите 4 цифры';code.inputMode='numeric';code.pattern='[0-9]{4}';code.maxLength=4;code.autocomplete='off';
 const result=text('p','');const confirm=button('Подтвердить обслуживание',async()=>{try{if(!/^[0-9]{4}$/.test(code.value))throw Error('Введите 4 цифры из кабинета клиента');confirm.disabled=true;const ok=await rpc('navo_complete_booking',{p_booking:b.id,p_code:code.value},s.access_token);if(!ok)throw Error('Неверный код. Проверьте четыре цифры.');await masterCards()}catch(e){result.textContent=e.message;confirm.disabled=false}});
 panel.append(code,confirm,result);
 const arrive=button('Клиент пришёл',()=>{panel.hidden=!panel.hidden;arrive.textContent=panel.hidden?'Клиент пришёл':'Скрыть ввод кода';if(!panel.hidden)code.focus()});
 card.append(arrive,panel)
}
 if(b.status==='completed')card.append(text('p','✓ Обслуживание завершено'));
 try{const ratings=await get('/rest/v1/navo_reviews?select=stars&booking_id=eq.'+b.id,s.access_token);if(ratings.length)card.append(text('p','Оценка клиента: '+('★'.repeat(ratings[0].stars))+' ('+ratings[0].stars+'/5)'));else if(b.status==='completed')card.append(text('p','Ожидается оценка клиента'));}catch(e){}
 box.append(card)}
 }
 updateBookingUnread().catch(console.error)
}
document.addEventListener('DOMContentLoaded',()=>{setInterval(()=>updateBookingUnread().catch(console.error),15000);attachMasterCards();$('tab-bookings')?.addEventListener('click',()=>setTimeout(()=>clientCards().catch(console.error),150));window.addEventListener('navo-client-bookings-loaded',()=>clientCards().catch(e=>{const x=$('bookings-status');if(x)x.textContent='Ошибка отображения записи: '+e.message}));window.addEventListener('navo-master-open',()=>setTimeout(()=>masterCards().catch(console.error),200));window.addEventListener('navo-master-bookings-loaded',()=>masterCards().catch(console.error));});
})();