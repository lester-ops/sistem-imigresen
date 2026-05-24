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

  // State untuk kawalan Sidebar (Menu) di skrin kecil/mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Semak akses pengguna
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const nama = localStorage.getItem("username");
    const bahagian = localStorage.getItem("bahagianAkses");

    // Jika bukan USER, tendang keluar
    if (role !== "USER") {
      alert("Akses ditolak. Anda bukan pengguna bahagian.");
      router.push("/login");
    } else {
      setUsername(nama || "Pengguna");
      setBahagianAkses(bahagian || "Tiada Bahagian");
    }
  }, [router]);

  // Tutup menu secara automatik apabila pengguna klik pautan di mobile
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    const sahkan = confirm("Adakah anda pasti untuk log keluar?");
    if (sahkan) {
      localStorage.clear();
      router.push("/login");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* Overlay hitam lutsinar untuk mobile bila menu dibuka */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR MENU (KIRI) */}
      <aside className={`w-64 bg-teal-900 text-white flex flex-col shadow-xl fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out print:hidden`}>
        <div className="p-6 text-center border-b border-teal-800 flex justify-between items-center md:block">
          <div>
            <h2 className="text-2xl font-bold tracking-wider text-teal-300">e-PEGAWAI</h2>
            <p className="text-xs text-teal-100 mt-2">Modul Bahagian/Unit</p>
          </div>
          {/* Butang pangkah (X) untuk tutup menu di mobile */}
          <button className="md:hidden text-teal-300 hover:text-white text-2xl" onClick={() => setIsMobileMenuOpen(false)}>&times;</button>
        </div>

        <div className="p-4 bg-teal-950 border-b border-teal-800 text-sm text-center">
          <span className="block text-teal-200 text-xs mb-1">Akses Bahagian:</span>
          <span className="font-bold text-white uppercase">{bahagianAkses}</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {/* MENU KURSUS */}
          <Link href="/bahagian/kursus" className={`block px-4 py-3 rounded-lg transition ${pathname === '/bahagian/kursus' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800 hover:text-white'}`}>
            🎓 Rekod Kursus
          </Link>
          
          {/* MENU CUTI */}
          <Link href="/bahagian/cuti" className={`block px-4 py-3 rounded-lg transition ${pathname === '/bahagian/cuti' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800 hover:text-white'}`}>
            🏖️ Rekod Cuti
          </Link>
        </nav>

        {/* BUTANG LOG KELUAR DI BAWAH KIRI */}
        <div className="p-4 border-t border-teal-800">
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition shadow-md font-bold">
            <span>Log Keluar</span>
          </button>
        </div>
      </aside>

      {/* RUANGAN KANDUNGAN UTAMA (KANAN) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER MUDAH ALIH (Hanya papar pada skrin kecil) */}
        <header className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between md:hidden print:hidden">
          <div className="font-bold text-teal-800 text-lg">e-PEGAWAI</div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="text-teal-700 hover:text-teal-900 text-2xl focus:outline-none"
          >
            ☰
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>

    </div>
  );
}