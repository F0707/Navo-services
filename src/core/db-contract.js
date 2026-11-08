// Verified read-only schema contract. No Supabase writes or auth side effects.
export const TABLES = Object.freeze({
  catalog: 'navo_test_master_catalog',
  masters: 'master_applications',
  bookings: 'bookings',
  messages: 'navo_booking_messages',
  messageReads: 'navo_message_reads'
});
export const COLUMNS = Object.freeze({
  catalog: Object.freeze(['master_id','display_name','city','work_address','photo_url','services']),
  bookings: Object.freeze(['id','client_id','master_id','starts_at','status','client_phone','total_somoni','created_at']),
  messages: Object.freeze(['id','booking_id','sender_id','body','created_at'])
});
export function assertColumn(table, column) {
  if (!COLUMNS[table]?.includes(column)) throw new Error('Unsupported '+table+' column: '+column);
  return column;
}
