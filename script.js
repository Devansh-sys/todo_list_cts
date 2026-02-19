/* ====== UTILS ====== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const byId = (id) => document.getElementById(id);

/* ====== TASK LIST STORAGE ====== */
let tasks = [];
let taskIdCounter = 0;

function loadInitialTasks() {
  // No initial tasks - start with empty lists
  tasks = [];
}

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
  // Remove board view toggle - keep only list view
  container.classList.remove("board-view");
}

/* ====== DARK MODE TOGGLE (⚙ button) ====== */
function initDarkMode() {
  const settingsBtn = $(".view-switch .settings-btn");
  if (!settingsBtn) return;

  // Restore preference
  const pref = localStorage.getItem("task-ui-theme");
  if (pref === "dark") document.documentElement.classList.add("dark");

  // Update button text to show opposite mode
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
  const done = tasks.filter(t => t.section === "Done").length;
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

/* ====== ADD TASK (+ button and Form) ====== */
let editingTaskId = null;

function initAddTask() {
  const addBtn = $(".view-switch .add-btn");
  const formContainer = byId("addTaskForm");
  const closeFormBtn = byId("closeFormBtn");
  const cancelBtn = byId("cancelBtn");
  const formOverlay = byId("formOverlay");
  const taskForm = byId("taskForm");
  const formTitle = byId("formTitle");
  const currentDateEl = byId("currentDate");

  // Display current date
  const displayCurrentDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    currentDateEl.textContent = `Today: ${today}`;
  };

  // Open form
  addBtn?.addEventListener("click", () => {
    editingTaskId = null;
    resetForm();
    displayCurrentDate();
    formTitle.textContent = "Add New Task";
    formContainer.classList.remove("hidden");
  });

  // Close form
  const closeForm = () => {
    formContainer.classList.add("hidden");
    editingTaskId = null;
  };

  closeFormBtn?.addEventListener("click", closeForm);
  cancelBtn?.addEventListener("click", closeForm);
  formOverlay?.addEventListener("click", closeForm);

  // Handle form submission
  taskForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = byId("taskTitle").value.trim();
    const tag = byId("taskTag").value;
    const prio = byId("taskPriority").value;

    // NEW: Start/End times
    const startTime = byId("taskStartTime").value; // "HH:MM" or ""
    const endTime = byId("taskEndTime").value;     // "HH:MM" or ""

    const section = editingTaskId !== null ? tasks.find(t => t.id === editingTaskId)?.section : "To Do";
    const due = ""; // No due date needed

    if (!title) {
      alert("Please enter a task title");
      return;
    }

    if (editingTaskId !== null) {
      // Edit existing task
      const task = tasks.find(t => t.id === editingTaskId);
      if (task) {
        const oldSection = task.section;
        task.title = title;
        task.tag = tag;
        task.prio = prio;
        task.section = section;
        task.startTime = startTime; // NEW
        task.endTime = endTime;     // NEW

        // Re-render task
        const row = document.querySelector(`[data-task-id="${editingTaskId}"]`);
        if (row) {
          if (oldSection !== section) {
            // Task moved to different section
            const checkbox = $("input[type='checkbox']", row);
            const isChecked = checkbox.checked;
            row.remove();

            const sections = $$(".task-section");
            let targetSectionEl = null;

            sections.forEach(sec => {
              const heading = $("h3", sec);
              if (heading && heading.textContent.trim() === section) {
                targetSectionEl = sec;
              }
            });

            if (targetSectionEl) {
              targetSectionEl.classList.remove("collapsed");
              const header = $(".section-header", targetSectionEl);
              header?.setAttribute("aria-expanded", "true");

              const targetTable = $(".task-table", targetSectionEl);
              const newRow = createTaskRow(task, isChecked);
              targetTable.appendChild(newRow);
            }
          } else {
            // Same section, just update the row
            updateTaskRow(row, task);
          }
        }
      }
    } else {
      // Add new task
      const newTask = {
        id: taskIdCounter++,
        title: title,
        due: due,
        tag: tag,
        prio: prio,
        section: section,
        startTime: startTime, // NEW
        endTime: endTime      // NEW
      };
      tasks.push(newTask);

      // Add to target section
      const sections = $$(".task-section");
      let targetSectionEl = null;

      sections.forEach(sec => {
        const heading = $("h3", sec);
        if (heading && heading.textContent.trim() === section) {
          targetSectionEl = sec;
        }
      });

      if (targetSectionEl) {
        targetSectionEl.classList.remove("collapsed");
        const header = $(".section-header", targetSectionEl);
        header?.setAttribute("aria-expanded", "true");

        const targetTable = $(".task-table", targetSectionEl);
        const row = createTaskRow(newTask, false);
        targetTable.appendChild(row);
      }
    }

    closeForm();
    resetForm();
    updateProgress(); // UPDATE progress after add/edit
  });
}

function resetForm() {
  byId("taskForm").reset();
  byId("taskTitle").focus();
  // Clear timeline fields explicitly
  const start = byId("taskStartTime");
  const end = byId("taskEndTime");
  if (start) start.value = "";
  if (end) end.value = "";
}

/* ====== TIMELINE HELPERS ====== */
// Format "HH:MM" (24h) into "5pm", "5:30pm" etc.
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

function buildRowHtml(task, isChecked) {
  const timelineTxt = formatTimelineWindow(task.startTime, task.endTime);

  // Hide Edit button if task is in Done
  const showEdit = task.section !== "Done";

  return `
    <label><input type="checkbox" ${isChecked ? 'checked' : ''}> ${escapeHtml(task.title)}</label>
    <span class="timeline">${timelineTxt ? escapeHtml(timelineTxt) : ""}</span>
    <span class="tag ${clsTag(task.tag)}">${labelTag(task.tag)}</span>
    <span class="priority ${clsPrio(task.prio)}">${labelPrio(task.prio)}</span>
    <div class="task-actions">
      ${showEdit ? `<button class="edit-btn" title="Edit">Edit</button>` : ``}
      <button class="delete-btn" title="Delete">Delete</button>
    </div>
  `;
}

function createTaskRow(task, isChecked = false) {
  const row = document.createElement("div");
  row.className = "task-row";
  row.setAttribute("data-task-id", task.id);
  row.innerHTML = buildRowHtml(task, isChecked);
  if (isChecked) {
    const label = $('label', row);
    label.style.opacity = "0.55";
    label.style.textDecoration = "line-through";
  }
  return row;
}

function updateTaskRow(row, task) {
  const checkbox = $("input[type='checkbox']", row);
  const isChecked = checkbox ? checkbox.checked : false;
  row.innerHTML = buildRowHtml(task, isChecked);
  if (isChecked) {
    const label = $('label', row);
    label.style.opacity = "0.55";
    label.style.textDecoration = "line-through";
  }
}

/* ====== CHECKBOX BEHAVIOR (move tasks to Done/To Do) ====== */
function initCheckboxes() {
  document.addEventListener("change", (e) => {
    if (e.target.matches('.task-row input[type="checkbox"]')) {
      const row = e.target.closest(".task-row");
      const label = e.target.closest("label");
      if (!row || !label) return;

      const taskId = parseInt(row.getAttribute("data-task-id"));
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Update visual appearance
      label.style.opacity = e.target.checked ? "0.55" : "1";
      label.style.textDecoration = e.target.checked ? "line-through" : "none";

      // Move task to Done or back to To Do
      const targetSection = e.target.checked ? "Done" : "To Do";
      moveTaskToSection(taskId, task, targetSection, row);
    }
  });
}

function moveTaskToSection(taskId, task, targetSection, oldRow) {
  // Update task in storage
  task.section = targetSection;

  // Find target section by heading text
  const sections = $$(".task-section");
  let targetSectionEl = null;

  sections.forEach(section => {
    const heading = $("h3", section);
    if (heading && heading.textContent.trim() === targetSection) {
      targetSectionEl = section;
    }
  });

  if (!targetSectionEl) return;

  // Remove from current row
  oldRow.remove();

  // Open target section if collapsed
  targetSectionEl.classList.remove("collapsed");
  const header = $(".section-header", targetSectionEl);
  header?.setAttribute("aria-expanded", "true");

  // Add to target section
  const targetTable = $(".task-table", targetSectionEl);
  const newRow = document.createElement("div");
  newRow.className = "task-row";
  newRow.setAttribute("data-task-id", taskId);
  const isChecked = targetSection === "Done";
  newRow.innerHTML = buildRowHtml(task, isChecked);
  if (isChecked) {
    const label = $('label', newRow);
    label.style.opacity = "0.55";
    label.style.textDecoration = "line-through";
  }
  targetTable.appendChild(newRow);

  updateProgress(); // UPDATE progress after move
}

/* ====== EDIT TASK ====== */
function initEditTask() {
  document.addEventListener("click", (e) => {
    if (e.target.matches(".edit-btn")) {
      const row = e.target.closest(".task-row");
      if (!row) return;

      const taskId = parseInt(row.getAttribute("data-task-id"));
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Block edit for completed tasks (extra guard)
      if (task.section === "Done") {
        alert("Completed tasks cannot be edited.");
        return;
      }

      // Populate form with task data
      editingTaskId = taskId;
      byId("taskTitle").value = task.title || "";
      byId("taskTag").value = task.tag || "work";
      byId("taskPriority").value = task.prio || "mid";

      // Timeline fields
      byId("taskStartTime").value = task.startTime || "";
      byId("taskEndTime").value = task.endTime || "";

      // Show form with edit title
      const formContainer = byId("addTaskForm");
      const formTitle = byId("formTitle");
      formTitle.textContent = "Edit Task";
      formContainer.classList.remove("hidden");
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

      // Remove from storage
      tasks = tasks.filter(t => t.id !== taskId);

      // Remove from DOM
      row.remove();

      updateProgress(); // UPDATE progress after delete
    }
  });
}

/* ====== DISPLAY TODAY'S DATE ====== */
function displayTodayDate() {
  const todayDateEl = byId("todayDate");
  if (!todayDateEl) return;

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date().toLocaleDateString('en-US', options);
  todayDateEl.textContent = today;
}

/* ====== BOOT ====== */
document.addEventListener("DOMContentLoaded", () => {
  loadInitialTasks();
  displayTodayDate();
  initCollapsibles();
  initViewSwitch();
  initDarkMode();
  initAddTask();
  initCheckboxes();
  initEditTask();
  initDeleteTask();
  updateProgress(); // initial
});