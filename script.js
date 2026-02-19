/* ====== UTILS ====== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const byId = (id) => document.getElementById(id);

/* ====== TASK LIST STORAGE ====== */
let tasks = [];
let taskIdCounter = 0;

function loadInitialTasks() {
  tasks = [];
}

/* ====== COLLAPSIBLE SECTIONS ====== */
function initCollapsibles() {
  $$(".task-section .section-header").forEach(header => {
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

/* ====== VIEW SWITCH ====== */
function initViewSwitch() {
  const container = $(".task-container");
  container.classList.remove("board-view");
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

/* ====== ADD / EDIT TASK ====== */
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

  const displayCurrentDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    currentDateEl.textContent = `Today: ${today}`;
  };

  addBtn?.addEventListener("click", () => {
    editingTaskId = null;
    resetForm();
    const statusSel = byId("taskStatus");
    if (statusSel) statusSel.value = "todo";
    displayCurrentDate();
    formTitle.textContent = "Add New Task";
    formContainer.classList.remove("hidden");
  });

  const closeForm = () => {
    formContainer.classList.add("hidden");
    editingTaskId = null;
  };

  closeFormBtn?.addEventListener("click", closeForm);
  cancelBtn?.addEventListener("click", closeForm);
  formOverlay?.addEventListener("click", closeForm);

  taskForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = byId("taskTitle").value.trim();
    const tag = byId("taskTag").value;
    const prio = byId("taskPriority").value;
    const statusValue = byId("taskStatus").value; // "todo" | "inprogress" | "done"
    const section = statusToSection(statusValue);
    const due = ""; // Not used

    if (!title) {
      alert("Please enter a task title");
      return;
    }

    if (editingTaskId !== null) {
      const task = tasks.find(t => t.id === editingTaskId);
      if (task) {
        const oldSection = task.section;
        task.title = title;
        task.tag = tag;
        task.prio = prio;
        task.section = section;

        const row = $(`[data-task-id="${editingTaskId}"]`);
        if (row) {
          if (oldSection !== section) {
            row.remove();
            const targetSectionEl = findSectionElementByHeading(section);
            if (targetSectionEl) {
              openSection(targetSectionEl);
              const targetTable = $(".task-table", targetSectionEl);
              const newRow = createTaskRow(task, section === "Done");
              targetTable.appendChild(newRow);
            }
          } else {
            updateTaskRow(row, task, section === "Done");
          }
        }
      }
    } else {
      const newTask = {
        id: taskIdCounter++,
        title,
        due,
        tag,
        prio,
        section
      };
      tasks.push(newTask);

      const targetSectionEl = findSectionElementByHeading(section);
      if (targetSectionEl) {
        openSection(targetSectionEl);
        const targetTable = $(".task-table", targetSectionEl);
        const row = createTaskRow(newTask, section === "Done");
        targetTable.appendChild(row);
      }
    }

    closeForm();
    resetForm();
  });
}

function resetForm() {
  byId("taskForm").reset();
  byId("taskTitle").focus();
}

function statusToSection(val) {
  const v = String(val || "").toLowerCase();
  if (v === "done") return "Done";
  if (v === "inprogress") return "In Progress";
  return "To Do";
}
function sectionToStatusVal(sectionName) {
  const s = String(sectionName || "").toLowerCase();
  if (s === "done") return "done";
  if (s === "in progress") return "inprogress";
  return "todo";
}
function findSectionElementByHeading(headingText) {
  const sections = $$(".task-section");
  let targetSectionEl = null;
  sections.forEach(sec => {
    const heading = $("h3", sec);
    if (heading && heading.textContent.trim() === headingText) {
      targetSectionEl = sec;
    }
  });
  return targetSectionEl;
}
function openSection(sectionEl) {
  sectionEl.classList.remove("collapsed");
  const header = $(".section-header", sectionEl);
  header?.setAttribute("aria-expanded", "true");
}

/* ====== ROW RENDERING WITH CONTEXTUAL ACTIONS ====== */
function actionButtonsForSection(sectionName) {
  const s = String(sectionName || "").trim();
  // Base actions always present
  const base = `
    <button class="edit-btn" title="Edit">Edit</button>
    <button class="delete-btn" title="Delete">Delete</button>
  `;
  // Status-specific actions
  if (s === "To Do") {
    return `
      <button class="to-inprogress" title="Move to In Progress">In-Progress</button>
      ${base}
    `;
  }
  // if (s === "In Progress") {
  //   return `
  //     <button class="to-done" title="Mark as Done">Done</button>
  //     ${base}
  //   `;
  // }
  // Done: no status shift buttons
  return base;
}

function createTaskRow(task, isChecked = false) {
  const row = document.createElement("div");
  row.className = "task-row";
  row.setAttribute("data-task-id", task.id);
  row.innerHTML = `
    <label><input type="checkbox" ${isChecked ? 'checked' : ''}> ${escapeHtml(task.title)}</label>
    <span class="tag ${clsTag(task.tag)}">${labelTag(task.tag)}</span>
    <span class="priority ${clsPrio(task.prio)}">${labelPrio(task.prio)}</span>
    <div class="task-actions">
      ${actionButtonsForSection(task.section)}
    </div>
  `;
  // Visuals for done
  const label = $('label', row);
  if (isChecked) {
    label.style.opacity = "0.55";
    label.style.textDecoration = "line-through";
  } else {
    label.style.opacity = "1";
    label.style.textDecoration = "none";
  }
  return row;
}

function updateTaskRow(row, task, shouldBeChecked) {
  const isChecked = !!shouldBeChecked;
  row.innerHTML = `
    <label><input type="checkbox" ${isChecked ? 'checked' : ''}> ${escapeHtml(task.title)}</label>
    <span class="tag ${clsTag(task.tag)}">${labelTag(task.tag)}</span>
    <span class="priority ${clsPrio(task.prio)}">${labelPrio(task.prio)}</span>
    <div class="task-actions">
      ${actionButtonsForSection(task.section)}
    </div>
  `;
  const label = $('label', row);
  if (isChecked) {
    label.style.opacity = "0.55";
    label.style.textDecoration = "line-through";
  } else {
    label.style.opacity = "1";
    label.style.textDecoration = "none";
  }
}

/* ====== HELPERS ====== */
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

/* ====== CHECKBOX (Done <-> To Do) ====== */
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

      // Checkbox toggles only To Do <-> Done
      const targetSection = e.target.checked ? "Done" : "To Do";
      moveTaskToSection(taskId, task, targetSection, row);
    }
  });
}

/* ====== STATUS BUTTONS (To Do -> In Progress/Done, In Progress -> Done) ====== */
function initStatusButtons() {
  document.addEventListener("click", (e) => {
    // Move To Do -> In Progress
    if (e.target.matches(".to-inprogress")) {
      const row = e.target.closest(".task-row");
      if (!row) return;
      const taskId = parseInt(row.getAttribute("data-task-id"));
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      moveTaskToSection(taskId, task, "In Progress", row);
      return;
    }

    // Move To Do or In Progress -> Done
    if (e.target.matches(".to-done")) {
      const row = e.target.closest(".task-row");
      if (!row) return;
      const taskId = parseInt(row.getAttribute("data-task-id"));
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      moveTaskToSection(taskId, task, "Done", row);
      return;
    }
  });
}

function moveTaskToSection(taskId, task, targetSection, oldRow) {
  task.section = targetSection;

  const targetSectionEl = findSectionElementByHeading(targetSection);
  if (!targetSectionEl) return;

  // Remove old DOM node
  oldRow.remove();

  // Open target section and append fresh row
  openSection(targetSectionEl);
  const targetTable = $(".task-table", targetSectionEl);
  const isChecked = targetSection === "Done";
  const newRow = createTaskRow(task, isChecked);
  targetTable.appendChild(newRow);
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

      editingTaskId = taskId;
      byId("taskTitle").value = task.title;
      byId("taskTag").value = task.tag;
      byId("taskPriority").value = task.prio;

      const statusSel = byId("taskStatus");
      if (statusSel) statusSel.value = sectionToStatusVal(task.section);

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

      tasks = tasks.filter(t => t.id !== taskId);
      row.remove();
    }
  });
}

/* ====== TODAY'S DATE ====== */
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
  initStatusButtons();   // <<< NEW
  initEditTask();
  initDeleteTask();
});