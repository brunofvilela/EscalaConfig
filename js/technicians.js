import { db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from "./firebase.js";
import { escapeHtml, todayISO } from "./utils.js";
import { openModal, modalContext } from "./modal.js";

const technicianList = document.getElementById("tab-tecnicos");
const btnAddTech = document.createElement("button");
btnAddTech.className = "primary";
btnAddTech.textContent = "Adicionar Técnico";
technicianList.appendChild(btnAddTech);

const techsCol = collection(db, "technicians");
let absenceList = []; // será populado via initAbsences se necessário

export async function loadTechniciansRaw() {
  const q = query(techsCol, orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function initTechnicians() {
  btnAddTech.addEventListener("click", async () => {
    const nextOrder = (await loadTechniciansRaw()).length + 1;
    openModal("tech-add", { nextOrder, onSave: async () => await addTechnician() });
  });

  await renderTechnicians();
}

async function renderTechnicians() {
  const techs = await loadTechniciansRaw();
  technicianList.innerHTML = "";
  technicianList.appendChild(btnAddTech);

  for (const t of techs) {
    const card = document.createElement("div");
    card.className = "technician-card";
    card.innerHTML = `
      <div class="tech-info">
        <div class="tech-name">${escapeHtml(t.name)}</div>
        <div class="meta">Ordem: ${t.order}</div>
      </div>
      <div class="actions">
        <button class="btn-edit">✏️</button>
        <button class="btn-delete">🗑️</button>
      </div>
    `;
    const editBtn = card.querySelector(".btn-edit");
    const delBtn = card.querySelector(".btn-delete");

    editBtn.onclick = () => openModal("tech-edit", { tech: t, onSave: async () => await editTechnician(t) });
    delBtn.onclick = () => deleteTechnician(t);

    technicianList.appendChild(card);
  }
}

async function addTechnician() {
  const name = prompt("Nome do técnico:");
  if (!name) return alert("Nome obrigatório.");
  const techs = await loadTechniciansRaw();
  const order = techs.length + 1;
  await addDoc(techsCol, { name, order });
  await renderTechnicians();
}

async function editTechnician(t) {
  const name = prompt("Editar nome:", t.name);
  if (!name) return alert("Nome obrigatório.");
  await updateDoc(doc(db, "technicians", t.id), { name });
  await renderTechnicians();
}

async function deleteTechnician(t) {
  if (!confirm(`Excluir técnico ${t.name}?`)) return;
  await deleteDoc(doc(db, "technicians", t.id));
  await renderTechnicians();
}
