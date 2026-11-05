(()=>{
'use strict';
const $=id=>document.getElementById(id);
const api=()=>window.navoV72;
async function read(path,token){return api().request(path,null,token,'GET')}
async function write(path,method,token,body){
 const r=await fetch(api().ROOT+path,{method,headers:{apikey:api().KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 if(!r.ok){const v=await r.json().catch(()=>({}));throw Error(v.message||v.error||'Ошибка '+r.status)}return r;
}
function pricePicker(box,rows,selected,prices){
 box.replaceChildren();const groups={};for(const item of rows)(groups[item.category]??=[]).push(item);
 for(const [category,items] of Object.entries(groups)){
 const details=document.createElement('details');details.className='item';details.open=items.some(x=>selected.includes(Number(x.id)));
 const title=document.createElement('summary');title.style.cssText='cursor:pointer;font-weight:700;padding:10px';title.textContent=category+' ('+items.length+')';details.append(title);
 for(const item of items){
 const line=document.createElement('div');line.style.cssText='display:grid;grid-template-columns:24px minmax(0,1fr) 100px;gap:8px;align-items:center;margin:10px 0';
 const cb=document.createElement('input');cb.type='checkbox';cb.value=item.id;cb.checked=selected.includes(Number(item.id));cb.style.width='auto';
 const name=document.createElement('span');name.textContent=item.name;
 const price=document.createElement('input');price.type='number';price.min='1';price.step='0.01';price.placeholder='сомони';price.value=prices[item.id]??'';price.dataset.priceFor=item.id;price.disabled=!cb.checked;price.setAttribute('aria-label','Цена '+item.name);
 cb.onchange=()=>{price.disabled=!cb.checked};line.append(cb,name,price);details.append(line)
 }box.append(details)
 }
}
function chosen(box){const selected=[...box.querySelectorAll('input[type=checkbox]:checked')];if(!selected.length)throw Error('Выберите услугу');return selected.map(cb=>{const price=Number(box.querySelector('[data-price-for="'+cb.value+'"]').value);if(!(price>0))throw Error('Укажите цену для каждой выбранной услуги');return {service_id:Number(cb.value),price_somoni:price}})}
async function savePrices(uid,token,items){await write('/rest/v1/navo_master_prices?master_id=eq.'+encodeURIComponent(uid),'DELETE',token);await write('/rest/v1/navo_master_prices','POST',token,items.map(x=>({...x,master_id:uid})))}
async function editor(box,token,uid,selected){
 const rows=await read('/rest/v1/service_catalog?select=id,category,name&order=category.asc,name.asc&limit=500',token);
 const saved=uid?await read('/rest/v1/navo_master_prices?select=service_id,price_somoni&master_id=eq.'+encodeURIComponent(uid),token):[];
 const prices={};for(const x of saved)prices[x.service_id]=x.price_somoni;pricePicker(box,rows,selected,prices);
}
async function clientMaster(master){
 const box=$('catalog-items');box.replaceChildren();
 const back=document.createElement('button');back.type='button';back.className='secondary';back.textContent='← К списку мастеров';back.onclick=()=>api().catalog();box.append(back);
 const profile=document.createElement('section');profile.className='navo-client-master-profile';
 const header=document.createElement('div');header.className='navo-client-master-header';
 if(master.photo_url){const portrait=document.createElement('img');portrait.src=master.photo_url;portrait.alt='Фото мастера';portrait.className='navo-client-master-portrait';header.append(portrait)}
 const identity=document.createElement('div');const name=document.createElement('h3');name.textContent=master.display_name||'Мастер NAVO';identity.append(name);
 const address=document.createElement('p');address.textContent='📍 '+([master.city,master.work_address].filter(Boolean).join(', ')||'Адрес уточняется');identity.append(address);
 if(master.experience_years!==null&&master.experience_years!==undefined){const years=document.createElement('p');years.textContent='🏅 Стаж работы: '+master.experience_years+' лет';identity.append(years)}
 header.append(identity);profile.append(header);
 const phone=document.createElement('p');phone.textContent='📞 '+(master.phone||'Номер телефона не указан');identity.append(phone);
 const makeSection=(label,open=false)=>{const d=document.createElement('details');d.className='navo-master-detail-section';d.open=open;const summary=document.createElement('summary');summary.textContent=label;d.append(summary);profile.append(d);return d};
 const about=makeSection('👤 Информация о мастере',true);
 const rating=document.createElement('p');rating.className='navo-client-master-rating';rating.textContent='⭐ Рейтинг: загружается…';about.append(rating);
 const gallery=makeSection('✂ Выполненные работы и виды причёсок');
 const works=document.createElement('div');works.className='navo-client-master-works';
 for(const url of (Array.isArray(master.portfolio_urls)?master.portfolio_urls:[])){const image=document.createElement('img');image.src=url;image.loading='lazy';image.alt='Причёска, выполненная мастером';works.append(image)}
 if(!works.children.length){const empty=document.createElement('p');empty.textContent='Фотографии работ пока не добавлены';works.append(empty)}
 gallery.append(works);box.append(profile);
 const tokenForRating=api().getAuth()?.access_token;
 read('/rest/v1/navo_master_review_summary?select=average_stars,reviews_count&master_id=eq.'+encodeURIComponent(master.master_id),tokenForRating).then(rows=>{rating.textContent=rows.length?'⭐ Рейтинг: '+rows[0].average_stars+' / 5 · '+rows[0].reviews_count+' оценок':'⭐ Пока нет оценок'}).catch(()=>{rating.textContent='⭐ Рейтинг пока недоступен'});

 const info=document.createElement('p');info.textContent=[master.city,master.work_address].filter(Boolean).join(', ');box.append(info);
 const servicesPanel=document.createElement('details');servicesPanel.className='navo-master-detail-section';servicesPanel.open=false;const servicesSummary=document.createElement('summary');servicesSummary.textContent='💈 Виды услуг, цены и запись';servicesPanel.append(servicesSummary);box.append(servicesPanel);
 const message=document.createElement('p');message.className='muted';message.textContent='Загружаем услуги…';servicesPanel.append(message);
 try{
 const token=api().getAuth().access_token;
 const [priced,all]=await Promise.all([
 read('/rest/v1/navo_test_master_prices?select=service_id,name,category,price_somoni&master_id=eq.'+encodeURIComponent(master.master_id)+'&order=category.asc,name.asc',token),
 read('/rest/v1/service_catalog?select=id,name,category&order=category.asc,name.asc&limit=500',token)
 ]);
 const byId=new Map(priced.map(x=>[Number(x.service_id),x]));
 const chosenIds=Array.isArray(master.services)?master.services.map(Number):[];
 const rows=chosenIds.map(id=>{const p=byId.get(id),base=all.find(x=>Number(x.id)===id);return p|| (base?{service_id:id,name:base.name,category:base.category,price_somoni:null}:null)}).filter(Boolean);
 message.textContent=rows.length?'Отметьте нужные услуги. Цена указывается в сомони.':'Мастер пока не выбрал услуги.';
 const selected=new Map();const total=document.createElement('strong');total.style.cssText='display:block;font-size:21px;margin:18px 0';
 const date=document.createElement('input');date.type='date';date.setAttribute('aria-label','Дата записи');
 const local=new Date(Date.now()+5*3600000);date.min=local.toISOString().slice(0,10);date.value=date.min;
 const time=document.createElement('input');time.type='time';time.value='10:00';time.step='1800';time.setAttribute('aria-label','Время записи');
 const submit=document.createElement('button');submit.className='primary full';submit.textContent='Отправить заявку на запись';
 const update=()=>{const sum=[...selected.values()].reduce((n,x)=>n+Number(x.price_somoni),0);total.textContent='Итого: '+sum.toFixed(2)+' сомони';submit.disabled=!selected.size};
 const groups={};for(const item of rows)(groups[item.category]??=[]).push(item);
 for(const [category,items] of Object.entries(groups)){
 const d=document.createElement('details');d.className='item';d.open=true;
 const summary=document.createElement('summary');summary.style.cssText='font-weight:750;cursor:pointer;padding:8px';summary.textContent=category+' ('+items.length+')';d.append(summary);
 for(const item of items){
 const line=document.createElement('label');line.style.cssText='display:flex;align-items:center;gap:10px;font-weight:400;margin:10px 0';
 const cb=document.createElement('input');cb.type='checkbox';cb.style.width='auto';cb.disabled=!(Number(item.price_somoni)>0);
 const name=document.createElement('span');name.style.flex='1';name.textContent=item.name;
 const price=document.createElement('strong');price.textContent=cb.disabled?'Цена не указана':Number(item.price_somoni).toFixed(2)+' сом.';
 cb.onchange=()=>{if(cb.checked)selected.set(item.service_id,item);else selected.delete(item.service_id);update()};
 line.append(cb,name,price);d.append(line)
 }box.append(d)
 }
 const section=document.createElement('div');section.className='item';
 const labelDate=document.createElement('label');labelDate.textContent='Дата посещения';const labelTime=document.createElement('label');labelTime.textContent='Время посещения';
 const notice=document.createElement('p');notice.className='muted';notice.textContent='Выбранное время — заявка, а не подтверждённая бронь. Мастер должен её подтвердить.';
 const result=document.createElement('p');result.setAttribute('role','status');
 submit.onclick=async()=>{
 if(!selected.size){result.textContent='Выберите хотя бы одну услугу';return}
 if(!date.value||!time.value){result.textContent='Выберите дату и время';return}
 const start=new Date(date.value+'T'+time.value+':00+05:00');if(!(start.getTime()>Date.now())){result.textContent='Выберите будущую дату и время';return}
 submit.disabled=true;result.textContent='Отправляем заявку…';
 try{
 const auth=api().getAuth();const user=auth.user;const services=[...selected.values()];
 const payload={client_id:user.id,master_id:master.master_id,starts_at:start.toISOString(),status:'requested',client_phone:user.phone||auth.navo_phone||null,total_somoni:services.reduce((n,x)=>n+Number(x.price_somoni),0)};
 const response=await fetch(api().ROOT+'/rest/v1/bookings',{method:'POST',headers:{apikey:api().KEY,Authorization:'Bearer '+auth.access_token,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload)});
 if(!response.ok){const e=await response.json().catch(()=>({}));throw Error(e.message||'Ошибка создания заявки')}
 const created=await response.json();if(!created[0]?.id)throw Error('Не получен номер заявки');
 await write('/rest/v1/navo_booking_services','POST',auth.access_token,services.map(x=>({booking_id:created[0].id,service_id:x.service_id,service_name:x.name,price_somoni:x.price_somoni})));
 result.textContent='✓ Заявка отправлена мастеру. Посмотреть её можно в разделе «Мои записи».';
 submit.textContent='Заявка отправлена';submit.disabled=true;
 }catch(e){result.textContent='Не удалось отправить заявку: '+e.message;submit.disabled=false}
 };
 section.append(total,labelDate,date,labelTime,time,notice,submit,result);servicesPanel.append(section);update();
 }catch(e){message.textContent='Не удалось открыть услуги: '+e.message}
}
function observeCatalog(){
 const box=$('catalog-items');if(!box)return;
 const observer=new MutationObserver(()=>{
 for(const card of box.querySelectorAll('.navo-master-card')){
 if(card.dataset.priceLink)return;
 card.dataset.priceLink='1';card.style.cursor='pointer';
 const open=async()=>{const rows=await read('/rest/v1/navo_test_master_catalog?select=*&limit=100',api().getAuth().access_token);const match=rows.find(x=>String(x.master_id)===String(card.dataset.masterId));if(match)clientMaster(match)};
 card.addEventListener('click',e=>{if(e.target.closest('button,details,a'))return;open()});
 card.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target===card){e.preventDefault();open()}});
 const buttons=card.querySelectorAll('button');for(const button of buttons){button.addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();open()},true)}
 }
 });observer.observe(box,{childList:true,subtree:false});
}
let editReady=false,registerReady=false,latestEdit=[];
function watchForms(){
 const observer=new MutationObserver(()=>{
 const edit=$('md-services'),session=api().getSession(),master=api().getMaster();
 if(edit&&session&&master&&!editReady&&edit.querySelectorAll('input[type=checkbox]').length){editReady=true;editor(edit,session.access_token,session.user.id,master.services.map(Number)).catch(console.error)}
 if(!edit||!session)editReady=false;
 const reg=$('mr-services');if(reg&&!registerReady&&reg.querySelectorAll('input[type=checkbox]').length){registerReady=true;editor(reg,api().getAuth().access_token,null,[]).catch(console.error)}
 if(!reg)registerReady=false;
 });observer.observe(document.body,{subtree:true,childList:true});
}
function wireSaving(){
 const save=$('md-save');if(save)save.addEventListener('click',e=>{const box=$('md-services');try{latestEdit=chosen(box)}catch(err){e.preventDefault();e.stopImmediatePropagation();alert(err.message)}},true);
 window.addEventListener('navo-master-saved',async()=>{try{const s=api().getSession();await savePrices(s.user.id,s.access_token,latestEdit);alert('Цены на услуги сохранены')}catch(e){alert('Профиль сохранён, но цены не сохранены: '+e.message)}});
 const register=$('mr-submit');if(register)register.addEventListener('click',e=>{try{window.__navoRegPrices=chosen($('mr-services'))}catch(err){e.preventDefault();e.stopImmediatePropagation();alert(err.message)}},true);
 window.addEventListener('navo-master-registered',async()=>{try{const auth=api().getAuth();await savePrices(auth.user.id,auth.access_token,window.__navoRegPrices||[])}catch(e){alert('Анкета сохранена, но цены: '+e.message)}});
}
document.addEventListener('DOMContentLoaded',()=>{watchForms();wireSaving()});
})();