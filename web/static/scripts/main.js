/**
 * Main entry point - initializes the application
 */

import { Logger } from './logger.js';
import { AppState } from './state.js';
import { DJIBridge } from './bridge.js';
import { UI } from './ui.js';
import { DJIBridgeAdapter } from './djiBridgeAdapter.js';
import { ConnectionManager } from './connectionManager.js';
import { Liveshare } from './liveshare.js';

// Global instances - exported for use by other modules
export let bridgeAdapter;
export let connectionManager;

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

    // Load Thing module (use unified callback)
    const thingResult = DJIBridge.loadModule("thing", {
      host: creds.tcpUrl,
      connectCallback: "reg_callback",
      username: creds.username,
      password: creds.password
    });

    // Subscribe to module load event via adapter
    bridgeAdapter.onModuleLoad(() => {
      UI.updateModuleStatus("thing", true, "已加载");
      UI.enableLoginButton();
    });

    if (!thingResult.success) {
      UI.updateModuleStatus("thing", false, "加载失败");
    }

    // Load Liveshare module
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
 * DJI Bridge callback - Liveshare status
 * Note: This callback is registered with DJI Bridge, but we handle status in Liveshare module
 */
function liveshare_callback(status) {
  // Callback is handled by Liveshare module, just keep this for DJI Bridge registration
  // Do not log here to avoid spam
}

// Initialize application when page loads
window.addEventListener("load", () => {
  Logger.init();

  // Initialize DJI Bridge adapter
  bridgeAdapter = new DJIBridgeAdapter();
  bridgeAdapter.init();

  // Initialize connection manager
  connectionManager = new ConnectionManager(bridgeAdapter);

  // Connect adapter and connection manager
  bridgeAdapter.setConnectionManager(connectionManager);

  // Initialize UI
  UI.init();

  // Initialize default values and load modules
  initDefaults();

  // Initialize Liveshare module after modules are loaded
  setTimeout(() => {
    Liveshare.init();
  }, 1000);
});

// Export callback to global scope (required by DJI Bridge for liveshare)
window.liveshare_callback = liveshare_callback;
