import { db, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit, runTransaction } from "./firebase.js";
import { escapeHtml, todayISO } from "./utils.js";
import { openModal } from "./modal.js";

const taskListContainer = document.getElementById("tab-tarefas");
const taskInput = document.createElement("input");
taskInput.placeholder = "Descrição da atividade";
const btnAddTask = document.createElement("button");
btnAddTask.className = "primary";
btnAddTask.textContent = "Incluir Tarefa";

taskListContainer.append(taskInput, btnAddTask);

const tasksCol = collection(db, "tasks");
const techsCol = collection(db, "technicians");
const metaDocRef = doc(db, "meta", "rotation");

export async function initTasks() {
  btnAddTask.addEventListener("click", addTask);
  await renderTasks();
}

export async function loadTasksRaw(limitN = 50) {
  const q = query(tasksCol, orderBy("timestamp", "desc"), limit(limitN));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function renderTasks() {
  const tasks = await loadTasksRaw(50);
  taskListContainer.querySelectorAll(".task-item")?.forEach(el => el.remove());

  for (const t of tasks) {
    const div = document.createElement("div");
    div.className = "task-item item";
    div.innerHTML = `
      <div class="left">
        <div><strong>${escapeHtml(t.activity)}</strong></div>
        <div class="meta">${escapeHtml(t.technicianName || '')} — ${escapeHtml(t.displayTS || t.timestamp)}</div>
      </div>
      <div class="actions">
        <button class="btn-delete-task">🗑️</button>
      </div>
    `;
    const delBtn = div.querySelector(".btn-delete-task");
    delBtn.onclick = async () => {
      if (!confirm("Excluir tarefa?")) return;
      await deleteDoc(doc(db, "tasks", t.id));
      await renderTasks();
    };
    taskListContainer.appendChild(div);
  }
}

async function addTask() {
  const activity = (taskInput.value || "").trim();
  if (!activity) return alert("Digite a atividade.");

  // carregar técnicos ativos
  const techsSnap = await getDocs(techsCol);
  const techs = techsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const today = todayISO();
  const activeTechs = techs.filter(t => !t.absent); // simplificação

  if (activeTechs.length === 0) return alert("Nenhum técnico ativo hoje.");

  const chosenIdx = await runTransaction(db, async tx => {
    const metaSnap = await tx.get(metaDocRef);
    let idx = -1;
    if (metaSnap.exists()) {
      const data = metaSnap.data();
      idx = typeof data.tecnicoIndex === "number" ? data.tecnicoIndex : -1;
    }
    const nextIdx = (idx + 1) % activeTechs.length;
    tx.update(metaDocRef, { tecnicoIndex: nextIdx });
    return nextIdx;
  });

  const chosen = activeTechs[chosenIdx];
  const now = new Date();
  await addDoc(tasksCol, {
    activity,
    technicianId: chosen.id,
    technicianName: chosen.name,
    timestamp: now.toISOString(),
    displayTS: now.toLocaleString()
  });
  taskInput.value = "";
  await renderTasks();
}
