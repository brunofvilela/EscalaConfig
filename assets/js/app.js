console.log("App carregado");

// Status
const statusApp = document.getElementById('statusApp');

async function carregarTudo(){
    statusApp.innerText = "Carregando...";
    await renderTecnicos();
    await renderUltimasTarefas();
    statusApp.innerText = "Pronto";
}

async function renderTecnicos(){
    const snap = await db.collection('technicians').orderBy('order').get();
    const div = document.getElementById('listaTecnicos');
    const sel = document.getElementById('selTec');
    div.innerHTML = "";
    sel.innerHTML = "";

    snap.forEach(doc=>{
        const d = doc.data();
        div.innerHTML += `<div>${d.order} - ${d.name} (${d.status})</div>`;
        const opt = document.createElement("option");
        opt.value = doc.id;
        opt.text = d.name;
        sel.appendChild(opt);
    });
}

async function renderUltimasTarefas(){
    const snap = await db.collection('tasks').orderBy('timestamp','desc').limit(10).get();
    const div = document.getElementById('ultimasTarefas');
    div.innerHTML = "";

    snap.forEach(d=>{
        const r = d.data();
        div.innerHTML += `<div>${r.displayTS} — ${r.technicianName}: ${r.activity}</div>`;
    });
}

document.getElementById('btnRefresh').onclick = carregarTudo;

document.getElementById('btnIncluir').onclick = async ()=>{
    alert("Função incluirTarefa deve ser adaptada com sua lógica completa.");
};

document.getElementById('btnAusencia').onclick = async ()=>{
    alert("Função registrarAusencia deve ser adaptada com sua lógica completa.");
};

carregarTudo();
