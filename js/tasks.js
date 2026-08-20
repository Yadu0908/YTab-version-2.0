import { TaskStore } from "./storage.js";
import { renderContributionGraph } from "./contribution.js";

const CHECK_ICON = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>`;
const CROSS_ICON = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7l-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4L10.6 10.6l6.3-6.3z"/></svg>`;
const EDIT_ICON = `<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;

let editingId = null;

export async function renderTasks() {
  const container = document.getElementById("tasks-list");
  if (!container) return;

  const todays = await TaskStore.getToday();

  const rowsHtml = todays
    .map((t) => {
      if (t.id === editingId) {
        return `
    <div class="task-row editing" data-id="${t.id}">
      <div class="task-edit-fields">
        <input type="text" class="task-edit-name" value="${escapeAttr(t.name)}" autocomplete="off" />
        <textarea class="task-edit-desc" rows="2" placeholder="Description (optional)">${escapeHtml(t.description || "")}</textarea>
      </div>
      <div class="task-edit-actions">
        <button class="task-edit-save" title="Save">${CHECK_ICON}</button>
        <button class="task-edit-cancel" title="Cancel">${CROSS_ICON}</button>
      </div>
    </div>`;
      }
      return `
    <div class="task-row ${t.status === "done" ? "done" : ""}" data-id="${t.id}">
      <button class="task-complete" title="Mark complete">${CHECK_ICON}</button>
      <div class="task-text">
        <span class="task-name">${escapeHtml(t.name)}</span>
        ${t.description ? `<span class="task-desc">${escapeHtml(t.description)}</span>` : ""}
      </div>
      <button class="task-edit" title="Edit">${EDIT_ICON}</button>
      <button class="task-cross" title="Remove">${CROSS_ICON}</button>
    </div>`;
    })
    .join("");

  const emptyHtml = `<div class="task-empty">No targets yet — add one.</div>`;

  container.innerHTML = `
    <div class="tasks-inline-header">
      <div class="tasks-panel-title">Today's targets</div>
    </div>
    <div class="tasks-inline-body">
      <div class="task-rows">${todays.length ? rowsHtml : emptyHtml}</div>
      <div class="task-add-row">
        <input type="text" id="new-task-input" placeholder="Add today's target..." autocomplete="off" />
        <textarea id="new-task-desc" placeholder="Description (optional)" rows="2"></textarea>
        <button id="new-task-btn" title="Add">+ Add target</button>
      </div>
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

  container.querySelectorAll(".task-edit").forEach((btn) => {
    btn.onclick = (e) => {
      editingId = e.currentTarget.closest(".task-row").dataset.id;
      renderTasks();
    };
  });

  container.querySelectorAll(".task-edit-cancel").forEach((btn) => {
    btn.onclick = () => {
      editingId = null;
      renderTasks();
    };
  });

  container.querySelectorAll(".task-edit-save").forEach((btn) => {
    btn.onclick = async (e) => {
      const row = e.currentTarget.closest(".task-row");
      const id = row.dataset.id;
      const name = row.querySelector(".task-edit-name").value.trim();
      const description = row.querySelector(".task-edit-desc").value.trim();
      if (!name) return;
      await TaskStore.update(id, { name, description });
      editingId = null;
      await renderTasks();
    };
  });

  container.querySelectorAll(".task-edit-name").forEach((input) => {
    input.onkeydown = (e) => {
      if (e.key === "Enter")
        input.closest(".task-row").querySelector(".task-edit-save").click();
      if (e.key === "Escape") {
        editingId = null;
        renderTasks();
      }
    };
  });

  const input = document.getElementById("new-task-input");
  const descInput = document.getElementById("new-task-desc");
  const addBtn = document.getElementById("new-task-btn");

  const addTask = async () => {
    const val = input.value.trim();
    if (!val) return;
    const desc = descInput.value.trim();
    await TaskStore.add(val, desc);
    input.value = "";
    descInput.value = "";
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

  fitVisibleRows(container.querySelector(".task-rows"), 3);
}

// Measures the actual (variable) row heights — rows with a description are
// taller than plain ones — and sizes the scroll container so exactly
// `count` rows are fully visible, with the rest reachable by scrolling.
function fitVisibleRows(rowsEl, count) {
  if (!rowsEl) return;
  const rows = rowsEl.querySelectorAll(".task-row");
  if (rows.length <= count) {
    rowsEl.style.height = "auto";
    return;
  }
  rowsEl.style.height = "auto";
  const containerTop = rowsEl.getBoundingClientRect().top;
  const lastVisible = rows[count - 1];
  const height = lastVisible.getBoundingClientRect().bottom - containerTop;
  rowsEl.style.height = `${Math.ceil(height)}px`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}
