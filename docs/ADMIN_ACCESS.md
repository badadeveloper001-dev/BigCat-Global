# Administrator access

BigCat administration uses normal Supabase Auth sessions. Public/shared access codes are not supported.

## Provision the first administrator

1. In the protected Supabase dashboard, create or select the administrator in **Authentication → Users**.
2. Copy that Auth user's UUID.
3. Run migration `029-add-admin-role.sql`.
4. From the Supabase SQL editor, create or update the matching profile:

```sql
INSERT INTO public.auth_users (id, email, role, password_hash)
VALUES ('AUTH_USER_UUID', 'admin@example.com', 'admin', '')
ON CONFLICT (id)
DO UPDATE SET role = 'admin', updated_at = now();
```

Replace both example values. Do not put a real password, service-role key, or reusable access code in SQL, source control, or client environment variables.

Administrators sign in at `/admin-portal`. The server independently verifies the Supabase session and the current `auth_users.role` on every privileged API request.

## Remove access

Set the profile role to an appropriate non-admin role or suspend the account. Also revoke the Auth user's active sessions from the Supabase dashboard when access must end immediately.
