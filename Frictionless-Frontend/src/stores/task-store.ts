import { create } from 'zustand';
import type {
  Task,
  TaskGroup,
  TaskStatus,
  AIExtraction,
  CompletionSource,
} from '@/types/database';

type ViewMode = 'kanban' | 'list';

export interface TaskProgress {
  allotted_total: number;
  current_pending: number;
}

interface TaskStore {
  tasks: Task[];
  completedTasks: Task[];
  taskGroups: TaskGroup[];
  taskProgress: TaskProgress | null;
  tasksLoaded: boolean;
  selectedTask: Task | null;
  viewMode: ViewMode;
  filterStatus: string | null;
  setTasks: (tasks: Task[]) => void;
  setCompletedTasks: (tasks: Task[]) => void;
  setTaskGroups: (taskGroups: TaskGroup[]) => void;
  setTaskProgress: (progress: TaskProgress | null) => void;
  setTasksLoaded: (loaded: boolean) => void;
  incrementGroupDoneCount: (groupId: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, newGroupId: string, newStatus: TaskStatus) => void;
  selectTask: (task: Task | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilterStatus: (status: string | null) => void;
  completeTaskWithAI: (
    taskId: string,
    extractions: AIExtraction[],
    source?: CompletionSource
  ) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  completedTasks: [],
  taskGroups: [],
  taskProgress: null,
  tasksLoaded: false,
  selectedTask: null,
  viewMode: 'list',
  filterStatus: null,
  setTasks: (tasks) => set({ tasks }),
  setCompletedTasks: (completedTasks) => set({ completedTasks }),
  setTaskGroups: (taskGroups) => set({ taskGroups }),
  setTaskProgress: (taskProgress) => set({ taskProgress }),
  setTasksLoaded: (tasksLoaded) => set({ tasksLoaded }),
  incrementGroupDoneCount: (groupId) =>
    set((state) => ({
      taskGroups: state.taskGroups.map((g) =>
        g.id === groupId
          ? { ...g, done_count: (g.done_count ?? 0) + 1 }
          : g
      ),
    })),
  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task],
    })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      ),
      selectedTask:
        state.selectedTask?.id === id
          ? { ...state.selectedTask, ...updates, updated_at: new Date().toISOString() }
          : state.selectedTask,
      taskGroups: state.taskGroups.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) =>
          t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
        ),
      })),
    })),
  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
      taskGroups: state.taskGroups.map((g) => ({
        ...g,
        tasks: g.tasks.filter((t) => t.id !== id),
      })),
    })),
  moveTask: (taskId, newGroupId, newStatus) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              task_group_id: newGroupId,
              status: newStatus,
              updated_at: new Date().toISOString(),
            }
          : t
      ),
      selectedTask:
        state.selectedTask?.id === taskId
          ? {
              ...state.selectedTask,
              task_group_id: newGroupId,
              status: newStatus,
              updated_at: new Date().toISOString(),
            }
          : state.selectedTask,
      taskGroups: state.taskGroups.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                task_group_id: newGroupId,
                status: newStatus,
                updated_at: new Date().toISOString(),
              }
            : t
        ),
      })),
    })),
  selectTask: (selectedTask) => set({ selectedTask }),
  setViewMode: (viewMode) => set({ viewMode }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  completeTaskWithAI: (taskId, extractions, source = 'ai_file_upload') =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'done' as TaskStatus,
              ai_extractions: extractions,
              completion_source: source,
              requires_rescore: true,
              updated_at: new Date().toISOString(),
            }
          : t
      ),
      selectedTask:
        state.selectedTask?.id === taskId
          ? {
              ...state.selectedTask,
              status: 'done' as TaskStatus,
              ai_extractions: extractions,
              completion_source: source,
              requires_rescore: true,
              updated_at: new Date().toISOString(),
            }
          : state.selectedTask,
      taskGroups: state.taskGroups.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'done' as TaskStatus,
                ai_extractions: extractions,
                completion_source: source,
                requires_rescore: true,
                updated_at: new Date().toISOString(),
              }
            : t
        ),
      })),
    })),
}));
