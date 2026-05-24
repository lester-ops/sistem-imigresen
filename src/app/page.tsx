import Link from "next/link";

// Metadata ini sangat penting supaya Google mudah 'baca' dan 'jumpa' website ini
export const metadata = {
  title: 'Sistem Pengurusan Imigresen | Cuti & Kursus',
  description: 'Portal rasmi Sistem Pengurusan e-Pegawai (Cuti & Kursus) untuk kegunaan kakitangan dan pentadbir jabatan.',
  keywords: 'sistem imigresen, e-pegawai, sistem cuti, sistem kursus kakitangan',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Latar Belakang (Hiasan) */}
      <div className="absolute top-0 left-0 w-full h-96 bg-emerald-800 -skew-y-6 origin-top-left z-0 shadow-lg"></div>

      <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-lg w-full text-center relative z-10 border border-slate-200">
        
        {/* LOGO IMIGRESEN */}
        <div className="flex justify-center mb-6">
          <img 
            src="/logo-imigresen.jpg" 
            alt="Logo Jabatan Imigresen Malaysia" 
            className="w-32 h-32 object-contain drop-shadow-sm" 
          />
        </div>
        
        {/* TAJUK SISTEM UNTUK SEO */}
        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 mb-2 tracking-tight">
          Sistem Pengurusan Imigresen
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
          &copy; {new Date().getFullYear()} Hak Cipta Terpelihara.
        </div>
      </div>
      
    </div>
  );
}