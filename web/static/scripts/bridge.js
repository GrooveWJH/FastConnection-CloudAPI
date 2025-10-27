/**
 * DJI Bridge module - manages DJI Cloud API integration
 */

import { Logger } from './logger.js';

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
      Logger.log("[许可证] 未检测到 DJI RC Cloud API 环境", "error");
      return false;
    }

    window.djiBridge.platformVerifyLicense(APP_ID, APP_KEY, LICENSE);
    const verified = window.djiBridge.platformIsVerified();
    Logger.log(`[许可证] 验证${verified ? "成功" : "失败"}`, verified ? "success" : "error");
    return verified;
  },

  /**
   * Get Remote Controller Serial Number
   */
  getRemoteControllerSN() {
    if (!this.isAvailable()) return null;
    try {
      const result = window.djiBridge.platformGetRemoteControllerSN();
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      return parsed.code === 0 ? parsed.data : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Get Aircraft Serial Number
   */
  getAircraftSN() {
    if (!this.isAvailable()) return null;
    try {
      const result = window.djiBridge.platformGetAircraftSN();
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      return parsed.code === 0 ? parsed.data : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Load a module
   */
  loadModule(name, params) {
    if (!this.isAvailable()) {
      throw new Error("DJI Bridge not available");
    }

    const result = window.djiBridge.platformLoadComponent(name, JSON.stringify(params));
    Logger.log(`[模块加载] platformLoadComponent("${name}"): ${JSON.stringify(result)}`, "info");

    try {
      const resultObj = JSON.parse(result);
      if (resultObj.code === 0) {
        Logger.log(`[模块加载] ${name} 加载成功`, "success");
        return { success: true, data: resultObj.data };
      } else {
        Logger.log(`[模块加载] ${name} 加载失败: ${resultObj.message || '未知错误'}`, "error");
        return { success: false, message: resultObj.message };
      }
    } catch (e) {
      Logger.log(`[模块加载] ${name} 加载成功（非JSON）`, "success");
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
        Logger.log(`[模块卸载] ${name} 卸载成功`, "success");
        return { success: true };
      } else {
        Logger.log(`[模块卸载] ${name} 卸载失败: ${resultObj.message || '未知错误'}`, "error");
        return { success: false, message: resultObj.message };
      }
    } catch (e) {
      Logger.log(`[模块卸载] ${name} 卸载成功（非JSON）`, "info");
      return { success: true, raw: result };
    }
  },

  /**
   * Check if module is loaded
   */
  isModuleLoaded(name) {
    if (!this.isAvailable()) return false;

    const loaded = window.djiBridge.platformIsComponentLoaded(name);

    try {
      const result = typeof loaded === 'string' ? JSON.parse(loaded) : loaded;
      if (result && typeof result === 'object' && 'code' in result) {
        return result.code === 0 && result.data === true;
      }
    } catch (e) {
      // Fallback to old format
    }

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
  connectThing(username, password, callback = "") {
    if (!this.isAvailable()) {
      throw new Error("DJI Bridge not available");
    }

    const result = window.djiBridge.thingConnect(username, password, callback);
    Logger.log(`[Thing连接] thingConnect(): ${JSON.stringify(result)}`, "info");

    try {
      const resultObj = JSON.parse(result);
      if (resultObj.code === 0) {
        Logger.log(`[Thing连接] 连接成功`, "success");
        return { success: true };
      } else {
        Logger.log(`[Thing连接] 连接失败: ${resultObj.message || '未知错误'}`, "error");
        return { success: false, message: resultObj.message };
      }
    } catch (e) {
      Logger.log(`[Thing连接] 连接成功（非JSON）`, "info");
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
        // Ignore disconnect errors
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
      Logger.log(`[Liveshare] 获取配置失败: ${e.message}`, "error");
      return null;
    }
  }
};
