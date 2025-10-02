/**
 * AI简历填写插件 - Content Script 主入口
 * 模块化架构 - 视觉驱动表单分析
 */

(async function() {
  'use strict';

  console.log('🚀 [ContentScript] AI简历填写插件启动...');

  // 全局变量
  let app = null;
  let isInitialized = false;

  /**
   * 加载所有必需的模块
   */
  async function loadModules() {
    try {
      console.log('[ContentScript] 开始加载模块...');

      // 按依赖顺序加载模块
      const modules = [
        // 基础工具模块
        'modules/utils/EventBus.js',
        'modules/utils/DOMUtils.js',

        // 核心模块
        'modules/core/ConfigManager.js',
        'modules/visual/VisualAnalyzer.js',
        'modules/core/FormAnalyzer.js',
        'modules/core/AnalysisMode.js',
        'modules/visual/DebugOverlay.js',

        // 主应用模块
        'modules/core/ResumeFillerApp.js'
      ];

      for (const modulePath of modules) {
        await loadScript(modulePath);
      }

      console.log('✅ [ContentScript] 所有模块加载完成');

    } catch (error) {
      console.error('❌ [ContentScript] 模块加载失败:', error);
      throw error;
    }
  }

  /**
   * 动态加载脚本
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(src);
      script.type = 'text/javascript';

      script.onload = () => {
        console.log(`[ContentScript] 模块加载成功: ${src}`);
        resolve();
      };

      script.onerror = (error) => {
        console.error(`[ContentScript] 模块加载失败: ${src}`, error);
        reject(new Error(`Failed to load module: ${src}`));
      };

      (document.head || document.documentElement).appendChild(script);

      // 加载完成后移除script标签，保持DOM整洁
      script.onload = () => {
        script.remove();
        resolve();
      };
    });
  }

  /**
   * 初始化应用
   */
  async function initializeApp() {
    try {
      console.log('[ContentScript] 初始化应用...');

      // 检查必需的类是否已加载
      if (!window.ResumeFillerApp) {
        throw new Error('ResumeFillerApp 类未找到');
      }

      // 创建应用实例
      app = new window.ResumeFillerApp();

      // 初始化应用
      await app.init();

      isInitialized = true;
      console.log('✅ [ContentScript] 应用初始化完成');

      // 发送初始化完成消息到background script
      chrome.runtime.sendMessage({
        action: 'contentScriptReady',
        data: {
          website: window.location.href,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('❌ [ContentScript] 应用初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置消息监听器
   */
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('[ContentScript] 收到消息:', request);

      // 异步处理消息
      handleMessage(request, sender)
        .then(response => {
          sendResponse(response);
        })
        .catch(error => {
          console.error('[ContentScript] 消息处理失败:', error);
          sendResponse({
            success: false,
            error: error.message
          });
        });

      // 返回true表示将异步发送响应
      return true;
    });
  }

  /**
   * 处理来自popup和background的消息
   */
  async function handleMessage(request, sender) {
    if (!isInitialized || !app) {
      return {
        success: false,
        error: '应用未初始化'
      };
    }

    try {
      switch (request.action) {
        case 'analyzeForm':
          return await handleAnalyzeForm(request.data);

        case 'fillForm':
          return await handleFillForm(request.data);

        case 'analyzeAndFill':
          return await handleAnalyzeAndFill(request.data);

        case 'getStatus':
          return await handleGetStatus();

        case 'switchMode':
          return await handleSwitchMode(request.data);

        case 'stopAll':
          return await handleStopAll();

        case 'reset':
          return await handleReset();

        case 'exportDebug':
          return await handleExportDebug();

        case 'toggleDebugOverlay':
          return await handleToggleDebugOverlay();

        default:
          return {
            success: false,
            error: `未知的操作: ${request.action}`
          };
      }
    } catch (error) {
      console.error(`[ContentScript] 处理 ${request.action} 失败:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理表单分析请求
   */
  async function handleAnalyzeForm(data) {
    try {
      const result = await app.analyzeForm();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理表单填写请求
   */
  async function handleFillForm(data) {
    try {
      const result = await app.fillForm(data?.analysisResult);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理分析+填写请求
   */
  async function handleAnalyzeAndFill(data) {
    try {
      const result = await app.analyzeAndFill();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理状态查询请求
   */
  async function handleGetStatus() {
    try {
      const status = app.getAppStatus();
      const performanceStats = app.getPerformanceStats();

      return {
        success: true,
        data: {
          status: status,
          performanceStats: performanceStats
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理模式切换请求
   */
  async function handleSwitchMode(data) {
    try {
      if (!data || !data.mode) {
        throw new Error('缺少模式参数');
      }

      await app.switchAnalysisMode(data.mode);
      return {
        success: true,
        data: {
          currentMode: data.mode
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理停止所有操作请求
   */
  async function handleStopAll() {
    try {
      app.stopAll();
      return {
        success: true,
        data: {
          message: '所有操作已停止'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理重置请求
   */
  async function handleReset() {
    try {
      app.reset();
      return {
        success: true,
        data: {
          message: '应用状态已重置'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理导出调试信息请求
   */
  async function handleExportDebug() {
    try {
      const debugInfo = app.exportDebugInfo();
      return {
        success: true,
        data: debugInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理切换调试覆盖层请求
   */
  async function handleToggleDebugOverlay() {
    try {
      if (window.debugOverlay) {
        window.debugOverlay.toggle();
        return {
          success: true,
          data: {
            visible: window.debugOverlay.isVisible
          }
        };
      } else {
        return {
          success: false,
          error: '调试覆盖层未启用'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 设置错误处理
   */
  function setupErrorHandling() {
    // 全局错误处理
    window.addEventListener('error', (event) => {
      console.error('[ContentScript] 全局错误:', event.error);

      // 发送错误报告到background script
      chrome.runtime.sendMessage({
        action: 'reportError',
        data: {
          error: event.error.message,
          stack: event.error.stack,
          website: window.location.href,
          timestamp: Date.now()
        }
      });
    });

    // 未处理的Promise错误
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[ContentScript] 未处理的Promise错误:', event.reason);

      chrome.runtime.sendMessage({
        action: 'reportError',
        data: {
          error: event.reason.message || String(event.reason),
          type: 'unhandledrejection',
          website: window.location.href,
          timestamp: Date.now()
        }
      });
    });
  }

  /**
   * 检查环境兼容性
   */
  function checkCompatibility() {
    const requiredFeatures = [
      'chrome.runtime',
      'chrome.storage',
      'MutationObserver',
      'Promise',
      'fetch'
    ];

    for (const feature of requiredFeatures) {
      const parts = feature.split('.');
      let obj = window;

      for (const part of parts) {
        if (!obj || !obj[part]) {
          throw new Error(`缺少必需的功能: ${feature}`);
        }
        obj = obj[part];
      }
    }

    console.log('[ContentScript] 环境兼容性检查通过');
  }

  /**
   * 等待DOM就绪
   */
  function waitForDOMReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * 主启动函数
   */
  async function main() {
    try {
      console.log('[ContentScript] 开始启动序列...');

      // 1. 检查环境兼容性
      checkCompatibility();

      // 2. 等待DOM就绪
      await waitForDOMReady();

      // 3. 设置错误处理
      setupErrorHandling();

      // 4. 设置消息监听器
      setupMessageListeners();

      // 5. 加载模块
      await loadModules();

      // 6. 初始化应用
      await initializeApp();

      console.log('🎉 [ContentScript] AI简历填写插件启动完成!');

    } catch (error) {
      console.error('💥 [ContentScript] 启动失败:', error);

      // 通知background script启动失败
      chrome.runtime.sendMessage({
        action: 'contentScriptError',
        data: {
          error: error.message,
          website: window.location.href,
          timestamp: Date.now()
        }
      });
    }
  }

  // 启动应用
  main();

})();
