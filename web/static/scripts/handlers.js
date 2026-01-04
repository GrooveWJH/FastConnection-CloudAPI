/**
 * Handlers module - button click handlers for login/logout/status/test
 */

import { Logger } from './logger.js';
import { AppState } from './state.js';
import { MQTTTester } from './mqtt.js';
import { DJIBridge } from './bridge.js';
import { connectionManager } from './main.js';

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

      // Call DJI Bridge connect
      const result = DJIBridge.connectThing(creds.username, creds.password);

      // If thingConnect returns success, directly set connected state
      if (result.success) {
        connectionManager.setConnected();
        Logger.log("[登录] 连接成功", "success");
      } else {
        Logger.log("[登录] 连接失败", "error");
      }
    } catch (error) {
      Logger.log(`[登录] 错误: ${error.message}`, "error");
    }
  },

  /**
   * Logout flow
   */
  onLogout() {
    if (!DJIBridge.isAvailable()) {
      Logger.log("[登出] 未检测到 Cloud API 环境", "error");
      if (this.ui) {
        this.ui.updateConnectionInfo();
      }
      return;
    }

    try {
      // Use ConnectionManager to handle disconnection
      connectionManager.disconnect();
      Logger.log("[登出] 已断开连接", "success");
    } catch (error) {
      Logger.log(`[登出] 错误: ${error.message}`, "error");
    }
  },

  /**
   * Check status
   */
  onStatus() {
    const isConnected = connectionManager.isConnected();
    Logger.log(`[状态] MQTT连接: ${isConnected ? "已连接" : "未连接"}`, "info");

    if (!DJIBridge.isAvailable()) {
      Logger.log("[状态] 未检测到 Cloud API 环境", "error");
      if (this.ui) {
        this.ui.updateConnectionInfo();
        this.ui.checkModuleStatus();
      }
      this.checkMediaServer();
      return;
    }

    try {
      const thingState = DJIBridge.getThingState();
      Logger.log(`[状态] Thing状态: ${thingState}`, "info");
      Logger.log(`[状态] 许可证: ${window.djiBridge.platformIsVerified()}`, "info");

      if (this.ui) {
        this.ui.updateConnectionInfo();
        this.ui.checkModuleStatus();
      }
      this.checkMediaServer();
    } catch (error) {
      Logger.log(`[状态] 错误: ${error.message}`, "error");
    }
  },

  async checkMediaServer() {
    const appConfig = window.APP_CONFIG || {};
    let mediaHost = (AppState.config.mediaHost || "").trim();
    if (!mediaHost) {
      mediaHost = AppState.computeMediaHostFromMqtt(AppState.config.host);
    }
    if (!mediaHost) {
      Logger.log("[Media模块] 未配置媒体管理地址", "media");
      return;
    }
    const url = mediaHost.includes("://") ? mediaHost : `http://${mediaHost}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
      const response = await fetch(`${url}/health`, {
        method: "GET",
        signal: controller.signal
      });
      const ok = response.ok;
      Logger.log(
        `[Media模块] 服务${ok ? "可达" : "不可达"}: ${url} (${response.status})`,
        "media"
      );
    } catch (error) {
      Logger.log(`[Media模块] 服务不可达: ${url}`, "media");
    } finally {
      clearTimeout(timeoutId);
    }

    const storageEndpoint = appConfig.storageEndpoint || this.deriveStorageEndpoint(url);
    if (!storageEndpoint) {
      Logger.log("[存储] 未配置对象存储地址", "media");
      return;
    }

    const storageController = new AbortController();
    const storageTimeoutId = setTimeout(() => storageController.abort(), 1500);
    try {
      const response = await fetch(`${storageEndpoint}/minio/health/ready`, {
        method: "GET",
        signal: storageController.signal
      });
      const ok = response.ok;
      Logger.log(
        `[存储] 服务${ok ? "可达" : "不可达"}: ${storageEndpoint} (${response.status})`,
        "media"
      );
    } catch (error) {
      Logger.log(`[存储] 服务不可达: ${storageEndpoint}`, "media");
    } finally {
      clearTimeout(storageTimeoutId);
    }
  },

  deriveStorageEndpoint(baseUrl) {
    try {
      const url = new URL(baseUrl);
      url.port = "9000";
      return url.origin;
    } catch (error) {
      return "";
    }
  },

  /**
   * Clear cache and reload
   */
  async onClearCache() {
    // Show confirmation dialog
    const confirmed = confirm('确定要清除页面缓存并刷新吗？\n\n这将清除所有本地存储数据并重新加载页面。');

    if (!confirmed) {
      Logger.log('[缓存] 操作已取消', 'info');
      return;
    }

    Logger.log('[缓存] 正在清除浏览器数据...', 'info');

    try {
      const tasks = [];

      if ('caches' in window) {
        tasks.push(
          caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))))
        );
      }

      localStorage.clear();
      sessionStorage.clear();

      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        tasks.push(
          navigator.serviceWorker.getRegistrations().then(regs =>
            Promise.all(regs.map(reg => reg.unregister()))
          )
        );
      }

      if (indexedDB && indexedDB.databases) {
        tasks.push(
          indexedDB.databases().then(dbs =>
            Promise.all(dbs.map(db => db.name ? new Promise(resolve => {
              const req = indexedDB.deleteDatabase(db.name);
              req.onsuccess = resolve;
              req.onerror = resolve;
              req.onblocked = resolve;
            }) : Promise.resolve()))
          )
        );
      }

      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach(cookie => {
          const name = cookie.split('=')[0].trim();
          if (!name) return;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        });
      }

      await Promise.all(tasks);

      Logger.log('[缓存] 已清除缓存与存储，正在刷新页面', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (error) {
      Logger.log(`[缓存] 清除失败: ${error.message}`, 'error');
    }
  },

  /**
   * Copy all logs to clipboard
   */
  async onCopyLogs() {
    const logsContainer = document.getElementById("logs");
    const copyButton = document.getElementById("copy-logs-button");
    if (!logsContainer) {
      Logger.log("[日志] 未找到日志区域", "error");
      return;
    }
    const lines = Array.from(logsContainer.querySelectorAll(".log-item")).map((node) => node.textContent || "");
    const text = lines.join("\n").trim();
    if (!text) {
      Logger.log("[日志] 没有可复制的内容", "info");
      return;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!ok) {
          throw new Error("execCommand failed");
        }
      }
      Logger.log("[日志] 已复制全部日志", "success");
      if (copyButton) {
        const originalText = copyButton.textContent || "复制全部";
        copyButton.textContent = "已复制";
        copyButton.classList.add("is-copied");
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.classList.remove("is-copied");
        }, 2000);
      }
    } catch (error) {
      Logger.log("[日志] 复制失败，请检查浏览器权限", "error");
    }
  }
};
