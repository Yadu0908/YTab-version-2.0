import { TaskStore } from "./storage.js";

let popoverEl = null;
let openAnchor = null;

function ensurePopover() {
  if (popoverEl) return popoverEl;
  popoverEl = document.createElement("div");
  popoverEl.id = "day-popover";
  popoverEl.className = "day-popover hidden";
  document.body.appendChild(popoverEl);

  // Close on any click outside the popover / not on a contrib cell
  document.addEventListener("click", (e) => {
    if (popoverEl.classList.contains("hidden")) return;
    if (popoverEl.contains(e.target)) return;
    if (e.target.classList?.contains("contrib-cell")) return; // handled by cell's own click
    closeDayPopover();
  });

  window.addEventListener("scroll", () => closeDayPopover(), true);
  window.addEventListener("resize", () => closeDayPopover());

  return popoverEl;
}

function formatDateLabel(dateKey) {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export async function openDayPopover(dateKey, cellEl) {
  const el = ensurePopover();
  const tasks = (await TaskStore.getAll()).filter((t) => t.date === dateKey);
  const done = tasks.filter((t) => t.status === "done");
  const pending = tasks.filter((t) => t.status !== "done");

  el.innerHTML = `
    <div class="day-popover-header">
      <span class="day-popover-date">${formatDateLabel(dateKey)}</span>
      <span class="day-popover-count">${done.length} completed</span>
    </div>
    <div class="day-popover-body">
      ${
        tasks.length === 0
          ? `<div class="day-popover-empty">No targets logged this day.</div>`
          : [...done, ...pending]
              .map(
                (t) => `
          <div class="day-popover-item ${t.status === "done" ? "done" : ""}">
            <span class="dp-dot"></span>
            <div class="dp-text">
              <span class="dp-name">${escapeHtml(t.name)}</span>
              ${t.description ? `<span class="dp-desc">${escapeHtml(t.description)}</span>` : ""}
            </div>
          </div>`,
              )
              .join("")
      }
    </div>
  `;

  const rect = cellEl.getBoundingClientRect();
  const popW = 250;

  // Render off-screen first to measure height
  el.classList.remove("hidden");
  el.style.visibility = "hidden";
  el.style.left = "0px";
  el.style.top = "0px";
  const popH = el.offsetHeight;

  let left = rect.left + rect.width / 2 - popW / 2;
  let top = rect.bottom + 10;

  left = Math.max(12, Math.min(left, window.innerWidth - popW - 12));
  if (top + popH > window.innerHeight - 12) {
    top = rect.top - popH - 10;
  }

  const originX = rect.left + rect.width / 2 - left;
  const originY = rect.top + rect.height / 2 - top;

  el.style.width = `${popW}px`;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.transformOrigin = `${originX}px ${originY}px`;
  el.style.visibility = "visible";
  el.classList.remove("open");

  // Force reflow so the transition plays from the collapsed state
  void el.offsetWidth;
  requestAnimationFrame(() => el.classList.add("open"));

  openAnchor?.classList.remove("cell-active");
  cellEl.classList.add("cell-active");
  openAnchor = cellEl;
}

export function closeDayPopover() {
  if (!popoverEl || popoverEl.classList.contains("hidden")) return;
  popoverEl.classList.remove("open");
  openAnchor?.classList.remove("cell-active");
  openAnchor = null;
  setTimeout(() => popoverEl?.classList.add("hidden"), 160);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
