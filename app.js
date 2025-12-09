// app.js (módulo)
import {
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  getDoc,
  setDoc,
  runTransaction
} from "./firebase.js";

/* ---------------------------
   SELECTORS
   --------------------------- */
const tabs = document.querySelectorAll(".tabBtn");
const tabSections = document.querySelectorAll(".tab");

const technicianList = document.getElementById("technician-list");
const techNameInput = document.getElementById("tech-name");
const techOrderInput = document.getElementById("tech-order");
const btnAddTech = document.getElementById("btn-add-tech");

const taskList = document.getElementById("task-list");
const taskActivityInput = document.getElementById("task-activity");
const btnAddTask = document.getElementById("btn-add-task");

const absenceList = document.getElementById("absence-list");
const absenceTechSelect = document.getElementById("absence-tech");
const absenceStartInput = document.getElementById("absence-start");
const absenceEndInput = document.getElementById("absence-end");
const absenceReasonInput = document.getElementById("absence-reason");
const btnAddAbsence = document.getElementById("btn-add-absence");

const modal = document.getElementById("modal-edit");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalSave = document.getElementById("modal-save");
const modalCancel = document.getElementById("modal-cancel");

let modalContext = null; // { type: 'tech'|'task'|'absence', id: string }

/* ---------------------------
   TABS
   --------------------------- */
tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.tab;
    tabSections.forEach(s => s.classList.remove("active"));
    document.getElementById(target).classList.add("active");
  });
});

/* ---------------------------
   HELPERS: datas e status
   --------------------------- */
function toISODate(dStr) {
  // dStr in YYYY-MM-DD -> returns ISO (yyyy-mm-dd)
  return dStr;
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}

function parseDateISO(s) {
  // supports yyyy-mm-dd or ISO
  if (!s) return null;
  const dd = new Date(s);
  dd.setHours(0,0,0,0);
  return dd;
}

function isDateInRange(today, startStr, endStr) {
  const start = parseDateISO(startStr);
  const end = parseDateISO(endStr);
  if (!start || !end) return false;
  // include entire end day
  end.setHours(23,59,59,999);
  return today >= start && today <= end;
}

/* ---------------------------
   STATUS: calcula se técnico está AUSENTE hoje
   --------------------------- */
async function calculateTechnicianStatus(techId, absencesList) {
  // absencesList: array of absence docs (objects) or empty
  const today = todayMidnight();
  for (const a of absencesList) {
    if (a.technicianId === techId && isDateInRange(today, a.start, a.end)) {
      return "AUSENTE";
    }
  }
  return "ATIVO";
}

/* ---------------------------
   LOAD RAW collections helpers
   --------------------------- */
async function loadTechniciansRaw() {
  const q = query(collection(db, "technicians"), orderBy("order"));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
  return arr;
}

async function loadAbsencesRaw() {
  const q = query(collection(db, "absences"), orderBy("start", "desc"));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
  return arr;
}

async function loadTasksRaw() {
  const q = query(collection(db, "tasks"), orderBy("timestamp", "desc"), limit(50));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
  return arr;
}

/* ---------------------------
   TÉCNICOS: load/render (status calculado)
   --------------------------- */
async function loadTechnicians(){
  technicianList.innerHTML = "<div class='muted'>Carregando...</div>";
  absenceTechSelect.innerHTML = "";

  const [techs, abs] = await Promise.all([loadTechniciansRaw(), loadAbsencesRaw()]);

  technicianList.innerHTML = "";
    
    technicianList.innerHTML = "";
    for (const t of techs) {
      const status = await calculateTechnicianStatus(t.id, abs);
  
      // cartão principal
      const card = document.createElement("div");
      card.className = "technician-card";
  
      // coluna esquerda: info (nome + meta)
      const info = document.createElement("div");
      info.className = "tech-info";
  
      const nameEl = document.createElement("div");
      nameEl.className = "tech-name";
      nameEl.textContent = t.name || "";
  
      const metaEl = document.createElement("div");
      metaEl.className = "meta";
      metaEl.textContent = "Ordem: " + (t.order ?? "");
  
      info.appendChild(nameEl);
      info.appendChild(metaEl);
  
      // coluna direita: badge + ações
      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "10px";
  
      const badge = document.createElement("span");
      badge.className = "badge " + (status === "ATIVO" ? "badge-ativo" : "badge-ausente");
      badge.textContent = status;
  
      const actions = document.createElement("div");
      actions.className = "actions";
  
      // botão editar
      const editBtn = document.createElement("button");
      editBtn.className = "btn-edit";
      editBtn.type = "button";
      editBtn.title = "Editar técnico";
      editBtn.textContent = "✏️";
      editBtn.onclick = async () => {
        // carregar documento diretamente (usa getDoc)
        try {
          const docRef = doc(db, "technicians", t.id);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) return alert("Documento não encontrado.");
          const data = docSnap.data();
  
          modalTitle.textContent = "Editar Técnico (status automático)";
          modalBody.innerHTML = `
            <label>Nome</label>
            <input id="modal-field-name" value="${escapeHtml(data.name || '')}" />
            <label>Ordem</label>
            <input id="modal-field-order" type="number" value="${escapeHtml(String(data.order || ''))}" />
            <p class="muted">O status é atualizado automaticamente a partir do histórico de ausências.</p>
          `;
          modalContext = { type: 'tech', id: t.id };
          modal.setAttribute('aria-hidden', 'false');
        } catch (err) {
          console.error(err);
          alert("Erro ao abrir edição.");
        }
      };
  
      // botão deletar
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete";
      deleteBtn.type = "button";
      deleteBtn.title = "Excluir técnico";
      deleteBtn.textContent = "🗑️";
      deleteBtn.onclick = async () => {
        if (!confirm("Excluir técnico?")) return;
        try {
          await deleteDoc(doc(db, "technicians", t.id));
          await loadTechnicians(); // recarrega lista
        } catch (err) {
          console.error(err);
          alert("Erro ao excluir técnico.");
        }
      };
  
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
  
      right.appendChild(badge);
      right.appendChild(actions);
  
      // montar cartão
      card.appendChild(info);
      card.appendChild(right);
  
      technicianList.appendChild(card);
    }
  

  // bind buttons
  document.querySelectorAll(".btn-delete").forEach(b=>{
    b.onclick = async () => {
      if (!confirm("Excluir técnico?")) return;
      await deleteDoc(doc(db, "technicians", b.dataset.id));
      await loadTechnicians();
    };
  });

  document.querySelectorAll(".btn-edit").forEach(b=>{
    b.onclick = async () => {
      const id = b.dataset.id;
      // load doc directly
      const snap = await getDocs(query(collection(db, "technicians")));
      let data = null;
      snap.forEach(s => { if (s.id === id) data = s.data(); });
      if (!data) return alert("Documento não encontrado.");

      modalTitle.textContent = "Editar Técnico (status automático)";
      modalBody.innerHTML = `
        <label>Nome</label>
        <input id="modal-field-name" value="${escapeHtml(data.name||'')}" />
        <label>Ordem</label>
        <input id="modal-field-order" type="number" value="${escapeHtml(String(data.order||''))}" />
        <p class="muted">O status é atualizado automaticamente a partir do histórico de ausências.</p>
      `;
      modalContext = { type: 'tech', id };
      modal.setAttribute('aria-hidden', 'false');
    };
  });
}

btnAddTech.addEventListener("click", async () => {
  const name = (techNameInput.value || "").trim();
  const order = Number(techOrderInput.value) || Date.now();
  if (!name) { alert("Informe o nome do técnico."); return; }

  await addDoc(collection(db, "technicians"), { name, order });
  techNameInput.value = "";
  techOrderInput.value = "";
  await loadTechnicians();
});

/* ---------------------------
   TAREFAS: load/add (pula ausentes)
   --------------------------- */

async function getNextActiveTechnicianIndexAndId(activeTechs) {
  // uses meta/rotation document to keep index — safe via transaction
  const metaRef = doc(db, "meta", "rotation");

  // If meta doc does not exist, we'll create and set tecnicoIndex = -1 within transaction
  const newIndexObj = await runTransaction(db, async (tx) => {
    const metaSnap = await tx.get(metaRef);
    let idx = -1;
    if (metaSnap.exists()) {
      const data = metaSnap.data();
      idx = typeof data.tecnicoIndex === 'number' ? data.tecnicoIndex : -1;
    } else {
      tx.set(metaRef, { tecnicoIndex: -1 });
      idx = -1;
    }
    // advance
    const nextIdx = (idx + 1) % activeTechs.length;
    tx.update(metaRef, { tecnicoIndex: nextIdx });
    return { nextIdx };
  });

  return newIndexObj.nextIdx;
}

async function addTask() {
  const activity = (taskActivityInput.value || "").trim();
  if (!activity) { alert("Informe a atividade."); return; }

  // load technicians and absences, compute statuses
  const [techs, abs] = await Promise.all([loadTechniciansRaw(), loadAbsencesRaw()]);
  // compute active list by order
  const techsWithStatus = await Promise.all(techs.map(async t => {
    const status = await calculateTechnicianStatus(t.id, abs);
    return { ...t, status };
  }));

  const activeTechs = techsWithStatus.filter(t => t.status === "ATIVO").sort((a,b)=> (a.order||0)-(b.order||0));
  if (activeTechs.length === 0) { alert("Nenhum técnico ATIVO disponível hoje."); return; }

  // get next index via transaction meta
  const idx = await getNextActiveTechnicianIndexAndId(activeTechs);
  const chosen = activeTechs[idx];

  const now = new Date();
  await addDoc(collection(db, "tasks"), {
    activity,
    technicianId: chosen.id,
    technicianName: chosen.name,
    timestamp: now.toISOString(),
    displayTS: now.toLocaleString()
  });

  taskActivityInput.value = "";
  await loadTasks();
}

/* load tasks */
async function loadTasks(){
  taskList.innerHTML = "<div class='muted'>Carregando...</div>";
  const arr = await loadTasksRaw();
  taskList.innerHTML = "";
  for (const t of arr) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="left">
        <div>
          <strong>${escapeHtml(t.activity||'')}</strong>
          <div class="meta">${escapeHtml(t.technicianName||'')} — ${escapeHtml(t.displayTS||t.timestamp||'')}</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn-edit-task" data-id="${t.id}">✏️</button>
        <button class="btn-delete-task" data-id="${t.id}">🗑️</button>
      </div>
    `;
    taskList.appendChild(item);
  }

  document.querySelectorAll(".btn-delete-task").forEach(b=>{
    b.onclick = async () => {
      if (!confirm("Excluir tarefa?")) return;
      await deleteDoc(doc(db, "tasks", b.dataset.id));
      await loadTasks();
    };
  });

  document.querySelectorAll(".btn-edit-task").forEach(b=>{
    b.onclick = async () => {
      const id = b.dataset.id;
      const arr = await loadTasksRaw();
      const rec = arr.find(x => x.id === id);
      if (!rec) return alert("Registro não encontrado.");
      modalTitle.textContent = "Editar Tarefa";
      modalBody.innerHTML = `
        <label>Atividade</label>
        <input id="modal-field-activity" value="${escapeHtml(rec.activity||'')}" />
      `;
      modalContext = { type: 'task', id };
      modal.setAttribute('aria-hidden', 'false');
    };
  });
}

/* bind task add */
btnAddTask.addEventListener("click", addTask);

/* ---------------------------
   AUSÊNCIAS: load/add/edit/delete
   --------------------------- */

async function loadAbsences(){
  absenceList.innerHTML = "<div class='muted'>Carregando...</div>";
  const arr = await loadAbsencesRaw();
  absenceList.innerHTML = "";
  for (const a of arr) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="left">
        <div>
          <strong>${escapeHtml(a.tech || '')}</strong>
          <div class="meta">${escapeHtml(a.start || '')} → ${escapeHtml(a.end || '')} — ${escapeHtml(a.reason || '')}</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn-edit-absence" data-id="${a.id}">✏️</button>
        <button class="btn-delete-absence" data-id="${a.id}">🗑️</button>
      </div>
    `;
    absenceList.appendChild(item);
  }

  document.querySelectorAll(".btn-delete-absence").forEach(b=>{
    b.onclick = async () => {
      if (!confirm("Excluir ausência?")) return;
      await deleteDoc(doc(db, "absences", b.dataset.id));
      await loadAbsences();
      await loadTechnicians(); // recalc statuses
    };
  });

  document.querySelectorAll(".btn-edit-absence").forEach(b=>{
    b.onclick = async () => {
      const id = b.dataset.id;
      const arr = await loadAbsencesRaw();
      const rec = arr.find(x => x.id === id);
      if (!rec) return alert("Registro não encontrado.");
      modalTitle.textContent = "Editar Ausência";
      modalBody.innerHTML = `
        <label>Técnico (nome)</label>
        <input id="modal-field-abs-tech" value="${escapeHtml(rec.tech||'')}" />
        <label>Início</label>
        <input id="modal-field-abs-start" type="date" value="${escapeHtml(rec.start||'')}" />
        <label>Fim</label>
        <input id="modal-field-abs-end" type="date" value="${escapeHtml(rec.end||'')}" />
        <label>Motivo</label>
        <input id="modal-field-abs-reason" value="${escapeHtml(rec.reason||'')}" />
      `;
      modalContext = { type: 'absence', id };
      modal.setAttribute('aria-hidden', 'false');
    };
  });
}

btnAddAbsence.addEventListener("click", async () => {
  const techId = absenceTechSelect.value;
  const start = absenceStartInput.value;
  const end = absenceEndInput.value;
  const reason = (absenceReasonInput.value || "").trim();

  if (!techId || !start || !end) { alert("Preencha técnico, início e fim."); return; }

  // get technician name by id
  const techs = await loadTechniciansRaw();
  const chosen = techs.find(t => t.id === techId);
  const tname = chosen ? chosen.name : '';

  await addDoc(collection(db, "absences"), {
    technicianId: techId,
    tech: tname,
    start,
    end,
    reason,
    createdAt: new Date().toISOString()
  });

  // set technician status to AUSENTE by absence logic (we also keep status field if you want)
  await updateDoc(doc(db, "technicians", techId), { /* no manual status change required */ });

  absenceStartInput.value = '';
  absenceEndInput.value = '';
  absenceReasonInput.value = '';
  await loadAbsences();
  await loadTechnicians();
});

/* ---------------------------
   MODAL: salvar edição (usa updateDoc)
   --------------------------- */

modalSave.addEventListener("click", async () => {
  if (!modalContext) return;
  const { type, id } = modalContext;

  if (type === 'tech') {
    const name = document.getElementById("modal-field-name").value.trim();
    const order = Number(document.getElementById("modal-field-order").value) || Date.now();
    await updateDoc(doc(db, "technicians", id), { name, order });
    modal.setAttribute('aria-hidden', 'true');
    modalContext = null;
    await loadTechnicians();
  } else if (type === 'task') {
    const activity = document.getElementById("modal-field-activity").value.trim();
    await updateDoc(doc(db, "tasks", id), { activity });
    modal.setAttribute('aria-hidden', 'true');
    modalContext = null;
    await loadTasks();
  } else if (type === 'absence') {
    const tech = document.getElementById("modal-field-abs-tech").value.trim();
    const start = document.getElementById("modal-field-abs-start").value;
    const end = document.getElementById("modal-field-abs-end").value;
    const reason = document.getElementById("modal-field-abs-reason").value.trim();
    await updateDoc(doc(db, "absences", id), { tech, start, end, reason });
    modal.setAttribute('aria-hidden', 'true');
    modalContext = null;
    await loadAbsences();
    await loadTechnicians();
  }
});

modalCancel.addEventListener("click", () => {
  modal.setAttribute('aria-hidden', 'true');
  modalContext = null;
});

/* ---------------------------
   UTIL helpers
   --------------------------- */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

/* ---------------------------
   INIT: carregar tudo
   --------------------------- */
(async function init(){
  await loadTechnicians();
  await loadTasks();
  await loadAbsences();
})();
