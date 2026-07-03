# Security Audit Notes

## Immediate actions

- Revoke any leaked Supabase sessions after tokens are pasted into chat, logs, screenshots, or issue trackers.
- Re-run `supabase_schema.sql` or apply the equivalent SQL changes in the Supabase dashboard before deploying the current frontend. The app now expects the new RPC functions.

## Fixed in this pass

- Disabled persistent Supabase session storage in the browser client. Refresh tokens are no longer intentionally saved in localStorage by this app.
- Removed broad profile read access from the schema. Users can only select their own profile row directly.
- Replaced client-side profile UPI search with `add_registered_member_by_upi(...)`, a restricted RPC.
- Replaced group-member profile joins with `get_group_members_for_group(...)`, a restricted RPC.
- Replaced invite-code group lookup with `join_group_by_invite_code(...)`, avoiding a broad `groups` select policy.
- Removed the app's `profiles.select("*")` call for the current user profile.

## Remaining risks

- This is still a client-side Supabase app. Access tokens must exist in the browser at runtime, so XSS prevention matters a lot.
- The 4-digit payment/settings PIN is an app lock, not strong authentication. It is low entropy and should be rate-limited and verified server-side before production.
- UPI IDs are payment identifiers and should be treated as sensitive personal data. The current model now restricts reads to group members, but group members can still export/share them by design.
- Invite codes should be rotated if accidentally shared publicly.

## Recommended next steps

- Move PIN verification into a server-side RPC with attempt throttling or use Supabase Edge Functions.
- Add a Content Security Policy and avoid any future use of `dangerouslySetInnerHTML`.
- Add a privacy screen/masking option for UPI IDs and exports.
- Consider server-managed HttpOnly auth cookies if this app moves beyond a pure client prototype.
