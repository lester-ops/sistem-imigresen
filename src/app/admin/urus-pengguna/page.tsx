"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UrusPengguna() {
  const [senaraiPengguna, setSenaraiPengguna] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State untuk Modal dan Borang
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    username: "",
    password: "", 
    role: "USER",
    bahagian_akses: "",
    email: "", // Kolum baru
  });

  // Fungsi Jana Emel Tiruan (Hanya untuk USER biasa)
  const janaEmelSupabase = (usernameData: string) => {
    if (!usernameData) return "";
    const cleanUsername = usernameData.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${cleanUsername}@sistem.local`;
  };

  const dapatkanDataPengguna = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("pengguna_sistem")
        .select("*")
        .order("role", { ascending: true }); 

      if (error) throw error;
      setSenaraiPengguna(data || []);
    } catch (err: any) {
      console.error("Ralat ambil data pengguna:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    dapatkanDataPengguna();
  }, [dapatkanDataPengguna]);

  const bukaModalTambah = () => {
    setIsEditing(false);
    setFormData({
      id: "",
      username: "",
      password: "user123",
      role: "USER",
      bahagian_akses: "",
      email: "",
    });
    setIsModalOpen(true);
  };

  const bukaModalEdit = (pengguna: any) => {
    setIsEditing(true);
    setFormData({
      id: pengguna.id,
      username: pengguna.username,
      password: pengguna.password, 
      role: pengguna.role,
      bahagian_akses: pengguna.bahagian_akses || "",
      email: pengguna.email || "",
    });
    setIsModalOpen(true);
  };

  const handleResetPassword = async () => {
    const sahkan = confirm(`Adakah anda pasti mahu menetapkan semula (RESET) kata laluan untuk akaun @${formData.username} kepada 'user123'?`);
    if (!sahkan) return;

    setIsSubmitting(true);
    try {
      const usernameBersih = formData.username.trim().toLowerCase();
      // Gunakan emel sebenar jika Admin, jika User guna emel tiruan
      const emelRasmi = formData.role === "ADMIN" && formData.email ? formData.email : janaEmelSupabase(usernameBersih);

      const payload = {
        action: 'UPDATE',
        email: emelRasmi,
        password: 'user123',
        username: usernameBersih,
        role: formData.role,
        bahagian_akses: formData.role === "ADMIN" ? "SEMUA" : formData.bahagian_akses.toUpperCase(),
        uid: formData.id
      };

      const res = await fetch('/api/pengguna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses permintaan reset");

      alert(`Kata laluan bagi akaun @${formData.username} telah berjaya di-reset kepada 'user123'.`);
      setIsModalOpen(false);
      dapatkanDataPengguna();
    } catch (err: any) {
      alert("Ralat Reset API: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.role === "ADMIN" && !formData.email) {
      alert("Sila masukkan Emel Rasmi Pemulihan untuk akaun ADMIN.");
      return;
    }

    setIsSubmitting(true);

    try {
      const usernameBersih = formData.username.trim().toLowerCase();
      // Penentuan emel rasmi vs tiruan
      const emelRasmi = formData.role === "ADMIN" ? formData.email.trim() : janaEmelSupabase(usernameBersih);

      const payload = {
        action: isEditing ? 'UPDATE' : 'CREATE',
        email: emelRasmi,
        password: formData.password,
        username: usernameBersih,
        role: formData.role,
        bahagian_akses: formData.role === "ADMIN" ? "SEMUA" : formData.bahagian_akses.toUpperCase(),
        uid: formData.id
      };

      const res = await fetch('/api/pengguna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses permintaan");

      alert(isEditing ? "Akaun pengguna berjaya dikemas kini!" : "Akaun pengguna baharu berjaya dicipta!");

      setIsModalOpen(false);
      setLoading(true);
      dapatkanDataPengguna(); 
    } catch (err: any) {
      alert("Ralat API: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePadam = async (id: string, username: string, role: string, email: string) => {
    if (username === "admin") {
      alert("AMARAN: Anda tidak boleh memadam akaun 'admin' utama sistem!");
      return;
    }

    const sahkan = confirm(`Adakah anda pasti untuk memadam akaun pengguna '@${username}'?`);
    if (sahkan) {
      setLoading(true);
      try {
        const emelRasmi = role === "ADMIN" && email ? email : janaEmelSupabase(username);
        
        const res = await fetch('/api/pengguna', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'DELETE', uid: id, email: emelRasmi })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Gagal memadam akaun");
        
        alert(`Akaun pengguna berjaya dipadam sepenuhnya dari sistem.`);
        dapatkanDataPengguna();
      } catch (err: any) {
        alert("Gagal memadam akaun: " + err.message);
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-8 relative z-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">Pengurusan Akses Pengguna</h1>
          <p className="text-emerald-700 mt-1 font-medium">Urus ID log masuk dan peranan pengguna sistem</p>
        </div>
        <button 
          onClick={bukaModalTambah}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg transition shadow-md flex items-center justify-center font-bold text-sm"
        >
          <span className="mr-2">+</span> Tambah Pengguna
        </button>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-6 shadow-sm flex">
        <span className="text-2xl mr-3">🤖</span>
        <div className="text-sm">
          <p className="font-bold mb-1">Pendaftaran & Keselamatan Automatik</p>
          <p>Sistem secara automatik menyegerakkan pendaftaran ini dengan pelayan Supabase Auth. Pentadbir <b>tidak boleh</b> melihat kata laluan kakitangan.</p>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur rounded-xl shadow-md overflow-hidden border border-emerald-100">
        {loading ? (
          <div className="p-8 text-center text-emerald-600 animate-pulse font-bold">Memuatkan senarai pengguna...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
              <thead>
                <tr className="bg-emerald-800 text-white border-b border-emerald-900">
                  <th className="p-4 font-semibold w-12 text-center">Bil.</th>
                  <th className="p-4 font-semibold">Username / Bahagian</th>
                  <th className="p-4 font-semibold text-emerald-200">Emel Log Masuk</th>
                  <th className="p-4 font-semibold text-center w-32">Peranan (Role)</th>
                  <th className="p-4 font-semibold text-center w-32">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {senaraiPengguna.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-emerald-600">Tiada rekod pengguna.</td>
                  </tr>
                ) : (
                  senaraiPengguna.map((pengguna, index) => (
                    <tr key={pengguna.id} className="hover:bg-emerald-50/50 transition">
                      <td className="p-4 text-emerald-600 text-center font-medium">{index + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-emerald-900 uppercase">@{pengguna.username}</div>
                        <div className="text-xs text-emerald-600 mt-1 font-semibold">{pengguna.bahagian_akses || 'SEMUA AKSES'}</div>
                      </td>
                      <td className="p-4">
                        <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg inline-block text-emerald-800 font-mono text-xs font-bold shadow-sm select-all">
                          {pengguna.role === 'ADMIN' && pengguna.email ? pengguna.email : janaEmelSupabase(pengguna.username)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${
                          pengguna.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}>
                          {pengguna.role}
                        </span>
                      </td>
                      <td className="p-4 text-center flex justify-center space-x-2">
                        <button onClick={() => bukaModalEdit(pengguna)} className="bg-white border border-teal-200 hover:bg-teal-50 text-teal-700 px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm">✏️ Edit</button>
                        <button onClick={() => handlePadam(pengguna.id, pengguna.username, pengguna.role, pengguna.email)} className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={pengguna.username === 'admin'}>🗑️ Padam</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH/EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-emerald-100">
            <div className="p-6 border-b border-emerald-100 flex justify-between items-center bg-white shadow-sm">
              <h2 className="text-xl font-bold text-emerald-900 tracking-wide">
                {isEditing ? "Kemaskini Pengguna" : "Daftar Pengguna Baharu"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-emerald-500 hover:text-red-500 font-bold text-2xl transition">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-emerald-50/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Peranan Akses</label>
                  <select 
                    className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold text-emerald-900 text-sm shadow-sm"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="USER">USER (Unit / Bahagian)</option>
                    <option value="ADMIN">ADMIN (Pentadbir Sistem)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Username</label>
                  <input 
                    type="text" 
                    required
                    disabled={isEditing}
                    placeholder="Cth: ketua_unit_a"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-sm ${isEditing ? 'bg-gray-100 text-gray-500 border-gray-300' : 'bg-white border-emerald-200'}`}
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
              </div>

              {formData.role === "USER" && (
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Akses Bahagian/Unit</label>
                  <input 
                    type="text" 
                    required={formData.role === "USER"}
                    placeholder="Contoh: LAWAS, UNIT A"
                    className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm font-medium uppercase shadow-sm"
                    value={formData.bahagian_akses}
                    onChange={(e) => setFormData({...formData, bahagian_akses: e.target.value})}
                  />
                  <p className="text-xs text-orange-600 mt-1.5 font-bold">* Pastikan ejaan sama persis dengan nama bahagian di dalam rekod pegawai!</p>
                </div>
              )}

              {/* KHAS UNTUK ADMIN: Masukkan Emel Sebenar */}
              {formData.role === "ADMIN" && (
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Emel Rasmi Pemulihan (Untuk Admin Sahaja)</label>
                  <input 
                    type="email" 
                    required={formData.role === "ADMIN"}
                    placeholder="Contoh: pentadbir@gmail.com"
                    className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm font-medium shadow-sm"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                  <p className="text-xs text-orange-600 mt-1.5 font-bold">* Emel yang sah ini digunakan untuk pemulihan (Lupa Kata Laluan).</p>
                </div>
              )}

              {!isEditing ? (
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Kata Laluan Permulaan</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm font-bold text-emerald-900 shadow-sm"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <p className="text-xs text-emerald-600 mt-1.5 font-semibold">* Kata laluan disulitkan dengan selamat ke pelayan Supabase Auth.</p>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-orange-800 uppercase mb-1">Keselamatan Akaun</p>
                    <p className="text-xs text-orange-700 font-medium leading-snug">Kata laluan dilindungi. Klik butang disebelah jika pengguna terlupa.</p>
                  </div>
                  <button type="button" onClick={handleResetPassword} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-bold text-xs shadow-sm transition whitespace-nowrap">🔑 Reset ke "user123"</button>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3 border-t border-emerald-100 pt-5">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-emerald-200 rounded-lg text-emerald-800 hover:bg-emerald-50 font-bold text-sm transition">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm transition shadow-md disabled:bg-teal-400">
                  {isSubmitting ? "Menyimpan..." : (isEditing ? "Kemaskini Profil" : "Simpan Akaun")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}