(() => {
  const DEFAULT_LABEL = 'Nome';
  const MAX_LABEL_LENGTH = 50;

  function normalizeLabel(value) {
    const label = String(value ?? '')
      .replace(/[\r\n\t]+/g, ' ')
      .trim()
      .slice(0, MAX_LABEL_LENGTH);
    return label || DEFAULT_LABEL;
  }

  function prefixMessage(message, label) {
    const original = String(message ?? '');
    if (!original.trim()) return null;

    const signature = `*${normalizeLabel(label)}:*`;
    if (original.startsWith(signature)) return null;
    return `${signature}\n${original}`;
  }

  function readSettings(storage, runtime, callback) {
    const keys = ['userLabel', 'extensionActive'];
    storage.local.get(keys, (localSettings = {}) => {
      if (runtime.lastError) {
        callback(null, runtime.lastError);
        return;
      }

      const missingKeys = keys.filter((key) => !Object.prototype.hasOwnProperty.call(localSettings, key));
      if (!missingKeys.length) {
        callback(localSettings, null);
        return;
      }

      storage.sync.get(missingKeys, (legacySettings = {}) => {
        if (runtime.lastError) {
          callback(null, runtime.lastError);
          return;
        }

        const settings = { ...localSettings };
        const migratedSettings = {};
        missingKeys.forEach((key) => {
          if (legacySettings[key] !== undefined) {
            settings[key] = legacySettings[key];
            migratedSettings[key] = legacySettings[key];
          }
        });

        if (!Object.keys(migratedSettings).length) {
          callback(settings, null);
          return;
        }

        storage.local.set(migratedSettings, () => {
          if (runtime.lastError) {
            callback(null, runtime.lastError);
            return;
          }
          storage.sync.remove(missingKeys, () => callback(settings, null));
        });
      });
    });
  }

  const api = Object.freeze({ DEFAULT_LABEL, MAX_LABEL_LENGTH, normalizeLabel, prefixMessage, readSettings });
  globalThis.AutoSignature = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();