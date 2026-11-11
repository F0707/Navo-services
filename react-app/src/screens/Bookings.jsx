import {useEffect,useState} from 'react';
import {supabase} from '../services/supabaseClient';
const fmt=d=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Dushanbe'}).format(new Date(d));
export default function Bookings({user,onChat}){
 const [rows,setRows]=useState([]),[tab,setTab]=useState('Предстоящие'),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{if(!user){setLoading(false);return}let live=true;async function load(){const {data,error}=await supabase.from('bookings').select('id,master_id,client_id,starts_at,status,total_somoni').or('client_id.eq.'+user.id+',master_id.eq.'+user.id).order('starts_at',{ascending:false}).limit(100);if(live){setRows(data||[]);setError(error?.message||'');setLoading(false)}}load();const channel=supabase.channel('navo-bookings-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'bookings'},load).subscribe();return()=>{live=false;supabase.removeChannel(channel)}},[user?.id]);
 if(!user)return <main className="simple-screen"><h1>Мои записи</h1><p>Для просмотра записей необходимо войти в аккаунт. SMS без вашего нажатия не отправляются.</p></main>;
 const today=new Date();const filtered=rows.filter(r=>tab==='История'?new Date(r.starts_at)<today:new Date(r.starts_at)>=today);
 return <main className="simple-screen"><h1>Мои записи</h1><div className="booking-tabs">{['Предстоящие','История'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>{loading?<p>Загрузка…</p>:error?<p role="alert" className="error">{error}</p>:filtered.length?filtered.map(r=><article className="booking-item" key={r.id}><b>{fmt(r.starts_at)}</b><span>{r.status||'Статус не указан'}</span><small>{r.total_somoni!=null?r.total_somoni+' сомони':''}</small><button onClick={()=>onChat(r)}>Чат по записи</button></article>):<p>В этом разделе пока нет записей.</p>}</main>
}
