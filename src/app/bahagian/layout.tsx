"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function BahagianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("");
  const [bahagianAkses, setBahagianAkses] = useState("");

  // State untuk kawalan Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Semak akses pengguna
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const nama = localStorage.getItem("username");
    const bahagian = localStorage.getItem("bahagianAkses");

    if (role !== "USER") {
      alert("Akses ditolak. Anda bukan pengguna bahagian.");
      router.push("/login");
    } else {
      setUsername(nama || "Pengguna");
      setBahagianAkses(bahagian || "Tiada Bahagian");
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
    
    handleResize(); 
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

      {/* SIDEBAR MENU (KIRI) */}
      <aside 
        className={`flex-shrink-0 bg-teal-900 text-white h-full transition-all duration-300 ease-in-out z-50 shadow-2xl print:hidden
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'} 
          ${isMobile ? 'fixed' : 'relative'} top-0 left-0`}
      >
        <div className="w-64 flex flex-col h-full">
          
          <div className="p-6 text-center border-b border-teal-800 relative">
            <h2 className="text-2xl font-bold tracking-wider text-teal-300">e-PEGAWAI</h2>
            <p className="text-xs text-teal-100 mt-2">Modul Bahagian/Unit</p>
            <button 
              className="md:hidden absolute right-4 top-6 text-teal-300 hover:text-white text-2xl font-bold" 
              onClick={() => setIsSidebarOpen(false)}
            >
              &times;
            </button>
          </div>

          <div className="p-4 bg-teal-950 border-b border-teal-800 text-sm text-center">
            <span className="block text-teal-200 text-xs mb-1">Akses Bahagian:</span>
            <span className="font-bold text-white uppercase">{bahagianAkses}</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <Link 
              href="/bahagian/kursus" 
              className={`block px-4 py-3 rounded-lg transition ${pathname === '/bahagian/kursus' ? 'bg-teal-700 text-white shadow-md' : 'text-teal-100 hover:bg-teal-800 hover:text-white'}`}
            >
              🎓 Rekod Kursus
            </Link>
            
            <Link 
              href="/bahagian/cuti" 
              className={`block px-4 py-3 rounded-lg transition ${pathname === '/bahagian/cuti' ? 'bg-teal-700 text-white shadow-md' : 'text-teal-100 hover:bg-teal-800 hover:text-white'}`}
            >
              🏖️ Rekod Cuti
            </Link>
          </nav>

          <div className="p-4 border-t border-teal-800">
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg transition shadow-md font-bold"
            >
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
              className="text-slate-600 hover:text-teal-600 text-2xl mr-5 focus:outline-none transition transform hover:scale-110"
              title="Tutup/Buka Menu"
            >
              ☰
            </button>
            <div className="font-black text-teal-800 text-lg tracking-wide hidden sm:block uppercase">SISTEM e-PEGAWAI</div>
          </div>
          <div className="text-xs font-extrabold text-teal-700 bg-teal-50 px-4 py-1.5 rounded-lg border border-teal-200 shadow-sm tracking-wide uppercase truncate max-w-[150px] sm:max-w-xs">
            {bahagianAkses || "PENGGUNA"}
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

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto relative z-10 bg-transparent">
          {children}
        </main>

      </div>

    </div>
  );
}