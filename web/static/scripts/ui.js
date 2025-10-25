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

    // 初始化模块状态为"未加载"（红灯）
    this.updateModuleStatus("thing", false, "未加载");
    this.updateModuleStatus("liveshare", false, "未加载");

    // 更新连接信息显示
    this.updateConnectionInfo();

    // Link handlers to UI
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
    // Auth mode change
    this.elements.authModeInputs.forEach((input) =>
      input.addEventListener("change", () => {
        AppState.config.authMode = input.value;
        this.updateConnectionInfo();
      })
    );

    // Input changes
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

    // Button clicks - delegate to handlers
    this.elements.testButton.addEventListener("click", () => Handlers.onTest());
    this.elements.loginButton.addEventListener("click", () => Handlers.onLogin());
    this.elements.logoutButton.addEventListener("click", () => Handlers.onLogout());
    this.elements.statusButton.addEventListener("click", () => Handlers.onStatus());
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
        <strong>Cloud API MQTT 目标</strong>
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
      Logger.log("[模块检查] 未检测到 DJI RC Cloud API 环境", "error");
      this.updateModuleStatus("thing", false, "环境未就绪");
      this.updateModuleStatus("liveshare", false, "环境未就绪");
      return;
    }

    try {
      // Check Thing module
      const thingLoaded = DJIBridge.isModuleLoaded("thing");
      if (thingLoaded) {
        const connected = DJIBridge.getThingState();
        this.updateModuleStatus("thing", true, connected ? "已连接" : "已加载，未连接");
        Logger.log(`[模块检查] 设备上云模块: 已加载 (连接状态: ${connected ? "已连接" : "未连接"})`, "info");
      } else {
        this.updateModuleStatus("thing", false);
        Logger.log("[模块检查] 设备上云模块: 未加载", "info");
      }

      // Check Liveshare module
      const liveshareLoaded = DJIBridge.isModuleLoaded("liveshare");
      if (liveshareLoaded) {
        const config = DJIBridge.getLiveshareConfig();
        let configInfo = "已加载";
        if (config && config.data) {
          const typeNames = {0: "未知", 1: "声网", 2: "RTMP", 3: "RTSP", 4: "GB28181"};
          configInfo = `已加载 (${typeNames[config.data.type] || "未知类型"})`;
        }
        this.updateModuleStatus("liveshare", true, configInfo);
        Logger.log(`[模块检查] 直播模块: ${configInfo}`, "info");
      } else {
        this.updateModuleStatus("liveshare", false);
        Logger.log("[模块检查] 直播模块: 未加载", "info");
      }
    } catch (error) {
      Logger.log(`[模块检查] 检查模块状态时出错: ${error.message}`, "error");
    }
  }
};
