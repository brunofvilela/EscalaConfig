import { initModal } from "./modal.js";
import { initTabs } from "./utils.js";
import { initTechnicians } from "./technicians.js";
import { initTasks } from "./tasks.js";
import { initAbsences } from "./absences.js";

// init global
initModal();
initTabs();

// init modules
initTechnicians();
initTasks();
initAbsences();
