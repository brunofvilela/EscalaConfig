let modalContext = null;

export function initModal() {
  const modal = document.getElementById("modal-edit");
  const modalSave = document.getElementById("modal-save");
  const modalCancel = document.getElementById("modal-cancel");

  modalSave.addEventListener("click", async () => {
    if (modalContext?.onSave) {
      await modalContext.onSave();
    }
    closeModal();
  });

  modalCancel.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}

export function openModal({ title, bodyHTML, onSave }) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHTML;
  modalContext = { onSave };
  document.getElementById("modal-edit").setAttribute("aria-hidden", "false");
}

export function closeModal() {
  document.getElementById("modal-edit").setAttribute("aria-hidden", "true");
  document.getElementById("modal-body").innerHTML = "";
  modalContext = null;
}
