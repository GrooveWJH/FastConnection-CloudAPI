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
    usernameInput.value = appConfig.mqttUsername || "admin";
    passwordInput.value = appConfig.mqttPassword || "public";

    const defaultAnonymous = !usernameInput.value && !passwordInput.value;
    authModeInputs.forEach((input) => {
      input.checked = input.value === (defaultAnonymous ? "anonymous" : "credential");
    });

    lastCredentials = getSelectedCredentials();
    updateConnectionInfo();
    log(`[初始化] Cloud API 许可证状态: ${window.djiBridge ? window.djiBridge.platformIsVerified() : "未检测到 DJI RC Cloud API"}`, "info");
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

      log("[登录] 开始验证平台许可证", "info");
      window.djiBridge.platformVerifyLicense(APP_ID, APP_KEY, LICENSE);
      log(`[登录] 平台验证状态: ${window.djiBridge.platformIsVerified()}`, "info");

      const registerParams = JSON.stringify({
        host: creds.tcpUrl,
        connectCallback: "reg_callback",
        username: creds.username,
        password: creds.password,
      });

      log(`[登录] 加载 thing 组件: ${window.djiBridge.platformLoadComponent("thing", registerParams)}`, "info");
      log(`[登录] 当前状态: ${window.djiBridge.thingGetConnectState()}`, "info");

      log(`[登录] 开始连接 thing: ${window.djiBridge.thingConnect(creds.username, creds.password, "reg_callback")}`, "info");
      log(`[登录] Thing 连接状态: ${window.djiBridge.thingGetConnectState()}`, "info");
      isConnected = true;
      updateConnectionInfo();
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
      return;
    }

    try {
      log(`[登出] 卸载组件: ${window.djiBridge.platformUnloadComponent("thing")}`, "info");
      if (window.djiBridge.thingDisconnect) {
        try {
          window.djiBridge.thingDisconnect();
        } catch (err) {
          // ignore optional disconnect errors
        }
      }
      isConnected = false;
      updateConnectionInfo();
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
      return;
    }

    try {
      log(`[状态查询] 组件加载状态: ${window.djiBridge.platformIsComponentLoaded("thing")}`, "info");
      const thingState = window.djiBridge.thingGetConnectState();
      log(`[状态查询] Thing 状态: ${thingState}`, "info");
      log(`[状态查询] 平台验证状态: ${window.djiBridge.platformIsVerified()}`, "info");
      isConnected = thingState === true || thingState === 1;
      updateConnectionInfo();
    } catch (error) {
      log(`[状态查询] DJI Bridge 状态查询错误: ${error.message}`, "error");
    }
  });

  function reg_callback() {
    log(`[回调] DJI Bridge 连接回调触发，参数: ${Array.from(arguments).join(", ")}`, "success");
    isConnected = true;
    updateConnectionInfo();
  }

  window.addEventListener("load", initDefaults);
  window.reg_callback = reg_callback;
})();
