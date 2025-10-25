/**
 * MQTT module - handles MQTT connection testing
 */

import { Logger } from './logger.js';

export const MQTTTester = {
  /**
   * Test MQTT connection
   * @param {Object} creds - MQTT credentials
   * @param {Object} options - Test options (label, timeoutMs)
   * @returns {Promise<boolean>} - True if connection successful
   */
  test(creds, { label = "MQTT 测试", timeoutMs = 1000 } = {}) {
    return new Promise((resolve) => {
      if (!creds.isAnonymous && (!creds.username || !creds.password)) {
        Logger.log(`[MQTT 测试] 账号或密码为空，无法测试连接`, "error");
        return resolve(false);
      }

      const clientId = "dji_test_" + Math.random().toString(16).slice(2, 8);
      const options = {
        clientId,
        reconnectPeriod: 0,
        connectTimeout: 8000,
        clean: true,
      };

      if (!creds.isAnonymous) {
        options.username = creds.username;
        options.password = creds.password;
      }

      Logger.log(`[${label}] 正在检测 MQTT 连接 (clientId: ${clientId})`, "info");

      let finished = false;
      const tempClient = mqtt.connect(creds.wsUrl, options);

      const done = (ok, message, type = ok ? "success" : "error") => {
        if (finished) return;
        finished = true;
        if (message) {
          Logger.log(message, type);
        }
        try {
          tempClient.end(true);
        } catch (err) {
          // ignore
        }
        resolve(ok);
      };

      const timeout = setTimeout(() => {
        done(false, `[${label}] MQTT 检测超时 (clientId: ${clientId})`);
      }, timeoutMs);

      tempClient.on("connect", () => {
        clearTimeout(timeout);
        done(true, `[${label}] MQTT 连接测试成功`, "success");
      });

      tempClient.on("error", (error) => {
        clearTimeout(timeout);
        done(false, `[${label}] MQTT 连接错误 (clientId: ${clientId}): ${error.message}`);
      });

      tempClient.on("close", () => {
        if (!finished) {
          clearTimeout(timeout);
          done(false, `[${label}] MQTT 连接已关闭 (clientId: ${clientId})`);
        }
      });
    });
  }
};
