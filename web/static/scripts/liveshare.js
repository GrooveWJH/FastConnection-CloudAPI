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

  // Livestream player state
  playerState: {
    isOpen: false,
    currentUrl: null,
    currentFps: 0,
    currentWidth: 0,                // Video width
    currentHeight: 0,               // Video height
    lastDisplayedFps: -1,           // Last displayed FPS value
    lastDisplayedWidth: -1,         // Last displayed width
    lastDisplayedHeight: -1         // Last displayed height
  },

  /**
   * Initialize Liveshare module
   */
  init() {
    Logger.log('[直播模块] 初始化', 'info');

    this.cacheElements();

    // Initially hide the show livestream button
    if (this.elements.showLivestreamButton) {
      this.elements.showLivestreamButton.style.display = 'none';
    }

    // Check if module is loaded
    const moduleLoaded = DJIBridge.isModuleLoaded('liveshare');

    if (moduleLoaded) {
      // Set video publish type to hybrid mode
      this.setVideoPublishType('video-demand-aux-manual');

      // Start status monitoring
      this.startStatusPolling();
      Logger.log('[直播模块] 状态监控已启动 (4s)', 'info');
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
      infoElement: document.getElementById('liveshare-info'),
      livestreamContainer: document.getElementById('livestream-container'),
      livestreamPlayer: document.getElementById('livestream-player'),
      closeLivestreamButton: document.getElementById('close-livestream-button'),
      showLivestreamButton: document.getElementById('show-livestream-button'),
      fpsDisplay: document.getElementById('fps-display'),
      resolutionDisplay: document.getElementById('resolution-display')
    };

    // Elements cached successfully

    // Bind close button event
    if (this.elements.closeLivestreamButton) {
      this.elements.closeLivestreamButton.addEventListener('click', () => this.closeLivestream());
    }

    // Bind show button event
    if (this.elements.showLivestreamButton) {
      this.elements.showLivestreamButton.addEventListener('click', () => this.openLivestream());
    }
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
   * Start status polling (every 4 seconds to reduce resource load)
   */
  startStatusPolling() {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
    }

    this.statusPollingInterval = setInterval(() => {
      this.checkStatus();
    }, 4000);
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
    try {
      const statusResult = this.getLiveshareStatus();

      if (!statusResult || !statusResult.data) {
        return;
      }

      // Parse data if it's a string
      const statusData = typeof statusResult.data === 'string'
        ? JSON.parse(statusResult.data)
        : statusResult.data;

      const currentStatus = statusData.status; // 0: 未连接, 1: 已连接服务器, 2: 正在直播

      // Get config once to avoid redundant API calls
      const config = this.getLiveshareConfig();

      // Update FPS
      if (statusData.fps !== undefined) {
        this.playerState.currentFps = statusData.fps;
      }

      // Update resolution (try multiple possible field names)
      if (statusData.videoWidth !== undefined && statusData.videoHeight !== undefined) {
        this.playerState.currentWidth = statusData.videoWidth;
        this.playerState.currentHeight = statusData.videoHeight;
      } else if (statusData.width !== undefined && statusData.height !== undefined) {
        this.playerState.currentWidth = statusData.width;
        this.playerState.currentHeight = statusData.height;
      }

      // Update stats display if player is open
      if (this.playerState.isOpen) {
        this.updateStatsDisplay();
      }

      // Initialize lastStatus on first check (without logging)
      if (this.state.lastStatus === null) {
        this.state.lastStatus = currentStatus;
      }

      // Detect status change (only if status actually changed)
      if (this.state.lastStatus !== currentStatus) {
        this.onStatusChange(currentStatus, statusData, config);
        this.state.lastStatus = currentStatus;
      }

      // Update UI (pass config to avoid redundant call)
      this.updateUI(currentStatus, config);
    } catch (error) {
      // Silently catch errors to prevent polling from breaking
      // Only log if it's a critical error
      if (error.message && !error.message.includes('JSON')) {
        Logger.log(`[直播模块] 状态检查错误: ${error.message}`, 'error');
      }
    }
  },

  /**
   * Handle status change
   */
  onStatusChange(newStatus, statusData, config) {
    if (newStatus === 2) {
      // 正在直播
      Logger.log(`[直播] 已开启`, 'success');
      this.state.isStreaming = true;

      // Get and log RTMP URL (use cached config)
      this.logStreamingInfo(statusData, config);
    } else if (this.state.isStreaming && newStatus < 2) {
      // 直播已关闭
      Logger.log(`[直播] 已关闭`, 'warning');
      this.state.isStreaming = false;
    }
  },

  /**
   * Log streaming information including RTMP URL
   */
  logStreamingInfo(statusData, config) {
    // Use cached config to avoid redundant API call
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

    // Stats are now displayed in UI only, not logged
  },

  /**
   * Get RTMP URL from config
   */
  getRtmpUrl(config = null) {
    try {
      // Use provided config or fetch new one
      const configToUse = config || this.getLiveshareConfig();
      if (!configToUse || !configToUse.data) return null;

      const configData = typeof configToUse.data === 'string' ? JSON.parse(configToUse.data) : configToUse.data;

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
   * Convert RTMP URL to WebRTC HTTP URL
   * rtmp://192.168.31.73:1935/live/drone001 -> http://192.168.31.73:8888/live/drone001
   */
  convertRtmpToHttp(rtmpUrl) {
    if (!rtmpUrl) return null;

    try {
      // Replace rtmp:// with http://
      const httpUrl = rtmpUrl.replace('rtmp://', 'http://');
      const url = new URL(httpUrl);

      // Change port from 1935 to 8888
      url.port = '8888';

      return url.toString();
    } catch (e) {
      Logger.log(`[直播] URL转换失败: ${e.message}`, 'error');
      return null;
    }
  },

  /**
   * Open livestream player
   */
  openLivestream() {
    const rtmpUrl = this.getRtmpUrl();

    if (!rtmpUrl) {
      Logger.log('[直播] 无法获取RTMP URL', 'error');
      return;
    }

    const httpUrl = this.convertRtmpToHttp(rtmpUrl);

    if (!httpUrl) {
      Logger.log('[直播] URL转换失败', 'error');
      return;
    }

    // Set iframe src
    if (this.elements.livestreamPlayer) {
      this.elements.livestreamPlayer.src = httpUrl;
    }

    // Show container
    if (this.elements.livestreamContainer) {
      this.elements.livestreamContainer.style.display = 'block';

      // Update stats display
      this.updateStatsDisplay();

      // Smooth scroll to livestream
      setTimeout(() => {
        this.elements.livestreamContainer.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }

    this.playerState.isOpen = true;
    this.playerState.currentUrl = httpUrl;

    Logger.log(`[直播] 播放器已打开: ${httpUrl}`, 'success');
  },

  /**
   * Update stats display (FPS and resolution) - only when values change
   */
  updateStatsDisplay() {
    // Only update DOM if values have changed
    if (this.elements.fpsDisplay && this.playerState.currentFps !== this.playerState.lastDisplayedFps) {
      const fps = this.playerState.currentFps > 0 ? `${this.playerState.currentFps} fps` : '-- fps';
      this.elements.fpsDisplay.textContent = fps;
      this.playerState.lastDisplayedFps = this.playerState.currentFps;
    }

    if (this.elements.resolutionDisplay &&
        (this.playerState.currentWidth !== this.playerState.lastDisplayedWidth ||
         this.playerState.currentHeight !== this.playerState.lastDisplayedHeight)) {
      const resolution = (this.playerState.currentWidth > 0 && this.playerState.currentHeight > 0)
        ? `${this.playerState.currentWidth}x${this.playerState.currentHeight}`
        : '--';
      this.elements.resolutionDisplay.textContent = resolution;
      this.playerState.lastDisplayedWidth = this.playerState.currentWidth;
      this.playerState.lastDisplayedHeight = this.playerState.currentHeight;
    }
  },

  /**
   * Close livestream player
   */
  closeLivestream() {
    // Clear iframe src
    if (this.elements.livestreamPlayer) {
      this.elements.livestreamPlayer.src = '';
    }

    // Hide container
    if (this.elements.livestreamContainer) {
      this.elements.livestreamContainer.style.display = 'none';
    }

    this.playerState.isOpen = false;
    this.playerState.currentUrl = null;

    Logger.log('[直播] 播放器已关闭', 'info');

    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Update UI state
   */
  updateUI(status, config = null) {
    if (!this.elements.statusIndicator || !this.elements.infoElement) {
      return;
    }

    // Update indicator based on streaming status
    this.elements.statusIndicator.classList.remove('active', 'inactive', 'streaming');

    if (status === 2) {
      // Streaming - blinking green
      this.elements.statusIndicator.classList.add('streaming');

      // Get RTMP URL (use cached config)
      const rtmpUrl = this.getRtmpUrl(config);

      if (rtmpUrl) {
        this.elements.infoElement.innerHTML = `
          <div style="color: #22c55e;">正在直播</div>
          <div class="rtmp-url-box">${rtmpUrl}</div>
        `;
      } else {
        this.elements.infoElement.textContent = '正在直播';
        this.elements.infoElement.style.color = '#22c55e';
      }

      // Show "显示直播画面" button
      if (this.elements.showLivestreamButton) {
        this.elements.showLivestreamButton.style.display = 'inline-flex';
      }
    } else {
      // Not streaming - static green (module loaded)
      this.elements.statusIndicator.classList.add('active');
      this.elements.infoElement.textContent = '已加载';
      this.elements.infoElement.style.color = '#86efac';

      // Hide "显示直播画面" button
      if (this.elements.showLivestreamButton) {
        this.elements.showLivestreamButton.style.display = 'none';
      }
    }
  },

  /**
   * Cleanup on module unload
   */
  cleanup() {
    this.stopStatusPolling();
    this.closeLivestream();
  }
};
