/**
 * Handlers module - button click handlers for login/logout/status/test
 */

import { Logger } from './logger.js';
import { AppState } from './state.js';
import { MQTTTester } from './mqtt.js';
import { DJIBridge } from './bridge.js';

export const Handlers = {
  // Reference to UI module (will be set by UI module)
  ui: null,

  /**
   * Test MQTT connection
   */
  async onTest() {
    const creds = AppState.getCredentials(window.APP_CONFIG || {});
    await MQTTTester.test(creds, { label: "手动测试", timeoutMs: 1000 });
  },

  /**
   * Login flow
   */
  async onLogin() {
    const creds = AppState.getCredentials(window.APP_CONFIG || {});

    AppState.saveToStorage({
      username: creds.username,
      password: creds.password,
    });

    if (!DJIBridge.isAvailable()) {
      Logger.log("[登录] 未检测到 Cloud API 环境", "error");
      return;
    }

    if (!creds.isAnonymous && (!creds.username || !creds.password)) {
      Logger.log("[登录] 账号或密码为空", "error");
      return;
    }

    try {
      const ok = await MQTTTester.test(creds, { label: "登录前检测", timeoutMs: 1000 });
      if (!ok) {
        Logger.log("[登录] MQTT 检测未通过", "error");
        return;
      }

      AppState.isConnecting = true;
      DJIBridge.connectThing(creds.username, creds.password, "reg_callback");
    } catch (error) {
      Logger.log(`[登录] 错误: ${error.message}`, "error");
      AppState.isConnecting = false;
    }
  },

  /**
   * Logout flow
   */
  onLogout() {
    if (!DJIBridge.isAvailable()) {
      Logger.log("[登出] 未检测到 Cloud API 环境", "error");
      AppState.isConnected = false;
      AppState.isConnecting = false;
      if (this.ui) {
        this.ui.updateConnectionInfo();
      }
      return;
    }

    try {
      DJIBridge.disconnectThing();
      AppState.isConnected = false;
      AppState.isConnecting = false;

      if (this.ui) {
        this.ui.updateConnectionInfo();
      }
      Logger.log("[登出] 已断开连接", "success");
    } catch (error) {
      Logger.log(`[登出] 错误: ${error.message}`, "error");
    }
  },

  /**
   * Check status
   */
  onStatus() {
    Logger.log(`[状态] MQTT连接: ${AppState.isConnected ? "已连接" : "未连接"}`, "info");

    if (!DJIBridge.isAvailable()) {
      Logger.log("[状态] 未检测到 Cloud API 环境", "error");
      AppState.isConnected = false;
      if (this.ui) {
        this.ui.updateConnectionInfo();
        this.ui.checkModuleStatus();
      }
      return;
    }

    try {
      const thingState = DJIBridge.getThingState();
      Logger.log(`[状态] Thing状态: ${thingState}`, "info");
      Logger.log(`[状态] 许可证: ${window.djiBridge.platformIsVerified()}`, "info");

      AppState.isConnected = thingState;
      if (this.ui) {
        this.ui.updateConnectionInfo();
        this.ui.checkModuleStatus();
      }
    } catch (error) {
      Logger.log(`[状态] 错误: ${error.message}`, "error");
    }
  },

  /**
   * Clear cache and reload
   */
  onClearCache() {
    Logger.log("[缓存] 正在清除浏览器缓存...", "info");

    try {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }

      localStorage.clear();
      sessionStorage.clear();

      Logger.log("[缓存] 缓存已清除，即将刷新页面", "success");

      setTimeout(() => {
        window.location.reload(true);
      }, 500);
    } catch (error) {
      Logger.log(`[缓存] 清除失败: ${error.message}`, "error");
    }
  }
};
