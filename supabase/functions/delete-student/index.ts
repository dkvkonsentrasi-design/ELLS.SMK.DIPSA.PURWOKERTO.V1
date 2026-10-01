import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method tidak diizinkan.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: 'Konfigurasi Supabase Edge Function belum lengkap.' }, 500)
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Sesi Admin tidak ditemukan.' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })

  const { data: { user }, error: userError } = await userClient.auth.getUser(token)
  if (userError || !user) return json({ error: 'Sesi login tidak valid.' }, 401)

  const { data: adminProfile, error: profileError } = await adminClient.from('profiles').select('id,role').eq('id', user.id).single()
  if (profileError || adminProfile?.role !== 'admin') return json({ error: 'Hanya Admin yang dapat menghapus siswa.' }, 403)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Data permintaan tidak valid.' }, 400) }

  const studentId = String(body.student_id ?? '').trim()
  if (!studentId) return json({ error: 'ID siswa wajib diisi.' }, 400)
  if (studentId === user.id) return json({ error: 'Akun Admin yang sedang digunakan tidak dapat dihapus.' }, 400)

  const { data: student, error: studentError } = await adminClient.from('profiles').select('id,nama,role').eq('id', studentId).single()
  if (studentError || !student) return json({ error: 'Siswa tidak ditemukan.' }, 404)
  if (student.role !== 'siswa') return json({ error: 'Akun yang dipilih bukan akun siswa.' }, 400)

  // Hapus submission record agar foreign key tidak menghalangi penghapusan profil.
  const { error: submissionsError } = await adminClient.from('submissions').delete().eq('student_id', studentId)
  if (submissionsError) return json({ error: `Data pengumpulan siswa tidak dapat dihapus: ${submissionsError.message}` }, 400)

  const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('id', studentId)
  if (profileDeleteError) return json({ error: `Profil siswa tidak dapat dihapus: ${profileDeleteError.message}` }, 400)

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(studentId)
  if (authDeleteError) return json({ error: `Profil siswa sudah dihapus, tetapi akun login gagal dihapus: ${authDeleteError.message}` }, 400)

  return json({ success: true, student: { id: studentId, nama: student.nama } })
})
