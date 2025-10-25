(() => {
  const appConfig = window.APP_CONFIG || {};
  const rawWsPath = typeof appConfig.mqttWsPath === "string" ? appConfig.mqttWsPath : "/mqtt";
  const WS_PATH = rawWsPath.startsWith("/") ? rawWsPath : `/${rawWsPath}`;
  const MQTT_WS_PORT_OVERRIDE = appConfig.mqttWsPort && `${appConfig.mqttWsPort}`.trim() !== "" ? `${appConfig.mqttWsPort}`.trim() : "";
  const DEFAULT_TCP_PORT = "1883";
  const DEFAULT_WS_PORT = MQTT_WS_PORT_OVERRIDE || "8083";
  const PAGE_HOST = window.location.hostname || "127.0.0.1";

  const logsContainer = document.getElementById("logs");
  const connectionInfo = document.getElementById("connection-info");
  const hostInput = document.getElementById("mqtt-host");
  const authModeInputs = Array.from(document.querySelectorAll('input[name="auth-mode"]'));
  const usernameInput = document.getElementById("mqtt-username");
  const passwordInput = document.getElementById("mqtt-password");
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const statusButton = document.getElementById("status-button");
  const testButton = document.getElementById("test-button");

  // 模块状态指示器
  const thingStatusIndicator = document.getElementById("thing-status");
  const thingInfo = document.getElementById("thing-info");
  const liveshareStatusIndicator = document.getElementById("liveshare-status");
  const liveshareInfo = document.getElementById("liveshare-info");

  const APP_ID = 171440;
  const LICENSE =
    "krC5HsEFLzVC8xkKM38JCcSxNEQvsQ/7IoiHEJRaulGiPQildia+n/+bF+SO21pk1JTS8CfaNS+fn8qt+17i3Y7uoqtBOOsdtLUQhqPMb0DVea0dmZ7oZhdP2CuQrQSn1bobS3pQ+MW2eEOq0XCcCkpo+HxAC1r5/33yEDxc6NE=";
  const APP_KEY = "b57ab1ee70f0a78e1797c592742e7d4";

  let isConnected = false;
  let lastCredentials = null;

  const STORAGE_KEY = "dji_rc_login_state";

  function loadStoredState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  function saveStoredState(patch) {
    try {
      const current = loadStoredState();
      const next = { ...current, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      // ignore storage errors
    }
  }

  function log(message, type = "info") {
    const entry = document.createElement("div");
    entry.className = `log-item log-${type}`;
    const now = new Date().toLocaleTimeString();
    entry.textContent = `[${now}] ${message}`;
    logsContainer.appendChild(entry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  function preloadModules() {
    if (!window.djiBridge) {
      log("[预加载] 未检测到 DJI RC Cloud API 环境，跳过模块预加载", "error");
      return;
    }

    try {
      // 1. 验证许可证
      log("[预加载] 开始验证平台许可证", "info");
      window.djiBridge.platformVerifyLicense(APP_ID, APP_KEY, LICENSE);
      const verified = window.djiBridge.platformIsVerified();
      log(`[预加载] 平台验证状态: ${verified}`, verified ? "success" : "error");

      if (!verified) {
        log("[预加载] 许可证验证失败，跳过模块加载", "error");
        return;
      }

      // 2. 从存储中获取配置
      const stored = loadStoredState();
      const creds = getSelectedCredentials();

      // 检查是否有有效的配置
      const hasValidConfig = creds.username && creds.password;
      if (!hasValidConfig) {
        log("[预加载] 未找到有效的账号密码配置，使用默认值", "info");
      }

      // 3. 加载 Thing 模块（不连接）
      const thingParams = JSON.stringify({
        host: creds.tcpUrl,
        connectCallback: "reg_callback",
        username: creds.username || "",
        password: creds.password || "",
      });

      log("[预加载] 加载设备上云模块...", "info");
      const thingResult = window.djiBridge.platformLoadComponent("thing", thingParams);

      try {
        const thingResultObj = JSON.parse(thingResult);
        if (thingResultObj.code === 0) {
          log(`[预加载] 设备上云模块加载成功`, "success");
        } else {
          log(`[预加载] 设备上云模块加载失败: ${thingResultObj.message || '未知错误'}`, "error");
        }
      } catch (e) {
        log(`[预加载] 设备上云模块加载结果: ${thingResult}`, "success");
      }

      // 4. 加载 Liveshare 模块
      const liveshareParams = JSON.stringify({
        videoPublishType: "video-on-demand",
        statusCallback: "liveshare_callback"
      });

      log("[预加载] 加载直播模块...", "info");
      const liveshareResult = window.djiBridge.platformLoadComponent("liveshare", liveshareParams);

      try {
        const liveshareResultObj = JSON.parse(liveshareResult);
        if (liveshareResultObj.code === 0) {
          log(`[预加载] 直播模块加载成功`, "success");
        } else {
          log(`[预加载] 直播模块加载失败: ${liveshareResultObj.message || '未知错误'}`, "error");
        }
      } catch (e) {
        log(`[预加载] 直播模块加载结果: ${liveshareResult}`, "success");
      }

      // 5. 延迟检查模块状态
      setTimeout(() => {
        log("[预加载] 检查模块加载状态", "info");
        checkModuleStatus();
      }, 500);

    } catch (error) {
      log(`[预加载] 模块预加载出错: ${error.message}`, "error");
    }
  }

  function updateModuleStatus(moduleName, isLoaded, additionalInfo = "") {
    let statusIndicator, infoElement;

    if (moduleName === "thing") {
      statusIndicator = thingStatusIndicator;
      infoElement = thingInfo;
    } else if (moduleName === "liveshare") {
      statusIndicator = liveshareStatusIndicator;
      infoElement = liveshareInfo;
    } else {
      return;
    }

    if (isLoaded) {
      statusIndicator.classList.remove("inactive");
      statusIndicator.classList.add("active");
      infoElement.textContent = additionalInfo || "已加载";
      infoElement.style.color = "#86efac";
    } else {
      statusIndicator.classList.remove("active");
      statusIndicator.classList.add("inactive");
      infoElement.textContent = additionalInfo || "未加载";
      infoElement.style.color = "#94a3b8";
    }
  }

  function checkModuleStatus() {
    if (!window.djiBridge) {
      log("[模块检查] 未检测到 DJI RC Cloud API 环境", "error");
      updateModuleStatus("thing", false, "环境未就绪");
      updateModuleStatus("liveshare", false, "环境未就绪");
      return;
    }

    try {
      // 检查设备上云模块
      const thingLoaded = window.djiBridge.platformIsComponentLoaded("thing");
      const thingLoadedBool = thingLoaded === true || thingLoaded === "true" || thingLoaded === 1;

      if (thingLoadedBool) {
        const thingState = window.djiBridge.thingGetConnectState();
        const connected = thingState === true || thingState === 1;
        updateModuleStatus("thing", true, connected ? "已连接" : "已加载，未连接");
        log(`[模块检查] 设备上云模块: 已加载 (连接状态: ${connected ? "已连接" : "未连接"})`, "info");
      } else {
        updateModuleStatus("thing", false);
        log("[模块检查] 设备上云模块: 未加载", "info");
      }

      // 检查直播模块
      const liveshareLoaded = window.djiBridge.platformIsComponentLoaded("liveshare");
      const liveshareLoadedBool = liveshareLoaded === true || liveshareLoaded === "true" || liveshareLoaded === 1;

      if (liveshareLoadedBool) {
        try {
          const liveshareConfig = window.djiBridge.liveshareGetConfig();
          let configInfo = "已加载";
          if (liveshareConfig) {
            try {
              const config = JSON.parse(liveshareConfig);
              if (config && config.data) {
                const typeNames = {0: "未知", 1: "声网", 2: "RTMP", 3: "RTSP", 4: "GB28181"};
                configInfo = `已加载 (${typeNames[config.data.type] || "未知类型"})`;
              }
            } catch (e) {
              // 解析失败，使用默认信息
            }
          }
          updateModuleStatus("liveshare", true, configInfo);
          log(`[模块检查] 直播模块: ${configInfo}`, "info");
        } catch (err) {
          updateModuleStatus("liveshare", true, "已加载");
          log("[模块检查] 直播模块: 已加载", "info");
        }
      } else {
        updateModuleStatus("liveshare", false);
        log("[模块检查] 直播模块: 未加载", "info");
      }
    } catch (error) {
      log(`[模块检查] 检查模块状态时出错: ${error.message}`, "error");
    }
  }

  function parseHostFromUrl(url) {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/^[a-z]+:\/\/([^/]+)/i);
    return match ? match[1] : null;
  }

  function defaultHostDisplay() {
    const candidates = [appConfig.mqttTcpUrl, appConfig.mqttWsUrl];
    for (const raw of candidates) {
      const hostPart = parseHostFromUrl(raw);
      if (hostPart) return hostPart;
    }
    return PAGE_HOST;
  }

  function computeEndpoints(raw) {
    let trimmed = (raw || "").trim();
    let secure = false;
    let hostPart = PAGE_HOST;
    let tcpPort = DEFAULT_TCP_PORT;
    let wsPort = DEFAULT_WS_PORT;

    if (trimmed) {
      const schemeMatch = trimmed.match(/^([a-z]+):\/\/(.+)$/i);
      if (schemeMatch) {
        const scheme = schemeMatch[1].toLowerCase();
        trimmed = schemeMatch[2];
        if (scheme === "ssl" || scheme === "mqtts" || scheme === "wss") {
          secure = true;
        }
      }
      const slashIdx = trimmed.indexOf("/");
      if (slashIdx >= 0) {
        trimmed = trimmed.slice(0, slashIdx);
      }
      if (trimmed) {
        hostPart = trimmed;
      }
    }

    if (hostPart.includes(":")) {
      const [hostOnly, portPart] = hostPart.split(":");
      hostPart = hostOnly || PAGE_HOST;
      if (portPart) {
        tcpPort = portPart;
      }
    }

    if (secure) {
      if (tcpPort === DEFAULT_TCP_PORT) {
        tcpPort = "8883";
      }
      wsPort = MQTT_WS_PORT_OVERRIDE || "8084";
    } else if (MQTT_WS_PORT_OVERRIDE) {
      wsPort = MQTT_WS_PORT_OVERRIDE;
    }

    const tcpScheme = secure ? "ssl" : "tcp";
    const wsScheme = secure ? "wss" : "ws";

    return {
      hostDisplay: `${hostPart}${tcpPort ? `:${tcpPort}` : ""}`,
      tcpUrl: `${tcpScheme}://${hostPart}:${tcpPort}`,
      wsUrl: `${wsScheme}://${hostPart}:${wsPort}${WS_PATH}`,
      secure,
    };
  }

  function getSelectedCredentials() {
    const authMode = authModeInputs.find((input) => input.checked)?.value || "credential";
    const endpoints = computeEndpoints(hostInput.value);
    const isAnonymous = authMode === "anonymous";
    return {
      tcpUrl: endpoints.tcpUrl,
      wsUrl: endpoints.wsUrl,
      hostDisplay: endpoints.hostDisplay,
      secure: endpoints.secure,
      isAnonymous,
      username: isAnonymous ? "" : usernameInput.value.trim(),
      password: isAnonymous ? "" : passwordInput.value,
    };
  }

  function updateConnectionInfo() {
    const creds = getSelectedCredentials();
    const statusClass = isConnected ? "status-connected" : "status-disconnected";
    const statusText = isConnected ? "已连接" : "未连接";
    const accountText = creds.isAnonymous ? "匿名连接" : creds.username || "(未填写)";
    const passwordText = creds.isAnonymous ? "（匿名）" : creds.password ? "******" : "(未填写)";

    connectionInfo.innerHTML = `
      <div style="margin-bottom: calc(var(--space) * 0.3);">
        <strong>Cloud API MQTT 目标</strong>
        <span class="status-indicator ${statusClass}"></span>
        <span>${statusText}</span>
      </div>
      <div><strong>TCP 地址:</strong> ${creds.tcpUrl}</div>
      <div><strong>WebSocket 地址:</strong> ${creds.wsUrl}</div>
      <div><strong>账号:</strong> ${accountText}</div>
      <div><strong>密码:</strong> ${passwordText}</div>
    `;
  }

  function testMqttConnection(creds, { label = "MQTT 测试", timeoutMs = 1000 } = {}) {
    return new Promise((resolve) => {
      if (!creds.isAnonymous && (!creds.username || !creds.password)) {
        log(`[MQTT 测试] 账号或密码为空，无法测试连接`, "error");
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

      log(`[${label}] 正在检测 MQTT 连接 (clientId: ${clientId})`, "info");

      let finished = false;
      const tempClient = mqtt.connect(creds.wsUrl, options);

      const done = (ok, message, type = ok ? "success" : "error") => {
        if (finished) return;
        finished = true;
        if (message) {
          log(message, type);
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

  function initDefaults() {
    const stored = loadStoredState();
    hostInput.value = stored.host?.trim() || defaultHostDisplay();

    // 默认记住账号密码，从存储中读取
    usernameInput.value = stored.username || appConfig.mqttUsername || "admin";
    passwordInput.value = stored.password || appConfig.mqttPassword || "public";

    const defaultAnonymous = !usernameInput.value && !passwordInput.value;
    authModeInputs.forEach((input) => {
      input.checked = input.value === (defaultAnonymous ? "anonymous" : "credential");
    });

    lastCredentials = getSelectedCredentials();
    updateConnectionInfo();
    log(`[初始化] Cloud API 许可证状态: ${window.djiBridge ? window.djiBridge.platformIsVerified() : "未检测到 DJI RC Cloud API"}`, "info");

    // 预加载模块（许可证验证 + 模块加载）
    preloadModules();
  }

  authModeInputs.forEach((input) =>
    input.addEventListener("change", () => {
      updateConnectionInfo();
    }),
  );
  usernameInput.addEventListener("input", updateConnectionInfo);
  passwordInput.addEventListener("input", updateConnectionInfo);
  hostInput.addEventListener("input", updateConnectionInfo);
  hostInput.addEventListener("input", () => {
    saveStoredState({ host: hostInput.value.trim() });
  });

  testButton.addEventListener("click", () => {
    const creds = getSelectedCredentials();
    lastCredentials = creds;
    testMqttConnection(creds, { label: "手动测试", timeoutMs: 1000 });
  });

  loginButton.addEventListener("click", async () => {
    log("[登录] 开始登录流程", "info");
    const creds = getSelectedCredentials();
    lastCredentials = creds;

    // 默认记住账号密码
    saveStoredState({
      username: creds.username,
      password: creds.password,
    });

    if (!window.djiBridge) {
      log("[登录] 未检测到 DJI RC Cloud API 环境，请在遥控器内置浏览器中访问此页面", "error");
      return;
    }

    if (!creds.isAnonymous && (!creds.username || !creds.password)) {
      log("[登录] 账号或密码为空，请填写后再试", "error");
      return;
    }

    try {
      const ok = await testMqttConnection(creds, { label: "登录前检测", timeoutMs: 1000 });
      if (!ok) {
        log("[登录] MQTT 检测未通过，停止登录流程", "error");
        return;
      }

      // 检查模块是否已预加载
      const thingLoaded = window.djiBridge.platformIsComponentLoaded("thing");
      const liveshareLoaded = window.djiBridge.platformIsComponentLoaded("liveshare");

      // 如果模块未加载，则加载（降级方案）
      if (!thingLoaded) {
        log("[登录] 设备上云模块未加载，开始加载", "info");
        const registerParams = JSON.stringify({
          host: creds.tcpUrl,
          connectCallback: "reg_callback",
          username: creds.username,
          password: creds.password,
        });
        window.djiBridge.platformLoadComponent("thing", registerParams);
      }

      if (!liveshareLoaded) {
        log("[登录] 直播模块未加载，开始加载", "info");
        const liveshareParams = JSON.stringify({
          videoPublishType: "video-on-demand",
          statusCallback: "liveshare_callback"
        });
        window.djiBridge.platformLoadComponent("liveshare", liveshareParams);
      }

      // 建立 Thing 连接
      log(`[登录] 开始连接设备上云模块`, "info");
      const connectResult = window.djiBridge.thingConnect(creds.username, creds.password, "reg_callback");

      try {
        const connectResultObj = JSON.parse(connectResult);
        if (connectResultObj.code === 0) {
          log(`[登录] Thing 连接成功`, "success");
        } else {
          log(`[登录] Thing 连接失败: ${connectResultObj.message || '未知错误'}`, "error");
        }
      } catch (e) {
        log(`[登录] Thing 连接结果: ${connectResult}`, "info");
      }

      log(`[登录] Thing 连接状态: ${window.djiBridge.thingGetConnectState()}`, "info");

      isConnected = true;
      updateConnectionInfo();

      // 更新模块状态
      setTimeout(() => {
        checkModuleStatus();
      }, 500);
    } catch (error) {
      log(`[登录] DJI Bridge 操作错误: ${error.message}`, "error");
    }
  });

  logoutButton.addEventListener("click", () => {
    log("[登出] 开始断开流程", "info");
    if (!window.djiBridge) {
      log("[登出] 未检测到 DJI RC Cloud API 环境，跳过组件卸载", "error");
      isConnected = false;
      updateConnectionInfo();
      checkModuleStatus();
      return;
    }

    try {
      // 卸载直播模块
      log("[登出] 卸载直播模块...", "info");
      const liveshareUnloadResult = window.djiBridge.platformUnloadComponent("liveshare");

      try {
        const liveshareUnloadObj = JSON.parse(liveshareUnloadResult);
        if (liveshareUnloadObj.code === 0) {
          log(`[登出] 直播模块卸载成功`, "success");
        } else {
          log(`[登出] 直播模块卸载失败: ${liveshareUnloadObj.message || '未知错误'}`, "error");
        }
      } catch (e) {
        log(`[登出] 直播模块卸载结果: ${liveshareUnloadResult}`, "info");
      }

      // 卸载设备上云模块
      log("[登出] 卸载设备上云模块...", "info");
      const thingUnloadResult = window.djiBridge.platformUnloadComponent("thing");

      try {
        const thingUnloadObj = JSON.parse(thingUnloadResult);
        if (thingUnloadObj.code === 0) {
          log(`[登出] 设备上云模块卸载成功`, "success");
        } else {
          log(`[登出] 设备上云模块卸载失败: ${thingUnloadObj.message || '未知错误'}`, "error");
        }
      } catch (e) {
        log(`[登出] 设备上云模块卸载结果: ${thingUnloadResult}`, "info");
      }

      if (window.djiBridge.thingDisconnect) {
        try {
          window.djiBridge.thingDisconnect();
        } catch (err) {
          // ignore optional disconnect errors
        }
      }
      isConnected = false;
      updateConnectionInfo();

      // 更新模块状态
      setTimeout(() => {
        checkModuleStatus();
      }, 300);
    } catch (error) {
      log(`[登出] DJI Bridge 注销错误: ${error.message}`, "error");
    }
  });

  statusButton.addEventListener("click", () => {
    log("[状态查询] 开始状态检查", "info");
    log(`[状态查询] MQTT 连接状态: ${isConnected ? "已连接" : "未连接"}`, "info");

    if (!window.djiBridge) {
      log("[状态查询] 未检测到 DJI RC Cloud API 环境，无法查询设备状态", "error");
      isConnected = false;
      updateConnectionInfo();
      checkModuleStatus();
      return;
    }

    try {
      log(`[状态查询] 组件加载状态: ${window.djiBridge.platformIsComponentLoaded("thing")}`, "info");
      const thingState = window.djiBridge.thingGetConnectState();
      log(`[状态查询] Thing 状态: ${thingState}`, "info");
      log(`[状态查询] 平台验证状态: ${window.djiBridge.platformIsVerified()}`, "info");
      isConnected = thingState === true || thingState === 1;
      updateConnectionInfo();

      // 更新模块状态
      checkModuleStatus();
    } catch (error) {
      log(`[状态查询] DJI Bridge 状态查询错误: ${error.message}`, "error");
    }
  });

  function reg_callback() {
    log(`[回调] DJI Bridge 连接回调触发，参数: ${Array.from(arguments).join(", ")}`, "success");
    isConnected = true;
    updateConnectionInfo();
    checkModuleStatus();
  }

  function liveshare_callback(status) {
    try {
      const statusObj = typeof status === "string" ? JSON.parse(status) : status;
      log(`[直播回调] 直播状态变化: ${JSON.stringify(statusObj)}`, "info");

      // 更新直播模块状态
      if (statusObj && statusObj.status !== undefined) {
        const statusNames = {0: "未连接", 1: "已连接服务器", 2: "正在直播"};
        const statusText = statusNames[statusObj.status] || "未知状态";
        const isActive = statusObj.status >= 1;

        updateModuleStatus("liveshare", isActive, statusText);
      }
    } catch (error) {
      log(`[直播回调] 解析状态出错: ${error.message}`, "error");
    }
  }

  window.addEventListener("load", initDefaults);
  window.reg_callback = reg_callback;
  window.liveshare_callback = liveshare_callback;
})();
