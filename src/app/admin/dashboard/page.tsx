"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  
  // State untuk maklumat Dashboard
  const [jumlahPegawai, setJumlahPegawai] = useState(0);
  
  const [cutiHariIni, setCutiHariIni] = useState<any[]>([]);
  const [aktivitiTerkini, setAktivitiTerkini] = useState<any[]>([]);
  
  const [kpiStats, setKpiStats] = useState({
    capai: 0,
    belum: 0,
    peratus: 0,
    tahun: new Date().getFullYear().toString()
  });

  // Fungsi utiliti untuk format tarikh Malaysia (DD/MM/YYYY)
  const formatTarikhMY = (tarikhDB: string) => {
    if (!tarikhDB) return "-";
    const [year, month, day] = tarikhDB.split("-");
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    async function muatTurunDataDashboard() {
      try {
        setLoading(true);
        
        // Dapatkan tarikh hari ini dalam format YYYY-MM-DD
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const currentYear = d.getFullYear().toString();

        // 1. Dapatkan senarai semua Pegawai (Untuk pengiraan asas)
        const { data: pegawaiData } = await supabase.from("pegawai").select("ic, nama");
        const totalPegawai = pegawaiData?.length || 0;
        setJumlahPegawai(totalPegawai);

        // 2. Dapatkan senarai Pegawai yang Bercuti HARI INI
        const { data: dataCutiHariIni } = await supabase
          .from("cuti_transaksi")
          .select("id, jenis_cuti, tarikh_mula, tarikh_tamat, pegawai(nama, jabatan_bahagian)")
          .lte("tarikh_mula", today)
          .gte("tarikh_tamat", today);
        
        setCutiHariIni(dataCutiHariIni || []);

        // 3. Dapatkan data Kursus untuk KPI 40 Jam (Tahun Semasa)
        const { data: kursusData } = await supabase
          .from("kursus_rekod")
          .select("ic_pegawai, jumlah_jam")
          .gte("tarikh_mula", `${currentYear}-01-01`)
          .lte("tarikh_mula", `${currentYear}-12-31`);

        // Kira jam setiap pegawai
        const jamPegawai: Record<string, number> = {};
        pegawaiData?.forEach(p => jamPegawai[p.ic] = 0); // Tetapkan nilai asal 0
        
        kursusData?.forEach(k => {
           if (k.ic_pegawai && jamPegawai[k.ic_pegawai] !== undefined) {
               jamPegawai[k.ic_pegawai] += (parseFloat(k.jumlah_jam) || 0);
           }
        });

        let bilanganCapai = 0;
        Object.values(jamPegawai).forEach(jam => {
           if (jam >= 40) bilanganCapai++;
        });

        const bilanganBelum = totalPegawai - bilanganCapai;
        const peratusanKPI = totalPegawai === 0 ? 0 : Math.round((bilanganCapai / totalPegawai) * 100);

        setKpiStats({
          capai: bilanganCapai,
          belum: bilanganBelum,
          peratus: peratusanKPI,
          tahun: currentYear
        });

        // 4. Ambil 5 permohonan cuti yang paling terkini
        const { data: cutiTerkini } = await supabase
          .from("cuti_transaksi")
          .select(`
            id, jenis_cuti, tarikh_mula, tarikh_tamat, created_at,
            pegawai ( nama, jabatan_bahagian )
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        setAktivitiTerkini(cutiTerkini || []);

      } catch (error) {
        console.error("Ralat memuat turun data dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    muatTurunDataDashboard();
  }, []);

  return (
    <div className="p-8 bg-transparent min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER DASHBOARD */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emerald-900">Dashboard Pentadbir</h1>
            <p className="text-emerald-700 mt-1 font-medium">Pusat Pemantauan Kakitangan (Live)</p>
          </div>
          <div className="mt-4 md:mt-0 bg-white/90 backdrop-blur px-4 py-2 rounded-lg border border-emerald-200 shadow-sm text-sm font-bold text-emerald-800 flex items-center">
            📅 {new Date().toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-emerald-200">
            <div className="text-4xl animate-bounce mb-3">📊</div>
            <p className="text-emerald-600 font-bold text-lg animate-pulse tracking-wide">Menyusun Data Dashboard...</p>
          </div>
        ) : (
          <>
            {/* ========================================== */}
            {/* BARIS 1: KAD STATISTIK UTAMA               */}
            {/* ========================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              
              {/* Kad 1: Jumlah Kakitangan */}
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-emerald-100 p-6 flex items-center hover:shadow-md transition">
                <div className="bg-emerald-100 text-emerald-600 w-14 h-14 rounded-xl flex items-center justify-center text-3xl mr-5">
                  👥
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Jumlah Kakitangan</p>
                  <p className="text-3xl font-black text-emerald-900 mt-1">{jumlahPegawai}</p>
                </div>
              </div>

              {/* Kad 2: Sedang Bercuti Hari Ini */}
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-emerald-100 p-6 flex items-center hover:shadow-md transition relative overflow-hidden">
                <div className="absolute right-0 top-0 w-2 h-full bg-orange-500"></div>
                <div className="bg-orange-100 text-orange-600 w-14 h-14 rounded-xl flex items-center justify-center text-3xl mr-5">
                  🏖️
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Bercuti Hari Ini</p>
                  <div className="flex items-end mt-1">
                    <p className="text-3xl font-black text-orange-600">{cutiHariIni.length}</p>
                    <p className="text-sm font-bold text-orange-400 ml-2 mb-1">Pegawai</p>
                  </div>
                </div>
              </div>

              {/* Kad 3: Pencapaian KPI Kursus */}
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-emerald-100 p-6 flex items-center hover:shadow-md transition relative overflow-hidden">
                <div className="absolute right-0 top-0 w-2 h-full bg-teal-500"></div>
                <div className="bg-teal-100 text-teal-600 w-14 h-14 rounded-xl flex items-center justify-center text-3xl mr-5">
                  🎓
                </div>
                <div className="w-full">
                  <div className="flex justify-between items-end mb-1">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">KPI 40 Jam ({kpiStats.tahun})</p>
                    <p className="text-sm font-black text-teal-600">{kpiStats.peratus}%</p>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-emerald-50 rounded-full h-2.5 mt-2 overflow-hidden">
                    <div className="bg-teal-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${kpiStats.peratus}%` }}></div>
                  </div>
                </div>
              </div>

            </div>

            {/* ========================================== */}
            {/* BARIS 2: WIDGET TERPERINCI                 */}
            {/* ========================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* KOLUM KIRI (Besar) */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Widget: Kakitangan Bercuti Hari Ini */}
                <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-emerald-900 flex items-center">
                      <span className="mr-2 text-orange-500 text-xl">📌</span> Pegawai Bercuti Hari Ini
                    </h3>
                  </div>
                  <div className="p-0">
                    {cutiHariIni.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="text-4xl mb-3 opacity-50">🏢</div>
                        <p className="text-emerald-700 font-medium">Tiada pegawai yang bercuti pada hari ini. Operasi berjalan penuh.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-emerald-50">
                        {cutiHariIni.map((cuti) => (
                          <li key={cuti.id} className="p-4 sm:px-6 hover:bg-emerald-50/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-emerald-900">{cuti.pegawai?.nama || "Tiada Rekod"}</p>
                              <p className="text-xs font-semibold text-emerald-600 mt-0.5">{cuti.pegawai?.jabatan_bahagian || "-"}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
                                  {cuti.jenis_cuti}
                                </span>
                                <span className="text-xs text-emerald-700 font-medium">
                                  Hingga: <span className="text-emerald-900 font-bold">{formatTarikhMY(cuti.tarikh_tamat)}</span>
                                </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Widget: Cuti Terkini (Baru Dimohon) */}
                <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-emerald-900 flex items-center">
                      <span className="mr-2 text-teal-500 text-xl">⏱️</span> Aktiviti Permohonan Terkini
                    </h3>
                    <Link href="/admin/cuti" className="text-xs text-emerald-700 hover:text-emerald-900 font-bold bg-emerald-100 px-3 py-1.5 rounded-lg transition border border-emerald-200">
                      Lihat Semua &rarr;
                    </Link>
                  </div>
                  <div className="p-0">
                    {aktivitiTerkini.length === 0 ? (
                      <p className="p-8 text-emerald-700 text-center font-medium">Tiada rekod permohonan baharu.</p>
                    ) : (
                      <ul className="divide-y divide-emerald-50">
                        {aktivitiTerkini.map((cuti) => (
                          <li key={cuti.id} className="p-4 sm:px-6 hover:bg-emerald-50/50 transition">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start space-x-3">
                                <div className="mt-1 w-2 h-2 bg-teal-500 rounded-full"></div>
                                <div>
                                  <p className="text-sm font-bold text-emerald-900">{cuti.pegawai?.nama || "Tiada Rekod"}</p>
                                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                                    Memohon <span className="font-bold text-emerald-800">{cuti.jenis_cuti}</span> bermula <span className="font-bold text-emerald-800">{formatTarikhMY(cuti.tarikh_mula)}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 self-start sm:self-auto">
                                Direkod: {new Date(cuti.created_at).toLocaleDateString('ms-MY')}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

              </div>

              {/* KOLUM KANAN (Kecil) */}
              <div className="space-y-8">
                
                {/* Widget: Analisis KPI Kursus */}
                <div className="bg-emerald-900 rounded-2xl shadow-sm overflow-hidden text-white relative">
                  {/* Hiasan Latar */}
                  <div className="absolute -right-10 -top-10 text-9xl opacity-10">🎓</div>
                  
                  <div className="p-6 relative z-10">
                    <h3 className="font-bold text-emerald-200 uppercase tracking-widest text-xs mb-6">Analisis Pencapaian KPI (40 Jam)</h3>
                    
                    <div className="flex items-end justify-between mb-8">
                      <div>
                        <p className="text-5xl font-black text-white">{kpiStats.peratus}%</p>
                        <p className="text-sm text-emerald-300 font-medium mt-1">Kadar Siap ({kpiStats.tahun})</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-emerald-800/50 p-3 rounded-xl border border-emerald-700/50">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-teal-400 mr-3"></div>
                          <span className="text-sm font-semibold text-emerald-100">Telah Capai</span>
                        </div>
                        <span className="font-black text-teal-300">{kpiStats.capai} Pegawai</span>
                      </div>
                      <div className="flex justify-between items-center bg-emerald-800/50 p-3 rounded-xl border border-emerald-700/50">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-orange-400 mr-3"></div>
                          <span className="text-sm font-semibold text-emerald-100">Belum Capai</span>
                        </div>
                        <span className="font-black text-orange-300">{kpiStats.belum} Pegawai</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-emerald-700">
                       <Link href="/admin/kursus" className="w-full flex justify-center text-sm font-bold text-teal-300 hover:text-white transition">
                         Papar Senarai Penuh &rarr;
                       </Link>
                    </div>
                  </div>
                </div>

                {/* Widget: PINTASAN PANTAS (QUICK LINKS) */}
                <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50/50">
                    <h3 className="font-bold text-emerald-900 flex items-center">
                      <span className="mr-2 text-emerald-500 text-xl">⚡</span> Tindakan Pantas
                    </h3>
                  </div>
                  <div className="p-5 space-y-3">
                    <Link 
                      href="/admin/laporan-individu" 
                      className="w-full flex items-center justify-between px-5 py-3 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-800 bg-white hover:bg-emerald-50 hover:border-emerald-200 transition shadow-sm"
                    >
                      <span className="flex items-center"><span className="text-lg mr-3">🖨️</span> Cetak Laporan Pegawai</span>
                      <span className="text-emerald-500">&rarr;</span>
                    </Link>
                    <Link 
                      href="/admin/cuti" 
                      className="w-full flex items-center justify-between px-5 py-3 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-800 bg-white hover:bg-emerald-50 hover:border-emerald-200 transition shadow-sm"
                    >
                      <span className="flex items-center"><span className="text-lg mr-3">🏖️</span> Daftar Cuti (Pukal)</span>
                      <span className="text-emerald-500">&rarr;</span>
                    </Link>
                    <Link 
                      href="/admin/kursus" 
                      className="w-full flex items-center justify-between px-5 py-3 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-800 bg-white hover:bg-emerald-50 hover:border-emerald-200 transition shadow-sm"
                    >
                      <span className="flex items-center"><span className="text-lg mr-3">🎓</span> Daftar Kursus (Pukal)</span>
                      <span className="text-emerald-500">&rarr;</span>
                    </Link>
                    <Link 
                      href="/admin/urus-pegawai" 
                      className="w-full flex items-center justify-between px-5 py-3 border border-transparent rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
                    >
                      <span className="flex items-center"><span className="text-lg mr-3">+</span> Tambah Pegawai Baru</span>
                    </Link>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}