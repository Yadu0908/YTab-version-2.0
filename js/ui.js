export const UI = {
  renderShortcuts: (shortcuts) => {
    const grid = document.getElementById("shortcuts-grid");

    let html = shortcuts
      .map((s, i) => {
        // Native Chrome Favicon API
        const iconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(s.url)}&size=64`;
        return `
            <div class="shortcut-wrapper">
                <button class="shortcut-edit-btn" data-index="${i}">⋮</button>
                <a href="${s.url}" class="shortcut-tile">
                    <img src="${iconUrl}" alt="">
                </a>
                <span class="shortcut-label">${s.title}</span>
            </div>`;
      })
      .join("");

    html += `
        <div class="shortcut-wrapper" id="open-modal-btn">
            <div class="add-shortcut">+</div>
            <span class="shortcut-label">Add Shortcut</span>
        </div>`;

    grid.innerHTML = html;
  },
};
