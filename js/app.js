import { initFirebase } from "./firebase.js";
import { initTechnicians } from "./technicians.js";
import { initTasks } from "./tasks.js";
import { initAbsences } from "./absences.js";
import { initModal } from "./modal.js";
import { initTabs } from "./utils.js";

// Inicializa Firebase
initFirebase();

// Inicializa Modal e Tabs
initModal();
initTabs();

// Inicializa funcionalidades
initTechnicians();
initTasks();
initAbsences();
