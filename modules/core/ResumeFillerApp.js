/**
 * 简历填写应用主类 - 协调所有模块
 * 统一管理配置、分析、填写等功能
 */
class ResumeFillerApp {
  constructor() {
    this.isInitialized = false;
    this.configManager = null;
    this.visualAnalyzer = null;
    this.formAnalyzer = null;
    this.analysisMode = null;
    this.debugOverlay = null;
    this.eventBus = EventBus.getInstance();

    this.currentAnalysisResult = null;
    this.isAnalyzing = false;
    this.isFilling = false;

    this.setupEventListeners();
  }

  /**
   * 初始化应用
   */
  async init() {
    if (this.isInitialized) {
      console.log('[ResumeFillerApp] 应用已初始化');
      return;
    }

    try {
      console.log('[ResumeFillerApp] 开始初始化...');

      // 1. 初始化配置管理器
      this.configManager = new ConfigManager();
      await this.configManager.init();

      // 2. 初始化视觉分析器
      this.visualAnalyzer = new VisualAnalyzer(this.configManager);

      // 3. 初始化表单分析器
      this.formAnalyzer = new FormAnalyzer(this.configManager);

      // 4. 初始化分析模式管理器
      this.analysisMode = new AnalysisMode(this.configManager);

      // 5. 初始化调试覆盖层（可选）
      if (this.configManager.isFeatureEnabled('enable_debug_overlay')) {
        this.debugOverlay = new DebugOverlay(this.configManager);
      }

      // 6. 设置全局引用
      this.setupGlobalReferences();

      this.isInitialized = true;

      console.log('✅ [ResumeFillerApp] 应用初始化完成');

      this.eventBus.emit('app-initialized', {
        timestamp: Date.now(),
        website: window.location.href,
        config: this.configManager.getModeInfo()
      });

    } catch (error) {
      console.error('❌ [ResumeFillerApp] 应用初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听分析完成事件
    this.eventBus.on('visual-analysis-complete', async (data) => {
      this.currentAnalysisResult = data.result;
      this.isAnalyzing = false;

      // 自动开始填写（如果启用）
      if (this.configManager.isFeatureEnabled('auto_fill_after_analysis')) {
        await this.fillForm();
      }
    });

    this.eventBus.on('visual-analysis-error', () => {
      this.isAnalyzing = false;
    });

    this.eventBus.on('form-filling-start', () => {
      this.isFilling = true;
    });

    this.eventBus.on('form-filling-complete', () => {
      this.isFilling = false;
    });

    this.eventBus.on('form-filling-error', () => {
      this.isFilling = false;
    });

    // 监听配置更新
    this.eventBus.on('config-updated', () => {
      this.handleConfigUpdate();
    });

    // 监听页面变化
    this.setupPageChangeDetection();
  }

  /**
   * 设置全局引用
   */
  setupGlobalReferences() {
    window.configManager = this.configManager;
    window.visualAnalyzer = this.visualAnalyzer;
    window.formAnalyzer = this.formAnalyzer;
    window.analysisMode = this.analysisMode;
    window.debugOverlay = this.debugOverlay;
    window.resumeFillerApp = this;
  }

  /**
   * 执行完整的分析流程
   */
  async analyzeForm() {
    if (this.isAnalyzing) {
      console.warn('[ResumeFillerApp] 分析正在进行中...');
      return this.currentAnalysisResult;
    }

    try {
      this.isAnalyzing = true;
      console.log('[ResumeFillerApp] 开始表单分析...');

      this.eventBus.emit('app-analysis-start', {
        timestamp: Date.now(),
        mode: this.analysisMode.getCurrentMode()
      });

      // 获取页面数据
      const htmlContent = document.documentElement.outerHTML;
      const resumeData = await this.getResumeData();
      const websiteUrl = window.location.href;

      if (!resumeData) {
        throw new Error('请先选择或上传简历');
      }

      // 执行分析
      const result = await this.analysisMode.analyze(
        htmlContent,
        resumeData,
        websiteUrl,
        {
          autoFallback: this.configManager.isFeatureEnabled('fallback_to_traditional')
        }
      );

      this.currentAnalysisResult = result;

      console.log('✅ [ResumeFillerApp] 分析完成:', result);

      this.eventBus.emit('app-analysis-complete', {
        result: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('❌ [ResumeFillerApp] 分析失败:', error);

      this.eventBus.emit('app-analysis-error', {
        error: error.message,
        timestamp: Date.now()
      });

      throw error;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 执行表单填写
   */
  async fillForm(analysisResult = null) {
    if (this.isFilling) {
      console.warn('[ResumeFillerApp] 填写正在进行中...');
      return;
    }

    try {
      const targetResult = analysisResult || this.currentAnalysisResult;

      if (!targetResult) {
        throw new Error('没有可用的分析结果，请先执行分析');
      }

      console.log('[ResumeFillerApp] 开始表单填写...');

      this.eventBus.emit('app-filling-start', {
        timestamp: Date.now(),
        totalFields: targetResult.matched_fields?.length || 0
      });

      const fillResult = await this.formAnalyzer.processAnalysisResult(targetResult);

      console.log('✅ [ResumeFillerApp] 填写完成:', fillResult);

      this.eventBus.emit('app-filling-complete', {
        result: fillResult,
        timestamp: Date.now()
      });

      return fillResult;

    } catch (error) {
      console.error('❌ [ResumeFillerApp] 填写失败:', error);

      this.eventBus.emit('app-filling-error', {
        error: error.message,
        timestamp: Date.now()
      });

      throw error;
    }
  }

  /**
   * 执行完整流程：分析 + 填写
   */
  async analyzeAndFill() {
    try {
      console.log('[ResumeFillerApp] 开始完整流程：分析 + 填写');

      // 1. 执行分析
      const analysisResult = await this.analyzeForm();

      // 2. 执行填写
      const fillResult = await this.fillForm(analysisResult);

      console.log('✅ [ResumeFillerApp] 完整流程完成');

      return {
        analysis: analysisResult,
        fill: fillResult,
        success: true
      };

    } catch (error) {
      console.error('❌ [ResumeFillerApp] 完整流程失败:', error);
      throw error;
    }
  }

  /**
   * 获取简历数据
   */
  async getResumeData() {
    try {
      // 从 chrome.storage 获取
      const result = await chrome.storage.local.get(['currentResume', 'resumeData']);

      if (result.currentResume) {
        return result.currentResume;
      } else if (result.resumeData) {
        return result.resumeData;
      }

      // 从后端获取
      const response = await this.sendMessageToBackground({
        action: 'getCurrentResume'
      });

      if (response && response.success) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('[ResumeFillerApp] 获取简历数据失败:', error);
      return null;
    }
  }

  /**
   * 发送消息到background script
   */
  async sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  /**
   * 切换分析模式
   */
  async switchAnalysisMode(mode) {
    try {
      await this.analysisMode.switchMode(mode, 'user');
      console.log(`[ResumeFillerApp] 分析模式已切换到: ${mode}`);

      this.eventBus.emit('app-mode-changed', {
        mode: mode,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('[ResumeFillerApp] 切换分析模式失败:', error);
      throw error;
    }
  }

  /**
   * 获取应用状态
   */
  getAppStatus() {
    return {
      initialized: this.isInitialized,
      analyzing: this.isAnalyzing,
      filling: this.isFilling,
      hasAnalysisResult: !!this.currentAnalysisResult,
      currentMode: this.analysisMode?.getCurrentMode(),
      website: window.location.href,
      config: this.configManager?.getWebsiteConfig(),
      timestamp: Date.now()
    };
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    if (!this.analysisMode) return null;

    return {
      modeStats: this.analysisMode.getPerformanceStats(),
      modeHistory: this.analysisMode.getModeHistory(),
      recommendedMode: this.analysisMode.recommendBestMode(),
      appStats: {
        totalAnalyses: this.getTotalAnalyses(),
        totalFills: this.getTotalFills(),
        uptime: Date.now() - (this.initTime || Date.now())
      }
    };
  }

  /**
   * 处理配置更新
   */
  handleConfigUpdate() {
    console.log('[ResumeFillerApp] 配置已更新，重新检查功能状态');

    // 重新初始化调试覆盖层
    if (this.configManager.isFeatureEnabled('enable_debug_overlay')) {
      if (!this.debugOverlay) {
        this.debugOverlay = new DebugOverlay(this.configManager);
        window.debugOverlay = this.debugOverlay;
      }
    } else {
      if (this.debugOverlay) {
        this.debugOverlay.destroy();
        this.debugOverlay = null;
        window.debugOverlay = null;
      }
    }
  }

  /**
   * 设置页面变化检测
   */
  setupPageChangeDetection() {
    let lastUrl = window.location.href;

    // 使用 MutationObserver 检测页面变化
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        this.handlePageChange();
      }
    });

    observer.observe(document, {
      childList: true,
      subtree: true
    });

    // 监听 popstate 事件
    window.addEventListener('popstate', () => {
      this.handlePageChange();
    });
  }

  /**
   * 处理页面变化
   */
  handlePageChange() {
    console.log('[ResumeFillerApp] 页面已变化，重新初始化...');

    // 清除当前分析结果
    this.currentAnalysisResult = null;
    this.isAnalyzing = false;
    this.isFilling = false;

    // 重新加载配置
    if (this.configManager) {
      this.configManager.reload();
    }

    // 清除调试覆盖层
    if (this.debugOverlay) {
      this.debugOverlay.clear();
    }

    this.eventBus.emit('app-page-changed', {
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  /**
   * 停止所有正在进行的操作
   */
  stopAll() {
    if (this.isAnalyzing && this.visualAnalyzer) {
      this.visualAnalyzer.cancelAnalysis();
    }

    if (this.isFilling && this.formAnalyzer) {
      this.formAnalyzer.stopFilling();
    }

    console.log('[ResumeFillerApp] 所有操作已停止');
  }

  /**
   * 重置应用状态
   */
  reset() {
    this.stopAll();
    this.currentAnalysisResult = null;

    if (this.debugOverlay) {
      this.debugOverlay.clear();
    }

    if (this.analysisMode) {
      this.analysisMode.resetStats();
    }

    console.log('[ResumeFillerApp] 应用状态已重置');
  }

  /**
   * 导出调试信息
   */
  exportDebugInfo() {
    return {
      appStatus: this.getAppStatus(),
      performanceStats: this.getPerformanceStats(),
      config: this.configManager?.exportConfig(),
      analysisResult: this.currentAnalysisResult,
      eventBusStats: this.eventBus.getStats(),
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };
  }

  /**
   * 获取总分析次数
   */
  getTotalAnalyses() {
    const stats = this.analysisMode?.getPerformanceStats() || {};
    return Object.values(stats).reduce((total, stat) => total + (stat.totalRuns || 0), 0);
  }

  /**
   * 获取总填写次数
   */
  getTotalFills() {
    return this.formAnalyzer?.getFillProgress()?.completed || 0;
  }

  /**
   * 销毁应用
   */
  destroy() {
    this.stopAll();

    if (this.debugOverlay) {
      this.debugOverlay.destroy();
    }

    this.eventBus.clear();

    // 清除全局引用
    delete window.configManager;
    delete window.visualAnalyzer;
    delete window.formAnalyzer;
    delete window.analysisMode;
    delete window.debugOverlay;
    delete window.resumeFillerApp;

    this.isInitialized = false;
    console.log('[ResumeFillerApp] 应用已销毁');
  }
}

// 确保在全局可用
if (typeof window !== 'undefined') {
  window.ResumeFillerApp = ResumeFillerApp;
}
