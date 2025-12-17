/* ===========================
   TABS (Técnicos / Tarefas / Ausências)
=========================== */
export function initTabs(defaultTabId = null) {
  const buttons = document.querySelectorAll(".tabBtn");
  const tabs = document.querySelectorAll(".tab");

  // página sem tabs (ex: login)
  if (!buttons.length || !tabs.length) return;

  function activate(tabId) {
    buttons.forEach(b => b.classList.remove("active"));
    tabs.forEach(t => t.classList.remove("active"));

    const btn = document.querySelector(`.tabBtn[data-tab="${tabId}"]`);
    const tab = document.getElementById(tabId);

    if (btn) btn.classList.add("active");
    if (tab) tab.classList.add("active");
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      activate(btn.dataset.tab);
    });
  });

  // aba inicial
  const firstTab =
    defaultTabId ||
    document.querySelector(".tabBtn.active")?.dataset.tab ||
    buttons[0].dataset.tab;

  activate(firstTab);
}

/* ===========================
   ESCAPE HTML
=========================== */
export function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[s]);
}

/* ===========================
   DATA ISO (YYYY-MM-DD)
=========================== */
export function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
