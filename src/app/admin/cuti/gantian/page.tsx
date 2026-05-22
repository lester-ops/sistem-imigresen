"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PengurusanCutiGantian() {
  const [bakiCuti, setBakiCuti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [carian, setCarian] = useState("");
  const [tahunDipilih, setTahunDipilih] = useState(new Date().getFullYear().toString());

  // State Modal Data Entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id_baki: "",
    nama_pegawai: "",
    jam_sedia_ada: 0,
    jam_tambahan: "",
    bulan: (new Date().getMonth() + 1).toString().padStart(2, '0'), // Bulan semasa
  });

  const dapatkanDataGantian = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cuti_baki")
        .select(`
          id,
          ic_pegawai,
          tahun,
          baki_gantian_jam,
          pegawai ( nama, jabatan_bahagian )
        `)
        .eq("tahun", tahunDipilih);

      if (error) throw error;

      // Format dan susun data
      const dataLengkap = (data || []).map((rekod) => {
        const peg: any = rekod.pegawai;
        const dataPegawai = Array.isArray(peg) ? peg[0] : peg;
        return {
          ...rekod,
          pegawai: dataPegawai,
        };
      }).sort((a, b) => (a.pegawai?.nama || "").localeCompare(b.pegawai?.nama || ""));

      setBakiCuti(dataLengkap);
    } catch (err: any) {
      console.error("Ralat mengambil data:", err.message);
    } finally {
      setLoading(false);
    }
  }, [tahunDipilih]);

  useEffect(() => {
    dapatkanDataGantian();
  }, [dapatkanDataGantian]);

  const bakiDitapis = bakiCuti.filter((rekod) => {
    const kataKunci = carian.toLowerCase();
    const nama = rekod.pegawai?.nama?.toLowerCase() || "";
    const ic = rekod.ic_pegawai || "";
    return nama.includes(kataKunci) || ic.includes(kataKunci);
  });

  const bukaModalTambah = (rekod: any) => {
    setFormData({
      ...formData,
      id_baki: rekod.id,
      nama_pegawai: rekod.pegawai?.nama,
      jam_sedia_ada: rekod.baki_gantian_jam || 0,
      jam_tambahan: "",
    });
    setIsModalOpen(true);
  };

  const handleSimpanDataEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Kiraan: Jam sedia ada + Jam baharu yang dimasukkan kerani
    const jamBaru = parseFloat(formData.jam_tambahan) || 0;
    const jumlahTerkini = formData.jam_sedia_ada + jamBaru;

    try {
      // 1. Kemas kini jumlah jam dalam jadual baki
      const { error: ralatUpdate } = await supabase
        .from("cuti_baki")
        .update({ baki_gantian_jam: jumlahTerkini })
        .eq("id", formData.id_baki);

      if (ralatUpdate) throw ralatUpdate;

      alert(`Berjaya! ${jamBaru} jam telah ditambah. Jumlah terkini Cuti Gantian adalah ${jumlahTerkini} jam.`);
      setIsModalOpen(false);
      dapatkanDataGantian(); // Refresh jadual
    } catch (err: any) {
      alert("Gagal menyimpan rekod: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Kemasukan Data Cuti Gantian</h1>
            <p className="text-gray-500 mt-1">Data Entry bulanan jam kerja lebih masa pegawai (1 Hari = 9 Jam)</p>
          </div>
          <select 
              className="mt-4 md:mt-0 border-gray-300 rounded-lg shadow-sm px-4 py-2 font-bold text-blue-700 outline-none"
              value={tahunDipilih}
              onChange={(e) => setTahunDipilih(e.target.value)}
          >
              <option value="2024">Tahun 2024</option>
              <option value="2025">Tahun 2025</option>
          </select>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
          <input 
            type="text"
            placeholder="🔍 Cari nama atau No. Kad Pengenalan..."
            className="w-full outline-none text-gray-700 bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500"
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-4 font-semibold w-16 text-center">Bil.</th>
                <th className="p-4 font-semibold">Nama Pegawai & Bahagian</th>
                <th className="p-4 font-semibold text-center w-32 text-orange-300">Terkumpul (Jam)</th>
                <th className="p-4 font-semibold text-center w-32 text-green-300">Anggaran Hari</th>
                <th className="p-4 font-semibold text-center w-40">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Memuatkan data...</td></tr>
              ) : bakiDitapis.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Tiada rekod dijumpai.</td></tr>
              ) : (
                bakiDitapis.map((rekod, index) => (
                  <tr key={rekod.id} className="hover:bg-blue-50 transition">
                    <td className="p-4 text-center text-gray-500">{index + 1}</td>
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{rekod.pegawai?.nama}</p>
                      <p className="text-xs text-gray-500">{rekod.pegawai?.jabatan_bahagian}</p>
                    </td>
                    <td className="p-4 text-center font-extrabold text-orange-600 bg-orange-50/30 text-lg">
                      {rekod.baki_gantian_jam || 0}
                    </td>
                    <td className="p-4 text-center font-bold text-green-600 bg-green-50/30">
                      {/* Formula Anggaran: Jam / 9 */}
                      {((rekod.baki_gantian_jam || 0) / 9).toFixed(1)} Hari
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => bukaModalTambah(rekod)}
                        className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm w-full"
                      >
                        + Tambah Jam
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DATA ENTRY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 bg-blue-600 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold">Data Entry: Cuti Gantian</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-blue-200 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSimpanDataEntry} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Pegawai</label>
                <div className="p-3 bg-gray-100 rounded-lg font-bold text-gray-800 text-sm border border-gray-200">
                  {formData.nama_pegawai}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Bulan Rekod</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.bulan}
                    onChange={(e) => setFormData({...formData, bulan: e.target.value})}
                  >
                    <option value="01">Januari</option>
                    <option value="02">Februari</option>
                    <option value="03">Mac</option>
                    <option value="04">April</option>
                    <option value="05">Mei</option>
                    <option value="06">Jun</option>
                    <option value="07">Julai</option>
                    <option value="08">Ogos</option>
                    <option value="09">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Disember</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Baki Semasa</label>
                  <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm font-bold text-orange-600">
                    {formData.jam_sedia_ada} Jam
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-600 mb-1 uppercase">Tambah Jam Baru</label>
                <input 
                  type="number" 
                  step="0.5"
                  required
                  placeholder="Contoh: 18"
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold text-blue-800 text-lg bg-blue-50"
                  value={formData.jam_tambahan}
                  onChange={(e) => setFormData({...formData, jam_tambahan: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  Nota: Masukkan jumlah jam lebih masa yang diluluskan untuk bulan tersebut. Ia akan dicampurkan dengan baki sedia ada.
                </p>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm transition">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 font-bold text-sm shadow-md">
                  {isSubmitting ? "Menyimpan..." : "Simpan Rekod"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}