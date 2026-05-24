import Link from "next/link";

// Metadata ini sangat penting supaya Google mudah 'baca' website ini
export const metadata = {
  title: 'Sistem Pengurusan Pegawai | Cuti & Kursus',
  description: 'Portal rasmi Sistem Pengurusan Pegawai untuk pengurusan cuti dan kursus kakitangan.',
  keywords: 'sistem pengurusan pegawai, e-pegawai, sistem cuti, sistem kursus kakitangan',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Latar Belakang (Hiasan) */}
      <div className="absolute top-0 left-0 w-full h-96 bg-emerald-800 -skew-y-6 origin-top-left z-0 shadow-lg"></div>

      <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-lg w-full text-center relative z-10 border border-slate-200">
        
        {/* IKON SVG KORPORAT (Saiz sama seperti logo lama) */}
        <div className="flex justify-center mb-6">
          <div className="w-28 h-28 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-emerald-100 shadow-sm text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        
        {/* TAJUK SISTEM UNTUK SEO & UMUM */}
        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 mb-2 tracking-tight">
          Sistem Pengurusan Pegawai
        </h1>
        <h2 className="text-emerald-700 font-bold text-sm sm:text-base uppercase tracking-widest mb-8">
          Modul e-Pegawai (Cuti & Kursus)
        </h2>

        <p className="text-slate-500 mb-10 text-sm font-medium leading-relaxed px-4">
          Selamat datang ke portal rasmi. Sila gunakan ID Pengguna dan Kata Laluan yang telah didaftarkan oleh Pentadbir untuk mengakses sistem.
        </p>

        {/* BUTANG LOG MASUK */}
        <Link 
          href="/login" 
          className="group relative flex w-full justify-center rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-emerald-300 group-hover:text-emerald-100 text-lg transition-colors">🔐</span>
          </span>
          Log Masuk ke Sistem
        </Link>
        
        <div className="mt-8 text-xs text-slate-400 font-semibold">
          &copy; {new Date().getFullYear()} Hak Cipta Terpelihara. Penggunaan Dalaman Sahaja.
        </div>
      </div>
      
    </div>
  );
}