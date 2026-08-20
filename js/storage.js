export const Storage = {
  get: async (key) => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] ?? null);
      });
    });
  },

  set: async (key, value) => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve(true);
      });
    });
  },
};

// YYYY-MM-DD in local time (avoids UTC date-shift bugs from toISOString)
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Task shape: { id, name, status: 'pending' | 'done', date: 'YYYY-MM-DD' }
 * Tasks are tagged with the date they were created on. The tasks panel
 * only shows *today's* tasks. The contribution graph derives per-day
 * completed counts by grouping all tasks (of any date) by their date.
 */
export const TaskStore = {
  getAll: async () => (await Storage.get("tasks")) || [],

  saveAll: async (tasks) => Storage.set("tasks", tasks),

  getToday: async () => {
    const tasks = await TaskStore.getAll();
    const today = todayStr();
    return tasks.filter((t) => t.date === today);
  },

  add: async (name, description = "") => {
    const tasks = await TaskStore.getAll();
    // unshift so the newest task renders at the top of today's list
    tasks.unshift({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name,
      description,
      status: "pending",
      date: todayStr(),
    });
    await TaskStore.saveAll(tasks);
    return tasks;
  },

  // Toggle complete/pending
  toggleComplete: async (id) => {
    const tasks = await TaskStore.getAll();
    const t = tasks.find((t) => t.id === id);
    if (t) t.status = t.status === "done" ? "pending" : "done";
    await TaskStore.saveAll(tasks);
    return tasks;
  },

  // Update a task's name/description (used by inline edit)
  update: async (id, { name, description } = {}) => {
    const tasks = await TaskStore.getAll();
    const t = tasks.find((t) => t.id === id);
    if (t) {
      if (name !== undefined) t.name = name;
      if (description !== undefined) t.description = description;
    }
    await TaskStore.saveAll(tasks);
    return tasks;
  },

  // Cross = remove the task entirely
  remove: async (id) => {
    const tasks = await TaskStore.getAll();
    const filtered = tasks.filter((t) => t.id !== id);
    await TaskStore.saveAll(filtered);
    return filtered;
  },

  // date -> count of completed tasks that day, e.g. { '2026-08-18': 5 }
  getCompletionCounts: async () => {
    const tasks = await TaskStore.getAll();
    const counts = {};
    tasks.forEach((t) => {
      if (t.status === "done") {
        counts[t.date] = (counts[t.date] || 0) + 1;
      }
    });
    return counts;
  },
};
