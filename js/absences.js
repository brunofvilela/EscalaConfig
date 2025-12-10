import { db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from "./firebase.js";
import { escapeHtml } from "./utils.js";

const absenceContainer = document.getElementById("tab-ausencias");
const absencesCol = collection(db, "absences");

export async function initAbsences() {
  await renderAbsences();
}

export async function loadAbsencesRaw() {
  const q = query(absencesCol, orderBy("start", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function renderAbsences() {
  const absences = await loadAbsencesRaw();
  absenceContainer.innerHTML = "";
  for (const a of absences) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="left">
        <div><strong>${escapeHtml(a.tech)}</strong></div>
        <div class="meta">${escapeHtml(a.start)} → ${escapeHtml(a.end)} — ${escapeHtml(a.reason)}</div>
      </div>
      <div class="actions">
        <button class="btn-delete-absence">🗑️</button>
      </div>
    `;
    const delBtn = div.querySelector(".btn-delete-absence");
    delBtn.onclick = async () => {
      if (!confirm("Excluir ausência?")) return;
      await deleteDoc(doc(db, "absences", a.id));
      await renderAbsences();
    };
    absenceContainer.appendChild(div);
  }
}

export async function addAbsence(techId, techName, start, end, reason = "") {
  await addDoc(absencesCol, {
    technicianId: techId,
    tech: techName,
    start,
    end,
    reason,
    createdAt: new Date().toISOString()
  });
  await renderAbsences();
}
