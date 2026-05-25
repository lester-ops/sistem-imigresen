"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function RekodCuti() {
  const [mounted, setMounted] = useState(false);
  const [senaraiCuti, setSenaraiCuti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [carian, setCarian] = useState("");
  const [filterBahagian, setFilterBahagian] = useState("");
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [pilihanPegawai, setPilihanPegawai] = useState<any[]>([]);
  const [tarikhCutiUmum, setTarikhCutiUmum] = useState<string[]>([]);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  const [bilanganEntry, setBilanganEntry] = useState(1);
  const janaBarisKosong = () => ({
    ic_pegawai: "", kategori_pegawai: "", jenis_cuti: "", klinik: "",
    tarikh_mula: "", tarikh_tamat: "", hari_off: "0", hari_dikira: 0, catatan: "",
  });
  const [entries, setEntries] = useState<any[]>(() => [janaBarisKosong()]);

  const formatTarikhMY = (tarikhDB: string) => {
    if (!tarikhDB) return "-";
    const parts = tarikhDB.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return tarikhDB; 
  };

  const dapatkanDataCuti = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cuti_transaksi")
        .select(`id, jenis_cuti, kategori_pegawai, tarikh_mula, tarikh_tamat, bilangan_hari, hari_off, klinik, tahun, catatan, ic_pegawai, pegawai ( nama, jabatan_bahagian )`)
        .order("tarikh_mula", { ascending: false });
      if (error) throw error;
      setSenaraiCuti(data || []);
    } catch (err: any) { setErrorMsg(err.message); } finally { setLoading(false); }
  }, []);

  const dapatkanPilihanPegawai = async () => {
    const { data } = await supabase.from("pegawai").select("ic, nama, jabatan_bahagian").order("nama");
    if (data) setPilihanPegawai(data);
  };

  const dapatkanCutiUmum = async () => {
    const { data } = await supabase.from("cuti_umum").select("tarikh");
    if (data) setTarikhCutiUmum(data.map(c => c.tarikh));
  };

  useEffect(() => { 
    setMounted(true); 
    dapatkanDataCuti(); dapatkanPilihanPegawai(); dapatkanCutiUmum(); 
  }, [dapatkanDataCuti]);
  
  useEffect(() => { setCurrentPage(1); }, [carian, filterBahagian, filterTahun]);

  const kiraBilanganHari = (mula: string, tamat: string, kategori: string, jenisCuti: string, hariOff: number) => {
    if (!mula || !tamat) return 0;
    const dMula = new Date(mula); const dTamat = new Date(tamat);
    dMula.setHours(0,0,0,0); dTamat.setHours(0,0,0,0);
    if (dMula > dTamat) return -1;
    let totalCalendarDays = 0, workingDays = 0, current = new Date(dMula);
    while (current <= dTamat) {
      totalCalendarDays++; const dayOfWeek = current.getDay(); const dateStr = current.toISOString().split('T')[0];
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !tarikhCutiUmum.includes(dateStr)) workingDays++;
      current.setDate(current.getDate() + 1);
    }
    if (jenisCuti === "Cuti Kelompok") return totalCalendarDays; 
    else if (kategori === "Sif") return Math.max(0, totalCalendarDays - (hariOff || 0)); 
    else return workingDays; 
  };

  const bukaModalEdit = (cuti: any) => {
    setEditFormData({
      id: cuti.id, ic_pegawai: cuti.ic_pegawai, nama_pegawai: cuti.pegawai?.nama,
      kategori_pegawai: cuti.kategori_pegawai || "Pejabat", jenis_cuti: cuti.jenis_cuti || "",
      original_jenis_cuti: cuti.jenis_cuti || "", original_bilangan_hari: cuti.bilangan_hari || 0,
      tahun: cuti.tahun, klinik: cuti.klinik || "", tarikh_mula: cuti.tarikh_mula || "",
      tarikh_tamat: cuti.tarikh_tamat || "", hari_off: cuti.hari_off?.toString() || "0",
      bilangan_hari: cuti.bilangan_hari || 0, catatan: cuti.catatan || "",
    }); setIsEditModalOpen(true);
  };

  useEffect(() => {
    if (editFormData && isEditModalOpen) {
      const hari = kiraBilanganHari(editFormData.tarikh_mula, editFormData.tarikh_tamat, editFormData.kategori_pegawai, editFormData.jenis_cuti, parseFloat(editFormData.hari_off) || 0);
      if (editFormData.bilangan_hari !== hari) setEditFormData((prev: any) => ({ ...prev, bilangan_hari: hari }));
    }
  }, [editFormData?.tarikh_mula, editFormData?.tarikh_tamat, editFormData?.kategori_pegawai, editFormData?.jenis_cuti, editFormData?.hari_off, isEditModalOpen]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
        if (editFormData.bilangan_hari < 0) { alert("Ralat Tarikh."); setIsSubmitting(false); return; }
        const semakMula = editFormData.tarikh_mula; const semakTamat = editFormData.tarikh_tamat;
        const { data: dbCuti } = await supabase.from("cuti_transaksi").select("id, jenis_cuti").eq("ic_pegawai", editFormData.ic_pegawai).lte("tarikh_mula", semakTamat).gte("tarikh_tamat", semakMula).neq("id", editFormData.id);
        if (dbCuti && dbCuti.length > 0) { alert(`PERTINDIHAN CUTI`); setIsSubmitting(false); return; }
        const { data: dbKursus } = await supabase.from("kursus_rekod").select("jenis_khusus, nama_kursus").eq("ic_pegawai", editFormData.ic_pegawai).lte("tarikh_mula", semakTamat).gte("tarikh_tamat", semakMula);
        if (dbKursus && dbKursus.length > 0) {
           const bertindih = dbKursus.find(k => !(k.jenis_khusus === "EPSA" || k.nama_kursus.toLowerCase().includes('epsa')));
           if (bertindih) { alert(`PERTINDIHAN KURSUS`); setIsSubmitting(false); return; }
        }
        const tahunCuti = new Date(editFormData.tarikh_mula).getFullYear();
        const { error } = await supabase.from("cuti_transaksi").update({
          kategori_pegawai: editFormData.kategori_pegawai, jenis_cuti: editFormData.jenis_cuti, klinik: editFormData.jenis_cuti === "Cuti Sakit" ? editFormData.klinik : null,
          tarikh_mula: editFormData.tarikh_mula, tarikh_tamat: editFormData.tarikh_tamat, hari_off: editFormData.kategori_pegawai === "Sif" ? (parseFloat(editFormData.hari_off) || 0) : 0,
          bilangan_hari: editFormData.bilangan_hari, tahun: tahunCuti, catatan: editFormData.catatan || null,
        }).eq("id", editFormData.id);
        if (error) throw error;
        let perubahanJam = 0;
        if (editFormData.original_jenis_cuti === "Cuti Gantian") perubahanJam += (editFormData.original_bilangan_hari * 9);
        if (editFormData.jenis_cuti === "Cuti Gantian") perubahanJam -= (editFormData.bilangan_hari * 9);
        if (perubahanJam !== 0) {
            const { data: bakiData } = await supabase.from("cuti_baki").select("id, baki_gantian_jam").eq("ic_pegawai", editFormData.ic_pegawai).eq("tahun", tahunCuti).single();
            if (bakiData) await supabase.from("cuti_baki").update({ baki_gantian_jam: (bakiData.baki_gantian_jam || 0) + perubahanJam }).eq("id", bakiData.id);
        }
        alert("Berjaya!"); setIsEditModalOpen(false); dapatkanDataCuti();
    } catch (err: any) { alert("Gagal: " + err.message); } finally { setIsSubmitting(false); }
  };

  const handlePadam = async (cuti: any) => {
    const sahkan = confirm(`Pastikan untuk memadam rekod cuti ini?`); if (!sahkan) return;
    try {
      setLoading(true); const { error } = await supabase.from("cuti_transaksi").delete().eq("id", cuti.id); if (error) throw error;
      if (cuti.jenis_cuti === "Cuti Gantian" && cuti.bilangan_hari > 0) {
         const { data: bakiData } = await supabase.from("cuti_baki").select("id, baki_gantian_jam").eq("ic_pegawai", cuti.ic_pegawai).eq("tahun", cuti.tahun).single();
         if (bakiData) await supabase.from("cuti_baki").update({ baki_gantian_jam: (bakiData.baki_gantian_jam || 0) + (cuti.bilangan_hari * 9) }).eq("id", bakiData.id);
      }
      alert("Berjaya dipadam!"); dapatkanDataCuti(); 
    } catch (err: any) { alert("Gagal: " + err.message); setLoading(false); }
  };

  const senaraiBahagianUnik = Array.from(new Set(pilihanPegawai.map((p) => p.jabatan_bahagian).filter(Boolean))).sort();

  const cutiDitapis = senaraiCuti.filter((cuti) => {
    const kataKunci = carian.toLowerCase();
    const padanCarian = (cuti.pegawai?.nama || "").toLowerCase().includes(kataKunci) || (cuti.ic_pegawai || "").includes(kataKunci) || (cuti.catatan || "").toLowerCase().includes(kataKunci);
    const padanBahagian = filterBahagian === "" || cuti.pegawai?.jabatan_bahagian === filterBahagian;
    const tahunRekod = cuti.tarikh_mula ? cuti.tarikh_mula.substring(0, 4) : "";
    const padanTahun = filterTahun === "" || tahunRekod === filterTahun;
    return padanCarian && padanBahagian && padanTahun;
  });

  const indexOfLastItem = currentPage * itemsPerPage; const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = cutiDitapis.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(cutiDitapis.length / itemsPerPage);

  useEffect(() => {
    const jumlahBaru = parseInt(bilanganEntry.toString()) || 1;
    setEntries((prev) => {
      const salinan = [...prev];
      if (jumlahBaru > salinan.length) { for (let i = salinan.length; i < jumlahBaru; i++) { salinan.push(janaBarisKosong()); } } else { salinan.length = jumlahBaru; }
      return salinan;
    });
  }, [bilanganEntry]);

  const updateEntry = (index: number, field: string, value: any) => {
    const salinan = [...entries]; salinan[index] = { ...salinan[index], [field]: value };
    if (field === 'kategori_pegawai' || field === 'jenis_cuti') {
        if (salinan[index].jenis_cuti !== "Cuti Sakit") salinan[index].klinik = "";
        if (salinan[index].kategori_pegawai !== "Sif" || salinan[index].jenis_cuti === "Cuti Kelompok") salinan[index].hari_off = "0";
    }
    const mula = salinan[index].tarikh_mula; const tamat = salinan[index].tarikh_tamat;
    if (mula && tamat && salinan[index].kategori_pegawai && salinan[index].jenis_cuti) {
      salinan[index].hari_dikira = kiraBilanganHari(mula, tamat, salinan[index].kategori_pegawai, salinan[index].jenis_cuti, parseFloat(salinan[index].hari_off) || 0);
    } else { salinan[index].hari_dikira = 0; }
    setEntries(salinan);
  };

  const resetBorang = () => { setBilanganEntry(1); setEntries([janaBarisKosong()]); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const validEntries = entries.filter(e => e.ic_pegawai !== "");
      if (validEntries.length === 0) { alert("Sila isi sekurang-kurangnya satu permohonan."); setIsSubmitting(false); return; }
      for (let i = 0; i < validEntries.length; i++) {
          if (validEntries[i].hari_dikira < 0) { alert(`RALAT TARIKH BARIS #${i+1}`); setIsSubmitting(false); return; }
          if (!validEntries[i].kategori_pegawai || !validEntries[i].jenis_cuti) { alert(`SILA LENGKAPKAN BARIS #${i+1}`); setIsSubmitting(false); return; }
        for (let j = i + 1; j < validEntries.length; j++) {
          if (validEntries[i].ic_pegawai === validEntries[j].ic_pegawai && validEntries[i].tarikh_mula <= validEntries[j].tarikh_tamat && validEntries[i].tarikh_tamat >= validEntries[j].tarikh_mula) {
             alert(`PERTINDIHAN DATA PUKAL (Baris #${i+1} & #${j+1})`); setIsSubmitting(false); return;
          }
        }
      }
      for (let i = 0; i < validEntries.length; i++) {
        const item = validEntries[i];
        const { data: dbCuti } = await supabase.from("cuti_transaksi").select("jenis_cuti").eq("ic_pegawai", item.ic_pegawai).lte("tarikh_mula", item.tarikh_tamat).gte("tarikh_tamat", item.tarikh_mula);
        if (dbCuti && dbCuti.length > 0) { alert(`PERTINDIHAN DB (Baris #${i+1})`); setIsSubmitting(false); return; }
      }
      const today = new Date(); const tahunSekarang = today.getFullYear(); const bulan = String(today.getMonth() + 1).padStart(2, '0');
      const dataUntukDiSimpan = validEntries.map((item) => {
        const customId = `${tahunSekarang}/${bulan}_${Math.floor(Math.random() * 90000) + 10000}`;
        return {
          id: customId, ic_pegawai: item.ic_pegawai, kategori_pegawai: item.kategori_pegawai, jenis_cuti: item.jenis_cuti, klinik: item.klinik || null,
          tarikh_mula: item.tarikh_mula, tarikh_tamat: item.tarikh_tamat, hari_off: parseFloat(item.hari_off) || 0, bilangan_hari: item.hari_dikira,
          tahun: new Date(item.tarikh_mula).getFullYear(), catatan: item.catatan || null,
        };
      });
      const { error } = await supabase.from("cuti_transaksi").insert(dataUntukDiSimpan); if (error) throw error;
      for (const item of dataUntukDiSimpan) {
        if (item.jenis_cuti === "Cuti Gantian" && item.bilangan_hari > 0) {
            const { data: bakiData } = await supabase.from("cuti_baki").select("id, baki_gantian_jam").eq("ic_pegawai", item.ic_pegawai).eq("tahun", item.tahun).single();
            if (bakiData) await supabase.from("cuti_baki").update({ baki_gantian_jam: (bakiData.baki_gantian_jam || 0) - (item.bilangan_hari * 9) }).eq("id", bakiData.id);
        }
      }
      alert(`Berjaya disimpan!`); setIsModalOpen(false); resetBorang(); dapatkanDataCuti(); 
    } catch (err: any) { alert("Gagal: " + err.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-8 relative print:p-0">
      <div className="max-w-7xl mx-auto print-hide">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-emerald-900">Senarai Rekod Cuti</h1>
            <p className="text-emerald-700 text-sm mt-1 font-medium">Sistem Pengurusan & Pengiraan Cuti Berjadual</p>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
            <Link href="/admin/cuti/gantian" className="bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300 px-4 py-2.5 rounded-lg shadow-sm transition flex items-center font-bold text-sm tracking-wide">
              <span className="mr-2">📋</span> Rekod Cuti Gantian
            </Link>
            <button onClick={() => { resetBorang(); setIsModalOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm tracking-wide">
              <span className="mr-2">+</span> Permohonan Cuti
            </button>
          </div>
        </div>

        {errorMsg && <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4 font-bold border-l-4 border-red-500 text-sm">Ralat: {errorMsg}</div>}

        <div className="mb-6 bg-white/90 backdrop-blur p-4 rounded-xl shadow-sm border border-emerald-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center space-x-3 md:w-1/4">
            <div className="bg-teal-100 text-teal-700 p-2 rounded-lg">🏖️</div>
            <span className="font-bold text-emerald-900 text-sm">Tapisan Rekod</span>
          </div>
          <div className="w-full md:w-1/4">
            <select className="w-full border-emerald-200 bg-emerald-50/50 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-emerald-900" value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}>
              <option value="">-- Semua Tahun --</option><option value="2024">Tahun 2024</option><option value="2025">Tahun 2025</option><option value="2026">Tahun 2026</option>
            </select>
          </div>
          <div className="w-full md:w-1/3">
            <select className="w-full border-emerald-200 bg-emerald-50/50 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-emerald-900" value={filterBahagian} onChange={(e) => setFilterBahagian(e.target.value)}>
              <option value="">-- Semua Bahagian --</option>
              {senaraiBahagianUnik.map((bahagian, i) => (<option key={i} value={bahagian as string}>{bahagian as string}</option>))}
            </select>
          </div>
          <div className="flex items-center flex-1 bg-emerald-50/50 rounded-lg border border-emerald-200 px-4 py-2.5 w-full focus-within:ring-2 focus-within:ring-teal-500">
            <span className="text-teal-600 mr-2">🔍</span><input type="text" placeholder="Cari Nama / KP..." className="w-full outline-none text-emerald-900 font-medium bg-transparent text-sm placeholder-emerald-400" value={carian} onChange={(e) => setCarian(e.target.value)} />
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-xl shadow-md border border-emerald-100 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] relative">
            {loading ? (
              <div className="p-12 text-center text-emerald-700 animate-pulse font-bold">Sedang memuat turun data rekod...</div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-emerald-800 text-white border-b border-emerald-900">
                    <th className="p-4 font-semibold text-center w-12 sticky top-0 bg-emerald-800 z-10">Bil.</th>
                    <th className="p-4 font-semibold sticky top-0 bg-emerald-800 z-10">Nama Pegawai</th>
                    <th className="p-4 font-semibold text-center w-20 sticky top-0 bg-emerald-800 z-10">Kategori</th>
                    <th className="p-4 font-semibold sticky top-0 bg-emerald-800 z-10">Jenis Cuti</th>
                    <th className="p-4 font-semibold sticky top-0 bg-emerald-800 z-10">Tarikh Mula - Tamat</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-emerald-800 z-10">Hari Off</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-emerald-800 z-10">Hari Cuti</th>
                    <th className="p-4 font-semibold sticky top-0 bg-emerald-800 z-10">Catatan</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-emerald-800 z-10">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {currentItems.length === 0 ? (<tr><td colSpan={9} className="p-8 text-center text-emerald-700 font-medium">Tiada rekod.</td></tr>) : (
                    currentItems.map((cuti, index) => (
                      <tr key={cuti.id} className="hover:bg-emerald-50/50 transition duration-150 group">
                        <td className="p-4 text-emerald-600 text-center font-medium">{indexOfFirstItem + index + 1}</td>
                        <td className="p-4"><div className="font-bold text-emerald-900">{cuti.pegawai?.nama || 'Tiada Rekod'}</div><div className="text-xs text-emerald-600 mt-0.5">{cuti.pegawai?.jabatan_bahagian || '-'}</div></td>
                        <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${cuti.kategori_pegawai === 'Sif' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>{cuti.kategori_pegawai || 'Pejabat'}</span></td>
                        <td className="p-4"><span className="font-semibold text-emerald-900">{cuti.jenis_cuti}</span>{cuti.klinik && <span className="ml-2 text-xs bg-emerald-50 border border-emerald-100 px-2 rounded text-emerald-700">{cuti.klinik}</span>}</td>
                        <td className="p-4 text-emerald-800 font-medium">
                            {cuti.tarikh_mula === cuti.tarikh_tamat ? formatTarikhMY(cuti.tarikh_mula) : `${formatTarikhMY(cuti.tarikh_mula)} hingga ${formatTarikhMY(cuti.tarikh_tamat)}`}
                        </td>
                        <td className="p-4 text-center text-emerald-700 font-semibold">{cuti.hari_off || '0'}</td>
                        <td className="p-4 font-bold text-center text-teal-600 text-lg">{cuti.bilangan_hari}</td>
                        <td className="p-4 text-emerald-700 max-w-[150px] truncate">{cuti.catatan || '-'}</td>
                        <td className="p-4 text-center flex justify-center space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => bukaModalEdit(cuti)} className="bg-teal-50 hover:bg-teal-100 text-teal-700 p-2 rounded-md transition shadow-sm border border-teal-200">✏️</button>
                          <button onClick={() => handlePadam(cuti)} className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-md transition shadow-sm border border-red-100">🗑️</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {!loading && cutiDitapis.length > 0 && (
            <div className="p-4 bg-emerald-50/50 flex items-center justify-between text-sm border-t border-emerald-100">
              <span className="text-emerald-700 font-medium">Papar <span className="font-bold text-emerald-900">{indexOfFirstItem + 1}</span> - <span className="font-bold text-emerald-900">{Math.min(indexOfLastItem, cutiDitapis.length)}</span> / <span className="font-bold text-emerald-900">{cutiDitapis.length}</span></span>
              <div className="flex space-x-2">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 border border-emerald-200 rounded-lg bg-white text-emerald-800 disabled:opacity-50 font-bold transition shadow-sm">&larr; Prev</button>
                <div className="flex items-center px-4 font-bold text-teal-700">{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 border border-emerald-200 rounded-lg bg-white text-emerald-800 disabled:opacity-50 font-bold transition shadow-sm">Next &rarr;</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL PUKAL CUTI (PORTAL) */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[100] transition-opacity print-hide">
          <div className="bg-white shadow-2xl w-full w-[95%] max-w-7xl h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-emerald-100 transform transition-transform scale-100">
            <div className="p-6 bg-emerald-800 text-white flex justify-between items-center shadow-sm">
              <div>
                <h2 className="text-2xl font-bold tracking-wide">Permohonan Cuti Pukal</h2>
                <p className="text-xs text-emerald-200 mt-1">Konfigurasi cuti berkelompok atau berasingan serentak</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-emerald-300 hover:text-red-400 font-bold text-3xl leading-none transition outline-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-emerald-50/50">
              <form id="batchCutiForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-between items-center mb-4 bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
                  <div><h3 className="font-bold text-emerald-900">KONFIGURASI PUKAL</h3><p className="text-xs text-emerald-600">Pilih bilangan baris entry</p></div>
                  <select className="border border-emerald-200 p-2 rounded-lg focus:ring-2 focus:ring-teal-500 font-bold text-teal-700 bg-emerald-50 outline-none" value={bilanganEntry} onChange={(e) => setBilanganEntry(parseInt(e.target.value))}>{[...Array(20)].map((_, i) => (<option key={i+1} value={i+1}>{i+1} Baris Entry</option>))}</select>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                    <thead className="bg-emerald-700 text-white"><tr><th className="p-3 text-center">#</th><th className="p-3 w-64">PEGAWAI</th><th className="p-3">KATEGORI</th><th className="p-3">JENIS CUTI</th><th className="p-3">KLINIK</th><th className="p-3">MULA</th><th className="p-3">TAMAT</th><th className="p-3">OFF</th><th className="p-3 text-center bg-teal-500/20">HARI</th><th className="p-3">CATATAN</th></tr></thead>
                    <tbody className="divide-y divide-emerald-50">
                        {entries.map((item, index) => {
                            const isSakit = item.jenis_cuti === "Cuti Sakit", isSif = item.kategori_pegawai === "Sif", canEditOff = isSif && item.jenis_cuti !== "Cuti Kelompok";
                            return (
                            <tr key={index} className="hover:bg-emerald-50/50 transition">
                                <td className="p-2 text-center font-bold text-emerald-600">{index + 1}</td>
                                <td className="p-2"><select className="border border-emerald-200 p-2.5 w-full rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-medium bg-white" value={item.ic_pegawai} onChange={(e) => updateEntry(index, 'ic_pegawai', e.target.value)}><option value="">Pilih...</option>{pilihanPegawai.map(p => (<option key={p.ic} value={p.ic}>{p.nama}</option>))}</select></td>
                                <td className="p-2"><select disabled={!item.ic_pegawai} className="border border-emerald-200 p-2.5 w-full rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100 font-semibold text-emerald-900 bg-white" value={item.kategori_pegawai} onChange={(e) => updateEntry(index, 'kategori_pegawai', e.target.value)}><option value="">Pilih</option><option value="Pejabat">Pejabat</option><option value="Sif">Sif</option></select></td>
                                <td className="p-2"><select disabled={!item.ic_pegawai} className="border border-emerald-200 p-2.5 w-full rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100 font-semibold text-emerald-900 bg-white" value={item.jenis_cuti} onChange={(e) => updateEntry(index, 'jenis_cuti', e.target.value)}><option value="">Pilih</option><option value="Cuti Rehat">Cuti Rehat</option><option value="Cuti Sakit">Cuti Sakit</option><option value="Cuti Kelompok">Cuti Kelompok</option><option value="Cuti Gantian">Cuti Gantian</option><option value="Cuti Bersalin">Cuti Bersalin</option><option value="Cuti Tanpa Rekod">Cuti Tanpa Rekod</option></select></td>
                                <td className="p-2"><select disabled={!isSakit} className={`border border-emerald-200 p-2.5 w-full rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${!isSakit ? 'bg-gray-100 text-gray-400' : 'bg-white font-medium text-emerald-900'}`} value={item.klinik} onChange={(e) => updateEntry(index, 'klinik', e.target.value)}><option value="">-</option><option value="Kerajaan">Kerajaan</option><option value="Swasta">Swasta</option></select></td>
                                <td className="p-2"><input type="date" disabled={!item.ic_pegawai} className="border border-emerald-200 p-2.5 w-full rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100 font-medium text-emerald-900 bg-white" value={item.tarikh_mula} onChange={(e) => updateEntry(index, 'tarikh_mula', e.target.value)} /></td>
                                <td className="p-2"><input type="date" disabled={!item.ic_pegawai} className="border border-emerald-200 p-2.5 w-full rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100 font-medium text-emerald-900 bg-white" value={item.tarikh_tamat} onChange={(e) => updateEntry(index, 'tarikh_tamat', e.target.value)} /></td>
                                <td className="p-2"><input type="number" disabled={!canEditOff} className={`border border-emerald-200 p-2.5 w-16 text-center rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${!canEditOff ? 'bg-gray-100 text-gray-400' : 'bg-white font-bold text-emerald-900'}`} value={item.hari_off} onChange={(e) => updateEntry(index, 'hari_off', e.target.value)} /></td>
                                <td className="p-2 text-center font-black text-teal-600 bg-teal-50/50">{item.hari_dikira}</td>
                                <td className="p-2"><input type="text" disabled={!item.ic_pegawai} className="border border-emerald-200 p-2.5 w-full rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100 bg-white" value={item.catatan} onChange={(e) => updateEntry(index, 'catatan', e.target.value)} /></td>
                            </tr>
                            )
                        })}
                    </tbody>
                </table>
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-emerald-100 bg-white flex justify-end space-x-3 shadow-md"><button type="button" onClick={resetBorang} className="px-6 py-2.5 border border-emerald-200 text-emerald-800 font-bold rounded-lg hover:bg-emerald-50 transition">Reset Borang</button><button type="submit" form="batchCutiForm" disabled={isSubmitting} className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md transition disabled:bg-teal-400">Hantar Pukal</button></div>
          </div>
        </div>, document.body
      )}

      {/* POPUP EDIT SINGLE (PORTAL) */}
      {isEditModalOpen && editFormData && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[100] transition-opacity print-hide">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-emerald-100">
            <div className="p-6 border-b border-emerald-100 flex justify-between items-center bg-white shadow-sm"><h2 className="text-xl font-bold text-emerald-900 tracking-wide">Kemas Kini Cuti</h2><button onClick={() => { setIsEditModalOpen(false); setEditFormData(null); }} className="text-emerald-500 hover:text-red-500 font-bold text-2xl transition outline-none">&times;</button></div>
            <div className="flex-1 p-6 space-y-5 bg-emerald-50/50">
              <form id="editCutiForm" onSubmit={handleEditSubmit}>
                <div className="mb-4"><label className="block text-xs font-bold text-emerald-800 mb-1 uppercase">Pegawai</label><div className="font-bold text-sm bg-gray-100 p-2.5 rounded-lg border border-gray-200 text-gray-700">{editFormData.nama_pegawai}</div></div>
                <div className="grid grid-cols-2 gap-5 mb-4">
                  <div><label className="text-xs font-bold text-emerald-800 mb-1 uppercase block">Kategori</label><select className="w-full border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white font-bold text-emerald-900 text-sm" value={editFormData.kategori_pegawai} onChange={e => setEditFormData({...editFormData, kategori_pegawai: e.target.value})}><option value="Pejabat">Pejabat</option><option value="Sif">Sif</option></select></div>
                  <div><label className="text-xs font-bold text-emerald-800 mb-1 uppercase block">Jenis Cuti</label><select className="w-full border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white font-bold text-emerald-900 text-sm" value={editFormData.jenis_cuti} onChange={e => setEditFormData({...editFormData, jenis_cuti: e.target.value})}><option value="Cuti Rehat">Cuti Rehat</option><option value="Cuti Sakit">Cuti Sakit</option><option value="Cuti Kelompok">Cuti Kelompok</option><option value="Cuti Gantian">Cuti Gantian</option><option value="Cuti Bersalin">Cuti Bersalin</option><option value="Cuti Tanpa Rekod">Cuti Tanpa Rekod</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-5 mb-4">
                  <div><label className="text-xs font-bold text-emerald-800 mb-1 uppercase block">Tarikh Mula</label><input type="date" className="w-full border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white text-sm font-medium" value={editFormData.tarikh_mula} onChange={e => setEditFormData({...editFormData, tarikh_mula: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-emerald-800 mb-1 uppercase block">Tarikh Tamat</label><input type="date" className="w-full border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white text-sm font-medium" value={editFormData.tarikh_tamat} onChange={e => setEditFormData({...editFormData, tarikh_tamat: e.target.value})}/></div>
                </div>
                <div className="grid grid-cols-3 gap-5 mb-4">
                  <div><label className="text-xs font-bold text-emerald-800 mb-1 uppercase block">Hari Off</label><input type="number" step="0.5" disabled={editFormData.kategori_pegawai !== "Sif" || editFormData.jenis_cuti === "Cuti Kelompok"} className="w-full border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white text-sm font-bold disabled:bg-gray-100 disabled:text-gray-400" value={editFormData.hari_off} onChange={e => setEditFormData({...editFormData, hari_off: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-emerald-800 mb-1 uppercase block">Bil. Hari</label><input type="number" step="0.5" className="w-full border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-teal-700 font-bold bg-teal-50 text-sm" value={editFormData.bilangan_hari} onChange={e => setEditFormData({...editFormData, bilangan_hari: parseFloat(e.target.value)||0})}/></div>
                  <div><label className="text-xs font-bold text-emerald-800 mb-1 uppercase block">Klinik</label><select disabled={editFormData.jenis_cuti !== "Cuti Sakit"} className="w-full border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400" value={editFormData.klinik} onChange={e => setEditFormData({...editFormData, klinik: e.target.value})}><option value="">-</option><option value="Kerajaan">Kerajaan</option><option value="Swasta">Swasta</option></select></div>
                </div>
                <div><label className="text-xs font-bold text-emerald-800 mb-1 uppercase block">Catatan</label><input type="text" className="w-full border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white text-sm" value={editFormData.catatan} onChange={e => setEditFormData({...editFormData, catatan: e.target.value})}/></div>
              </form>
            </div>
            <div className="p-5 border-t border-emerald-100 bg-white flex justify-end space-x-3 shadow-md"><button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 border border-emerald-200 rounded-lg text-emerald-800 font-bold hover:bg-emerald-50 transition text-sm">Batal</button><button type="submit" form="editCutiForm" disabled={isSubmitting} className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md transition disabled:bg-teal-400 text-sm">Kemas Kini</button></div>
          </div>
        </div>, document.body
      )}

    </div>
  );
}