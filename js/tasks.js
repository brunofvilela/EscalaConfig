import { db, collection, addDoc, doc, getDocs, query, orderBy, limit, startAfter, runTransaction, deleteDoc, setDoc, auth } from "/js/firebase.js";
import { escapeHtml } from "/js/utils.js";

let lastTaskDoc = null;
let loadingTasks = false;

const taskList = document.getElementById("task-list");
const inputActivity = document.getElementById("task-activity");

const tasksCol = collection(db, "tasks");
const techsCol = collection(db, "technicians");
const absCol = collection(db, "absences");
const metaDocRef = doc(db, "meta", "rotation");

export async function initTasks() {
  const btnAddTask = document.getElementById("btn-add-task");
  const btnLoadMore = document.getElementById("btn-load-more-tasks");

  if (!btnAddTask || !btnLoadMore) {
    console.warn("⚠️ Botões de tarefa não encontrados");
    return;
  }

  btnAddTask.addEventListener("click", addTask);
  btnLoadMore.addEventListener("click", () => loadTasks());

  // primeira carga
  await loadTasks(true);
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
  
    div.querySelector(".btn-delete").onclick = async () => {
      if (!confirm("Excluir tarefa?")) return;
    
      // 🔑 técnico da tarefa excluída
      const removedTechnicianId = t.technicianId;
    
      // remove a tarefa
      await deleteDoc(doc(db, "tasks", d.id));
    
      // 🔁 "volta" a rotação para esse técnico
      await setDoc(
        doc(db, "meta", "rotation"),
        { forceNextTechnicianId: removedTechnicianId },
        { merge: true }
      );      
    
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
    const data = snap.exists() ? snap.data() : {};
    const forceId = data.forceNextTechnicianId || null;
    const lastId = data.lastTechnicianId || null;

    let nextTech;

    if (forceId) {
      nextTech = active.find(t => t.id === forceId);
    
      // se técnico está ausente ou não existe mais
      if (!nextTech) {
        nextTech = active[0];
      }
    
      // consome o override
      tx.set(
        metaDocRef,
        {
          lastTechnicianId: nextTech.id,
          forceNextTechnicianId: null
        },
        { merge: true }
      );
    
      return nextTech;
    }if (!lastId) {
      nextTech = active[0];
    } else {
      const idx = active.findIndex(t => t.id === lastId);
    
      if (idx !== -1) {
        nextTech = active[(idx + 1) % active.length];
      } else {
        const lastTech = techs.find(t => t.id === lastId);
        const nextByOrder = lastTech
          ? active.find(t => t.order > lastTech.order)
          : null;
        nextTech = nextByOrder ?? active[0];
      }
    }
    
    tx.set(metaDocRef, { lastTechnicianId: nextTech.id }, { merge: true });
    return nextTech;
    
  });

  const now = new Date();
  const user = auth.currentUser;
  if (!user) return alert("Usuário não autenticado.");
  
  await addDoc(tasksCol, {
    activity,
    technicianId: chosen.id,
    technicianName: chosen.name,
    timestamp: now.toISOString(),
    displayTS: now.toLocaleString(),
  
    createdBy: {
      uid: user.uid,
      email: user.email,
      name: user.displayName
    },
    createdAt: new Date().toISOString()
  });
  

  inputActivity.value = "";
  await loadTasks(true);
}
