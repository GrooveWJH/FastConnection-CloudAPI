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
    Logger.log("[登录] 开始登录流程", "info");
    const creds = AppState.getCredentials(window.APP_CONFIG || {});

    // Save credentials to storage
    AppState.saveToStorage({
      username: creds.username,
      password: creds.password,
    });

    if (!DJIBridge.isAvailable()) {
      Logger.log("[登录] 未检测到 DJI RC Cloud API 环境，请在遥控器内置浏览器中访问此页面", "error");
      return;
    }

    if (!creds.isAnonymous && (!creds.username || !creds.password)) {
      Logger.log("[登录] 账号或密码为空，请填写后再试", "error");
      return;
    }

    try {
      // Test MQTT connection first
      const ok = await MQTTTester.test(creds, { label: "登录前检测", timeoutMs: 1000 });
      if (!ok) {
        Logger.log("[登录] MQTT 检测未通过，停止登录流程", "error");
        return;
      }

      // Load modules if not already loaded
      const thingLoaded = DJIBridge.isModuleLoaded("thing");
      const liveshareLoaded = DJIBridge.isModuleLoaded("liveshare");

      if (!thingLoaded) {
        Logger.log("[登录] 设备上云模块未加载，开始加载", "info");
        DJIBridge.loadModule("thing", {
          host: creds.tcpUrl,
          connectCallback: "reg_callback",
          username: creds.username,
          password: creds.password,
        });
      }

      if (!liveshareLoaded) {
        Logger.log("[登录] 直播模块未加载，开始加载", "info");
        DJIBridge.loadModule("liveshare", {
          videoPublishType: "video-on-demand",
          statusCallback: "liveshare_callback"
        });
      }

      // Connect Thing module
      Logger.log("[登录] 开始连接设备上云模块", "info");
      DJIBridge.connectThing(creds.username, creds.password, "reg_callback");

      Logger.log(`[登录] Thing 连接状态: ${DJIBridge.getThingState()}`, "info");

      AppState.isConnected = true;
      if (this.ui) {
        this.ui.updateConnectionInfo();
        setTimeout(() => this.ui.checkModuleStatus(), 500);
      }
    } catch (error) {
      Logger.log(`[登录] DJI Bridge 操作错误: ${error.message}`, "error");
    }
  },

  /**
   * Logout flow
   */
  onLogout() {
    Logger.log("[登出] 开始断开流程", "info");

    if (!DJIBridge.isAvailable()) {
      Logger.log("[登出] 未检测到 DJI RC Cloud API 环境，跳过组件卸载", "error");
      AppState.isConnected = false;
      if (this.ui) {
        this.ui.updateConnectionInfo();
        this.ui.checkModuleStatus();
      }
      return;
    }

    try {
      // Unload Liveshare module
      Logger.log("[登出] 卸载直播模块...", "info");
      DJIBridge.unloadModule("liveshare");

      // Unload Thing module
      Logger.log("[登出] 卸载设备上云模块...", "info");
      DJIBridge.unloadModule("thing");

      DJIBridge.disconnectThing();
      AppState.isConnected = false;
      if (this.ui) {
        this.ui.updateConnectionInfo();
        setTimeout(() => this.ui.checkModuleStatus(), 300);
      }
    } catch (error) {
      Logger.log(`[登出] DJI Bridge 注销错误: ${error.message}`, "error");
    }
  },

  /**
   * Check status
   */
  onStatus() {
    Logger.log("[状态查询] 开始状态检查", "info");
    Logger.log(`[状态查询] MQTT 连接状态: ${AppState.isConnected ? "已连接" : "未连接"}`, "info");

    if (!DJIBridge.isAvailable()) {
      Logger.log("[状态查询] 未检测到 DJI RC Cloud API 环境，无法查询设备状态", "error");
      AppState.isConnected = false;
      if (this.ui) {
        this.ui.updateConnectionInfo();
        this.ui.checkModuleStatus();
      }
      return;
    }

    try {
      Logger.log(`[状态查询] 组件加载状态: ${DJIBridge.isModuleLoaded("thing")}`, "info");
      const thingState = DJIBridge.getThingState();
      Logger.log(`[状态查询] Thing 状态: ${thingState}`, "info");
      Logger.log(`[状态查询] 平台验证状态: ${window.djiBridge.platformIsVerified()}`, "info");
      AppState.isConnected = thingState;
      if (this.ui) {
        this.ui.updateConnectionInfo();
        this.ui.checkModuleStatus();
      }
    } catch (error) {
      Logger.log(`[状态查询] DJI Bridge 状态查询错误: ${error.message}`, "error");
    }
  }
};
