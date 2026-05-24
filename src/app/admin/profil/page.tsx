"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilAdmin() {
  const [profil, setProfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchProfil = async () => {
      try {
        const username = localStorage.getItem("username");
        if (!username) return;

        const { data, error } = await supabase
          .from("pengguna_sistem")
          .select("*")
          .eq("username", username)
          .single();

        if (error) throw error;
        setProfil(data);
      } catch (err: any) {
        console.error("Ralat ambil profil:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfil();
  }, []);

  const handleTukarKatalaluan = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Kata laluan pengesahan tidak sepadan! Sila pastikan anda menaip kata laluan yang sama." });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Kata laluan mesti mengandungi sekurang-kurangnya 6 aksara." });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Kemas kini di Supabase Auth (Sistem Keselamatan Utama)
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // 2. Kemas kini di jadual pengguna_sistem supaya Admin lain boleh nampak jika perlu Reset
      const emelRasmi = profil.role === 'ADMIN' && profil.email 
        ? profil.email 
        : `${profil.username.toLowerCase().replace(/[^a-z0-9]/g, '')}@sistem.local`;
      
      const payload = {
        action: 'UPDATE',
        email: emelRasmi,
        password: newPassword,
        username: profil.username,
        role: profil.role,
        bahagian_akses: profil.bahagian_akses,
        uid: profil.id
      };

      const res = await fetch('/api/pengguna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Gagal menyegerakkan kata laluan ke pangkalan data.");
      }

      setMessage({ type: "success", text: "Tahniah! Kata laluan anda telah berjaya ditukar." });
      setNewPassword("");
      setConfirmPassword("");

    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-emerald-700 font-bold animate-pulse">Memuatkan maklumat profil...</div>;
  }

  return (
    <div className="p-4 sm:p-8 relative z-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-900">Profil Saya</h1>
        <p className="text-emerald-700 mt-1 font-medium">Lihat maklumat akaun dan urus keselamatan log masuk anda.</p>
      </div>

      {/* KAD MAKLUMAT PROFIL */}
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-md border border-emerald-100 overflow-hidden mb-8">
        <div className="bg-emerald-800 p-6 text-white flex items-center space-x-5 shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-3xl font-bold shadow-inner">
            {profil?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase">@{profil?.username}</h2>
            <p className="text-emerald-200 text-sm font-medium tracking-wide">
              {profil?.role === 'ADMIN' ? 'Pentadbir Sistem' : 'Pengguna Bahagian'}
            </p>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1.5">Akses Bahagian / Unit</label>
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 font-bold text-emerald-900 shadow-sm">
                {profil?.bahagian_akses || "SEMUA AKSES"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1.5">Emel Log Masuk (Autentikasi)</label>
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 font-mono text-emerald-900 text-sm shadow-sm">
                {profil?.username?.toLowerCase().replace(/[^a-z0-9]/g, '')}@sistem.local
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BORANG TUKAR KATA LALUAN */}
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-md border border-emerald-100 overflow-hidden">
        <div className="p-6 border-b border-emerald-100 bg-emerald-50/50">
          <h3 className="text-xl font-bold text-emerald-900 flex items-center">
            <span className="mr-3">🔐</span> Penukaran Kata Laluan
          </h3>
        </div>

        <form onSubmit={handleTukarKatalaluan} className="p-6 space-y-6">
          {message.text && (
            <div className={`p-4 rounded-xl text-sm font-bold border ${message.type === 'success' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">Kata Laluan Baharu</label>
            <input 
              type="password" 
              required
              placeholder="Masukkan sekurang-kurangnya 6 aksara..."
              className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-sm font-medium"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">Sahkan Kata Laluan Baharu</label>
            <input 
              type="password" 
              required
              placeholder="Taip semula kata laluan di atas..."
              className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-sm font-medium"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition disabled:bg-teal-400 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {isSubmitting ? "Menyimpan..." : "Kemas Kini Kata Laluan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}