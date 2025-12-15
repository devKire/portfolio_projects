// middleware.ts - versão atualizada
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Verificar cookie de autenticação
  const authCookie = request.cookies.get("admin_authenticated");
  const isAuthenticated = authCookie?.value === "true";

  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";

  // Permitir acesso à página de login e API
  if (isLoginPage || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Redirecionar se tentar acessar admin sem autenticação
  if (isAdminPath && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin/login"],
};
