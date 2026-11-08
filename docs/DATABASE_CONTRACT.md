# Read-only database audit — 2026-11-09

Verified via information_schema, no data mutations.

- public.navo_test_master_catalog: master_id, display_name, city, work_address, photo_url, services. No region field. Filter only on columns actually exposed by this view; do not assume district exists on this view.
- public.master_applications: user_id, full_name, phone, email, city, work_address, district, photo_url, services, portfolio_urls, status.
- public.bookings: id, client_id, master_id, starts_at, status, client_phone, total_somoni, created_at.
- public.navo_booking_messages: id bigint, booking_id uuid, sender_id uuid, body text, created_at timestamptz.
- public.navo_message_reads: booking_id, user_id, last_read_at.

Important: Chat must target navo_booking_messages, not a nonexistent generic messages table.
Do not issue INSERT/UPDATE/DELETE or alter RLS without an independently reviewed migration.
