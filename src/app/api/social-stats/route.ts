//src\app\api\social-stats\route.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

// Cache para evitar muitas requisições (5 minutos)
const CACHE_DURATION = 5 * 60 * 1000;
let cache: {
  data: any;
  timestamp: number;
} | null = null;

export async function GET() {
  try {
    // Verificar cache
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Aqui você integraria com APIs reais
    // Exemplo com GitHub API
    const githubStats = await fetchGitHubStats();

    // Exemplo com LinkedIn (requer OAuth)
    // const linkedinStats = await fetchLinkedInStats();

    // Para Instagram/Facebook também precisa de OAuth

    const data = {
      github: githubStats,
      linkedin: {
        followers: 543, // Substituir por API real
        postsEngagement: 87,
      },
      twitter: {
        followers: 289, // Substituir por API real
        likes: 45,
      },
      timestamp: new Date().toISOString(),
    };

    // Atualizar cache
    cache = {
      data,
      timestamp: Date.now(),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching social stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch social stats" },
      { status: 500 },
    );
  }
}

async function fetchGitHubStats() {
  try {
    // Substitua pelo seu username do GitHub
    const username = "seu-username";

    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error("GitHub API error");
    }

    const data = await response.json();

    return {
      followers: data.followers,
      following: data.following,
      publicRepos: data.public_repos,
      avatarUrl: data.avatar_url,
    };
  } catch (error) {
    console.error("Error fetching GitHub stats:", error);
    return {
      followers: 0,
      following: 0,
      publicRepos: 0,
      avatarUrl: null,
    };
  }
}
