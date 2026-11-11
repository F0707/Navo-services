import {useEffect,useState} from 'react';
import Catalog from './screens/Catalog';
import MasterProfile from './screens/MasterProfile';
import Navbar from './components/Navbar';
import Cabinet from './screens/Cabinet';
import {supabase} from './services/supabaseClient';
export default function App(){
 const [master,setMaster]=useState(null),[tab,setTab]=useState('Каталог'),[user,setUser]=useState(null),[showCabinet,setShowCabinet]=useState(false);
 const [favorites,setFavorites]=useState(()=>{try{return JSON.parse(localStorage.getItem('navo-react-favorites')||'[]')}catch{return []}});
 useEffect(()=>{supabase.auth.getUser().then(({data})=>setUser(data?.user||null));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user||null));return()=>subscription.unsubscribe()},[]);
 function toggleFavorite(id){setFavorites(old=>{const next=old.includes(id)?old.filter(x=>x!==id):[...old,id];localStorage.setItem('navo-react-favorites',JSON.stringify(next));return next})}
 function changeTab(next){setMaster(null);setShowCabinet(false);setTab(next)}
 return <div className="app-shell">{showCabinet&&user?<Cabinet user={user}/>:master?<MasterProfile master={master} onBack={()=>setMaster(null)} favorite={favorites.includes(master.master_id)} onFavorite={()=>toggleFavorite(master.master_id)}/>:tab==='Каталог'?<Catalog onOpen={setMaster}/>:tab==='Избранное'?<section className="simple-screen"><h1>Избранное</h1>{favorites.length?<><p>Сохранено мастеров: {favorites.length}</p><button onClick={()=>changeTab('Каталог')}>Открыть каталог</button></>:<p>Пока пусто. Откройте мастера и нажмите «В избранное».</p>}</section>:tab==='Записи'?<section className="simple-screen"><h1>Мои записи</h1><p>Записи появятся здесь после подключения безопасной авторизации и подтверждения записи в базе данных. Пока запись не создаётся.</p></section>:<section className="simple-screen"><h1>Профиль</h1><p>{user?'Вход выполнен: '+(user.phone||user.email||'пользователь'):'Вы пока не авторизованы.'}</p><p>Вход по SMS будет подключён после проверки отправки кодов, чтобы избежать платных повторных сообщений.</p>{user&&<button onClick={()=>setShowCabinet(true)}>Открыть кабинет мастера NAVO PRO</button>}{showCabinet&&<button onClick={()=>setShowCabinet(false)}>Назад в профиль</button>}</section>}<Navbar active={tab} onSelect={changeTab}/></div>
}