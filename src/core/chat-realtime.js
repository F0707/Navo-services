// Opt-in module; not wired to production UI until integration tests pass.
export function subscribeBookingMessages(supabase, bookingId, onMessage, onStatus=()=>{}) {
  if (!bookingId) throw new Error('bookingId required');
  const channel=supabase.channel('navo_booking_'+bookingId)
    .on('postgres_changes',{
      event:'INSERT',schema:'public',table:'navo_booking_messages',
      filter:'booking_id=eq.'+bookingId
    },payload=>onMessage(payload.new))
    .subscribe(onStatus);
  return ()=>supabase.removeChannel(channel);
}
export function mergeUniqueMessages(existing, incoming) {
  const byId=new Map(existing.map(message=>[String(message.id),message]));
  for (const message of incoming) byId.set(String(message.id),message);
  return [...byId.values()].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
}
