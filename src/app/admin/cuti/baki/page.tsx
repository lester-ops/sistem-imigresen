"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function BakiCuti() {
  const [bakiCuti, setBakiCuti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Carian & Filter
  const [carian, setCarian] = useState("");
  const [filterBahagian, setFilterBahagian] = useState("");
  const [tahunDipilih, setTahunDipilih] = useState(new Date().getFullYear().toString());

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Papar 15 rekod untuk senarai baki

  // State untuk Modal Kemas Kini Baki
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    nama_pegawai: "",
    baki_bawa_hadapan: "0",
    baki_gantian_jam: "0",
  });

  const dapatkanBakiCuti = useCallback(async () => {
    setLoading(true);
    try {
      const { data: dataBaki, error: ralatBaki } = await supabase
        .from("cuti_baki")
        .select(`
          id,
          ic_pegawai,
          tahun,
          baki_bawa_hadapan,
          baki_gantian_jam,
          pegawai (
            nama,
            jabatan_bahagian,
            kelayakan_cuti_asas
          )
        `)
        .eq("tahun", tahunDipilih);

      if (ralatBaki) throw ralatBaki;

      const { data: dataTransaksi, error: ralatTransaksi } = await supabase
        .from("cuti_transaksi")
        .select("ic_pegawai, bilangan_hari")
        .eq("tahun", tahunDipilih)
        .eq("jenis_cuti", "Cuti Rehat"); 

      if (ralatTransaksi) throw ralatTransaksi;

      const dataLengkap = (dataBaki || []).map((rekod) => {
        const cutiPegawaiIni = dataTransaksi?.filter(
          (cuti) => cuti.ic_pegawai === rekod.ic_pegawai
        ) || [];

        const jumlahCutiDiambil = cutiPegawaiIni.reduce(
          (jumlah, item) => jumlah + (item.bilangan_hari || 0),
          0
        );

        // FIX: Beritahu TypeScript untuk ekstrak objek pertama jika ia adalah array
        const dataPegawai: any = Array.isArray(rekod.pegawai) ? rekod.pegawai[0] : rekod.pegawai;

        const kelayakanAsas = dataPegawai?.kelayakan_cuti_asas || 0;
        const bawaHadapan = rekod.baki_bawa_hadapan || 0;
        const bakiSemasa = (kelayakanAsas + bawaHadapan) - jumlahCutiDiambil;

        return {
          ...rekod,
          pegawai: dataPegawai, // Kemas kini supaya kod di bawah tidak error
          jumlah_diambil: jumlahCutiDiambil,
          baki_semasa: bakiSemasa,
        };
      });

      // Susun ikut nama
      dataLengkap.sort((a, b) => {
        const namaA = a.pegawai?.nama || "";
        const namaB = b.pegawai?.nama || "";
        return namaA.localeCompare(namaB);
      });

      setBakiCuti(dataLengkap);
    } catch (err: any) {
      console.error("Ralat mengambil baki cuti:", err.message);
    } finally {
      setLoading(false);
    }
  }, [tahunDipilih]);

  useEffect(() => {
    dapatkanBakiCuti();
  }, [dapatkanBakiCuti]);

  // Reset page
  useEffect(() => {
    setCurrentPage(1);
  }, [carian, filterBahagian, tahunDipilih]);

  // Ekstrak senarai bahagian
  const senaraiBahagianUnik = Array.from(
    new Set(bakiCuti.map((r) => r.pegawai?.jabatan_bahagian).filter(Boolean))
  ).sort();

  // Tapis data
  const bakiDitapis = bakiCuti.filter((rekod) => {
    const kataKunci = carian.toLowerCase();
    const nama = rekod.pegawai?.nama?.toLowerCase() || "";
    const ic = rekod.ic_pegawai || "";
    const bahagian = rekod.pegawai?.jabatan_bahagian || "";

    const padanCarian = nama.includes(kataKunci) || ic.includes(kataKunci) || bahagian.toLowerCase().includes(kataKunci);
    const padanBahagian = filterBahagian === "" || bahagian === filterBahagian;

    return padanCarian && padanBahagian;
  });

  // Kira Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = bakiDitapis.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(bakiDitapis.length / itemsPerPage);

  const bukaModalEdit = (rekod: any) => {
    setFormData({
      id: rekod.id,
      nama_pegawai: rekod.pegawai?.nama || "Tiada Rekod",
      baki_bawa_hadapan: rekod.baki_bawa_hadapan?.toString() || "0",
      baki_gantian_jam: rekod.baki_gantian_jam?.toString() || "0",
    });
    setIsModalOpen(true);
  };

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("cuti_baki")
        .update({
          baki_bawa_hadapan: parseFloat(formData.baki_bawa_hadapan),
          baki_gantian_jam: parseFloat(formData.baki_gantian_jam),
        })
        .eq("id", formData.id);

      if (error) throw error;
      alert("Maklumat baki berjaya dikemas kini!");
      setIsModalOpen(false);
      dapatkanBakiCuti(); 
    } catch (err: any) {
      alert("Gagal mengemas kini rekod: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Laman */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Rekod Baki Cuti</h1>
            <p className="text-gray-500 text-sm mt-1">Pemantauan Baki Cuti Rehat secara Live berdasarkan tahun</p>
          </div>
          
          <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
            <span className="text-2xl">🗓️</span>
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider leading-none">Tahun Semasa</label>
                <select 
                    className="border-none font-bold text-lg text-blue-700 bg-transparent focus:ring-0 p-0 cursor-pointer outline-none"
                    value={tahunDipilih}
                    onChange={(e) => setTahunDipilih(e.target.value)}
                >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                </select>
            </div>
          </div>
        </div>

        {/* Kotak Carian & Filter */}
        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center flex-1 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 w-full focus-within:ring-2 focus-within:ring-blue-500 transition">
            <span className="text-gray-400 mr-2">🔍</span>
            <input 
              type="text"
              placeholder="Cari nama, No. KP atau bahagian..."
              className="w-full outline-none text-gray-700 bg-transparent text-sm"
              value={carian}
              onChange={(e) => setCarian(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <select 
              className="w-full border-gray-200 bg-gray-50 rounded-lg text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 border transition cursor-pointer text-gray-700"
              value={filterBahagian}
              onChange={(e) => setFilterBahagian(e.target.value)}
            >
              <option value="">Semua Bahagian/Unit</option>
              {senaraiBahagianUnik.map((bahagian, i) => (
                <option key={i} value={bahagian as string}>{bahagian as string}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Kotak Jadual dengan Sticky Header & Paging */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] relative">
            {loading ? (
              <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Sedang memproses kiraan baki...</div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="p-4 font-semibold text-center w-12 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Bil.</th>
                    <th className="p-4 font-semibold sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Nama Pegawai / Bahagian</th>
                    <th className="p-4 font-semibold text-center w-28 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Kelayakan Asas</th>
                    <th className="p-4 font-semibold text-center w-28 text-blue-300 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Bawa Hadapan</th>
                    <th className="p-4 font-semibold text-center w-28 text-red-300 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Telah Diambil</th>
                    <th className="p-4 font-semibold text-center w-32 text-green-300 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">BAKI SEMASA</th>
                    <th className="p-4 font-semibold text-center w-28 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Gantian (Jam)</th>
                    <th className="p-4 font-semibold text-center w-28 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        {carian || filterBahagian ? "Tiada rekod sepadan dengan carian/tapisan." : "Tiada data baki cuti dijumpai untuk tahun ini."}
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((rekod, index) => (
                      <tr key={rekod.id} className="hover:bg-blue-50/50 transition duration-150">
                        <td className="p-4 text-gray-500 text-center font-medium">{indexOfFirstItem + index + 1}</td>
                        <td className="p-4">
                          <p className="font-bold text-gray-900 truncate max-w-xs" title={rekod.pegawai?.nama}>{rekod.pegawai?.nama || 'Tiada Rekod Pegawai'}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{rekod.pegawai?.jabatan_bahagian || '-'}</p>
                        </td>
                        <td className="p-4 text-center text-gray-700 font-bold bg-slate-50/50 border-x border-gray-100">{rekod.pegawai?.kelayakan_cuti_asas || 0}</td>
                        <td className="p-4 text-center text-blue-600 font-bold bg-blue-50/20">+{rekod.baki_bawa_hadapan || 0}</td>
                        <td className="p-4 text-center text-red-500 font-bold bg-red-50/20 border-x border-gray-100">-{rekod.jumlah_diambil}</td>
                        
                        <td className="p-4 text-center bg-green-50/10">
                          <span className={`px-4 py-1.5 rounded-lg border font-extrabold text-base shadow-sm ${
                            rekod.baki_semasa > 5 ? 'bg-green-100 text-green-700 border-green-200' : 
                            rekod.baki_semasa > 0 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-red-100 text-red-700 border-red-200'
                          }`}>
                            {rekod.baki_semasa}
                          </span>
                        </td>

                        <td className="p-4 text-center text-gray-600 font-bold border-l border-gray-100">{rekod.baki_gantian_jam || 0}</td>
                        <td className="p-4 flex justify-center">
                          <button 
                            onClick={() => bukaModalEdit(rekod)}
                            className="bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm"
                          >
                            Edit Baki
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Kontrol Pagination */}
          {!loading && bakiDitapis.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-sm">
              <span className="text-gray-500 font-medium">
                Papar <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> hingga <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, bakiDitapis.length)}</span> dari <span className="font-bold text-gray-900">{bakiDitapis.length}</span> rekod
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition shadow-sm"
                >
                  &larr; Prev
                </button>
                <div className="flex items-center px-4 font-bold text-blue-700">
                  {currentPage} / {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition shadow-sm"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MODAL KEMAS KINI BAKI KEKAL SAMA... */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform scale-100 transition-transform">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-white rounded-t-2xl shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 tracking-wide">Kemas Kini Baki Cuti</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-red-500 font-bold text-2xl transition"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSimpan} className="p-6 space-y-5 bg-slate-50 rounded-b-2xl">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Nama Pegawai</label>
                <div className="p-3 bg-gray-200 border border-gray-300 rounded-lg font-bold text-gray-800 text-sm">
                  {formData.nama_pegawai}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Cuti Bawa Hadapan (Hari)</label>
                <input 
                  type="number" 
                  step="0.5"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 text-sm bg-white"
                  value={formData.baki_bawa_hadapan}
                  onChange={(e) => setFormData({...formData, baki_bawa_hadapan: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1.5 font-medium">* Baki cuti tahun lepas yang dibawa ke tahun ini.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Baki Cuti Gantian (Jam)</label>
                <input 
                  type="number" 
                  step="0.5"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 text-sm bg-white"
                  value={formData.baki_gantian_jam}
                  onChange={(e) => setFormData({...formData, baki_gantian_jam: e.target.value})}
                />
              </div>

              <div className="pt-6 flex justify-end space-x-3 border-t border-gray-200 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition font-medium text-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:bg-blue-400 font-bold text-sm shadow-md"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}