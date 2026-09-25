-- handle_new_user() is only meant to run from the on_auth_user_created trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
