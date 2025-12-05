// --------------------------------------------------
// Firebase Config (importado via firebase.js)
// --------------------------------------------------
import { 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc 
} from "./firebase.js";

// --------------------------------------------------
// Função: Carregar técnicos
// --------------------------------------------------
async function loadTechnicians() {
    const list = document.getElementById("technicianList");
    if (!list) return;

    list.innerHTML = "<p>Carregando...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "technicians"));

        list.innerHTML = ""; // limpar lista

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();

            const item = document.createElement("div");
            item.className = "tech-item";

            item.innerHTML = `
                <span>${data.name}</span>

                <button class="deleteBtn" data-id="${docSnap.id}">
                    Excluir
                </button>
            `;

            list.appendChild(item);
        });

        // Associar os eventos dos botões de exclusão
        document.querySelectorAll(".deleteBtn").forEach((btn) => {
            btn.onclick = async () => {
                await deleteTechnician(btn.dataset.id);
            };
        });

    } catch (error) {
        console.error("Erro ao carregar técnicos:", error);
        list.innerHTML = "<p>Erro ao carregar dados.</p>";
    }
}

// --------------------------------------------------
// Função: Adicionar técnico
// --------------------------------------------------
async function addTechnician() {
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

    } catch (error) {
        console.error("Erro ao adicionar técnico:", error);
        alert("Erro ao salvar técnico.");
    }
}

// --------------------------------------------------
// Função: Excluir técnico
// --------------------------------------------------
async function deleteTechnician(id) {
    try {
        await deleteDoc(doc(db, "technicians", id));
        loadTechnicians();
    } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir.");
    }
}

// --------------------------------------------------
// Esperar o DOM carregar antes de associar eventos
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

    const btnAddTech = document.getElementById("btnAddTech");
    const btnLoadTech = document.getElementById("btnLoadTech");

    if (btnAddTech) btnAddTech.onclick = addTechnician;
    if (btnLoadTech) btnLoadTech.onclick = loadTechnicians;

    // Carregar lista ao abrir
    loadTechnicians();
});
