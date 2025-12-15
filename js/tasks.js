import { db, collection, addDoc, doc, getDocs, query, orderBy, limit, startAfter, runTransaction } from "./firebase.js";
import { escapeHtml } from "./utils.js";

let lastTaskDoc = null;
let loadingTasks = false;

const taskList = document.getElementById("task-list");
const inputActivity = document.getElementById("task-activity");
const btnAddTask = document.getElementById("btn-add-task");

const tasksCol = collection(db, "tasks");
const techsCol = collection(db, "technicians");
const absCol = collection(db, "absences");
const metaDocRef = doc(db, "meta", "rotation");

export async function initTasks() {
  btnAddTask.addEventListener("click", addTask);
  await loadTasks(true);
  document.getElementById("load-more-tasks")
  .addEventListener("click", () => loadTasks());
}

async function loadTasksRaw() {
  const q = query(tasksCol, orderBy("timestamp", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function loadTasks(reset = false) {
  if (loadingTasks) return;
  loadingTasks = true;

  if (reset) {
    taskList.innerHTML = "";
    lastTaskDoc = null;
  }

  let q = query(
    tasksCol,
    orderBy("timestamp", "desc"),
    limit(20)
  );

  if (lastTaskDoc) {
    q = query(
      tasksCol,
      orderBy("timestamp", "desc"),
      startAfter(lastTaskDoc),
      limit(20)
    );
  }

  const snap = await getDocs(q);

  if (!snap.empty) {
    lastTaskDoc = snap.docs[snap.docs.length - 1];
  }

  snap.docs.forEach(d => {
    const t = d.data();
    const div = document.createElement("div");
    div.className = "item";
  
    div.innerHTML = `
      <div class="left">
        <strong>${escapeHtml(t.activity)}</strong>
        <span class="meta">${t.technicianName} — ${t.displayTS}</span>
      </div>
      <div class="actions">
        <button class="btn-delete" title="Excluir tarefa">🗑️</button>
      </div>
    `;
  
    div.querySelector(".btn-delete").onclick = async () => {
      if (!confirm("Excluir tarefa?")) return;
      await deleteDoc(doc(db, "tasks", d.id));
      await loadTasks(true);
    };
  
    taskList.appendChild(div);
  });  

  loadingTasks = false;
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
      if (idx !== -1) {
        nextTech = active[(idx + 1) % active.length];
      } else {
        // last está ausente → continuar pela ordem original
        const lastTech = techs.find(t => t.id === lastId);
        if (!lastTech) {
          nextTech = active[0];
        } else {
          const nextByOrder = active.find(t => t.order > lastTech.order);
          nextTech = nextByOrder ?? active[0];
        }
      }
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
  await loadTasks(true);
}
