import {useEffect,useState} from 'react';
import Catalog from './screens/Catalog';
import MasterProfile from './screens/MasterProfile';
import Navbar from './components/Navbar';
import Cabinet from './screens/Cabinet';
import Bookings from './screens/Bookings';
import Chats from './screens/Chats';
import AuthPanel from './screens/AuthPanel';
import {supabase} from './services/supabaseClient';
export default function App(){
 const [master,setMaster]=useState(null),[tab,setTab]=useState('Каталог'),[user,setUser]=useState(null),[isMaster,setIsMaster]=useState(false),[showCabinet,setShowCabinet]=useState(false),[chatBooking,setChatBooking]=useState(null);
 const [favoriteMasters,setFavoriteMasters]=useState([]);
 const [favorites,setFavorites]=useState(()=>{try{return JSON.parse(localStorage.getItem('navo-react-favorites')||'[]')}catch{return []}});
 useEffect(()=>{supabase.auth.getUser().then(({data})=>setUser(data?.user||null));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user||null));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{let live=true;setIsMaster(false);if(!user?.id)return;supabase.from('master_profiles').select('user_id').eq('user_id',user.id).maybeSingle().then(({data,error})=>{if(live)setIsMaster(Boolean(data&&!error))});return()=>{live=false}},[user?.id]);
 useEffect(()=>{let live=true;import('./services/catalogService').then(({listMasters})=>listMasters()).then(rows=>{if(live)setFavoriteMasters(rows)}).catch(()=>{});return()=>{live=false}},[]);
 function toggleFavorite(id){setFavorites(old=>{const next=old.includes(id)?old.filter(x=>x!==id):[...old,id];localStorage.setItem('navo-react-favorites',JSON.stringify(next));return next})}
 function changeTab(next){setMaster(null);setShowCabinet(false);setChatBooking(null);setTab(next)}
 return <div className="app-shell">{chatBooking&&user?<Chats booking={chatBooking} user={user} onBack={()=>setChatBooking(null)}/>:showCabinet&&user&&isMaster?<Cabinet user={user}/>:master?<MasterProfile master={master} onBack={()=>setMaster(null)} favorite={favorites.includes(master.master_id)} onFavorite={()=>toggleFavorite(master.master_id)}/>:tab==='Каталог'?<Catalog onOpen={setMaster}/>:tab==='Избранное'?<section className="simple-screen"><h1>Избранное</h1>{favorites.length?<><p>Сохранено мастеров: {favorites.length}</p>{favoriteMasters.filter(m=>favorites.includes(m.master_id)).map(m=><button key={m.master_id} className="favorite-master" onClick={()=>setMaster(m)}>{m.display_name||'Мастер'} — открыть профиль</button>)}</>:<p>Пока пусто. Откройте мастера и нажмите «В избранное».</p>}</section>:tab==='Записи'?<Bookings user={user} onChat={setChatBooking}/>:<AuthPanel user={user} isMaster={isMaster} onOpenCabinet={()=>setShowCabinet(true)}/>}<Navbar active={tab} onSelect={changeTab}/></div>
}