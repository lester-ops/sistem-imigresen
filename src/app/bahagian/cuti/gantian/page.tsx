"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";

export default function SejarahCutiGantianBahagian() {
  const [mounted, setMounted] = useState(false);
  const [senaraiSejarah, setSenaraiSejarah] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [carian, setCarian] = useState("");
  const [tahunDipilih, setTahunDipilih] = useState(new Date().getFullYear().toString());
  const [bahagianAkses, setBahagianAkses] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [pilihanPegawai, setPilihanPegawai] = useState<any[]>([]);
  const [isGantianModalOpen, setIsGantianModalOpen] = useState(false);
  const [isSubmittingGantian, setIsSubmittingGantian] = useState(false);
  const [bilanganGantianEntry, setBilanganGantianEntry] = useState(1);
  const [gantianBulanTahun, setGantianBulanTahun] = useState({
    tahun: new Date().getFullYear().toString(),
    bulan: String(new Date().getMonth() + 1).padStart(2, '0'),
  });

  const janaBarisGantianKosong = () => ({ ic_pegawai: "", jumlah_jam: "" });
  const [gantianEntries, setGantianEntries] = useState<any[]>(() => [janaBarisGantianKosong()]);

  const dapatkanPilihanPegawai = async (bahagian: string) => {
    const { data } = await supabase.from("pegawai").select("ic, nama, jabatan_bahagian").eq("jabatan_bahagian", bahagian).order("nama");
    if (data) setPilihanPegawai(data);
  };

  const dapatkanSejarah = useCallback(async (bahagian: string) => {
    setLoading(true);
    try {
      // Menapis rekod dengan hanya memaparkan pegawai dari bahagian kerani yang log masuk
      const { data, error } = await supabase
        .from("cuti_gantian_tambah")
        .select(`
          id, ic_pegawai, bulan, tahun, jumlah_jam, created_at,
          pegawai!inner ( nama, jabatan_bahagian )
        `)
        .eq("tahun", tahunDipilih)
        .eq("pegawai.jabatan_bahagian", bahagian)
        .order("created_at", { ascending: false });

      if (error) {
        alert("Ralat Database (Paparan): " + error.message);
        throw error;
      }
      setSenaraiSejarah(data || []);
    } catch (err: any) {
      console.error("Ralat mengambil sejarah:", err.message);
    } finally {
      setLoading(false);
    }
  }, [tahunDipilih]);

  useEffect(() => {
    const bahagian = localStorage.getItem("bahagianAkses") || "";
    setBahagianAkses(bahagian);
    if (bahagian) {
      dapatkanSejarah(bahagian);
      dapatkanPilihanPegawai(bahagian);
    } else {
      setLoading(false);
    }
  }, [dapatkanSejarah]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [carian, tahunDipilih]);

  const sejarahDitapis = senaraiSejarah.filter((rekod) => {
    const kataKunci = carian.toLowerCase();
    const nama = rekod.pegawai?.nama?.toLowerCase() || "";
    const ic = rekod.ic_pegawai || "";
    return nama.includes(kataKunci) || ic.includes(kataKunci);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sejarahDitapis.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sejarahDitapis.length / itemsPerPage);

  const namaBulan = (b: string) => {
    const bulanArr = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
    const index = parseInt(b) - 1;
    return bulanArr[index] || b;
  };

  const formatTarikhDicipta = (tarikhStr: string) => {
    const tarikh = new Date(tarikhStr);
    return tarikh.toLocaleString('ms-MY', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  useEffect(() => {
    const jumlahBaru = parseInt(bilanganGantianEntry.toString()) || 1;
    setGantianEntries((prev) => {
      const salinan = [...prev];
      if (jumlahBaru > salinan.length) { for (let i = salinan.length; i < jumlahBaru; i++) { salinan.push(janaBarisGantianKosong()); } } else { salinan.length = jumlahBaru; }
      return salinan;
    });
  }, [bilanganGantianEntry]);

  const updateGantianEntry = (index: number, field: string, value: any) => {
    const salinan = [...gantianEntries]; salinan[index] = { ...salinan[index], [field]: value }; setGantianEntries(salinan);
  };

  const resetBorangGantian = () => { setBilanganGantianEntry(1); setGantianEntries([janaBarisGantianKosong()]); };

  const handleGantianSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmittingGantian(true);
    try {
      const validEntries = gantianEntries.filter(e => e.ic_pegawai !== "" && e.jumlah_jam !== "");
      if (validEntries.length === 0) { alert("Sila isi lengkap."); setIsSubmittingGantian(false); return; }
      
      const icSet = new Set();
      for (const item of validEntries) {
         if (icSet.has(item.ic_pegawai)) { alert("Pegawai berulang dalam borang."); setIsSubmittingGantian(false); return; }
         icSet.add(item.ic_pegawai);
      }
      
      const { data: existingBaki, error: errFetch } = await supabase.from("cuti_baki").select("id, ic_pegawai, baki_gantian_jam").eq("tahun", gantianBulanTahun.tahun).in("ic_pegawai", Array.from(icSet));
      if (errFetch) throw errFetch;
      
      const existingMap = new Map(); existingBaki?.forEach(b => existingMap.set(b.ic_pegawai, b));
      
      const rekodSejarah = [];

      for (const item of validEntries) {
         const jamTambah = parseFloat(item.jumlah_jam); if (isNaN(jamTambah) || jamTambah <= 0) continue;
         
         const rekodLama = existingMap.get(item.ic_pegawai); let bakiTerkini = jamTambah;
         
         if (rekodLama) { 
           bakiTerkini += (rekodLama.baki_gantian_jam || 0); 
           await supabase.from("cuti_baki").update({ baki_gantian_jam: bakiTerkini }).eq("id", rekodLama.id); 
         } else { 
           await supabase.from("cuti_baki").insert({ ic_pegawai: item.ic_pegawai, tahun: gantianBulanTahun.tahun, baki_bawa_hadapan: 0, baki_gantian_jam: jamTambah }); 
         }

         rekodSejarah.push({
           ic_pegawai: item.ic_pegawai,
           bulan: gantianBulanTahun.bulan,
           tahun: gantianBulanTahun.tahun,
           jumlah_jam: jamTambah
         });
      }

      if(rekodSejarah.length > 0) {
        const { error: errSejarah } = await supabase.from("cuti_gantian_tambah").insert(rekodSejarah);
        if (errSejarah) throw errSejarah; // Tambahan logik tangkap ralat pangkalan data
      }

      alert(`Berjaya! Rekod penambahan jam telah disimpan.`); setIsGantianModalOpen(false); resetBorangGantian(); dapatkanSejarah(bahagianAkses);
    } catch (err: any) { alert("Gagal merekod: " + err.message); } finally { setIsSubmittingGantian(false); }
  };

  const handlePadam = async (rekod: any) => {
    const sahkan = confirm(`AMARAN!\n\nAdakah anda pasti mahu memadam rekod penambahan jam ini?\nPegawai: ${rekod.pegawai?.nama}\nBulan: ${namaBulan(rekod.bulan)} ${rekod.tahun}\nJam Ditambah: +${rekod.jumlah_jam} Jam\n\nJika dipadam, ${rekod.jumlah_jam} jam akan DITOLAK KEMBALI daripada baki cuti gantian semasa pegawai ini.`);
    if (!sahkan) return;

    setLoading(true);
    try {
      // 1. Padam rekod sejarah
      const { error: errDelete } = await supabase.from("cuti_gantian_tambah").delete().eq("id", rekod.id);
      if (errDelete) throw errDelete;

      // 2. Cari Baki Semasa dan Tolak Jam
      const { data: bakiData, error: errBaki } = await supabase
        .from("cuti_baki")
        .select("id, baki_gantian_jam")
        .eq("ic_pegawai", rekod.ic_pegawai)
        .eq("tahun", rekod.tahun)
        .single();

      if (!errBaki && bakiData) {
         const bakiBaru = (bakiData.baki_gantian_jam || 0) - rekod.jumlah_jam;
         await supabase.from("cuti_baki").update({ baki_gantian_jam: Math.max(0, bakiBaru) }).eq("id", bakiData.id);
      }

      alert("Rekod berjaya dipadam dan baki telah dikemas kini.");
      dapatkanSejarah(bahagianAkses);
    } catch (err: any) {
      alert("Gagal memadam: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-transparent min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-orange-900">Rekod Cuti Gantian</h1>
            <p className="text-orange-700 text-sm mt-1 font-medium">Buku log resit kemasukan jam untuk unit {bahagianAkses || '-'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm border border-orange-200">
            <button onClick={() => setIsGantianModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-md transition flex items-center font-bold text-sm tracking-wide">
              <span className="mr-2">⏱️</span> Tambah Jam
            </button>
            <div className="flex items-center space-x-2 border-l border-orange-200 pl-3">
              <span className="text-xl">🗓️</span>
              <div>
                <label className="block text-[10px] font-bold text-orange-600 uppercase tracking-wider leading-none">Tahun</label>
                <select 
                  className="border-none font-bold text-base text-orange-700 bg-transparent focus:ring-0 p-0 cursor-pointer outline-none"
                  value={tahunDipilih}
                  onChange={(e) => setTahunDipilih(e.target.value)}
                >
                  <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur p-4 rounded-xl shadow-sm border border-orange-100 flex items-center mb-6">
          <div className="flex items-center flex-1 bg-orange-50/50 rounded-lg border border-orange-200 px-4 py-2.5 w-full focus-within:ring-2 focus-within:ring-orange-500 transition">
            <span className="text-orange-600 mr-2">🔍</span>
            <input 
              type="text"
              placeholder="Cari Nama Pegawai atau No. KP..."
              className="w-full outline-none text-orange-900 font-medium bg-transparent text-sm placeholder-orange-400"
              value={carian}
              onChange={(e) => setCarian(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-xl shadow-md border border-orange-200 overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            {loading ? (
              <div className="p-12 text-center text-orange-700 font-bold animate-pulse">Menarik data log sejarah...</div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-orange-500 text-white">
                    <th className="p-4 font-semibold text-center w-12 sticky top-0 bg-orange-500 z-10 shadow-sm border-b border-orange-600">Bil.</th>
                    <th className="p-4 font-semibold sticky top-0 bg-orange-500 z-10 shadow-sm border-b border-orange-600">Nama Pegawai & Bahagian</th>
                    <th className="p-4 font-semibold text-center w-32 sticky top-0 bg-orange-500 z-10 shadow-sm border-b border-orange-600 text-orange-100">Untuk Bulan</th>
                    <th className="p-4 font-semibold text-center w-40 sticky top-0 bg-orange-500 z-10 shadow-sm border-b border-orange-600 text-yellow-200">Jam Ditambah</th>
                    <th className="p-4 font-semibold text-center w-48 sticky top-0 bg-orange-500 z-10 shadow-sm border-b border-orange-600">Waktu Direkodkan</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-orange-500 z-10 shadow-sm border-b border-orange-600">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-50">
                  {currentItems.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-orange-600 font-medium">Tiada rekod penambahan dijumpai.</td></tr>
                  ) : (
                    currentItems.map((rekod, index) => (
                      <tr key={rekod.id} className="hover:bg-orange-50/50 transition group">
                        <td className="p-4 text-center text-orange-600 font-medium">{indexOfFirstItem + index + 1}</td>
                        <td className="p-4">
                          <p className="font-bold text-orange-900 uppercase">{rekod.pegawai?.nama || 'Tiada Rekod'}</p>
                          <p className="text-xs text-orange-600 mt-0.5">{rekod.pegawai?.jabatan_bahagian}</p>
                        </td>
                        <td className="p-4 text-center font-bold text-orange-800">
                          {namaBulan(rekod.bulan)} {rekod.tahun}
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-orange-100 text-orange-800 font-black px-3 py-1.5 rounded-lg border border-orange-200">
                            +{rekod.jumlah_jam} Jam
                          </span>
                        </td>
                        <td className="p-4 text-center text-orange-700 text-xs font-semibold">
                           {formatTarikhDicipta(rekod.created_at)}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handlePadam(rekod)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-md transition shadow-sm border border-red-100 opacity-100 md:opacity-0 group-hover:opacity-100"
                            title="Padam Rekod (Batal Penambahan)"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {!loading && sejarahDitapis.length > 0 && (
            <div className="p-4 bg-orange-50/50 border-t border-orange-100 flex items-center justify-between text-sm">
              <span className="text-orange-700 font-medium">Papar <span className="font-bold">{indexOfFirstItem + 1}</span> - <span className="font-bold">{Math.min(indexOfLastItem, sejarahDitapis.length)}</span> / <span className="font-bold">{sejarahDitapis.length}</span></span>
              <div className="flex space-x-2">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-orange-200 rounded-lg font-bold text-orange-800 disabled:opacity-50 transition shadow-sm">&larr; Prev</button>
                <div className="flex items-center px-4 font-bold text-orange-800">{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-orange-200 rounded-lg font-bold text-orange-800 disabled:opacity-50 transition shadow-sm">Next &rarr;</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL PUKAL GANTIAN (PORTAL) */}
      {isGantianModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[100] transition-opacity print-hide">
          <div className="bg-white shadow-2xl w-full w-[95%] max-w-5xl h-[90vh] flex flex-col rounded-2xl border border-orange-200 overflow-hidden transform scale-100 transition-transform">
            <div className="p-6 bg-orange-500 flex justify-between items-center text-white shadow-sm">
              <div>
                <h2 className="text-2xl font-bold tracking-wide">Data Entry Pukal: Cuti Gantian</h2>
                <p className="text-xs text-orange-100 mt-1">Sistem akan merekod sejarah jam gantian ke dalam pangkalan data</p>
              </div>
              <button onClick={() => setIsGantianModalOpen(false)} className="font-bold text-3xl hover:text-orange-200 transition outline-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-orange-50/30">
              <form id="bulkGantianForm" onSubmit={handleGantianSubmit} className="space-y-6">
                <div className="flex justify-between items-center mb-6 bg-white p-5 rounded-xl shadow-sm border border-orange-100">
                    <div className="flex space-x-4">
                      <div>
                        <label className="text-xs font-bold text-orange-800 uppercase block mb-1">Bulan</label>
                        <select className="border border-orange-200 p-2.5 rounded-lg font-bold text-orange-900 outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50" value={gantianBulanTahun.bulan} onChange={(e) => setGantianBulanTahun({...gantianBulanTahun, bulan: e.target.value})}><option value="01">Jan</option><option value="02">Feb</option><option value="03">Mac</option><option value="04">Apr</option><option value="05">Mei</option><option value="06">Jun</option><option value="07">Jul</option><option value="08">Ogo</option><option value="09">Sep</option><option value="10">Okt</option><option value="11">Nov</option><option value="12">Dis</option></select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-orange-800 uppercase block mb-1">Tahun</label>
                        <select className="border border-orange-200 p-2.5 rounded-lg font-bold text-orange-900 outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50" value={gantianBulanTahun.tahun} onChange={(e) => setGantianBulanTahun({...gantianBulanTahun, tahun: e.target.value})}><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option></select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-orange-800 uppercase block mb-1">Bil. Baris</label>
                      <select className="border border-orange-200 p-2.5 rounded-lg text-orange-700 bg-white font-bold outline-none focus:ring-2 focus:ring-orange-500" value={bilanganGantianEntry} onChange={(e) => setBilanganGantianEntry(parseInt(e.target.value))}>{[...Array(20)].map((_, i) => (<option key={i+1} value={i+1}>{i+1} Baris Entry</option>))}</select>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-orange-100/50 border-b border-orange-200"><tr className="text-orange-900"><th className="p-4 w-16 text-center font-bold">#</th><th className="p-4 font-bold">Nama Pegawai ({bahagianAkses})</th><th className="p-4 w-48 text-center font-bold">Jam Diperoleh</th></tr></thead>
                    <tbody className="divide-y divide-orange-50">
                      {gantianEntries.map((item, index) => (
                         <tr key={index} className="hover:bg-orange-50/50 transition">
                            <td className="p-4 text-center font-bold text-orange-500">{index + 1}</td>
                            <td className="p-4"><select className="w-full border border-orange-200 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-medium text-orange-900 bg-white" value={item.ic_pegawai} onChange={(e) => updateGantianEntry(index, 'ic_pegawai', e.target.value)}><option value="">Pilih Pegawai...</option>{pilihanPegawai.map(p => (<option key={p.ic} value={p.ic}>{p.nama} ({p.jabatan_bahagian})</option>))}</select></td>
                            <td className="p-4"><input type="number" step="0.5" className="w-full border border-orange-200 p-3 rounded-lg font-black text-center text-orange-700 bg-orange-50 outline-none focus:ring-2 focus:ring-orange-500" value={item.jumlah_jam} onChange={(e) => updateGantianEntry(index, 'jumlah_jam', e.target.value)} /></td>
                         </tr>
                      ))}
                    </tbody>
                </table>
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-orange-100 bg-white flex justify-end space-x-3 shadow-md">
              <button type="button" onClick={() => setIsGantianModalOpen(false)} className="px-6 py-2.5 border border-orange-200 rounded-lg text-orange-800 font-bold hover:bg-orange-50 transition">Batal</button>
              <button type="submit" form="bulkGantianForm" disabled={isSubmittingGantian} className="px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold shadow-md transition disabled:bg-orange-400">Simpan Pukal</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}