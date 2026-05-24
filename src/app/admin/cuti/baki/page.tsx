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

  // State untuk Toggle Hide/Show Kolum 3 & 4
  const [showButiranCR, setShowButiranCR] = useState(true);

  // State untuk Modal Kemas Kini Baki
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    nama_pegawai: "",
    baki_bawa_hadapan: "0",
    baki_gantian_jam: "0",
  });

  // =======================================================================
  // LOGIK SUSUNAN BAHAGIAN & PANGKAT (Hierarki Sama Seperti Senarai Pegawai)
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
    const deptA = a.pegawai?.jabatan_bahagian || "";
    const deptB = b.pegawai?.jabatan_bahagian || "";
    const indexA = getDeptIndex(deptA);
    const indexB = getDeptIndex(deptB);
    
    if (indexA !== indexB) return indexA - indexB; 

    const rankA = getRank(a.pegawai?.gred);
    const rankB = getRank(b.pegawai?.gred);
    
    if (rankA.prefixPriority !== rankB.prefixPriority) return rankB.prefixPriority - rankA.prefixPriority; 
    if (rankA.num !== rankB.num) return rankB.num - rankA.num; 
    if (rankA.tbk !== rankB.tbk) return rankA.tbk ? 1 : -1; 
    
    return (a.pegawai?.nama || "").localeCompare(b.pegawai?.nama || ""); 
  };


  // =======================================================================
  // LOGIK MENARIK & MENGIRA BAKI KESELURUHAN
  // =======================================================================
  const dapatkanBakiCuti = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil rekod baki tahunan
      const { data: dataBaki, error: ralatBaki } = await supabase
        .from("cuti_baki")
        .select(`
          id, ic_pegawai, tahun, baki_bawa_hadapan, baki_gantian_jam,
          pegawai ( nama, jabatan_bahagian, kelayakan_cuti_asas, gred )
        `)
        .eq("tahun", tahunDipilih);

      if (ralatBaki) throw ralatBaki;

      // 2. Ambil KESEMUA transaksi cuti untuk tahun ini
      const { data: dataTransaksi, error: ralatTransaksi } = await supabase
        .from("cuti_transaksi")
        .select("ic_pegawai, bilangan_hari, jenis_cuti, klinik")
        .eq("tahun", tahunDipilih);

      if (ralatTransaksi) throw ralatTransaksi;

      // 3. Petakan dan Kira Baki
      const dataLengkap = (dataBaki || []).map((rekod) => {
        const cutiPegawaiIni = dataTransaksi?.filter(cuti => cuti.ic_pegawai === rekod.ic_pegawai) || [];

        let cr_diambil = 0, kelompok_diambil = 0, sakit_gov_diambil = 0, sakit_swasta_diambil = 0;

        cutiPegawaiIni.forEach(c => {
            if (c.jenis_cuti === "Cuti Rehat") cr_diambil += (c.bilangan_hari || 0);
            else if (c.jenis_cuti === "Cuti Kelompok" || c.jenis_cuti === "Cuti Tanpa Rekod") kelompok_diambil += (c.bilangan_hari || 0);
            else if (c.jenis_cuti === "Cuti Sakit") {
                if (c.klinik === "Kerajaan") sakit_gov_diambil += (c.bilangan_hari || 0);
                if (c.klinik === "Swasta") sakit_swasta_diambil += (c.bilangan_hari || 0);
            }
        });

        const peg: any = rekod.pegawai;
        const dataPegawai = Array.isArray(peg) ? peg[0] : peg;

        const kelayakanAsas = dataPegawai?.kelayakan_cuti_asas || 0;
        const bawaHadapan = rekod.baki_bawa_hadapan || 0;

        return {
          ...rekod,
          pegawai: dataPegawai, 
          baki_cr: (kelayakanAsas + bawaHadapan) - cr_diambil,
          baki_kelompok: 20 - kelompok_diambil,
          baki_sakit_gov: 90 - sakit_gov_diambil,
          baki_sakit_swasta: 15 - sakit_swasta_diambil
        };
      });

      // 4. Susun ikut Hierarki Pangkat
      dataLengkap.sort(sortPegawaiMengikutPangkat);

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

  // Ekstrak senarai bahagian untuk filter
  const senaraiBahagianUnik = Array.from(
    new Set(bakiCuti.map((r) => r.pegawai?.jabatan_bahagian).filter(Boolean))
  ).sort((a, b) => getDeptIndex(a as string) - getDeptIndex(b as string));

  // Tapis data untuk skrin utama
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
    <div className="p-8 bg-gray-50 min-h-screen print:p-0 print:bg-white relative">
      
      {/* ========================================================
        CSS CETAKAN PROFESIONAL (PRINT CSS) 
        ======================================================== */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0.5cm; }
          body, html { 
            background-color: white !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            height: auto !important;
          }
          .h-screen, .min-h-screen, .max-h-screen, .h-full {
            height: auto !important; min-height: 0 !important; max-height: none !important;
          }
          .overflow-y-auto, .overflow-hidden, .overflow-x-auto {
            overflow: visible !important;
          }
          aside, nav { display: none !important; }
          main {
            flex: none !important; width: 100% !important; overflow: visible !important;
            margin: 0 !important; padding: 0 !important;
          }
          .print-hide { display: none !important; }
          table { border-collapse: collapse !important; width: 100% !important; table-layout: auto; position: relative; z-index: 10;}
          th, td { padding: 8px !important; border: 1px solid #cbd5e1 !important; }
          thead th { background-color: transparent !important; color: #1e293b !important; white-space: normal !important; }
        }
      `}} />

      {/* 1. PAPARAN SISTEM (DISEMBUNYIKAN SEMASA CETAK) */}
      <div className="max-w-[1400px] mx-auto print-hide">
        
        {/* Header Laman */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Pemantauan Baki Cuti Semasa</h1>
            <p className="text-gray-500 text-sm mt-1">Sistem akan mengira baki cuti tahunan pegawai secara automatik</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowButiranCR(!showButiranCR)}
              className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg shadow-sm border border-slate-300 transition flex items-center font-bold text-sm tracking-wide"
            >
              <span className="mr-2">{showButiranCR ? '👁️' : '👁️‍🗨️'}</span>
              {showButiranCR ? 'Sembunyi Butiran CR' : 'Papar Butiran CR'}
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm tracking-wide"
            >
              <span className="mr-2">🖨️</span> Cetak PDF
            </button>
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
                      <option value="2027">2027</option>
                  </select>
              </div>
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
              <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Sedang memproses rekod baki cuti...</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white leading-tight">
                    <th className="p-3 font-semibold text-center w-12 sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900 align-middle">Bil.</th>
                    <th className="p-3 font-semibold sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900 align-middle whitespace-normal">Nama Pegawai / Bahagian</th>
                    
                    {showButiranCR && (
                      <>
                        <th className="p-3 font-semibold text-center w-28 min-w-[6rem] sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900 text-blue-300 align-middle whitespace-normal">
                          Cuti Rehat<br/>(Carry Forward)
                        </th>
                        <th className="p-3 font-semibold text-center w-28 min-w-[6rem] sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900 text-blue-300 align-middle whitespace-normal">
                          Cuti Rehat<br/>(Tahun Semasa)
                        </th>
                      </>
                    )}
                    
                    <th className="p-3 font-bold text-center w-28 min-w-[6rem] sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900 text-emerald-300 text-[13px] align-middle whitespace-normal">
                      Baki<br/>Cuti Rehat
                    </th>
                    <th className="p-3 font-semibold text-center w-28 min-w-[6rem] sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900 text-orange-300 align-middle whitespace-normal">
                      Cuti Gantian<br/>(Jam)
                    </th>
                    <th className="p-3 font-semibold text-center w-28 min-w-[6rem] sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900 text-purple-300 align-middle whitespace-normal">
                      CTRK
                    </th>
                    <th className="p-3 font-semibold text-center w-28 min-w-[6rem] sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900 text-pink-300 align-middle whitespace-normal">
                      Cuti Sakit<br/>(Gov)
                    </th>
                    <th className="p-3 font-semibold text-center w-28 min-w-[6rem] sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900 text-rose-300 align-middle whitespace-normal">
                      Cuti Sakit<br/>(Private)
                    </th>
                    <th className="p-3 font-semibold text-center w-28 min-w-[6rem] sticky top-0 bg-slate-800 z-10 shadow-sm border-b border-slate-900 align-middle whitespace-normal">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={showButiranCR ? 10 : 8} className="p-8 text-center text-gray-500">
                        {carian || filterBahagian ? "Tiada rekod sepadan dengan carian/tapisan." : "Tiada data baki cuti dijumpai untuk tahun ini."}
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((rekod, index) => (
                      <tr key={rekod.id} className="hover:bg-slate-50 transition duration-150">
                        <td className="p-3 text-gray-500 text-center font-medium align-middle">{indexOfFirstItem + index + 1}</td>
                        <td className="p-3 whitespace-normal break-words min-w-[200px] align-middle">
                          <p className="font-bold text-gray-900 uppercase leading-snug">{rekod.pegawai?.nama || 'Tiada Rekod'}</p>
                          <p className="text-[11px] font-bold text-gray-500 mt-1">{rekod.pegawai?.gred} • {rekod.pegawai?.jabatan_bahagian || '-'}</p>
                        </td>
                        
                        {showButiranCR && (
                          <>
                            <td className="p-3 text-center text-blue-700 font-bold bg-blue-50/30 border-x border-gray-100 align-middle">{rekod.baki_bawa_hadapan || 0}</td>
                            <td className="p-3 text-center text-blue-700 font-bold bg-blue-50/30 align-middle">{rekod.pegawai?.kelayakan_cuti_asas || 0}</td>
                          </>
                        )}
                        
                        <td className="p-3 text-center border-x border-gray-100 align-middle">
                          <span className={`inline-block px-3 py-1 rounded border font-extrabold text-sm shadow-sm ${
                            rekod.baki_cr > 5 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 
                            rekod.baki_cr > 0 ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-red-100 text-red-800 border-red-200'
                          }`}>
                            {rekod.baki_cr}
                          </span>
                        </td>
                        <td className="p-3 text-center text-orange-700 font-bold bg-orange-50/30 border-r border-gray-100 align-middle">{rekod.baki_gantian_jam || 0}</td>
                        <td className="p-3 text-center text-purple-700 font-bold bg-purple-50/30 border-r border-gray-100 align-middle">{rekod.baki_kelompok}</td>
                        <td className="p-3 text-center text-pink-700 font-bold bg-pink-50/30 border-r border-gray-100 align-middle">{rekod.baki_sakit_gov}</td>
                        <td className="p-3 text-center text-rose-700 font-bold bg-rose-50/30 border-r border-gray-100 align-middle">{rekod.baki_sakit_swasta}</td>
                        
                        <td className="p-3 flex justify-center align-middle">
                          <button 
                            onClick={() => bukaModalEdit(rekod)}
                            className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-blue-600 px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium shadow-sm"
                >
                  &larr; Prev
                </button>
                <div className="flex items-center px-4 font-bold text-blue-700">
                  {currentPage} / {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium shadow-sm"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* =================================================================================== */}
      {/* 2. PAPARAN CETAKAN KHAS (HANYA KELIHATAN WAKTU PRINT) DENGAN WATERMARK LOGO         */}
      {/* =================================================================================== */}
      <div className="hidden print:block w-full bg-transparent text-black p-8 relative z-0">
        
        {/* WATERMARK LOGO JABATAN IMIGRESEN */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none -z-10">
           <img 
             src="/logo-imigresen.jpg" 
             alt="Watermark Imigresen" 
             className="w-[500px] opacity-[0.08]" 
             style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
           />
        </div>

        {/* Header Cetakan */}
        <div className="text-center mb-6 border-b-2 border-slate-400 pb-6 relative z-10">
          <h2 className="text-2xl font-black uppercase tracking-widest text-slate-800">
            Laporan Baki Cuti Terkini Kakitangan
          </h2>
          <p className="font-bold mt-2 text-lg text-slate-600">Sistem Pengurusan e-Pegawai Imigresen (Tahun {tahunDipilih})</p>
          {filterBahagian && <p className="font-semibold mt-1 text-slate-500 uppercase">Bahagian: {filterBahagian}</p>}
          <p className="font-semibold mt-1 text-slate-500">Jumlah Rekod: {bakiDitapis.length} Pegawai</p>
        </div>
        
        {/* Jadual Cetakan: Reka Bentuk Kemas & Sama Saiz */}
        <table className="w-full text-left text-[11px] border-collapse relative z-10 bg-transparent">
          <thead>
            <tr className="bg-transparent border-y-2 border-slate-400 text-slate-800 leading-tight">
              <th className="py-2 px-2 font-bold text-center w-8 border border-slate-300 align-middle">Bil.</th>
              <th className="py-2 px-2 font-bold border border-slate-300 align-middle whitespace-normal">Nama Pegawai & Bahagian</th>
              
              {showButiranCR && (
                <>
                  <th className="py-2 px-1 font-bold text-center w-[9%] border border-slate-300 align-middle whitespace-normal">Cuti Rehat<br/>(Carry Forward)</th>
                  <th className="py-2 px-1 font-bold text-center w-[9%] border border-slate-300 align-middle whitespace-normal">Cuti Rehat<br/>(Tahun Semasa)</th>
                </>
              )}
              
              <th className="py-2 px-1 font-bold text-center w-[9%] border border-slate-300 text-emerald-800 align-middle whitespace-normal">Baki<br/>Cuti Rehat</th>
              <th className="py-2 px-1 font-bold text-center w-[9%] border border-slate-300 text-orange-800 align-middle whitespace-normal">Cuti Gantian<br/>(Jam)</th>
              <th className="py-2 px-1 font-bold text-center w-[9%] border border-slate-300 align-middle whitespace-normal">CTRK</th>
              <th className="py-2 px-1 font-bold text-center w-[9%] border border-slate-300 align-middle whitespace-normal">Cuti Sakit<br/>(Gov)</th>
              <th className="py-2 px-1 font-bold text-center w-[9%] border border-slate-300 align-middle whitespace-normal">Cuti Sakit<br/>(Private)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300 bg-transparent">
            {bakiDitapis.length === 0 ? (
              <tr>
                <td colSpan={showButiranCR ? 9 : 7} className="py-8 text-center font-medium italic text-gray-500 border border-slate-300">Tiada rekod baki dijumpai.</td>
              </tr>
            ) : (
              bakiDitapis.map((rekod, index) => (
                <tr key={rekod.id} className="break-inside-avoid">
                  <td className="py-3 px-2 text-center text-gray-600 font-medium border border-slate-300 align-middle">{index + 1}</td>
                  <td className="py-3 px-2 border border-slate-300 align-middle whitespace-normal">
                    <div className="font-bold text-slate-900 uppercase leading-tight">{rekod.pegawai?.nama}</div>
                    <div className="text-[10px] text-gray-500 font-semibold mt-1">{rekod.pegawai?.gred} • {rekod.pegawai?.jabatan_bahagian}</div>
                  </td>
                  
                  {showButiranCR && (
                    <>
                      <td className="py-3 px-1 text-center font-semibold border border-slate-300 align-middle">{rekod.baki_bawa_hadapan || 0}</td>
                      <td className="py-3 px-1 text-center font-semibold border border-slate-300 align-middle">{rekod.pegawai?.kelayakan_cuti_asas || 0}</td>
                    </>
                  )}
                  
                  <td className="py-3 px-1 text-center border border-slate-300 align-middle">
                     <span className="font-black text-sm text-emerald-800">{rekod.baki_cr}</span>
                  </td>
                  <td className="py-3 px-1 text-center font-semibold border border-slate-300 align-middle">{rekod.baki_gantian_jam || 0}</td>
                  <td className="py-3 px-1 text-center font-semibold border border-slate-300 align-middle">{rekod.baki_kelompok}</td>
                  <td className="py-3 px-1 text-center font-semibold border border-slate-300 align-middle">{rekod.baki_sakit_gov}</td>
                  <td className="py-3 px-1 text-center font-semibold border border-slate-300 align-middle">{rekod.baki_sakit_swasta}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        <div className="mt-8 text-center text-xs text-gray-500 italic relative z-10">
          Dicetak oleh Sistem e-Pegawai pada: {new Date().toLocaleString('ms-MY')}
        </div>
      </div>

      {/* MODAL KEMAS KINI BAKI (EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity print-hide">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform scale-100 transition-transform">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-white rounded-t-2xl shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 tracking-wide">Kemas Kini Manual</h2>
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
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Cuti Bawa Hadapan (CF)</label>
                <input 
                  type="number" 
                  step="0.5"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 text-sm bg-white"
                  value={formData.baki_bawa_hadapan}
                  onChange={(e) => setFormData({...formData, baki_bawa_hadapan: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Baki Cuti Gantian (Jam)</label>
                <input 
                  type="number" 
                  step="0.5"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-orange-700 text-sm bg-white"
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
                  className="px-8 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition disabled:bg-slate-400 font-bold text-sm shadow-md"
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