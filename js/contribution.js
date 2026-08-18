import { TaskStore, todayStr } from "./storage.js";

// 1-2 done -> level 1 (lightest), 3-4 -> level 2, 5+ -> level 3 (darkest)
function levelFor(count) {
  if (count >= 5) return 3;
  if (count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
}

/**
 * Renders a full GitHub-contribution-style grid (~1 year, 53 weeks) into
 * #contribution-graph, plus month labels into #contribution-months.
 * The wrapper (#contribution-scroll) handles horizontal scrolling so the
 * graph can be as wide as a year needs without stretching the page.
 */
export async function renderContributionGraph(weeksToShow = 53) {
  const el = document.getElementById("contribution-graph");
  const monthsEl = document.getElementById("contribution-months");
  if (!el) return;

  const counts = await TaskStore.getCompletionCounts();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the most recent Saturday so the grid ends on a full week
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const totalDays = weeksToShow * 7;
  const days = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    days.push(d);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const todayKey = todayStr();

  el.innerHTML = weeks
    .map(
      (week) => `
    <div class="contrib-col">
      ${week
        .map((d) => {
          const key = todayStr(d);
          const isFuture = d > today;
          const count = counts[key] || 0;
          const level = isFuture ? "future" : levelFor(count);
          const isToday = key === todayKey ? " is-today" : "";
          return `<div class="contrib-cell level-${level}${isToday}" data-date="${key}" title="${key} · ${count} completed"></div>`;
        })
        .join("")}
    </div>`,
    )
    .join("");

  if (monthsEl) {
    monthsEl.innerHTML = weeks
      .map((week, i) => {
        const firstDay = week[0];
        const prevFirstDay = i > 0 ? weeks[i - 1][0] : null;
        const showLabel =
          i === 0 || firstDay.getMonth() !== prevFirstDay.getMonth();
        const label = showLabel
          ? firstDay.toLocaleString("default", { month: "short" })
          : "";
        return `<div class="contrib-month-col">${label}</div>`;
      })
      .join("");
  }

  // Auto-scroll the graph to the right edge (today) on first render
  const scrollWrap = document.getElementById("contribution-scroll");
  if (scrollWrap) scrollWrap.scrollLeft = scrollWrap.scrollWidth;
}
