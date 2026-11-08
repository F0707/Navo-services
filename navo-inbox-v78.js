(()=>{
'use strict';
const $=id=>document.getElementById(id),a=()=>window.navoV72;
let busy=false,lastUser='',timer=null;
const fmt=d=>new Date(d).toLocaleString('ru-RU',{timeZone:'Asia/Dushanbe',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const label=(tag,t)=>{const e=document.createElement(tag);e.textContent=t;return e};
async function read(path,t){return a().request(path,null,t,'GET')}
async function markRead(id,uid,token){const r=await fetch(a().ROOT+'/rest/v1/navo_message_reads?on_conflict=booking_id,user_id',{method:'POST',headers:{apikey:a().KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({booking_id:id,user_id:uid,last_read_at:new Date().toISOString()})});if(!r.ok)throw Error('Не удалось отметить прочитанным')}
function setup(){
 const dash=$('ml-dashboard');if(!dash||$('md-tab-inbox'))return;
 const tabs=$('md-tab-upcoming')?.parentElement;if(!tabs)return;
 tabs.classList.add('navo-master-tabs');
 const btn=document.createElement('button');btn.id='md-tab-inbox';btn.className='secondary full';btn.type='button';btn.textContent='💬 Сообщения';dash.insertBefore(btn,tabs);
 const panel=document.createElement('div');panel.id='md-inbox';panel.className='hide';panel.append(label('h3','Сообщения клиентов'),label('p','Здесь появляются сообщения по вашим записям.'));const list=document.createElement('div');list.id='md-inbox-list';panel.append(list);dash.insertBefore(panel,$('md-today'));
 btn.onclick=()=>{for(const id of ['md-today','md-upcoming','md-profile'])$(id)?.classList.add('hide');panel.classList.remove('hide');btn.className='primary full';update(true)};
 for(const id of ['md-tab-today','md-tab-upcoming','md-tab-profile'])$(id)?.addEventListener('click',()=>{panel.classList.add('hide');btn.className='secondary full'});
}
async function update(render){
 if(busy)return;const session=a()?.getSession?.(),dash=$('ml-dashboard');if(!session?.access_token||!dash||dash.classList.contains('hide'))return;
 busy=true;try{
 const token=session.access_token,uid=session.user.id;
 const bookings=await read('/rest/v1/bookings?select=id,client_phone,starts_at,status&master_id=eq.'+encodeURIComponent(uid)+'&order=starts_at.desc&limit=100',token);
 const ids=bookings.map(x=>x.id);
 const messages=ids.length?await read('/rest/v1/navo_booking_messages?select=id,booking_id,sender_id,body,created_at&booking_id=in.('+ids.join(',')+')&order=created_at.desc&limit=500',token):[];
 const reads=await read('/rest/v1/navo_message_reads?select=booking_id,last_read_at&user_id=eq.'+encodeURIComponent(uid),token);
 const readMap=new Map(reads.map(x=>[x.booking_id,new Date(x.last_read_at).getTime()]));
 const byBooking=new Map();let unread=0;
 for(const m of messages){if(!byBooking.has(m.booking_id))byBooking.set(m.booking_id,[]);byBooking.get(m.booking_id).push(m);if(m.sender_id!==uid&&new Date(m.created_at).getTime()>(readMap.get(m.booking_id)||0))unread++}
 const tab=$('md-tab-inbox');if(tab){tab.textContent=unread?'💬 Сообщения 🟡 '+unread:'💬 Сообщения';tab.style.border=unread?'2px solid #e3a500':''}
 let badge=$('navo-unread-banner');if(!badge){badge=document.createElement('button');badge.id='navo-unread-banner';badge.type='button';badge.className='secondary full';badge.style.margin='10px 0';dash.insertBefore(badge,dash.firstChild);badge.onclick=()=>tab?.click()}
 badge.textContent=unread?'🟡 Новые сообщения от клиентов: '+unread+' — открыть':'💬 Сообщений без ответа нет';badge.hidden=!unread;
 const panel=$('md-inbox');if(!panel||!render)return;
 const list=$('md-inbox-list');list.replaceChildren();
 const dateKey=x=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dushanbe',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x));const today=dateKey(Date.now());const chronological=[...bookings].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));const bookingNumbers=new Map();for(const [kind,items] of [['today',chronological.filter(b=>dateKey(b.starts_at)===today)],['upcoming',chronological.filter(b=>dateKey(b.starts_at)!==today&&new Date(b.starts_at).getTime()>=Date.now())]])items.forEach((b,i)=>bookingNumbers.set(String(b.id),{number:i+1,kind}));
 const threads=bookings.filter(b=>byBooking.has(b.id));if(!threads.length){list.append(label('p','Сообщений пока нет'));return}
 for(const b of threads){
 const msgs=byBooking.get(b.id),last=msgs[0],count=msgs.filter(m=>m.sender_id!==uid&&new Date(m.created_at).getTime()>(readMap.get(b.id)||0)).length;
 const card=document.createElement('div');card.className='item navo-inbox-thread';const n=bookingNumbers.get(String(b.id));if(n){const number=label('span','№ '+n.number);number.className='navo-inbox-booking-number';number.title=n.kind==='today'?'Номер в сегодняшних записях':'Номер в предстоящих записях';card.append(number)}const title=label('strong','👤 Клиент: '+(b.client_phone||'номер не указан'));const when=label('p','📅 Запись: '+fmt(b.starts_at));when.className='muted';const preview=label('p',(last.sender_id===uid?'Вы: ':'Клиент: ')+last.body);preview.className='navo-inbox-preview';card.append(title,when);if(count){const unread=label('p','🟡 Непрочитанных сообщений: '+count);unread.className='navo-inbox-unread';card.append(unread)}card.append(preview);
 const open=document.createElement('button');open.type='button';open.className='secondary full navo-thread-toggle';open.setAttribute('aria-expanded','false');open.textContent='▾ Развернуть чат';
 open.onclick=async()=>{const existing=card.querySelector('details');if(existing){existing.open=!existing.open;open.setAttribute('aria-expanded',String(existing.open));open.textContent=existing.open?'▴ Свернуть чат':'▾ Развернуть чат';return}
 try{if(!b.id)throw Error('У записи отсутствует идентификатор');const chat=window.navoChatPanel(b.id,uid,a()?.getSession?.()?.access_token||token,!['cancelled','completed'].includes(b.status),'master',{name:b.client_phone||'Клиент',phone:b.client_phone||'',date:fmt(b.starts_at),status:b.status});card.append(chat);chat.open=true;await markRead(b.id,uid,a()?.getSession?.()?.access_token||token).catch(e=>console.warn('Отметка прочтения:',e.message));open.setAttribute('aria-expanded','true');open.textContent='▴ Свернуть чат';chat.addEventListener('toggle',()=>{open.setAttribute('aria-expanded',String(chat.open));open.textContent=chat.open?'▴ Свернуть чат':'▾ Развернуть чат'});const tab=$('md-tab-inbox');if(tab)tab.textContent='💬 Сообщения';const banner=$('navo-unread-banner');if(banner)banner.hidden=true}catch(e){const error=label('p','Не удалось открыть чат: '+e.message);error.setAttribute('role','alert');card.append(error);open.disabled=false}};
 card.append(open);list.append(card)
 }
 }catch(e){const list=$('md-inbox-list');if(list&&!$('md-inbox')?.classList.contains('hide'))list.textContent='Не удалось загрузить сообщения: '+e.message}finally{busy=false}
}
const inboxCss=document.createElement('style');inboxCss.textContent='.navo-master-tabs{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%;min-width:0;max-width:100%;flex-wrap:wrap}.navo-master-tabs button{min-width:0!important;width:100%!important;max-width:100%;white-space:normal;overflow-wrap:anywhere;padding:11px 7px;font-size:14px}.navo-inbox-thread{border:2px solid #9671d5!important;border-radius:15px;box-shadow:0 2px 10px rgba(111,73,178,.09);padding:14px;margin:12px 0;min-width:0;overflow-wrap:anywhere;background:#fff}.navo-inbox-thread{position:relative;padding-top:39px}.navo-inbox-booking-number{position:absolute;top:8px;right:10px;display:inline-flex;align-items:center;justify-content:center;min-width:32px;padding:3px 9px;border-radius:999px;background:#ffdf39;border:1px solid #e3b900;color:#382c00;font-size:14px;font-weight:850;line-height:1.3}.navo-inbox-thread strong{display:block;font-size:16px}.navo-inbox-thread p{margin:7px 0}.navo-inbox-preview{padding:10px;background:#f1f6f0;border-radius:10px;white-space:pre-wrap}.navo-inbox-unread{font-weight:700;color:#795500}#md-inbox-list{min-width:0;width:100%;max-width:100%}#md-inbox-list button{max-width:100%;white-space:normal}.navo-thread-toggle{border:1.5px solid #9671d5!important;background:#f1eaff!important;color:#54368d!important;font-weight:800!important;margin-top:10px!important}.navo-inbox-thread details{border:1px solid #c8b3ed;border-radius:12px;padding:8px;margin-top:9px}';document.head.append(inboxCss);
function start(){setup();if(timer)return;timer=setInterval(()=>update(false),15000);update(false)}
document.addEventListener('DOMContentLoaded',()=>{setup();start()});
window.addEventListener('navo-master-open',()=>{setup();update(true)});
})();