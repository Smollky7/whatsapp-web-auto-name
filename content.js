function interceptSend() {
  const observer = new MutationObserver(() => {
    const input = document.querySelector('[contenteditable="true"][data-tab="10"]');
    if (!input) return;

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        chrome.storage.local.get(["enabled", "name"], (data) => {
          if (!data.enabled || !data.name) return;

          const message = input.innerText.trim();
          if (message.startsWith("**" + data.name)) return;

          e.preventDefault();

          const newMessage =
            `**${data.name}:**\n*${message}*`;

          input.innerText = newMessage;

          setTimeout(() => {
            document.execCommand("insertLineBreak");
          }, 50);
        });
      }
    }, { once: true });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

interceptSend();
