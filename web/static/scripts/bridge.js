/**
 * DJI Bridge module - manages DJI Cloud API integration
 */

import { Logger } from './logger.js';

// DJI Cloud API credentials
const APP_ID = 171440;
const LICENSE = "krC5HsEFLzVC8xkKM38JCcSxNEQvsQ/7IoiHEJRaulGiPQildia+n/+bF+SO21pk1JTS8CfaNS+fn8qt+17i3Y7uoqtBOOsdtLUQhqPMb0DVea0dmZ7oZhdP2CuQrQSn1bobS3pQ+MW2eEOq0XCcCkpo+HxAC1r5/33yEDxc6NE=";
const APP_KEY = "b57ab1ee70f0a78e1797c592742e7d4";
function bytesToUuid(bytes) {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function fallbackHashBytes(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bytes = new Uint8Array(32);
  let x = hash >>> 0;
  for (let i = 0; i < bytes.length; i += 1) {
    // Xorshift32 to expand into 32 bytes
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    bytes[i] = x & 0xff;
  }
  return bytes;
}

async function sha256Bytes(input) {
  if (window.crypto && window.crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(digest);
  }
  return fallbackHashBytes(input);
}

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

  getPlatformInfo() {
    const appConfig = window.APP_CONFIG || {};
    return {
      platformName: appConfig.platformName || "DJI上云控制-云纵科技",
      workspaceName: appConfig.workspaceName || "上云API界面",
      desc: appConfig.workspaceDesc || "云纵科技"
    };
  },

  async generateWorkspaceIdFromSN(sn) {
    const normalized = String(sn || "").trim();
    const bytes = await sha256Bytes(normalized);
    const uuidBytes = bytes.slice(0, 16);
    uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x50;
    uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80;
    return bytesToUuid(uuidBytes);
  },

  setWorkspaceInfo(workspaceId, info = this.getPlatformInfo()) {
    if (!this.isAvailable()) {
      Logger.log("[工作空间] 未检测到 DJI RC Cloud API 环境", "error");
      return { success: false, message: "DJI Bridge not available" };
    }

    let setIdResult = null;
    let setInfoResult = null;

    try {
      setIdResult = window.djiBridge.platformSetWorkspaceId(workspaceId);
      Logger.log(`[工作空间] 设置 WorkspaceId: ${workspaceId}`, "info");
    } catch (err) {
      Logger.log(`[工作空间] 设置 WorkspaceId 失败: ${err.message}`, "error");
      return { success: false, message: err.message };
    }

    try {
      setInfoResult = window.djiBridge.platformSetInformation(
        info.platformName,
        info.workspaceName,
        info.desc
      );
      Logger.log(`[工作空间] 设置平台信息: ${info.platformName}`, "info");
    } catch (err) {
      Logger.log(`[工作空间] 设置平台信息失败: ${err.message}`, "error");
      return { success: false, message: err.message };
    }

    const parseResult = (result) => {
      try {
        return typeof result === "string" ? JSON.parse(result) : result;
      } catch (e) {
        return result;
      }
    };

    const parsedId = parseResult(setIdResult);
    const parsedInfo = parseResult(setInfoResult);

    return {
      success: true,
      idResult: parsedId,
      infoResult: parsedInfo
    };
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
