import { TaskStore } from "./storage.js";
import { renderContributionGraph } from "./contribution.js";

const CHECK_ICON = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>`;
const CROSS_ICON = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7l-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4L10.6 10.6l6.3-6.3z"/></svg>`;

export async function renderTasks() {
  const container = document.getElementById("tasks-list");
  if (!container) return;

  const todays = await TaskStore.getToday();

  const rowsHtml = todays
    .map(
      (t) => `
    <div class="task-row ${t.status === "done" ? "done" : ""}" data-id="${t.id}">
      <button class="task-complete" title="Mark complete">${CHECK_ICON}</button>
      <span class="task-name">${escapeHtml(t.name)}</span>
      <button class="task-cross" title="Remove">${CROSS_ICON}</button>
    </div>`,
    )
    .join("");

  const emptyHtml = `<div class="task-empty">No targets yet — add one below.</div>`;

  container.innerHTML = `
    <div class="task-rows">${todays.length ? rowsHtml : emptyHtml}</div>
    <div class="task-add-row">
      <input type="text" id="new-task-input" placeholder="Add today's target..." autocomplete="off" />
      <button id="new-task-btn" title="Add">+</button>
    </div>
  `;

  container.querySelectorAll(".task-complete").forEach((btn) => {
    btn.onclick = async (e) => {
      const id = e.currentTarget.closest(".task-row").dataset.id;
      await TaskStore.toggleComplete(id);
      await renderTasks();
      await renderContributionGraph();
    };
  });

  container.querySelectorAll(".task-cross").forEach((btn) => {
    btn.onclick = async (e) => {
      const id = e.currentTarget.closest(".task-row").dataset.id;
      await TaskStore.remove(id);
      await renderTasks();
      await renderContributionGraph();
    };
  });

  const input = document.getElementById("new-task-input");
  const addBtn = document.getElementById("new-task-btn");

  const addTask = async () => {
    const val = input.value.trim();
    if (!val) return;
    await TaskStore.add(val);
    input.value = "";
    await renderTasks();
    // new task lands at the top — scroll the list back up to reveal it
    container.querySelector(".task-rows")?.scrollTo({ top: 0 });
    document.getElementById("new-task-input")?.focus();
    // no graph re-render needed here since a freshly added task isn't "done" yet
  };

  addBtn.onclick = addTask;
  input.onkeydown = (e) => {
    if (e.key === "Enter") addTask();
  };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
