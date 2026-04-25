alter table public.subjects enable row level security;

drop policy if exists "Users can view own subjects" on public.subjects;
create policy "Users can view own subjects"
on public.subjects
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own subjects" on public.subjects;
create policy "Users can insert own subjects"
on public.subjects
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own subjects" on public.subjects;
create policy "Users can update own subjects"
on public.subjects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own subjects" on public.subjects;
create policy "Users can delete own subjects"
on public.subjects
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
