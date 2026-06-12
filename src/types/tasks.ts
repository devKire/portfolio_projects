export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskProjectRef {
  id: string;
  title: string;
}

export interface TaskFeatureRef {
  id: string;
  name: string;
}

export interface TaskSprintRef {
  id: string;
  name: string;
}

export interface TaskSubtaskRef {
  id: string;
  title: string;
  status: string;
}

export interface TaskWithRelations {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  dueDate?: Date | string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  position: number;
  tags: string[];
  projectId?: string | null;
  project?: TaskProjectRef | null;
  featureId?: string | null;
  feature?: TaskFeatureRef | null;
  sprintId?: string | null;
  sprint?: TaskSprintRef | null;
  subtasks?: TaskSubtaskRef[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface TaskProjectOption {
  id: string;
  title: string;
  isActive?: boolean;
}

export interface TaskPatch {
  title?: string;
  description?: string;
  status?: TaskStatus | string;
  priority?: TaskPriority | string;
  dueDate?: Date | null;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  projectId?: string | null;
  project?: TaskProjectRef | null;
  featureId?: string | null;
  feature?: TaskFeatureRef | null;
  sprintId?: string | null;
  sprint?: TaskSprintRef | null;
  parentId?: string | null;
}
