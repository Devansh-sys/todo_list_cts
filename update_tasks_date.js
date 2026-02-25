// Script to update task dates to today (2026-02-25)
// Run this in the browser console at the todo list app

function updateTaskDatesToToday() {
  const TODAY = "2026-02-25";
  
  try {
    // Get tasks from localStorage
    const tasksJson = localStorage.getItem("tasklist.tasks");
    
    if (!tasksJson) {
      console.log("No tasks found in localStorage");
      return;
    }
    
    const tasks = JSON.parse(tasksJson);
    console.log("Found tasks:", tasks);
    
    // Update each task's date to today
    tasks.forEach((task) => {
      const oldDate = task.date;
      task.date = TODAY;
      console.log(`Updated task "${task.title}" from ${oldDate} to ${TODAY}`);
    });
    
    // Save updated tasks back to localStorage
    localStorage.setItem("tasklist.tasks", JSON.stringify(tasks));
    console.log("✅ All tasks updated to today's date:", TODAY);
    console.log("Updated tasks:", tasks);
    
    // Reload the page to see changes
    location.reload();
  } catch (err) {
    console.error("Error updating tasks:", err);
  }
}

// Call the function
updateTaskDatesToToday();
