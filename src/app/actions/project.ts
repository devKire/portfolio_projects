'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/session';
import { requireOwnedLandingPage } from '@/lib/auth/tenant';
import { db } from '@/lib/prisma';

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
  isActive: boolean;
  status: 'completed' | 'in-progress' | 'planned';
  accentColor?: string;
  landingpageId?: string;
};

export type ReorderProjectData = {
  id: string;
  position: number;
};

const projectInclude = {
  _count: {
    select: {
      tasks: true,
      features: true,
      sprints: true,
    },
  },
};

function revalidateProjectPaths(slug: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/projects');
  revalidatePath(`/${slug}`);
}

export async function getProjects(landingpageId?: string) {
  const user = await requireUser();
  const landingpage = await requireOwnedLandingPage(user.id, landingpageId);

  return db.project.findMany({
    where: { userId: user.id, landingpageId: landingpage.id },
    orderBy: { position: 'asc' },
    include: projectInclude,
  });
}

export async function getProjectById(id: string) {
  const user = await requireUser();
  return db.project.findFirst({
    where: { id, userId: user.id },
  });
}

export async function createProject(data: ProjectFormData) {
  const user = await requireUser();
  const landingpage = await requireOwnedLandingPage(
    user.id,
    data.landingpageId
  );

  const lastProject = await db.project.findFirst({
    where: { userId: user.id, landingpageId: landingpage.id },
    orderBy: { position: 'desc' },
  });

  const project = await db.project.create({
    data: {
      userId: user.id,
      title: data.title,
      category: data.category,
      description: data.description,
      fullDescription: data.fullDescription,
      image: data.image,
      technologies: data.technologies,
      liveUrl: data.liveUrl || null,
      githubUrl: data.githubUrl || null,
      featured: data.featured,
      isActive: data.isActive,
      status: data.status,
      accentColor: data.accentColor,
      landingpageId: landingpage.id,
      position: lastProject ? lastProject.position + 1 : 0,
    },
    include: projectInclude,
  });

  revalidateProjectPaths(landingpage.slug);
  return project;
}

export async function updateProject(
  id: string,
  data: Partial<ProjectFormData>
) {
  const user = await requireUser();
  const existing = await db.project.findFirst({
    where: { id, userId: user.id },
    include: { landingpage: { select: { slug: true } } },
  });
  if (!existing) throw new Error('Project not found');

  const project = await db.project.update({
    where: { id: existing.id },
    data: {
      title: data.title,
      category: data.category,
      description: data.description,
      fullDescription: data.fullDescription,
      image: data.image,
      technologies: data.technologies,
      liveUrl: data.liveUrl === '' ? null : data.liveUrl,
      githubUrl: data.githubUrl === '' ? null : data.githubUrl,
      featured: data.featured,
      isActive: data.isActive,
      status: data.status,
      accentColor: data.accentColor,
    },
    include: projectInclude,
  });

  revalidateProjectPaths(existing.landingpage.slug);
  return project;
}

export async function setProjectActive(id: string, isActive: boolean) {
  return updateProject(id, { isActive });
}

export async function toggleProjectFeatured(id: string, featured: boolean) {
  return updateProject(id, { featured });
}

export async function deleteProject(id: string) {
  const user = await requireUser();
  const project = await db.project.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      landingpageId: true,
      position: true,
      landingpage: { select: { slug: true } },
      _count: {
        select: {
          tasks: true,
          features: true,
          sprints: true,
        },
      },
    },
  });

  if (!project) throw new Error('Project not found');
  if (
    project._count.tasks > 0 ||
    project._count.features > 0 ||
    project._count.sprints > 0
  ) {
    throw new Error(
      'Project has linked history. Inactivate it instead of deleting.'
    );
  }

  await db.$transaction([
    db.project.delete({ where: { id: project.id } }),
    db.project.updateMany({
      where: {
        userId: user.id,
        landingpageId: project.landingpageId,
        position: { gt: project.position },
      },
      data: { position: { decrement: 1 } },
    }),
  ]);

  revalidateProjectPaths(project.landingpage.slug);
  return { success: true };
}

export async function reorderProjects(projectsData: ReorderProjectData[]) {
  const user = await requireUser();
  if (!projectsData.length) return { success: true };

  const ids = Array.from(new Set(projectsData.map((project) => project.id)));
  const ownedProjects = await db.project.findMany({
    where: { id: { in: ids }, userId: user.id },
    select: {
      id: true,
      landingpageId: true,
      landingpage: { select: { slug: true } },
    },
  });

  if (ownedProjects.length !== ids.length) {
    throw new Error('Project not found');
  }

  const landingpageIds = new Set(
    ownedProjects.map((project) => project.landingpageId)
  );
  if (landingpageIds.size !== 1) {
    throw new Error('Projects must belong to the same portfolio');
  }

  await db.$transaction(
    projectsData.map((project) =>
      db.project.update({
        where: { id: project.id },
        data: { position: project.position },
      })
    )
  );

  revalidateProjectPaths(ownedProjects[0].landingpage.slug);
  return { success: true };
}
