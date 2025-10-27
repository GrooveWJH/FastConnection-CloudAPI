/**
 * Liveshare module - monitors RTMP livestream status
 */

import { Logger } from './logger.js';
import { DJIBridge } from './bridge.js';

export const Liveshare = {
  // Current livestream state
  state: {
    isStreaming: false,
    lastStatus: null
  },

  // UI elements cache
  elements: {},

  /**
   * Initialize Liveshare module
   */
  init() {
    Logger.log('[直播模块] 初始化', 'info');

    this.cacheElements();

    // Check if module is loaded
    const moduleLoaded = DJIBridge.isModuleLoaded('liveshare');

    if (moduleLoaded) {
      // Set video publish type to hybrid mode
      this.setVideoPublishType('video-demand-aux-manual');

      // Start status monitoring
      this.startStatusPolling();
      Logger.log('[直播模块] 状态监控已启动 (2s)', 'info');
    } else {
      Logger.log('[直播模块] 模块未加载', 'error');
    }
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      statusIndicator: document.getElementById('liveshare-status'),
      infoElement: document.getElementById('liveshare-info')
    };
  },

  /**
   * Helper function to format and log JSON
   */
  logJson(label, data) {
    Logger.log(label, 'info');

    // Parse if string
    let parsed = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        Logger.log(data, 'info');
        return;
      }
    }

    // Pretty print each field
    const printObject = (obj, indent = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          Logger.log(`${indent}${key}:`, 'info');

          // If it's a stringified JSON, parse it first
          if (typeof value === 'string') {
            try {
              const innerParsed = JSON.parse(value);
              printObject(innerParsed, indent + '  ');
              continue;
            } catch (e) {
              // Not JSON, just print as string
            }
          }

          printObject(value, indent + '  ');
        } else {
          Logger.log(`${indent}${key}: ${value}`, 'info');
        }
      }
    };

    printObject(parsed);
  },

  /**
   * Set video publish type (livestream mode)
   */
  setVideoPublishType(mode) {
    if (!DJIBridge.isAvailable() || !DJIBridge.isModuleLoaded('liveshare')) {
      return;
    }

    try {
      const result = window.djiBridge.liveshareSetVideoPublishType(mode);
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;

      if (parsed.code === 0) {
        Logger.log(`[直播] 模式已设为: ${mode}`, 'success');
      } else {
        Logger.log(`[直播] 设置模式失败: ${parsed.message || '未知错误'}`, 'error');
      }
    } catch (error) {
      Logger.log(`[直播] 设置模式错误: ${error.message}`, 'error');
    }
  },

  /**
   * Get current livestream status
   */
  getLiveshareStatus() {
    if (!DJIBridge.isAvailable() || !DJIBridge.isModuleLoaded('liveshare')) {
      return null;
    }

    try {
      const status = window.djiBridge.liveshareGetStatus();
      const parsed = typeof status === 'string' ? JSON.parse(status) : status;
      return parsed;
    } catch (error) {
      Logger.log(`[直播] ERROR: 获取状态失败 - ${error.message}`, 'error');
      return null;
    }
  },

  /**
   * Get current livestream config
   */
  getLiveshareConfig() {
    if (!DJIBridge.isAvailable() || !DJIBridge.isModuleLoaded('liveshare')) {
      return null;
    }

    try {
      const config = window.djiBridge.liveshareGetConfig();
      const parsed = typeof config === 'string' ? JSON.parse(config) : config;
      return parsed;
    } catch (error) {
      return null;
    }
  },

  /**
   * Start status polling (every 2 seconds)
   */
  startStatusPolling() {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
    }

    this.statusPollingInterval = setInterval(() => {
      this.checkStatus();
    }, 2000);
  },

  /**
   * Stop status polling
   */
  stopStatusPolling() {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
    }
  },

  /**
   * Check livestream status
   */
  checkStatus() {
    const statusResult = this.getLiveshareStatus();

    if (!statusResult || !statusResult.data) {
      return;
    }

    // Parse data if it's a string
    const statusData = typeof statusResult.data === 'string'
      ? JSON.parse(statusResult.data)
      : statusResult.data;

    const currentStatus = statusData.status; // 0: 未连接, 1: 已连接服务器, 2: 正在直播

    // Initialize lastStatus on first check (without logging)
    if (this.state.lastStatus === null) {
      this.state.lastStatus = currentStatus;
    }

    // Detect status change (only if status actually changed)
    if (this.state.lastStatus !== currentStatus) {
      this.onStatusChange(currentStatus, statusData);
      this.state.lastStatus = currentStatus;
    }

    // Update UI
    this.updateUI(currentStatus);
  },

  /**
   * Handle status change
   */
  onStatusChange(newStatus, statusData) {
    if (newStatus === 2) {
      // 正在直播
      Logger.log(`[直播] 已开启`, 'success');
      this.state.isStreaming = true;

      // Get and log RTMP URL
      this.logStreamingInfo(statusData);
    } else if (this.state.isStreaming && newStatus < 2) {
      // 直播已关闭
      Logger.log(`[直播] 已关闭`, 'warning');
      this.state.isStreaming = false;
    }
  },

  /**
   * Log streaming information including RTMP URL
   */
  logStreamingInfo(statusData) {
    // Try to get config to extract RTMP URL
    const config = this.getLiveshareConfig();

    if (config && config.data) {
      try {
        const configData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;

        if (configData.type === 2 && configData.params) {
          // Parse params (might be nested JSON string)
          const params = typeof configData.params === 'string'
            ? JSON.parse(configData.params)
            : configData.params;

          if (params.url) {
            Logger.log(`[直播] RTMP: ${params.url}`, 'info');
          }
        }
      } catch (e) {
        // Failed to parse, ignore
      }
    }

    // Log streaming stats
    if (statusData.fps > 0) Logger.log(`[直播] 帧率 ${statusData.fps} fps`, 'info');
    if (statusData.videoBitRate > 0) Logger.log(`[直播] 码率 ${(statusData.videoBitRate / 1000).toFixed(1)} kbps`, 'info');
  },

  /**
   * Get RTMP URL from config
   */
  getRtmpUrl() {
    try {
      const config = this.getLiveshareConfig();
      if (!config || !config.data) return null;

      const configData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;

      if (configData.type === 2 && configData.params) {
        const params = typeof configData.params === 'string'
          ? JSON.parse(configData.params)
          : configData.params;

        return params.url || null;
      }
    } catch (e) {
      return null;
    }
    return null;
  },

  /**
   * Update UI state
   */
  updateUI(status) {
    if (!this.elements.statusIndicator || !this.elements.infoElement) {
      return;
    }

    // Update indicator based on streaming status
    this.elements.statusIndicator.classList.remove('active', 'inactive', 'streaming');

    if (status === 2) {
      // Streaming - blinking green
      this.elements.statusIndicator.classList.add('streaming');

      // Get RTMP URL
      const rtmpUrl = this.getRtmpUrl();

      if (rtmpUrl) {
        this.elements.infoElement.innerHTML = `
          <div style="color: #22c55e;">正在直播</div>
          <div class="rtmp-url-box">${rtmpUrl}</div>
        `;
      } else {
        this.elements.infoElement.textContent = '正在直播';
        this.elements.infoElement.style.color = '#22c55e';
      }
    } else {
      // Not streaming - static green (module loaded)
      this.elements.statusIndicator.classList.add('active');
      this.elements.infoElement.textContent = '已加载';
      this.elements.infoElement.style.color = '#94a3b8';
    }
  },

  /**
   * Cleanup on module unload
   */
  cleanup() {
    this.stopStatusPolling();
  }
};
