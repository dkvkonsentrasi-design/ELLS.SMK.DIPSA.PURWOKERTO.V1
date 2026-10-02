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
  const authHeader = req.headers.get('Authorization')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Konfigurasi Edge Function belum lengkap: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak tersedia.' }, 500)
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Sesi Admin tidak ditemukan.' }, 401)
  const token = authHeader.replace('Bearer ', '')
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !user) return json({ error: 'Sesi login tidak valid.' }, 401)
  const { data: adminProfile, error: profileError } = await adminClient.from('profiles').select('id,role').eq('id', user.id).single()
  if (profileError || adminProfile?.role !== 'admin') return json({ error: 'Hanya Admin yang dapat menambahkan guru.' }, 403)
  let body: any
  try { body = await req.json() } catch { return json({ error: 'Data permintaan tidak valid.' }, 400) }
  const nama = String(body.nama ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const jenis_kelamin = String(body.jenis_kelamin ?? '').trim()
  if (!nama || !email || !password || !['L', 'P'].includes(jenis_kelamin)) return json({ error: 'Nama, email, password, dan jenis kelamin wajib diisi.' }, 400)
  if (password.length < 6) return json({ error: 'Password minimal 6 karakter.' }, 400)
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nama, role: 'guru' } })
  if (createError || !created.user) return json({ error: createError?.message || 'Gagal membuat akun login guru.' }, 400)
  const { error: profileUpsertError } = await adminClient.from('profiles').upsert({ id: created.user.id, nama, jenis_kelamin, role: 'guru' }, { onConflict: 'id' })
  if (profileUpsertError) { await adminClient.auth.admin.deleteUser(created.user.id); return json({ error: `Akun dibuat tetapi profil guru gagal disimpan: ${profileUpsertError.message}` }, 400) }
  return json({ success: true, teacher: { id: created.user.id, nama, email, jenis_kelamin } })
})
