"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RekodKursusAdmin() {
  const [senaraiKursus, setSenaraiKursus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // State untuk Carian & Filter
  const [carian, setCarian] = useState("");
  const [filterBahagian, setFilterBahagian] = useState("");
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());

  // State untuk Paging
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pilihanPegawai, setPilihanPegawai] = useState<any[]>([]);
  
  // State untuk Edit Kursus
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  // --- STATE UNTUK PANTAUAN 40 JAM ---
  const [isPantauanModalOpen, setIsPantauanModalOpen] = useState(false);
  const [pantauanJenis, setPantauanJenis] = useState<"kurang" | "cukup">("kurang");

  // State untuk Borang Pukal Dinamik
  const [bilanganEntry, setBilanganEntry] = useState(1);
  const janaBarisKosong = () => ({
    ic_pegawai: "", kategori_utama: "", jenis_khusus: "", nama_kursus: "",
    penganjur: "", tempat: "", tarikh_mula: "", tarikh_tamat: "",
    masa_mula: "", masa_tamat: "", jumlah_jam: "", kategori_epsa: "",
  });
  const [entries, setEntries] = useState<any[]>([janaBarisKosong()]);

  const dapatkanDataKursus = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("kursus_rekod")
        .select(`
          id, kategori_utama, jenis_khusus, nama_kursus, tarikh_mula, tarikh_tamat, jumlah_jam, ic_pegawai,
          pegawai ( nama, jabatan_bahagian )
        `)
        .order("tarikh_mula", { ascending: false });

      if (error) throw error;
      setSenaraiKursus(data || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const dapatkanPilihanPegawai = async () => {
    const { data } = await supabase.from("pegawai").select("ic, nama, jabatan_bahagian, gred").order("nama", { ascending: true });
    if (data) setPilihanPegawai(data);
  };

  useEffect(() => {
    dapatkanDataKursus();
    dapatkanPilihanPegawai();
  }, [dapatkanDataKursus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [carian, filterBahagian, filterTahun]);

  // =======================================================================
  // LOGIK SUSUNAN BAHAGIAN & PANGKAT
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

  const sortPegawaiMengikutPangkat = (a: any, b: any) => {
    const deptA = a.jabatan_bahagian || "";
    const deptB = b.jabatan_bahagian || "";
    const indexA = getDeptIndex(deptA);
    const indexB = getDeptIndex(deptB);
    
    if (indexA !== indexB) return indexA - indexB; 

    const rankA = getRank(a.gred);
    const rankB = getRank(b.gred);
    
    if (rankA.prefixPriority !== rankB.prefixPriority) return rankB.prefixPriority - rankA.prefixPriority; 
    if (rankA.num !== rankB.num) return rankB.num - rankA.num; 
    if (rankA.tbk !== rankB.tbk) return rankA.tbk ? 1 : -1; 
    
    return (a.nama || "").localeCompare(b.nama || ""); 
  };


  // =======================================================================
  // LOGIK PENGIRAAN PANTAUAN 40 JAM KURSUS
  // =======================================================================
  const tahunPantauan = filterTahun || new Date().getFullYear().toString();
  const jamPegawai: Record<string, number> = {};
  
  pilihanPegawai.forEach(p => { jamPegawai[p.ic] = 0; });
  
  senaraiKursus.forEach(k => {
     const thn = k.tarikh_mula ? k.tarikh_mula.substring(0, 4) : "";
     if (thn === tahunPantauan && k.ic_pegawai && jamPegawai[k.ic_pegawai] !== undefined) {
         jamPegawai[k.ic_pegawai] += (parseFloat(k.jumlah_jam) || 0);
     }
  });

  const senaraiKurang40 = pilihanPegawai.filter(p => jamPegawai[p.ic] < 40).map(p => ({ ...p, jumlah_jam: jamPegawai[p.ic] })).sort(sortPegawaiMengikutPangkat);
  const senaraiCukup40 = pilihanPegawai.filter(p => jamPegawai[p.ic] >= 40).map(p => ({ ...p, jumlah_jam: jamPegawai[p.ic] })).sort(sortPegawaiMengikutPangkat); 

  // =======================================================================
  // FUNGSI EDIT & PADAM KURSUS
  // =======================================================================
  const bukaModalEdit = (kursus: any) => {
    setEditFormData({
      id: kursus.id, ic_pegawai: kursus.ic_pegawai,
      kategori_utama: kursus.kategori_utama || "", jenis_khusus: kursus.jenis_khusus || "",
      nama_kursus: kursus.nama_kursus || "", penganjur: kursus.penganjur || "",
      tempat: kursus.tempat || "", tarikh_mula: kursus.tarikh_mula || "",
      tarikh_tamat: kursus.tarikh_tamat || "", masa_mula: kursus.masa_mula || "",
      masa_tamat: kursus.masa_tamat || "", jumlah_jam: kursus.jumlah_jam?.toString() || "",
      kategori_epsa: kursus.kategori_epsa || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditDateChange = (field: string, value: string) => {
    setEditFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      // Auto-kira jam untuk Kursus / Latihan (1 Hari = 6 Jam)
      if (updated.kategori_utama === "1. Kursus / Latihan" && updated.tarikh_mula && updated.tarikh_tamat) {
        const dMula = new Date(updated.tarikh_mula); 
        const dTamat = new Date(updated.tarikh_tamat);
        if (dTamat >= dMula) {
          const days = Math.round((dTamat.getTime() - dMula.getTime()) / (1000 * 3600 * 24)) + 1;
          updated.jumlah_jam = (days * 6).toString();
        } else {
          updated.jumlah_jam = "0";
        }
      }
      return updated;
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const finalTarikhMula = editFormData.tarikh_mula || editFormData.tarikh_tamat;
        const finalTarikhTamat = editFormData.tarikh_tamat || editFormData.tarikh_mula;
        const finalNama = editFormData.kategori_utama === "3. Pembelajaran Kendiri" && editFormData.jenis_khusus === "AI Untuk Rakyat" ? "AI Untuk Rakyat" : editFormData.nama_kursus;

        const isBorangEPSA = (editFormData.jenis_khusus === "EPSA") || (finalNama.toLowerCase().includes('epsa'));
        const { data: dbKursus } = await supabase.from("kursus_rekod").select("id, nama_kursus, jenis_khusus, tarikh_mula, tarikh_tamat")
          .eq("ic_pegawai", editFormData.ic_pegawai).lte("tarikh_mula", finalTarikhTamat).gte("tarikh_tamat", finalTarikhMula).neq("id", editFormData.id);

        if (dbKursus && dbKursus.length > 0) {
          const bertindih = dbKursus.find(k => {
             const isDBEpsa = (k.jenis_khusus === "EPSA") || (k.nama_kursus.toLowerCase().includes('epsa'));
             return !(isBorangEPSA || isDBEpsa);
          });
          if (bertindih) { alert(`PERTINDIHAN KURSUS\n\nPegawai ini sudah ada kursus lain:\n${bertindih.nama_kursus}\nTarikh: ${bertindih.tarikh_mula}`); setIsSubmitting(false); return; }
        }

        const { data: dbCuti } = await supabase.from("cuti_transaksi").select("jenis_cuti, tarikh_mula, tarikh_tamat")
          .eq("ic_pegawai", editFormData.ic_pegawai).lte("tarikh_mula", finalTarikhTamat).gte("tarikh_tamat", finalTarikhMula);
        if (dbCuti && dbCuti.length > 0) { alert(`PERTINDIHAN CUTI\n\nPegawai ini sedang bercuti:\n${dbCuti[0].jenis_cuti}`); setIsSubmitting(false); return; }

        const dataUntukDiSimpan = {
          kategori_utama: editFormData.kategori_utama, jenis_khusus: editFormData.jenis_khusus,
          nama_kursus: finalNama, penganjur: editFormData.penganjur || null, tempat: editFormData.tempat || null,
          kategori_epsa: editFormData.kategori_epsa || null, tarikh_mula: finalTarikhMula, tarikh_tamat: finalTarikhTamat,
          masa_mula: editFormData.masa_mula || null, masa_tamat: editFormData.masa_tamat || null,
          jumlah_jam: editFormData.jumlah_jam ? parseFloat(editFormData.jumlah_jam) : null,
        };

        const { error } = await supabase.from("kursus_rekod").update(dataUntukDiSimpan).eq("id", editFormData.id);
        if (error) throw error;

        alert("Rekod kursus berjaya dikemas kini!");
        setIsEditModalOpen(false);
        setEditFormData(null);
        dapatkanDataKursus();

    } catch (err: any) { alert("Gagal mengemas kini kursus: " + err.message); } finally { setIsSubmitting(false); }
  };

  const handlePadam = async (id: string, namaKursus: string) => {
    const sahkan = confirm(`Adakah anda pasti untuk memadam rekod kursus ini?\n\nKursus: ${namaKursus}`);
    if (!sahkan) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("kursus_rekod").delete().eq("id", id);
      if (error) throw error;
      alert("Rekod kursus berjaya dipadam!");
      dapatkanDataKursus(); 
    } catch (err: any) { alert("Gagal memadam rekod: " + err.message); setLoading(false); }
  };

  const eksportKeCSV = () => {
    if (kursusDitapis.length === 0) { alert("Tiada data untuk dieksport."); return; }
    const headers = ["Bil", "Nama Pegawai", "Bahagian", "Kategori Utama", "Jenis Khusus", "Nama Kursus / Tajuk", "Tarikh Mula", "Tarikh Tamat", "Jumlah Jam"];
    const csvRows = [headers.join(",")]; 
    kursusDitapis.forEach((kursus, index) => {
      const baris = [
        index + 1, `"${kursus.pegawai?.nama || '-'}"`, `"${kursus.pegawai?.jabatan_bahagian || '-'}"`, `"${kursus.kategori_utama || '-'}"`,
        `"${kursus.jenis_khusus || '-'}"`, `"${kursus.nama_kursus || '-'}"`, `"${kursus.tarikh_mula || '-'}"`, `"${kursus.tarikh_tamat || '-'}"`, `"${kursus.jumlah_jam || '0'}"`
      ];
      csvRows.push(baris.join(","));
    });
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `Laporan_Kursus_${filterTahun || 'Semua'}_${new Date().toLocaleDateString('ms-MY')}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // =======================================================================
  // LOGIK TAPISAN (FILTER) & PAGING JADUAL
  // =======================================================================
  const senaraiBahagianUnik = Array.from(new Set(pilihanPegawai.map((p) => p.jabatan_bahagian).filter(Boolean))).sort((a, b) => {
      return getDeptIndex(a as string) - getDeptIndex(b as string);
  });

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

  // =======================================================================
  // LOGIK BORANG PUKAL
  // =======================================================================
  useEffect(() => {
    const jumlahBaru = parseInt(bilanganEntry.toString()) || 1;
    setEntries((prev) => {
      const salinan = [...prev];
      if (jumlahBaru > salinan.length) {
        for (let i = salinan.length; i < jumlahBaru; i++) { salinan.push(janaBarisKosong()); }
      } else { salinan.length = jumlahBaru; }
      return salinan;
    });
  }, [bilanganEntry]);

  const updateEntry = (index: number, field: string, value: any) => {
    const salinan = [...entries];
    salinan[index] = { ...salinan[index], [field]: value };
    if (field === 'kategori_utama') salinan[index].jenis_khusus = ""; // Reset jenis khusus
    
    // Auto-kira jam untuk Kursus / Latihan (1 Hari = 6 Jam)
    if (salinan[index].kategori_utama === "1. Kursus / Latihan") {
      const mula = salinan[index].tarikh_mula;
      const tamat = salinan[index].tarikh_tamat;
      if (mula && tamat) {
        const dMula = new Date(mula);
        const dTamat = new Date(tamat);
        if (dTamat >= dMula) {
          const days = Math.round((dTamat.getTime() - dMula.getTime()) / (1000 * 3600 * 24)) + 1;
          salinan[index].jumlah_jam = (days * 6).toString();
        } else {
          salinan[index].jumlah_jam = "0";
        }
      }
    }
    
    setEntries(salinan);
  };

  const resetBorangPukal = () => { setBilanganEntry(1); setEntries([janaBarisKosong()]); }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      for (let i = 0; i < entries.length; i++) {
          const item = entries[i];
          if (!item.ic_pegawai) continue;
          if (!item.kategori_utama) { alert(`Sila pilih Kategori Utama untuk Baris #${i+1}`); setIsSubmitting(false); return; }
          if ((item.kategori_utama === "2. Sesi Pembelajaran" || item.kategori_utama === "3. Pembelajaran Kendiri") && !item.jenis_khusus) {
            alert(`Sila pilih Jenis Khusus untuk Baris #${i+1}`); setIsSubmitting(false); return;
          }
      }

      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          if (entries[i].ic_pegawai && entries[i].ic_pegawai === entries[j].ic_pegawai) {
             const mulaI = entries[i].tarikh_mula || entries[i].tarikh_tamat; const tamatI = entries[i].tarikh_tamat || entries[i].tarikh_mula;
             const mulaJ = entries[j].tarikh_mula || entries[j].tarikh_tamat; const tamatJ = entries[j].tarikh_tamat || entries[j].tarikh_mula;
             if (mulaI <= tamatJ && tamatI >= mulaJ) { alert(`RALAT DATA PUKAL!\n\nPegawai bertindih tarikh (Entry #${i+1} & #${j+1}).`); setIsSubmitting(false); return; }
          }
        }
      }

      for (let i = 0; i < entries.length; i++) {
        const item = entries[i];
        if (!item.ic_pegawai) continue; 
        const semakMula = item.tarikh_mula || item.tarikh_tamat; const semakTamat = item.tarikh_tamat || item.tarikh_mula;
        const isBorangEPSA = (item.jenis_khusus === "EPSA") || (item.nama_kursus.toLowerCase().includes('epsa'));

        const { data: dbKursus } = await supabase.from("kursus_rekod").select("nama_kursus, jenis_khusus, tarikh_mula, tarikh_tamat").eq("ic_pegawai", item.ic_pegawai).lte("tarikh_mula", semakTamat).gte("tarikh_tamat", semakMula);
        if (dbKursus && dbKursus.length > 0) {
          const bertindih = dbKursus.find(k => !((k.jenis_khusus === "EPSA" || k.nama_kursus.toLowerCase().includes('epsa')) || isBorangEPSA));
          if (bertindih) { alert(`PERTINDIHAN KURSUS (Entry #${i+1})\n\nSudah ada kursus:\n${bertindih.nama_kursus}\nTarikh: ${bertindih.tarikh_mula}`); setIsSubmitting(false); return; }
        }

        const { data: dbCuti } = await supabase.from("cuti_transaksi").select("jenis_cuti, tarikh_mula, tarikh_tamat").eq("ic_pegawai", item.ic_pegawai).lte("tarikh_mula", semakTamat).gte("tarikh_tamat", semakMula);
        if (dbCuti && dbCuti.length > 0) { alert(`PERTINDIHAN CUTI (Entry #${i+1})\n\nSedang bercuti:\n${dbCuti[0].jenis_cuti}`); setIsSubmitting(false); return; }
      }

      const dataUntukDiSimpan = entries.filter(e => e.ic_pegawai !== "").map((item) => {
        const finalTarikhMula = item.tarikh_mula || item.tarikh_tamat; const finalTarikhTamat = item.tarikh_tamat || item.tarikh_mula;
        const finalNama = item.kategori_utama === "3. Pembelajaran Kendiri" && item.jenis_khusus === "AI Untuk Rakyat" ? "AI Untuk Rakyat" : item.nama_kursus;
        return {
          ic_pegawai: item.ic_pegawai, kategori_utama: item.kategori_utama, jenis_khusus: item.jenis_khusus,
          nama_kursus: finalNama, penganjur: item.penganjur || null, tempat: item.tempat || null,
          kategori_epsa: item.kategori_epsa || null, tarikh_mula: finalTarikhMula, tarikh_tamat: finalTarikhTamat,
          masa_mula: item.masa_mula || null, masa_tamat: item.masa_tamat || null, jumlah_jam: item.jumlah_jam ? parseFloat(item.jumlah_jam) : null,
        };
      });

      if (dataUntukDiSimpan.length === 0) { alert("Tiada data lengkap untuk disimpan."); setIsSubmitting(false); return; }
      const { error } = await supabase.from("kursus_rekod").insert(dataUntukDiSimpan);
      if (error) throw error;

      alert(`Berjaya! ${dataUntukDiSimpan.length} rekod telah disimpan ke dalam pangkalan data.`);
      setIsModalOpen(false); resetBorangPukal(); dapatkanDataKursus(); 
    } catch (err: any) { alert("Gagal mendaftar kursus: " + err.message); } finally { setIsSubmitting(false); }
  };

  const renderKriteria = (item: any, index: number) => {
    if (item.kategori_utama === "1. Kursus / Latihan") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nama Kursus / Latihan</label><input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.nama_kursus} onChange={(e) => updateEntry(index, 'nama_kursus', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Penganjur</label><input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.penganjur} onChange={(e) => updateEntry(index, 'penganjur', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tempat</label><input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.tempat} onChange={(e) => updateEntry(index, 'tempat', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tarikh Mula</label><input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.tarikh_mula} onChange={(e) => updateEntry(index, 'tarikh_mula', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tarikh Tamat</label><input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.tarikh_tamat} onChange={(e) => updateEntry(index, 'tarikh_tamat', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Jumlah Jam</label><input type="number" step="0.5" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-bold text-indigo-600" value={item.jumlah_jam} onChange={(e) => updateEntry(index, 'jumlah_jam', e.target.value)} /></div>
          </div>
        </div>
      );
    }
    if (item.kategori_utama === "2. Sesi Pembelajaran") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tajuk Sesi</label><input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.nama_kursus} onChange={(e) => updateEntry(index, 'nama_kursus', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Penganjur</label><input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.penganjur} onChange={(e) => updateEntry(index, 'penganjur', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tempat</label><input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.tempat} onChange={(e) => updateEntry(index, 'tempat', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tarikh Sesi</label><input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.tarikh_mula} onChange={(e) => updateEntry(index, 'tarikh_mula', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Jumlah Jam</label><input type="number" step="0.5" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-bold text-indigo-600" value={item.jumlah_jam} onChange={(e) => updateEntry(index, 'jumlah_jam', e.target.value)} /></div>
          </div>
        </div>
      );
    }
    if (item.kategori_utama === "3. Pembelajaran Kendiri") {
      if (item.jenis_khusus === "AI Untuk Rakyat") {
        return (
          <div className="w-1/3"><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tarikh Selesai</label><input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.tarikh_tamat} onChange={(e) => updateEntry(index, 'tarikh_tamat', e.target.value)} /></div>
        );
      }
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tajuk / Bahan Bacaan</label><input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.nama_kursus} onChange={(e) => updateEntry(index, 'nama_kursus', e.target.value)} /></div>
            {item.jenis_khusus === "EPSA" && (<div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Kategori EPSA</label><input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.kategori_epsa} onChange={(e) => updateEntry(index, 'kategori_epsa', e.target.value)} /></div>)}
            {item.jenis_khusus !== "EPSA" && (<div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tempat / Platform</label><input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.tempat} onChange={(e) => updateEntry(index, 'tempat', e.target.value)} /></div>)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {item.jenis_khusus === "Kursus Anjuran Luar Agensi" && (<div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Penganjur</label><input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.penganjur} onChange={(e) => updateEntry(index, 'penganjur', e.target.value)} /></div>)}
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tarikh Selesai</label><input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.tarikh_tamat} onChange={(e) => updateEntry(index, 'tarikh_tamat', e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Jumlah Jam</label><input type="number" step="0.5" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={item.jumlah_jam} onChange={(e) => updateEntry(index, 'jumlah_jam', e.target.value)} /></div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 print:p-0 print:bg-white relative">
      {/* ========================================================
        CSS CETAKAN PROFESIONAL & KEBAL (PRINT CSS) 
        ======================================================== */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { 
            margin: 0.5cm; /* Buang Header & Footer Browser Automatik */
          }
          body, html { 
            background-color: white !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            height: auto !important;
          }
          /* Override ciri Tailwind yang menyebabkan kertas terpotong selepas 1 muka surat */
          .h-screen, .min-h-screen, .max-h-screen, .h-full {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          /* Benarkan jadual berkembang panjang ke bawah tanpa scroll */
          .overflow-y-auto, .overflow-hidden {
            overflow: visible !important;
          }
          /* SEMBUNYIKAN MENU SIDEBAR (layout.tsx) SECARA PAKSA */
          aside, nav {
            display: none !important;
          }
          /* Besarkan kawasan main (kandungan) supaya penuh kertas */
          main {
            flex: none !important;
            width: 100% !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Sembunyikan elemen utama sistem & pop-up yang tak perlu dicetak */
          .print-hide {
            display: none !important;
          }
          /* Paksa border jadual keluar dalam cetakan */
          table { border-collapse: collapse !important; width: 100% !important; position: relative; z-index: 10; }
          th, td { padding: 12px !important; }
        }
      `}} />

      {/* 1. PAPARAN SISTEM BIASA (AKAN DISEMBUNYIKAN WAKTU CETAK) */}
      <div className="max-w-7xl mx-auto print-hide">
        
        {/* Header Laman */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Rekod Kursus Pegawai</h1>
            <p className="text-gray-500 text-sm mt-1">Sistem Pengurusan Rekod Kursus & Latihan</p>
          </div>
          
          <div className="flex space-x-3">
            <button onClick={eksportKeCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm tracking-wide">
              <span className="mr-2">📥</span> Eksport Excel
            </button>
            <button onClick={() => { resetBorangPukal(); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm tracking-wide">
              <span className="mr-2">+</span> Data Entry
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4 font-bold border-l-4 border-red-500 text-sm">
            Ralat: {errorMsg}
          </div>
        )}

        {/* WIDGET PANTAUAN 40 JAM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
           <div 
             onClick={() => { setPantauanJenis("kurang"); setIsPantauanModalOpen(true); }}
             className="bg-white rounded-xl shadow-sm border-l-4 border-orange-500 p-5 cursor-pointer hover:bg-orange-50 transition transform hover:-translate-y-1"
           >
             <div className="flex justify-between items-center">
               <div>
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Belum Memenuhi 40 Jam ({tahunPantauan})</p>
                 <p className="text-3xl font-black text-orange-600 mt-1">{senaraiKurang40.length} <span className="text-lg font-bold text-gray-400">Pegawai</span></p>
               </div>
               <div className="text-4xl opacity-80">⚠️</div>
             </div>
             <p className="text-xs text-orange-600 mt-3 font-semibold">&rarr; Klik untuk papar senarai pegawai</p>
           </div>
           
           <div 
             onClick={() => { setPantauanJenis("cukup"); setIsPantauanModalOpen(true); }}
             className="bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 p-5 cursor-pointer hover:bg-emerald-50 transition transform hover:-translate-y-1"
           >
             <div className="flex justify-between items-center">
               <div>
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Telah Mencapai 40 Jam ({tahunPantauan})</p>
                 <p className="text-3xl font-black text-emerald-600 mt-1">{senaraiCukup40.length} <span className="text-lg font-bold text-gray-400">Pegawai</span></p>
               </div>
               <div className="text-4xl opacity-80">✅</div>
             </div>
             <p className="text-xs text-emerald-600 mt-3 font-semibold">&rarr; Klik untuk papar senarai pegawai</p>
           </div>
        </div>

        {/* Kotak Carian & Filter */}
        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center space-x-3 md:w-1/4">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">🎓</div>
            <span className="font-bold text-gray-700 text-sm">Tapisan Rekod</span>
          </div>
          <div className="w-full md:w-1/4">
            <select 
              className="w-full border-gray-200 bg-gray-50 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 border transition cursor-pointer text-gray-700 font-semibold"
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
            >
              <option value="">-- Semua Tahun --</option>
              <option value="2024">Tahun 2024</option>
              <option value="2025">Tahun 2025</option>
              <option value="2026">Tahun 2026</option>
            </select>
          </div>
          <div className="w-full md:w-1/3">
            <select 
              className="w-full border-gray-200 bg-gray-50 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 border transition cursor-pointer text-gray-700 font-semibold"
              value={filterBahagian}
              onChange={(e) => setFilterBahagian(e.target.value)}
            >
              <option value="">-- Semua Bahagian --</option>
              {senaraiBahagianUnik.map((bahagian, i) => (
                <option key={i} value={bahagian as string}>{bahagian as string}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center flex-1 bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 w-full focus-within:ring-2 focus-within:ring-indigo-500 transition">
            <span className="text-gray-400 mr-2">🔍</span>
            <input type="text" placeholder="Cari Nama / Kursus / KP..." className="w-full outline-none text-gray-700 bg-transparent text-sm" value={carian} onChange={(e) => setCarian(e.target.value)} />
          </div>
        </div>

        {/* JADUAL KURSUS (DENGAN PAGING & STICKY HEADER) */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] relative">
            {loading ? (
              <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Memuat turun data kursus...</div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="p-4 font-semibold text-center w-12 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Bil.</th>
                    <th className="p-4 font-semibold sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Nama Pegawai / Bahagian</th>
                    <th className="p-4 font-semibold w-40 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Kategori / Jenis</th>
                    <th className="p-4 font-semibold sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Tajuk Kursus</th>
                    <th className="p-4 font-semibold w-40 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Tarikh</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Jam</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        {carian || filterBahagian || filterTahun ? "Tiada rekod sepadan dengan tapisan." : "Tiada rekod kursus dijumpai."}
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((kursus, index) => (
                      <tr key={kursus.id} className="hover:bg-indigo-50/40 transition duration-150 group">
                        <td className="p-4 text-gray-500 text-center font-medium">{indexOfFirstItem + index + 1}</td>
                        <td className="p-4">
                            <p className="font-bold text-gray-900 truncate max-w-xs">{kursus.pegawai?.nama || 'Tiada Rekod'}</p>
                            <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{kursus.pegawai?.jabatan_bahagian || '-'}</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-bold text-xs border border-indigo-200 shadow-sm">
                            {kursus.kategori_utama || 'N/A'}
                          </span>
                          {kursus.jenis_khusus && <div className="text-[11px] text-gray-500 mt-1.5 font-medium">{kursus.jenis_khusus}</div>}
                        </td>
                        <td className="p-4 text-gray-800 font-medium truncate max-w-sm" title={kursus.nama_kursus}>{kursus.nama_kursus}</td>
                        <td className="p-4 text-gray-600 text-xs font-medium">
                           {kursus.tarikh_mula === kursus.tarikh_tamat ? kursus.tarikh_mula : `${kursus.tarikh_mula}\nhingga\n${kursus.tarikh_tamat}`}
                        </td>
                        <td className="p-4 font-bold text-center text-indigo-600 text-base">{kursus.jumlah_jam || '0'}</td>
                        <td className="p-4 text-center flex justify-center space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => bukaModalEdit(kursus)} title="Edit Kursus" className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2 rounded-md transition shadow-sm border border-indigo-100">✏️</button>
                          <button onClick={() => handlePadam(kursus.id, kursus.nama_kursus)} title="Padam Kursus" className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-md transition shadow-sm border border-red-100">🗑️</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Kontrol Paging */}
          {!loading && kursusDitapis.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-sm">
              <span className="text-gray-500 font-medium">
                Papar <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> hingga <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, kursusDitapis.length)}</span> dari <span className="font-bold text-gray-900">{kursusDitapis.length}</span> rekod
              </span>
              <div className="flex space-x-2">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition shadow-sm">&larr; Prev</button>
                <div className="flex items-center px-4 font-bold text-indigo-700">{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition shadow-sm">Next &rarr;</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Data Entry Pukal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 print-hide">
          <div className="bg-white shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col rounded-2xl overflow-hidden border border-indigo-100 transform transition-transform duration-300 scale-100">
            
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-slate-800 text-white shadow-sm">
              <div>
                <h2 className="text-2xl font-bold tracking-wide">Data Entry Kursus (Pukal Pintar)</h2>
                <p className="text-xs text-indigo-200 mt-1">Satu paparan untuk memasukkan pelbagai kategori kursus</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-400 font-bold text-3xl leading-none">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <form id="bulkForm" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">📚</span>
                    <div>
                      <h3 className="font-bold text-gray-800">KONFIGURASI JUMLAH BARIS</h3>
                      <p className="text-xs text-gray-500">Pilih bilangan rekod permohonan</p>
                    </div>
                  </div>
                  <div>
                    <select className="px-5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-bold text-indigo-600" value={bilanganEntry} onChange={(e) => setBilanganEntry(parseInt(e.target.value))}>
                      {[...Array(20)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1} Baris Entry</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* LOOP BORANG BERDASARKAN BILANGAN ENTRY */}
                <div className="grid grid-cols-1 gap-6">
                {entries.map((item, index) => (
                  <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative pt-8">
                    <div className="absolute -left-3 -top-3 bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg text-sm shadow-md">
                      #{index + 1}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Pegawai */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nama Pegawai</label>
                        <select required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white text-sm font-medium" value={item.ic_pegawai} onChange={(e) => updateEntry(index, 'ic_pegawai', e.target.value)}>
                          <option value="">-- Pilih Pegawai --</option>
                          {pilihanPegawai.map((p) => (
                            <option key={p.ic} value={p.ic}>{p.nama}</option>
                          ))}
                        </select>
                      </div>
                      {/* Kategori Utama */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Kategori Utama</label>
                        <select required disabled={!item.ic_pegawai} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 text-sm font-semibold text-gray-700" value={item.kategori_utama} onChange={(e) => updateEntry(index, 'kategori_utama', e.target.value)}>
                          <option value="">-- Kategori Utama --</option>
                          <option value="1. Kursus / Latihan">1. Kursus / Latihan</option>
                          <option value="2. Sesi Pembelajaran">2. Sesi Pembelajaran</option>
                          <option value="3. Pembelajaran Kendiri">3. Pembelajaran Kendiri</option>
                        </select>
                      </div>
                      {/* Jenis Khusus */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Jenis Khusus</label>
                        <select required={item.kategori_utama === "2. Sesi Pembelajaran" || item.kategori_utama === "3. Pembelajaran Kendiri"} disabled={item.kategori_utama === "1. Kursus / Latihan" || !item.kategori_utama} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 text-sm font-semibold text-gray-700" value={item.jenis_khusus} onChange={(e) => updateEntry(index, 'jenis_khusus', e.target.value)}>
                          <option value="">-- Jenis Khusus --</option>
                          {item.kategori_utama === "2. Sesi Pembelajaran" && (
                            <>
                              <option value="Sesi Pemantapan Perkhidmatan Awam">Sesi Pemantapan Perkhidmatan Awam</option>
                              <option value="Perhimpunan Bulanan Jabatan">Perhimpunan Bulanan Jabatan</option>
                              <option value="Perhimpunan Bulanan Bahagian">Perhimpunan Bulanan Bahagian</option>
                              <option value="Sesi Pembelajaran">Sesi Pembelajaran</option>
                              <option value="Mentor Mentee">Mentor Mentee</option>
                              <option value="Konvensyen KIK">Konvensyen Kumpulan Inovasi dan Kreatif (KIK)</option>
                              <option value="Pembentangan Kertas Kerja">Pembentangan Kertas Kerja</option>
                              <option value="Ceramah">Ceramah</option>
                              <option value="Lain-lain">Lain-lain</option>
                            </>
                          )}
                          {item.kategori_utama === "3. Pembelajaran Kendiri" && (
                            <>
                              <option value="EPSA">EPSA</option>
                              <option value="Pembentangan Buku">Pembentangan Buku</option>
                              <option value="Program Bina, Bincang">Program Bina, Bincang, Semarakkan Perkhidmatan Awam</option>
                              <option value="Konvensyen KIK (Hadir)">Konvensyen Kumpulan Inovasi dan Kreatif (KIK) [Menghadiri]</option>
                              <option value="Kursus Anjuran Luar Agensi">Kursus Anjuran Luar Agensi</option>
                              <option value="Online Learning">Online Learning</option>
                              <option value="AI Untuk Rakyat">AI Untuk Rakyat</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* RENDER KRITERIA DINAMIK */}
                    {item.kategori_utama && (
                        <div className="p-4 bg-slate-50 border border-gray-100 rounded-lg">
                           {renderKriteria(item, index)}
                        </div>
                    )}

                  </div>
                ))}
                </div>

              </form>
            </div>

            <div className="p-5 border-t border-gray-200 bg-white flex justify-between items-center shadow-md">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:block">
                Sistem akan menyemak pertindihan secara automatik.
              </span>
              <div className="flex space-x-3 w-full md:w-auto">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold text-sm transition duration-150">
                  Batal
                </button>
                <button type="submit" form="bulkForm" disabled={isSubmitting} className="w-full md:w-auto px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition duration-150 flex items-center justify-center shadow-md disabled:bg-indigo-400">
                  {isSubmitting ? "Memproses..." : "SIMPAN REKOD PUKAL"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Edit (Single Entry) */}
      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity print-hide">
          <div className="bg-white shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-indigo-100">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-white shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 tracking-wide">Kemas Kini Rekod Kursus</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditFormData(null); }} className="text-gray-400 hover:text-red-500 font-bold text-2xl leading-none transition">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <form id="editForm" onSubmit={handleEditSubmit} className="space-y-5">
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Kategori Utama</label>
                  <select required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-semibold text-gray-700" value={editFormData.kategori_utama} onChange={(e) => setEditFormData({...editFormData, kategori_utama: e.target.value, jenis_khusus: ""})}>
                    <option value="">-- Kategori Utama --</option>
                    <option value="1. Kursus / Latihan">1. Kursus / Latihan</option>
                    <option value="2. Sesi Pembelajaran">2. Sesi Pembelajaran</option>
                    <option value="3. Pembelajaran Kendiri">3. Pembelajaran Kendiri</option>
                  </select>
                </div>

                {(editFormData.kategori_utama === "2. Sesi Pembelajaran" || editFormData.kategori_utama === "3. Pembelajaran Kendiri") && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Jenis Khusus</label>
                    <select required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-semibold text-gray-700" value={editFormData.jenis_khusus} onChange={(e) => setEditFormData({...editFormData, jenis_khusus: e.target.value})}>
                      <option value="">-- Jenis Khusus --</option>
                      {editFormData.kategori_utama === "2. Sesi Pembelajaran" && (
                        <>
                          <option value="Sesi Pemantapan Perkhidmatan Awam">Sesi Pemantapan Perkhidmatan Awam</option>
                          <option value="Perhimpunan Bulanan Jabatan">Perhimpunan Bulanan Jabatan</option>
                          <option value="Perhimpunan Bulanan Bahagian">Perhimpunan Bulanan Bahagian</option>
                          <option value="Sesi Pembelajaran">Sesi Pembelajaran</option>
                          <option value="Mentor Mentee">Mentor Mentee</option>
                          <option value="Konvensyen KIK">Konvensyen Kumpulan Inovasi dan Kreatif (KIK)</option>
                          <option value="Pembentangan Kertas Kerja">Pembentangan Kertas Kerja</option>
                          <option value="Ceramah">Ceramah</option>
                          <option value="Lain-lain">Lain-lain</option>
                        </>
                      )}
                      {editFormData.kategori_utama === "3. Pembelajaran Kendiri" && (
                        <>
                          <option value="EPSA">EPSA</option>
                          <option value="Pembentangan Buku">Pembentangan Buku</option>
                          <option value="Program Bina, Bincang">Program Bina, Bincang, Semarakkan Perkhidmatan Awam</option>
                          <option value="Konvensyen KIK (Hadir)">Konvensyen Kumpulan Inovasi dan Kreatif (KIK) [Menghadiri]</option>
                          <option value="Kursus Anjuran Luar Agensi">Kursus Anjuran Luar Agensi</option>
                          <option value="Online Learning">Online Learning</option>
                          <option value="AI Untuk Rakyat">AI Untuk Rakyat</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {editFormData.jenis_khusus !== "AI Untuk Rakyat" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nama Kursus / Tajuk Sesi</label>
                    <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm" value={editFormData.nama_kursus} onChange={(e) => setEditFormData({...editFormData, nama_kursus: e.target.value})} />
                  </div>
                )}

                {editFormData.jenis_khusus === "EPSA" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Kategori EPSA</label>
                    <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" value={editFormData.kategori_epsa} onChange={(e) => setEditFormData({...editFormData, kategori_epsa: e.target.value})} />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(editFormData.kategori_utama === "1. Kursus / Latihan" || editFormData.kategori_utama === "2. Sesi Pembelajaran" || editFormData.jenis_khusus === "Kursus Anjuran Luar Agensi") && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Penganjur</label>
                      <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm" value={editFormData.penganjur} onChange={(e) => setEditFormData({...editFormData, penganjur: e.target.value})} />
                    </div>
                  )}
                  {editFormData.jenis_khusus !== "EPSA" && editFormData.jenis_khusus !== "AI Untuk Rakyat" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tempat / Platform</label>
                      <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm" value={editFormData.tempat} onChange={(e) => setEditFormData({...editFormData, tempat: e.target.value})} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {editFormData.jenis_khusus !== "AI Untuk Rakyat" && editFormData.kategori_utama !== "3. Pembelajaran Kendiri" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tarikh Mula</label>
                      <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm" value={editFormData.tarikh_mula} onChange={(e) => handleEditDateChange('tarikh_mula', e.target.value)} />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tarikh Tamat / Selesai</label>
                    <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm" value={editFormData.tarikh_tamat} onChange={(e) => handleEditDateChange('tarikh_tamat', e.target.value)} />
                  </div>
                  {editFormData.kategori_utama !== "3. Pembelajaran Kendiri" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Masa Mula</label>
                        <input type="time" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm" value={editFormData.masa_mula} onChange={(e) => setEditFormData({...editFormData, masa_mula: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Masa Tamat</label>
                        <input type="time" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm" value={editFormData.masa_tamat} onChange={(e) => setEditFormData({...editFormData, masa_tamat: e.target.value})} />
                      </div>
                    </>
                  )}
                  {editFormData.jenis_khusus !== "AI Untuk Rakyat" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Jumlah Jam</label>
                      <input type="number" step="0.5" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-bold text-indigo-600" value={editFormData.jumlah_jam} onChange={(e) => setEditFormData({...editFormData, jumlah_jam: e.target.value})} />
                    </div>
                  )}
                </div>

              </form>
            </div>
            
            <div className="p-5 border-t border-gray-200 bg-white flex justify-end space-x-3 shadow-md">
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditFormData(null); }} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold text-sm transition duration-150">
                Batal
              </button>
              <button type="submit" form="editForm" disabled={isSubmitting} className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition duration-150 flex items-center justify-center shadow-md disabled:bg-indigo-400">
                {isSubmitting ? "Menyimpan..." : "Kemas Kini Rekod"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pantauan 40 Jam (Papar di Skrin - TIDAK DICETAK DARI SINI) */}
      {isPantauanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity print-hide">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative">
            
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-white shadow-sm">
              <div>
                <h2 className={`text-xl font-black uppercase tracking-wide ${pantauanJenis === 'kurang' ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {pantauanJenis === 'kurang' ? `Senarai Pegawai Belum Mencapai 40 Jam (${tahunPantauan})` : `Senarai Pegawai Melebihi 40 Jam (${tahunPantauan})`}
                </h2>
                <p className="text-sm font-semibold text-gray-500 mt-1">
                  Jumlah: {pantauanJenis === 'kurang' ? senaraiKurang40.length : senaraiCukup40.length} Pegawai
                </p>
              </div>
              <div className="flex space-x-3 items-center">
                <button 
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm"
                >
                  <span className="mr-2">🖨️</span> Cetak PDF
                </button>
                <button onClick={() => setIsPantauanModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold text-3xl leading-none transition">&times;</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 font-semibold text-center w-12 text-gray-600 border-b">Bil.</th>
                      <th className="p-4 font-semibold text-gray-600 border-b">Nama Pegawai</th>
                      <th className="p-4 font-semibold text-gray-600 border-b w-32">Gred</th>
                      <th className="p-4 font-semibold text-gray-600 border-b w-64">Bahagian / Unit</th>
                      <th className="p-4 font-semibold text-center w-40 text-gray-600 border-b">Jam Terkumpul</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(pantauanJenis === 'kurang' ? senaraiKurang40 : senaraiCukup40).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">Tiada rekod pegawai dijumpai untuk kategori ini.</td>
                      </tr>
                    ) : (
                      (pantauanJenis === 'kurang' ? senaraiKurang40 : senaraiCukup40).map((pegawai, index) => (
                        <tr key={pegawai.ic} className="hover:bg-gray-50 transition duration-150">
                          <td className="p-4 text-center text-gray-500 font-medium border-b border-gray-100">{index + 1}</td>
                          <td className="p-4 font-bold text-gray-800 border-b border-gray-100 leading-snug uppercase">{pegawai.nama}</td>
                          <td className="p-4 text-gray-600 font-semibold border-b border-gray-100">{pegawai.gred || '-'}</td>
                          <td className="p-4 text-gray-600 text-xs font-semibold border-b border-gray-100 uppercase">{pegawai.jabatan_bahagian || '-'}</td>
                          <td className="p-4 text-center border-b border-gray-100">
                            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-black shadow-sm border ${
                              pantauanJenis === 'kurang' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {pegawai.jumlah_jam.toFixed(1)} Jam
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* 2. PAPARAN KHAS CETAKAN (HANYA MUNCUL SEMASA PRINT DI BUAT - REKA BENTUK CANTIK)    */}
      {/* =================================================================================== */}
      {isPantauanModalOpen && (
        <div id="print-area" className="hidden print:block w-full bg-transparent text-black p-8 relative z-0">
          
          {/* WATERMARK LOGO JABATAN IMIGRESEN */}
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none -z-10">
             <img 
               src="/logo-imigresen.jpg" 
               alt="Watermark Imigresen" 
               className="w-[500px] opacity-[0.08]" 
               style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
             />
          </div>

          {/* Header Surat Cetakan */}
          <div className="text-center mb-8 border-b-2 border-slate-300 pb-6 relative z-10">
            <h2 className={`text-2xl font-black uppercase tracking-widest ${pantauanJenis === 'kurang' ? 'text-orange-600' : 'text-emerald-600'}`}>
              {pantauanJenis === 'kurang' ? `Senarai Pegawai Belum Mencapai 40 Jam` : `Senarai Pegawai Telah Mencapai 40 Jam`}
            </h2>
            <p className="font-bold mt-2 text-lg text-slate-700">Sistem Pemantauan Kursus Kakitangan (Tahun {tahunPantauan})</p>
            <p className="font-semibold mt-1 text-slate-500">Jumlah: {pantauanJenis === 'kurang' ? senaraiKurang40.length : senaraiCukup40.length} Pegawai</p>
          </div>
          
          {/* Jadual Cetakan Yang Cantik */}
          <table className="w-full text-left text-sm border-collapse relative z-10">
            <thead>
              <tr className="bg-slate-100 print:bg-transparent border-b-2 border-slate-300">
                <th className="py-4 px-4 font-bold text-center w-12 text-slate-700">Bil.</th>
                <th className="py-4 px-4 font-bold text-slate-700">Nama Pegawai</th>
                <th className="py-4 px-4 font-bold w-32 text-slate-700">Gred</th>
                <th className="py-4 px-4 font-bold w-64 text-slate-700">Bahagian / Unit</th>
                <th className="py-4 px-4 font-bold text-center w-40 text-slate-700">Jam Terkumpul</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(pantauanJenis === 'kurang' ? senaraiKurang40 : senaraiCukup40).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center font-medium italic text-gray-500">Tiada rekod pegawai dijumpai untuk kategori ini.</td>
                </tr>
              ) : (
                (pantauanJenis === 'kurang' ? senaraiKurang40 : senaraiCukup40).map((pegawai, index) => (
                  <tr key={pegawai.ic} className="break-inside-avoid">
                    <td className="py-4 px-4 text-center text-gray-600">{index + 1}</td>
                    <td className="py-4 px-4 font-bold text-gray-800 uppercase">{pegawai.nama}</td>
                    <td className="py-4 px-4 font-semibold text-gray-700">{pegawai.gred || '-'}</td>
                    <td className="py-4 px-4 text-xs font-semibold text-gray-600 uppercase">{pegawai.jabatan_bahagian || '-'}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-black border shadow-sm print:border-none print:shadow-none print:p-0 ${
                        pantauanJenis === 'kurang' ? 'bg-orange-50 text-orange-700 border-orange-200 print:bg-transparent print:text-gray-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200 print:bg-transparent print:text-gray-800'
                      }`}>
                        {pegawai.jumlah_jam.toFixed(1)} Jam
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <div className="mt-10 text-center text-xs text-gray-500 italic relative z-10">
            Dicetak oleh Sistem e-Pegawai pada: {new Date().toLocaleString('ms-MY')}
          </div>
        </div>
      )}

    </div>
  );
}