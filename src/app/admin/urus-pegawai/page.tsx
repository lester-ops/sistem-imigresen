"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UrusPegawai() {
  const [senaraiPegawai, setSenaraiPegawai] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Carian & Filter
  const [carian, setCarian] = useState("");
  const [filterBahagian, setFilterBahagian] = useState("");
  
  // State untuk Modal (Pop-up) dan Borang
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  
  const [formData, setFormData] = useState({
    ic: "",
    nama: "",
    gred: "",
    jabatan_bahagian: "",
    tarikh_lantikan: "",
    kelayakan_cuti_asas: "",
  });

  const dapatkanDataPegawai = useCallback(async () => {
    const { data, error } = await supabase.from("pegawai").select("*");
    if (error) {
      console.error("Ralat ambil data:", error.message);
    } else {
      setSenaraiPegawai(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    dapatkanDataPegawai();
  }, [dapatkanDataPegawai]);

  // =======================================================================
  // LOGIK SUSUNAN TETAP & HIERARKI (KUMPULAN BAHAGIAN & GRED)
  // =======================================================================

  const DEPT_ORDER = [
    "PENGURUSAN TERTINGGI",
    "LAWAS, KIBL",
    "LAWAS, UNIT A",
    "LAWAS, UNIT A & B",
    "LAWAS, UNIT B",
    "LAWAS, UNIT E",
    "LAWAS, UNIT F,G,J",
    "LAWAS, UNIT H",
    "DERMAGA, DERMAGA",
    "MENGKALAP, PINTU MASUK",
    "MERAPOK, PINTU MASUK",
    "SUNDAR, PEJABAT SUNDAR"
  ];

  const getDeptIndex = (dept: string) => {
    if (!dept) return 999;
    const upperDept = dept.toUpperCase();
    const index = DEPT_ORDER.findIndex(d => d.toUpperCase() === upperDept);
    if (index !== -1) return index;
    if (upperDept.includes("DERMAGA")) {
      const dermagaIndex = DEPT_ORDER.findIndex(d => d.toUpperCase() === "DERMAGA, DERMAGA");
      return dermagaIndex !== -1 ? dermagaIndex : 999;
    }
    return 999;
  };

  const getRank = (g: string) => {
    if (!g) return { prefixPriority: 0, num: 0, tbk: false };
    const gUpper = g.toUpperCase();
    let prefixPriority = 0;
    if (gUpper.includes('KP')) prefixPriority = 3;
    else if (gUpper.includes('N') || gUpper.includes('W')) prefixPriority = 2;
    else if (gUpper.includes('H')) prefixPriority = 1;
    
    const numMatch = gUpper.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : 0;
    const tbk = gUpper.includes('TBK');
    return { prefixPriority, num, tbk };
  };

  // 1. Tapis data berdasarkan carian/filter
  const pegawaiDitapis = senaraiPegawai.filter((pegawai) => {
    const kataKunci = carian.toLowerCase();
    const padanCarian = 
      (pegawai.nama || "").toLowerCase().includes(kataKunci) ||
      (pegawai.ic || "").includes(kataKunci) ||
      (pegawai.jabatan_bahagian && pegawai.jabatan_bahagian.toLowerCase().includes(kataKunci));
    const padanBahagian = filterBahagian === "" || pegawai.jabatan_bahagian === filterBahagian;
    return padanCarian && padanBahagian;
  });

  // 2. Kelompokkan data mengikut Bahagian
  const groupedData: Record<string, any[]> = {};
  pegawaiDitapis.forEach(p => {
    const dept = p.jabatan_bahagian || "TIADA BAHAGIAN";
    if (!groupedData[dept]) groupedData[dept] = [];
    groupedData[dept].push(p);
  });

  // 3. Susun kunci (nama bahagian) mengikut DEPT_ORDER
  const sortedDepartments = Object.keys(groupedData).sort((a, b) => {
    const indexA = getDeptIndex(a);
    const indexB = getDeptIndex(b);
    if (indexA !== indexB) return indexA - indexB;
    return a.localeCompare(b);
  });

  // 4. Susun pegawai di dalam setiap bahagian mengikut pangkat
  sortedDepartments.forEach(dept => {
    groupedData[dept].sort((a, b) => {
      const rankA = getRank(a.gred);
      const rankB = getRank(b.gred);
      if (rankA.prefixPriority !== rankB.prefixPriority) return rankB.prefixPriority - rankA.prefixPriority; 
      if (rankA.num !== rankB.num) return rankB.num - rankA.num; 
      if (rankA.tbk !== rankB.tbk) return rankA.tbk ? 1 : -1; 
      return (a.nama || "").localeCompare(b.nama || ""); 
    });
  });

  // Dapatkan senarai Bahagian yang unik untuk Dropdown Filter (Header)
  const senaraiBahagianUnik = Array.from(
    new Set(senaraiPegawai.map((p) => p.jabatan_bahagian).filter(Boolean))
  ).sort((a, b) => {
      return getDeptIndex(a as string) - getDeptIndex(b as string);
  });

  // =======================================================================

  const bukaModalTambah = () => {
    setIsEditing(false);
    setFormData({ ic: "", nama: "", gred: "", jabatan_bahagian: "", tarikh_lantikan: "", kelayakan_cuti_asas: "" });
    setIsModalOpen(true);
  };

  const bukaModalEdit = (pegawai: any) => {
    setIsEditing(true);
    setFormData({
      ic: pegawai.ic, nama: pegawai.nama, gred: pegawai.gred, jabatan_bahagian: pegawai.jabatan_bahagian,
      tarikh_lantikan: pegawai.tarikh_lantikan || "", kelayakan_cuti_asas: pegawai.kelayakan_cuti_asas?.toString() || "0",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataUntukDisimpan = {
        ic: formData.ic.trim(), nama: formData.nama.toUpperCase(), gred: formData.gred.toUpperCase(),
        jabatan_bahagian: formData.jabatan_bahagian.toUpperCase(), tarikh_lantikan: formData.tarikh_lantikan || null,
        kelayakan_cuti_asas: formData.kelayakan_cuti_asas ? parseInt(formData.kelayakan_cuti_asas) : 0,
      };

      if (isEditing) {
        const { error } = await supabase.from("pegawai").update(dataUntukDisimpan).eq("ic", formData.ic.trim()); 
        if (error) throw error;
        alert("Maklumat pegawai berjaya dikemas kini!");
      } else {
        const { error } = await supabase.from("pegawai").insert([dataUntukDisimpan]);
        if (error) throw error;
        alert("Pegawai baharu berjaya ditambah!");
      }

      setIsModalOpen(false);
      setLoading(true);
      dapatkanDataPegawai(); 
    } catch (err: any) {
      if (err.code === '23505') alert("Ralat: Nombor Kad Pengenalan (IC) ini sudah wujud dalam sistem!");
      else alert("Gagal menyimpan data pegawai: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePadam = async (ic: string, nama: string) => {
    const sahkan = confirm(`Adakah anda pasti untuk memadam rekod pegawai ini?\n\nNama: ${nama}\nNo. KP: ${ic}`);
    if (sahkan) {
      setLoading(true);
      try {
        const { error } = await supabase.from("pegawai").delete().eq("ic", ic);
        if (error) throw error;
        alert("Rekod pegawai berjaya dipadam.");
        dapatkanDataPegawai(); 
      } catch (err: any) {
        alert("Gagal memadam rekod: " + err.message);
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-8 bg-transparent min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Laman */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-emerald-900">Senarai Pegawai</h1>
            <p className="text-emerald-700 text-sm mt-1 font-medium">Sistem Pengurusan Rekod Kakitangan & Profil</p>
          </div>
          <button 
            onClick={bukaModalTambah}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg transition shadow-md flex items-center justify-center font-bold text-sm tracking-wide"
          >
            <span className="mr-2">+</span> Tambah Pegawai
          </button>
        </div>

        {/* Bar Carian & Filter */}
        <div className="mb-8 bg-white/90 backdrop-blur p-4 rounded-xl shadow-sm border border-emerald-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center space-x-3 md:w-1/3">
            <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">👥</div>
            <span className="font-bold text-emerald-900 text-sm">Tapisan Rekod</span>
          </div>
          
          <div className="w-full md:w-1/3">
            <select 
              className="w-full border-emerald-200 bg-emerald-50/50 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 border transition cursor-pointer text-emerald-900 font-semibold"
              value={filterBahagian}
              onChange={(e) => setFilterBahagian(e.target.value)}
            >
              <option value="">-- Semua Bahagian --</option>
              {senaraiBahagianUnik.map((bahagian, i) => (
                <option key={i} value={bahagian as string}>{bahagian as string}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center flex-1 bg-emerald-50/50 rounded-lg border border-emerald-200 px-4 py-2.5 w-full focus-within:ring-2 focus-within:ring-emerald-500 transition">
            <span className="text-emerald-600 mr-2">🔍</span>
            <input 
              type="text"
              placeholder="Cari Nama / KP..."
              className="w-full outline-none text-emerald-900 font-medium bg-transparent text-sm placeholder-emerald-400"
              value={carian}
              onChange={(e) => setCarian(e.target.value)}
            />
          </div>
        </div>

        {/* JADUAL BERKUMPULAN (GROUPED VIEW) */}
        {loading ? (
          <div className="p-12 text-center text-emerald-700 animate-pulse font-bold bg-white/80 backdrop-blur rounded-xl shadow-sm border border-emerald-100">
            Sedang memuat turun data pegawai...
          </div>
        ) : sortedDepartments.length === 0 ? (
          <div className="p-12 text-center text-emerald-700 font-bold bg-white/80 backdrop-blur rounded-xl shadow-sm border border-emerald-100">
            Tiada data pegawai dijumpai.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDepartments.map((dept) => {
              const officers = groupedData[dept];
              return (
                <div key={dept} className="bg-white/95 backdrop-blur rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
                  
                  {/* Header Bahagian / Kad */}
                  <div className="bg-emerald-50/80 border-b border-emerald-100 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <h2 className="font-bold text-emerald-900 flex items-center text-sm md:text-base tracking-wide">
                      <span className="mr-3 text-emerald-600 text-lg">🏢</span> {dept}
                    </h2>
                    <span className="bg-white border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                      {officers.length} Pegawai
                    </span>
                  </div>

                  {/* Jadual Dalaman */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-emerald-50 text-xs uppercase text-emerald-700 font-bold bg-white">
                          <th className="px-6 py-4 w-12 text-center">Bil</th>
                          <th className="px-6 py-4 flex-1">Nama Pegawai</th>
                          <th className="px-6 py-4 w-40">No. KP</th>
                          <th className="px-6 py-4 w-32">Gred</th>
                          <th className="px-6 py-4 w-32 text-center">Kelayakan (Hari)</th>
                          <th className="px-6 py-4 w-32 text-center">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-50">
                        {officers.map((pegawai, idx) => (
                          <tr key={pegawai.ic} className="hover:bg-emerald-50/50 transition duration-150 group">
                            <td className="px-6 py-4 text-emerald-600 text-center font-medium">{idx + 1}</td>
                            <td className="px-6 py-4 font-bold text-emerald-900">{pegawai.nama}</td>
                            <td className="px-6 py-4 text-emerald-700 font-mono text-sm">{pegawai.ic}</td>
                            <td className="px-6 py-4">
                              <span className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded text-xs border border-emerald-200 shadow-sm">
                                {pegawai.gred}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-teal-600 text-center text-lg">
                              {pegawai.kelayakan_cuti_asas}
                            </td>
                            <td className="px-6 py-4 flex justify-center space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => bukaModalEdit(pegawai)}
                                title="Edit Pegawai"
                                className="bg-teal-50 hover:bg-teal-100 text-teal-700 p-2 rounded-md transition shadow-sm border border-teal-200"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => handlePadam(pegawai.ic, pegawai.nama)}
                                title="Padam Pegawai"
                                className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-md transition shadow-sm border border-red-100"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MODAL (POP-UP) TAMBAH/EDIT PEGAWAI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform scale-100 transition-transform">
            <div className="p-6 border-b border-emerald-100 flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
              <h2 className="text-xl font-bold text-emerald-900 tracking-wide">
                {isEditing ? "Kemas Kini Maklumat Pegawai" : "Pendaftaran Pegawai Baharu"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-emerald-600 hover:text-red-500 font-bold text-2xl transition"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-emerald-50/30">
              
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">No. Kad Pengenalan (IC)</label>
                <input 
                  type="text" 
                  required
                  disabled={isEditing} 
                  placeholder="Contoh: 900101-12-3456"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium ${isEditing ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'border-emerald-200 bg-white'}`}
                  value={formData.ic}
                  onChange={(e) => setFormData({...formData, ic: e.target.value})}
                />
                {isEditing && <p className="text-xs text-orange-600 mt-1.5 font-medium">* Nombor KP kekal (Primary Key) dan tidak boleh ditukar.</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Nama Penuh Pegawai</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm uppercase"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Gred Jawatan</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: KP 19"
                    className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm uppercase"
                    value={formData.gred}
                    onChange={(e) => setFormData({...formData, gred: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Bahagian / Unit</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: UNIT A"
                    className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm uppercase"
                    value={formData.jabatan_bahagian}
                    onChange={(e) => setFormData({...formData, jabatan_bahagian: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Tarikh Lantikan</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-emerald-900 font-medium"
                    value={formData.tarikh_lantikan}
                    onChange={(e) => setFormData({...formData, tarikh_lantikan: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Kelayakan Cuti (Hari)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="Contoh: 25"
                    className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-bold text-teal-700"
                    value={formData.kelayakan_cuti_asas}
                    onChange={(e) => setFormData({...formData, kelayakan_cuti_asas: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-end space-x-3 border-t border-emerald-100 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-emerald-800 border border-emerald-200 bg-white hover:bg-emerald-50 rounded-lg transition font-bold text-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:bg-emerald-400 font-bold text-sm shadow-md"
                >
                  {isSubmitting ? "Menyimpan..." : (isEditing ? "Kemaskini Rekod" : "Simpan Pegawai")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}