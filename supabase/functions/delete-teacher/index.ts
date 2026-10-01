import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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
  if (profileError || adminProfile?.role !== 'admin') return json({ error: 'Hanya Admin yang dapat menghapus guru.' }, 403)
  let body: any
  try { body = await req.json() } catch { return json({ error: 'Data permintaan tidak valid.' }, 400) }
  const teacherId = String(body.teacher_id ?? '').trim()
  if (!teacherId) return json({ error: 'ID guru wajib diisi.' }, 400)
  if (teacherId === user.id) return json({ error: 'Akun Admin yang sedang digunakan tidak dapat dihapus.' }, 400)
  const { data: teacher, error: teacherError } = await adminClient.from('profiles').select('id,nama,role').eq('id', teacherId).single()
  if (teacherError || !teacher) return json({ error: 'Guru tidak ditemukan.' }, 404)
  if (teacher.role !== 'guru') return json({ error: 'Akun yang dipilih bukan akun guru.' }, 400)
  // Lepaskan penugasan mata pelajaran agar FK guru_id tidak menghalangi penghapusan profil.
  const { error: subjectError } = await adminClient.from('subjects').update({ guru_id: null }).eq('guru_id', teacherId)
  if (subjectError) return json({ error: `Penugasan mata pelajaran guru tidak dapat dilepas: ${subjectError.message}` }, 400)
  const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('id', teacherId)
  if (profileDeleteError) return json({ error: `Profil guru tidak dapat dihapus: ${profileDeleteError.message}` }, 400)
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(teacherId)
  if (authDeleteError) return json({ error: `Profil guru sudah dihapus, tetapi akun login gagal dihapus: ${authDeleteError.message}` }, 400)
  return json({ success: true, teacher: { id: teacherId, nama: teacher.nama } })
})
