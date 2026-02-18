/* ====== UTILS ====== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ====== COLLAPSIBLE SECTIONS ====== */
function initCollapsibles() {
  $$(".task-section .section-header").forEach(header => {
    // Set ARIA
    const section = header.closest(".task-section");
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-expanded", "true");

    const toggle = () => {
      const collapsed = section.classList.toggle("collapsed");
      header.setAttribute("aria-expanded", String(!collapsed));
    };

    header.addEventListener("click", toggle);
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });
}

/* ====== VIEW SWITCH (List <-> Board) ====== */
function initViewSwitch() {
  const container = $(".task-container");
  const listBtn = $(".view-switch button:nth-child(1)");
  const boardBtn = $(".view-switch button:nth-child(2)");

  const setActive = (btn) => {
    $$(".view-switch button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  };

  listBtn.addEventListener("click", () => {
    container.classList.remove("board-view");
    setActive(listBtn);
  });

  boardBtn.addEventListener("click", () => {
    container.classList.add("board-view");
    setActive(boardBtn);
  });
}

/* ====== DARK MODE TOGGLE (⚙ button) ====== */
function initDarkMode() {
  const settingsBtn = $(".view-switch .settings-btn");
  if (!settingsBtn) return;

  // Restore preference
  const pref = localStorage.getItem("task-ui-theme");
  if (pref === "dark") document.documentElement.classList.add("dark");

  settingsBtn.setAttribute("title", "Toggle theme");
  settingsBtn.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("task-ui-theme", isDark ? "dark" : "light");
  });
}

/* ====== ADD TASK (+ button) ====== */
function initAddTask() {
  const addBtn = $(".view-switch .add-btn");
  const sections = $$(".task-section");

  const modal = $("#addTaskModal");
  const form = $("#addTaskForm");
  const cancel = $("#cancelAdd");

  if (!addBtn || !modal || !form) return;

  const openModal = () => {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    const first = form.querySelector('[name="title"]');
    first?.focus();
  };

  const closeModal = () => {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    form.reset();
    addBtn.focus();
  };

  addBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal();
  });

  cancel.addEventListener("click", () => closeModal());

  // Close when clicking backdrop
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) closeModal();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const title = fd.get("title");
    if (!title) return;
    const due = fd.get("due") || "—";
    const tag = fd.get("tag") || "work";
    const prio = fd.get("prio") || "mid";
    const index = Math.min(Math.max(parseInt(fd.get("section") || "0", 10), 0), 2);

    const targetSection = sections[index] || sections[0];
    const table = $(".task-table", targetSection);

    const row = document.createElement("div");
    row.className = "task-row";
    row.innerHTML = `
      <label><input type="checkbox"> ${escapeHtml(title)}</label>
      <span class="due-date"> ${escapeHtml(due)}</span>
      <span class="tag ${clsTag(tag)}">${labelTag(tag)}</span>
      <span class="priority ${clsPrio(prio)}">${labelPrio(prio)}</span>
    `;

    table.appendChild(row);
    targetSection.classList.remove("collapsed");
    const header = $(".section-header", targetSection);
    header?.setAttribute("aria-expanded", "true");

    closeModal();
  });
}

// Helpers for add-task
function clsTag(t) {
  t = String(t || "").toLowerCase();
  if (t.startsWith("work")) return "work";
  if (t.startsWith("health")) return "health";
  return "work";
}
function labelTag(t) {
  t = String(t || "").toLowerCase();
  if (t.startsWith("work")) return "Work";
  if (t.startsWith("health")) return "Health";
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function clsPrio(p) {
  p = String(p || "").toLowerCase();
  if (p.startsWith("hi")) return "high";
  if (p.startsWith("lo")) return "low";
  return "mid";
}
function labelPrio(p) {
  p = String(p || "").toLowerCase();
  if (p.startsWith("hi")) return "High";
  if (p.startsWith("lo")) return "Low";
  return "Mid";
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}

/* ====== CHECKBOX BEHAVIOR (optional strike-through) ====== */
function initCheckboxes() {
  document.addEventListener("change", (e) => {
    if (e.target.matches('.task-row input[type="checkbox"]')) {
      const label = e.target.closest("label");
      if (!label) return;
      label.style.opacity = e.target.checked ? "0.55" : "1";
      label.style.textDecoration = e.target.checked ? "line-through" : "none";
    }
  });
}

/* ====== BOOT ====== */
document.addEventListener("DOMContentLoaded", () => {
  initCollapsibles();
  initViewSwitch();
  initDarkMode();
  initAddTask();
  initCheckboxes();
});