import {
  db,
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  deleteDoc,
  setDoc,
  auth,
  onSnapshot
} from "/js/firebase.js";

import { escapeHtml, showNoPermission } from "/js/utils.js";
import { isSyonetUser } from "/js/authz.js";

const taskList = document.getElementById("task-list");
const inputActivity = document.getElementById("task-activity");
const btnLoadMore = document.getElementById("btn-load-more-tasks");

const tasksCol = collection(db, "tasks");
const techsCol = collection(db, "technicians");
const absCol = collection(db, "absences");
const metaDocRef = doc(db, "meta", "rotation");

let lastVisible = null;
let unsubscribeRealtime = null;

/* =========================
   INIT
========================= */
export function initTasks() {
  const btnAddTask = document.getElementById("btn-add-task");
  const user = auth.currentUser;

  if (btnAddTask) {
    btnAddTask.onclick = isSyonetUser(user)
      ? addTask
      : () =>
          showNoPermission(
            "Você não tem permissão para incluir tarefas. Apenas usuários @syonet.com."
          );
  }

  if (btnLoadMore) {
    btnLoadMore.onclick = loadMoreTasks;
  }

  listenRecentTasks();
}

/* =========================
   REALTIME (RECENTES)
========================= */
function listenRecentTasks() {
  if (unsubscribeRealtime) unsubscribeRealtime();

  const q = query(
    tasksCol,
    orderBy("timestamp", "desc"),
    limit(20)
  );

  unsubscribeRealtime = onSnapshot(q, snap => {
    taskList.innerHTML = "";

    if (!snap.empty) {
      lastVisible = snap.docs[snap.docs.length - 1];
    }

    snap.docs.forEach(renderTask);
  });
}

/* =========================
   LOAD MORE (PAGINAÇÃO)
========================= */
async function loadMoreTasks() {
  if (!lastVisible) return;

  const q = query(
    tasksCol,
    orderBy("timestamp", "desc"),
    startAfter(lastVisible),
    limit(20)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    btnLoadMore.disabled = true;
    btnLoadMore.textContent = "Não há mais tarefas";
    return;
  }

  lastVisible = snap.docs[snap.docs.length - 1];
  snap.docs.forEach(renderTask);
}

/* =========================
   RENDER
========================= */
function renderTask(d) {
  const t = d.data();
  const div = document.createElement("div");
  div.className = "item";

  div.innerHTML = `
    <div class="left">
      <strong>${escapeHtml(t.activity)}</strong>
      <span class="meta">
        ${t.technicianName} — ${t.displayTS}<br>
        <small class="created-by">
          Adicionado por: ${escapeHtml(t.createdBy?.name ?? "—")}
        </small>
      </span>
    </div>
    <div class="actions">
      <button class="btn-delete" title="Excluir tarefa">🗑️</button>
    </div>
  `;

  const btnDelete = div.querySelector(".btn-delete");
  btnDelete.onclick = () => deleteTask(d.id, t.technicianId);

  taskList.appendChild(div);
}

/* =========================
   DELETE TASK
========================= */
async function deleteTask(taskId, technicianId) {
  const user = auth.currentUser;

  if (!isSyonetUser(user)) {
    showNoPermission(
      "Você não tem permissão para excluir tarefas. Apenas usuários @syonet.com."
    );
    return;
  }

  if (!confirm("Excluir tarefa?")) return;

  await deleteDoc(doc(db, "tasks", taskId));

  // 🔑 apenas registra quem foi o último técnico
  await setDoc(
    metaDocRef,
    { preferredTechnicianId: technicianId },
    { merge: true }
  );
}

/* =========================
   ADD TASK (ROTAÇÃO CORRETA)
========================= */
async function addTask() {
  const user = auth.currentUser;

  if (!isSyonetUser(user)) {
    showNoPermission(
      "Você não tem permissão para incluir tarefas. Apenas usuários @syonet.com."
    );
    return;
  }

  const activity = inputActivity.value.trim();
  if (!activity) return alert("Digite a atividade.");

  const techSnap = await getDocs(techsCol);
  const techs = techSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const absSnap = await getDocs(absCol);
  const absences = absSnap.docs.map(d => d.data());

  const hoje = new Date().toISOString().slice(0, 10);

  const active = techs
    .filter(t =>
      !absences.some(
        a =>
          a.technicianId === t.id &&
          a.start <= hoje &&
          a.end >= hoje
      )
    )
    .sort((a, b) => a.order - b.order);

  if (!active.length) {
    alert("Nenhum técnico ATIVO disponível.");
    return;
  }

  const chosen = await runTransaction(db, async tx => {
    const snap = await tx.get(metaDocRef);
    const data = snap.exists() ? snap.data() : {};
    const preferredId = data.preferredTechnicianId || null;
const lastId = data.lastTechnicianId || null;

let next;

// 🔁 prioridade: repetir técnico excluído (se ainda ativo)
if (preferredId) {
  const preferred = active.find(t => t.id === preferredId);

  if (preferred) {
    next = preferred;

    tx.set(
      metaDocRef,
      {
        lastTechnicianId: preferred.id,
        preferredTechnicianId: null
      },
      { merge: true }
    );

    return next;
  }
}

// 🔄 fallback: rotação normal por ordem
if (!lastId) {
  next = active[0];
} else {
  const lastOrder =
    techs.find(t => t.id === lastId)?.order ?? -1;

  const nextByOrder = active.find(t => t.order > lastOrder);
  next = nextByOrder ?? active[0];
}

tx.set(
  metaDocRef,
  { lastTechnicianId: next.id },
  { merge: true }
);

return next;


    tx.set(metaDocRef, { lastTechnicianId: next.id }, { merge: true });
    return next;
  });

  await addDoc(tasksCol, {
    activity,
    technicianId: chosen.id,
    technicianName: chosen.name,
    timestamp: new Date().toISOString(),
    displayTS: new Date().toLocaleString(),
    createdBy: {
      uid: user.uid,
      email: user.email,
      name: user.displayName
    },
    createdAt: new Date().toISOString()
  });

  inputActivity.value = "";
}
