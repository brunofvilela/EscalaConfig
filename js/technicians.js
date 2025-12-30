import { 
  auth , db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy 
} from "/js/firebase.js";
import { escapeHtml, showNoPermission } from "/js/utils.js";
import { isAdmin } from "/js/authz.js";

const techList = document.getElementById("technician-list");
const nameInput = document.getElementById("tech-name");
const btnAdd = document.getElementById("btn-add-tech");
const selectAbsTech = document.getElementById("absence-tech");

const techsCol = collection(db, "technicians");
const absCol = collection(db, "absences");

export async function initTechnicians() {
  const btnAddTech = document.getElementById("btn-add-tech");
  const user = auth.currentUser;

  if (btnAddTech && !isAdmin(user)) {
    btnAddTech.onclick = () => {
      showNoPermission("Você não tem permissão para incluir técnicos. Apenas usuários de coordenadores.");
    };
  }

  if (btnAddTech && isAdmin(user)) {
    btnAddTech.addEventListener("click", addTechnician);
  }

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

async function loadAbsencesRaw() {
  const q = query(absCol, orderBy("start", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function loadTechnicians() {
  const techs = await loadTechniciansRaw();
  const abs = await loadAbsencesRaw();

  const hoje = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

  // Atualizar dropdown da aba ausência
  selectAbsTech.innerHTML = "";
  techs.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    selectAbsTech.appendChild(opt);
  });

  // Renderizar tecnicos (em ordem alfabética)
  techList.innerHTML = "";
  techs
    .sort((a, b) =>
      a.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .localeCompare(
          b.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        )
    )
    .forEach(t => {
      // Verificar se técnico está ausente hoje
      const estaAusente = abs.some(a =>
        a.technicianId === t.id &&
        a.start <= hoje &&
        a.end >= hoje
      );

      const statusLabel = estaAusente ? "AUSENTE" : "ATIVO";
      const statusClass = estaAusente ? "badge-ausente" : "badge-ativo";

      const div = document.createElement("div");
      div.className = "item";

      div.innerHTML = `
        <div class="left">
          <div>
            <strong>${escapeHtml(t.name)}</strong>
            <div class="meta">Ordem: ${t.order}</div>
            <div class="badge ${statusClass}">${statusLabel}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn-edit">✏️</button>
          <button class="btn-delete">🗑️</button>
        </div>
      `;


        // Excluir técnico (somente admin)
        const btnDelete = div.querySelector(".btn-delete");

        if (isAdmin(auth.currentUser)) {
          btnDelete.onclick = async () => {
            if (!confirm("Excluir técnico?")) return;

            await deleteDoc(doc(db, "technicians", t.id));

            // Reordenar técnicos > ordem removida
            const allTechs = await loadTechniciansRaw();
            const toUpdate = allTechs.filter(x => x.order > t.order);

            for (const tech of toUpdate) {
              await updateDoc(doc(db, "technicians", tech.id), {
                order: tech.order - 1
              });
            }

            await loadTechnicians();
          };
        } else {
          btnDelete.onclick = () => {
            showNoPermission("Você não tem permissão para excluir técnicos. Apenas usuários de coordenadores.");
          };
        }


      // Editar nome
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
export { loadTechnicians };
