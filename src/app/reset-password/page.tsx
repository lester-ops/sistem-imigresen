"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setMessage("");

    if (password !== confirmPassword) {
      setErrorMsg("Kata laluan pengesahan tidak sepadan!");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Kata laluan mesti melebihi 6 aksara.");
      setLoading(false);
      return;
    }

    try {
      // Supabase secara automatik mengesan sesi dari URL Fragment (hash) yang dihantar ke emel
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setMessage("Tahniah! Kata laluan anda berjaya dikemas kini. Sila tunggu, anda akan dibawa ke Log Masuk...");
      
      setTimeout(() => {
        router.push("/login");
      }, 3000);

    } catch(err: any) {
      setErrorMsg("Ralat: " + err.message + " (Sila pastikan link pemulihan anda masih sah).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-4 border-emerald-600">
        
        <div className="text-center mt-2 mb-8">
          <h1 className="text-2xl font-black text-slate-800">Cipta Kata Laluan Baru</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Sila masukkan kata laluan rahsia baharu anda.</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 mb-6 rounded-lg text-sm font-bold text-center">
            {errorMsg}
          </div>
        )}

        {message ? (
          <div className="bg-teal-50 border border-teal-200 text-teal-700 p-5 rounded-lg text-sm font-bold text-center">
            <span className="block text-3xl mb-2">✅</span>
            {message}
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Kata Laluan Baru</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium text-slate-900 shadow-sm"
                placeholder="Rahsia baharu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Sahkan Kata Laluan</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium text-slate-900 shadow-sm"
                placeholder="Taip semula kata laluan..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-lg transition duration-200 shadow-md disabled:bg-slate-400"
            >
              {loading ? "Menyimpan..." : "Kemas Kini & Log Masuk"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}