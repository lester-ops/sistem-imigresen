import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Baca cookie 'userRole' dari browser pengguna
  const userRole = request.cookies.get('userRole')?.value;
  const path = request.nextUrl.pathname;

  // 2. KAWALAN AKSES ADMIN
  // Jika cuba masuk ke URL bermula dengan /admin tapi dia bukan ADMIN
  if (path.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      // Ditukar: Tendang balik ke Laman Utama (Homepage)
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 3. KAWALAN AKSES USER (BAHAGIAN)
  // Jika cuba masuk ke URL bermula dengan /bahagian tapi dia bukan USER
  if (path.startsWith('/bahagian')) {
    if (userRole !== 'USER') {
      // Ditukar: Tendang balik ke Laman Utama (Homepage)
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 4. KAWALAN LAMAN UTAMA & LOGIN
  // Jika dia sudah log masuk, tak perlu tunjuk page /login atau / lagi. 
  // Terus bawa ke dashboard masing-masing.
  if (path === '/login' || path === '/') {
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (userRole === 'USER') {
      return NextResponse.redirect(new URL('/bahagian/kursus', request.url));
    }
  }

  // Benarkan akses jika semua syarat dipenuhi
  return NextResponse.next();
}

// 5. TETAPAN MATCHER
// Nyatakan URL mana yang perlu dipantau oleh pengawal ini
export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/bahagian/:path*'],
};