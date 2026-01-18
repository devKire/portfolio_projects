// portfolio_projects\src\app\middleware.ts

import { NextRequest, NextResponse } from "next/server";

import { trackPageView } from "@/app/actions/dashboard";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Apenas rastrear a landing page principal (/erikdossantos)
  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/erikdossantos" ||
    pathname === "/" // Caso tenha redirecionamento de / para /erikdossantos
  ) {
    try {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.ip ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";

      // Referência (de onde o usuário veio)
      const referer = request.headers.get("referer") || "direct";

      // País e cidade (se disponível via Vercel/Next.js)
      const country = request.geo?.country || "unknown";
      const city = request.geo?.city || "unknown";

      // Determinar seção da landing page baseada no hash/anchor
      const hash = request.nextUrl.hash;
      let section = "home";

      if (hash) {
        // Extrair nome da seção do hash (ex: #projects, #about, #contact)
        section = hash.replace("#", "") || "home";
      }

      // Registrar visualização com mais detalhes
      fetch(`${request.nextUrl.origin}/api/track-view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: "landing", // Nome fixo para a landing page
          section: section, // Seção específica dentro da landing page
          path: pathname + hash,
          fullUrl: request.nextUrl.href,
          ip,
          userAgent,
          referer,
          country,
          city,
          timestamp: new Date().toISOString(),
          // Dados adicionais que podem ser úteis
          screenWidth: request.headers.get("sec-ch-width") || "unknown",
          screenHeight: request.headers.get("sec-ch-height") || "unknown",
          prefersColorScheme:
            request.headers.get("sec-ch-prefers-color-scheme") || "unknown",
        }),
      }).catch((error) => {
        console.error("Error sending tracking request:", error);
      });
    } catch (error) {
      console.error("Error in tracking middleware:", error);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/erikdossantos",
    "/", // Incluir raiz se redirecionar para /erikdossantos
  ],
};
