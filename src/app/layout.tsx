import "./globals.css";

export const metadata = {
  title: 'Sistem Imigresen',
  description: 'Sistem Pengurusan Pegawai',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ms">
      <body>
        {children}
      </body>
    </html>
  )
}