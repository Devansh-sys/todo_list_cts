/* script.js - Date-aware tasks with In Progress status, compact actions, revert from Done,
   and per-section filters by Task Tag and Priority (no search bar) */
"use strict";

/* ====== SESSION STORAGE KEYS ====== */
const SS_KEYS = {
  tasks: "tasklist.tasks",
  counter: "tasklist.counter",
};

/* ====== UTILS ====== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const byId = (id) => document.getElementById(id);

function startOfDay(d) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
function isoDate(d) {
  const nd = startOfDay(d);
  const y = nd.getFullYear();
  const m = String(nd.getMonth() + 1).padStart(2, "0");
  const day = String(nd.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ====== TASK LIST STORAGE ====== */
let tasks = [];
let taskIdCounter = 0;

/* ====== DATE / DAY HEADER ====== */
let currentOffset = 0; // days from today (0 = today)
function today() {
  return startOfDay(new Date());
}
function dateWithOffset(offset) {
  const d = today();
  d.setDate(d.getDate() + Number(offset));
  return d;
}
function getSelectedDateStr() {
  return isoDate(dateWithOffset(currentOffset));
}

/* ====== LOAD / SAVE TASKS ====== */
function loadFromSession() {
  try {
    const savedTasks = sessionStorage.getItem(SS_KEYS.tasks);
    tasks = savedTasks ? JSON.parse(savedTasks) : [];

    // Migrate legacy tasks (add date if missing)
    const todayStr = isoDate(new Date());
    tasks.forEach((t) => {
      if (!t.date) t.date = todayStr; // ---- Date-aware rendering (migration) ----
    });

    const savedCounter = sessionStorage.getItem(SS_KEYS.counter);
    if (savedCounter !== null) {
      taskIdCounter = parseInt(savedCounter, 10) || 0;
    } else {
      taskIdCounter = tasks.length
        ? Math.max(...tasks.map((t) => Number(t.id) || 0)) + 1
        : 0;
    }
  } catch (err) {
    console.warn("Failed to load session tasks:", err);
    tasks = [];
    taskIdCounter = 0;
  }
}

function saveToSession() {
  try {
    sessionStorage.setItem(SS_KEYS.tasks, JSON.stringify(tasks));
    sessionStorage.setItem(SS_KEYS.counter, String(taskIdCounter));
  } catch (err) {
    console.warn("Failed to save session tasks:", err);
  }
}

function loadInitialTasks() {
  loadFromSession();
}

/* ====== LAYOUT HELPERS (auto ensure sections / form fields) ====== */

/**
 * Ensure the "In Progress" section exists and sits between To Do and Done.
 * ---- In Progress task status ----
 */
function ensureInProgressSection() {
  const container = $(".task-container");
  if (!container) return;

  const sections = $$(".task-section");
  let toDoSection = null;
  let inProgSection = null;
  let doneSection = null;

  sections.forEach((sec) => {
    const h3 = $("h3", sec);
    const title = h3 ? h3.textContent.trim() : "";
    if (title === "To Do") toDoSection = sec;
    if (title === "In Progress") inProgSection = sec;
    if (title === "Done") doneSection = sec;
  });

  if (inProgSection) {
    if (toDoSection) toDoSection.insertAdjacentElement("afterend", inProgSection);
    return;
  }

  // Create the "In Progress" section
  const sec = document.createElement("section");
  sec.className = "task-section";
  sec.innerHTML = `
    <div class="section-header">
      <h3>In Progress</h3>
    </div>
    <!-- Filters bar will be injected here -->
    <div class="task-table">
      <div class="task-table-header">
        <span>Task</span>
        <span>Timeline</span>
        <span>Task Tags</span>
        <span>Priority</span>
        <span>Actions</span>
      </div>
    </div>
  `;

  if (toDoSection) {
    toDoSection.insertAdjacentElement("afterend", sec);
  } else if (doneSection) {
    doneSection.insertAdjacentElement("beforebegin", sec);
  } else {
    container.appendChild(sec);
  }
}

/**
 * Ensure the Status dropdown exists in Add/Edit Task form.
 * ---- In Progress task status ----
 */
function ensureStatusSelectInForm() {
  const taskForm = byId("taskForm");
  if (!taskForm) return;

  if (byId("taskStatus")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "form-row";
  wrapper.innerHTML = `
    <div class="form-group">
      <label for="taskStatus">Status *</label>
      <select id="taskStatus" name="status" required>
        <option value="To Do">To Do</option>
        <option value="In Progress">In Progress</option> <!-- In Progress task status -->
        <option value="Done">Done</option>
      </select>
    </div>
  `;

  const timelineRow = $("#taskStartTime")?.closest(".form-row");
  if (timelineRow) {
    timelineRow.insertAdjacentElement("beforebegin", wrapper);
  } else {
    taskForm.insertBefore(wrapper, $(".form-actions", taskForm));
  }
}

/**
 * Ensure a Date input exists in Add/Edit Task form.
 * ---- Date-aware rendering ----
 */
function ensureDateInputInForm() {
  const taskForm = byId("taskForm");
  if (!taskForm) return;
  if (byId("taskDate")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "form-row";
  wrapper.innerHTML = `
    <div class="form-group">
      <label for="taskDate">Date *</label>
      <input type="date" id="taskDate" name="date" required />
    </div>
  `;

  const timelineRow = $("#taskStartTime")?.closest(".form-row");
  if (timelineRow) {
    timelineRow.insertAdjacentElement("beforebegin", wrapper);
  } else {
    taskForm.insertBefore(wrapper, $(".form-actions", taskForm));
  }
}

/* ====== COLLAPSIBLE SECTIONS ====== */
function initCollapsibles() {
  $$(".task-section .section-header").forEach((header) => {
    const section = header.closest(".task-section");
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-expanded", "true");

    const toggle = () => {
      const collapsed = section.classList.toggle("collapsed");
      header.setAttribute("aria-expanded", String(!collapsed));
    };

    header.addEventListener("click", (e) => {
      // Ignore clicks on filter toggle button inside header
      if ((e.target).closest?.(".filter-toggle-btn")) return;
      toggle();
    });
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });
}

/* ====== VIEW SWITCH (List only) ====== */
function initViewSwitch() {
  const container = $(".task-container");
  container?.classList.remove("board-view");
}

/* ====== DARK MODE TOGGLE ====== */
function initDarkMode() {
  const settingsBtn = $(".view-switch .settings-btn");
  if (!settingsBtn) return;

  const pref = localStorage.getItem("task-ui-theme");
  if (pref === "dark") document.documentElement.classList.add("dark");

  const updateButtonText = () => {
    const isDark = document.documentElement.classList.contains("dark");
    settingsBtn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
  };

  updateButtonText();
  settingsBtn.setAttribute("title", "Toggle theme");
  settingsBtn.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("task-ui-theme", isDark ? "dark" : "light");
    updateButtonText();
  });
}

/* ====== PROGRESS (selected day only) ====== */
function updateProgress() {
  const selected = getSelectedDateStr();
  const dayTasks = tasks.filter((t) => t.date === selected);
  const total = dayTasks.length;
  const done = dayTasks.filter((t) => t.section === "Done").length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const percentEl = byId("progressPercent");
  const countsEl = byId("progressCounts");
  const fillEl = byId("progressFill");
  const barEl = $(".progress-bar");

  if (percentEl) percentEl.textContent = `${percent}%`;
  if (countsEl) countsEl.textContent = `${done} of ${total} completed`;
  if (fillEl) fillEl.style.width = `${percent}%`;
  if (barEl) barEl.setAttribute("aria-valuenow", String(percent));
  if (barEl) barEl.setAttribute("aria-label", "Selected day's progress");
}

/* ====== ADD / EDIT TASK ====== */
let editingTaskId = null;

function resetForm() {
  byId("taskForm")?.reset();
  byId("taskTitle")?.focus();
  const start = byId("taskStartTime");
  const end = byId("taskEndTime");
  if (start) start.value = "";
  if (end) end.value = "";
  const statusSel = byId("taskStatus");
  if (statusSel) statusSel.value = "To Do";
  const dateSel = byId("taskDate");
  if (dateSel) dateSel.value = getSelectedDateStr(); // default to currently selected day
}

function initAddTask() {
  const addBtn = $(".view-switch .add-btn");
  const formContainer = byId("addTaskForm");
  const closeFormBtn = byId("closeFormBtn");
  const cancelBtn = byId("cancelBtn");
  const formOverlay = byId("formOverlay");
  const taskForm = byId("taskForm");
  const formTitle = byId("formTitle");
  const currentDateEl = byId("currentDate");

  // Ensure new controls (Status + Date) exist
  ensureStatusSelectInForm();     // ---- In Progress task status ----
  ensureDateInputInForm();        // ---- Date-aware rendering ----

  const displayCurrentDate = () => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const todayStr = new Date().toLocaleDateString("en-US", options);
    if (currentDateEl) currentDateEl.textContent = `Today: ${todayStr}`;
  };

  addBtn?.addEventListener("click", () => {
    editingTaskId = null;
    resetForm(); // sets date to selected day
    displayCurrentDate();
    if (formTitle) formTitle.textContent = "Add New Task";
    formContainer?.classList.remove("hidden");
  });

  const closeForm = () => {
    formContainer?.classList.add("hidden");
    editingTaskId = null;
  };

  closeFormBtn?.addEventListener("click", closeForm);
  cancelBtn?.addEventListener("click", closeForm);
  formOverlay?.addEventListener("click", closeForm);

  taskForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = byId("taskTitle")?.value.trim();
    const tag = byId("taskTag")?.value;
    const prio = byId("taskPriority")?.value;

    const startTime = byId("taskStartTime")?.value || "";
    const endTime = byId("taskEndTime")?.value || "";

    const statusSel = byId("taskStatus");
    const dateSel = byId("taskDate");
    const chosenSection = statusSel ? statusSel.value : "To Do";
    const chosenDate = (dateSel && dateSel.value) ? dateSel.value : getSelectedDateStr();

    if (!title) {
      alert("Please enter a task title");
      return;
    }

    if (editingTaskId !== null) {
      const task = tasks.find((t) => t.id === editingTaskId);
      if (task) {
        const oldSection = task.section;

        if (oldSection === "Done") {
          alert("Completed tasks cannot be edited.");
          return;
        }

        // If moving into Done via form, remember where from
        if (oldSection !== "Done" && chosenSection === "Done") {
          task.previousSection = oldSection; // ---- revert support ----
        }

        task.title = title;
        task.tag = tag;
        task.prio = prio;
        task.section = chosenSection; // ---- In Progress task status ----
        task.startTime = startTime;
        task.endTime = endTime;
        task.date = chosenDate;       // ---- Date-aware rendering ----

        saveToSession();
      }
    } else {
      // Add new task
      const newTask = {
        id: taskIdCounter++,
        title,
        due: "", // legacy, unused
        tag,
        prio,
        section: chosenSection,       // ---- In Progress task status ----
        previousSection: null,        // ---- revert support ----
        startTime,
        endTime,
        date: chosenDate,             // ---- Date-aware rendering ----
      };
      tasks.push(newTask);
      saveToSession();
    }

    closeForm();
    resetForm();
    renderAllTasks();  // ---- Date-aware re-render ----
    updateProgress();
  });
}

/* ====== TIMELINE HELPERS ====== */
function formatClock12h(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  if (Number.isNaN(h)) return "";

  const suffix = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h}${suffix}` : `${h}:${String(m).padStart(2, "0")}${suffix}`;
}
function formatTimelineWindow(startTime, endTime) {
  const s = formatClock12h(startTime);
  const e = formatClock12h(endTime);
  if (s && e) return `⏰ ${s}–${e}`;
  if (s && !e) return `⏰ ${s}`;
  if (!s && e) return `⏰ —–${e}`;
  return "";
}

/* ====== ROW RENDERING ====== */
function clsTag(t) {
  t = String(t || "").toLowerCase();
  if (t.startsWith("work")) return "work";
  if (t.startsWith("health")) return "health";
  return "other"; // default
}
function labelTag(t) {
  t = String(t || "").toLowerCase();
  if (t.startsWith("work")) return "Work";
  if (t.startsWith("health")) return "Health";
  return "Other";
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
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}

/**
 * Build the inner HTML for a task row.
 * - Compact "▶" button for To Do -> In Progress
 * - ✏️ for Edit (hidden in Done)
 * - 🗑️ for Delete
 * ---- In Progress task status ----
 */
function buildRowHtml(task) {
  const isChecked = task.section === "Done";
  const timelineTxt = formatTimelineWindow(task.startTime, task.endTime);
  const showEdit = task.section !== "Done";

  return `
    <label><input type="checkbox" ${isChecked ? "checked" : ""}> ${escapeHtml(task.title)}</label>
    <span class="timeline">${timelineTxt ? escapeHtml(timelineTxt) : ""}</span>
    <span class="tag ${clsTag(task.tag)}">${labelTag(task.tag)}</span>
    <span class="priority ${clsPrio(task.prio)}">${labelPrio(task.prio)}</span>
    <div class="task-actions">
      ${task.section === "To Do" ? `<button class="inprogress-btn" title="Move to In Progress">▶</button>` : ``}
      ${showEdit ? `<button class="edit-btn" title="Edit">✏️</button>` : ``}
      <button class="delete-btn" title="Delete">🗑️</button>
    </div>
  `;
}

function createTaskRow(task) {
  const row = document.createElement("div");
  row.className = "task-row";
  row.setAttribute("data-task-id", task.id);
  row.innerHTML = buildRowHtml(task);
  const label = $("label", row);
  if (label && task.section === "Done") {
    label.style.opacity = "0.55";
    label.style.textDecoration = "line-through";
  }
  return row;
}

/* ====== SECTION / MOVE HELPERS ====== */
function findSectionByTitle(title) {
  let targetSectionEl = null;
  $$(".task-section").forEach((sec) => {
    const heading = $("h3", sec);
    if (heading && heading.textContent.trim() === title) {
      targetSectionEl = sec;
    }
  });
  return targetSectionEl;
}

function moveTaskToSection(taskId, task, targetSection) {
  task.section = targetSection; // ---- In Progress / Done / To Do ----
  saveToSession();
  renderAllTasks();  // ---- Date-aware re-render ----
  updateProgress();
}

/* ====== CHECKBOX BEHAVIOR (To Do / In Progress <-> Done) ====== */
function initCheckboxes() {
  document.addEventListener("change", (e) => {
    if (e.target.matches('.task-row input[type="checkbox"]')) {
      const row = e.target.closest(".task-row");
      const label = e.target.closest("label");
      if (!row || !label) return;

      const taskId = parseInt(row.getAttribute("data-task-id"));
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const isChecked = e.target.checked;

      // Style
      label.style.opacity = isChecked ? "0.55" : "1";
      label.style.textDecoration = isChecked ? "line-through" : "none";

      if (isChecked) {
        // ➤ MOVING TO DONE → remember previous section for proper revert
        task.previousSection = task.section; // ---- revert support ----
        moveTaskToSection(taskId, task, "Done");
      } else {
        // ➤ UNCHECKED
        if (task.section === "Done") {
          const revertSection = task.previousSection || "To Do";
          task.previousSection = null;
          moveTaskToSection(taskId, task, revertSection);
        } else {
          // If not in Done, no forced move
          renderAllTasks();
          updateProgress();
        }
      }
    }
  });
}

/* ====== "Move to In Progress" BUTTON HANDLER ======
   Allows quick move from "To Do" -> "In Progress".
   ---- In Progress task status ----
===================================================== */
function initMoveToInProgress() {
  document.addEventListener("click", (e) => {
    if (e.target.matches(".inprogress-btn")) {
      const row = e.target.closest(".task-row");
      if (!row) return;

      const taskId = parseInt(row.getAttribute("data-task-id"));
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      moveTaskToSection(taskId, task, "In Progress");
    }
  });
}

/* ====== EDIT TASK ====== */
function initEditTask() {
  document.addEventListener("click", (e) => {
    if (e.target.matches(".edit-btn")) {
      const row = e.target.closest(".task-row");
      if (!row) return;

      const taskId = parseInt(row.getAttribute("data-task-id"));
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (task.section === "Done") {
        alert("Completed tasks cannot be edited.");
        return;
      }

      ensureStatusSelectInForm();  // ---- In Progress task status ----
      ensureDateInputInForm();     // ---- Date-aware rendering ----

      editingTaskId = taskId;
      byId("taskTitle").value = task.title || "";
      byId("taskTag").value = task.tag || "work";
      byId("taskPriority").value = task.prio || "mid";
      byId("taskStartTime").value = task.startTime || "";
      byId("taskEndTime").value = task.endTime || "";

      const statusSel = byId("taskStatus");
      if (statusSel) statusSel.value = task.section || "To Do";

      const dateSel = byId("taskDate");
      if (dateSel) dateSel.value = task.date || getSelectedDateStr();

      const formContainer = byId("addTaskForm");
      const formTitle = byId("formTitle");
      if (formTitle) formTitle.textContent = "Edit Task";
      formContainer?.classList.remove("hidden");
      byId("taskTitle").focus();
    }
  });
}

/* ====== DELETE TASK ====== */
function initDeleteTask() {
  document.addEventListener("click", (e) => {
    if (e.target.matches(".delete-btn")) {
      const row = e.target.closest(".task-row");
      if (!row) return;

      const taskId = parseInt(row.getAttribute("data-task-id"));
      if (!confirm("Are you sure you want to delete this task?")) return;

      tasks = tasks.filter((t) => t.id !== taskId);
      saveToSession();
      renderAllTasks();  // ---- Date-aware re-render ----
      updateProgress();
    }
  });
}

/* ====== DISPLAY TODAY'S DATE (decorative) ====== */
function displayTodayDate() {
  const todayDateEl = byId("todayDate");
  if (!todayDateEl) return;

  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const todayStr = new Date().toLocaleDateString("en-US", options);
  todayDateEl.textContent = todayStr;
}

/* ====== DATE HEADER TEXT ====== */
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

/* ====== WEEK STRIP (date navigation) ====== */
function renderWeekStrip(offset) {
  const strip = document.getElementById("weekStrip");
  if (!strip) return;
  strip.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.id = "prevDay";
  prevBtn.className = "strip-nav prev";
  prevBtn.setAttribute("aria-label", "Previous day");
  prevBtn.textContent = "◀";
  prevBtn.addEventListener("click", () => {
    currentOffset -= 1;
    renderWeekStrip(currentOffset);
    renderAllTasks();  // ---- Date-aware re-render ----
    updateProgress();
  });
  strip.appendChild(prevBtn);

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

    item.addEventListener("click", () => {
      currentOffset = dayOffset;
      renderWeekStrip(currentOffset);
      updateDateDisplay(dateWithOffset(currentOffset));
      renderAllTasks();  // ---- Date-aware re-render ----
      updateProgress();
    });

    strip.appendChild(item);
  }

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.id = "nextDay";
  nextBtn.className = "strip-nav next";
  nextBtn.setAttribute("aria-label", "Next day");
  nextBtn.textContent = "▶";
  nextBtn.addEventListener("click", () => {
    currentOffset += 1;
    renderWeekStrip(currentOffset);
    renderAllTasks();  // ---- Date-aware re-render ----
    updateProgress();
  });
  strip.appendChild(nextBtn);

  updateDateDisplay(dateWithOffset(offset));
}

function initWeekStrip() {
  currentOffset = 0; // today
  renderWeekStrip(currentOffset);
}

/* ====== SECTION FILTERS (by tag & priority, per section, per selected date) ======
   Adds a compact "🔎" Filter button to each section header.
   Clicking toggles a mini bar with two dropdowns:
   - Tag: All / Work / Health / Other
   - Priority: All / High / Mid / Low
   The filter applies ONLY within that section and ONLY for the selected date.
================================================================= */
const sectionFilters = {}; // e.g., { "To Do": { tag:"all", prio:"all" }, ... }

function defaultFilterState() {
  return { tag: "all", prio: "all" };
}
function getSectionTitle(sectionEl) {
  const h3 = $("h3", sectionEl);
  return h3 ? h3.textContent.trim() : "";
}
function ensureFilterUIForSection(sectionEl) {
  const title = getSectionTitle(sectionEl);
  if (!title) return;

  const header = $(".section-header", sectionEl);
  if (!header) return;

  // Add a tiny toggle button into the header (if missing)
  if (!header.querySelector(".filter-toggle-btn")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-toggle-btn";
    btn.title = "Filter by tag & priority";
    btn.textContent = "🔎Filter";
    header.appendChild(btn);

    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // don't toggle collapse
      const bar = sectionEl.querySelector(".section-filters");
      if (bar) bar.classList.toggle("hidden");
    });
  }

  // Create the filter bar (if missing) with Tag & Priority + Clear
  if (!sectionEl.querySelector(".section-filters")) {
    const bar = document.createElement("div");
    bar.className = "section-filters hidden";
    bar.innerHTML = `
      <div class="filter-row">
        <label class="filter-label">Tag:</label>
        <select class="filter-tag" title="Task Tag">
          <option value="all">All</option>
          <option value="work">Work</option>
          <option value="health">Health</option>
          <option value="other">Other</option>
        </select>

        <label class="filter-label">Priority:</label>
        <select class="filter-priority" title="Priority">
          <option value="all">All</option>
          <option value="high">High</option>
          <option value="mid">Mid</option>
          <option value="low">Low</option>
        </select>

        <button type="button" class="filter-clear-btn" title="Clear">✖</button>
      </div>
    `;
    header.insertAdjacentElement("afterend", bar);

    if (!sectionFilters[title]) sectionFilters[title] = defaultFilterState();

    const tagSel = bar.querySelector(".filter-tag");
    const prioSel = bar.querySelector(".filter-priority");
    const clr = bar.querySelector(".filter-clear-btn");

    // Set initial UI from state
    tagSel.value = sectionFilters[title].tag || "all";
    prioSel.value = sectionFilters[title].prio || "all";

    tagSel.addEventListener("change", () => {
      sectionFilters[title].tag = tagSel.value;
      renderAllTasks();
      updateProgress();
    });
    prioSel.addEventListener("change", () => {
      sectionFilters[title].prio = prioSel.value;
      renderAllTasks();
      updateProgress();
    });
    clr.addEventListener("click", () => {
      sectionFilters[title] = defaultFilterState();
      tagSel.value = "all";
      prioSel.value = "all";
      renderAllTasks();
      updateProgress();
    });
  }
}
function initSectionFilters() {
  $$(".task-section").forEach(ensureFilterUIForSection);
}

/* Helper: check if a task passes the section's active filters */
function taskPassesSectionFilter(task) {
  const f = sectionFilters[task.section] || defaultFilterState();

  // Tag filter
  if (f.tag !== "all") {
    const taskTag = String(task.tag || "").toLowerCase();
    if (taskTag !== f.tag) return false;
  }

  // Priority filter
  if (f.prio !== "all") {
    const tp = String(task.prio || "").toLowerCase();
    if (tp !== f.prio) return false;
  }

  return true;
}

/* ====== RENDER ALL TASKS (for selected date only) ====== */
function renderAllTasks() {
  // Ensure "In Progress" section exists before rendering
  ensureInProgressSection(); // ---- In Progress task status ----
  // Ensure filter UIs exist (in case sections were injected)
  initSectionFilters();      // ---- Section Filters (by tag & priority) ----

  // Clear all section containers and re-add headers
  const sections = $$(".task-section");
  sections.forEach((sec) => {
    const table = $(".task-table", sec);
    if (table) {
      table.innerHTML = `
        <div class="task-table-header">
          <span>Task</span>
          <span>Timeline</span>
          <span>Task Tags</span>
          <span>Priority</span>
          <span>Actions</span>
        </div>
      `;
    }
  });

  const selected = getSelectedDateStr();
  const dayTasks = tasks.filter((t) => t.date === selected);

  dayTasks.forEach((task) => {
    // Apply per-section filters before adding
    if (!taskPassesSectionFilter(task)) return;

    const targetSectionEl = findSectionByTitle(task.section);
    if (targetSectionEl) {
      const targetTable = $(".task-table", targetSectionEl);
      const row = createTaskRow(task);
      targetTable.appendChild(row);
    }
  });
}

/* ====== BOOT ====== */
document.addEventListener("DOMContentLoaded", () => {
  loadInitialTasks();
  ensureInProgressSection();      // ---- In Progress task status ----
  ensureStatusSelectInForm();     // ---- In Progress task status ----
  ensureDateInputInForm();        // ---- Date-aware rendering ----

  displayTodayDate();
  initCollapsibles();
  initViewSwitch();
  initDarkMode();
  initAddTask();
  initCheckboxes();
  initMoveToInProgress();         // ---- In Progress task status ----
  initEditTask();
  initDeleteTask();
  initWeekStrip();                // sets currentOffset=0 and header
  initSectionFilters();           // ---- Section Filters (by tag & priority) ----

  renderAllTasks();               // ---- Date-aware re-render ----
  updateProgress();
});