"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function LupaKataLaluan() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setMessage("");

    try {
      // Menghantar link reset ke email berdaftar. Ia akan kembali ke URL reset-password kita.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage("Sila semak peti masuk (inbox) atau spam emel anda untuk pautan (link) tetapan semula kata laluan.");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-4 border-orange-500 relative">
        
        <Link href="/login" className="absolute top-4 left-4 text-xs font-bold text-slate-400 hover:text-orange-600 transition">
          &larr; Kembali
        </Link>

        <div className="text-center mt-6 mb-8">
          <h1 className="text-2xl font-black text-slate-800">Lupa Kata Laluan</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium leading-snug">
            Sistem pemulihan ini dikhaskan untuk <b>Akaun Admin</b> sahaja. Masukkan emel yang anda daftarkan.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 mb-6 rounded-lg text-sm font-bold text-center">
            {errorMsg}
          </div>
        )}

        {message ? (
          <div className="bg-teal-50 border border-teal-200 text-teal-700 p-5 rounded-lg text-sm font-bold text-center">
            <span className="block text-3xl mb-2">✉️</span>
            {message}
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Emel Berdaftar</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-medium text-slate-900 shadow-sm"
                placeholder="Cth: admin@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-lg transition duration-200 shadow-md disabled:bg-slate-400"
            >
              {loading ? "Menghantar pautan..." : "Hantar Pautan Pemulihan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}