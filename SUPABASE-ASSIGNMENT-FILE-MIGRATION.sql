-- SMK DIPSA: Storage file instruksi Tugas Guru
-- Jalankan sekali di Supabase SQL Editor.
-- Bucket private: siswa hanya dapat membuka file dari mata pelajaran di kelasnya.

insert into storage.buckets (id, name, public)
values ('assignments', 'assignments', false)
on conflict (id) do update set public = false;

drop policy if exists assignments_storage_select_policy on storage.objects;
drop policy if exists assignments_storage_insert_policy on storage.objects;
drop policy if exists assignments_storage_update_policy on storage.objects;
drop policy if exists assignments_storage_delete_policy on storage.objects;

create policy assignments_storage_select_policy
on storage.objects for select
to authenticated
using (
  bucket_id = 'assignments'
  and exists (
    select 1
    from public.subjects s
    join public.profiles p on p.id = auth.uid()
    where s.id = split_part(name, '/', 1)::bigint
      and (
        s.guru_id = auth.uid()
        or p.role = 'admin'
        or (p.role = 'siswa' and p.kelas_id = s.kelas_id)
      )
  )
);

create policy assignments_storage_insert_policy
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'assignments'
  and exists (
    select 1
    from public.subjects s
    join public.profiles p on p.id = auth.uid()
    where s.id = split_part(name, '/', 1)::bigint
      and (s.guru_id = auth.uid() or p.role = 'admin')
  )
);

create policy assignments_storage_update_policy
on storage.objects for update
to authenticated
using (
  bucket_id = 'assignments'
  and exists (
    select 1 from public.subjects s
    join public.profiles p on p.id = auth.uid()
    where s.id = split_part(name, '/', 1)::bigint
      and (s.guru_id = auth.uid() or p.role = 'admin')
  )
)
with check (
  bucket_id = 'assignments'
  and exists (
    select 1 from public.subjects s
    join public.profiles p on p.id = auth.uid()
    where s.id = split_part(name, '/', 1)::bigint
      and (s.guru_id = auth.uid() or p.role = 'admin')
  )
);

create policy assignments_storage_delete_policy
on storage.objects for delete
to authenticated
using (
  bucket_id = 'assignments'
  and exists (
    select 1 from public.subjects s
    join public.profiles p on p.id = auth.uid()
    where s.id = split_part(name, '/', 1)::bigint
      and (s.guru_id = auth.uid() or p.role = 'admin')
  )
);
