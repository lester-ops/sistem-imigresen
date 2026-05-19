"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LaporanIndividu() {
  const [pilihanPegawai, setPilihanPegawai] = useState<any[]>([]);
  const [icDipilih, setIcDipilih] = useState("");
  const [tahunDipilih, setTahunDipilih] = useState(new Date().getFullYear().toString());
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Data Laporan
  const [profil, setProfil] = useState<any>(null);
  const [bakiCuti, setBakiCuti] = useState<any>(null);
  const [senaraiCuti, setSenaraiCuti] = useState<any[]>([]);
  const [senaraiKursus, setSenaraiKursus] = useState<any[]>([]);

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

  // Pengiraan Dinamik
  const kelayakanAsas = profil?.kelayakan_cuti_asas || 0;
  const bawaHadapan = bakiCuti?.baki_bawa_hadapan || 0;
  const jumlahCutiRehatDiambil = senaraiCuti.filter(c => c.jenis_cuti === "Cuti Rehat").reduce((acc, curr) => acc + (curr.bilangan_hari || 0), 0);
  const bakiSemasaCuti = (kelayakanAsas + bawaHadapan) - jumlahCutiRehatDiambil;
  
  const jumlahJamKursus = senaraiKursus.reduce((acc, curr) => acc + (curr.jumlah_jam || 0), 0);

  // Fungsi Cetak (Print) / Download PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
      
      {/* CSS KHUSUS UNTUK PRINTING (Sembunyikan elemen luar) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #laporan-dokumen, #laporan-dokumen * { visibility: visible; }
          #laporan-dokumen { position: absolute; left: 0; top: 0; width: 100%; }
          .print-hide { display: none !important; }
        }
      `}} />

      {/* HEADER & KAWALAN (Sembunyi semasa print) */}
      <div className="max-w-5xl mx-auto mb-6 print-hide">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Laporan Profil Pegawai</h1>
            <p className="text-gray-500 text-sm mt-1">Jana rekod peribadi, cuti dan kursus untuk cetakan PDF.</p>
          </div>
          <button 
            onClick={handlePrint}
            disabled={!profil}
            className="mt-4 md:mt-0 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white px-5 py-2.5 rounded-lg shadow-md transition flex items-center font-bold text-sm"
          >
            <span className="mr-2">🖨️</span> Cetak / Simpan PDF
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-2/3">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Cari Pegawai</label>
            <select 
              className="w-full border-gray-300 bg-white rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 border transition cursor-pointer font-bold text-gray-800 shadow-sm"
              value={icDipilih}
              onChange={(e) => setIcDipilih(e.target.value)}
            >
              <option value="">-- Sila Pilih Pegawai --</option>
              {pilihanPegawai.map((p) => (
                <option key={p.ic} value={p.ic}>{p.nama} ({p.jabatan_bahagian})</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Pilih Tahun</label>
            <select 
              className="w-full border-gray-300 bg-white rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 border transition cursor-pointer font-bold text-blue-700 shadow-sm"
              value={tahunDipilih}
              onChange={(e) => setTahunDipilih(e.target.value)}
            >
              <option value="2024">Tahun 2024</option>
              <option value="2025">Tahun 2025</option>
              <option value="2026">Tahun 2026</option>
              <option value="2027">Tahun 2027</option>
            </select>
          </div>
        </div>
        
        {errorMsg && <div className="mt-4 bg-red-100 text-red-700 p-4 rounded-md font-bold text-sm border-l-4 border-red-500">{errorMsg}</div>}
      </div>

      {loading && <div className="text-center py-20 text-gray-500 font-bold animate-pulse print-hide">Sedang memproses laporan...</div>}

      {/* ========================================================================= */}
      {/* DOKUMEN CETAKAN (A4) */}
      {/* ========================================================================= */}
      {!loading && profil && (
        <div id="laporan-dokumen" className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden print:shadow-none print:border-none">
          
          {/* HEADER DOKUMEN */}
          <div className="border-b-4 border-slate-800 p-8 text-center bg-slate-50 print:bg-white">
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest">Laporan Profil Kakitangan</h1>
            <p className="text-slate-500 font-semibold mt-1">Sistem Pengurusan Cuti & Latihan (Tahun {tahunDipilih})</p>
          </div>

          <div className="p-8 space-y-8">
            
            {/* BAHAGIAN 1: MAKLUMAT PEGAWAI */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 border-b-2 border-slate-200 pb-2 mb-4">A. MAKLUMAT PEGAWAI</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div><span className="text-gray-500 block text-xs font-bold uppercase mb-1">Nama Penuh</span><span className="font-bold text-gray-900 text-base">{profil.nama}</span></div>
                <div><span className="text-gray-500 block text-xs font-bold uppercase mb-1">No. Kad Pengenalan</span><span className="font-mono text-gray-900 font-semibold">{profil.ic}</span></div>
                <div><span className="text-gray-500 block text-xs font-bold uppercase mb-1">Jawatan & Gred</span><span className="font-bold text-gray-900">{profil.gred || '-'}</span></div>
                <div><span className="text-gray-500 block text-xs font-bold uppercase mb-1">Bahagian / Unit</span><span className="font-bold text-gray-900">{profil.jabatan_bahagian || '-'}</span></div>
              </div>
            </div>

            {/* BAHAGIAN 2: RINGKASAN CUTI */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 border-b-2 border-slate-200 pb-2 mb-4">B. RINGKASAN CUTI TAHUNAN ({tahunDipilih})</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Kelayakan Asas</div>
                  <div className="text-2xl font-black text-slate-700">{kelayakanAsas}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                  <div className="text-xs font-bold text-blue-500 uppercase mb-1">Bawa Hadapan</div>
                  <div className="text-2xl font-black text-blue-700">+{bawaHadapan}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                  <div className="text-xs font-bold text-red-500 uppercase mb-1">Telah Diambil</div>
                  <div className="text-2xl font-black text-red-600">-{jumlahCutiRehatDiambil}</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-300 text-center shadow-inner">
                  <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Baki Semasa</div>
                  <div className="text-2xl font-black text-emerald-700">{bakiSemasaCuti}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center">
                  <div className="text-xs font-bold text-orange-600 uppercase mb-1">Cuti Gantian</div>
                  <div className="text-2xl font-black text-orange-700">{bakiCuti.baki_gantian_jam || 0} <span className="text-sm font-medium">Jam</span></div>
                </div>
              </div>
            </div>

            {/* BAHAGIAN 3: TRANSAKSI CUTI */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 border-b-2 border-slate-200 pb-2 mb-4">C. REKOD TRANSAKSI CUTI ({tahunDipilih})</h2>
              {senaraiCuti.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Tiada rekod cuti diambil pada tahun ini.</p>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-2 border border-slate-200 w-10 text-center">Bil</th>
                      <th className="p-2 border border-slate-200">Jenis Cuti</th>
                      <th className="p-2 border border-slate-200 w-40">Tarikh</th>
                      <th className="p-2 border border-slate-200 w-16 text-center">Hari</th>
                      <th className="p-2 border border-slate-200">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {senaraiCuti.map((cuti, i) => (
                      <tr key={i} className="bg-white">
                        <td className="p-2 border border-slate-200 text-center text-gray-600">{i + 1}</td>
                        <td className="p-2 border border-slate-200 font-semibold">{cuti.jenis_cuti} {cuti.klinik ? `(${cuti.klinik})` : ''}</td>
                        <td className="p-2 border border-slate-200 text-gray-700">{cuti.tarikh_mula === cuti.tarikh_tamat ? cuti.tarikh_mula : `${cuti.tarikh_mula} - ${cuti.tarikh_tamat}`}</td>
                        <td className="p-2 border border-slate-200 text-center font-bold">{cuti.bilangan_hari}</td>
                        <td className="p-2 border border-slate-200 text-gray-600 italic">{cuti.catatan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* BAHAGIAN 4: REKOD KURSUS */}
            <div className="pt-4">
              <div className="flex justify-between items-end border-b-2 border-slate-200 pb-2 mb-4">
                <h2 className="text-lg font-bold text-slate-800">D. REKOD KURSUS & LATIHAN ({tahunDipilih})</h2>
                <div className={`px-3 py-1 rounded-full text-xs font-black border shadow-sm ${jumlahJamKursus >= 40 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-orange-100 text-orange-800 border-orange-300'}`}>
                  JUMLAH: {jumlahJamKursus} JAM {jumlahJamKursus >= 40 ? '✅' : '⚠️'}
                </div>
              </div>
              
              {senaraiKursus.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Tiada rekod kursus dihadiri pada tahun ini.</p>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-2 border border-slate-200 w-10 text-center">Bil</th>
                      <th className="p-2 border border-slate-200 w-40">Kategori / Jenis</th>
                      <th className="p-2 border border-slate-200">Tajuk Kursus</th>
                      <th className="p-2 border border-slate-200 w-40">Tarikh</th>
                      <th className="p-2 border border-slate-200 w-16 text-center">Jam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {senaraiKursus.map((kursus, i) => (
                      <tr key={i} className="bg-white">
                        <td className="p-2 border border-slate-200 text-center text-gray-600">{i + 1}</td>
                        <td className="p-2 border border-slate-200 text-xs">
                          <div className="font-bold text-slate-700">{kursus.kategori_utama || '-'}</div>
                          <div className="text-gray-500">{kursus.jenis_khusus || ''}</div>
                        </td>
                        <td className="p-2 border border-slate-200 font-semibold text-slate-800">{kursus.nama_kursus}</td>
                        <td className="p-2 border border-slate-200 text-gray-700 text-xs">{kursus.tarikh_mula === kursus.tarikh_tamat ? kursus.tarikh_mula : `${kursus.tarikh_mula} - ${kursus.tarikh_tamat}`}</td>
                        <td className="p-2 border border-slate-200 text-center font-bold text-slate-800">{kursus.jumlah_jam}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
          
          <div className="p-6 text-center text-xs text-gray-400 border-t border-gray-100 bg-slate-50 print:bg-white mt-10">
            Janaan Sistem e-Pegawai Imigresen • Dicetak pada: {new Date().toLocaleString('ms-MY')}
          </div>

        </div>
      )}

      {/* Paparan Kosong jika tiada pegawai dipilih */}
      {!loading && !profil && (
        <div className="max-w-5xl mx-auto bg-white p-16 rounded-xl border border-dashed border-gray-300 text-center print-hide">
          <div className="text-4xl mb-4">🗂️</div>
          <h3 className="text-lg font-bold text-gray-700">Sila pilih nama pegawai</h3>
          <p className="text-gray-500 text-sm mt-2">Laporan penuh akan dipaparkan di sini.</p>
        </div>
      )}

    </div>
  );
}