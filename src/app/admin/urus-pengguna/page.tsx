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
    id: "", // Digunakan untuk update/delete
    username: "",
    password: "", // Untuk sistem sebenar password patut di-hash, tapi untuk fasa ini kita guna text biasa
    role: "USER",
    bahagian_akses: "",
  });

  // Fungsi ambil data
  const dapatkanDataPengguna = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("pengguna_sistem")
        .select("*")
        .order("role", { ascending: true }); // Susun ADMIN di atas

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

  // Fungsi buka Modal Tambah
  const bukaModalTambah = () => {
    setIsEditing(false);
    setFormData({
      id: "",
      username: "",
      password: "",
      role: "USER",
      bahagian_akses: "",
    });
    setIsModalOpen(true);
  };

  // Fungsi buka Modal Edit
  const bukaModalEdit = (pengguna: any) => {
    setIsEditing(true);
    setFormData({
      id: pengguna.id,
      username: pengguna.username,
      password: pengguna.password,
      role: pengguna.role,
      bahagian_akses: pengguna.bahagian_akses || "",
    });
    setIsModalOpen(true);
  };

  // Fungsi Hantar Data (Insert / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Pastikan tiada ruang kosong pada username
      const usernameBersih = formData.username.trim().toLowerCase();

      if (isEditing) {
        const { error } = await supabase
          .from("pengguna_sistem")
          .update({
            username: usernameBersih,
            password: formData.password,
            role: formData.role,
            bahagian_akses: formData.role === "ADMIN" ? "SEMUA" : formData.bahagian_akses.toUpperCase(),
          })
          .eq("id", formData.id);

        if (error) throw error;
        alert("Akaun pengguna berjaya dikemas kini!");
      } else {
        const { error } = await supabase
          .from("pengguna_sistem")
          .insert([
            {
              username: usernameBersih,
              password: formData.password,
              role: formData.role,
              bahagian_akses: formData.role === "ADMIN" ? "SEMUA" : formData.bahagian_akses.toUpperCase(),
            }
          ]);

        if (error) throw error;
        alert("Akaun pengguna baharu berjaya dicipta!");
      }

      setIsModalOpen(false);
      setLoading(true);
      dapatkanDataPengguna(); // Refresh jadual
    } catch (err: any) {
      if (err.code === '23505') {
        alert("Ralat: Username ini telah digunakan oleh pengguna lain!");
      } else {
        alert("Gagal menyimpan data: " + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi Padam
  const handlePadam = async (id: string, username: string) => {
    if (username === "admin") {
      alert("AMARAN: Anda tidak boleh memadam akaun 'admin' utama sistem!");
      return;
    }

    const sahkan = confirm(`Adakah anda pasti untuk memadam akaun pengguna '@${username}'?`);
    
    if (sahkan) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("pengguna_sistem")
          .delete()
          .eq("id", id);

        if (error) throw error;
        alert("Akaun pengguna berjaya dipadam.");
        dapatkanDataPengguna();
      } catch (err: any) {
        alert("Gagal memadam akaun: " + err.message);
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pengurusan Akses Pengguna</h1>
          <p className="text-gray-600 mt-2">Urus ID log masuk dan peranan pengguna sistem</p>
        </div>
        <button 
          onClick={bukaModalTambah}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition shadow flex items-center justify-center"
        >
          <span className="mr-2">+</span> Tambah Pengguna
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuatkan senarai pengguna...</div>
        ) : (
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-800 text-white border-b">
                <th className="p-4 font-semibold">Bil.</th>
                <th className="p-4 font-semibold">Username</th>
                <th className="p-4 font-semibold">Kata Laluan</th>
                <th className="p-4 font-semibold">Peranan (Role)</th>
                <th className="p-4 font-semibold">Akses Bahagian</th>
                <th className="p-4 font-semibold text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {senaraiPengguna.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Tiada rekod pengguna.</td>
                </tr>
              ) : (
                senaraiPengguna.map((pengguna, index) => (
                  <tr key={pengguna.id} className="border-b hover:bg-blue-50 transition">
                    <td className="p-4 text-gray-600">{index + 1}</td>
                    <td className="p-4 font-bold text-blue-600">@{pengguna.username}</td>
                    <td className="p-4 text-gray-500">
                      {/* Papar asterik untuk keselamatan sikit */}
                      {pengguna.password.replace(/./g, '*')}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        pengguna.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {pengguna.role}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{pengguna.bahagian_akses || 'SEMUA'}</td>
                    <td className="p-4 flex justify-center space-x-2">
                      <button 
                        onClick={() => bukaModalEdit(pengguna)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handlePadam(pengguna.id, pengguna.username)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                        disabled={pengguna.username === 'admin'} // Halang butang padam untuk admin utama
                      >
                        Padam
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL TAMBAH/EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-800">
                {isEditing ? "Kemaskini Pengguna" : "Daftar Pengguna Baharu"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-red-500 font-bold text-xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username (ID Log Masuk)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: ketua_unit_a"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kata Laluan (Password)</label>
                <input 
                  type="text" // Biar nampak teks untuk fasa ini supaya Admin tahu apa yang ditaip
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peranan Akses</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="USER">USER (Pengguna Biasa / Ketua Bahagian)</option>
                  <option value="ADMIN">ADMIN (Pentadbir Sistem)</option>
                </select>
              </div>

              {/* Jika pilih USER, baru minta nama bahagian */}
              {formData.role === "USER" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Akses Bahagian/Unit</label>
                  <input 
                    type="text" 
                    required={formData.role === "USER"}
                    placeholder="Contoh: UNIT A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.bahagian_akses}
                    onChange={(e) => setFormData({...formData, bahagian_akses: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">* Pastikan ejaan sama persis dengan bahagian di dalam Senarai Pegawai.</p>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-2 border-t mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition disabled:bg-blue-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Akaun"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}