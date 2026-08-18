import { TaskStore, todayStr } from "./storage.js";
import { openDayPopover } from "./dayPopover.js";

// 1-2 done -> level 1 (lightest), 3-4 -> level 2, 5+ -> level 3 (darkest)
function levelFor(count) {
  if (count >= 5) return 3;
  if (count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
}

/**
 * Renders the current calendar year (Jan 1 -> Dec 31) as a GitHub-style
 * grid into #contribution-graph, sized to fill the container's full width
 * (columns use flex:1, cells are aspect-ratio:1 squares) — no horizontal
 * scrolling needed since the week count for a year is fixed.
 * Days outside the current year (padding to complete the first/last week)
 * render as invisible spacers. Clicking a real, non-future day opens an
 * animated popover with that day's tasks.
 */
export async function renderContributionGraph() {
  const el = document.getElementById("contribution-graph");
  const monthsEl = document.getElementById("contribution-months");
  if (!el) return;

  const counts = await TaskStore.getCompletionCounts();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  // Pad out to full weeks (Sun -> Sat) so the grid lines up cleanly
  const start = new Date(jan1);
  start.setDate(jan1.getDate() - jan1.getDay());
  const end = new Date(dec31);
  end.setDate(dec31.getDate() + (6 - dec31.getDay()));

  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const todayKey = todayStr();

  el.style.setProperty("--week-count", weeks.length);

  el.innerHTML = weeks
    .map(
      (week) => `
    <div class="contrib-col">
      ${week
        .map((d) => {
          const inYear = d.getFullYear() === year;
          if (!inYear) return `<div class="contrib-cell level-pad"></div>`;

          const key = todayStr(d);
          const isFuture = d > today;
          const count = counts[key] || 0;
          const level = isFuture ? "future" : levelFor(count);
          const isToday = key === todayKey ? " is-today" : "";
          const clickable = isFuture ? "" : " clickable";
          return `<div class="contrib-cell level-${level}${isToday}${clickable}" data-date="${key}" title="${key} · ${count} completed"></div>`;
        })
        .join("")}
    </div>`,
    )
    .join("");

  el.querySelectorAll(".contrib-cell.clickable").forEach((cell) => {
    cell.addEventListener("click", (e) => {
      e.stopPropagation();
      openDayPopover(cell.dataset.date, cell);
    });
  });

  if (monthsEl) {
    monthsEl.style.setProperty("--week-count", weeks.length);
    monthsEl.innerHTML = weeks
      .map((week, i) => {
        const firstRealDay = week.find((d) => d.getFullYear() === year);
        if (!firstRealDay) return `<div class="contrib-month-col"></div>`;
        const prevWeek = weeks[i - 1];
        const prevFirstRealDay = prevWeek?.find(
          (d) => d.getFullYear() === year,
        );
        const showLabel =
          !prevFirstRealDay ||
          firstRealDay.getMonth() !== prevFirstRealDay.getMonth();
        const label = showLabel
          ? firstRealDay.toLocaleString("default", { month: "short" })
          : "";
        return `<div class="contrib-month-col">${label}</div>`;
      })
      .join("");
  }
}
