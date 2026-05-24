"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LaporanIndividu() {
  const [pilihanPegawai, setPilihanPegawai] = useState<any[]>([]);
  const [icDipilih, setIcDipilih] = useState("");
  const [tahunDipilih, setTahunDipilih] = useState(new Date().getFullYear().toString());
  const [jenisLaporan, setJenisLaporan] = useState<"cuti" | "kursus">("cuti"); 
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Data Laporan
  const [profil, setProfil] = useState<any>(null);
  const [bakiCuti, setBakiCuti] = useState<any>(null);
  const [senaraiCuti, setSenaraiCuti] = useState<any[]>([]);
  const [senaraiKursus, setSenaraiKursus] = useState<any[]>([]);

  // Fungsi utiliti untuk format tarikh Malaysia (DD/MM/YYYY)
  const formatTarikhMY = (tarikhDB: string) => {
    if (!tarikhDB) return "-";
    const parts = tarikhDB.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return tarikhDB;
  };

  // Dapatkan senarai dropdown pegawai
  useEffect(() => {
    const ambilPegawai = async () => {
      const { data } = await supabase.from("pegawai").select("ic, nama, jabatan_bahagian").order("nama");
      if (data) setPilihanPegawai(data);
    };
    ambilPegawai();
  }, []);

  const janaLaporan = useCallback(async () => {
    if (!icDipilih) return;
    
    setLoading(true);
    setErrorMsg("");
    try {
      // 1. Ambil Profil Pegawai
      const { data: dataProfil, error: errProfil } = await supabase
        .from("pegawai").select("*").eq("ic", icDipilih).single();
      if (errProfil) throw errProfil;
      setProfil(dataProfil);

      // 2. Ambil Baki Cuti (Tahun dipilih)
      const { data: dataBaki } = await supabase
        .from("cuti_baki").select("*").eq("ic_pegawai", icDipilih).eq("tahun", tahunDipilih).single();
      setBakiCuti(dataBaki || { baki_bawa_hadapan: 0, baki_gantian_jam: 0 });

      // 3. Ambil Rekod Cuti (Tahun dipilih)
      const { data: dataCuti, error: errCuti } = await supabase
        .from("cuti_transaksi").select("*").eq("ic_pegawai", icDipilih).eq("tahun", tahunDipilih).order("tarikh_mula");
      if (errCuti) throw errCuti;
      setSenaraiCuti(dataCuti || []);

      // 4. Ambil Rekod Kursus (Berpandukan Tarikh Mula yang bermula dengan Tahun dipilih)
      const { data: dataKursus, error: errKursus } = await supabase
        .from("kursus_rekod").select("*").eq("ic_pegawai", icDipilih).order("tarikh_mula");
      if (errKursus) throw errKursus;
      
      const kursusTahunIni = (dataKursus || []).filter(k => k.tarikh_mula && k.tarikh_mula.startsWith(tahunDipilih));
      setSenaraiKursus(kursusTahunIni);

    } catch (err: any) {
      setErrorMsg("Gagal menjana laporan: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [icDipilih, tahunDipilih]);

  useEffect(() => {
    if (icDipilih) {
      janaLaporan();
    }
  }, [icDipilih, tahunDipilih, janaLaporan]);

  // Pengiraan Dinamik Cuti
  const kelayakanAsas = profil?.kelayakan_cuti_asas || 0;
  const bawaHadapan = bakiCuti?.baki_bawa_hadapan || 0;
  const jumlahCutiRehatDiambil = senaraiCuti.filter(c => c.jenis_cuti === "Cuti Rehat").reduce((acc, curr) => acc + (curr.bilangan_hari || 0), 0);
  const bakiSemasaCuti = (kelayakanAsas + bawaHadapan) - jumlahCutiRehatDiambil;
  
  // Pengiraan Dinamik Kursus
  const jumlahJamKursus = senaraiKursus.reduce((acc, curr) => acc + (curr.jumlah_jam || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-8 print:p-0 relative">
      
      {/* CSS KHUSUS UNTUK PRINTING YANG TELAH DIKEMAS KINI (KALIS PECAH) */}
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
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          .overflow-y-auto, .overflow-hidden {
            overflow: visible !important;
          }
          aside, nav {
            display: none !important;
          }
          main {
            flex: none !important;
            width: 100% !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-hide {
            display: none !important;
          }
          table { page-break-inside: auto; width: 100% !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          #laporan-dokumen {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            background-color: transparent !important;
          }
        }
      `}} />

      {/* HEADER & KAWALAN (Sembunyi semasa print) */}
      <div className="max-w-5xl mx-auto mb-6 print-hide relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-emerald-900">Laporan Individu Pegawai</h1>
            <p className="text-emerald-700 text-sm mt-1 font-medium">Jana laporan rasmi untuk rekod Cuti atau Kursus.</p>
          </div>
          <button 
            onClick={handlePrint}
            disabled={!profil}
            className="mt-4 md:mt-0 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white px-5 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm"
          >
            <span className="mr-2">🖨️</span> Cetak / Simpan PDF
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur p-5 rounded-xl shadow-sm border border-emerald-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-2/4">
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Cari Pegawai</label>
            <select 
              className="w-full border-emerald-200 bg-white rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 border transition cursor-pointer font-bold text-emerald-900 shadow-sm"
              value={icDipilih}
              onChange={(e) => setIcDipilih(e.target.value)}
            >
              <option value="">-- Sila Pilih Pegawai --</option>
              {pilihanPegawai.map((p) => (
                <option key={p.ic} value={p.ic}>{p.nama} ({p.jabatan_bahagian})</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Pilih Tahun</label>
            <select 
              className="w-full border-emerald-200 bg-white rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 border transition cursor-pointer font-bold text-teal-700 shadow-sm"
              value={tahunDipilih}
              onChange={(e) => setTahunDipilih(e.target.value)}
            >
              <option value="2024">Tahun 2024</option>
              <option value="2025">Tahun 2025</option>
              <option value="2026">Tahun 2026</option>
              <option value="2027">Tahun 2027</option>
            </select>
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Jenis Laporan</label>
            <select 
              className="w-full border-emerald-200 bg-white rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 border transition cursor-pointer font-bold text-emerald-900 shadow-sm"
              value={jenisLaporan}
              onChange={(e) => setJenisLaporan(e.target.value as "cuti" | "kursus")}
            >
              <option value="cuti">Laporan Cuti</option>
              <option value="kursus">Laporan Kursus</option>
            </select>
          </div>
        </div>
        
        {errorMsg && <div className="mt-4 bg-red-100 text-red-700 p-4 rounded-md font-bold text-sm border-l-4 border-red-500">{errorMsg}</div>}
      </div>

      {loading && <div className="text-center py-20 text-emerald-700 font-bold animate-pulse print-hide relative z-10">Sedang memproses laporan...</div>}

      {/* ========================================================================= */}
      {/* DOKUMEN CETAKAN DENGAN WATERMARK LOGO */}
      {/* ========================================================================= */}
      {!loading && profil && (
        <div id="laporan-dokumen" className="max-w-5xl mx-auto bg-white/95 backdrop-blur rounded-xl shadow-lg border border-emerald-100 overflow-hidden print:shadow-none print:border-none relative z-10 print:bg-transparent">
          
          {/* WATERMARK LOGO JABATAN IMIGRESEN (HANYA MUNCUL BILA CETAK) */}
          <div className="hidden print:flex fixed inset-0 items-center justify-center pointer-events-none -z-10">
             <img 
               src="/logo-imigresen.jpg" 
               alt="Watermark Imigresen" 
               className="w-[500px] opacity-[0.08]" 
               style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
             />
          </div>

          {/* HEADER DOKUMEN DINAMIK */}
          <div className="border-b-4 border-emerald-800 p-8 text-center bg-emerald-50/50 print:bg-transparent relative z-10">
            <h1 className="text-2xl font-black text-emerald-900 uppercase tracking-widest">
              {jenisLaporan === 'cuti' ? 'Laporan Cuti Kakitangan' : 'Laporan Kursus & Latihan Kakitangan'}
            </h1>
            <p className="text-emerald-700 font-semibold mt-1">Sistem Pengurusan e-Pegawai Imigresen (Tahun {tahunDipilih})</p>
          </div>

          <div className="p-8 space-y-8 relative z-10">
            
            {/* BAHAGIAN: MAKLUMAT PEGAWAI */}
            <div>
              <h2 className="text-lg font-bold text-emerald-900 border-b-2 border-emerald-200 pb-2 mb-4">MAKLUMAT PEGAWAI</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div><span className="text-emerald-700 block text-xs font-bold uppercase mb-1">Nama Penuh</span><span className="font-bold text-emerald-900 text-base uppercase">{profil.nama}</span></div>
                <div><span className="text-emerald-700 block text-xs font-bold uppercase mb-1">No. Kad Pengenalan</span><span className="font-mono text-emerald-900 font-semibold">{profil.ic}</span></div>
                <div><span className="text-emerald-700 block text-xs font-bold uppercase mb-1">Jawatan & Gred</span><span className="font-bold text-emerald-900 uppercase">{profil.gred || '-'}</span></div>
                <div><span className="text-emerald-700 block text-xs font-bold uppercase mb-1">Bahagian / Unit</span><span className="font-bold text-emerald-900 uppercase">{profil.jabatan_bahagian || '-'}</span></div>
              </div>
            </div>

            {/* JIKA LAPORAN CUTI DIPILIH */}
            {jenisLaporan === 'cuti' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-emerald-900 border-b-2 border-emerald-200 pb-2 mb-4">RINGKASAN CUTI TAHUNAN ({tahunDipilih})</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-emerald-50/50 print:bg-transparent p-4 rounded-lg border border-emerald-200 text-center">
                      <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Kelayakan Asas</div>
                      <div className="text-2xl font-black text-emerald-900">{kelayakanAsas}</div>
                    </div>
                    <div className="bg-teal-50 print:bg-transparent p-4 rounded-lg border border-teal-200 text-center">
                      <div className="text-xs font-bold text-teal-600 uppercase mb-1">Bawa Hadapan</div>
                      <div className="text-2xl font-black text-teal-800">+{bawaHadapan}</div>
                    </div>
                    <div className="bg-red-50 print:bg-transparent p-4 rounded-lg border border-red-200 text-center">
                      <div className="text-xs font-bold text-red-500 uppercase mb-1">Telah Diambil</div>
                      <div className="text-2xl font-black text-red-600">-{jumlahCutiRehatDiambil}</div>
                    </div>
                    <div className="bg-emerald-100 print:bg-transparent p-4 rounded-lg border border-emerald-300 text-center shadow-inner">
                      <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Baki Semasa</div>
                      <div className="text-2xl font-black text-emerald-800">{bakiSemasaCuti}</div>
                    </div>
                    <div className="bg-orange-50 print:bg-transparent p-4 rounded-lg border border-orange-200 text-center">
                      <div className="text-xs font-bold text-orange-600 uppercase mb-1">Cuti Gantian</div>
                      <div className="text-2xl font-black text-orange-700">{bakiCuti.baki_gantian_jam || 0} <span className="text-sm font-medium">Jam</span></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-emerald-900 border-b-2 border-emerald-200 pb-2 mb-4">REKOD TRANSAKSI CUTI ({tahunDipilih})</h2>
                  {senaraiCuti.length === 0 ? (
                    <p className="text-sm text-emerald-700 italic border border-emerald-200 p-6 text-center bg-transparent rounded-lg font-medium">Tiada rekod cuti diambil pada tahun ini.</p>
                  ) : (
                    <table className="w-full text-left border-collapse text-sm bg-transparent">
                      <thead>
                        <tr className="bg-emerald-50 print:bg-transparent text-emerald-900 border-y-2 border-emerald-300">
                          <th className="p-3 border border-emerald-200 w-10 text-center font-bold">Bil</th>
                          <th className="p-3 border border-emerald-200 w-48 font-bold">Jenis Cuti</th>
                          <th className="p-3 border border-emerald-200 w-64 whitespace-nowrap font-bold">Tarikh</th>
                          <th className="p-3 border border-emerald-200 w-16 text-center font-bold">Hari</th>
                          <th className="p-3 border border-emerald-200 font-bold">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="bg-transparent">
                        {senaraiCuti.map((cuti, i) => (
                          <tr key={i} className="bg-transparent">
                            <td className="p-3 border border-emerald-200 text-center text-emerald-800 font-medium">{i + 1}</td>
                            <td className="p-3 border border-emerald-200 font-bold text-emerald-900">{cuti.jenis_cuti} {cuti.klinik ? `(${cuti.klinik})` : ''}</td>
                            <td className="p-3 border border-emerald-200 text-emerald-800 whitespace-nowrap font-medium">
                              {cuti.tarikh_mula === cuti.tarikh_tamat ? formatTarikhMY(cuti.tarikh_mula) : `${formatTarikhMY(cuti.tarikh_mula)} hingga ${formatTarikhMY(cuti.tarikh_tamat)}`}
                            </td>
                            <td className="p-3 border border-emerald-200 text-center font-bold text-teal-700">{cuti.bilangan_hari}</td>
                            <td className="p-3 border border-emerald-200 text-emerald-700 italic">{cuti.catatan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* JIKA LAPORAN KURSUS DIPILIH */}
            {jenisLaporan === 'kursus' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-emerald-900 border-b-2 border-emerald-200 pb-2 mb-4">PEMANTAUAN KPI KURSUS ({tahunDipilih})</h2>
                  <div className="flex gap-4">
                    <div className="bg-emerald-50/50 print:bg-transparent p-5 rounded-lg border border-emerald-200 min-w-[200px]">
                      <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Jumlah Jam Terkumpul</div>
                      <div className="text-3xl font-black text-emerald-900">{jumlahJamKursus} <span className="text-lg font-medium text-emerald-600">Jam</span></div>
                    </div>
                    <div className={`p-5 rounded-lg border border-emerald-200 min-w-[200px] flex flex-col justify-center print:bg-transparent ${jumlahJamKursus >= 40 ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                      <div className={`text-xs font-bold uppercase mb-1 ${jumlahJamKursus >= 40 ? 'text-teal-700' : 'text-orange-700'}`}>Status Pencapaian (40 Jam)</div>
                      <div className={`text-2xl font-black ${jumlahJamKursus >= 40 ? 'text-teal-800' : 'text-orange-800'}`}>
                        {jumlahJamKursus >= 40 ? '✅ TELAH CAPAI' : '⚠️ BELUM CAPAI'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h2 className="text-lg font-bold text-emerald-900 border-b-2 border-emerald-200 pb-2 mb-4">REKOD KURSUS & LATIHAN ({tahunDipilih})</h2>
                  {senaraiKursus.length === 0 ? (
                    <p className="text-sm text-emerald-700 italic border border-emerald-200 p-6 text-center bg-transparent rounded-lg font-medium">Tiada rekod kursus dihadiri pada tahun ini.</p>
                  ) : (
                    <table className="w-full text-left border-collapse text-sm bg-transparent">
                      <thead>
                        <tr className="bg-emerald-50 print:bg-transparent text-emerald-900 border-y-2 border-emerald-300">
                          <th className="p-3 border border-emerald-200 w-10 text-center font-bold">Bil</th>
                          <th className="p-3 border border-emerald-200 w-36 font-bold">Kategori / Jenis</th>
                          <th className="p-3 border border-emerald-200 font-bold">Tajuk Kursus</th>
                          <th className="p-3 border border-emerald-200 w-56 whitespace-nowrap font-bold">Tarikh</th>
                          <th className="p-3 border border-emerald-200 w-16 text-center font-bold">Jam</th>
                        </tr>
                      </thead>
                      <tbody className="bg-transparent">
                        {senaraiKursus.map((kursus, i) => (
                          <tr key={i} className="bg-transparent">
                            <td className="p-3 border border-emerald-200 text-center text-emerald-800 font-medium">{i + 1}</td>
                            <td className="p-3 border border-emerald-200 text-xs text-emerald-800">
                              <div className="font-bold text-emerald-900">{kursus.kategori_utama || '-'}</div>
                              <div className="text-emerald-600 mt-1">{kursus.jenis_khusus || ''}</div>
                            </td>
                            <td className="p-3 border border-emerald-200 font-bold text-emerald-900 uppercase">{kursus.nama_kursus}</td>
                            <td className="p-3 border border-emerald-200 text-emerald-800 text-xs whitespace-nowrap font-medium">
                              {kursus.tarikh_mula === kursus.tarikh_tamat ? formatTarikhMY(kursus.tarikh_mula) : `${formatTarikhMY(kursus.tarikh_mula)} hingga ${formatTarikhMY(kursus.tarikh_tamat)}`}
                            </td>
                            <td className="p-3 border border-emerald-200 text-center font-bold text-teal-700">{kursus.jumlah_jam}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

          </div>
          
          <div className="p-6 text-center text-xs text-emerald-600 border-t border-emerald-200 bg-emerald-50/50 print:bg-transparent mt-10 relative z-10 font-bold">
            Janaan Sistem e-Pegawai Imigresen • Dicetak pada: {new Date().toLocaleString('ms-MY')}
          </div>

        </div>
      )}

      {/* Paparan Kosong jika tiada pegawai dipilih */}
      {!loading && !profil && (
        <div className="max-w-5xl mx-auto bg-white/90 backdrop-blur p-16 rounded-xl border border-dashed border-emerald-300 text-center print-hide relative z-10">
          <div className="text-4xl mb-4">🗂️</div>
          <h3 className="text-lg font-bold text-emerald-900">Sila pilih nama pegawai</h3>
          <p className="text-emerald-700 text-sm mt-2 font-medium">Laporan khusus akan dipaparkan mengikut jenis laporan yang dipilih.</p>
        </div>
      )}

    </div>
  );
}