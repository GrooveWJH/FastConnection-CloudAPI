/**
 * Connection Manager - Simplified state machine for MQTT connection
 *
 * States:
 *   DISCONNECTED - No connection
 *   CONNECTING   - Connection in progress
 *   CONNECTED    - Successfully connected
 *
 * Note: DJI's thingConnect() returns success synchronously, no callback needed.
 */

import { Logger } from './logger.js';
import { DJIBridge } from './bridge.js';

/**
 * Connection states
 */
export const ConnectionState = {
  DISCONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2,
};

/**
 * State names for logging
 */
const StateNames = {
  [ConnectionState.DISCONNECTED]: "未连接",
  [ConnectionState.CONNECTING]: "连接中",
  [ConnectionState.CONNECTED]: "已连接",
};

/**
 * Connection Manager
 */
export class ConnectionManager {
  constructor(bridgeAdapter) {
    this.bridge = bridgeAdapter;
    this.state = ConnectionState.DISCONNECTED;
    this.ui = null;  // Will be set by UI module
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Directly set connected state (called when thingConnect returns success)
   */
  setConnected() {
    this._setState(ConnectionState.CONNECTED);
  }

  /**
   * Directly set disconnected state
   */
  setDisconnected() {
    this._setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Attempt to connect (simplified - no callbacks, no timeout)
   */
  async connect(username, password) {
    // Prevent duplicate connection attempts
    if (this.state === ConnectionState.CONNECTING) {
      Logger.log("[连接] 已在连接中，忽略重复请求", "warn");
      return;
    }

    if (this.state === ConnectionState.CONNECTED) {
      Logger.log("[连接] 已连接，请先断开", "warn");
      return;
    }

    // Transition to CONNECTING
    this._setState(ConnectionState.CONNECTING);

    // Initiate connection
    try {
      const result = DJIBridge.connectThing(username, password);
      if (result.success) {
        this._setState(ConnectionState.CONNECTED);
      } else {
        this._setState(ConnectionState.DISCONNECTED);
      }
    } catch (error) {
      Logger.log(`[连接] 连接失败: ${error.message}`, "error");
      this._setState(ConnectionState.DISCONNECTED);
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.state === ConnectionState.DISCONNECTED) {
      return;
    }

    // Call DJI Bridge disconnect
    try {
      DJIBridge.disconnectThing();
    } catch (error) {
      Logger.log(`[断开] 断开时出错: ${error.message}`, "error");
    }

    // Transition to DISCONNECTED
    this._setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Set new state and notify UI
   */
  _setState(newState) {
    const oldState = this.state;

    if (oldState === newState) {
      return;
    }

    this.state = newState;

    Logger.log(
      `[连接状态] ${StateNames[oldState]} → ${StateNames[newState]}`,
      newState === ConnectionState.CONNECTED ? "success" : "info"
    );

    this._notifyStateChange(newState);
  }

  /**
   * Notify UI of state change
   */
  _notifyStateChange(newState) {
    if (!this.ui) {
      return;
    }

    switch (newState) {
      case ConnectionState.CONNECTED:
        this.ui.showConnected();
        break;
      case ConnectionState.DISCONNECTED:
        this.ui.showDisconnected();
        break;
      case ConnectionState.CONNECTING:
        this.ui.showConnecting();
        break;
    }
  }

  /**
   * Set UI reference
   */
  setUI(ui) {
    this.ui = ui;
  }
}
