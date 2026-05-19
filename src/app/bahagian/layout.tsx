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

  const handleLogout = () => {
    const sahkan = confirm("Adakah anda pasti untuk log keluar?");
    if (sahkan) {
      localStorage.clear();
      router.push("/login");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* SIDEBAR MENU (KIRI) */}
      <aside className="w-64 bg-teal-900 text-white flex flex-col shadow-xl">
        <div className="p-6 text-center border-b border-teal-800">
          <h2 className="text-2xl font-bold tracking-wider text-teal-300">e-PEGAWAI</h2>
          <p className="text-xs text-teal-100 mt-2">Modul Bahagian/Unit</p>
        </div>

        <div className="p-4 bg-teal-950 border-b border-teal-800 text-sm text-center">
          <span className="block text-teal-200 text-xs mb-1">Akses Bahagian:</span>
          <span className="font-bold text-white uppercase">{bahagianAkses}</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {/* HANYA TINGGALKAN MENU REKOD KURSUS SAHAJA */}
          <Link 
            href="/bahagian/kursus" 
            className={`block px-4 py-3 rounded-lg transition ${pathname === '/bahagian/kursus' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800 hover:text-white'}`}
          >
            🎓 Rekod Kursus
          </Link>
        </nav>

        {/* BUTANG LOG KELUAR DI BAWAH KIRI */}
        <div className="p-4 border-t border-teal-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition shadow-md font-bold"
          >
            <span>Log Keluar</span>
          </button>
        </div>
      </aside>

      {/* RUANGAN KANDUNGAN UTAMA (KANAN) */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>

    </div>
  );
}