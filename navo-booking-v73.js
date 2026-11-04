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
async function clientCards(){
 const box=$('bookings-items');if(!box)return;
 const rows=await get('/rest/v1/bookings?select=id,master_id,starts_at,status,total_somoni&client_id=eq.'+encodeURIComponent(api().getAuth().user.id)+'&order=starts_at.desc&limit=100');
 box.replaceChildren();if(!rows.length){box.append(text('p','У вас пока нет записей'));return}
 for(const b of rows){
 const card=document.createElement('div');card.className='item';card.append(text('strong',dateText(b.starts_at)),text('p','Статус: '+(b.status==='completed'?'Обслуживание завершено':'Запись подтверждена')+' · '+b.total_somoni+' сомони'));
 const items=await get('/rest/v1/navo_booking_items?select=service_name,price_somoni&booking_id=eq.'+b.id);card.append(text('p',items.map(x=>x.service_name+' — '+x.price_somoni+' сом.').join('; ')));
 if(b.status!=='completed'){try{const code=await rpc('navo_get_booking_code',{p_booking:b.id});if(code)card.append(text('h3','Код посещения: '+code))}catch(e){}}
 if(b.status==='completed'){
 const reviews=await get('/rest/v1/navo_reviews?select=stars&booking_id=eq.'+b.id);
 if(reviews.length)card.append(text('p','Ваша оценка: '+('★'.repeat(reviews[0].stars))));else{
 const row=document.createElement('div');row.append(text('p','Оцените мастера:'));
 for(let n=1;n<=5;n++){const star=button(n+' ★',async()=>{try{await rpc('navo_rate_booking',{p_booking:b.id,p_stars:n});await clientCards()}catch(e){alert(e.message)}});star.style.cssText='width:18%;display:inline-block;margin-right:1%;padding:10px 0';row.append(star)}card.append(row)
 }}
 box.append(card)
 }
}
async function masterCards(){
 const s=api().getSession();if(!s)return;
 const rows=await get('/rest/v1/bookings?select=id,starts_at,status,client_phone,total_somoni&master_id=eq.'+encodeURIComponent(s.user.id)+'&order=starts_at.asc&limit=200',s.access_token);
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const dateKey=x=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x));
 for(const [kind,items] of [['today',rows.filter(x=>dateKey(x.starts_at)===today)],['upcoming',rows.filter(x=>new Date(x.starts_at).getTime()>=Date.now())]]){
 const box=$('md-'+kind+'-list');if(!box)continue;box.replaceChildren();
 for(const b of items){const card=document.createElement('div');card.className='item';card.append(text('strong',dateText(b.starts_at)),text('p','Клиент: '+(b.client_phone||'номер не указан')+' · '+b.total_somoni+' сомони · '+b.status));
 const serviceRows=await get('/rest/v1/navo_booking_items?select=service_name&booking_id=eq.'+b.id,s.access_token);card.append(text('p',serviceRows.map(x=>x.service_name).join(', ')));
 if(b.status==='confirmed'){const code=document.createElement('input');code.placeholder='4-значный код клиента';code.inputMode='numeric';code.maxLength=4;const result=text('p','');card.append(code,button('Клиент обслужен — закрыть запись',async()=>{try{const ok=await rpc('navo_complete_booking',{p_booking:b.id,p_code:code.value},s.access_token);if(!ok)throw Error('Неверный код. Проверьте четыре цифры.');await masterCards()}catch(e){result.textContent=e.message}}),result)}
 if(b.status==='completed')card.append(text('p','✓ Обслуживание завершено'));
 box.append(card)}
 }
}
document.addEventListener('DOMContentLoaded',()=>{attachMasterCards();$('tab-bookings')?.addEventListener('click',()=>setTimeout(()=>clientCards().catch(console.error),150));window.addEventListener('navo-master-open',()=>setTimeout(()=>masterCards().catch(console.error),200));window.addEventListener('navo-master-bookings-loaded',()=>masterCards().catch(console.error));});
})();