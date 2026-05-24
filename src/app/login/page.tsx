"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [senaraiPengguna, setSenaraiPengguna] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const router = useRouter(); 

  // Ambil senarai ID pengguna sebaik sahaja laman dibuka (Untuk Dropdown)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("pengguna_sistem")
          .select("username, role, bahagian_akses")
          .order("role", { ascending: true })
          .order("username", { ascending: true });

        if (error) throw error;
        setSenaraiPengguna(data || []);
      } catch (err: any) {
        console.error("Gagal mendapatkan senarai pengguna:", err.message);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (!username) {
        setErrorMsg("Sila pilih ID Log Masuk anda.");
        setLoading(false);
        return;
      }

      // 1. FORMAT KEPADA EMEL TIRUAN UNTUK SUPABASE AUTH
      const emelRasmi = `${username.toLowerCase()}@sistem.local`;

      // 2. LOG MASUK MENGGUNAKAN SUPABASE AUTH (SISTEM KESELAMATAN RASMI)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emelRasmi,
        password: password,
      });

      if (authError) {
        console.error("Auth Error:", authError.message);
        setErrorMsg("Kata laluan (Password) salah atau pengguna tidak didaftarkan di Auth!");
        setLoading(false);
        return;
      }

      // 3. JIKA BERJAYA (AUTHENTICATED), AMBIL PERANAN DARI JADUAL PENGGUNA
      const { data: userData, error: userError } = await supabase
        .from("pengguna_sistem")
        .select("*")
        .eq("username", username)
        .single();

      if (userError || !userData) {
        setErrorMsg("Profil pengguna tidak dijumpai di pangkalan data.");
        setLoading(false);
        return;
      }

      // 4. SIMPAN SESI SEPERTI BIASA
      localStorage.setItem("userRole", userData.role);
      localStorage.setItem("username", userData.username);
      localStorage.setItem("bahagianAkses", userData.bahagian_akses || "");

      document.cookie = `userRole=${userData.role}; path=/; max-age=86400`;
      document.cookie = `username=${userData.username}; path=/; max-age=86400`;

      // Hantar user ke halaman yang betul
      if (userData.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/bahagian/kursus");
      }

    } catch (err) {
      console.error("Ralat sistem:", err);
      setErrorMsg("Berlaku ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-4 border-emerald-600 relative overflow-hidden">
        
        <Link href="/" className="absolute top-4 left-4 text-xs font-bold text-slate-400 hover:text-emerald-600 transition">
          &larr; Laman Utama
        </Link>

        <div className="text-center mt-6 mb-8">
          <h1 className="text-2xl font-black text-slate-800">Log Masuk</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Sistem Pengurusan e-Pegawai</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 mb-6 rounded-lg text-sm font-bold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">ID Pengguna (Username)</label>
            {loadingUsers ? (
              <div className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm italic">
                Memuat turun senarai pengguna...
              </div>
            ) : (
              <select
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-bold text-emerald-900 shadow-sm cursor-pointer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              >
                <option value="">-- Sila Pilih ID Pengguna --</option>
                {senaraiPengguna.map((u) => (
                  <option key={u.username} value={u.username}>
                    @{u.username} {u.role === 'ADMIN' ? '(Pentadbir)' : `(${u.bahagian_akses || 'Pengguna'})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Kata Laluan</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium text-slate-900 shadow-sm"
              placeholder="Masukkan kata laluan..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || loadingUsers}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-lg transition duration-200 shadow-md disabled:bg-slate-400 mt-2"
          >
            {loading ? "Sedang disahkan (Secured)..." : "Log Masuk Penuh"}
          </button>
        </form>

      </div>
    </div>
  );
}