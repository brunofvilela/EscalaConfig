import { initModal } from "./modal.js";
import { initTabs } from "./utils.js";
import { initTechnicians } from "./technicians.js";
import { initTasks } from "./tasks.js";
import { initAbsences } from "./absences.js";

// CONTROLE DAS ABAS (TÉCNICOS / TAREFAS / AUSÊNCIAS)
const tabButtons = document.querySelectorAll(".tabBtn");
const tabs = document.querySelectorAll(".tab");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    // remover active de todos os botões
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // esconder todas as abas
    tabs.forEach(t => t.classList.remove("active"));

    // mostrar aba selecionada
    const tabId = btn.dataset.tab;
    document.getElementById(tabId).classList.add("active");
  });
});

// init global
initModal();
initTabs();

// init modules
initTechnicians();
initTasks();
initAbsences();
