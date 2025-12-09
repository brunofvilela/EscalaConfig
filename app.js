/* app.js — sistema completo de Técnicos / Tarefas / Ausências
   - Copiar/colar como módulo ES (index.html usa <script type="module" src="app.js">)
   - Requer firebase.js exportando as funções Firestore (veja comentário no topo)
*/

/* ============================
   IMPORTS (do seu firebase.js)
   ============================ */
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
  
  /* ============================
     SELECTORS (IDs do index.html fornecido antes)
     ============================ */
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
  
  let modalContext = null; // { type: 'tech'|'task'|'absence'|'tech-add', id?: string }
  
  /* ============================
     Firestore collection refs
     ============================ */
  const techsCol = collection(db, "technicians");
  const tasksCol = collection(db, "tasks");
  const absencesCol = collection(db, "absences");
  const metaDocRef = doc(db, "meta", "rotation");
  
  /* ============================
     UTIL helpers
     ============================ */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  
  function todayISO() {
    // returns yyyy-mm-dd
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  function dateStrToMidnight(dStr) {
    // accepts yyyy-mm-dd or ISO; returns Date at midnight
    if (!dStr) return null;
    const d = new Date(dStr);
    d.setHours(0,0,0,0);
    return d;
  }
  function dateStrEndOfDay(dStr) {
    if (!dStr) return null;
    const d = new Date(dStr);
    d.setHours(23,59,59,999);
    return d;
  }
  
  /* ============================
     TABS navigation
     ============================ */
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.tab;
      tabSections.forEach(s => s.classList.remove("active"));
      document.getElementById(target).classList.add("active");
    });
  });
  
  /* ============================
     RAW loaders (arrays of objects)
     ============================ */
  async function loadTechniciansRaw() {
    const q = query(techsCol, orderBy("order"));
    const snap = await getDocs(q);
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    return arr;
  }
  async function loadAbsencesRaw() {
    const q = query(absencesCol, orderBy("start","desc"));
    const snap = await getDocs(q);
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    return arr;
  }
  async function loadTasksRaw(limitN = 50) {
    const q = query(tasksCol, orderBy("timestamp","desc"), limit(limitN));
    const snap = await getDocs(q);
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    return arr;
  }
  
  /* ============================
     STATUS: calcula se técnico AUSENTE hoje
     ============================ */
  function isAbsentOnDate(absence, checkDateISO) {
    // absence.start and .end expected yyyy-mm-dd
    if (!absence || !absence.start || !absence.end) return false;
    const start = dateStrToMidnight(absence.start);
    const end = dateStrEndOfDay(absence.end);
    const check = dateStrToMidnight(checkDateISO);
    return check >= start && check <= end;
  }
  
  /* ============================
     RENDER TÉCNICOS (status calculado; lista ordenada alfabeticamente para exibição)
     ============================ */
  async function loadTechnicians() {
    technicianList.innerHTML = "<div class='muted'>Carregando...</div>";
    absenceTechSelect.innerHTML = "";
  
    const [techs, abs] = await Promise.all([loadTechniciansRaw(), loadAbsencesRaw()]);
    const today = todayISO();
  
    // calcula status para cada técnico
    for (const t of techs) {
      const myAbs = abs.filter(a => a.technicianId === t.id || a.technicianId === undefined && a.tech === t.name);
      t.status = myAbs.some(a => isAbsentOnDate(a, today)) ? "AUSENTE" : "ATIVO";
    }
  
    // exibição alfabeticamente (não altera ordem armazenada)
    techs.sort((a,b) => (a.name||'').localeCompare(b.name||'','pt-BR',{sensitivity:'base'}));
  
    // render
    technicianList.innerHTML = "";
    for (const t of techs) {
      const card = document.createElement("div");
      card.className = "technician-card";
  
      // left: info
      const info = document.createElement("div");
      info.className = "tech-info";
      const nameEl = document.createElement("div");
      nameEl.className = "tech-name";
      nameEl.textContent = t.name || "";
  
      const metaEl = document.createElement("div");
      metaEl.className = "meta";
      metaEl.textContent = `Ordem: ${t.order ?? ''}`;
  
      info.appendChild(nameEl);
      info.appendChild(metaEl);
  
      // right: badge + actions
      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "10px";
  
      const badge = document.createElement("span");
      badge.className = "badge " + (t.status === "ATIVO" ? "badge-ativo" : "badge-ausente");
      badge.textContent = t.status;
  
      const actions = document.createElement("div");
      actions.className = "actions";
  
      const editBtn = document.createElement("button");
      editBtn.className = "btn-edit";
      editBtn.type = "button";
      editBtn.title = "Editar técnico";
      editBtn.textContent = "✏️";
      editBtn.onclick = async () => openEditTechModal(t);
  
      const delBtn = document.createElement("button");
      delBtn.className = "btn-delete";
      delBtn.type = "button";
      delBtn.title = "Excluir técnico";
      delBtn.textContent = "🗑️";
      delBtn.onclick = async () => deleteTechnician(t);
  
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
  
      right.appendChild(badge);
      right.appendChild(actions);
  
      card.appendChild(info);
      card.appendChild(right);
  
      technicianList.appendChild(card);
  
      // add option for absence select
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      absenceTechSelect.appendChild(opt);
    }
  }
  
  /* ============================
     ORDERS: helpers para gerenciar ordem única
     ============================ */
  async function getNextOrder() {
    const techs = await loadTechniciansRaw();
    if (techs.length === 0) return 1;
    const max = techs.reduce((m,t) => Math.max(m, Number(t.order || 0)), 0);
    return max + 1;
  }
  
  // empurra ordens >= startOrder para +1 (usado ao inserir/editar)
  async function shiftOrdersUpFrom(startOrder) {
    const techs = await loadTechniciansRaw();
    // ordenar decrescente para evitar colisões quando atualizando
    const affected = techs.filter(t => Number(t.order || 0) >= startOrder).sort((a,b)=>b.order-a.order);
    for (const t of affected) {
      await updateDoc(doc(db, "technicians", t.id), { order: Number(t.order||0) + 1 });
    }
  }
  
  // decrementa ordens > startOrder por 1 (usado ao deletar)
  async function shiftOrdersDownFrom(startOrder) {
    const techs = await loadTechniciansRaw();
    // ordenar crescente para evitar colisões
    const affected = techs.filter(t => Number(t.order || 0) > startOrder).sort((a,b)=>a.order-b.order);
    for (const t of affected) {
      await updateDoc(doc(db, "technicians", t.id), { order: Number(t.order||0) - 1 });
    }
  }
  
  /* ============================
     ADICIONAR TÉCNICO (usa ordem automática mas permite editar no modal)
     ============================ */
  btnAddTech.addEventListener("click", async () => {
    // abre modal para adicionar (preenche ordem automática)
    const next = await getNextOrder();
    modalTitle.textContent = "Adicionar Técnico";
    modalBody.innerHTML = `
      <label>Nome</label>
      <input id="modal-field-name" placeholder="Nome do técnico" />
      <label>Ordem (automático, mas editável)</label>
      <input id="modal-field-order" type="number" value="${next}" />
      <p class="muted">A ordem será única. Se escolher um número que já existe, os técnicos com ordem >= serão deslocados.</p>
    `;
    modalContext = { type: 'tech-add' };
    modal.setAttribute('aria-hidden','false');
  });
  
  /* ============================
     EDITAR TÉCNICO (modal)
     ============================ */
  function openEditTechModal(t) {
    modalTitle.textContent = "Editar Técnico (status automático)";
    modalBody.innerHTML = `
      <label>Nome</label>
      <input id="modal-field-name" value="${escapeHtml(t.name||'')}" />
      <label>Ordem</label>
      <input id="modal-field-order" type="number" value="${escapeHtml(String(t.order||''))}" />
      <p class="muted">O status não é editável — é calculado a partir do histórico de ausências.</p>
    `;
    modalContext = { type: 'tech-edit', id: t.id, originalOrder: Number(t.order||0) };
    modal.setAttribute('aria-hidden','false');
  }
  
  /* ============================
     DELETAR TÉCNICO (reordena depois)
     ============================ */
  async function deleteTechnician(t) {
    if (!confirm(`Excluir técnico ${t.name}?`)) return;
    // apagar
    await deleteDoc(doc(db, "technicians", t.id));
    // shift orders down for those with order > removed
    await shiftOrdersDownFrom(Number(t.order||0));
    // recarregar
    await loadTechnicians();
  }
  
  /* ============================
     MODAL: salvar (adicionar/editar/updateDoc)
     ============================ */
  modalSave.addEventListener("click", async () => {
    if (!modalContext) return;
    const type = modalContext.type;
  
    const nameEl = document.getElementById("modal-field-name");
    const orderEl = document.getElementById("modal-field-order");
  
    if (type === 'tech-add') {
      const name = (nameEl.value || "").trim();
      let order = Number(orderEl.value) || await getNextOrder();
      if (!name) return alert("Nome obrigatório.");
  
      // se ordem já existe: shift up from order
      const techs = await loadTechniciansRaw();
      if (techs.some(t => Number(t.order||0) === order)) {
        await shiftOrdersUpFrom(order);
      }
  
      await addDoc(techsCol, { name, order });
      modal.setAttribute('aria-hidden','true');
      modalContext = null;
      await loadTechnicians();
      return;
    }
  
    if (type === 'tech-edit') {
      const id = modalContext.id;
      const name = (nameEl.value || "").trim();
      let newOrder = Number(orderEl.value) || 1;
      if (!name) return alert("Nome obrigatório.");
  
      // if order changed and conflicts -> shift others up
      const originalOrder = Number(modalContext.originalOrder || 0);
      if (newOrder !== originalOrder) {
        const techs = await loadTechniciansRaw();
        // if newOrder already exists, shift >= newOrder up by 1
        if (techs.some(t => t.id !== id && Number(t.order||0) === newOrder)) {
          await shiftOrdersUpFrom(newOrder);
        }
      }
  
      await updateDoc(doc(db, "technicians", id), { name, order: newOrder });
      modal.setAttribute('aria-hidden','true');
      modalContext = null;
      await loadTechnicians();
      return;
    }
  
    // === TASK edit ===
    if (type === 'task-edit') {
      const id = modalContext.id;
      const activity = (document.getElementById("modal-field-activity").value || "").trim();
      if (!activity) return alert("Atividade vazia.");
      await updateDoc(doc(db, "tasks", id), { activity });
      modal.setAttribute('aria-hidden','true');
      modalContext = null;
      await loadTasks();
      return;
    }
  
    // === ABSENCE edit ===
    if (type === 'absence-edit') {
      const id = modalContext.id;
      const tech = (document.getElementById("modal-field-abs-tech").value || "").trim();
      const start = document.getElementById("modal-field-abs-start").value;
      const end = document.getElementById("modal-field-abs-end").value;
      const reason = (document.getElementById("modal-field-abs-reason").value || "").trim();
      if (!start || !end) return alert("Preencha início e fim.");
      await updateDoc(doc(db, "absences", id), { tech, start, end, reason });
      modal.setAttribute('aria-hidden','true');
      modalContext = null;
      await loadAbsences();
      await loadTechnicians();
      return;
    }
  });
  
  modalCancel.addEventListener("click", () => {
    modal.setAttribute('aria-hidden','true');
    modalContext = null;
  });
  
  /* ============================
     TAREFAS: load / add / edit / delete
     ============================ */
  async function loadTasks() {
    taskList.innerHTML = "<div class='muted'>Carregando...</div>";
    const arr = await loadTasksRaw(50);
    taskList.innerHTML = "";
    for (const t of arr) {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="left">
          <div><strong>${escapeHtml(t.activity||'')}</strong></div>
          <div class="meta">${escapeHtml(t.technicianName||'')} — ${escapeHtml(t.displayTS||t.timestamp||'')}</div>
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
        const arr = await loadTasksRaw(200);
        const rec = arr.find(x => x.id === id);
        if (!rec) return alert("Registro não encontrado.");
        modalTitle.textContent = "Editar Tarefa";
        modalBody.innerHTML = `
          <label>Atividade</label>
          <input id="modal-field-activity" value="${escapeHtml(rec.activity||'')}" />
        `;
        modalContext = { type: 'task-edit', id };
        modal.setAttribute('aria-hidden','false');
      };
    });
  }
  
  /* addTask: usa meta/rotation com transaction, pula ausentes */
  async function addTask() {
    const activity = (taskActivityInput.value || "").trim();
    if (!activity) return alert("Digite a atividade.");
  
    // carregar técnicos e ausências
    const [techsRaw, abs] = await Promise.all([loadTechniciansRaw(), loadAbsencesRaw()]);
  
    // calcula status e faz array de técnicos ativos (base interna: por order)
    const today = todayISO();
    const techsWithStatus = techsRaw.map(t => {
      const myAbs = abs.filter(a => a.technicianId === t.id || a.tech === t.name);
      const status = myAbs.some(a => isAbsentOnDate(a, today)) ? "AUSENTE" : "ATIVO";
      return { ...t, status };
    });
  
    const active = techsWithStatus.filter(t => t.status === "ATIVO").sort((a,b) => (a.order||0)-(b.order||0));
    if (active.length === 0) return alert("Nenhum técnico ATIVO disponível hoje.");
  
    // runTransaction para avançar index com segurança
    const chosenIdx = await runTransaction(db, async (tx) => {
      const metaSnap = await tx.get(metaDocRef);
      let idx = -1;
      if (metaSnap.exists()) {
        const data = metaSnap.data();
        idx = typeof data.tecnicoIndex === 'number' ? data.tecnicoIndex : -1;
      } else {
        tx.set(metaDocRef, { tecnicoIndex: -1 });
        idx = -1;
      }
      const nextIdx = (idx + 1) % active.length;
      tx.update(metaDocRef, { tecnicoIndex: nextIdx });
      return nextIdx;
    });
  
    const chosen = active[chosenIdx];
  
    const now = new Date();
    await addDoc(tasksCol, {
      activity,
      technicianId: chosen.id,
      technicianName: chosen.name,
      timestamp: now.toISOString(),
      displayTS: now.toLocaleString()
    });
  
    taskActivityInput.value = "";
    await loadTasks();
  }
  
  /* bind add task button */
  btnAddTask.addEventListener("click", addTask);
  
  /* ============================
     AUSÊNCIAS: load / add / edit / delete
     ============================ */
  async function loadAbsences() {
    absenceList.innerHTML = "<div class='muted'>Carregando...</div>";
    const arr = await loadAbsencesRaw();
    absenceList.innerHTML = "";
    for (const a of arr) {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="left">
          <div><strong>${escapeHtml(a.tech||'')}</strong></div>
          <div class="meta">${escapeHtml(a.start||'')} → ${escapeHtml(a.end||'')} — ${escapeHtml(a.reason||'')}</div>
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
        await loadTechnicians();
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
        modalContext = { type: 'absence-edit', id };
        modal.setAttribute('aria-hidden','false');
      };
    });
  }
  
  btnAddAbsence.addEventListener("click", async () => {
    const techId = absenceTechSelect.value;
    const start = absenceStartInput.value;
    const end = absenceEndInput.value;
    const reason = (absenceReasonInput.value || "").trim();
  
    if (!techId || !start || !end) { return alert("Preencha técnico, data início e fim."); }
  
    // get technician name by id
    const techs = await loadTechniciansRaw();
    const chosen = techs.find(t => t.id === techId);
    const tname = chosen ? chosen.name : '';
  
    await addDoc(absencesCol, {
      technicianId: techId,
      tech: tname,
      start,
      end,
      reason,
      createdAt: new Date().toISOString()
    });
  
    // não alteramos campo status diretamente; loadTechnicians calcula
    absenceStartInput.value = '';
    absenceEndInput.value = '';
    absenceReasonInput.value = '';
    await loadAbsences();
    await loadTechnicians();
  });
  
  /* ============================
     INIT: carregar tudo
     ============================ */
  (async function init(){
    // proteção se elementos não existem
    if (!technicianList) return console.error("Elemento technician-list não encontrado no HTML.");
  
    await Promise.all([loadTechnicians(), loadTasks(), loadAbsences()]);
  })();
  