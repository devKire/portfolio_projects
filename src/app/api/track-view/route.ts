//src\app\api\track-view\route.ts

import { NextRequest, NextResponse } from "next/server";

import { trackPageView } from "@/app/actions/dashboard";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page, path, ip, userAgent } = body;

    if (!page || !path) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Registrar a visualização
    await trackPageView(page, path, ip, userAgent);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in track-view API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Também podemos criar uma rota para obter estatísticas
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const days = parseInt(searchParams.get("days") || "7");

    // Aqui você poderia retornar estatísticas básicas
    return NextResponse.json({
      message: "Tracking API is running",
      endpoints: {
        POST: "Track a page view",
        GET: "Get basic stats",
      },
    });
  } catch (error) {
    console.error("Error in track-view GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
