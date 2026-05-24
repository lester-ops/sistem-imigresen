"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TetapanCutiUmum() {
  const [senaraiCutiUmum, setSenaraiCutiUmum] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    tarikh: "",
    nama_cuti: "",
  });

  // Fungsi untuk menarik data cuti umum
  const dapatkanDataCutiUmum = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cuti_umum")
        .select("*")
        .order("tarikh", { ascending: true }); // Ditukar kepada 'true' supaya tersusun mengikut kronologi tarikh (awal ke akhir)

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSenaraiCutiUmum(data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    dapatkanDataCutiUmum();
  }, [dapatkanDataCutiUmum]);

  // Fungsi menyimpan cuti umum baru
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Semak jika tarikh tersebut sudah wujud (elak double entry)
      const { data: semakTarikh } = await supabase
        .from("cuti_umum")
        .select("id")
        .eq("tarikh", formData.tarikh);

      if (semakTarikh && semakTarikh.length > 0) {
        alert("Tarikh ini sudah didaftarkan sebagai Cuti Umum dalam sistem!");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("cuti_umum").insert([
        {
          tarikh: formData.tarikh,
          nama_cuti: formData.nama_cuti,
        },
      ]);

      if (error) throw error;

      alert("Cuti Umum berjaya ditambah!");
      setIsModalOpen(false);
      setFormData({
        tarikh: "",
        nama_cuti: "",
      });
      
      dapatkanDataCutiUmum(); // Refresh jadual
    } catch (err: any) {
      alert("Gagal menambah cuti umum: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi memadam cuti umum
  const handlePadam = async (id: string, namaCuti: string, tarikh: string) => {
    const sahkan = confirm(`Adakah anda pasti untuk memadam rekod cuti umum ini?\n\n${namaCuti} (${tarikh})\n\nPerhatian: Memadam rekod ini mungkin menjejaskan kiraan cuti lama jika ia direkodkan semula pada masa hadapan.`);
    if (!sahkan) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("cuti_umum")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      alert("Rekod Cuti Umum berjaya dipadam!");
      dapatkanDataCutiUmum(); 
    } catch (err: any) {
      alert("Gagal memadam rekod: " + err.message);
      setLoading(false);
    }
  };

  // Fungsi utiliti untuk format tarikh Malaysia (DD/MM/YYYY)
  const formatTarikhMY = (tarikhDB: string) => {
    if (!tarikhDB) return "-";
    const [year, month, day] = tarikhDB.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Tetapan Cuti Umum</h1>
          <p className="text-gray-600 mt-1">Senarai cuti kelepasan am dan cuti peristiwa untuk sistem pengiraan cuti rehat.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow transition flex items-center"
        >
          <span className="mr-2">+</span> Tambah Cuti
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4 font-bold border-l-4 border-red-500">
          Ralat: {errorMsg}
        </div>
      )}

      {/* JADUAL REKOD CUTI UMUM */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
        <div className="bg-purple-50 p-4 border-b border-purple-100">
          <p className="text-sm text-purple-800 flex items-center">
            <span className="mr-2">ℹ️</span> 
            Sistem akan merujuk jadual ini secara automatik untuk menolak (exclude) hari bercuti apabila pegawai memohon cuti rehat.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Menarik senarai cuti umum...</div>
        ) : (
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-800 text-white border-b">
                <th className="p-4 font-semibold w-16">Bil.</th>
                <th className="p-4 font-semibold w-48">Tarikh</th>
                <th className="p-4 font-semibold">Keterangan / Nama Cuti</th>
                <th className="p-4 font-semibold text-center w-32">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {senaraiCutiUmum.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">Tiada rekod cuti umum dijumpai.</td>
                </tr>
              ) : (
                senaraiCutiUmum.map((cuti, index) => (
                  <tr key={cuti.id} className="border-b hover:bg-purple-50 transition">
                    <td className="p-4 text-gray-600">{index + 1}</td>
                    <td className="p-4 font-bold text-gray-800">
                      {formatTarikhMY(cuti.tarikh)}
                      {/* Letak label jika hari ini adalah cuti tersebut (sebagai hiasan tambahan) */}
                      {cuti.tarikh === new Date().toISOString().split('T')[0] && (
                        <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Hari Ini</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-700">{cuti.nama_cuti}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handlePadam(cuti.id, cuti.nama_cuti, formatTarikhMY(cuti.tarikh))}
                        className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white px-3 py-1 rounded text-sm transition shadow-sm border border-red-200 hover:border-transparent font-medium"
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

      {/* MODAL (POP-UP) TAMBAH CUTI UMUM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-slate-800 text-white">
              <h2 className="text-xl font-bold">Daftar Cuti Umum Baharu</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white font-bold text-2xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-slate-50">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">Tarikh Cuti</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  value={formData.tarikh}
                  onChange={(e) => setFormData({...formData, tarikh: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">Nama / Keterangan Cuti</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Cuti Tambahan Hari Raya"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  value={formData.nama_cuti}
                  onChange={(e) => setFormData({...formData, nama_cuti: e.target.value})}
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 font-medium transition"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-bold transition flex items-center shadow-md disabled:bg-purple-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Cuti"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}