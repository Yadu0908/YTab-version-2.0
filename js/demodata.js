// ---------------------------------------------------------------------
// YTab demo history data. Edit the numbers below to change how the
// contribution graph looks. This is a plain global (not a module) so it
// loads before main.js with zero extra wiring. main.js merges this in
// ONCE, automatically, without touching your real today's tasks or
// shortcuts — no URL flags or manual steps needed.
// ---------------------------------------------------------------------

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

(function buildDemoData() {
  const taskNames = [
    "Workout",
    "Read 20 pages",
    "LeetCode problem",
    "Push Advenxure PR",
    "Fix roster-gate bug",
    "Write blog draft",
    "Study DSA",
    "Practice guitar",
    "FL Studio session",
    "Mix new track",
    "Edit Instagram reel",
    "Record vocals",
    "Review PRs",
    "Plan sprint",
    "Meditate",
    "Apply to jobs",
    "Refactor component",
    "Write tests",
    "DaVinci Resolve export",
    "Storybook update",
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = [];
  let streak = 0; // consecutive active days — real habits cluster, not pure noise

  for (let i = 1; i <= 200; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const dow = day.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dow === 0 || dow === 6;

    // ~12% totally dead days regardless (sick day, travel, burnout) —
    // real trackers are never perfectly consistent.
    const skip = Math.random() < 0.12;

    // Weekends trend lighter; a live streak nudges the odds up a bit
    // (momentum), mimicking how habits actually build/break.
    const base = isWeekend ? 0.4 : 0.68;
    const momentum = Math.min(streak * 0.03, 0.15);
    const activeChance = skip ? 0 : Math.min(base + momentum, 0.92);

    const isActive = Math.random() < activeChance;

    let count = 0;
    if (isActive) {
      streak++;
      const roll = Math.random();
      if (streak > 4 && roll > 0.55) count = 5 + Math.floor(Math.random() * 3);
      else if (roll > 0.55) count = 3 + Math.floor(Math.random() * 2);
      else count = 1 + Math.floor(Math.random() * 2);
    } else {
      streak = 0;
    }

    for (let j = 0; j < count; j++) {
      tasks.push({
        id: `demo-${day.getTime()}-${j}`,
        name: taskNames[Math.floor(Math.random() * taskNames.length)],
        description: "",
        status: "done",
        date: ymd(day),
      });
    }
  }

  window.YTAB_DEMO_DATA = { historyTasks: tasks };
})();
