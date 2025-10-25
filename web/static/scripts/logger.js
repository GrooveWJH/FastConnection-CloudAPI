/**
 * Logger module - handles log output to the terminal
 */

export const Logger = {
  logsContainer: null,

  init() {
    this.logsContainer = document.getElementById("logs");
  },

  log(message, type = "info") {
    if (!this.logsContainer) {
      this.init();
    }

    const entry = document.createElement("div");
    entry.className = `log-item log-${type}`;
    const now = new Date().toLocaleTimeString();
    entry.textContent = `[${now}] ${message}`;
    this.logsContainer.appendChild(entry);
    this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
  },

  clear() {
    if (this.logsContainer) {
      this.logsContainer.innerHTML = "";
    }
  }
};
