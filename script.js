/* ====== UTILS ====== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ====== COLLAPSIBLE SECTIONS ====== */
function initCollapsibles() {
  $$(".task-section .section-header").forEach((header) => {
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
    $$(".view-switch button").forEach((b) => b.classList.remove("active"));
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

  addBtn?.addEventListener("click", () => {
    // Quick, non-blocking prompts (simple UX). Replace with a form if needed.
    const title = prompt("Task title:", "New task");
    if (!title) return;

    const due = prompt("Due date label (e.g., Nov 20):", "Nov 20") || "—";
    const tag = prompt("Tag (work/health/other):", "work") || "work";
    const prio = prompt("Priority (high/mid/low):", "mid") || "mid";

    // Choose a section to add into
    const sectionNames = ["To Do", "In Progress", "Done"];
    const pick = prompt(
      `Add to section:\n1) To Do\n2) In Progress\n3) Done`,
      "1"
    );
    const index = Math.min(Math.max(parseInt(pick || "1", 10) - 1, 0), 2);

    const targetSection = sections[index];
    if (!targetSection) return;

    const table = $(".task-table", targetSection);

    // Build the row
    const row = document.createElement("div");
    row.className = "task-row";
    row.innerHTML = `
      <label><input type="checkbox"> ${escapeHtml(title)}</label>
      <span class="due-date"> ${escapeHtml(due)}</span>
      <span class="tag ${clsTag(tag)}">${labelTag(tag)}</span>
      <span class="priority ${clsPrio(prio)}">${labelPrio(prio)}</span>
    `;

    table.appendChild(row);
    // If the section was collapsed, open it
    targetSection.classList.remove("collapsed");
    const header = $(".section-header", targetSection);
    header?.setAttribute("aria-expanded", "true");
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
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m])
  );
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

/* ====== DATE / DAY HEADER ====== */
function dateWithOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + Number(offset));
  return d;
}

function updateDateDisplay(date) {
  const dayEl = document.getElementById("dateDay");
  const dateEl = document.getElementById("dateFull");
  if (!dayEl && !dateEl) return;

  const dayStr = date.toLocaleDateString(undefined, { weekday: "long" });
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (dayEl) dayEl.textContent = dayStr;
  if (dateEl) dateEl.textContent = dateStr;
}

function initDateHeader() {
  updateDateDisplay(new Date());
}
/* ====== WEEK STRIP (simple, beginner-friendly) ====== */
let currentOffset = 0; // days from today; 0 means today

function renderWeekStrip(offset) {
  const strip = document.getElementById("weekStrip");
  if (!strip) return;
  strip.innerHTML = "";
  // create previous button on the left
  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.id = "prevDay";
  prevBtn.className = "strip-nav prev";
  prevBtn.setAttribute("aria-label", "Previous day");
  prevBtn.textContent = "◀";
  prevBtn.addEventListener("click", () => {
    currentOffset -= 1;
    renderWeekStrip(currentOffset);
  });
  strip.appendChild(prevBtn);

  // center the strip around the offset (show 7 days: -3..+3)
  for (let i = -3; i <= 3; i++) {
    const dayOffset = offset + i;
    const d = dateWithOffset(dayOffset);

    const item = document.createElement("button");
    item.className = "week-day" + (i === 0 ? " selected" : "");
    item.type = "button";
    item.setAttribute("data-offset", String(dayOffset));

    const name = d.toLocaleDateString(undefined, { weekday: "short" });
    const num = d.getDate();

    item.innerHTML = `<span class="wkname">${name}</span><span class="wknum">${num}</span>`;

    // clicking a day selects it (sets new offset and re-renders)
    item.addEventListener("click", () => {
      currentOffset = dayOffset;
      renderWeekStrip(currentOffset);
      updateDateDisplay(dateWithOffset(currentOffset));
    });

    strip.appendChild(item);
  }

  // create next button on the right
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.id = "nextDay";
  nextBtn.className = "strip-nav next";
  nextBtn.setAttribute("aria-label", "Next day");
  nextBtn.textContent = "▶";
  nextBtn.addEventListener("click", () => {
    currentOffset += 1;
    renderWeekStrip(currentOffset);
  });
  strip.appendChild(nextBtn);

  // update the main header too
  updateDateDisplay(dateWithOffset(offset));
}

function initWeekStrip() {
  // initial render (today)
  currentOffset = 0;
  renderWeekStrip(currentOffset);
}

/* ====== BOOT ====== */
document.addEventListener("DOMContentLoaded", () => {
  initCollapsibles();
  initViewSwitch();
  initDarkMode();
  initAddTask();
  initCheckboxes();
  initDateHeader();
  initWeekStrip();
});
