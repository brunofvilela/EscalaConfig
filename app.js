import { db, collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "./firebase.js";

// ==== TABS ====
document.querySelectorAll(".tabBtn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.getElementById(btn.dataset.tab).classList.add("active");
    };
});

// ==== LOAD TECHNICIANS ====
async function loadTechnicians() {
    const container = document.getElementById("technicianList");
    const absenceTech = document.getElementById("absenceTech");
    container.innerHTML = "<p>Carregando...</p>";
    absenceTech.innerHTML = "";

    const snap = await getDocs(collection(db, "technicians"));
    container.innerHTML = "";

    snap.forEach(d => {
        const data = d.data();
        const div = document.createElement("div");
        div.className = "tech-item";
        div.innerHTML = `
            <span>${data.name} (${data.status})</span>
            <button data-id="${d.id}" class="delTech">Excluir</button>
        `;
        container.appendChild(div);

        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = data.name;
        absenceTech.appendChild(opt);
    });

    document.querySelectorAll(".delTech").forEach(btn => {
        btn.onclick = async () => {
            await deleteDoc(doc(db, "technicians", btn.dataset.id));
            loadTechnicians();
        };
    });
}

// ==== ADD TECHNICIAN ====
async function addTech() {
    const name = document.getElementById("techName").value.trim();
    if (!name) return alert("Informe um nome.");

    await addDoc(collection(db, "technicians"), {
        name,
        status: "ATIVO",
    });

    document.getElementById("techName").value = "";
    loadTechnicians();
}

// ==== LOAD TASKS ====
async function loadTasks() {
    const container = document.getElementById("taskList");
    container.innerHTML = "<p>Carregando...</p>";

    const snap = await getDocs(collection(db, "tasks"));
    container.innerHTML = "";

    snap.forEach(d => {
        const data = d.data();
        const item = document.createElement("div");
        item.className = "task-item";
        item.innerHTML = `
            <span>${data.tech} — ${data.activity} — ${data.date}</span>
            <button class="delTask" data-id="${d.id}">Excluir</button>
        `;
        container.appendChild(item);
    });

    document.querySelectorAll(".delTask").forEach(btn => {
        btn.onclick = async () => {
            await deleteDoc(doc(db, "tasks", btn.dataset.id));
            loadTasks();
        };
    });
}

// ==== ADD TASK ====
async function addTask() {
    const activity = document.getElementById("taskName").value.trim();
    if (!activity) return alert("Digite uma atividade.");

    // pega primeiro técnico ativo
    const snap = await getDocs(collection(db, "technicians"));
    const ativos = [];
    snap.forEach(t => { if (t.data().status === "ATIVO") ativos.push(t); });

    if (!ativos.length) return alert("Nenhum técnico ativo disponível.");

    const tech = ativos[Math.floor(Math.random() * ativos.length)].data().name;

    await addDoc(collection(db, "tasks"), {
        tech,
        activity,
        date: new Date().toLocaleString(),
    });

    document.getElementById("taskName").value = "";
    loadTasks();
}

// ==== LOAD ABSENCES ====
async function loadAbsences() {
    const container = document.getElementById("absenceList");
    container.innerHTML = "<p>Carregando...</p>";

    const snap = await getDocs(collection(db, "absences"));
    container.innerHTML = "";

    snap.forEach(d => {
        const data = d.data();
        const div = document.createElement("div");
        div.className = "absence-item";
        div.innerHTML = `
            <span>${data.tech} — ${data.start} até ${data.end} — ${data.reason}</span>
            <button data-id="${d.id}" class="delAbs">Excluir</button>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll(".delAbs").forEach(btn => {
        btn.onclick = async () => {
            await deleteDoc(doc(db, "absences", btn.dataset.id));
            loadAbsences();
        };
    });
}

// ==== ADD ABSENCE ====
async function addAbsence() {
    const techId = document.getElementById("absenceTech").value;
    const start = document.getElementById("absenceStart").value;
    const end = document.getElementById("absenceEnd").value;
    const reason = document.getElementById("absenceReason").value;

    if (!start || !end) return alert("Datas obrigatórias.");

    const techDoc = await getDocs(collection(db, "technicians"));
    let techName = "";
    techDoc.forEach(t => { if (t.id === techId) techName = t.data().name; });

    await addDoc(collection(db, "absences"), {
        tech: techName,
        start,
        end,
        reason,
    });

    loadAbsences();
    loadTechnicians();
}

// ==== EVENTOS ====
document.getElementById("btnAddTech").onclick = addTech;
document.getElementById("btnAddTask").onclick = addTask;
document.getElementById("btnAddAbsence").onclick = addAbsence;

loadTechnicians();
loadTasks();
loadAbsences();