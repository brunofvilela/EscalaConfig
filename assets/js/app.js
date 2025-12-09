import { 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc 
} from "./firebase.js";

async function loadTechnicians() {
    const list = document.getElementById("technicianList");
    if (!list) return;

    list.innerHTML = "<p>Carregando...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "technicians"));

        list.innerHTML = "";

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();

            const item = document.createElement("div");
            item.className = "tech-item";
            item.innerHTML = `
                <span>${data.name}</span>
                <button class="deleteBtn" data-id="${docSnap.id}">Excluir</button>
            `;

            list.appendChild(item);
        });

        document.querySelectorAll(".deleteBtn").forEach((btn) => {
            btn.onclick = async () => {
                await deleteTech(btn.dataset.id);
            };
        });

    } catch (err) {
        list.innerHTML = "<p>Erro ao carregar técnicos.</p>";
        console.error(err);
    }
}

async function addTech() {
    const input = document.getElementById("techName");
    if (!input) return;

    const name = input.value.trim();
    if (!name) {
        alert("Digite um nome.");
        return;
    }

    try {
        await addDoc(collection(db, "technicians"), {
            name,
            status: "active",
            order: Date.now()
        });

        input.value = "";
        loadTechnicians();

    } catch (err) {
        console.error(err);
    }
}

async function deleteTech(id) {
    try {
        await deleteDoc(doc(db, "technicians", id));
        loadTechnicians();
    } catch (err) {
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const addBtn = document.getElementById("btnAddTech");
    const loadBtn = document.getElementById("btnLoadTech");

    if (addBtn) addBtn.onclick = addTech;
    if (loadBtn) loadBtn.onclick = loadTechnicians;

    loadTechnicians();
});