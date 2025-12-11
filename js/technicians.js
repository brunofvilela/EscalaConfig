import { db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from "./firebase.js";
import { escapeHtml } from "./utils.js";
import { openModal } from "./modal.js";

const techList = document.getElementById("technician-list");
const nameInput = document.getElementById("tech-name");
const orderInput = document.getElementById("tech-order");
const btnAdd = document.getElementById("btn-add-tech");
const selectAbsTech = document.getElementById("absence-tech");

const techsCol = collection(db, "technicians");

export async function initTechnicians() {
  btnAdd.addEventListener("click", async () => {
    openModal({
      title: "Adicionar Técnico",
      bodyHTML: `
        <label>Nome</label>
        <input id="modal-name">
        <label>Ordem</label>
        <input id="modal-order" type="number">
      `,
      onSave: async () => {
        const name = document.getElementById("modal-name").value.trim();
        let order = Number(document.getElementById("modal-order").value);
        if (!name) return alert("Nome obrigatório.");
        const techs = await loadTechniciansRaw();
        if (!order) order = techs.length + 1;
        await addDoc(techsCol, { name, order });
        await loadTechnicians();
      }
    });
  });

  await loadTechnicians();
}

export async function loadTechniciansRaw() {
  const q = query(techsCol, orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function loadTechnicians() {
  const techs = await loadTechniciansRaw();

  // Atualiza select da aba ausências
  selectAbsTech.innerHTML = "";
  techs.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    selectAbsTech.appendChild(opt);
  });

  techList.innerHTML = "";
  techs.forEach(t => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="left">
        <strong>${escapeHtml(t.name)}</strong>
        <span class="meta">Ordem: ${t.order}</span>
      </div>
      <div class="actions">
        <button class="btn-edit">✏️</button>
        <button class="btn-delete">🗑️</button>
      </div>
    `;

    div.querySelector(".btn-delete").onclick = async () => {
      if (!confirm("Excluir técnico?")) return;
      await deleteDoc(doc(db, "technicians", t.id));
      await loadTechnicians();
    };

    div.querySelector(".btn-edit").onclick = () => openModal({
      title: "Editar Técnico",
      bodyHTML: `
        <label>Nome</label>
        <input id="modal-name" value="${escapeHtml(t.name)}">
        <label>Ordem</label>
        <input id="modal-order" type="number" value="${t.order}">
      `,
      onSave: async () => {
        const name = document.getElementById("modal-name").value.trim();
        const order = Number(document.getElementById("modal-order").value);
        await updateDoc(doc(db, "technicians", t.id), { name, order });
        await loadTechnicians();
      }
    });

    techList.appendChild(div);
  });
}
