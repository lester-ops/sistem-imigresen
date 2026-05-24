"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("");
  
  // State untuk kawalan Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Semak akses pengguna
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const nama = localStorage.getItem("username");

    if (role !== "ADMIN") {
      alert("Akses ditolak. Sila log masuk sebagai Admin.");
      router.push("/login");
    } else {
      setUsername(nama || "Admin");
    }
  }, [router]);

  // Kesan saiz skrin untuk auto-tutup sidebar di telefon pintar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
        setIsMobile(true);
      } else {
        setIsSidebarOpen(true);
        setIsMobile(false);
      }
    };
    
    handleResize(); // Jalankan sekali masa mula-mula load
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tutup menu secara automatik apabila pengguna telefon klik pada menu
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  const handleLogout = () => {
    const sahkan = confirm("Adakah anda pasti untuk log keluar?");
    if (sahkan) {
      localStorage.clear();
      
      // Buang (Clear) Cookie dengan meletakkan tarikh luput ke masa lalu
      document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      // KEMAS KINI: Hantar terus ke Laman Utama (Homepage)
      router.push("/");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* Overlay hitam lutsinar untuk mobile bila menu dibuka */}
      {isSidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR MENU (KIRI) - TEMA HIJAU (EMERALD/TEAL) */}
      <aside 
        className={`flex-shrink-0 bg-emerald-900 text-white h-full transition-all duration-300 ease-in-out z-50 shadow-2xl print:hidden
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'} 
          ${isMobile ? 'fixed' : 'relative'} top-0 left-0`}
      >
        <div className="w-64 flex flex-col h-full">
          
          <div className="p-6 text-center border-b border-emerald-800 relative">
            <h2 className="text-2xl font-bold tracking-wider text-emerald-300">e-PEGAWAI</h2>
            <p className="text-xs text-emerald-100 mt-2">Modul Pentadbir</p>
            <button 
              className="md:hidden absolute right-4 top-6 text-emerald-300 hover:text-white text-2xl font-bold" 
              onClick={() => setIsSidebarOpen(false)}
            >
              &times;
            </button>
          </div>

          <div className="p-4 bg-emerald-950 border-b border-emerald-800 text-sm">
            Selamat datang, <br/><span className="font-semibold text-emerald-200">@{username}</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <Link href="/admin/dashboard" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/dashboard' ? 'bg-emerald-700 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}>
              📊 Dashboard
            </Link>
            <Link href="/admin/urus-pegawai" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/urus-pegawai' ? 'bg-emerald-700 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}>
              👥 Senarai Pegawai
            </Link>
            <Link href="/admin/kursus" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/kursus' ? 'bg-emerald-700 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}>
              🎓 Rekod Kursus
            </Link>
            <Link href="/admin/cuti" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/cuti' ? 'bg-emerald-700 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}>
              🏖️ Rekod Cuti
            </Link>
            <Link href="/admin/cuti/baki" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/cuti/baki' ? 'bg-emerald-700 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}>
              🧮 Baki Cuti
            </Link>
            <Link href="/admin/cuti/tetapan" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/cuti/tetapan' ? 'bg-emerald-700 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}>
              🗓️ Tetapan Cuti Umum
            </Link>
            <Link href="/admin/laporan-individu" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/laporan-individu' ? 'bg-emerald-700 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}>
              🖨️ Laporan Pegawai
            </Link>
            <Link href="/admin/urus-pengguna" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/urus-pengguna' ? 'bg-emerald-700 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}>
              ⚙️ Urus Pengguna (User)
            </Link>
          </nav>

          <div className="p-4 border-t border-emerald-800">
            <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg transition shadow-md font-bold">
              <span>Log Keluar</span>
            </button>
          </div>

        </div>
      </aside>

      {/* RUANGAN KANDUNGAN UTAMA (KANAN) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
        
        {/* UNIVERSAL TOP HEADER */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden z-20 relative">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="text-emerald-800 hover:text-emerald-600 text-2xl mr-5 focus:outline-none transition transform hover:scale-110"
              title="Tutup/Buka Menu"
            >
              ☰
            </button>
            <div className="font-black text-emerald-900 text-lg tracking-wide hidden sm:block uppercase">SISTEM e-PEGAWAI</div>
          </div>
          <div className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-4 py-1.5 rounded-lg border border-emerald-200 shadow-sm tracking-wide">
            MODUL PENTADBIR
          </div>
        </header>

        {/* LOGO WATERMARK DIKEMBALIKAN */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden print:hidden select-none">
            <img 
              src="/logo-imigresen.jpg" 
              alt="Watermark Latar Belakang" 
              className="w-[300px] md:w-[450px] opacity-[0.05]" 
            />
        </div>

        {/* CONTENT UTAMA */}
        <main className="flex-1 overflow-y-auto relative z-10 bg-transparent">
          {children}
        </main>

      </div>

    </div>
  );
}