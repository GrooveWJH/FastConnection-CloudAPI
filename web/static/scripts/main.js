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
    Logger.log("[预加载] 未检测到 DJI RC Cloud API 环境，跳过模块预加载", "error");
    // 立即更新模块状态为"环境未就绪"
    UI.updateModuleStatus("thing", false, "环境未就绪");
    UI.updateModuleStatus("liveshare", false, "环境未就绪");
    return;
  }

  try {
    // 1. Verify license
    const verified = DJIBridge.verifyLicense();
    if (!verified) {
      Logger.log("[预加载] 许可证验证失败，跳过模块加载", "error");
      UI.updateModuleStatus("thing", false, "许可证验证失败");
      UI.updateModuleStatus("liveshare", false, "许可证验证失败");
      return;
    }

    // 2. Get credentials from storage
    const creds = AppState.getCredentials(window.APP_CONFIG || {});
    const hasValidConfig = creds.username && creds.password;
    if (!hasValidConfig) {
      Logger.log("[预加载] 未找到有效的账号密码配置，使用默认值", "info");
    }

    // 3. Load Thing module (without connecting)
    Logger.log("[预加载] 加载设备上云模块...", "info");
    const thingResult = DJIBridge.loadModule("thing", {
      host: creds.tcpUrl,
      connectCallback: "reg_callback",
      username: creds.username || "",
      password: creds.password || "",
    });

    // 立即更新Thing模块状态
    if (thingResult.success) {
      UI.updateModuleStatus("thing", true, "已加载，未连接");
    } else {
      UI.updateModuleStatus("thing", false, "加载失败");
    }

    // 4. Load Liveshare module
    Logger.log("[预加载] 加载直播模块...", "info");
    const liveshareResult = DJIBridge.loadModule("liveshare", {
      videoPublishType: "video-on-demand",
      statusCallback: "liveshare_callback"
    });

    // 立即更新Liveshare模块状态
    if (liveshareResult.success) {
      UI.updateModuleStatus("liveshare", true, "已加载");
    } else {
      UI.updateModuleStatus("liveshare", false, "加载失败");
    }

    // 5. 延迟再次检查确认状态（使用DJI Bridge API验证）
    setTimeout(() => {
      Logger.log("[预加载] 验证模块加载状态", "info");
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
  return window.location.hostname || "127.0.0.1";
}

/**
 * Initialize default values
 */
function initDefaults() {
  const appConfig = window.APP_CONFIG || {};

  // Load state from storage
  AppState.loadFromStorage();

  // Set defaults if not in storage
  const hostInput = document.getElementById("mqtt-host");
  const usernameInput = document.getElementById("mqtt-username");
  const passwordInput = document.getElementById("mqtt-password");
  const authModeInputs = Array.from(document.querySelectorAll('input[name="auth-mode"]'));

  hostInput.value = AppState.config.host || defaultHostDisplay();
  usernameInput.value = AppState.config.username || appConfig.mqttUsername || "admin";
  passwordInput.value = AppState.config.password || appConfig.mqttPassword || "public";

  // Update AppState with input values
  AppState.config.host = hostInput.value;
  AppState.config.username = usernameInput.value;
  AppState.config.password = passwordInput.value;

  // Set auth mode
  const defaultAnonymous = !usernameInput.value && !passwordInput.value;
  authModeInputs.forEach((input) => {
    input.checked = input.value === (defaultAnonymous ? "anonymous" : "credential");
    if (input.checked) {
      AppState.config.authMode = input.value;
    }
  });

  // Log initialization status
  Logger.log(`[初始化] Cloud API 许可证状态: ${DJIBridge.isAvailable() ? window.djiBridge.platformIsVerified() : "未检测到 DJI RC Cloud API"}`, "info");

  // Preload modules
  preloadModules();
}

/**
 * DJI Bridge callback - Thing connection status
 */
function reg_callback() {
  Logger.log(`[回调] DJI Bridge 连接回调触发，参数: ${Array.from(arguments).join(", ")}`, "success");
  AppState.isConnected = true;
  UI.updateConnectionInfo();
  UI.checkModuleStatus();
}

/**
 * DJI Bridge callback - Liveshare status
 */
function liveshare_callback(status) {
  try {
    const statusObj = typeof status === "string" ? JSON.parse(status) : status;
    Logger.log(`[直播回调] 直播状态变化: ${JSON.stringify(statusObj)}`, "info");

    // Update liveshare module status
    if (statusObj && statusObj.status !== undefined) {
      const statusNames = {0: "未连接", 1: "已连接服务器", 2: "正在直播"};
      const statusText = statusNames[statusObj.status] || "未知状态";
      const isActive = statusObj.status >= 1;

      UI.updateModuleStatus("liveshare", isActive, statusText);
    }
  } catch (error) {
    Logger.log(`[直播回调] 解析状态出错: ${error.message}`, "error");
  }
}

// Initialize application when page loads
window.addEventListener("load", () => {
  // 1. 首先确保连接状态为false
  AppState.isConnected = false;

  // 2. 初始化日志系统
  Logger.init();

  // 3. 初始化UI（会调用updateConnectionInfo，此时isConnected已经是false）
  UI.init();

  // 4. 加载默认配置并预加载模块
  initDefaults();
});

// Export callbacks to global scope (required by DJI Bridge)
window.reg_callback = reg_callback;
window.liveshare_callback = liveshare_callback;
