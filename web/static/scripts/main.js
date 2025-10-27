/**
 * Main entry point - initializes the application
 */

import { Logger } from './logger.js';
import { AppState } from './state.js';
import { DJIBridge } from './bridge.js';
import { UI } from './ui.js';

/**
 * Preload DJI Bridge modules on page load
 */
async function preloadModules() {
  if (!DJIBridge.isAvailable()) {
    Logger.log("[预加载] 未检测到 Cloud API 环境", "error");
    UI.updateModuleStatus("thing", false, "环境未就绪");
    UI.updateModuleStatus("liveshare", false, "环境未就绪");
    return;
  }

  try {
    const verified = DJIBridge.verifyLicense();
    if (!verified) {
      UI.updateModuleStatus("thing", false, "许可证验证失败");
      UI.updateModuleStatus("liveshare", false, "许可证验证失败");
      return;
    }

    const creds = AppState.getCredentials(window.APP_CONFIG || {});

    const thingResult = DJIBridge.loadModule("thing", {
      host: creds.tcpUrl,
      connectCallback: "reg_callback"
    });

    UI.updateModuleStatus("thing", thingResult.success, thingResult.success ? "已加载" : "加载失败");

    const liveshareResult = DJIBridge.loadModule("liveshare", {
      videoPublishType: "video-on-demand",
      statusCallback: "liveshare_callback"
    });

    UI.updateModuleStatus("liveshare", liveshareResult.success, liveshareResult.success ? "已加载" : "加载失败");

    setTimeout(() => {
      UI.checkModuleStatus();
    }, 800);

  } catch (error) {
    Logger.log(`[预加载] 模块预加载出错: ${error.message}`, "error");
    UI.updateModuleStatus("thing", false, "预加载异常");
    UI.updateModuleStatus("liveshare", false, "预加载异常");
  }
}

/**
 * Parse host from URL
 */
function parseHostFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/^[a-z]+:\/\/([^/]+)/i);
  return match ? match[1] : null;
}

/**
 * Get default host display
 */
function defaultHostDisplay() {
  const appConfig = window.APP_CONFIG || {};
  const candidates = [appConfig.mqttTcpUrl, appConfig.mqttWsUrl];
  for (const raw of candidates) {
    const hostPart = parseHostFromUrl(raw);
    if (hostPart) return hostPart;
  }
  // 默认服务器地址
  return "81.70.222.38";
}

/**
 * Initialize default values
 */
function initDefaults() {
  const appConfig = window.APP_CONFIG || {};

  AppState.loadFromStorage();

  const hostInput = document.getElementById("mqtt-host");
  const usernameInput = document.getElementById("mqtt-username");
  const passwordInput = document.getElementById("mqtt-password");
  const authModeInputs = Array.from(document.querySelectorAll('input[name="auth-mode"]'));

  hostInput.value = AppState.config.host || defaultHostDisplay();
  usernameInput.value = AppState.config.username || appConfig.mqttUsername || "admin";
  passwordInput.value = AppState.config.password || appConfig.mqttPassword || "public";

  AppState.config.host = hostInput.value;
  AppState.config.username = usernameInput.value;
  AppState.config.password = passwordInput.value;

  const defaultAnonymous = !usernameInput.value && !passwordInput.value;
  authModeInputs.forEach((input) => {
    input.checked = input.value === (defaultAnonymous ? "anonymous" : "credential");
    if (input.checked) {
      AppState.config.authMode = input.value;
    }
  });

  preloadModules();
}

/**
 * DJI Bridge callback - Thing connection status
 */
function reg_callback() {
  const stack = new Error().stack;
  Logger.log(`[Thing回调] 被触发！`, "warn");
  Logger.log(`[Thing回调] 调用栈: ${stack}`, "info");

  // Only set connected if user initiated the connection
  if (AppState.isConnecting) {
    Logger.log(`[Thing回调] 连接成功`, "success");
    AppState.isConnected = true;
    AppState.isConnecting = false;
    UI.updateConnectionInfo();
    UI.checkModuleStatus();
  } else {
    Logger.log(`[Thing回调] 模块加载触发（非用户主动连接）`, "info");
  }
}

/**
 * DJI Bridge callback - Liveshare status
 */
function liveshare_callback(status) {
  try {
    const statusObj = typeof status === "string" ? JSON.parse(status) : status;

    if (statusObj && statusObj.status !== undefined) {
      const statusNames = {0: "未连接", 1: "已连接服务器", 2: "正在直播"};
      const statusText = statusNames[statusObj.status] || "未知状态";
      const isActive = statusObj.status >= 1;

      Logger.log(`[Liveshare回调] ${statusText}`, "info");
      UI.updateModuleStatus("liveshare", isActive, statusText);
    }
  } catch (error) {
    Logger.log(`[Liveshare回调] 解析失败: ${error.message}`, "error");
  }
}

// Initialize application when page loads
window.addEventListener("load", () => {
  AppState.isConnected = false;
  Logger.init();
  UI.init();
  initDefaults();
});

// Export callbacks to global scope (required by DJI Bridge)
window.reg_callback = reg_callback;
window.liveshare_callback = liveshare_callback;
