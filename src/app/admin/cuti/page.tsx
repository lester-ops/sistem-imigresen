"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RekodCuti() {
  const [senaraiCuti, setSenaraiCuti] = useState<any[]>([]);
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
  const [tarikhCutiUmum, setTarikhCutiUmum] = useState<string[]>([]);
  
  // --- STATE UNTUK EDIT CUTI (SINGLE) ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  // --- STATE UNTUK BORANG PUKAL DINAMIK ---
  const [bilanganEntry, setBilanganEntry] = useState(1);
  const janaBarisKosong = () => ({
    ic_pegawai: "", kategori_pegawai: "", jenis_cuti: "", klinik: "",
    tarikh_mula: "", tarikh_tamat: "", hari_off: "0", hari_dikira: 0, catatan: "",
  });
  const [entries, setEntries] = useState<any[]>(() => [janaBarisKosong()]);

  const dapatkanDataCuti = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cuti_transaksi")
        .select(`
          id, jenis_cuti, kategori_pegawai, tarikh_mula, tarikh_tamat, bilangan_hari, hari_off, klinik, tahun, catatan, ic_pegawai,
          pegawai ( nama, jabatan_bahagian )
        `)
        .order("tarikh_mula", { ascending: false });

      if (error) throw error;
      setSenaraiCuti(data || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const dapatkanPilihanPegawai = async () => {
    const { data } = await supabase.from("pegawai").select("ic, nama, jabatan_bahagian").order("nama", { ascending: true });
    if (data) setPilihanPegawai(data);
  };

  const dapatkanCutiUmum = async () => {
    const { data } = await supabase.from("cuti_umum").select("tarikh");
    if (data) setTarikhCutiUmum(data.map(c => c.tarikh));
  };

  useEffect(() => {
    dapatkanDataCuti();
    dapatkanPilihanPegawai();
    dapatkanCutiUmum();
  }, [dapatkanDataCuti]);

  useEffect(() => {
    setCurrentPage(1);
  }, [carian, filterBahagian, filterTahun]);

  // --- LOGIK PENGIRAAN CUTI (PEJABAT / SIF / KELOMPOK) ---
  const kiraBilanganHari = (mula: string, tamat: string, kategori: string, jenisCuti: string, hariOff: number) => {
    if (!mula || !tamat) return 0;
    const dMula = new Date(mula);
    const dTamat = new Date(tamat);
    dMula.setHours(0,0,0,0);
    dTamat.setHours(0,0,0,0);

    if (dMula > dTamat) return -1;

    let totalCalendarDays = 0;
    let workingDays = 0;
    let current = new Date(dMula);

    while (current <= dTamat) {
      totalCalendarDays++;
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      const isHujungMinggu = (dayOfWeek === 0 || dayOfWeek === 6);
      const isCutiUmum = tarikhCutiUmum.includes(dateStr);

      if (!isHujungMinggu && !isCutiUmum) workingDays++;
      current.setDate(current.getDate() + 1);
    }

    if (jenisCuti === "Cuti Kelompok") return totalCalendarDays; 
    else if (kategori === "Sif") return Math.max(0, totalCalendarDays - (hariOff || 0)); 
    else return workingDays; 
  };

  // =======================================================================
  // FUNGSI EDIT CUTI (SINGLE ENTRY)
  // =======================================================================
  const bukaModalEdit = (cuti: any) => {
    setEditFormData({
      id: cuti.id,
      ic_pegawai: cuti.ic_pegawai,
      nama_pegawai: cuti.pegawai?.nama,
      kategori_pegawai: cuti.kategori_pegawai || "Pejabat",
      jenis_cuti: cuti.jenis_cuti || "",
      klinik: cuti.klinik || "",
      tarikh_mula: cuti.tarikh_mula || "",
      tarikh_tamat: cuti.tarikh_tamat || "",
      hari_off: cuti.hari_off?.toString() || "0",
      bilangan_hari: cuti.bilangan_hari || 0,
      catatan: cuti.catatan || "",
    });
    setIsEditModalOpen(true);
  };

  // Pengiraan automatik dalam borang Edit
  useEffect(() => {
    if (editFormData && isEditModalOpen) {
      const hari = kiraBilanganHari(
        editFormData.tarikh_mula, 
        editFormData.tarikh_tamat, 
        editFormData.kategori_pegawai, 
        editFormData.jenis_cuti, 
        parseFloat(editFormData.hari_off) || 0
      );
      if (editFormData.bilangan_hari !== hari) {
        setEditFormData((prev: any) => ({ ...prev, bilangan_hari: hari }));
      }
    }
  }, [editFormData?.tarikh_mula, editFormData?.tarikh_tamat, editFormData?.kategori_pegawai, editFormData?.jenis_cuti, editFormData?.hari_off, isEditModalOpen]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        if (editFormData.bilangan_hari < 0) {
            alert("Ralat: Tarikh Tamat tidak boleh sebelum Tarikh Mula.");
            setIsSubmitting(false); return;
        }

        // Semakan Pertindihan (Cuti & Kursus)
        const semakMula = editFormData.tarikh_mula;
        const semakTamat = editFormData.tarikh_tamat;

        const { data: dbCuti } = await supabase.from("cuti_transaksi").select("id, jenis_cuti, tarikh_mula, tarikh_tamat")
          .eq("ic_pegawai", editFormData.ic_pegawai).lte("tarikh_mula", semakTamat).gte("tarikh_tamat", semakMula).neq("id", editFormData.id);

        if (dbCuti && dbCuti.length > 0) {
           alert(`PERTINDIHAN CUTI\n\nPegawai ini sudah mempunyai cuti lain pada tarikh tersebut:\n${dbCuti[0].jenis_cuti}\nTarikh: ${dbCuti[0].tarikh_mula} hingga ${dbCuti[0].tarikh_tamat}`);
           setIsSubmitting(false); return;
        }

        const { data: dbKursus } = await supabase.from("kursus_rekod").select("jenis_khusus, nama_kursus, tarikh_mula, tarikh_tamat")
          .eq("ic_pegawai", editFormData.ic_pegawai).lte("tarikh_mula", semakTamat).gte("tarikh_tamat", semakMula);

        if (dbKursus && dbKursus.length > 0) {
           const kursusBertindih = dbKursus.find(k => !(k.jenis_khusus === "EPSA" || k.nama_kursus.toLowerCase().includes('epsa')));
           if (kursusBertindih) {
              alert(`PERTINDIHAN KURSUS\n\nPegawai sedang berkursus:\n${kursusBertindih.nama_kursus}\nTarikh: ${kursusBertindih.tarikh_mula}`);
              setIsSubmitting(false); return;
           }
        }

        // Update Rekod
        const tahunCuti = new Date(editFormData.tarikh_mula).getFullYear();
        const { error } = await supabase.from("cuti_transaksi").update({
          kategori_pegawai: editFormData.kategori_pegawai,
          jenis_cuti: editFormData.jenis_cuti,
          klinik: editFormData.jenis_cuti === "Cuti Sakit" ? editFormData.klinik : null,
          tarikh_mula: editFormData.tarikh_mula,
          tarikh_tamat: editFormData.tarikh_tamat,
          hari_off: editFormData.kategori_pegawai === "Sif" ? (parseFloat(editFormData.hari_off) || 0) : 0,
          bilangan_hari: editFormData.bilangan_hari,
          tahun: tahunCuti,
          catatan: editFormData.catatan || null,
        }).eq("id", editFormData.id);

        if (error) throw error;
        alert("Rekod cuti berjaya dikemas kini!");
        setIsEditModalOpen(false);
        dapatkanDataCuti();

    } catch (err: any) {
        alert("Gagal mengemas kini rekod: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // FUNGSI MEMADAM REKOD CUTI
  const handlePadam = async (id: string, jenisCuti: string, namaPegawai: string) => {
    const sahkan = confirm(`Adakah anda pasti untuk memadam rekod cuti ini?\n\nPegawai: ${namaPegawai}\nJenis: ${jenisCuti}`);
    if (!sahkan) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("cuti_transaksi").delete().eq("id", id);
      if (error) throw error;
      alert("Rekod cuti berjaya dipadam!");
      dapatkanDataCuti(); 
    } catch (err: any) {
      alert("Gagal memadam rekod: " + err.message);
      setLoading(false);
    }
  };

  // =======================================================================
  // LOGIK TAPISAN (FILTER) & PAGING
  // =======================================================================
  const senaraiBahagianUnik = Array.from(new Set(pilihanPegawai.map((p) => p.jabatan_bahagian).filter(Boolean))).sort();

  const cutiDitapis = senaraiCuti.filter((cuti) => {
    const kataKunci = carian.toLowerCase();
    const padanCarian = 
      (cuti.pegawai?.nama || "").toLowerCase().includes(kataKunci) ||
      (cuti.ic_pegawai || "").includes(kataKunci) ||
      (cuti.catatan || "").toLowerCase().includes(kataKunci);
    
    const padanBahagian = filterBahagian === "" || cuti.pegawai?.jabatan_bahagian === filterBahagian;
    
    const tahunRekod = cuti.tarikh_mula ? cuti.tarikh_mula.substring(0, 4) : "";
    const padanTahun = filterTahun === "" || tahunRekod === filterTahun;

    return padanCarian && padanBahagian && padanTahun;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = cutiDitapis.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(cutiDitapis.length / itemsPerPage);

  // =======================================================================
  // LOGIK BORANG PUKAL
  // =======================================================================
  useEffect(() => {
    const jumlahBaru = parseInt(bilanganEntry.toString()) || 1;
    setEntries((prev) => {
      const salinan = [...prev];
      if (jumlahBaru > salinan.length) {
        for (let i = salinan.length; i < jumlahBaru; i++) {
          salinan.push(janaBarisKosong());
        }
      } else {
        salinan.length = jumlahBaru;
      }
      return salinan;
    });
  }, [bilanganEntry]);

  const updateEntry = (index: number, field: string, value: any) => {
    const salinan = [...entries];
    salinan[index] = { ...salinan[index], [field]: value };

    if (field === 'kategori_pegawai' || field === 'jenis_cuti') {
        if (salinan[index].jenis_cuti !== "Cuti Sakit") salinan[index].klinik = "";
        if (salinan[index].kategori_pegawai !== "Sif" || salinan[index].jenis_cuti === "Cuti Kelompok") salinan[index].hari_off = "0";
    }

    const mula = salinan[index].tarikh_mula;
    const tamat = salinan[index].tarikh_tamat;
    const kategori = salinan[index].kategori_pegawai;
    const jenisCuti = salinan[index].jenis_cuti;
    const hariOffVal = parseFloat(salinan[index].hari_off) || 0;

    if (mula && tamat && kategori && jenisCuti) {
      salinan[index].hari_dikira = kiraBilanganHari(mula, tamat, kategori, jenisCuti, hariOffVal);
    } else {
      salinan[index].hari_dikira = 0;
    }

    setEntries(salinan);
  };

  const resetBorang = () => {
      setBilanganEntry(1);
      setEntries([janaBarisKosong()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const validEntries = entries.filter(e => e.ic_pegawai !== "");
      if (validEntries.length === 0) { alert("Sila isi sekurang-kurangnya satu permohonan."); setIsSubmitting(false); return; }

      // Semakan Pukal
      for (let i = 0; i < validEntries.length; i++) {
          if (validEntries[i].hari_dikira < 0) { alert(`RALAT BARIS #${i+1}: Tarikh Tamat sebelum Tarikh Mula.`); setIsSubmitting(false); return; }
          if (!validEntries[i].kategori_pegawai) { alert(`RALAT BARIS #${i+1}: Sila pilih Kategori (Pejabat/Sif).`); setIsSubmitting(false); return; }
          if (!validEntries[i].jenis_cuti) { alert(`RALAT BARIS #${i+1}: Sila pilih Jenis Cuti.`); setIsSubmitting(false); return; }

        for (let j = i + 1; j < validEntries.length; j++) {
          if (validEntries[i].ic_pegawai === validEntries[j].ic_pegawai) {
             const mulaI = validEntries[i].tarikh_mula; const tamatI = validEntries[i].tarikh_tamat;
             const mulaJ = validEntries[j].tarikh_mula; const tamatJ = validEntries[j].tarikh_tamat;
             if (mulaI <= tamatJ && tamatI >= mulaJ) { alert(`RALAT DATA PUKAL!\n\nPegawai sama bertindih tarikh (Baris #${i+1} & #${j+1}).`); setIsSubmitting(false); return; }
          }
        }
      }

      // Semakan Database
      for (let i = 0; i < validEntries.length; i++) {
        const item = validEntries[i];
        const semakMula = item.tarikh_mula; const semakTamat = item.tarikh_tamat;

        const { data: dbCuti } = await supabase.from("cuti_transaksi").select("jenis_cuti, tarikh_mula, tarikh_tamat").eq("ic_pegawai", item.ic_pegawai).lte("tarikh_mula", semakTamat).gte("tarikh_tamat", semakMula);
        if (dbCuti && dbCuti.length > 0) { alert(`PERTINDIHAN CUTI (Baris #${i+1})\n\nSudah ada cuti:\n${dbCuti[0].jenis_cuti}\nTarikh: ${dbCuti[0].tarikh_mula} hingga ${dbCuti[0].tarikh_tamat}`); setIsSubmitting(false); return; }

        const { data: dbKursus } = await supabase.from("kursus_rekod").select("jenis_khusus, nama_kursus, tarikh_mula, tarikh_tamat").eq("ic_pegawai", item.ic_pegawai).lte("tarikh_mula", semakTamat).gte("tarikh_tamat", semakMula);
        if (dbKursus && dbKursus.length > 0) {
           const kursusBertindih = dbKursus.find(k => !(k.jenis_khusus === "EPSA" || k.nama_kursus.toLowerCase().includes('epsa')));
           if (kursusBertindih) { alert(`PERTINDIHAN KURSUS (Baris #${i+1})\n\nSedang berkursus:\n${kursusBertindih.nama_kursus}\nTarikh: ${kursusBertindih.tarikh_mula}`); setIsSubmitting(false); return; }
        }
      }

      const today = new Date();
      const tahunSekarang = today.getFullYear();
      const bulan = String(today.getMonth() + 1).padStart(2, '0');
      
      const dataUntukDiSimpan = validEntries.map((item) => {
        const randomNum = Math.floor(Math.random() * 90000) + 10000;
        const customId = `${tahunSekarang}/${bulan}_${randomNum}`;
        return {
          id: customId, ic_pegawai: item.ic_pegawai, kategori_pegawai: item.kategori_pegawai,
          jenis_cuti: item.jenis_cuti, klinik: item.klinik || null,
          tarikh_mula: item.tarikh_mula, tarikh_tamat: item.tarikh_tamat,
          hari_off: parseFloat(item.hari_off) || 0, bilangan_hari: item.hari_dikira,
          tahun: new Date(item.tarikh_mula).getFullYear(), catatan: item.catatan || null,
        };
      });

      const { error } = await supabase.from("cuti_transaksi").insert(dataUntukDiSimpan);
      if (error) throw error;

      alert(`Berjaya! ${dataUntukDiSimpan.length} rekod permohonan cuti telah disimpan.`);
      setIsModalOpen(false);
      resetBorang();
      dapatkanDataCuti(); 

    } catch (err: any) { alert("Gagal menyimpan rekod permohonan: " + err.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Laman */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Senarai Rekod Cuti</h1>
            <p className="text-gray-500 text-sm mt-1">Sistem Pengurusan & Pengiraan Cuti Berjadual</p>
          </div>
          <button 
            onClick={() => { resetBorang(); setIsModalOpen(true); }}
            className="bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm tracking-wide"
          >
            <span className="mr-2">+</span> Permohonan Cuti (Batch)
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4 font-bold border-l-4 border-red-500 text-sm">
            Ralat: {errorMsg}
          </div>
        )}

        {/* Kotak Carian & Filter */}
        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center space-x-3 md:w-1/4">
            <div className="bg-pink-100 text-pink-600 p-2 rounded-lg">🏖️</div>
            <span className="font-bold text-gray-700 text-sm">Tapisan Rekod</span>
          </div>
          <div className="w-full md:w-1/4">
            <select 
              className="w-full border-gray-200 bg-gray-50 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-500 border transition cursor-pointer text-gray-700 font-semibold"
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
              className="w-full border-gray-200 bg-gray-50 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-500 border transition cursor-pointer text-gray-700 font-semibold"
              value={filterBahagian}
              onChange={(e) => setFilterBahagian(e.target.value)}
            >
              <option value="">-- Semua Bahagian --</option>
              {senaraiBahagianUnik.map((bahagian, i) => (
                <option key={i} value={bahagian as string}>{bahagian as string}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center flex-1 bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 w-full focus-within:ring-2 focus-within:ring-pink-500 transition">
            <span className="text-gray-400 mr-2">🔍</span>
            <input 
              type="text"
              placeholder="Cari Nama / KP..."
              className="w-full outline-none text-gray-700 bg-transparent text-sm"
              value={carian}
              onChange={(e) => setCarian(e.target.value)}
            />
          </div>
        </div>

        {/* JADUAL REKOD CUTI (ADMIN VIEW) */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] relative">
            {loading ? (
              <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Sedang memuat turun data rekod...</div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white border-b">
                    <th className="p-4 font-semibold text-center w-12 sticky top-0 bg-slate-800 z-10 shadow-sm border-slate-900">Bil.</th>
                    <th className="p-4 font-semibold sticky top-0 bg-slate-800 z-10 shadow-sm border-slate-900">Nama Pegawai</th>
                    <th className="p-4 font-semibold text-center w-20 sticky top-0 bg-slate-800 z-10 shadow-sm border-slate-900">Kategori</th>
                    <th className="p-4 font-semibold sticky top-0 bg-slate-800 z-10 shadow-sm border-slate-900">Jenis Cuti</th>
                    <th className="p-4 font-semibold sticky top-0 bg-slate-800 z-10 shadow-sm border-slate-900">Tarikh Mula - Tamat</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-slate-800 z-10 shadow-sm border-slate-900">Hari Off</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-slate-800 z-10 shadow-sm border-slate-900">Hari Cuti</th>
                    <th className="p-4 font-semibold sticky top-0 bg-slate-800 z-10 shadow-sm border-slate-900">Catatan</th>
                    <th className="p-4 font-semibold text-center w-24 sticky top-0 bg-slate-800 z-10 shadow-sm border-slate-900">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500">Tiada rekod transaksi cuti dijumpai berdasarkan tapisan.</td>
                    </tr>
                  ) : (
                    currentItems.map((cuti, index) => (
                      <tr key={cuti.id} className="hover:bg-pink-50/50 transition duration-150 group">
                        <td className="p-4 text-gray-600 text-center">{indexOfFirstItem + index + 1}</td>
                        <td className="p-4">
                            <div className="font-semibold text-gray-900">{cuti.pegawai?.nama || 'Tiada Rekod'}</div>
                            <div className="text-xs text-gray-500">{cuti.pegawai?.jabatan_bahagian || '-'}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            cuti.kategori_pegawai === 'Sif' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {cuti.kategori_pegawai || 'Pejabat'}
                          </span>
                        </td>
                        <td className="p-4">
                            <span className="font-semibold text-gray-800">{cuti.jenis_cuti}</span>
                            {cuti.klinik && <span className="ml-2 text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-gray-600">{cuti.klinik}</span>}
                        </td>
                        <td className="p-4 text-gray-600 font-medium">
                            {cuti.tarikh_mula === cuti.tarikh_tamat ? cuti.tarikh_mula : `${cuti.tarikh_mula} s/d ${cuti.tarikh_tamat}`}
                        </td>
                        <td className="p-4 text-center text-gray-500 font-semibold">{cuti.hari_off || '0'}</td>
                        <td className="p-4 font-bold text-center text-pink-600 text-lg">{cuti.bilangan_hari}</td>
                        <td className="p-4 text-gray-500 max-w-[150px] truncate" title={cuti.catatan}>{cuti.catatan || '-'}</td>
                        <td className="p-4 text-center flex justify-center space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => bukaModalEdit(cuti)}
                            title="Edit Cuti"
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-md transition shadow-sm border border-blue-100"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handlePadam(cuti.id, cuti.jenis_cuti, cuti.pegawai?.nama)}
                            title="Padam Cuti"
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-md transition shadow-sm border border-red-100"
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
          
          {/* Kontrol Pagination */}
          {!loading && cutiDitapis.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-sm">
              <span className="text-gray-500 font-medium">
                Papar <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> hingga <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, cutiDitapis.length)}</span> dari <span className="font-bold text-gray-900">{cutiDitapis.length}</span> rekod
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition shadow-sm"
                >
                  &larr; Prev
                </button>
                <div className="flex items-center px-4 font-bold text-pink-700">
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

      {/* MODAL DATA ENTRY PUKAL (BATCH ENTRY) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300">
          <div className="bg-white shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col rounded-2xl overflow-hidden border border-pink-100 transform transition-transform duration-300 scale-100">
            
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-slate-800 text-white shadow-sm">
              <div>
                <h2 className="text-2xl font-bold tracking-wide">Permohonan Cuti (Batch Entry)</h2>
                <p className="text-xs text-slate-300 mt-1">Konfigurasi kemasukan data cuti secara pintar bagi berlainan pegawai</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-400 font-bold text-3xl leading-none transition duration-150">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <form id="batchCutiForm" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="bg-white p-5 rounded-xl border border-pink-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">📊</span>
                    <div>
                      <h3 className="font-bold text-gray-800">KONFIGURASI DATA ENTRY</h3>
                      <p className="text-xs text-gray-500">Pilih bilangan permohonan yang ingin dimasukkan serentak</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-semibold text-gray-700">Bilangan Entry:</label>
                    <select 
                      className="border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 p-2 bg-white text-sm font-bold text-pink-600"
                      value={bilanganEntry} 
                      onChange={(e) => setBilanganEntry(parseInt(e.target.value))}
                    >
                      {[...Array(20)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1} Baris {i === 0 ? '(Tunggal)' : '(Pukal)'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap min-w-[1300px] text-sm">
                        <thead>
                            <tr className="bg-slate-700 text-white text-xs uppercase font-bold border-b">
                                <th className="p-3 w-10 text-center">#</th>
                                <th className="p-3 w-64">NAMA PEGAWAI</th>
                                <th className="p-3 w-40 text-center">KATEGORI</th>
                                <th className="p-3 w-48">JENIS CUTI</th>
                                <th className="p-3 w-36">KLINIK</th>
                                <th className="p-3 w-40">TARIKH MULA</th>
                                <th className="p-3 w-40">TARIKH TAMAT</th>
                                <th className="p-3 w-28 text-center">HARI OFF</th>
                                <th className="p-3 w-24 text-center bg-pink-500/10 text-pink-900">HARI</th>
                                <th className="p-3">CATATAN</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                            {entries.map((item, index) => {
                                const isSakit = item.jenis_cuti === "Cuti Sakit";
                                const isSif = item.kategori_pegawai === "Sif";
                                const isKelompok = item.jenis_cuti === "Cuti Kelompok";
                                const canEditOff = isSif && !isKelompok;

                                return (
                                <tr key={index} className="hover:bg-pink-50/40 transition duration-100">
                                    <td className="p-2 text-center text-gray-400 font-bold">{index + 1}</td>
                                    
                                    <td className="p-2">
                                        <select className="w-full text-xs border-gray-300 rounded focus:ring-pink-500 focus:border-pink-500 font-medium" value={item.ic_pegawai} onChange={(e) => updateEntry(index, 'ic_pegawai', e.target.value)}>
                                            <option value="">Pilih Pegawai...</option>
                                            {pilihanPegawai.map((p) => (<option key={p.ic} value={p.ic}>{p.nama}</option>))}
                                        </select>
                                    </td>

                                    <td className="p-2 text-center">
                                        <select disabled={!item.ic_pegawai} className="w-full text-xs border-gray-300 rounded focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 font-bold text-gray-700" value={item.kategori_pegawai} onChange={(e) => updateEntry(index, 'kategori_pegawai', e.target.value)}>
                                            <option value="">-- Kategori --</option>
                                            <option value="Pejabat">Pejabat</option>
                                            <option value="Sif">Sif</option>
                                        </select>
                                    </td>

                                    <td className="p-2">
                                        <select disabled={!item.ic_pegawai} className="w-full text-xs border-gray-300 rounded focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 font-semibold" value={item.jenis_cuti} onChange={(e) => updateEntry(index, 'jenis_cuti', e.target.value)}>
                                            <option value="">Pilih Jenis Cuti...</option>
                                            <option value="Cuti Rehat">Cuti Rehat</option>
                                            <option value="Cuti Sakit">Cuti Sakit</option>
                                            <option value="Cuti Kelompok">Cuti Kelompok</option>
                                            <option value="Cuti Gantian">Cuti Gantian</option>
                                            <option value="Cuti Bersalin">Cuti Bersalin</option>
                                            <option value="Cuti Tanpa Rekod">Cuti Tanpa Rekod</option>
                                        </select>
                                    </td>

                                    <td className="p-2">
                                        <select disabled={!isSakit} className={`w-full text-xs rounded border-gray-300 focus:ring-pink-500 focus:border-pink-500 ${!isSakit ? 'bg-gray-100 text-gray-400' : 'bg-white font-medium'}`} value={item.klinik} onChange={(e) => updateEntry(index, 'klinik', e.target.value)}>
                                            <option value="">-</option>
                                            <option value="Kerajaan">Kerajaan</option>
                                            <option value="Swasta">Swasta</option>
                                        </select>
                                    </td>

                                    <td className="p-2"><input type="date" disabled={!item.ic_pegawai} className="w-full text-xs border-gray-300 rounded focus:ring-pink-500 disabled:bg-gray-100 font-medium" value={item.tarikh_mula} onChange={(e) => updateEntry(index, 'tarikh_mula', e.target.value)} /></td>
                                    <td className="p-2"><input type="date" disabled={!item.ic_pegawai} className="w-full text-xs border-gray-300 rounded focus:ring-pink-500 disabled:bg-gray-100 font-medium" value={item.tarikh_tamat} onChange={(e) => updateEntry(index, 'tarikh_tamat', e.target.value)} /></td>

                                    <td className="p-2">
                                        <input type="number" min="0" step="0.5" disabled={!canEditOff} className={`w-full text-xs rounded text-center border-gray-300 focus:ring-pink-500 ${!canEditOff ? 'bg-gray-100 text-gray-400' : 'bg-white font-bold text-gray-800'}`} value={item.hari_off} onChange={(e) => updateEntry(index, 'hari_off', e.target.value)} />
                                    </td>

                                    <td className="p-2 text-center bg-pink-500/5">
                                        <input type="text" readOnly className={`w-20 text-center font-bold text-xs rounded border-none focus:outline-none bg-transparent ${item.hari_dikira < 0 ? 'text-red-600 font-extrabold animate-pulse' : 'text-pink-700'}`} value={item.hari_dikira < 0 ? 'Ralat' : `${item.hari_dikira} Hari`} />
                                    </td>

                                    <td className="p-2">
                                        <input type="text" disabled={!item.ic_pegawai} className="w-full text-xs border-gray-300 rounded disabled:bg-gray-100" placeholder="Sebab..." value={item.catatan} onChange={(e) => updateEntry(index, 'catatan', e.target.value)} />
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-gray-200 bg-white flex justify-between items-center shadow-md">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Sistem akan mengira bilangan hari secara pintar.
                </span>
                <div className="flex space-x-3">
                    <button type="button" onClick={resetBorang} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold text-sm transition duration-150">
                      Reset
                    </button>
                    <button type="submit" form="batchCutiForm" disabled={isSubmitting} className="px-10 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold text-sm transition duration-150 flex items-center shadow-md disabled:bg-pink-400">
                      {isSubmitting ? "Sedang Menyimpan..." : "Hantar Semua Permohonan"}
                    </button>
                </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL EDIT (SINGLE ENTRY CUTI) */}
      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white shadow-2xl w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden border border-pink-100">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-white shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 tracking-wide">Kemas Kini Rekod Cuti</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditFormData(null); }} className="text-gray-400 hover:text-red-500 font-bold text-2xl leading-none transition">&times;</button>
            </div>
            
            <div className="flex-1 p-6 bg-slate-50 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nama Pegawai</label>
                <div className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm">
                  {editFormData.nama_pegawai}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Kategori</label>
                  <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white font-bold text-gray-700 text-sm" value={editFormData.kategori_pegawai} onChange={(e) => setEditFormData({...editFormData, kategori_pegawai: e.target.value})}>
                    <option value="Pejabat">Pejabat</option>
                    <option value="Sif">Sif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Jenis Cuti</label>
                  <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white font-bold text-gray-700 text-sm" value={editFormData.jenis_cuti} onChange={(e) => setEditFormData({...editFormData, jenis_cuti: e.target.value})}>
                    <option value="Cuti Rehat">Cuti Rehat</option>
                    <option value="Cuti Sakit">Cuti Sakit</option>
                    <option value="Cuti Kelompok">Cuti Kelompok</option>
                    <option value="Cuti Gantian">Cuti Gantian</option>
                    <option value="Cuti Bersalin">Cuti Bersalin</option>
                    <option value="Cuti Tanpa Rekod">Cuti Tanpa Rekod</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tarikh Mula</label>
                  <input type="date" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white text-sm font-medium" value={editFormData.tarikh_mula} onChange={(e) => setEditFormData({...editFormData, tarikh_mula: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tarikh Tamat</label>
                  <input type="date" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white text-sm font-medium" value={editFormData.tarikh_tamat} onChange={(e) => setEditFormData({...editFormData, tarikh_tamat: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Hari Off (Sif)</label>
                  <input type="number" step="0.5" disabled={editFormData.kategori_pegawai !== "Sif" || editFormData.jenis_cuti === "Cuti Kelompok"} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 disabled:bg-gray-100 disabled:text-gray-400 font-bold bg-white text-sm" value={editFormData.hari_off} onChange={(e) => setEditFormData({...editFormData, hari_off: e.target.value})} />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Bilangan Hari</label>
                  <input type="number" step="0.5" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 font-bold text-pink-600 bg-pink-50 text-sm" value={editFormData.bilangan_hari} onChange={(e) => setEditFormData({...editFormData, bilangan_hari: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Klinik</label>
                  <select disabled={editFormData.jenis_cuti !== "Cuti Sakit"} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 disabled:bg-gray-100 disabled:text-gray-400 bg-white font-medium text-sm" value={editFormData.klinik} onChange={(e) => setEditFormData({...editFormData, klinik: e.target.value})}>
                    <option value="">-</option>
                    <option value="Kerajaan">Kerajaan</option>
                    <option value="Swasta">Swasta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Catatan</label>
                <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white text-sm" placeholder="Catatan permohonan..." value={editFormData.catatan} onChange={(e) => setEditFormData({...editFormData, catatan: e.target.value})} />
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-200 bg-white flex justify-end space-x-3 shadow-md">
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditFormData(null); }} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold text-sm transition duration-150">
                Batal
              </button>
              <button onClick={handleEditSubmit} disabled={isSubmitting} className="px-10 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold text-sm transition duration-150 flex items-center justify-center shadow-md disabled:bg-pink-400">
                {isSubmitting ? "Menyimpan..." : "Kemas Kini Rekod"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}