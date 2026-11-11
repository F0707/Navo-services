import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL || 'https://wvixivswjqxyunpoiqrl.supabase.co';
const key=import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5rU0FOrKI2HO_kYI-FGYmQ_9Gxq3SwP';
export const supabase=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'navo-react-auth'},realtime:{params:{eventsPerSecond:10}}});
