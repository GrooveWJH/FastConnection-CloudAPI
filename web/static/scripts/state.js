/**
 * State module - manages application configuration and connection state
 */

const STORAGE_KEY = "dji_rc_login_state";

export const AppState = {
  // Current configuration
  config: {
    host: "",
    authMode: "credential",
    username: "",
    password: ""
  },

  // Connection state
  isConnected: false,

  /**
   * Load state from localStorage
   */
  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored.host) this.config.host = stored.host;
        if (stored.username) this.config.username = stored.username;
        if (stored.password) this.config.password = stored.password;
      }
    } catch (err) {
      // Ignore storage errors
    }
  },

  /**
   * Save partial state to localStorage
   */
  saveToStorage(patch) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : {};
      const next = { ...current, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      // Ignore storage errors
    }
  },

  /**
   * Parse and compute MQTT endpoints from raw host input
   */
  computeEndpoints(raw, appConfig = {}) {
    const WS_PATH = appConfig.mqttWsPath || "/mqtt";
    const MQTT_WS_PORT_OVERRIDE = appConfig.mqttWsPort || "";
    const DEFAULT_TCP_PORT = "1883";
    const DEFAULT_WS_PORT = MQTT_WS_PORT_OVERRIDE || "8083";
    const PAGE_HOST = window.location.hostname || "127.0.0.1";

    let trimmed = (raw || "").trim();
    let secure = false;
    let hostPart = PAGE_HOST;
    let tcpPort = DEFAULT_TCP_PORT;
    let wsPort = DEFAULT_WS_PORT;

    if (trimmed) {
      const schemeMatch = trimmed.match(/^([a-z]+):\/\/(.+)$/i);
      if (schemeMatch) {
        const scheme = schemeMatch[1].toLowerCase();
        trimmed = schemeMatch[2];
        if (scheme === "ssl" || scheme === "mqtts" || scheme === "wss") {
          secure = true;
        }
      }
      const slashIdx = trimmed.indexOf("/");
      if (slashIdx >= 0) {
        trimmed = trimmed.slice(0, slashIdx);
      }
      if (trimmed) {
        hostPart = trimmed;
      }
    }

    if (hostPart.includes(":")) {
      const [hostOnly, portPart] = hostPart.split(":");
      hostPart = hostOnly || PAGE_HOST;
      if (portPart) {
        tcpPort = portPart;
      }
    }

    if (secure) {
      if (tcpPort === DEFAULT_TCP_PORT) {
        tcpPort = "8883";
      }
      wsPort = MQTT_WS_PORT_OVERRIDE || "8084";
    } else if (MQTT_WS_PORT_OVERRIDE) {
      wsPort = MQTT_WS_PORT_OVERRIDE;
    }

    const tcpScheme = secure ? "ssl" : "tcp";
    const wsScheme = secure ? "wss" : "ws";

    return {
      hostDisplay: `${hostPart}${tcpPort ? `:${tcpPort}` : ""}`,
      tcpUrl: `${tcpScheme}://${hostPart}:${tcpPort}`,
      wsUrl: `${wsScheme}://${hostPart}:${wsPort}${WS_PATH}`,
      secure,
    };
  },

  /**
   * Get current MQTT credentials based on auth mode
   */
  getCredentials(appConfig = {}) {
    const endpoints = this.computeEndpoints(this.config.host, appConfig);
    const isAnonymous = this.config.authMode === "anonymous";
    return {
      tcpUrl: endpoints.tcpUrl,
      wsUrl: endpoints.wsUrl,
      hostDisplay: endpoints.hostDisplay,
      secure: endpoints.secure,
      isAnonymous,
      username: isAnonymous ? "" : this.config.username,
      password: isAnonymous ? "" : this.config.password,
    };
  }
};
