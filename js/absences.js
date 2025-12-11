import { db, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "./firebase.js";
import { escapeHtml } from "./utils.js";
import { loadTechnicians } from "./technicians.js";

const absenceList = document.getElementById("absence-list");
const selectTech = document.getElementById("absence-tech");
const inputStart = document.getElementById("absence-start");
const inputEnd = document.getElementById("absence-end");
const inputReason = document.getElementById("absence-reason");
const btnAdd = document.getElementById("btn-add-absence");

const absCol = collection(db, "absences");
const techsCol = collection(db, "technicians");

export async function initAbsences() {
  btnAdd.addEventListener("click", addAbsence);
  await loadAbsences();
}

async function loadAbsencesRaw() {
  const q = query(absCol, orderBy("start", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function loadAbsences() {
  const arr = await loadAbsencesRaw();
  absenceList.innerHTML = "";
  arr.forEach(a => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="left">
        <strong>${escapeHtml(a.tech)}</strong>
        <span class="meta">${a.start} → ${a.end} — ${escapeHtml(a.reason || "")}</span>
      </div>
      <div class="actions">
        <button class="btn-delete">🗑️</button>
      </div>
    `;
    div.querySelector(".btn-delete").onclick = async () => {
      await deleteDoc(doc(db, "absences", a.id));
      await loadAbsences();
    };
    absenceList.appendChild(div);
  });
}

async function addAbsence() {
  const techId = selectTech.value;
  const start = inputStart.value;
  const end = inputEnd.value;
  const reason = inputReason.value.trim();

  if (!techId || !start || !end) return alert("Preencha os campos obrigatórios.");

  const techSnap = await getDocs(techsCol);
  const tech = techSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(t => t.id === techId);

  await addDoc(absCol, {
    technicianId: techId,
    tech: tech?.name ?? "",
    start,
    end,
    reason,
    createdAt: new Date().toISOString()
  });
  
  inputStart.value = "";
  inputEnd.value = "";
  inputReason.value = "";
  
  await loadAbsences();
  await loadTechnicians();  // ATUALIZA STATUS NA HORA  
}
