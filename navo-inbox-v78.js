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
 const tabs=$('md-tab-today')?.parentElement;if(!tabs)return;
 const btn=document.createElement('button');btn.id='md-tab-inbox';btn.className='secondary';btn.type='button';btn.textContent='💬 Сообщения';tabs.append(btn);
 const panel=document.createElement('div');panel.id='md-inbox';panel.className='hide';panel.append(label('h3','Сообщения клиентов'),label('p','Здесь появляются сообщения по вашим записям.'));const list=document.createElement('div');list.id='md-inbox-list';panel.append(list);dash.insertBefore(panel,$('md-today'));
 btn.onclick=()=>{for(const id of ['md-today','md-upcoming','md-profile'])$(id)?.classList.add('hide');panel.classList.remove('hide');for(const b of tabs.querySelectorAll('button'))b.className=b===btn?'primary':'secondary';update(true)};
 for(const id of ['md-tab-today','md-tab-upcoming','md-tab-profile'])$(id)?.addEventListener('click',()=>{panel.classList.add('hide');btn.className='secondary'});
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
 const panel=$('md-inbox');if(!panel||(!render&&panel.classList.contains('hide')))return;
 const list=$('md-inbox-list');list.replaceChildren();
 const threads=bookings.filter(b=>byBooking.has(b.id));if(!threads.length){list.append(label('p','Сообщений пока нет'));return}
 for(const b of threads){
 const msgs=byBooking.get(b.id),last=msgs[0],count=msgs.filter(m=>m.sender_id!==uid&&new Date(m.created_at).getTime()>(readMap.get(b.id)||0)).length;
 const card=document.createElement('div');card.className='item';const title=label('strong',(count?'🟡 '+count+' новых · ':'')+'Запись '+fmt(b.starts_at));const preview=label('p',(last.sender_id===uid?'Вы: ':'Клиент: ')+last.body);card.append(title,preview);
 const open=document.createElement('button');open.type='button';open.className='primary full';open.textContent='Открыть переписку и ответить';
 open.onclick=async()=>{const existing=card.querySelector('details');if(existing){existing.open=!existing.open;return}
 try{await markRead(b.id,uid,token);const chat=window.navoChatPanel(b.id,uid,token,!['cancelled','completed'].includes(b.status));card.append(chat);chat.open=true;await update(true)}catch(e){card.append(label('p','Ошибка: '+e.message))}};
 card.append(open);list.append(card)
 }
 }catch(e){const list=$('md-inbox-list');if(list&&!$('md-inbox')?.classList.contains('hide'))list.textContent='Не удалось загрузить сообщения: '+e.message}finally{busy=false}
}
function start(){setup();if(timer)return;timer=setInterval(()=>update(false),15000);update(false)}
document.addEventListener('DOMContentLoaded',()=>{setup();start()});
window.addEventListener('navo-master-open',()=>{setup();update(true)});
})();