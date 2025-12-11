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

  // carregar técnicos
  const techSnap = await getDocs(techsCol);
  const techs = techSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const active = techs.sort((a, b) => a.order - b.order);

  // carregar ausências
  const hoje = new Date().toISOString().slice(0, 10);
  const absSnap = await getDocs(collection(db, "absences"));
  const ausentes = absSnap.docs.map(d => ({ id: d.data().technicianId, ...d.data() }));

  // filtrar técnicos disponíveis
  const ativos = active.filter(t =>
    !ausentes.some(a => 
      a.technicianId === t.id &&
      a.start <= hoje &&
      a.end >= hoje
    )
  );

  if (ativos.length === 0) {
    return alert("Nenhum técnico ativo disponível para receber tarefas.");
  }

  // rotacionar entre os técnicos ATIVOS
  const chosenIdx = await runTransaction(db, async tx => {
    const snap = await tx.get(metaDocRef);
    let idx = snap.exists() ? snap.data().tecnicoIndex ?? -1 : -1;
    idx = (idx + 1) % ativos.length;
    tx.set(metaDocRef, { tecnicoIndex: idx });
    return idx;
  });

  const chosen = ativos[chosenIdx];

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

