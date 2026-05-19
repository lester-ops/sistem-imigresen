export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Sistem Pengurusan Pegawai</h1>
        <p className="text-gray-600 mb-8">Modul Cuti & Kursus</p>
        <a 
          href="/login" 
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
        >
          Log Masuk
        </a>
      </div>
    </div>
  );
}