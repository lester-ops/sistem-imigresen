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

  const handleLogout = () => {
    const sahkan = confirm("Adakah anda pasti untuk log keluar?");
    if (sahkan) {
      localStorage.clear(); // Buang memori log masuk
      router.push("/login"); // Hantar balik ke login
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* SIDEBAR MENU (KIRI) */}
      <aside className="w-64 bg-slate-800 text-white flex flex-col shadow-xl">
        <div className="p-6 text-center border-b border-slate-700">
          <h2 className="text-2xl font-bold tracking-wider text-blue-400">e-PEGAWAI</h2>
          <p className="text-xs text-slate-400 mt-2">Modul Pentadbir</p>
        </div>

        <div className="p-4 bg-slate-900 border-b border-slate-700 text-sm">
          Selamat datang, <br/><span className="font-semibold text-blue-300">@{username}</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link 
            href="/admin/dashboard" 
            className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
          >
            📊 Dashboard
          </Link>
          <Link 
            href="/admin/urus-pegawai" 
            className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/urus-pegawai' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
          >
            👥 Senarai Pegawai
          </Link>
          <Link 
            href="/admin/kursus" 
            className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/kursus' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
          >
            🎓 Rekod Kursus
          </Link>
          
          <Link 
            href="/admin/cuti" 
            className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/cuti' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
          >
            🏖️ Rekod Cuti
          </Link>
          
          <Link 
            href="/admin/cuti/baki" 
            className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/cuti/baki' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
          >
            🧮 Baki Cuti
          </Link>

          <Link 
            href="/admin/cuti/tetapan" 
            className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/cuti/tetapan' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
          >
            🗓️ Tetapan Cuti Umum
          </Link>

          {/* Menu BARU: Laporan Pegawai */}
          <Link 
            href="/admin/laporan-individu" 
            className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/laporan-individu' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
          >
            🖨️ Laporan Pegawai
          </Link>

          <Link 
            href="/admin/urus-pengguna" 
            className={`block px-4 py-3 rounded-lg transition ${pathname === '/admin/urus-pengguna' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
          >
            ⚙️ Urus Pengguna (User)
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition"
          >
            <span>Log Keluar</span>
          </button>
        </div>
      </aside>

      {/* RUANGAN KANDUNGAN UTAMA (KANAN) */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {/* 'children' di bawah ini adalah tempat di mana page.tsx akan dipaparkan */}
        {children}
      </main>

    </div>
  );
}