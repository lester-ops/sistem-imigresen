import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, username, role, bahagian_akses, uid } = body;

    // ==========================================
    // TINDAKAN 1: TAMBAH PENGGUNA BARU
    // ==========================================
    if (action === 'CREATE') {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });
      if (authError) throw authError;

      const { error: dbError } = await supabaseAdmin.from('pengguna_sistem').insert([{
        username: username,
        role: role,
        bahagian_akses: bahagian_akses,
        email: email // Menyimpan emel sebenar/tiruan ke database
      }]);
      
      if (dbError) {
         await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
         throw dbError;
      }
      return NextResponse.json({ success: true, message: 'Akaun berjaya dicipta di Auth & Database' });
    }

    // ==========================================
    // TINDAKAN 2: KEMAS KINI (UPDATE) PENGGUNA
    // ==========================================
    if (action === 'UPDATE') {
      const { error: dbError } = await supabaseAdmin.from('pengguna_sistem').update({
        username: username,
        role: role,
        bahagian_akses: bahagian_akses,
        email: email // Kemas kini emel di database
      }).eq('id', uid); 
      
      if (dbError) throw dbError;

      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = listData.users.find(u => u.email === email);
      
      if (targetUser) {
         await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { password: password });
      }

      return NextResponse.json({ success: true, message: 'Akaun berjaya dikemas kini' });
    }

    // ==========================================
    // TINDAKAN 3: PADAM (DELETE) PENGGUNA
    // ==========================================
    if (action === 'DELETE') {
      const { error: dbError } = await supabaseAdmin.from('pengguna_sistem').delete().eq('id', uid);
      if (dbError) throw dbError;

      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = listData.users.find(u => u.email === email);
      
      if (targetUser) {
         await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
      }

      return NextResponse.json({ success: true, message: 'Akaun berjaya dipadam sepenuhnya' });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}