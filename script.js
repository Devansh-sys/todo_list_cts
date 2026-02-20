"use strict";


  //  SESSION STORAGE KEYS

const SS_KEYS = {
  tasks: "tasklist.tasks",
  counter: "tasklist.counter",
};


  //  DOM UTILS

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const byId = (id) => document.getElementById(id);

// Simple DOM element builder 
function el(tag, className, html) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html != null) n.innerHTML = html;
  return n;
}


  //  DATE HELPERS

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
function today() {
  return startOfDay(new Date());
}
let currentOffset = 0; // days from today 
function dateWithOffset(offset) {
  const d = today();
  d.setDate(d.getDate() + Number(offset));
  return d;
}
function getSelectedDateStr() {
  return isoDate(dateWithOffset(currentOffset));
}

  //  TASK STATE + STORAGE (sessionStorage)

let tasks = [];
let taskIdCounter = 0;

function loadFromSession() {
  try {
    const savedTasks = localStorage.getItem(SS_KEYS.tasks);
    tasks = savedTasks ? JSON.parse(savedTasks) : [];

    //ensuring each task has a date
    const todayStr = isoDate(new Date());
    tasks.forEach((t) => {
      if (!t.date) t.date = todayStr;
    });

    const savedCounter = localStorage.getItem(SS_KEYS.counter);
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
    localStorage.setItem(SS_KEYS.tasks, JSON.stringify(tasks));
    localStorage.setItem(SS_KEYS.counter, String(taskIdCounter));
  } catch (err) {
    console.warn("Failed to save session tasks:", err);
  }
}
function loadInitialTasks() {
  loadFromSession();
}

  
  //  - Ensuring the In Progress section exists and sits between To Do and Done.
  //  - Ensuring Status and Date fields exist in the Add/Edit form.

function ensureInProgressSection() {
  const container = $(".task-container");
  if (!container) return;

  const sections = $$(".task-section");
  let toDoSection = null, inProgSection = null, doneSection = null;

  sections.forEach((sec) => {
    const title = $("h3", sec)?.textContent.trim() || "";
    if (title === "To Do") toDoSection = sec;
    if (title === "In Progress") inProgSection = sec;
    if (title === "Done") doneSection = sec;
  });

  // If exists, reorder under To Do
  if (inProgSection) {
    if (toDoSection) toDoSection.insertAdjacentElement("afterend", inProgSection);
    return;
  }

  // Creating the In Progress section
  const sec = el("section", "task-section", `
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
  `);

  if (toDoSection) {
    toDoSection.insertAdjacentElement("afterend", sec);
  } else if (doneSection) {
    doneSection.insertAdjacentElement("beforebegin", sec);
  } else {
    container.appendChild(sec);
  }
}

function ensureStatusSelectInForm() {
  const form = byId("taskForm");
  if (!form || byId("taskStatus")) return;

  const wrapper = el("div", "form-row", `
    <div class="form-group">
      <label for="taskStatus">Status *</label>
      <select id="taskStatus" name="status" required>
        <option value="To Do">To Do</option>
        <option value="In Progress">In Progress</option>
        <option value="Done">Done</option>
      </select>
    </div>
  `);

  const timelineRow = $("#taskStartTime")?.closest(".form-row");
  if (timelineRow) {
    timelineRow.insertAdjacentElement("beforebegin", wrapper);
  } else {
    form.insertBefore(wrapper, $(".form-actions", form));
  }
}

function ensureDateInputInForm() {
  const form = byId("taskForm");
  if (!form || byId("taskDate")) return;

  const wrapper = el("div", "form-row", `
    <div class="form-group">
      <label for="taskDate">Date *</label>
      <input type="date" id="taskDate" name="date" required />
    </div>
  `);

  const timelineRow = $("#taskStartTime")?.closest(".form-row");
  if (timelineRow) {
    timelineRow.insertAdjacentElement("beforebegin", wrapper);
  } else {
    form.insertBefore(wrapper, $(".form-actions", form));
  }
}


  //  COLLAPSIBLE SECTIONS

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
      if (e.target.closest?.(".filter-toggle-btn")) return; // ignore filter button
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

  //  VIEW SWITCH (List-only)

function initViewSwitch() {
  $(".task-container")?.classList.remove("board-view");
}


  //  DARK MODE TOGGLE (using  localStorage)

function initDarkMode() {
  const btn = $(".view-switch .settings-btn");
  if (!btn) return;

  if (localStorage.getItem("task-ui-theme") === "dark") {
    document.documentElement.classList.add("dark");
  }

  const updateText = () => {
    const isDark = document.documentElement.classList.contains("dark");
    btn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
  };

  updateText();
  btn.title = "Toggle theme";
  btn.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("task-ui-theme", isDark ? "dark" : "light");
    updateText();
  });
}


  //  PROGRESS BAR (for selected day only)

function updateProgress() {
  const selected = getSelectedDateStr();
  const dayTasks = tasks.filter((t) => t.date === selected);
  const total = dayTasks.length;
  const done = dayTasks.filter((t) => t.section === "Done").length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  byId("progressPercent") && (byId("progressPercent").textContent = `${percent}%`);
  byId("progressCounts") && (byId("progressCounts").textContent = `${done} of ${total} completed`);
  byId("progressFill") && (byId("progressFill").style.width = `${percent}%`);

  const bar = $(".progress-bar");
  if (bar) {
    bar.setAttribute("aria-valuenow", String(percent));
    bar.setAttribute("aria-label", "Selected day's progress");
  }
}


  //  ADD/EDIT TASK FORM

let editingTaskId = null;

function resetForm() {
  byId("taskForm")?.reset();
  byId("taskTitle")?.focus();
  if (byId("taskStartTime")) byId("taskStartTime").value = "";
  if (byId("taskEndTime")) byId("taskEndTime").value = "";
  if (byId("taskStatus")) byId("taskStatus").value = "To Do";
  if (byId("taskDate")) byId("taskDate").value = getSelectedDateStr();
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

  // Ensure new controls exist
  ensureStatusSelectInForm();
  ensureDateInputInForm();

  
// Preventing choosing dates before today
const taskDateInput = byId("taskDate");
if (taskDateInput) {
  const todayStr = isoDate(new Date());
  taskDateInput.min = todayStr;
}


  const displayCurrentDate = () => {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const todayStr = new Date().toLocaleDateString("en-US", options);
    if (currentDateEl) currentDateEl.textContent = `Today: ${todayStr}`;
  };

  addBtn?.addEventListener("click", () => {
    editingTaskId = null;
    resetForm();
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
        if (oldSection !== "Done" && chosenSection === "Done") {
          task.previousSection = oldSection; // save for revert
        }

        task.title = title;
        task.tag = tag;
        task.prio = prio;
        task.section = chosenSection;
        task.startTime = startTime;
        task.endTime = endTime;
        task.date = chosenDate;
        saveToSession();
      }
    } else {
      const newTask = {
        id: taskIdCounter++,
        title,
        due: "", 
        tag,
        prio,
        section: chosenSection,
        previousSection: null,
        startTime,
        endTime,
        date: chosenDate,
      };
      tasks.push(newTask);
      saveToSession();
    }

    closeForm();
    resetForm();
    renderAllTasks();
    updateProgress();
  });
}


  //  TIMELINE FORMATTERS (12h clock)

function formatClock12h(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  if (Number.isNaN(h)) return "";
  const suffix = h >= 12 ? "pm" : "am";
  h = h % 12; if (h === 0) h = 12;
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


  //  RENDER HELPERS(row/class/labels)

function clsTag(t) {
  t = String(t || "").toLowerCase();
  if (t.startsWith("work")) return "work";
  if (t.startsWith("health")) return "health";
  return "other";
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

/* Build task row HTML */
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
  const row = el("div", "task-row", buildRowHtml(task));
  row.setAttribute("data-task-id", task.id);
  const label = $("label", row);
  if (label && task.section === "Done") {
    label.style.opacity = "0.55";
    label.style.textDecoration = "line-through";
  }
  return row;
}


  //  MOVE / SECTION HELPERS

function findSectionByTitle(title) {
  let target = null;
  $$(".task-section").forEach((sec) => {
    const h3 = $("h3", sec);
    if (h3 && h3.textContent.trim() === title) target = sec;
  });
  return target;
}
function moveTaskToSection(taskId, task, targetSection) {
  task.section = targetSection;
  saveToSession();
  renderAllTasks();
  updateProgress();
}


  //  CHECKBOX BEHAVIOR (moving from To Do/In Progress to Done)

function initCheckboxes() {
  document.addEventListener("change", (e) => {
    if (!e.target.matches('.task-row input[type="checkbox"]')) return;

    const row = e.target.closest(".task-row");
    const label = e.target.closest("label");
    if (!row || !label) return;

    const taskId = parseInt(row.getAttribute("data-task-id"));
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isChecked = e.target.checked;
    label.style.opacity = isChecked ? "0.55" : "1";
    label.style.textDecoration = isChecked ? "line-through" : "none";

    if (isChecked) {
      task.previousSection = task.section; // remember for revert
      moveTaskToSection(taskId, task, "Done");
    } else {
      if (task.section === "Done") {
        const revertSection = task.previousSection || "To Do";
        task.previousSection = null;
        moveTaskToSection(taskId, task, revertSection);
      } else {
        renderAllTasks();
        updateProgress();
      }
    }
  });
}


  // move task from "To Do" to "In Progress"

function initMoveToInProgress() {
  document.addEventListener("click", (e) => {
    if (!e.target.matches(".inprogress-btn")) return;

    const row = e.target.closest(".task-row");
    if (!row) return;

    const taskId = parseInt(row.getAttribute("data-task-id"));
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    moveTaskToSection(taskId, task, "In Progress");
  });
}


  //  EDIT TASK

function initEditTask() {
  document.addEventListener("click", (e) => {
    if (!e.target.matches(".edit-btn")) return;

    const row = e.target.closest(".task-row");
    if (!row) return;

    const taskId = parseInt(row.getAttribute("data-task-id"));
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.section === "Done") {
      alert("Completed tasks cannot be edited.");
      return;
    }

    ensureStatusSelectInForm();
    ensureDateInputInForm();

    editingTaskId = taskId;
    byId("taskTitle").value = task.title || "";
    byId("taskTag").value = task.tag || "work";
    byId("taskPriority").value = task.prio || "mid";
    byId("taskStartTime").value = task.startTime || "";
    byId("taskEndTime").value = task.endTime || "";

    if (byId("taskStatus")) byId("taskStatus").value = task.section || "To Do";
    if (byId("taskDate")) byId("taskDate").value = task.date || getSelectedDateStr();

    const formContainer = byId("addTaskForm");
    const formTitle = byId("formTitle");
    if (formTitle) formTitle.textContent = "Edit Task";
    formContainer?.classList.remove("hidden");
    byId("taskTitle").focus();
  });
}


  //  DELETE TASK

function initDeleteTask() {
  document.addEventListener("click", (e) => {
    if (!e.target.matches(".delete-btn")) return;

    const row = e.target.closest(".task-row");
    if (!row) return;

    const taskId = parseInt(row.getAttribute("data-task-id"));
    if (!confirm("Are you sure you want to delete this task?")) return;

    tasks = tasks.filter((t) => t.id !== taskId);
    saveToSession();
    renderAllTasks();
    updateProgress();
  });
}

  // Displaying Today's Date

function displayTodayDate() {
  const el = byId("todayDate");
  if (!el) return;
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  el.textContent = new Date().toLocaleDateString("en-US", options);
}


  //  DATE HEADER TEXT (day name + full date)

function updateDateDisplay(date) {
  const dayEl = byId("dateDay");
  const dateEl = byId("dateFull");
  const dayStr = date.toLocaleDateString(undefined, { weekday: "long" });
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (dayEl) dayEl.textContent = dayStr;
  if (dateEl) dateEl.textContent = dateStr;
}


  //  WEEK STRIP 

function renderWeekStrip(offset) {
  const strip = byId("weekStrip");
  if (!strip) return;
  strip.innerHTML = "";

  const prevBtn = el("button");
  prevBtn.type = "button";
  prevBtn.id = "prevDay";
  prevBtn.className = "strip-nav prev";
  prevBtn.setAttribute("aria-label", "Previous day");
  prevBtn.textContent = "◀";
  prevBtn.addEventListener("click", () => {
    currentOffset -= 1;
    renderWeekStrip(currentOffset);
    renderAllTasks();
    updateProgress();
  });
  strip.appendChild(prevBtn);

  for (let i = -3; i <= 3; i++) {
    const dayOffset = offset + i;
    const d = dateWithOffset(dayOffset);
    const item = el("button", "week-day" + (i === 0 ? " selected" : ""));
    item.type = "button";
    item.setAttribute("data-offset", String(dayOffset));
    const name = d.toLocaleDateString(undefined, { weekday: "short" });
    const num = d.getDate();
    item.innerHTML = `<span class="wkname">${name}</span><span class="wknum">${num}</span>`;
    item.addEventListener("click", () => {
      currentOffset = dayOffset;
      renderWeekStrip(currentOffset);
      updateDateDisplay(dateWithOffset(currentOffset));
      renderAllTasks();
      updateProgress();
    });
    strip.appendChild(item);
  }

  const nextBtn = el("button");
  nextBtn.type = "button";
  nextBtn.id = "nextDay";
  nextBtn.className = "strip-nav next";
  nextBtn.setAttribute("aria-label", "Next day");
  nextBtn.textContent = "▶";
  nextBtn.addEventListener("click", () => {
    currentOffset += 1;
    renderWeekStrip(currentOffset);
    renderAllTasks();
    updateProgress();
  });
  strip.appendChild(nextBtn);

  updateDateDisplay(dateWithOffset(offset));
}
function initWeekStrip() {
  currentOffset = 0; // today
  renderWeekStrip(currentOffset);
}


  //  SECTION FILTERS (per-section, per selected date)
  //  - Toggle mini bar with Tag + Priority + Clear.

const sectionFilters = {}; // e.g. { "To Do": { tag:"all", prio:"all" }, ... }
const defaultFilterState = () => ({ tag: "all", prio: "all" });

function getSectionTitle(sectionEl) {
  return $("h3", sectionEl)?.textContent.trim() || "";
}
function ensureFilterUIForSection(sectionEl) {
  const title = getSectionTitle(sectionEl);
  if (!title) return;

  const header = $(".section-header", sectionEl);
  if (!header) return;

  // Toggle button
  if (!header.querySelector(".filter-toggle-btn")) {
    const btn = el("button", "filter-toggle-btn", "🔎Filter");
    btn.type = "button";
    btn.title = "Filter by tag & priority";
    header.appendChild(btn);
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // don't collapse section
      const bar = sectionEl.querySelector(".section-filters");
      if (bar) bar.classList.toggle("hidden");
    });
  }

  // creating Filter bar 
  if (!sectionEl.querySelector(".section-filters")) {
    const bar = el("div", "section-filters hidden", `
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
    `);
    header.insertAdjacentElement("afterend", bar);

    if (!sectionFilters[title]) sectionFilters[title] = defaultFilterState();

    const tagSel = bar.querySelector(".filter-tag");
    const prioSel = bar.querySelector(".filter-priority");
    const clr = bar.querySelector(".filter-clear-btn");

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

/* Checking if a task is applicable to its section's active filters */
function taskPassesSectionFilter(task) {
  const f = sectionFilters[task.section] || defaultFilterState();

  if (f.tag !== "all") {
    const taskTag = String(task.tag || "").toLowerCase();
    if (taskTag !== f.tag) return false;
  }
  if (f.prio !== "all") {
    const tp = String(task.prio || "").toLowerCase();
    if (tp !== f.prio) return false;
  }
  return true;
}


  //  RENDER ALL TASKS (for selected date )

function renderAllTasks() {
  ensureInProgressSection();
  initSectionFilters();

  // Reset table headers in each section
  $$(".task-section").forEach((sec) => {
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
    if (!taskPassesSectionFilter(task)) return;
    const targetSectionEl = findSectionByTitle(task.section);
    if (targetSectionEl) {
      const targetTable = $(".task-table", targetSectionEl);
      targetTable.appendChild(createTaskRow(task));
    }
  });
}


  //  TOTAL TIME CALC (To Do only, for selected day)

function calculateTotalTime() {
  const selected = getSelectedDateStr();
  const dayTasks = tasks.filter((t) => t.date === selected && t.section === "To Do");

  let totalMinutes = 0;
  dayTasks.forEach((task) => {
    if (task.startTime && task.endTime) {
      const [sh, sm] = task.startTime.split(":").map(Number);
      const [eh, em] = task.endTime.split(":").map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      if (end > start) totalMinutes += end - start;
    }
  });

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const txt = totalMinutes > 0 ? `Total time: ${hours}h ${minutes}m` : "No valid timelines";
  if (byId("calcResult")) byId("calcResult").textContent = txt;
}


// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  const calcBtn = byId("calcTimeBtn");
  if (calcBtn) calcBtn.addEventListener("click", calculateTotalTime);

  loadInitialTasks();
  ensureInProgressSection();
  ensureStatusSelectInForm();
  ensureDateInputInForm();

  displayTodayDate();
  initCollapsibles();
  initViewSwitch();
  initDarkMode();
  initAddTask();
  initCheckboxes();
  initMoveToInProgress();
  initEditTask();
  initDeleteTask();
  initWeekStrip();
  initSectionFilters();

  renderAllTasks();
  updateProgress();
});