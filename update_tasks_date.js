

function updateTaskDatesToToday() {
  const TODAY = "2026-02-25";
  
  try {
    
    const tasksJson = localStorage.getItem("tasklist.tasks");
    
    if (!tasksJson) {
      console.log("No tasks found in localStorage");
      return;
    }
    
    const tasks = JSON.parse(tasksJson);
    console.log("Found tasks:", tasks);
    
    
    tasks.forEach((task) => {
      const oldDate = task.date;
      task.date = TODAY;
      console.log(`Updated task "${task.title}" from ${oldDate} to ${TODAY}`);
    });
    
    
    localStorage.setItem("tasklist.tasks", JSON.stringify(tasks));
    console.log("✅ All tasks updated to today's date:", TODAY);
    console.log("Updated tasks:", tasks);
    
    
    location.reload();
  } catch (err) {
    console.error("Error updating tasks:", err);
  }
}


updateTaskDatesToToday();
