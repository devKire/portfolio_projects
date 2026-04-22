"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/prisma";

export type ProjectFormData = {
  title: string;
  category: string;
  description: string;
  fullDescription: string;
  image: string;
  technologies: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured: boolean;
  status: "completed" | "in-progress" | "planned";
  accentColor?: string;
  landingpageId: string;
};

// Tipo para reordenação
export type ReorderProjectData = {
  id: string;
  position: number;
};

// Buscar todos os projetos
export async function getProjects(landingpageId: string) {
  try {
    const projects = await db.project.findMany({
      where: { landingpageId },
      orderBy: { position: "asc" },
    });
    return projects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw new Error("Failed to fetch projects");
  }
}

// Buscar projeto por ID
export async function getProjectById(id: string) {
  try {
    const project = await db.project.findUnique({
      where: { id },
    });
    return project;
  } catch (error) {
    console.error("Error fetching project:", error);
    throw new Error("Failed to fetch project");
  }
}

// Criar projeto
export async function createProject(data: ProjectFormData) {
  try {
    // Encontrar a última posição
    const lastProject = await db.project.findFirst({
      where: { landingpageId: data.landingpageId },
      orderBy: { position: "desc" },
    });

    const position = lastProject ? lastProject.position + 1 : 0;

    const project = await db.project.create({
      data: {
        ...data,
        position,
      },
    });

    revalidatePath("/admin/projects");
    revalidatePath("/"); // Revalida a página principal onde os projetos são exibidos
    revalidatePath(`/portfolio/${data.landingpageId}`); // Se tiver página específica
    return project;
  } catch (error) {
    console.error("Error creating project:", error);
    throw new Error("Failed to create project");
  }
}

// Atualizar projeto
export async function updateProject(
  id: string,
  data: Partial<ProjectFormData>,
) {
  try {
    const project = await db.project.update({
      where: { id },
      data,
    });

    revalidatePath("/admin/projects");
    revalidatePath("/");
    revalidatePath(`/portfolio/${project.landingpageId}`);
    return project;
  } catch (error) {
    console.error("Error updating project:", error);
    throw new Error("Failed to update project");
  }
}

// Deletar projeto
export async function deleteProject(id: string) {
  try {
    // Primeiro, buscar o projeto para obter o landingpageId
    const project = await db.project.findUnique({
      where: { id },
      select: { landingpageId: true, position: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Deletar o projeto
    await db.project.delete({
      where: { id },
    });

    // Reordenar os projetos restantes (reduzir position dos que vinham depois)
    await db.project.updateMany({
      where: {
        landingpageId: project.landingpageId,
        position: { gt: project.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });

    revalidatePath("/admin/projects");
    revalidatePath("/");
    revalidatePath(`/portfolio/${project.landingpageId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting project:", error);
    throw new Error("Failed to delete project");
  }
}

// Reordenar projetos - ATUALIZADA
export async function reorderProjects(projectsData: ReorderProjectData[]) {
  try {
    // Usar transação para garantir que todas as atualizações sejam feitas ou nenhuma
    await db.$transaction(async (tx) => {
      for (const projectData of projectsData) {
        await tx.project.update({
          where: { id: projectData.id },
          data: { position: projectData.position },
        });
      }
    });

    // Obter o landingpageId do primeiro projeto para revalidação
    const firstProject = await db.project.findUnique({
      where: { id: projectsData[0].id },
      select: { landingpageId: true },
    });

    if (firstProject) {
      revalidatePath("/admin/projects");
      revalidatePath("/");
      revalidatePath(`/portfolio/${firstProject.landingpageId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error reordering projects:", error);
    throw new Error("Failed to reorder projects");
  }
}
