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
  if (profileError || adminProfile?.role !== 'admin') return json({ error: 'Hanya Admin yang dapat mengubah password pengguna.' }, 403)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Data permintaan tidak valid.' }, 400) }

  const userId = String(body.user_id ?? '').trim()
  const newPassword = String(body.new_password ?? '')
  if (!userId || !newPassword) return json({ error: 'ID pengguna dan password baru wajib diisi.' }, 400)
  if (newPassword.length < 6) return json({ error: 'Password baru minimal 6 karakter.' }, 400)
  if (userId === user.id) return json({ error: 'Akun Admin yang sedang digunakan tidak dapat diubah melalui fitur ini.' }, 400)

  const { data: targetProfile, error: targetError } = await adminClient.from('profiles').select('id,nama,role').eq('id', userId).single()
  if (targetError || !targetProfile) return json({ error: 'Pengguna tidak ditemukan.' }, 404)
  if (!['guru', 'siswa'].includes(targetProfile.role)) return json({ error: 'Password hanya dapat diubah untuk akun Guru atau Siswa.' }, 400)

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })
  if (updateError) return json({ error: `Password gagal diubah: ${updateError.message}` }, 400)

  return json({ success: true, user: { id: targetProfile.id, nama: targetProfile.nama, role: targetProfile.role } })
})
