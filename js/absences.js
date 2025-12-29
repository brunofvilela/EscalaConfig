import { db, collection, addDoc, getDocs, query, orderBy, limit, startAfter, deleteDoc, doc , auth} from "/js/firebase.js";
import { escapeHtml } from "/js/utils.js";
import { loadTechnicians } from "/js/technicians.js";
import { isAdmin } from "/js/authz.js";

const absenceList = document.getElementById("absence-list");
const selectTech = document.getElementById("absence-tech");
const inputStart = document.getElementById("absence-start");
const inputEnd = document.getElementById("absence-end");
const inputReason = document.getElementById("absence-reason");
const btnAdd = document.getElementById("btn-add-absence");

let lastAbsDoc = null;
let loadingAbs = false;

const absCol = collection(db, "absences");
const techsCol = collection(db, "technicians");

export async function initAbsences() {
  const btnAddAbsence = document.getElementById("btn-add-absence");
  const user = auth.currentUser;

  // 🔐 Permissão SOMENTE para ação
  if (btnAddAbsence && !isAdmin(user)) {
    btnAddAbsence.disabled = true;
  }

  // ⚠️ NÃO interrompa a função
  if (btnAddAbsence && isAdmin(user)) {
    btnAddAbsence.addEventListener("click", handleAdd);
  }

  // 👀 Lista SEMPRE carrega
  await loadAbsences();
}

if (!isAdmin(user)) {
  btnAddAbsence.onclick = () => {
    showNoPermission("Você não tem permissão para registrar ausências.");
  };
} else {
  btnAddAbsence.addEventListener("click", handleAdd);
}


async function handleAdd() {
  const absenceTechSelect = document.getElementById("absence-tech");
  const absenceStartInput = document.getElementById("absence-start");
  const absenceEndInput = document.getElementById("absence-end");
  const absenceReasonInput = document.getElementById("absence-reason");

  const techId = absenceTechSelect.value;
  const start = absenceStartInput.value;
  const end = absenceEndInput.value;
  const reason = (absenceReasonInput.value || "").trim();
  const snap = await getDocs(collection(db, "absences"));
  const existentes = snap.docs.map(d => d.data());

  const conflito = existentes.some(a =>
    a.technicianId === techId &&
    !(end < a.start || start > a.end)
  );

  if (conflito) {
    alert("Este técnico já possui uma ausência nesse período.");
    return;
  }

  if (!techId || !start || !end) {
    alert("Preencha técnico, data inicial e data final.");
    return;
  }

  const techSnap = await getDocs(collection(db, "technicians"));
  const techs = techSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const tech = techs.find(t => t.id === techId);

  if (!tech) {
    alert("Técnico não encontrado.");
    return;
  }

  const user = auth.currentUser;
  if (!user) return alert("Usuário não autenticado.");
  
  await addDoc(collection(db, "absences"), {
    technicianId: techId,
    technicianName: tech.name,
    start,
    end,
    reason,
  
    createdBy: {
      uid: user.uid,
      email: user.email,
      name: user.displayName
    },
    createdAt: new Date().toISOString()
  });
  

  absenceStartInput.value = "";
  absenceEndInput.value = "";
  absenceReasonInput.value = "";

  await loadAbsences(true);
  await loadTechnicians();
}

async function loadAbsencesRaw() {
  const q = query(absCol, orderBy("start", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function loadAbsences(reset = false) {
  if (loadingAbs) return;
  loadingAbs = true;

  if (reset) {
    absenceList.innerHTML = "";
    lastAbsDoc = null;
  }

  let q = query(
    absCol,
    orderBy("start", "desc"),
    limit(20)
  );

  if (lastAbsDoc) {
    q = query(
      absCol,
      orderBy("start", "desc"),
      startAfter(lastAbsDoc),
      limit(20)
    );
  }

  const snap = await getDocs(q);

  if (!snap.empty) {
    lastAbsDoc = snap.docs[snap.docs.length - 1];
  }

  snap.docs.forEach(d => {
    const a = { id: d.id, ...d.data() };
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
  <div class="left">
    <strong>${escapeHtml(a.technicianName)}</strong>

    <span class="meta">
      ${a.start} → ${a.end}
      ${a.reason ? `— ${escapeHtml(a.reason)}` : ""}
      <br>
      <small class="created-by">
        Adicionado por: ${escapeHtml(a.createdBy?.name ?? "—")}
      </small>
    </span>
  </div>

  <div class="actions">
    <button class="btn-delete" title="Excluir ausência">🗑️</button>
  </div>
`;

    
    const btnDelete = div.querySelector(".btn-delete");

    if (isAdmin(auth.currentUser)) {
      btnDelete.onclick = async () => {
        if (!confirm("Excluir ausência?")) return;
    
        await deleteDoc(doc(db, "absences", a.id));
        await loadAbsences(true);
        await loadTechnicians();
      };
    } else {
      btnDelete.onclick = () => {
        showNoPermission("Você não tem permissão para excluir ausências.");
      };
    }
        
    absenceList.appendChild(div);
  });

  loadingAbs = false;
}
