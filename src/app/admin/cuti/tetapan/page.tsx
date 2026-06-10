"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TetapanCutiUmum() {
  const [senaraiCutiUmum, setSenaraiCutiUmum] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tarikh: "",
    nama_cuti: "",
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: "",
    tarikh: "",
    nama_cuti: "",
  });

  const dapatkanDataCutiUmum = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cuti_umum")
        .select("*")
        .order("tarikh", { ascending: true });

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

  const cutiDitapis = senaraiCutiUmum.filter((cuti) => {
    if (!cuti.tarikh) return false;
    return cuti.tarikh.startsWith(filterTahun);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
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
      setFormData({ tarikh: "", nama_cuti: "" });
      dapatkanDataCutiUmum();
    } catch (err: any) {
      alert("Gagal menambah cuti umum: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: semakTarikh } = await supabase
        .from("cuti_umum")
        .select("id")
        .eq("tarikh", editFormData.tarikh)
        .neq("id", editFormData.id);

      if (semakTarikh && semakTarikh.length > 0) {
        alert("Tarikh ini telah pun digunakan oleh rekod cuti umum yang lain!");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("cuti_umum")
        .update({
          tarikh: editFormData.tarikh,
          nama_cuti: editFormData.nama_cuti,
        })
        .eq("id", editFormData.id);

      if (error) throw error;

      alert("Rekod Cuti Umum berjaya dikemas kini!");
      setIsEditModalOpen(false);
      setEditFormData({ id: "", tarikh: "", nama_cuti: "" });
      dapatkanDataCutiUmum();
    } catch (err: any) {
      alert("Gagal mengemas kini cuti umum: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePadam = async (id: string, namaCuti: string, tarikh: string) => {
    const sahkan = window.confirm(`Adakah anda pasti untuk memadam rekod cuti umum ini?\n\n${namaCuti} (${tarikh})\n\nPerhatian: Memadam rekod ini mungkin menjejaskan kiraan cuti lama jika ia direkodkan semula pada masa hadapan.`);
    if (!sahkan) return;

    try {
      setLoading(true);
      const { error } = await supabase.from("cuti_umum").delete().eq("id", id);
      if (error) throw error;
      alert("Rekod Cuti Umum berjaya dipadam!");
      dapatkanDataCutiUmum();
    } catch (err: any) {
      alert("Gagal memadam rekod: " + err.message);
      setLoading(false);
    }
  };

  const bukaModalEdit = (cuti: any) => {
    setEditFormData({
      id: cuti.id,
      tarikh: cuti.tarikh,
      nama_cuti: cuti.nama_cuti,
    });
    setIsEditModalOpen(true);
  };

  const formatTarikhMY = (tarikhDB: string) => {
    if (!tarikhDB) return "-";
    const [year, month, day] = tarikhDB.split("-");
    return `${day}/${month}/${year}`;
  };

  const dHariIni = new Date();
  const tarikhHariIniStr = `${dHariIni.getFullYear()}-${String(dHariIni.getMonth() + 1).padStart(2, '0')}-${String(dHariIni.getDate()).padStart(2, '0')}`;

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Tetapan Cuti Umum</h1>
          <p className="text-gray-600 mt-1">Senarai cuti kelepasan am dan cuti peristiwa untuk sistem pengiraan cuti rehat.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm tracking-wide"
        >
          <span className="mr-2">+</span> Tambah Cuti
        </button>
      </div>

      <div className="mb-6 bg-white/90 backdrop-blur p-4 rounded-xl shadow-sm border border-purple-100 flex items-center gap-4">
        <div className="flex items-center space-x-3 w-auto">
          <div className="bg-purple-100 text-purple-700 p-2 rounded-lg text-lg">🗓️</div>
          <span className="font-bold text-slate-800 text-sm">Papar Tahun:</span>
        </div>
        <div className="w-48">
          <select
            className="w-full border-purple-200 bg-purple-50/50 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-900 shadow-sm cursor-pointer"
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
          >
            <option value="2024">Tahun 2024</option>
            <option value="2025">Tahun 2025</option>
            <option value="2026">Tahun 2026</option>
            <option value="2027">Tahun 2027</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-6 font-bold border-l-4 border-red-500 text-sm shadow-sm">
          Ralat: {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
        <div className="bg-purple-50 p-4 border-b border-purple-100">
          <p className="text-sm text-purple-800 flex items-center font-semibold">
            <span className="mr-2 text-base">ℹ️</span>
            Sistem akan merujuk senarai ini untuk menolak (exclude) hari secara automatik apabila pegawai Pejabat memohon Cuti Rehat, Cuti Sakit, dan CTRK.
          </p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-purple-600 animate-pulse font-bold">Menarik senarai cuti umum...</div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
              <thead>
                <tr className="bg-slate-800 text-white border-b border-slate-900">
                  <th className="p-4 font-semibold w-16 text-center">Bil.</th>
                  <th className="p-4 font-semibold w-48">Tarikh</th>
                  <th className="p-4 font-semibold">Keterangan / Nama Cuti</th>
                  <th className="p-4 font-semibold text-center w-40">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cutiDitapis.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-500 font-medium">
                      Tiada rekod cuti umum didaftarkan untuk tahun {filterTahun}.
                    </td>
                  </tr>
                ) : (
                  cutiDitapis.map((cuti, index) => {
                    const isHariIni = cuti.tarikh === tarikhHariIniStr;
                    return (
                      <tr key={cuti.id} className="hover:bg-purple-50/50 transition">
                        <td className="p-4 text-center text-slate-500 font-medium">{index + 1}</td>
                        <td className="p-4 font-bold text-slate-800">
                          {formatTarikhMY(cuti.tarikh)}
                          {isHariIni && (
                            <span className="ml-2 bg-green-100 text-green-700 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-green-200 shadow-sm">Hari Ini</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-700 font-medium">{cuti.nama_cuti}</td>
                        <td className="p-4 text-center flex justify-center space-x-2">
                          <button
                            onClick={() => bukaModalEdit(cuti)}
                            className="bg-white hover:bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-xs transition shadow-sm border border-purple-200 font-bold"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handlePadam(cuti.id, cuti.nama_cuti, formatTarikhMY(cuti.tarikh))}
                            className="bg-white hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs transition shadow-sm border border-red-200 font-bold"
                          >
                            🗑️ Padam
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-transform scale-100 border border-purple-100">
            <div className="p-6 border-b border-purple-100 flex justify-between items-center bg-white shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 tracking-wide">Daftar Cuti Umum Baharu</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-red-500 font-bold text-2xl outline-none transition"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-slate-50/50">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Tarikh Cuti</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white font-medium text-sm shadow-sm"
                  value={formData.tarikh}
                  onChange={(e) => setFormData({...formData, tarikh: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Nama / Keterangan Cuti</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cuti Tambahan Hari Raya"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white font-medium text-sm shadow-sm"
                  value={formData.nama_cuti}
                  onChange={(e) => setFormData({...formData, nama_cuti: e.target.value})}
                />
              </div>

              <div className="pt-5 border-t border-slate-200 flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-bold text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition flex items-center shadow-md disabled:bg-purple-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Cuti"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-transform scale-100 border border-purple-100">
            <div className="p-6 border-b border-purple-100 flex justify-between items-center bg-white shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 tracking-wide">Kemas Kini Cuti Umum</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-red-500 font-bold text-2xl outline-none transition"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5 bg-purple-50/30">
              <div>
                <label className="block text-xs font-bold text-purple-800 mb-1.5 uppercase tracking-wide">Tarikh Cuti (Baharu)</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2.5 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white font-medium text-sm shadow-sm"
                  value={editFormData.tarikh}
                  onChange={(e) => setEditFormData({...editFormData, tarikh: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-800 mb-1.5 uppercase tracking-wide">Nama / Keterangan Cuti (Baharu)</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white font-medium text-sm shadow-sm"
                  value={editFormData.nama_cuti}
                  onChange={(e) => setEditFormData({...editFormData, nama_cuti: e.target.value})}
                />
              </div>

              <div className="pt-5 border-t border-purple-100 flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 border border-purple-200 rounded-lg text-purple-800 hover:bg-purple-50 font-bold text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition flex items-center shadow-md disabled:bg-purple-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Kemas Kini"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
//