-- Add avatar_url to profiles
alter table public.profiles add column if not exists avatar_url text;

-- Create avatars bucket if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Set up storage policies for avatars bucket
-- 1. Unrestriced read access
create policy "Avatar images are publicly accessible." 
on storage.objects for select 
using ( bucket_id = 'avatars' );

-- 2. Authenticated uploads
create policy "Users can upload their own avatar." 
on storage.objects for insert 
with check ( bucket_id = 'avatars' and auth.uid() = owner );

-- 3. Authenticated updates
create policy "Users can update their own avatar." 
on storage.objects for update 
using ( bucket_id = 'avatars' and auth.uid() = owner );
