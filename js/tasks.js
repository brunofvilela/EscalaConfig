import { db, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit, runTransaction } from "./firebase.js";
import { escapeHtml, todayISO } from "./utils.js";

const taskList = document.getElementById("task-list");
const inputActivity = document.getElementById("task-activity");
const btnAddTask = document.getElementById("btn-add-task");

const tasksCol = collection(db, "tasks");
const techsCol = collection(db, "technicians");
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
        <button class="btn-delete" data-id="${t.id}">🗑️</button>
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

  const techSnap = await getDocs(techsCol);
  const techs = techSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const active = techs.sort((a, b) => a.order - b.order);

  if (!active.length) return alert("Nenhum técnico disponível.");

  const chosenIdx = await runTransaction(db, async tx => {
    const snap = await tx.get(metaDocRef);
    let idx = snap.exists() ? snap.data().tecnicoIndex ?? -1 : -1;
    idx = (idx + 1) % active.length;
    tx.set(metaDocRef, { tecnicoIndex: idx });
    return idx;
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

  inputActivity.value = "";
  await loadTasks();
}
