"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";

export default function RekodKursusBahagian() {
  const [mounted, setMounted] = useState(false);
  const [sessionRole, setSessionRole] = useState("");
  const [sessionBahagian, setSessionBahagian] = useState("");
  const [isClient, setIsClient] = useState(false); 

  useEffect(() => {
    const role = localStorage.getItem("userRole") || "";
    const bahagian = localStorage.getItem("bahagianAkses") || "";
    setSessionRole(role); 
    setSessionBahagian(bahagian); 
    setIsClient(true);
    setMounted(true); // Persediaan untuk React Portal
  }, []);

  const [senaraiKursus, setSenaraiKursus] = useState<any[]>([]);
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
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  const [bilanganEntry, setBilanganEntry] = useState(1);
  const janaBarisKosong = () => ({
    ic_pegawai: "", kategori_utama: "", jenis_khusus: "", nama_kursus: "",
    penganjur: "", tempat: "", tarikh_mula: "", tarikh_tamat: "", jumlah_jam: "", kategori_epsa: "",
  });
  const [entries, setEntries] = useState<any[]>([janaBarisKosong()]);

  // Fungsi utiliti format tarikh (DD/MM/YYYY)
  const formatTarikhMY = (tarikhDB: string) => {
    if (!tarikhDB) return "-";
    const parts = tarikhDB.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return tarikhDB;
  };

  const dapatkanDataKursus = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("kursus_rekod")
        .select(`id, nama_kursus, kategori_utama, jenis_khusus, tarikh_mula, tarikh_tamat, jumlah_jam, ic_pegawai, pegawai ( nama, jabatan_bahagian )`)
        .order("tarikh_mula", { ascending: false });
      if (error) throw error;
      setSenaraiKursus(data || []);
    } catch (err: any) { setErrorMsg(err.message); } finally { setLoading(false); }
  }, []);

  const dapatkanPilihanPegawai = async () => {
    const { data } = await supabase.from("pegawai").select("ic, nama, jabatan_bahagian").order("nama");
    if (data) setPilihanPegawai(data);
  };

  useEffect(() => { 
    dapatkanDataKursus(); 
    dapatkanPilihanPegawai(); 
  }, [dapatkanDataKursus]);
  
  useEffect(() => { setCurrentPage(1); }, [carian, filterBahagian, filterTahun]);

  const senaraiBahagianUnik = Array.from(new Set(pilihanPegawai.map((p) => p.jabatan_bahagian).filter(Boolean))).sort();

  const kursusDitapis = senaraiKursus.filter((kursus) => {
    const kataKunci = carian.toLowerCase();
    const padanCarian = (kursus.pegawai?.nama || "").toLowerCase().includes(kataKunci) || (kursus.nama_kursus || "").toLowerCase().includes(kataKunci) || (kursus.ic_pegawai || "").includes(kataKunci);
    const padanBahagian = filterBahagian === "" || kursus.pegawai?.jabatan_bahagian === filterBahagian;
    const tahunRekod = kursus.tarikh_mula ? kursus.tarikh_mula.substring(0, 4) : "";
    const padanTahun = filterTahun === "" || tahunRekod === filterTahun;
    return padanCarian && padanBahagian && padanTahun;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = kursusDitapis.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(kursusDitapis.length / itemsPerPage);

  const pilihanPegawaiUnitSahaja = pilihanPegawai.filter(p => p.jabatan_bahagian === sessionBahagian);

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
    if (field === 'kategori_utama') salinan[index].jenis_khusus = ""; 
    
    if (salinan[index].kategori_utama === "1. Kursus / Latihan") {
      const mula = salinan[index].tarikh_mula; const tamat = salinan[index].tarikh_tamat;
      if (mula && tamat) {
        const dMula = new Date(mula); const dTamat = new Date(tamat);
        if (dTamat >= dMula) { const days = Math.round((dTamat.getTime() - dMula.getTime()) / (1000 * 3600 * 24)) + 1; salinan[index].jumlah_jam = (days * 6).toString(); } else { salinan[index].jumlah_jam = "0"; }
      }
    }
    setEntries(salinan);
  };

  const resetBorangPukal = () => { setBilanganEntry(1); setEntries([janaBarisKosong()]); }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const validEntries = entries.filter(e => e.ic_pegawai !== "");
      if (validEntries.length === 0) { alert("Sila isi sekurang-kurangnya satu rekod."); setIsSubmitting(false); return; }

      for (let i = 0; i < validEntries.length; i++) {
          if (!validEntries[i].kategori_utama) { alert(`Sila pilih Kategori Utama untuk Baris #${i+1}`); setIsSubmitting(false); return; }
          if ((validEntries[i].kategori_utama === "2. Sesi Pembelajaran" || validEntries[i].kategori_utama === "3. Pembelajaran Kendiri") && !validEntries[i].jenis_khusus) {
            alert(`Sila pilih Jenis Khusus untuk Baris #${i+1}`); setIsSubmitting(false); return;
          }
      }

      for (let i = 0; i < validEntries.length; i++) {
        for (let j = i + 1; j < validEntries.length; j++) {
          if (validEntries[i].ic_pegawai === validEntries[j].ic_pegawai && validEntries[i].tarikh_mula <= validEntries[j].tarikh_tamat && validEntries[i].tarikh_tamat >= validEntries[j].tarikh_mula) {
             alert(`RALAT DATA PUKAL!\n\nPegawai bertindih tarikh (Entry #${i+1} & #${j+1}).`); setIsSubmitting(false); return;
          }
        }
      }

      for (let i = 0; i < validEntries.length; i++) {
        const item = validEntries[i];
        const semakMula = item.tarikh_mula || item.tarikh_tamat; const semakTamat = item.tarikh_tamat || item.tarikh_mula;
        const isBorangEPSA = (item.jenis_khusus === "EPSA") || (item.nama_kursus.toLowerCase().includes('epsa'));

        const { data: dbKursus } = await supabase.from("kursus_rekod").select("nama_kursus, jenis_khusus").eq("ic_pegawai", item.ic_pegawai).lte("tarikh_mula", semakTamat).gte("tarikh_tamat", semakMula);
        if (dbKursus && dbKursus.length > 0) {
          const bertindih = dbKursus.find(k => !((k.jenis_khusus === "EPSA" || k.nama_kursus.toLowerCase().includes('epsa')) || isBorangEPSA));
          if (bertindih) { alert(`PERTINDIHAN KURSUS (Entry #${i+1})\n\nSudah ada kursus:\n${bertindih.nama_kursus}`); setIsSubmitting(false); return; }
        }

        const { data: dbCuti } = await supabase.from("cuti_transaksi").select("jenis_cuti").eq("ic_pegawai", item.ic_pegawai).lte("tarikh_mula", semakTamat).gte("tarikh_tamat", semakMula);
        if (dbCuti && dbCuti.length > 0) { alert(`PERTINDIHAN CUTI (Entry #${i+1})\n\nSedang bercuti:\n${dbCuti[0].jenis_cuti}`); setIsSubmitting(false); return; }
      }

      const dataUntukDiSimpan = validEntries.map((item) => {
        const finalTarikhMula = item.tarikh_mula || item.tarikh_tamat; const finalTarikhTamat = item.tarikh_tamat || item.tarikh_mula;
        const finalNama = item.kategori_utama === "3. Pembelajaran Kendiri" && item.jenis_khusus === "AI Untuk Rakyat" ? "AI Untuk Rakyat" : item.nama_kursus;
        return {
          ic_pegawai: item.ic_pegawai, kategori_utama: item.kategori_utama, jenis_khusus: item.jenis_khusus,
          nama_kursus: finalNama, penganjur: item.penganjur || null, tempat: item.tempat || null,
          kategori_epsa: item.kategori_epsa || null, tarikh_mula: finalTarikhMula, tarikh_tamat: finalTarikhTamat,
          jumlah_jam: item.jumlah_jam ? parseFloat(item.jumlah_jam) : null,
        };
      });

      const { error } = await supabase.from("kursus_rekod").insert(dataUntukDiSimpan); if (error) throw error;
      alert(`Berjaya! ${dataUntukDiSimpan.length} rekod telah disimpan.`); setIsModalOpen(false); resetBorangPukal(); dapatkanDataKursus(); 
    } catch (err: any) { alert("Gagal mendaftar kursus: " + err.message); } finally { setIsSubmitting(false); }
  };

  const bukaModalEdit = (kursus: any) => {
    if (kursus.pegawai?.jabatan_bahagian !== sessionBahagian) {
        alert(`Akses Ditolak: Anda hanya boleh mengemas kini rekod pegawai di bawah unit ${sessionBahagian} sahaja.`); return;
    }
    setEditFormData({
      id: kursus.id, ic_pegawai: kursus.ic_pegawai,
      kategori_utama: kursus.kategori_utama || "", jenis_khusus: kursus.jenis_khusus || "",
      nama_kursus: kursus.nama_kursus || "", penganjur: kursus.penganjur || "",
      tempat: kursus.tempat || "", tarikh_mula: kursus.tarikh_mula || "",
      tarikh_tamat: kursus.tarikh_tamat || "", jumlah_jam: kursus.jumlah_jam?.toString() || "",
      kategori_epsa: kursus.kategori_epsa || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditDateChange = (field: string, value: string) => {
    setEditFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      if (updated.kategori_utama === "1. Kursus / Latihan" && updated.tarikh_mula && updated.tarikh_tamat) {
        const dMula = new Date(updated.tarikh_mula); const dTamat = new Date(updated.tarikh_tamat);
        if (dTamat >= dMula) { const days = Math.round((dTamat.getTime() - dMula.getTime()) / (1000 * 3600 * 24)) + 1; updated.jumlah_jam = (days * 6).toString(); } else { updated.jumlah_jam = "0"; }
      }
      return updated;
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
        const finalTarikhMula = editFormData.tarikh_mula || editFormData.tarikh_tamat; const finalTarikhTamat = editFormData.tarikh_tamat || editFormData.tarikh_mula;
        const finalNama = editFormData.kategori_utama === "3. Pembelajaran Kendiri" && editFormData.jenis_khusus === "AI Untuk Rakyat" ? "AI Untuk Rakyat" : editFormData.nama_kursus;
        const isBorangEPSA = (editFormData.jenis_khusus === "EPSA") || (finalNama.toLowerCase().includes('epsa'));
        
        const { data: dbKursus } = await supabase.from("kursus_rekod").select("id, nama_kursus, jenis_khusus").eq("ic_pegawai", editFormData.ic_pegawai).lte("tarikh_mula", finalTarikhTamat).gte("tarikh_tamat", finalTarikhMula).neq("id", editFormData.id);
        if (dbKursus && dbKursus.length > 0) {
          const bertindih = dbKursus.find(k => { const isDBEpsa = (k.jenis_khusus === "EPSA") || (k.nama_kursus.toLowerCase().includes('epsa')); return !(isBorangEPSA || isDBEpsa); });
          if (bertindih) { alert(`PERTINDIHAN KURSUS\n\nPegawai ini sudah ada kursus lain.`); setIsSubmitting(false); return; }
        }

        const { data: dbCuti } = await supabase.from("cuti_transaksi").select("jenis_cuti").eq("ic_pegawai", editFormData.ic_pegawai).lte("tarikh_mula", finalTarikhTamat).gte("tarikh_tamat", finalTarikhMula);
        if (dbCuti && dbCuti.length > 0) { alert(`PERTINDIHAN CUTI`); setIsSubmitting(false); return; }

        const dataUntukDiSimpan = {
          kategori_utama: editFormData.kategori_utama, jenis_khusus: editFormData.jenis_khusus, nama_kursus: finalNama, penganjur: editFormData.penganjur || null, tempat: editFormData.tempat || null,
          kategori_epsa: editFormData.kategori_epsa || null, tarikh_mula: finalTarikhMula, tarikh_tamat: finalTarikhTamat, jumlah_jam: editFormData.jumlah_jam ? parseFloat(editFormData.jumlah_jam) : null,
        };
        const { error } = await supabase.from("kursus_rekod").update(dataUntukDiSimpan).eq("id", editFormData.id);
        if (error) throw error; alert("Rekod kursus berjaya dikemas kini!"); setIsEditModalOpen(false); setEditFormData(null); dapatkanDataKursus();
    } catch (err: any) { alert("Gagal mengemas kini kursus: " + err.message); } finally { setIsSubmitting(false); }
  };

  const eksportKeCSV = () => {
    if (kursusDitapis.length === 0) { alert("Tiada data untuk dieksport."); return; }
    const headers = ["Bil", "Nama Pegawai", "Bahagian", "Kategori Utama", "Jenis Khusus", "Nama Kursus / Tajuk", "Tarikh Mula", "Tarikh Tamat", "Jumlah Jam"];
    const csvRows = [headers.join(",")]; 
    kursusDitapis.forEach((kursus, index) => {
      const baris = [index + 1, `"${kursus.pegawai?.nama || '-'}"`, `"${kursus.pegawai?.jabatan_bahagian || '-'}"`, `"${kursus.kategori_utama || '-'}"`, `"${kursus.jenis_khusus || '-'}"`, `"${kursus.nama_kursus || '-'}"`, `"${formatTarikhMY(kursus.tarikh_mula)}"`, `"${formatTarikhMY(kursus.tarikh_tamat)}"`, `"${kursus.jumlah_jam || '0'}"`];
      csvRows.push(baris.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" }); const link = document.createElement("a"); link.href = window.URL.createObjectURL(blob); link.setAttribute("download", `Laporan_Kursus_${filterTahun || 'Semua'}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const renderKriteria = (item: any, index: number) => {
    if (item.kategori_utama === "1. Kursus / Latihan") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Nama Kursus / Latihan</label><input type="text" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.nama_kursus} onChange={(e) => updateEntry(index, 'nama_kursus', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Penganjur</label><input type="text" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.penganjur} onChange={(e) => updateEntry(index, 'penganjur', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Tempat</label><input type="text" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.tempat} onChange={(e) => updateEntry(index, 'tempat', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Tarikh Mula</label><input type="date" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.tarikh_mula} onChange={(e) => updateEntry(index, 'tarikh_mula', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Tarikh Tamat</label><input type="date" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.tarikh_tamat} onChange={(e) => updateEntry(index, 'tarikh_tamat', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Jumlah Jam</label><input type="number" step="0.5" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-teal-50 text-sm font-bold text-teal-700 focus:ring-teal-500 outline-none" value={item.jumlah_jam} onChange={(e) => updateEntry(index, 'jumlah_jam', e.target.value)} /></div>
          </div>
        </div>
      );
    }
    if (item.kategori_utama === "2. Sesi Pembelajaran") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Tajuk Sesi</label><input type="text" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.nama_kursus} onChange={(e) => updateEntry(index, 'nama_kursus', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Penganjur</label><input type="text" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.penganjur} onChange={(e) => updateEntry(index, 'penganjur', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Tempat</label><input type="text" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.tempat} onChange={(e) => updateEntry(index, 'tempat', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Tarikh Sesi</label><input type="date" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.tarikh_mula} onChange={(e) => updateEntry(index, 'tarikh_mula', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Jumlah Jam</label><input type="number" step="0.5" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-teal-50 text-sm font-bold text-teal-700 focus:ring-teal-500 outline-none" value={item.jumlah_jam} onChange={(e) => updateEntry(index, 'jumlah_jam', e.target.value)} /></div>
          </div>
        </div>
      );
    }
    if (item.kategori_utama === "3. Pembelajaran Kendiri") {
      if (item.jenis_khusus === "AI Untuk Rakyat") {
        return (<div className="w-1/3"><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Tarikh Selesai</label><input type="date" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.tarikh_tamat} onChange={(e) => updateEntry(index, 'tarikh_tamat', e.target.value)} /></div>);
      }
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2"><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Tajuk / Bahan Bacaan</label><input type="text" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.nama_kursus} onChange={(e) => updateEntry(index, 'nama_kursus', e.target.value)} /></div>
            {item.jenis_khusus === "EPSA" && (<div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Kategori EPSA</label><input type="text" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.kategori_epsa} onChange={(e) => updateEntry(index, 'kategori_epsa', e.target.value)} /></div>)}
            {item.jenis_khusus !== "EPSA" && (<div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Tempat / Platform</label><input type="text" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.tempat} onChange={(e) => updateEntry(index, 'tempat', e.target.value)} /></div>)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {item.jenis_khusus === "Kursus Anjuran Luar Agensi" && (<div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Penganjur</label><input type="text" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.penganjur} onChange={(e) => updateEntry(index, 'penganjur', e.target.value)} /></div>)}
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Tarikh Selesai</label><input type="date" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-white text-sm focus:ring-teal-500 outline-none" value={item.tarikh_tamat} onChange={(e) => updateEntry(index, 'tarikh_tamat', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Jumlah Jam</label><input type="number" step="0.5" required className="w-full px-3 py-2 border border-teal-200 rounded-md bg-teal-50 text-sm font-bold text-teal-700 focus:ring-teal-500 outline-none" value={item.jumlah_jam} onChange={(e) => updateEntry(index, 'jumlah_jam', e.target.value)} /></div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-8 print:p-0 relative">
      <div className="max-w-7xl mx-auto print-hide">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <div><h1 className="text-3xl font-bold text-emerald-900">Senarai Kursus (Semua Jabatan)</h1>
            {isClient && sessionBahagian ? (<p className="text-teal-600 font-bold text-sm mt-1">Anda log masuk sebagai Admin: {sessionBahagian}</p>) : (<p className="text-gray-500 text-sm mt-1">Memuat turun data pengguna...</p>)}
          </div>
          <div className="flex space-x-3">
            <button onClick={eksportKeCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm tracking-wide"><span className="mr-2">📥</span> Eksport Excel</button>
            {isClient && sessionBahagian && (
                <button onClick={() => { resetBorangPukal(); setIsModalOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm tracking-wide"><span className="mr-2">+</span> Data Entry Unit</button>
            )}
          </div>
        </div>

        {errorMsg && <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4 font-bold border-l-4 border-red-500 text-sm">Ralat: {errorMsg}</div>}

        <div className="mb-6 bg-white/90 backdrop-blur p-4 rounded-xl shadow-sm border border-emerald-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center space-x-3 md:w-1/4"><div className="bg-teal-100 text-teal-700 p-2 rounded-lg">🎓</div><span className="font-bold text-emerald-900 text-sm">Tapisan Rekod</span></div>
          <div className="w-full md:w-1/4"><select className="w-full border-emerald-200 bg-emerald-50/50 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-emerald-900" value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}><option value="">-- Semua Tahun --</option><option value="2024">Tahun 2024</option><option value="2025">Tahun 2025</option><option value="2026">Tahun 2026</option></select></div>
          <div className="w-full md:w-1/3"><select className="w-full border-emerald-200 bg-emerald-50/50 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-emerald-900" value={filterBahagian} onChange={(e) => setFilterBahagian(e.target.value)}><option value="">-- Semua Bahagian --</option>{senaraiBahagianUnik.map((bahagian, i) => (<option key={i} value={bahagian as string}>{bahagian as string}</option>))}</select></div>
          <div className="flex items-center flex-1 bg-emerald-50/50 rounded-lg border border-emerald-200 px-4 py-2.5 w-full focus-within:ring-2 focus-within:ring-teal-500"><span className="text-teal-600 mr-2">🔍</span><input type="text" placeholder="Cari Nama / Kursus / KP..." className="w-full outline-none text-emerald-900 font-medium bg-transparent text-sm placeholder-emerald-400" value={carian} onChange={(e) => setCarian(e.target.value)} /></div>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-xl shadow-md border border-emerald-100 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] relative">
            {loading ? (
              <div className="p-12 text-center text-emerald-700 animate-pulse font-bold">Memuat turun data kursus...</div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-emerald-800 text-white border-b border-emerald-900">
                    <th className="p-4 font-semibold text-center w-12 sticky top-0 bg-emerald-800 z-10">Bil.</th>
                    <th className="p-4 font-semibold sticky top-0 bg-emerald-800 z-10">Nama Pegawai / Bahagian</th>
                    <th className="p-4 font-semibold w-40 sticky top-0 bg-emerald-800 z-10">Kategori / Jenis</th>
                    <th className="p-4 font-semibold sticky top-0 bg-emerald-800 z-10">Tajuk Kursus</th>
                    <th className="p-4 font-semibold w-40 sticky top-0 bg-emerald-800 z-10">Tarikh</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-emerald-800 z-10">Jam</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-emerald-800 z-10">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {currentItems.length === 0 ? (<tr><td colSpan={7} className="p-8 text-center text-emerald-700 font-medium">Tiada rekod dijumpai berdasarkan tapisan.</td></tr>) : (
                    currentItems.map((kursus, index) => {
                      const isLayakModify = isClient && sessionBahagian && kursus.pegawai?.jabatan_bahagian === sessionBahagian;
                      return (
                      <tr key={kursus.id} className="hover:bg-emerald-50/50 transition duration-150 group">
                        <td className="p-4 text-emerald-600 text-center font-medium">{indexOfFirstItem + index + 1}</td>
                        <td className="p-4"><p className="font-bold text-emerald-900 truncate max-w-xs">{kursus.pegawai?.nama || 'Tiada Rekod'}</p><p className="text-xs text-emerald-600 truncate max-w-xs mt-0.5">{kursus.pegawai?.jabatan_bahagian || '-'}</p></td>
                        <td className="p-4"><span className="bg-teal-50 text-teal-700 px-2 py-1 rounded font-bold text-xs border border-teal-200 shadow-sm">{kursus.kategori_utama || 'N/A'}</span>{kursus.jenis_khusus && <div className="text-[11px] text-emerald-600 mt-1.5 font-medium">{kursus.jenis_khusus}</div>}</td>
                        <td className="p-4 text-emerald-900 font-medium truncate max-w-sm" title={kursus.nama_kursus}>{kursus.nama_kursus}</td>
                        <td className="p-4 text-emerald-700 text-xs font-medium">{kursus.tarikh_mula === kursus.tarikh_tamat ? formatTarikhMY(kursus.tarikh_mula) : `${formatTarikhMY(kursus.tarikh_mula)} hingga ${formatTarikhMY(kursus.tarikh_tamat)}`}</td>
                        <td className="p-4 font-bold text-center text-teal-600 text-base">{kursus.jumlah_jam || '0'}</td>
                        <td className="p-4 text-center flex justify-center space-x-2">
                          {isLayakModify ? (
                            <button onClick={() => bukaModalEdit(kursus)} title="Edit Kursus" className="bg-teal-50 hover:bg-teal-100 text-teal-700 p-2 rounded-md transition shadow-sm border border-teal-200 opacity-100 md:opacity-0 group-hover:opacity-100">✏️ Edit</button>
                          ) : (
                            <span className="bg-gray-100 text-gray-400 border border-gray-200 text-[10px] font-bold px-2 py-1 rounded">Read-Only</span>
                          )}
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {!loading && kursusDitapis.length > 0 && (
            <div className="p-4 bg-emerald-50/50 flex items-center justify-between text-sm border-t border-emerald-100">
              <span className="text-emerald-700 font-medium">Papar <span className="font-bold text-emerald-900">{indexOfFirstItem + 1}</span> - <span className="font-bold text-emerald-900">{Math.min(indexOfLastItem, kursusDitapis.length)}</span> / <span className="font-bold text-emerald-900">{kursusDitapis.length}</span></span>
              <div className="flex space-x-2">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 border border-emerald-200 rounded-lg bg-white text-emerald-800 disabled:opacity-50 font-bold transition shadow-sm">&larr; Prev</button>
                <div className="flex items-center px-4 font-bold text-teal-700">{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 border border-emerald-200 rounded-lg bg-white text-emerald-800 disabled:opacity-50 font-bold transition shadow-sm">Next &rarr;</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DATA ENTRY PUKAL (PORTAL) */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[100] transition-opacity print-hide">
          <div className="bg-white shadow-2xl w-full w-[95%] max-w-7xl h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-emerald-100 transform transition-transform scale-100">
            <div className="p-6 border-b border-emerald-100 flex justify-between items-center bg-emerald-800 text-white shadow-sm">
              <div><h2 className="text-2xl font-bold tracking-wide">Data Entry Kursus Unit</h2><p className="text-xs text-emerald-200 mt-1">Satu paparan untuk memasukkan pelbagai kategori kursus. (Hanya untuk unit: {sessionBahagian})</p></div>
              <button onClick={() => setIsModalOpen(false)} className="text-emerald-300 hover:text-red-400 font-bold text-3xl leading-none outline-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-emerald-50/50">
              <form id="bulkForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3"><span className="text-xl">📚</span><div><h3 className="font-bold text-emerald-900">KONFIGURASI JUMLAH BARIS</h3><p className="text-xs text-emerald-600">Pilih bilangan rekod permohonan</p></div></div>
                  <div><select className="px-5 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-sm font-bold text-teal-700 outline-none" value={bilanganEntry} onChange={(e) => setBilanganEntry(parseInt(e.target.value))}>{[...Array(20)].map((_, i) => (<option key={i+1} value={i+1}>{i+1} Baris Entry</option>))}</select></div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                {entries.map((item, index) => (
                  <div key={index} className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm relative pt-8">
                    <div className="absolute -left-3 -top-3 bg-teal-600 text-white font-bold px-3 py-1 rounded-lg text-sm shadow-md">#{index + 1}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Nama Pegawai</label>
                        <select required className="w-full px-3 py-2 border border-emerald-200 rounded-md bg-emerald-50/50 focus:bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500" value={item.ic_pegawai} onChange={(e) => updateEntry(index, 'ic_pegawai', e.target.value)}><option value="">-- Pilih Pegawai --</option>{pilihanPegawaiUnitSahaja.map((p) => (<option key={p.ic} value={p.ic}>{p.nama}</option>))}</select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Kategori Utama</label>
                        <select required disabled={!item.ic_pegawai} className="w-full px-3 py-2 border border-emerald-200 rounded-md focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-gray-100 text-sm font-semibold text-emerald-900 outline-none" value={item.kategori_utama} onChange={(e) => updateEntry(index, 'kategori_utama', e.target.value)}><option value="">-- Kategori Utama --</option><option value="1. Kursus / Latihan">1. Kursus / Latihan</option><option value="2. Sesi Pembelajaran">2. Sesi Pembelajaran</option><option value="3. Pembelajaran Kendiri">3. Pembelajaran Kendiri</option></select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Jenis Khusus</label>
                        <select required={item.kategori_utama === "2. Sesi Pembelajaran" || item.kategori_utama === "3. Pembelajaran Kendiri"} disabled={item.kategori_utama === "1. Kursus / Latihan" || !item.kategori_utama} className="w-full px-3 py-2 border border-emerald-200 rounded-md focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-gray-100 text-sm font-semibold text-emerald-900 outline-none" value={item.jenis_khusus} onChange={(e) => updateEntry(index, 'jenis_khusus', e.target.value)}><option value="">-- Jenis Khusus --</option>{item.kategori_utama === "2. Sesi Pembelajaran" && (<><option value="Sesi Pemantapan Perkhidmatan Awam">Sesi Pemantapan Perkhidmatan Awam</option><option value="Perhimpunan Bulanan Jabatan">Perhimpunan Bulanan Jabatan</option><option value="Perhimpunan Bulanan Bahagian">Perhimpunan Bulanan Bahagian</option><option value="Sesi Pembelajaran">Sesi Pembelajaran</option><option value="Mentor Mentee">Mentor Mentee</option><option value="Konvensyen KIK">Konvensyen Kumpulan Inovasi dan Kreatif (KIK)</option><option value="Pembentangan Kertas Kerja">Pembentangan Kertas Kerja</option><option value="Ceramah">Ceramah</option><option value="Lain-lain">Lain-lain</option></>)}{item.kategori_utama === "3. Pembelajaran Kendiri" && (<><option value="EPSA">EPSA</option><option value="Pembentangan Buku">Pembentangan Buku</option><option value="Program Bina, Bincang">Program Bina, Bincang, Semarakkan Perkhidmatan Awam</option><option value="Konvensyen KIK (Hadir)">Konvensyen Kumpulan Inovasi dan Kreatif (KIK) [Menghadiri]</option><option value="Kursus Anjuran Luar Agensi">Kursus Anjuran Luar Agensi</option><option value="Online Learning">Online Learning</option><option value="AI Untuk Rakyat">AI Untuk Rakyat</option></>)}</select>
                      </div>
                    </div>
                    {item.kategori_utama && (<div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">{renderKriteria(item, index)}</div>)}
                  </div>
                ))}
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-emerald-100 bg-white flex justify-between items-center shadow-md">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider hidden md:block">Sistem akan menyemak pertindihan secara automatik.</span>
              <div className="flex space-x-3 w-full md:w-auto">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-emerald-200 rounded-lg text-emerald-800 hover:bg-emerald-50 font-bold text-sm transition duration-150">Batal</button>
                <button type="submit" form="bulkForm" disabled={isSubmitting} className="w-full md:w-auto px-10 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm transition duration-150 flex items-center justify-center shadow-md disabled:bg-teal-400">
                  {isSubmitting ? "Memproses..." : "SIMPAN REKOD PUKAL"}
                </button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Modal Edit (Single Entry) (PORTAL) */}
      {isEditModalOpen && editFormData && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[100] transition-opacity print-hide">
          <div className="bg-white shadow-2xl w-full w-[95%] max-w-5xl flex flex-col rounded-2xl overflow-hidden border border-emerald-100">
            <div className="p-6 border-b border-emerald-100 flex justify-between items-center bg-white shadow-sm">
              <h2 className="text-xl font-bold text-emerald-900 tracking-wide">Kemas Kini Rekod Kursus</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditFormData(null); }} className="text-emerald-500 hover:text-red-500 font-bold text-2xl leading-none outline-none transition">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-emerald-50/50">
              <form id="editForm" onSubmit={handleEditSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Kategori Utama</label>
                  <select required className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-sm font-semibold text-emerald-900 outline-none" value={editFormData.kategori_utama} onChange={(e) => setEditFormData({...editFormData, kategori_utama: e.target.value, jenis_khusus: ""})}>
                    <option value="">-- Kategori Utama --</option><option value="1. Kursus / Latihan">1. Kursus / Latihan</option><option value="2. Sesi Pembelajaran">2. Sesi Pembelajaran</option><option value="3. Pembelajaran Kendiri">3. Pembelajaran Kendiri</option>
                  </select>
                </div>
                {(editFormData.kategori_utama === "2. Sesi Pembelajaran" || editFormData.kategori_utama === "3. Pembelajaran Kendiri") && (
                  <div>
                    <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Jenis Khusus</label>
                    <select required className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-sm font-semibold text-emerald-900 outline-none" value={editFormData.jenis_khusus} onChange={(e) => setEditFormData({...editFormData, jenis_khusus: e.target.value})}>
                      <option value="">-- Jenis Khusus --</option>
                      {editFormData.kategori_utama === "2. Sesi Pembelajaran" && (<><option value="Sesi Pemantapan Perkhidmatan Awam">Sesi Pemantapan Perkhidmatan Awam</option><option value="Perhimpunan Bulanan Jabatan">Perhimpunan Bulanan Jabatan</option><option value="Perhimpunan Bulanan Bahagian">Perhimpunan Bulanan Bahagian</option><option value="Sesi Pembelajaran">Sesi Pembelajaran</option><option value="Mentor Mentee">Mentor Mentee</option><option value="Konvensyen KIK">Konvensyen Kumpulan Inovasi dan Kreatif (KIK)</option><option value="Pembentangan Kertas Kerja">Pembentangan Kertas Kerja</option><option value="Ceramah">Ceramah</option><option value="Lain-lain">Lain-lain</option></>)}
                      {editFormData.kategori_utama === "3. Pembelajaran Kendiri" && (<><option value="EPSA">EPSA</option><option value="Pembentangan Buku">Pembentangan Buku</option><option value="Program Bina, Bincang">Program Bina, Bincang, Semarakkan Perkhidmatan Awam</option><option value="Konvensyen KIK (Hadir)">Konvensyen Kumpulan Inovasi dan Kreatif (KIK) [Menghadiri]</option><option value="Kursus Anjuran Luar Agensi">Kursus Anjuran Luar Agensi</option><option value="Online Learning">Online Learning</option><option value="AI Untuk Rakyat">AI Untuk Rakyat</option></>)}
                    </select>
                  </div>
                )}
                {editFormData.jenis_khusus !== "AI Untuk Rakyat" && (
                  <div><label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Nama Kursus / Tajuk Sesi</label><input type="text" required className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-sm outline-none" value={editFormData.nama_kursus} onChange={(e) => setEditFormData({...editFormData, nama_kursus: e.target.value})} /></div>
                )}
                {editFormData.jenis_khusus === "EPSA" && (
                  <div><label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Kategori EPSA</label><input type="text" required className="w-full px-3 py-2 border border-emerald-200 rounded-md bg-white text-sm outline-none" value={editFormData.kategori_epsa} onChange={(e) => setEditFormData({...editFormData, kategori_epsa: e.target.value})} /></div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(editFormData.kategori_utama === "1. Kursus / Latihan" || editFormData.kategori_utama === "2. Sesi Pembelajaran" || editFormData.jenis_khusus === "Kursus Anjuran Luar Agensi") && (
                    <div><label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Penganjur</label><input type="text" required className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-sm outline-none" value={editFormData.penganjur} onChange={(e) => setEditFormData({...editFormData, penganjur: e.target.value})} /></div>
                  )}
                  {editFormData.jenis_khusus !== "EPSA" && editFormData.jenis_khusus !== "AI Untuk Rakyat" && (
                    <div><label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Tempat / Platform</label><input type="text" required className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-sm outline-none" value={editFormData.tempat} onChange={(e) => setEditFormData({...editFormData, tempat: e.target.value})} /></div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {editFormData.jenis_khusus !== "AI Untuk Rakyat" && editFormData.kategori_utama !== "3. Pembelajaran Kendiri" && (
                    <div><label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Tarikh Mula</label><input type="date" required className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-sm outline-none" value={editFormData.tarikh_mula} onChange={(e) => handleEditDateChange('tarikh_mula', e.target.value)} /></div>
                  )}
                  <div><label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Tarikh Tamat / Selesai</label><input type="date" required className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-sm outline-none" value={editFormData.tarikh_tamat} onChange={(e) => handleEditDateChange('tarikh_tamat', e.target.value)} /></div>
                  {editFormData.jenis_khusus !== "AI Untuk Rakyat" && (
                    <div><label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Jumlah Jam</label><input type="number" step="0.5" required className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-teal-500 bg-emerald-50 text-sm font-bold text-teal-700 outline-none" value={editFormData.jumlah_jam} onChange={(e) => setEditFormData({...editFormData, jumlah_jam: e.target.value})} /></div>
                  )}
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-emerald-100 bg-white flex justify-end space-x-3 shadow-md">
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditFormData(null); }} className="px-6 py-2.5 border border-emerald-200 rounded-lg text-emerald-800 hover:bg-emerald-50 font-bold text-sm transition duration-150">Batal</button>
              <button type="submit" form="editForm" disabled={isSubmitting} className="px-10 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm transition duration-150 flex items-center justify-center shadow-md disabled:bg-teal-400">
                {isSubmitting ? "Menyimpan..." : "Kemas Kini Rekod"}
              </button>
            </div>
          </div>
        </div>, document.body
      )}

    </div>
  );
}