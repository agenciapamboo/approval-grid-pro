-- Allow client users to view their associated agency
-- This fixes the RLS issue preventing client_user from loading agency data via JOIN

create policy "Client users can view their associated agency"
on public.agencies
for select
to authenticated
using (
  exists (
    select 1 
    from public.profiles p
    join public.clients c on c.id = p.client_id
    where p.id = auth.uid()
      and c.agency_id = agencies.id
  )
);