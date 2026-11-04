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
 const box=$('catalog-items');box.replaceChildren();const back=document.createElement('button');back.className='secondary';back.textContent='← Все мастера';back.onclick=()=>api().catalog();box.append(back);
 const heading=document.createElement('h3');heading.textContent=master.display_name;box.append(heading);
 const info=document.createElement('p');info.textContent=[master.city,master.work_address].filter(Boolean).join(', ');box.append(info);
 const status=document.createElement('p');status.textContent='Загрузка услуг…';box.append(status);
 try{
 const rows=await read('/rest/v1/navo_test_master_prices?select=service_id,name,category,price_somoni&master_id=eq.'+encodeURIComponent(master.master_id)+'&order=category.asc,name.asc',api().getAuth().access_token);
 status.textContent=rows.length?'Услуги и цены (сомони)':'Мастер ещё не указал цены. Для записи нужно сначала заполнить прайс-лист.';
 const groups={};for(const x of rows)(groups[x.category]??=[]).push(x);
 for(const [category,items] of Object.entries(groups)){const d=document.createElement('details');d.className='item';d.open=true;const sum=document.createElement('summary');sum.textContent=category;sum.style.fontWeight='700';d.append(sum);for(const item of items){const p=document.createElement('p');p.textContent=item.name+' — '+item.price_somoni+' сомони';d.append(p)}box.append(d)}
 }catch(e){status.textContent='Не удалось загрузить прайс-лист: '+e.message}
}
function observeCatalog(){
 const box=$('catalog-items');if(!box)return;
 const observer=new MutationObserver(()=>{
 for(const card of box.querySelectorAll('.item')){if(card.dataset.priceLink)return;const name=card.querySelector('strong');if(!name||card.querySelector('summary'))continue;
 card.dataset.priceLink='1';const button=document.createElement('button');button.className='primary full';button.type='button';button.textContent='Услуги и цены';button.onclick=async()=>{
 const rows=await read('/rest/v1/navo_test_master_catalog?select=*&limit=100',api().getAuth().access_token);
 const match=rows.find(x=>x.display_name===name.textContent);if(match)clientMaster(match);
 };card.append(button)}
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
document.addEventListener('DOMContentLoaded',()=>{observeCatalog();watchForms();wireSaving()});
})();