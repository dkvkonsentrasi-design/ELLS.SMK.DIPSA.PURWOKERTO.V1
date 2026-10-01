-- SMK DIPSA: Storage file untuk Materi
-- Jalankan sekali di Supabase SQL Editor.
-- Bucket dibuat PRIVATE agar file tidak dapat diakses tanpa izin.

insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do update set public = false;

-- Hapus policy lama dengan nama yang sama jika migration pernah dijalankan.
drop policy if exists materials_storage_select_policy on storage.objects;
drop policy if exists materials_storage_insert_policy on storage.objects;
drop policy if exists materials_storage_update_policy on storage.objects;
drop policy if exists materials_storage_delete_policy on storage.objects;

-- Path file menggunakan format: {mapel_id}/{uuid}-{nama_file}
-- Guru hanya dapat melihat file milik mata pelajarannya.
-- Admin dapat melihat semua file.
-- Siswa hanya dapat melihat file dari kelasnya.
create policy materials_storage_select_policy
on storage.objects for select
to authenticated
using (
  bucket_id = 'materials'
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

create policy materials_storage_insert_policy
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'materials'
  and exists (
    select 1
    from public.subjects s
    join public.profiles p on p.id = auth.uid()
    where s.id = split_part(name, '/', 1)::bigint
      and (s.guru_id = auth.uid() or p.role = 'admin')
  )
);

create policy materials_storage_update_policy
on storage.objects for update
to authenticated
using (
  bucket_id = 'materials'
  and exists (
    select 1
    from public.subjects s
    join public.profiles p on p.id = auth.uid()
    where s.id = split_part(name, '/', 1)::bigint
      and (s.guru_id = auth.uid() or p.role = 'admin')
  )
)
with check (
  bucket_id = 'materials'
  and exists (
    select 1
    from public.subjects s
    join public.profiles p on p.id = auth.uid()
    where s.id = split_part(name, '/', 1)::bigint
      and (s.guru_id = auth.uid() or p.role = 'admin')
  )
);

create policy materials_storage_delete_policy
on storage.objects for delete
to authenticated
using (
  bucket_id = 'materials'
  and exists (
    select 1
    from public.subjects s
    join public.profiles p on p.id = auth.uid()
    where s.id = split_part(name, '/', 1)::bigint
      and (s.guru_id = auth.uid() or p.role = 'admin')
  )
);
