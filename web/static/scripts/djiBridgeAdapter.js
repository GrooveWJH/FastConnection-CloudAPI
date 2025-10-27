/**
 * DJI Bridge Adapter
 *
 * Reality: DJI uses the SAME callback for both module load and connection.
 * Solution: Use ConnectionManager state to distinguish the two events.
 */

import { Logger } from './logger.js';
import { ConnectionState } from './connectionManager.js';

export class DJIBridgeAdapter {
  constructor() {
    this._moduleLoadCallbacks = [];
    this._connectionCallbacks = [];
    this._moduleLoaded = false;
    this._connectionManager = null;
  }

  /**
   * Initialize adapter and register unified callback
   */
  init() {
    window.reg_callback = () => this._handleCallback();
  }

  /**
   * Set ConnectionManager reference
   */
  setConnectionManager(connectionManager) {
    this._connectionManager = connectionManager;
  }

  /**
   * Handle unified callback - distinguish using ConnectionManager state
   */
  _handleCallback() {
    // Check if this is a connection callback
    const isConnecting = this._connectionManager &&
                         this._connectionManager.getState() === ConnectionState.CONNECTING;

    if (isConnecting) {
      // This is a connection callback
      Logger.log("[Thing连接] 连接成功", "success");
      this._notifyConnection();
    } else {
      // This is a module load callback
      if (!this._moduleLoaded) {
        this._moduleLoaded = true;
        Logger.log("[Thing模块] 加载完成", "success");
        this._notifyModuleLoad();
      }
    }
  }

  /**
   * Subscribe to module load event
   */
  onModuleLoad(callback) {
    this._moduleLoadCallbacks.push(callback);
  }

  /**
   * Subscribe to connection event
   */
  onConnection(callback) {
    this._connectionCallbacks.push(callback);
  }

  /**
   * Notify all module load subscribers
   */
  _notifyModuleLoad() {
    this._moduleLoadCallbacks.forEach(cb => {
      try {
        cb();
      } catch (err) {
        Logger.log(`[模块加载回调错误] ${err.message}`, "error");
      }
    });
  }

  /**
   * Notify all connection subscribers
   */
  _notifyConnection() {
    this._connectionCallbacks.forEach(cb => {
      try {
        cb();
      } catch (err) {
        Logger.log(`[连接回调错误] ${err.message}`, "error");
      }
    });
  }
}
