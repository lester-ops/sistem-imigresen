"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // Fungsi Next.js untuk tukar halaman

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Elak browser dari 'refresh' bila tekan butang submit
    setLoading(true);
    setErrorMsg("");

    try {
      // Semak dengan Supabase jadual 'pengguna_sistem'
      const { data, error } = await supabase
        .from("pengguna_sistem")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single(); // Ambil satu rekod sahaja

      if (error || !data) {
        setErrorMsg("Username atau Password salah!");
      } else {
        // Jika berjaya log masuk, simpan maklumat user dalam browser (localStorage)
        // Supaya sistem ingat siapa yang sedang log masuk
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("username", data.username);
        localStorage.setItem("bahagianAkses", data.bahagian_akses || "");

        alert("Log masuk berjaya! Selamat datang " + data.username);

        // Hantar user ke halaman yang betul berdasarkan Role
        if (data.role === "ADMIN") {
          router.push("/admin/urus-pegawai"); // Admin pergi sini
        } else {
          router.push("/bahagian/kursus"); // User bahagian pergi sini
        }
      }
    } catch (err) {
      setErrorMsg("Berlaku ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full border-t-4 border-blue-600">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Sistem Imigresen</h1>
          <p className="text-gray-500 text-sm mt-1">Log Masuk Modul Cuti & Kursus</p>
        </div>

        {/* Papar ralat jika ada */}
        {errorMsg && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-6 rounded text-sm font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Masukkan username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Masukkan password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200"
          >
            {loading ? "Sedang menyemak..." : "Log Masuk"}
          </button>
        </form>

      </div>
    </div>
  );
}