# NAVO stabilization — refactor-stable

Production main is frozen until regression checks pass. No changes to production Supabase records, auth sessions, or storage objects.

## Workstreams
1. Database contracts and query audit (read-only)
2. Auth/JWT lifecycle, preserving refresh tokens and avoiding OTP retries
3. Chat and bookings: shared service, one Realtime subscription per booking, deduplication, recovery
4. Extract CSS into styles/, Supabase/auth into src/core/, screens into src/screens/
5. Regression tests before publishing

## Visual contract
Keep approved green/white NAVO design, horizontal catalog cards, fixed identity card with separately scrolling profile content, compact master dashboard.

## Release gate
Verify login with existing session, catalog filters, master/client bookings, chat realtime/reconnect, images, registration twice, mobile scroll and back navigation. No main merge without checks.
