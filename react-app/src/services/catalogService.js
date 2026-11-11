import {supabase} from './supabaseClient';
export async function listMasters(){
 const {data,error}=await supabase.from('navo_test_master_catalog').select('master_id,display_name,city,district,work_address,work_landmark,photo_url,experience_years,services').order('display_name',{ascending:true}).limit(100);
 if(error)throw error;
 const masters=data||[];
 if(!masters.length)return masters;
 const ids=masters.map(m=>m.master_id);
 const {data:prices,error:priceError}=await supabase.from('navo_test_master_prices').select('master_id,service_id,name,price_somoni').in('master_id',ids);
 if(priceError){console.warn('NAVO: prices unavailable',priceError.message);return masters.map(m=>({...m,services:[]}))}
 const byMaster=new Map();
 for(const p of prices||[]){if(!byMaster.has(p.master_id))byMaster.set(p.master_id,[]);byMaster.get(p.master_id).push({id:p.service_id,name:p.name,price_somoni:p.price_somoni})}
 return masters.map(m=>({...m,services:byMaster.get(m.master_id)||[]}));
}
export function filterMasters(rows,{query='',district='Все',city='Душанбе'}){const needle=query.trim().toLocaleLowerCase('ru');return rows.filter(m=>{const cityMatch=city==='Все города'||(m.city||'').toLocaleLowerCase('ru').includes(city.toLocaleLowerCase('ru'));const districtMatch=district==='Все'||(m.district||'').toLocaleLowerCase('ru').includes(district.toLocaleLowerCase('ru'));const text=[m.display_name,m.work_address,m.work_landmark,JSON.stringify(m.services||[])].join(' ').toLocaleLowerCase('ru');return cityMatch&&districtMatch&&(!needle||text.includes(needle))})}
