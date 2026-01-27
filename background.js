// Executado apenas uma vez, quando a extensão é instalada ou atualizada
chrome.runtime.onInstalled.addListener(() => {

  // Busco configurações salvas (se existirem)
  chrome.storage.sync.get(
    ['userLabel', 'extensionActive'],
    (config) => {

      // Define um nome padrão caso o usuário ainda não tenha configurado
      if (config.userLabel === undefined) {
        chrome.storage.sync.set({ userLabel: 'Nome' });
      }

      // Extensão vem ativada por padrão
      if (config.extensionActive === undefined) {
        chrome.storage.sync.set({ extensionActive: true });
      }
    }
  );
});
