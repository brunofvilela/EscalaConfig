import { 
  db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy 
} from "./firebase.js";
import { escapeHtml } from "./utils.js";

const techList = document.getElementById("technician-list");
const nameInput = document.getElementById("tech-name");
const btnAdd = document.getElementById("btn-add-tech");
const selectAbsTech = document.getElementById("absence-tech");

const techsCol = collection(db, "technicians");

export async function initTechnicians() {
  btnAdd.addEventListener("click", addTechnician);

  await loadTechnicians();
}

async function addTechnician() {
  const name = nameInput.value.trim();
  if (!name) return alert("Digite o nome do técnico.");

  const techs = await loadTechniciansRaw();

  const nextOrder =
    techs.length === 0
      ? 1
      : Math.max(...techs.map(t => Number(t.order))) + 1;

  await addDoc(techsCol, {
    name,
    order: nextOrder
  });

  nameInput.value = "";
  await loadTechnicians();
}

export async function loadTechniciansRaw() {
  const q = query(techsCol, orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

async function loadTechnicians() {
  const techs = await loadTechniciansRaw();

  // atualizar select da aba ausências
  selectAbsTech.innerHTML = "";
  techs.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    selectAbsTech.appendChild(opt);
  });

  // renderizar lista
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

    // excluir
    div.querySelector(".btn-delete").onclick = async () => {
      if (!confirm("Excluir técnico?")) return;
      await deleteDoc(doc(db, "technicians", t.id));
      await loadTechnicians();
    };

    // editar nome (inline)
    div.querySelector(".btn-edit").onclick = async () => {
      const novoNome = prompt("Novo nome do técnico:", t.name);
      if (!novoNome) return;

      await updateDoc(doc(db, "technicians", t.id), {
        name: novoNome.trim()
      });

      await loadTechnicians();
    };

    techList.appendChild(div);
  });
}
