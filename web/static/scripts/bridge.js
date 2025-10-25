/**
 * DJI Bridge module - manages DJI Cloud API integration
 */

import { Logger } from './logger.js';
import { AppState } from './state.js';

// DJI Cloud API credentials
const APP_ID = 171440;
const LICENSE = "krC5HsEFLzVC8xkKM38JCcSxNEQvsQ/7IoiHEJRaulGiPQildia+n/+bF+SO21pk1JTS8CfaNS+fn8qt+17i3Y7uoqtBOOsdtLUQhqPMb0DVea0dmZ7oZhdP2CuQrQSn1bobS3pQ+MW2eEOq0XCcCkpo+HxAC1r5/33yEDxc6NE=";
const APP_KEY = "b57ab1ee70f0a78e1797c592742e7d4";

export const DJIBridge = {
  /**
   * Check if DJI Bridge is available
   */
  isAvailable() {
    return typeof window.djiBridge !== 'undefined';
  },

  /**
   * Verify license
   */
  verifyLicense() {
    if (!this.isAvailable()) {
      Logger.log("[DJI Bridge] 未检测到 DJI RC Cloud API 环境", "error");
      return false;
    }

    Logger.log("[DJI Bridge] 开始验证平台许可证", "info");
    window.djiBridge.platformVerifyLicense(APP_ID, APP_KEY, LICENSE);
    const verified = window.djiBridge.platformIsVerified();
    Logger.log(`[DJI Bridge] 平台验证状态: ${verified}`, verified ? "success" : "error");
    return verified;
  },

  /**
   * Load a module
   */
  loadModule(name, params) {
    if (!this.isAvailable()) {
      throw new Error("DJI Bridge not available");
    }

    const result = window.djiBridge.platformLoadComponent(name, JSON.stringify(params));

    try {
      const resultObj = JSON.parse(result);
      if (resultObj.code === 0) {
        Logger.log(`[模块加载] ${name} 模块加载成功`, "success");
        return { success: true, data: resultObj.data };
      } else {
        Logger.log(`[模块加载] ${name} 模块加载失败: ${resultObj.message || '未知错误'}`, "error");
        return { success: false, message: resultObj.message };
      }
    } catch (e) {
      // Fallback if result is not JSON
      Logger.log(`[模块加载] ${name} 模块加载结果: ${result}`, "success");
      return { success: true, raw: result };
    }
  },

  /**
   * Unload a module
   */
  unloadModule(name) {
    if (!this.isAvailable()) {
      throw new Error("DJI Bridge not available");
    }

    const result = window.djiBridge.platformUnloadComponent(name);

    try {
      const resultObj = JSON.parse(result);
      if (resultObj.code === 0) {
        Logger.log(`[模块卸载] ${name} 模块卸载成功`, "success");
        return { success: true };
      } else {
        Logger.log(`[模块卸载] ${name} 模块卸载失败: ${resultObj.message || '未知错误'}`, "error");
        return { success: false, message: resultObj.message };
      }
    } catch (e) {
      Logger.log(`[模块卸载] ${name} 模块卸载结果: ${result}`, "info");
      return { success: true, raw: result };
    }
  },

  /**
   * Check if module is loaded
   */
  isModuleLoaded(name) {
    if (!this.isAvailable()) return false;
    const loaded = window.djiBridge.platformIsComponentLoaded(name);
    return loaded === true || loaded === "true" || loaded === 1;
  },

  /**
   * Get Thing module connection state
   */
  getThingState() {
    if (!this.isAvailable() || !this.isModuleLoaded("thing")) {
      return false;
    }
    const state = window.djiBridge.thingGetConnectState();
    return state === true || state === 1;
  },

  /**
   * Connect Thing module
   */
  connectThing(username, password, callback) {
    if (!this.isAvailable()) {
      throw new Error("DJI Bridge not available");
    }

    const result = window.djiBridge.thingConnect(username, password, callback);

    try {
      const resultObj = JSON.parse(result);
      if (resultObj.code === 0) {
        Logger.log(`[Thing 连接] 连接成功`, "success");
        return { success: true };
      } else {
        Logger.log(`[Thing 连接] 连接失败: ${resultObj.message || '未知错误'}`, "error");
        return { success: false, message: resultObj.message };
      }
    } catch (e) {
      Logger.log(`[Thing 连接] 连接结果: ${result}`, "info");
      return { success: true, raw: result };
    }
  },

  /**
   * Disconnect Thing module
   */
  disconnectThing() {
    if (!this.isAvailable()) return;
    if (window.djiBridge.thingDisconnect) {
      try {
        window.djiBridge.thingDisconnect();
      } catch (err) {
        // ignore optional disconnect errors
      }
    }
  },

  /**
   * Get Liveshare module configuration
   */
  getLiveshareConfig() {
    if (!this.isAvailable() || !this.isModuleLoaded("liveshare")) {
      return null;
    }
    try {
      const config = window.djiBridge.liveshareGetConfig();
      return config ? JSON.parse(config) : null;
    } catch (e) {
      return null;
    }
  }
};
