/**
 * AI简历填写插件 - 增强版Background Script
 * 支持新的视觉分析API和传统分析API
 */

// 后端API配置
const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  ENDPOINTS: {
    TRADITIONAL_ANALYZE: '/api/analyze-html',
    VISUAL_ANALYZE: '/api/v1/matching/analyze-visual',
    GET_RESUME: '/api/resume/current',
    HEALTH_CHECK: '/api/health'
  },
  TIMEOUT: 60000, // 60秒超时
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1秒
};

// 全局状态
let isAnalyzing = false;
let analysisAbortController = null;
let errorStats = {
  totalErrors: 0,
  apiErrors: 0,
  networkErrors: 0,
  timeoutErrors: 0,
  lastError: null
};

/**
 * 消息处理器
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] 收到消息:', request);

  // 异步处理消息
  handleMessage(request, sender)
    .then(response => {
      sendResponse(response);
    })
    .catch(error => {
      console.error('[Background] 消息处理失败:', error);
      recordError(error, 'messageHandler');
      sendResponse({
        success: false,
        error: error.message,
        errorType: 'messageHandler'
      });
    });

  // 返回true表示异步发送响应
  return true;
});

/**
 * 主消息处理函数
 */
async function handleMessage(request, sender) {
  try {
    switch (request.action) {
      case 'analyzeVisual':
        return await handleVisualAnalysis(request.data);

      case 'analyzeHtml':
        return await handleTraditionalAnalysis(request.data);

      case 'getCurrentResume':
        return await handleGetResume();

      case 'healthCheck':
        return await handleHealthCheck();

      case 'contentScriptReady':
        return handleContentScriptReady(request.data);

      case 'contentScriptError':
        return handleContentScriptError(request.data);

      case 'reportError':
        return handleErrorReport(request.data);

      case 'getErrorStats':
        return handleGetErrorStats();

      case 'resetErrorStats':
        return handleResetErrorStats();

      default:
        throw new Error(`未知的操作: ${request.action}`);
    }
  } catch (error) {
    console.error(`[Background] 处理 ${request.action} 失败:`, error);
    throw error;
  }
}

/**
 * 处理视觉分析请求
 */
async function handleVisualAnalysis(data) {
  if (isAnalyzing) {
    throw new Error('分析正在进行中，请稍候...');
  }

  try {
    isAnalyzing = true;
    analysisAbortController = new AbortController();

    console.log('[Background] 开始视觉分析...');

    // 验证请求数据
    if (!data || !data.html_content || !data.resume_data) {
      throw new Error('缺少必需的参数: html_content 或 resume_data');
    }

    // 构建请求数据
    const requestData = {
      html_content: data.html_content,
      resume_data: data.resume_data,
      website_url: data.website_url || '',
      config: data.config || {
        xy_cut_threshold: 10,
        morphology_kernel_size: 20,
        min_region_size: 50,
        similarity_threshold: 0.8
      }
    };

    // 发送API请求
    const result = await makeApiRequest(
      API_CONFIG.ENDPOINTS.VISUAL_ANALYZE,
      requestData,
      'POST',
      analysisAbortController.signal
    );

    console.log('[Background] 视觉分析完成:', result);

    return {
      success: true,
      ...result,
      timestamp: Date.now(),
      api_type: 'visual'
    };

  } catch (error) {
    console.error('[Background] 视觉分析失败:', error);
    recordError(error, 'visualAnalysis');
    throw error;
  } finally {
    isAnalyzing = false;
    analysisAbortController = null;
  }
}

/**
 * 处理传统分析请求
 */
async function handleTraditionalAnalysis(data) {
  if (isAnalyzing) {
    throw new Error('分析正在进行中，请稍候...');
  }

  try {
    isAnalyzing = true;
    analysisAbortController = new AbortController();

    console.log('[Background] 开始传统分析...');

    // 验证请求数据
    if (!data || !data.html || !data.resume_data) {
      throw new Error('缺少必需的参数: html 或 resume_data');
    }

    // 构建请求数据
    const requestData = {
      html: data.html,
      resume_data: data.resume_data,
      website_url: data.website_url || ''
    };

    // 发送API请求
    const result = await makeApiRequest(
      API_CONFIG.ENDPOINTS.TRADITIONAL_ANALYZE,
      requestData,
      'POST',
      analysisAbortController.signal
    );

    console.log('[Background] 传统分析完成:', result);

    return {
      success: true,
      ...result,
      timestamp: Date.now(),
      api_type: 'traditional'
    };

  } catch (error) {
    console.error('[Background] 传统分析失败:', error);
    recordError(error, 'traditionalAnalysis');
    throw error;
  } finally {
    isAnalyzing = false;
    analysisAbortController = null;
  }
}

/**
 * 处理获取简历请求
 */
async function handleGetResume() {
  try {
    console.log('[Background] 获取当前简历...');

    // 首先尝试从storage获取
    const storageResult = await chrome.storage.local.get(['currentResume', 'resumeData']);

    if (storageResult.currentResume) {
      console.log('[Background] 从storage获取到简历');
      return {
        success: true,
        data: storageResult.currentResume,
        source: 'storage'
      };
    }

    if (storageResult.resumeData) {
      console.log('[Background] 从storage获取到备用简历数据');
      return {
        success: true,
        data: storageResult.resumeData,
        source: 'storage_backup'
      };
    }

    // 如果storage中没有，尝试从API获取
    try {
      const result = await makeApiRequest(
        API_CONFIG.ENDPOINTS.GET_RESUME,
        null,
        'GET'
      );

      if (result && result.data) {
        // 缓存到storage
        await chrome.storage.local.set({
          currentResume: result.data,
          resumeCacheTime: Date.now()
        });

        console.log('[Background] 从API获取到简历');
        return {
          success: true,
          data: result.data,
          source: 'api'
        };
      }
    } catch (apiError) {
      console.warn('[Background] API获取简历失败:', apiError);
    }

    return {
      success: false,
      error: '未找到简历数据，请先上传简历'
    };

  } catch (error) {
    console.error('[Background] 获取简历失败:', error);
    recordError(error, 'getResume');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理健康检查请求
 */
async function handleHealthCheck() {
  try {
    const result = await makeApiRequest(
      API_CONFIG.ENDPOINTS.HEALTH_CHECK,
      null,
      'GET',
      null,
      5000 // 5秒超时
    );

    return {
      success: true,
      data: result,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[Background] 健康检查失败:', error);
    recordError(error, 'healthCheck');
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * 处理content script就绪通知
 */
function handleContentScriptReady(data) {
  console.log('[Background] Content script已就绪:', data);
  return {
    success: true,
    message: 'Content script就绪确认'
  };
}

/**
 * 处理content script错误通知
 */
function handleContentScriptError(data) {
  console.error('[Background] Content script错误:', data);
  recordError(new Error(data.error), 'contentScript');
  return {
    success: true,
    message: '错误已记录'
  };
}

/**
 * 处理错误报告
 */
function handleErrorReport(data) {
  console.error('[Background] 收到错误报告:', data);
  recordError(new Error(data.error), data.type || 'reported');
  return {
    success: true,
    message: '错误报告已记录'
  };
}

/**
 * 处理获取错误统计请求
 */
function handleGetErrorStats() {
  return {
    success: true,
    data: { ...errorStats }
  };
}

/**
 * 处理重置错误统计请求
 */
function handleResetErrorStats() {
  errorStats = {
    totalErrors: 0,
    apiErrors: 0,
    networkErrors: 0,
    timeoutErrors: 0,
    lastError: null
  };

  return {
    success: true,
    message: '错误统计已重置'
  };
}

/**
 * 发送API请求
 */
async function makeApiRequest(endpoint, data, method = 'POST', signal = null, timeout = API_CONFIG.TIMEOUT) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  for (let attempt = 1; attempt <= API_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`[Background] API请求 (尝试 ${attempt}/${API_CONFIG.RETRY_ATTEMPTS}): ${method} ${url}`);

      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

      // 组合信号
      const combinedSignal = signal ?
        combineAbortSignals([signal, timeoutController.signal]) :
        timeoutController.signal;

      const requestOptions = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Resume-Filler-Extension/1.0',
          'X-Extension-Version': chrome.runtime.getManifest()?.version || '1.0'
        },
        signal: combinedSignal
      };

      if (data && method !== 'GET') {
        requestOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;

        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP ${response.status}` };
        }

        throw new Error(`API错误 ${response.status}: ${errorData.message || errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log(`[Background] API请求成功: ${method} ${url}`);

      return result;

    } catch (error) {
      console.error(`[Background] API请求失败 (尝试 ${attempt}/${API_CONFIG.RETRY_ATTEMPTS}):`, error);

      // 如果是最后一次尝试，抛出错误
      if (attempt === API_CONFIG.RETRY_ATTEMPTS) {
        recordError(error, 'apiRequest');
        throw error;
      }

      // 如果请求被取消，不重试
      if (error.name === 'AbortError') {
        throw new Error('请求已取消');
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY * attempt));
    }
  }
}

/**
 * 组合多个AbortSignal
 */
function combineAbortSignals(signals) {
  const controller = new AbortController();

  const abortHandler = () => controller.abort();

  signals.forEach(signal => {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', abortHandler);
    }
  });

  return controller.signal;
}

/**
 * 记录错误
 */
function recordError(error, context) {
  errorStats.totalErrors++;
  errorStats.lastError = {
    message: error.message,
    context: context,
    timestamp: Date.now(),
    stack: error.stack
  };

  // 分类错误
  if (context === 'apiRequest') {
    errorStats.apiErrors++;
  } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
    errorStats.networkErrors++;
  } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
    errorStats.timeoutErrors++;
  }

  console.error(`[Background] 错误记录 [${context}]:`, error);
}

/**
 * 扩展安装/更新处理
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] 扩展已安装/更新:', details);

  if (details.reason === 'install') {
    console.log('[Background] 首次安装，初始化存储...');
    chrome.storage.local.set({
      installTime: Date.now(),
      version: chrome.runtime.getManifest().version
    });
  } else if (details.reason === 'update') {
    console.log('[Background] 扩展已更新，清理旧数据...');
    // 清理可能的旧缓存
    chrome.storage.local.remove(['analysisCache', 'tempData']);
  }
});

/**
 * 扩展启动处理
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] 扩展启动');

  // 重置运行时状态
  isAnalyzing = false;
  analysisAbortController = null;
});

/**
 * 标签页更新处理
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('[Background] 标签页更新:', tab.url);

    // 可以在这里做一些标签页相关的初始化
    // 例如检查是否是招聘网站，预加载配置等
  }
});

/**
 * 导出调试信息
 */
function getDebugInfo() {
  return {
    apiConfig: API_CONFIG,
    isAnalyzing: isAnalyzing,
    errorStats: errorStats,
    runtime: {
      version: chrome.runtime.getManifest()?.version,
      id: chrome.runtime.id
    },
    timestamp: Date.now()
  };
}

// 全局错误处理
self.addEventListener('error', (event) => {
  console.error('[Background] 全局错误:', event.error);
  recordError(event.error, 'global');
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Background] 未处理的Promise错误:', event.reason);
  recordError(new Error(event.reason), 'unhandledPromise');
});

console.log('[Background] AI简历填写插件 Background Script 已启动');

// 导出给可能的其他脚本使用
if (typeof window !== 'undefined') {
  window.getDebugInfo = getDebugInfo;
}
