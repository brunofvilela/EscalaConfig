import { db, collection, addDoc, getDocs, query, orderBy, limit, startAfter } from "./firebase.js";
import { escapeHtml } from "./utils.js";
import { loadTechnicians } from "./technicians.js";

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
  btnAdd.addEventListener("click", addAbsence);
  await loadAbsences(true);
  document.getElementById("load-more-absences")
  .addEventListener("click", () => loadAbsences());
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
    const a = d.data();
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${a.tech}</strong>
      <span class="meta">${a.start} → ${a.end}</span>
    `;
    absenceList.appendChild(div);
  });

  loadingAbs = false;
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
  
  await loadAbsences(true);
  await loadTechnicians();  // ATUALIZA STATUS NA HORA  
}
