const toggle = document.getElementById("toggle");
const nameInput = document.getElementById("nameInput");
const saveBtn = document.getElementById("save");
const previewName = document.getElementById("previewName");

// Carregar dados salvos
chrome.storage.local.get(["enabled", "name"], (data) => {
  toggle.checked = data.enabled || false;
  nameInput.value = data.name || "";
  previewName.textContent = (data.name || "Nome") + ":";
});

nameInput.addEventListener("input", () => {
  previewName.textContent = nameInput.value + ":";
});

saveBtn.addEventListener("click", () => {
  chrome.storage.local.set({
    enabled: toggle.checked,
    name: nameInput.value
  });
});
