/**
 * UI module - handles user interface updates and event binding
 */

import { Logger } from './logger.js';
import { AppState } from './state.js';
import { DJIBridge } from './bridge.js';
import { Handlers } from './handlers.js';

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
    this.updateConnectionInfo();
    Handlers.ui = this;
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      connectionInfo: document.getElementById("connection-info"),
      hostInput: document.getElementById("mqtt-host"),
      authModeInputs: Array.from(document.querySelectorAll('input[name="auth-mode"]')),
      usernameInput: document.getElementById("mqtt-username"),
      passwordInput: document.getElementById("mqtt-password"),
      loginButton: document.getElementById("login-button"),
      logoutButton: document.getElementById("logout-button"),
      statusButton: document.getElementById("status-button"),
      testButton: document.getElementById("test-button"),
      clearCacheButton: document.getElementById("clear-cache-button"),
      thingStatusIndicator: document.getElementById("thing-status"),
      thingInfo: document.getElementById("thing-info"),
      liveshareStatusIndicator: document.getElementById("liveshare-status"),
      liveshareInfo: document.getElementById("liveshare-info"),
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
      this.updateConnectionInfo();
    });

    this.elements.testButton.addEventListener("click", () => Handlers.onTest());
    this.elements.loginButton.addEventListener("click", () => Handlers.onLogin());
    this.elements.logoutButton.addEventListener("click", () => Handlers.onLogout());
    this.elements.statusButton.addEventListener("click", () => Handlers.onStatus());
    this.elements.clearCacheButton.addEventListener("click", () => Handlers.onClearCache());
  },

  /**
   * Update connection info display
   */
  updateConnectionInfo() {
    const creds = AppState.getCredentials(window.APP_CONFIG || {});
    const statusClass = AppState.isConnected ? "status-connected" : "status-disconnected";
    const statusText = AppState.isConnected ? "已连接" : "未连接";
    const accountText = creds.isAnonymous ? "匿名连接" : creds.username || "(未填写)";
    const passwordText = creds.isAnonymous ? "（匿名）" : creds.password ? "******" : "(未填写)";

    this.elements.connectionInfo.innerHTML = `
      <div style="margin-bottom: calc(var(--space) * 0.3);">
        <strong>MQTT连接信息汇总</strong>
        <span class="status-indicator ${statusClass}"></span>
        <span>${statusText}</span>
      </div>
      <div><strong>TCP 地址:</strong> ${creds.tcpUrl}</div>
      <div><strong>WebSocket 地址:</strong> ${creds.wsUrl}</div>
      <div><strong>账号:</strong> ${accountText}</div>
      <div><strong>密码:</strong> ${passwordText}</div>
    `;
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
      return;
    }

    try {
      const thingLoaded = DJIBridge.isModuleLoaded("thing");
      this.updateModuleStatus("thing", thingLoaded, thingLoaded ? "已加载" : "未加载");

      const liveshareLoaded = DJIBridge.isModuleLoaded("liveshare");
      this.updateModuleStatus("liveshare", liveshareLoaded, liveshareLoaded ? "已加载" : "未加载");
    } catch (error) {
      Logger.log(`[模块检查] 出错: ${error.message}`, "error");
    }
  }
};
