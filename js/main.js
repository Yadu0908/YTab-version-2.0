import { renderTasks } from "./tasks.js";
import { renderContributionGraph } from "./contribution.js";

let shortcuts = [];
let editingIndex = null;

const NEW_PLUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
  <path d="M0 0h24v24H0z" fill="none" />
  <path fill="currentColor" d="M11.5 12.5h-5q-.213 0-.356-.144T6 11.999t.144-.356t.356-.143h5v-5q0-.213.144-.356T12.001 6t.356.144t.143.356v5h5q.213 0 .356.144t.144.357t-.144.356t-.356.143h-5v5q0 .213-.144.356t-.357.144t-.356-.144t-.143-.356z" />
</svg>`;

const DOTS_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

const themePresets = [
  { c1: "#202124", c2: "#28292c", c3: "#3c4043", c4: "#1a1a1a" },
  { c1: "#2b3648", c2: "#354052", c3: "#313a49", c4: "#242626" },
  { c1: "#ffffff", c2: "#f8f9fa", c3: "#f1f3f4", c4: "#dee1e6" },
  { c1: "#3c4043", c2: "#2c2c2c", c3: "#5f6368", c4: "#1a1a1a" },
  { c1: "#1a73e8", c2: "#d2e3fc", c3: "#e8f0fe", c4: "#185abc" },
  { c1: "#0d652d", c2: "#e6f4ea", c3: "#ceead6", c4: "#073d1c" },
  { c1: "#a50e0e", c2: "#fce8e6", c3: "#fad2cf", c4: "#610808" },
  { c1: "#e37400", c2: "#feefe3", c3: "#fdd0b5", c4: "#8c4b00" },
  { c1: "#af52de", c2: "#f3e8fd", c3: "#e1bee7", c4: "#2d1a38" },
  { c1: "#007b83", c2: "#e0f2f1", c3: "#b2dfdb", c4: "#004a4f" },
  { c1: "#ff8bcb", c2: "#fce8f3", c3: "#f8bbd0", c4: "#3a1a2a" },
  { c1: "#424242", c2: "#f5f5f5", c3: "#eeeeee", c4: "#212121" },
];

// Chrome's _favicon API only resolves inside a real installed extension.
// When this page is opened as a plain demo (not chrome-extension://...),
// fall back to a public favicon service so icons still render.
function getFaviconUrl(pageUrl) {
  const isRealExtension =
    typeof chrome !== "undefined" &&
    chrome.runtime?.id &&
    location.protocol === "chrome-extension:";
  if (isRealExtension) {
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=64`;
  }
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(pageUrl)}`;
}

// Automatically merges the sample history from demodata.js into your
// real task list, exactly once, so the contribution graph looks alive
// without any manual step. It only ADDS past-dated demo entries — it
// never touches today's tasks or your shortcuts, and never runs twice
// (guarded by the "demoHistorySeeded" flag).
function maybeSeedDemoHistory(done) {
  chrome.storage.local.get(["demoHistorySeeded", "tasks"], (res) => {
    if (res.demoHistorySeeded || !window.YTAB_DEMO_DATA?.historyTasks) {
      done();
      return;
    }
    const existing = res.tasks || [];
    const merged = existing.concat(window.YTAB_DEMO_DATA.historyTasks);
    chrome.storage.local.set({ tasks: merged, demoHistorySeeded: true }, done);
  });
}

const sidebar = document.getElementById("customizer-sidebar");
const grid = document.getElementById("shortcuts-grid");
const themeGrid = document.getElementById("theme-presets");
const modal = document.getElementById("modal-overlay");

// Detects near-gray colors (dark/white/gray theme swatches, or a
// grayish custom pick) where using the color itself as an accent would
// have almost no contrast against the same-family background.
function isGrayscale(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return Math.max(r, g, b) - Math.min(r, g, b) < 24;
}

function applyTheme(mode, color) {
  let targetMode = mode;
  if (mode === "device") {
    targetMode = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  const preset = themePresets.find(
    (p) => p.c1.toLowerCase() === color.toLowerCase(),
  );
  const sidebarColor = preset ? preset.c2 : color;
  // For presets, use the curated tile shade. For any custom-picked color,
  // derive a soft tint of that exact color so shortcut icon tiles (and the
  // GitHub tile) visibly follow the chosen theme instead of staying gray.
  const tileColor = preset
    ? preset.c3
    : `color-mix(in srgb, ${color} 30%, transparent)`;
  const outerColor = preset ? preset.c4 : "#1a1a1a";
  // Accent must be a vivid, legible highlight — never the raw background
  // color. Grayscale swatches (dark/white/gray presets, and near-gray
  // custom picks) had c1 basically equal to the background, which made
  // the accent invisible. Detect that and fall back to a proper accent.
  const fallbackAccent = targetMode === "light" ? "#1a73e8" : "#8ab4f8";
  const accentColor = preset
    ? isGrayscale(preset.c1)
      ? fallbackAccent
      : preset.c1
    : isGrayscale(color)
      ? fallbackAccent
      : `color-mix(in srgb, ${color} 65%, white)`;

  document.documentElement.setAttribute("data-theme", targetMode);
  document.documentElement.style.setProperty("--bg-color", color);
  document.documentElement.style.setProperty("--side-bg", sidebarColor);
  document.documentElement.style.setProperty("--tile-bg", tileColor);
  document.documentElement.style.setProperty("--outer-shell", outerColor);
  document.documentElement.style.setProperty("--accent", accentColor);

  document.querySelectorAll(".segmented-control button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  document.querySelectorAll(".theme-box-wrapper").forEach((wrapper) => {
    wrapper.classList.toggle("active", wrapper.dataset.color === color);
  });
  chrome.storage.local.set({ userTheme: { mode, color } });
}

function renderAppearanceUI() {
  if (!themeGrid) return;
  themeGrid.innerHTML = "";
  themePresets.forEach((p) => {
    const wrapper = document.createElement("div");
    wrapper.className = "theme-box-wrapper";
    wrapper.dataset.color = p.c1;
    wrapper.style.backgroundColor = p.c4;
    wrapper.innerHTML = `<div class="theme-box split-bg" style="--c1:${p.c1}; --c2:${p.c2}; --c3:${p.c3};"></div>`;
    wrapper.onclick = () => {
      chrome.storage.local.get(["userTheme"], (res) =>
        applyTheme(res.userTheme?.mode || "dark", p.c1),
      );
    };
    themeGrid.appendChild(wrapper);
  });

  const customWrapper = document.createElement("div");
  customWrapper.className = "theme-box-wrapper";
  customWrapper.innerHTML = `
        <div class="theme-box custom-picker-box" style="background:#4285f4; color:white;">
            ${NEW_PLUS_ICON}
            <input type="color" id="custom-color-picker">
        </div>`;
  customWrapper.querySelector("input").oninput = (e) =>
    applyTheme("dark", e.target.value);
  themeGrid.appendChild(customWrapper);
}

function renderShortcuts() {
  if (!grid) return;
  grid.innerHTML = "";
  shortcuts.forEach((s, index) => {
    const div = document.createElement("div");
    div.className = "shortcut-item";
    div.draggable = true;
    div.dataset.index = index;
    const icon = getFaviconUrl(s.url);

    div.innerHTML = `
        <button class="edit-dots" title="Edit shortcut">${DOTS_ICON}</button>
        <div class="icon-box"><img src="${icon}"></div>
        <div class="label">${s.name}</div>
    `;

    // Click on item goes to URL
    div.onclick = (e) => {
      if (e.target.closest(".edit-dots")) return; // Don't trigger if dots clicked
      window.location.href = s.url;
    };

    // Edit dots trigger modal
    div.querySelector(".edit-dots").onclick = (e) => {
      e.stopPropagation();
      openModal(index);
    };

    // Right-click also triggers modal
    div.oncontextmenu = (e) => {
      e.preventDefault();
      openModal(index);
    };

    // --- Drag to reorder (Chrome new-tab style) ---
    div.ondragstart = (e) => {
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
      requestAnimationFrame(() => div.classList.add("dragging"));
    };
    div.ondragend = () => {
      div.classList.remove("dragging");
      grid
        .querySelectorAll(".drag-over")
        .forEach((el) => el.classList.remove("drag-over"));
    };
    div.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      div.classList.add("drag-over");
    };
    div.ondragleave = () => div.classList.remove("drag-over");
    div.ondrop = (e) => {
      e.preventDefault();
      div.classList.remove("drag-over");
      const fromIndex = Number(e.dataTransfer.getData("text/plain"));
      const toIndex = Number(div.dataset.index);
      if (Number.isNaN(fromIndex) || fromIndex === toIndex) return;
      const [moved] = shortcuts.splice(fromIndex, 1);
      shortcuts.splice(toIndex, 0, moved);
      chrome.storage.local.set({ myShortcuts: shortcuts }, renderShortcuts);
    };

    grid.appendChild(div);
  });

  // Add Shortcut Button
  const addBtn = document.createElement("div");
  addBtn.className = "shortcut-item add-btn";
  addBtn.innerHTML = `<div class="icon-box">${NEW_PLUS_ICON}</div><div class="label">Add shortcut</div>`;
  addBtn.onclick = () => openModal(null);
  grid.appendChild(addBtn);
}

document.addEventListener("DOMContentLoaded", () => {
  maybeSeedDemoHistory(() => {
    chrome.storage.local.get(["myShortcuts", "userTheme"], (res) => {
      shortcuts = res.myShortcuts || [
        { name: "GitHub", url: "https://github.com" },
      ];
      renderShortcuts();
      renderAppearanceUI();
      const theme = res.userTheme || { mode: "dark", color: "#202124" };
      applyTheme(theme.mode, theme.color);
    });

    renderTasks();
    renderContributionGraph();
  });

  document.getElementById("sidebar-toggle").onclick = () =>
    sidebar.classList.add("active");
  document.getElementById("close-sidebar").onclick = () =>
    sidebar.classList.remove("active");

  document.querySelectorAll(".segmented-control button").forEach((btn) => {
    btn.onclick = () => {
      const mode = btn.dataset.mode;
      chrome.storage.local.get(["userTheme"], (res) => {
        const color =
          res.userTheme?.color || (mode === "light" ? "#ffffff" : "#202124");
        applyTheme(mode, color);
      });
    };
  });

  const saveModal = () => {
    const n = document.getElementById("modal-name").value.trim();
    let u = document.getElementById("modal-url").value.trim();
    if (!n || !u) return;
    if (!u.startsWith("http")) u = "https://" + u;
    if (editingIndex !== null) shortcuts[editingIndex] = { name: n, url: u };
    else shortcuts.push({ name: n, url: u });
    chrome.storage.local.set({ myShortcuts: shortcuts }, () => {
      renderShortcuts();
      modal.classList.add("hidden");
    });
  };

  document.getElementById("modal-save").onclick = saveModal;

  const nameField = document.getElementById("modal-name");
  const urlField = document.getElementById("modal-url");
  [nameField, urlField].forEach((field) => {
    field.onkeydown = (e) => {
      if (e.key === "Enter") saveModal();
    };
  });

  document.getElementById("modal-delete").onclick = () => {
    if (editingIndex !== null) {
      shortcuts.splice(editingIndex, 1);
      chrome.storage.local.set({ myShortcuts: shortcuts }, () => {
        renderShortcuts();
        modal.classList.add("hidden");
      });
    }
  };
  document.getElementById("modal-cancel").onclick = () =>
    modal.classList.add("hidden");
});

function openModal(i) {
  editingIndex = i;
  const nIn = document.getElementById("modal-name");
  const uIn = document.getElementById("modal-url");
  const delBtn = document.getElementById("modal-delete");
  if (i !== null) {
    nIn.value = shortcuts[i].name;
    uIn.value = shortcuts[i].url;
    delBtn.classList.remove("hidden");
  } else {
    nIn.value = "";
    uIn.value = "";
    delBtn.classList.add("hidden");
  }
  modal.classList.remove("hidden");
  nIn.focus();
}
