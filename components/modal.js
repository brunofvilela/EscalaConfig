let modalContext = null;

export function initModal() {
  const modal = document.getElementById("modal-edit");
  const modalSave = document.getElementById("modal-save");
  const modalCancel = document.getElementById("modal-cancel");

  modalSave.addEventListener("click", async () => {
    if (modalContext && modalContext.onSave) await modalContext.onSave();
    closeModal();
  });

  modalCancel.addEventListener("click", closeModal);
}

export function openModal(type, data = {}) {
  const modal = document.getElementById("modal-edit");
  modalContext = { type, data };
  modal.setAttribute("aria-hidden", "false");
}

export function closeModal() {
  const modal = document.getElementById("modal-edit");
  modal.setAttribute("aria-hidden", "true");
  modalContext = null;
}

export { modalContext };
