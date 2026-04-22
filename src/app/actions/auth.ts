// app/actions/auth.ts
"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/prisma";

export async function loginAdmin(formData: FormData) {
  try {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    console.log("Login attempt for:", username);

    // Verificar se existe algum admin
    const adminCount = await db.admin.count();

    // Se não houver admins, criar um padrão
    if (adminCount === 0) {
      console.log("No admin found, creating default...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.admin.create({
        data: {
          username: "admin",
          password: hashedPassword,
        },
      });
    }

    // Buscar admin no banco
    const admin = await db.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      console.log("Admin not found:", username);
      return { success: false, error: "Usuário ou senha inválidos" };
    }

    // Verificar senha
    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      console.log("Invalid password for:", username);
      return { success: false, error: "Usuário ou senha inválidos" };
    }

    // Definir cookie de autenticação
    const cookieStore = await cookies();
    cookieStore.set({
      name: "admin_authenticated",
      value: "true",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 horas
      path: "/",
    });

    console.log("Login successful for:", username);
    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "Erro interno do servidor. Tente novamente.",
    };
  }
}

export async function logoutAdmin() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("admin_authenticated");

    console.log("Logout successful");

    // Redirecionar para login
    redirect("/admin");
  } catch (error) {
    console.error("Logout error:", error);
    redirect("/admin");
  }
}

export async function checkAuth() {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.has("admin_authenticated");

    return { authenticated: isAuthenticated };
  } catch (error) {
    console.error("Auth check error:", error);
    return { authenticated: false };
  }
}
