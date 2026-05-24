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
  
  // State untuk kawalan Sidebar (Menu) di skrin kecil/mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Semak jika user betul-betul dah log masuk bila halaman dibuka
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

  // Tutup menu secara automatik apabila pengguna klik pautan di mobile
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    const sahkan = confirm("Adakah anda pasti untuk log keluar?");
    if (sahkan) {
      localStorage.clear(); // Buang memori log masuk
      router.push("/login"); // Hantar balik ke login
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      
      {/* Overlay hitam lutsinar untuk mobile bila menu dibuka */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR MENU (KIRI) */}
      {/* Akan disembunyikan ke tepi (-translate-x-full) pada mobile jika isMobileMenuOpen = false */}
      <aside className={`w-64 bg-slate-800 text-white flex flex-col shadow-xl fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out print:hidden`}>
        <div className="p-6 text-center border-b border-slate-700 flex justify-between items-center md:block">
          <div>
            <h2 className="text-2xl font-bold tracking-wider text-blue-400">e-PEGAWAI</h2>
            <p className="text-xs text-slate-400 mt-2">Modul Pentadbir</p>
          </div>
          {/* Butang pangkah (X) untuk tutup menu di mobile */}
          <button className="md:hidden text-slate-400 hover:text-white text-2xl" onClick={() => setIsMobileMenuOpen(false)}>&times;</button>
        </div>

        <div className="p-4 bg-slate-900 border-b border-slate-700 text-sm">
          Selamat datang, <br/><span className="font-semibold text-blue-300">@{username}</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link href="/admin/dashboard" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            📊 Dashboard
          </Link>
          <Link href="/admin/urus-pegawai" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/urus-pegawai' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            👥 Senarai Pegawai
          </Link>
          <Link href="/admin/kursus" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/kursus' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            🎓 Rekod Kursus
          </Link>
          
          <Link href="/admin/cuti" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/cuti' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            🏖️ Rekod Cuti
          </Link>
          
          <Link href="/admin/cuti/baki" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/cuti/baki' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            🧮 Baki Cuti
          </Link>

          <Link href="/admin/cuti/tetapan" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/cuti/tetapan' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            🗓️ Tetapan Cuti Umum
          </Link>

          <Link href="/admin/laporan-individu" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/laporan-individu' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            🖨️ Laporan Pegawai
          </Link>

          <Link href="/admin/urus-pengguna" className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/urus-pengguna' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            ⚙️ Urus Pengguna (User)
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition">
            <span>Log Keluar</span>
          </button>
        </div>
      </aside>

      {/* RUANGAN KANDUNGAN UTAMA (KANAN) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER MUDAH ALIH (Hanya papar pada skrin kecil) */}
        <header className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between md:hidden print:hidden">
          <div className="font-bold text-slate-800 text-lg">e-PEGAWAI</div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="text-slate-600 hover:text-slate-900 text-2xl focus:outline-none"
          >
            ☰
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50">
          {/* 'children' di bawah ini adalah tempat di mana page.tsx akan dipaparkan */}
          {children}
        </main>

      </div>

    </div>
  );
}