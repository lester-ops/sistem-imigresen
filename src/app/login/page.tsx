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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("pengguna_sistem")
          .select("username, role, bahagian_akses, email")
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

      // Cari profil pengguna dari senarai dropdown
      const selectedUser = senaraiPengguna.find(u => u.username === username);
      if (!selectedUser) throw new Error("Pengguna tidak dijumpai.");

      // Jika Admin ada emel rasmi, guna emel itu. Jika tiada, guna emel tiruan.
      let emelRasmi = "";
      if (selectedUser.role === "ADMIN" && selectedUser.email) {
        emelRasmi = selectedUser.email;
      } else {
        const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
        emelRasmi = `${cleanUsername}@sistem.local`;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emelRasmi,
        password: password,
      });

      if (authError) {
        setErrorMsg("Kata laluan (Password) salah!");
        setLoading(false);
        return;
      }

      // SIMPAN SESI SEPERTI BIASA
      localStorage.setItem("userRole", selectedUser.role);
      localStorage.setItem("username", selectedUser.username);
      localStorage.setItem("bahagianAkses", selectedUser.bahagian_akses || "");

      document.cookie = `userRole=${selectedUser.role}; path=/; max-age=86400`;
      document.cookie = `username=${selectedUser.username}; path=/; max-age=86400`;

      if (selectedUser.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/bahagian/kursus");
      }

    } catch (err: any) {
      setErrorMsg("Berlaku ralat sistem: " + err.message);
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
                Memuat turun senarai...
              </div>
            ) : (
              <select
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-bold text-emerald-900 shadow-sm cursor-pointer uppercase"
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
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Kata Laluan</label>
              {/* PAUTAN LUPA KATA LALUAN UNTUK ADMIN */}
              <Link href="/lupa-kata-laluan" className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition hover:underline">
                Lupa Kata Laluan Admin?
              </Link>
            </div>
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
            {loading ? "Sedang disahkan..." : "Log Masuk Penuh"}
          </button>
        </form>
      </div>
    </div>
  );
}