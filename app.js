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
    limit
  } from "./firebase.js";
  
  /* ---------------------------
     UTIL / SELECTORS
     --------------------------- */
  const tabs = document.querySelectorAll(".tabBtn");
  const tabSections = document.querySelectorAll(".tab");
  
  const technicianList = document.getElementById("technician-list");
  const techNameInput = document.getElementById("tech-name");
  const techStatusInput = document.getElementById("tech-status");
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
     TÉCNICOS: CRUD + EDIT (updateDoc)
     --------------------------- */
  
  async function loadTechnicians(){
    technicianList.innerHTML = "<div class='muted'>Carregando...</div>";
    absenceTechSelect.innerHTML = "";
    const q = query(collection(db, "technicians"), orderBy("order"));
    const snap = await getDocs(q);
  
    technicianList.innerHTML = "";
    snap.forEach(d => {
      const data = d.data();
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="left">
          <div>
            <strong>${data.name}</strong>
            <div class="meta">${data.status || 'ATIVO'}</div>
          </div>
        </div>
        <div class="actions">
          <button class="btn-edit" data-id="${d.id}">✏️</button>
          <button class="btn-delete" data-id="${d.id}">🗑️</button>
        </div>
      `;
      technicianList.appendChild(item);
  
      // select for absence
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = data.name;
      absenceTechSelect.appendChild(opt);
    });
  
    // bind events
    document.querySelectorAll(".btn-delete").forEach(b=>{
      b.onclick = async (e) => {
        const id = b.dataset.id;
        if (!confirm("Excluir técnico?")) return;
        await deleteDoc(doc(db, "technicians", id));
        await loadTechnicians();
      };
    });
  
    document.querySelectorAll(".btn-edit").forEach(b=>{
      b.onclick = async () => {
        const id = b.dataset.id;
        // load doc
        const snap = await getDocs(collection(db, "technicians"));
        let data = null;
        snap.forEach(s => { if (s.id === id) data = s.data(); });
  
        if (!data) { alert("Documento não encontrado."); return; }
  
        // show modal with form
        modalTitle.textContent = "Editar Técnico";
        modalBody.innerHTML = `
          <label>Nome</label>
          <input id="modal-field-name" value="${escapeHtml(data.name||'')}" />
          <label>Status</label>
          <select id="modal-field-status">
            <option value="ATIVO"${data.status==='ATIVO'?' selected':''}>ATIVO</option>
            <option value="AUSENTE"${data.status==='AUSENTE'?' selected':''}>AUSENTE</option>
          </select>
        `;
        modalContext = { type: 'tech', id };
        modal.setAttribute('aria-hidden', 'false');
      };
    });
  }
  
  btnAddTech.addEventListener("click", async () => {
    const name = (techNameInput.value || "").trim();
    const status = techStatusInput.value || "ATIVO";
    if (!name) { alert("Informe o nome do técnico."); return; }
  
    // order: timestamp to keep insertion order (you can change)
    await addDoc(collection(db, "technicians"), { name, status, order: Date.now() });
    techNameInput.value = "";
    await loadTechnicians();
  });
  
  /* ---------------------------
     TAREFAS: CRUD + EDIT
     --------------------------- */
  
  async function loadTasks(){
    taskList.innerHTML = "<div class='muted'>Carregando...</div>";
    const q = query(collection(db, "tasks"), orderBy("timestamp", "desc"), limit(50));
    const snap = await getDocs(q);
    taskList.innerHTML = "";
  
    snap.forEach(d=>{
      const r = d.data();
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="left">
          <div>
            <strong>${escapeHtml(r.activity||'')}</strong>
            <div class="meta">${escapeHtml(r.technicianName||'')} — ${escapeHtml(r.displayTS||r.timestamp||'')}</div>
          </div>
        </div>
        <div class="actions">
          <button class="btn-edit-task" data-id="${d.id}">✏️</button>
          <button class="btn-delete-task" data-id="${d.id}">🗑️</button>
        </div>
      `;
      taskList.appendChild(item);
    });
  
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
        // load task doc
        const snap = await getDocs(collection(db, "tasks"));
        let data = null;
        snap.forEach(s => { if (s.id === id) data = s.data(); });
        if (!data) return alert("Registro não encontrado.");
  
        modalTitle.textContent = "Editar Tarefa";
        modalBody.innerHTML = `
          <label>Atividade</label>
          <input id="modal-field-activity" value="${escapeHtml(data.activity || '')}" />
          <label>Técnico (apenas para exibição)</label>
          <input id="modal-field-techname" value="${escapeHtml(data.technicianName || '')}" disabled />
        `;
        modalContext = { type: 'task', id };
        modal.setAttribute('aria-hidden', 'false');
      };
    });
  }
  
  btnAddTask.addEventListener("click", async () => {
    const activity = (taskActivityInput.value || "").trim();
    if (!activity) { alert("Informe a atividade."); return; }
  
    // selecionar próximos técnicos ATIVO pela ordem (simples: pega todos ATIVO e usa index armazenado)
    const snapTech = await getDocs(query(collection(db, "technicians"), orderBy("order")));
    const activeTechs = [];
    snapTech.forEach(t => { if ((t.data().status||'ATIVO') === 'ATIVO') activeTechs.push(t); });
  
    if (activeTechs.length === 0) { alert("Nenhum técnico ATIVO disponível."); return; }
  
    // aqui uso uma escolha simples: round-robin baseado no timestamp atual modulo length
    // (você pode implementar meta.rotation via documento para transações)
    const idx = (Date.now()) % activeTechs.length;
    const chosen = activeTechs[idx];
  
    const now = new Date();
    await addDoc(collection(db, "tasks"), {
      activity,
      technicianId: chosen.id,
      technicianName: chosen.data().name,
      timestamp: now.toISOString(),
      displayTS: now.toLocaleString()
    });
  
    taskActivityInput.value = "";
    await loadTasks();
  });
  
  /* ---------------------------
     AUSÊNCIAS: CRUD + EDIT
     --------------------------- */
  async function loadAbsences(){
    absenceList.innerHTML = "<div class='muted'>Carregando...</div>";
    const snap = await getDocs(query(collection(db, "absences"), orderBy("start", "desc")));
    absenceList.innerHTML = "";
  
    snap.forEach(d=>{
      const a = d.data();
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="left">
          <div>
            <strong>${escapeHtml(a.tech || '')}</strong>
            <div class="meta">${escapeHtml(a.start||'')} → ${escapeHtml(a.end||'')} — ${escapeHtml(a.reason||'')}</div>
          </div>
        </div>
        <div class="actions">
          <button class="btn-edit-absence" data-id="${d.id}">✏️</button>
          <button class="btn-delete-absence" data-id="${d.id}">🗑️</button>
        </div>
      `;
      absenceList.appendChild(item);
    });
  
    document.querySelectorAll(".btn-delete-absence").forEach(b=>{
      b.onclick = async () => {
        if (!confirm("Excluir ausência?")) return;
        await deleteDoc(doc(db, "absences", b.dataset.id));
        await loadAbsences();
      };
    });
  
    document.querySelectorAll(".btn-edit-absence").forEach(b=>{
      b.onclick = async () => {
        const id = b.dataset.id;
        const snap = await getDocs(collection(db, "absences"));
        let a = null;
        snap.forEach(s => { if (s.id === id) a = s.data(); });
        if (!a) return alert("Registro não encontrado.");
  
        modalTitle.textContent = "Editar Ausência";
        modalBody.innerHTML = `
          <label>Técnico (nome)</label>
          <input id="modal-field-abs-tech" value="${escapeHtml(a.tech||'')}" />
          <label>Início</label>
          <input id="modal-field-abs-start" type="date" value="${escapeHtml(a.start||'')}" />
          <label>Fim</label>
          <input id="modal-field-abs-end" type="date" value="${escapeHtml(a.end||'')}" />
          <label>Motivo</label>
          <input id="modal-field-abs-reason" value="${escapeHtml(a.reason||'')}" />
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
    const snapTech = await getDocs(collection(db, "technicians"));
    let tname = '';
    snapTech.forEach(t => { if (t.id === techId) tname = t.data().name; });
  
    await addDoc(collection(db, "absences"), {
      technicianId: techId,
      tech: tname,
      start,
      end,
      reason,
      createdAt: new Date().toISOString()
    });
  
    // opcional: set status AUSENTE on technician
    await updateDoc(doc(db, "technicians", techId), { status: 'AUSENTE' });
  
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
      const status = document.getElementById("modal-field-status").value;
      await updateDoc(doc(db, "technicians", id), { name, status });
  
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
  