import {supabase} from './supabaseClient';
export const getSession=async()=>{const {data,error}=await supabase.auth.getSession();if(error)throw error;return data.session};
export const observeAuth=callback=>supabase.auth.onAuthStateChange((event,session)=>callback(event,session)).data.subscription;
// Do not automatically send paid SMS during initial catalog browsing.
export const requestPhoneOtp=async phone=>{const {data,error}=await supabase.auth.signInWithOtp({phone});if(error)throw error;return data};
