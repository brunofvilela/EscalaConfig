import {
  db,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  runTransaction
} from "./firebase.js";
import { escapeHtml } from "./utils.js";

const taskList = document.getElementById("task-list");
const inputActivity = document.getElementById("task-activity");
const btnAddTask = document.getElementById("btn-add-task");

const tasksCol = collection(db, "tasks");
const techsCol = collection(db, "technicians");
const absCol = collection(db, "absences");
const metaDocRef = doc(db, "meta", "rotation");

export async function initTasks() {
  btnAddTask.addEventListener("click", addTask);
  await loadTasks();
}

async function loadTasksRaw() {
  const q = query(tasksCol, orderBy("timestamp", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function loadTasks() {
  const arr = await loadTasksRaw();
  taskList.innerHTML = "";

  arr.forEach(t => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="left">
        <strong>${escapeHtml(t.activity)}</strong>
        <span class="meta">${t.technicianName} — ${t.displayTS}</span>
      </div>
      <div class="actions">
        <button class="btn-delete">🗑️</button>
      </div>
    `;

    div.querySelector(".btn-delete").onclick = async () => {
      await deleteDoc(doc(db, "tasks", t.id));
      await loadTasks();
    };

    taskList.appendChild(div);
  });
}

async function addTask() {
  const activity = inputActivity.value.trim();
  if (!activity) return alert("Digite a atividade.");

  // carregar técnicos
  const techSnap = await getDocs(techsCol);
  const techs = techSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // carregar ausências
  const absSnap = await getDocs(absCol);
  const absences = absSnap.docs.map(d => d.data());

  const hoje = new Date().toISOString().slice(0, 10);

  // técnicos ATIVOS ordenados
  const active = techs
    .filter(t =>
      !absences.some(a =>
        a.technicianId === t.id &&
        a.start <= hoje &&
        a.end >= hoje
      )
    )
    .sort((a, b) => a.order - b.order);

  if (active.length === 0) {
    return alert("Nenhum técnico ATIVO disponível.");
  }

  // 🔁 ROTATION ROBUSTA (por ID, não por índice)
  const chosen = await runTransaction(db, async (tx) => {
    const snap = await tx.get(metaDocRef);
    const lastId = snap.exists() ? snap.data().lastTechnicianId : null;

    let nextTech;

    if (!lastId) {
      nextTech = active[0];
    } else {
      const idx = active.findIndex(t => t.id === lastId);
      nextTech =
        idx === -1
          ? active[0]
          : active[(idx + 1) % active.length];
    }

    tx.set(metaDocRef, { lastTechnicianId: nextTech.id });
    return nextTech;
  });

  const now = new Date();
  await addDoc(tasksCol, {
    activity,
    technicianId: chosen.id,
    technicianName: chosen.name,
    timestamp: now.toISOString(),
    displayTS: now.toLocaleString()
  });

  inputActivity.value = "";
  await loadTasks();
}
