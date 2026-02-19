/* script.js */
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

/* ====== TASK LIST STORAGE ====== */
let tasks = [];
let taskIdCounter = 0;

/* ====== LOAD / SAVE TASKS ====== */
function loadFromSession() {
  try {
    const savedTasks = sessionStorage.getItem(SS_KEYS.tasks);
    tasks = savedTasks ? JSON.parse(savedTasks) : [];

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
 * Automatically ensure the "In Progress" section exists in the DOM,
 * and that it appears BETWEEN "To Do" and "Done".
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

  // If already present, ensure correct order (optional)
  if (inProgSection) {
    // If order is wrong and both exist, re-insert in the right position
    if (toDoSection && doneSection) {
      const toDoIndex = sections.indexOf(toDoSection);
      const inProgIndex = sections.indexOf(inProgSection);
      const doneIndex = sections.indexOf(doneSection);
      const shouldBeIndex = toDoIndex + 1;
      if (!(inProgIndex === shouldBeIndex && doneIndex > inProgIndex)) {
        // Move In Progress after To Do
        toDoSection.insertAdjacentElement("afterend", inProgSection);
      }
    }
    return; // already exists
  }

  // Create the "In Progress" section
  const sec = document.createElement("section");
  sec.className = "task-section";
  sec.innerHTML = `
    <div class="section-header">
      <h3>In Progress</h3>
    </div>
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

  // Insert it between "To Do" and "Done" if they exist
  if (toDoSection) {
    toDoSection.insertAdjacentElement("afterend", sec);
  } else if (doneSection) {
    doneSection.insertAdjacentElement("beforebegin", sec);
  } else {
    // fallback: append at the end if neither found
    container.appendChild(sec);
  }
}

/**
 * Ensure the Status dropdown exists in the Add/Edit Task form.
 * If not present, inject it above the timeline fields.
 * ---- In Progress task status ----
 */
function ensureStatusSelectInForm() {
  const taskForm = byId("taskForm");
  if (!taskForm) return;

  let statusSelect = byId("taskStatus");
  if (statusSelect) return; // already present

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

  // Insert before the timeline fields row if available
  const timelineRow = $("#taskStartTime")?.closest(".form-row");
  if (timelineRow) {
    timelineRow.insertAdjacentElement("beforebegin", wrapper);
  } else {
    // else append near the end
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

    header.addEventListener("click", toggle);
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

/* ====== PROGRESS (slider-like) ====== */
function updateProgress() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.section === "Done").length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const percentEl = byId("progressPercent");
  const countsEl = byId("progressCounts");
  const fillEl = byId("progressFill");
  const barEl = $(".progress-bar");

  if (percentEl) percentEl.textContent = `${percent}%`;
  if (countsEl) countsEl.textContent = `${done} of ${total} completed today`;
  if (fillEl) fillEl.style.width = `${percent}%`;
  if (barEl) barEl.setAttribute("aria-valuenow", String(percent));
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
  // Default Status to "To Do"
  const statusSel = byId("taskStatus");
  if (statusSel) statusSel.value = "To Do";
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

  // Ensure Status field exists in the form (adds "In Progress")
  ensureStatusSelectInForm(); // ---- In Progress task status ----

  const displayCurrentDate = () => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const today = new Date().toLocaleDateString("en-US", options);
    if (currentDateEl) currentDateEl.textContent = `Today: ${today}`;
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

    // Read Status from form; default if missing
    const statusSel = byId("taskStatus");
    let chosenSection = "To Do";
    if (statusSel) {
      chosenSection = statusSel.value; // may be "To Do", "In Progress", "Done"
    } else if (editingTaskId !== null) {
      chosenSection = tasks.find((t) => t.id === editingTaskId)?.section || "To Do";
    }

    if (!title) {
      alert("Please enter a task title");
      return;
    }

    if (editingTaskId !== null) {
      const task = tasks.find((t) => t.id === editingTaskId);
      if (task) {
        const oldSection = task.section;

        // If a task is completed (Done), we block editing (keep your original rule)
        if (oldSection === "Done") {
          alert("Completed tasks cannot be edited.");
          return;
        }

        task.title = title;
        task.tag = tag;
        task.prio = prio;
        task.section = chosenSection; // ---- In Progress task status ----
        task.startTime = startTime;
        task.endTime = endTime;
        saveToSession();

        const row = document.querySelector(`[data-task-id="${editingTaskId}"]`);
        if (row) {
          if (oldSection !== chosenSection) {
            // Move to another section
            const checkbox = $("input[type='checkbox']", row);
            const isChecked = checkbox?.checked || false;
            row.remove();

            ensureInProgressSection(); // ensure target exists
            const targetSectionEl = findSectionByTitle(chosenSection);
            if (targetSectionEl) {
              targetSectionEl.classList.remove("collapsed");
              const header = $(".section-header", targetSectionEl);
              header?.setAttribute("aria-expanded", "true");

              const targetTable = $(".task-table", targetSectionEl);
              const newRow = createTaskRow(task, chosenSection === "Done" ? true : isChecked);
              targetTable.appendChild(newRow);
            }
          } else {
            // Update content within the same section
            updateTaskRow(row, task);
          }
        }
      }
    } else {
      // Add new task
      const newTask = {
        id: taskIdCounter++,
        title: title,
        due: "",
        tag: tag,
        prio: prio,
        section: chosenSection, // ---- In Progress task status ----
        previousSection: null,  // --previous section--
        startTime: startTime,
        endTime: endTime,
      };
      tasks.push(newTask);
      saveToSession();

      ensureInProgressSection(); // ensure target exists
      const targetSectionEl = findSectionByTitle(chosenSection);
      if (targetSectionEl) {
        targetSectionEl.classList.remove("collapsed");
        const header = $(".section-header", targetSectionEl);
        header?.setAttribute("aria-expanded", "true");

        const targetTable = $(".task-table", targetSectionEl);
        const row = createTaskRow(newTask, chosenSection === "Done");
        targetTable.appendChild(row);
      }
    }

    closeForm();
    resetForm();
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
  return "work";
}
function labelTag(t) {
  t = String(t || "").toLowerCase();
  if (t.startsWith("work")) return "Work";
  if (t.startsWith("health")) return "Health";
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Other";
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
 * Shows "▶ In Progress" button ONLY when the task is in "To Do".
 * ---- In Progress task status ----
 */
function buildRowHtml(task, isChecked) {
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

function createTaskRow(task, isChecked = false) {
  const row = document.createElement("div");
  row.className = "task-row";
  row.setAttribute("data-task-id", task.id);
  row.innerHTML = buildRowHtml(task, isChecked);
  if (isChecked) {
    const label = $("label", row);
    if (label) {
      label.style.opacity = "0.55";
      label.style.textDecoration = "line-through";
    }
  }
  return row;
}

function updateTaskRow(row, task) {
  const checkbox = $("input[type='checkbox']", row);
  const isChecked = checkbox ? checkbox.checked : false;
  row.innerHTML = buildRowHtml(task, isChecked);
  if (isChecked) {
    const label = $("label", row);
    if (label) {
      label.style.opacity = "0.55";
      label.style.textDecoration = "line-through";
    }
  }
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

function moveTaskToSection(taskId, task, targetSection, oldRow) {
  task.section = targetSection; // ---- In Progress task status may be target ----
  saveToSession();

  // Ensure target section exists (esp. In Progress)
  ensureInProgressSection();

  const targetSectionEl = findSectionByTitle(targetSection);
  if (!targetSectionEl) return;

  // Remove from current
  oldRow?.remove();

  // Open target section if collapsed
  targetSectionEl.classList.remove("collapsed");
  const header = $(".section-header", targetSectionEl);
  header?.setAttribute("aria-expanded", "true");

  // Add to target
  const targetTable = $(".task-table", targetSectionEl);
  const newRow = document.createElement("div");
  newRow.className = "task-row";
  newRow.setAttribute("data-task-id", taskId);
  const isChecked = targetSection === "Done";
  newRow.innerHTML = buildRowHtml(task, isChecked);
  if (isChecked) {
    const label = $("label", newRow);
    if (label) {
      label.style.opacity = "0.55";
      label.style.textDecoration = "line-through";
    }
  }
  targetTable.appendChild(newRow);

  updateProgress();
}

/* ====== CHECKBOX BEHAVIOR (To Do <-> Done) ====== */
function initCheckboxes() {
  document.addEventListener("change", (e) => {
    if (e.target.matches('.task-row input[type="checkbox"]')) {
      const row = e.target.closest(".task-row");
      const label = e.target.closest("label");
      if (!row || !label) return;

      const taskId = parseInt(row.getAttribute("data-task-id"));
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const isChecked = e.target.checked;

      // Style
      label.style.opacity = isChecked ? "0.55" : "1";
      label.style.textDecoration = isChecked ? "line-through" : "none";

      if (isChecked) {
        // ➤ MOVING TO DONE → remember previous section
        task.previousSection = task.section;
        moveTaskToSection(taskId, task, "Done", row);
      } else {
        // ➤ UNCHECKED IN DONE → return to previous section
        const revertSection = task.previousSection || "To Do";
        task.previousSection = null;  // clear it
        moveTaskToSection(taskId, task, revertSection, row);
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

      moveTaskToSection(taskId, task, "In Progress", row);
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

      editingTaskId = taskId;
      byId("taskTitle").value = task.title || "";
      byId("taskTag").value = task.tag || "work";
      byId("taskPriority").value = task.prio || "mid";
      byId("taskStartTime").value = task.startTime || "";
      byId("taskEndTime").value = task.endTime || "";

      // Set Status in the form (will include "In Progress")
      ensureStatusSelectInForm(); // ---- In Progress task status ----
      const statusSel = byId("taskStatus");
      if (statusSel) statusSel.value = task.section || "To Do";

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
      row.remove();
      updateProgress();
    }
  });
}

/* ====== DISPLAY TODAY'S DATE ====== */
function displayTodayDate() {
  const todayDateEl = byId("todayDate");
  if (!todayDateEl) return;

  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const today = new Date().toLocaleDateString("en-US", options);
  todayDateEl.textContent = today;
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

/* ====== WEEK STRIP ====== */
let currentOffset = 0;

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
  });
  strip.appendChild(nextBtn);

  updateDateDisplay(dateWithOffset(offset));
}

function initWeekStrip() {
  currentOffset = 0;
  renderWeekStrip(currentOffset);
}

/* ====== RENDER ALL TASKS ====== */
function renderAllTasks() {
  // Ensure "In Progress" section exists before rendering
  ensureInProgressSection(); // ---- In Progress task status ----

  // Clear all section containers
  const sections = $$(".task-section");
  sections.forEach((sec) => {
    const table = $(".task-table", sec);
    if (table) table.innerHTML = `
      <div class="task-table-header">
        <span>Task</span>
        <span>Timeline</span>
        <span>Task Tags</span>
        <span>Priority</span>
        <span>Actions</span>
      </div>
    `;
  });

  // Re-add tasks into their sections
  tasks.forEach((task) => {
    const targetSectionEl = findSectionByTitle(task.section);
    if (targetSectionEl) {
      const targetTable = $(".task-table", targetSectionEl);
      const row = createTaskRow(task, task.section === "Done");
      targetTable.appendChild(row);
    }
  });

  updateProgress();
}

/* ====== BOOT ====== */
document.addEventListener("DOMContentLoaded", () => {
  loadInitialTasks();
  // Ensure UI structure for new status
  ensureInProgressSection();      // ---- In Progress task status ----
  ensureStatusSelectInForm();     // ---- In Progress task status ----

  displayTodayDate();
  initCollapsibles();
  initViewSwitch();
  initDarkMode();
  initAddTask();
  initCheckboxes();
  initMoveToInProgress();         // ---- In Progress task status ----
  initEditTask();
  initDeleteTask();
  updateProgress();
  initDateHeader();
  initWeekStrip();
  renderAllTasks();
});