/**
 * UI module - handles user interface updates and event binding
 */

import { Logger } from './logger.js';
import { AppState } from './state.js';
import { DJIBridge } from './bridge.js';
import { Handlers } from './handlers.js';
import { connectionManager } from './main.js';

export const UI = {
  // DOM elements
  elements: {},

  /**
   * Initialize UI module
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.updateModuleStatus("thing", false, "未加载");
    this.updateModuleStatus("liveshare", false, "未加载");
    this.updateModuleStatus("media", false, "未加载");
    this.showDisconnected();  // Initial state
    Handlers.ui = this;

    // Set ConnectionManager UI reference
    if (connectionManager) {
      connectionManager.setUI(this);
    }
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      connectionInfo: document.getElementById("connection-info"),
      hostInput: document.getElementById("mqtt-host"),
      mediaHostInput: document.getElementById("media-host"),
      authModeInputs: Array.from(document.querySelectorAll('input[name="auth-mode"]')),
      usernameInput: document.getElementById("mqtt-username"),
      passwordInput: document.getElementById("mqtt-password"),
      loginButton: document.getElementById("login-button"),
      logoutButton: document.getElementById("logout-button"),
      statusButton: document.getElementById("status-button"),
      testButton: document.getElementById("test-button"),
      clearCacheButton: document.getElementById("clear-cache-button"),
      copyLogsButton: document.getElementById("copy-logs-button"),
      thingStatusIndicator: document.getElementById("thing-status"),
      thingInfo: document.getElementById("thing-info"),
      liveshareStatusIndicator: document.getElementById("liveshare-status"),
      liveshareInfo: document.getElementById("liveshare-info"),
      mediaStatusIndicator: document.getElementById("media-status"),
      mediaInfo: document.getElementById("media-info"),
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    this.elements.authModeInputs.forEach((input) =>
      input.addEventListener("change", () => {
        AppState.config.authMode = input.value;
        this.updateConnectionInfo();
      })
    );

    this.elements.usernameInput.addEventListener("input", () => {
      AppState.config.username = this.elements.usernameInput.value.trim();
      this.updateConnectionInfo();
    });

    this.elements.passwordInput.addEventListener("input", () => {
      AppState.config.password = this.elements.passwordInput.value;
      this.updateConnectionInfo();
    });

    this.elements.hostInput.addEventListener("input", () => {
      AppState.config.host = this.elements.hostInput.value.trim();
      AppState.saveToStorage({ host: AppState.config.host });
      const nextMediaHost = AppState.computeMediaHostFromMqtt(AppState.config.host);
      const mediaInput = this.elements.mediaHostInput;
      if (mediaInput && (mediaInput.dataset.auto === "true" || !mediaInput.value)) {
        mediaInput.value = nextMediaHost;
        AppState.config.mediaHost = nextMediaHost;
        AppState.saveToStorage({ mediaHost: nextMediaHost });
      }
      this.updateConnectionInfo();
    });

    if (this.elements.mediaHostInput) {
      this.elements.mediaHostInput.addEventListener("input", () => {
        AppState.config.mediaHost = this.elements.mediaHostInput.value.trim();
        AppState.saveToStorage({ mediaHost: AppState.config.mediaHost });
        this.elements.mediaHostInput.dataset.auto = "false";
      });
    }

    this.elements.testButton.addEventListener("click", () => Handlers.onTest());
    this.elements.loginButton.addEventListener("click", () => Handlers.onLogin());
    this.elements.logoutButton.addEventListener("click", () => Handlers.onLogout());
    this.elements.statusButton.addEventListener("click", () => Handlers.onStatus());
    this.elements.clearCacheButton.addEventListener("click", () => Handlers.onClearCache());
    if (this.elements.copyLogsButton) {
      this.elements.copyLogsButton.addEventListener("click", () => {
        try {
          if (typeof Handlers.onCopyLogs === "function") {
            Handlers.onCopyLogs();
          } else {
            Logger.log("[日志] 复制功能未就绪，请刷新页面", "error");
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          Logger.log(`[日志] 复制功能异常: ${detail}`, "error");
        }
      });
    }
  },

  /**
   * Update connection info display
   */
  updateConnectionInfo() {
    const creds = AppState.getCredentials(window.APP_CONFIG || {});
    const isConnected = connectionManager ? connectionManager.isConnected() : false;
    const statusClass = isConnected ? "status-connected" : "status-disconnected";
    const statusText = isConnected ? "已连接" : "未连接";
    const workspace = AppState.workspace || {};

    // Get device serial numbers
    const rcSN = DJIBridge.getRemoteControllerSN() || "未获取";
    const aircraftSN = DJIBridge.getAircraftSN() || "未获取";

    this.elements.connectionInfo.innerHTML = `
      <div style="margin-bottom: calc(var(--space) * 0.3);">
        <strong>MQTT连接信息汇总</strong>
        <span class="status-indicator ${statusClass}"></span>
        <span>${statusText}</span>
      </div>
      <div><strong>WorkspaceId:</strong> <span style="font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;">${workspace.id || "待生成"}</span></div>
      <div style="margin-top: calc(var(--space) * 0.5); padding-top: calc(var(--space) * 0.5); border-top: 1px solid rgba(148, 163, 184, 0.2);">
        <strong>遥控器SN:</strong> <span style="font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;">${rcSN}</span>
      </div>
      <div><strong>飞行器SN:</strong> <span style="font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;">${aircraftSN}</span></div>
    `;
  },

  /**
   * Show connected state (called by ConnectionManager)
   */
  showConnected() {
    this.updateConnectionInfo();
  },

  /**
   * Show disconnected state (called by ConnectionManager)
   */
  showDisconnected() {
    this.updateConnectionInfo();
  },

  /**
   * Show connecting state (called by ConnectionManager)
   */
  showConnecting() {
    this.updateConnectionInfo();
  },

  /**
   * Enable login button (called after module loads)
   */
  enableLoginButton() {
    if (this.elements.loginButton) {
      this.elements.loginButton.disabled = false;
    }
  },

  /**
   * Update module status indicators
   */
  updateModuleStatus(moduleName, isLoaded, additionalInfo = "") {
    let statusIndicator, infoElement;

    if (moduleName === "thing") {
      statusIndicator = this.elements.thingStatusIndicator;
      infoElement = this.elements.thingInfo;
    } else if (moduleName === "liveshare") {
      statusIndicator = this.elements.liveshareStatusIndicator;
      infoElement = this.elements.liveshareInfo;
    } else if (moduleName === "media") {
      statusIndicator = this.elements.mediaStatusIndicator;
      infoElement = this.elements.mediaInfo;
    } else {
      return;
    }

    if (isLoaded) {
      statusIndicator.classList.remove("inactive");
      statusIndicator.classList.add("active");
      infoElement.textContent = additionalInfo || "已加载";
      infoElement.style.color = "#86efac";
    } else {
      statusIndicator.classList.remove("active");
      statusIndicator.classList.add("inactive");
      infoElement.textContent = additionalInfo || "未加载";
      infoElement.style.color = "#94a3b8";
    }
  },

  /**
   * Check and update module status
   */
  checkModuleStatus() {
    if (!DJIBridge.isAvailable()) {
      this.updateModuleStatus("thing", false, "环境未就绪");
      this.updateModuleStatus("liveshare", false, "环境未就绪");
      this.updateModuleStatus("media", false, "环境未就绪");
      return;
    }

    try {
      const thingLoaded = DJIBridge.isModuleLoaded("thing");
      this.updateModuleStatus("thing", thingLoaded, thingLoaded ? "已加载" : "未加载");

      const liveshareLoaded = DJIBridge.isModuleLoaded("liveshare");
      this.updateModuleStatus("liveshare", liveshareLoaded, liveshareLoaded ? "已加载" : "未加载");

      const mediaLoaded = DJIBridge.isModuleLoaded("media");
      this.updateModuleStatus("media", mediaLoaded, mediaLoaded ? "已加载" : "未加载");
    } catch (error) {
      Logger.log(`[模块检查] 出错: ${error.message}`, "error");
    }
  }
};
