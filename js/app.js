import { initModal } from "/js/modal.js";
import { initTabs } from "/js/utils.js";
import { initTechnicians } from "/js/technicians.js";
import { initTasks } from "/js/tasks.js";
import { initAbsences } from "/js/absences.js";
import { observeAuth } from "/js/auth.js";

observeAuth(user => {
  if (!user) {
    window.location.replace("/login.html");
    return;
  }

  console.log("✅ Usuário logado:", user.email);

  initModal();
  initTabs();
  initTechnicians();
  initTasks();
  initAbsences();
});


