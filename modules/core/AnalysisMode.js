/**
 * 分析模式管理器 - 管理不同的分析模式
 * 支持传统模式、视觉模式和混合模式的切换
 */
class AnalysisMode {
  constructor(configManager) {
    this.configManager = configManager;
    this.eventBus = EventBus.getInstance();
    this.currentMode = 'visual'; // 默认使用视觉模式
    this.availableModes = ['traditional', 'visual', 'hybrid'];
    this.modeHistory = [];
    this.performanceStats = {};

    this.setupEventListeners();
    this.loadUserPreference();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听分析完成事件，收集性能数据
    this.eventBus.on('visual-analysis-complete', (data) => {
      this.recordPerformance('visual', data);
    });

    this.eventBus.on('traditional-analysis-complete', (data) => {
      this.recordPerformance('traditional', data);
    });

    this.eventBus.on('analysis-error', (data) => {
      this.recordError(this.currentMode, data);
    });
  }

  /**
   * 加载用户偏好设置
   */
  async loadUserPreference() {
    try {
      const result = await chrome.storage.local.get(['analysisMode', 'modePreferences']);

      if (result.analysisMode && this.availableModes.includes(result.analysisMode)) {
        this.currentMode = result.analysisMode;
      }

      if (result.modePreferences) {
        this.performanceStats = result.modePreferences.performanceStats || {};
      }

      console.log(`[AnalysisMode] 加载用户偏好: ${this.currentMode}`);
    } catch (error) {
      console.error('[AnalysisMode] 加载用户偏好失败:', error);
    }
  }

  /**
   * 切换分析模式
   */
  async switchMode(mode, reason = 'user') {
    if (!this.availableModes.includes(mode)) {
      throw new Error(`不支持的分析模式: ${mode}`);
    }

    const previousMode = this.currentMode;
    this.currentMode = mode;

    // 记录模式历史
    this.modeHistory.push({
      from: previousMode,
      to: mode,
      reason: reason,
      timestamp: Date.now()
    });

    try {
      // 保存用户偏好
      await this.saveUserPreference();

      console.log(`[AnalysisMode] 模式切换: ${previousMode} → ${mode} (${reason})`);

      // 发布模式切换事件
      this.eventBus.emit('analysis-mode-changed', {
        previousMode: previousMode,
        currentMode: mode,
        reason: reason,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      // 如果保存失败，回滚模式
      this.currentMode = previousMode;
      console.error('[AnalysisMode] 模式切换失败:', error);
      throw error;
    }
  }

  /**
   * 保存用户偏好
   */
  async saveUserPreference() {
    try {
      await chrome.storage.local.set({
        analysisMode: this.currentMode,
        modeChangeTime: Date.now(),
        modePreferences: {
          performanceStats: this.performanceStats,
          modeHistory: this.modeHistory.slice(-10) // 只保留最近10次记录
        }
      });
    } catch (error) {
      console.error('[AnalysisMode] 保存用户偏好失败:', error);
      throw error;
    }
  }

  /**
   * 执行分析
   */
  async analyze(htmlContent, resumeData, websiteUrl, options = {}) {
    const startTime = Date.now();

    console.log(`[AnalysisMode] 使用 ${this.currentMode} 模式分析...`);

    this.eventBus.emit('analysis-start', {
      mode: this.currentMode,
      website: websiteUrl,
      timestamp: startTime
    });

    try {
      let result;

      switch (this.currentMode) {
        case 'visual':
          result = await this.performVisualAnalysis(htmlContent, resumeData, websiteUrl, options);
          break;
        case 'traditional':
          result = await this.performTraditionalAnalysis(htmlContent, resumeData, websiteUrl, options);
          break;
        case 'hybrid':
          result = await this.performHybridAnalysis(htmlContent, resumeData, websiteUrl, options);
          break;
        default:
          throw new Error(`未知的分析模式: ${this.currentMode}`);
      }

      const duration = Date.now() - startTime;
      console.log(`[AnalysisMode] ${this.currentMode} 模式分析完成，耗时 ${duration}ms`);

      // 记录成功的分析
      this.recordAnalysisSuccess(this.currentMode, duration, result);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[AnalysisMode] ${this.currentMode} 模式分析失败:`, error);

      // 记录分析失败
      this.recordAnalysisFailure(this.currentMode, duration, error);

      // 尝试自动切换到备用模式
      if (options.autoFallback !== false) {
        const fallbackResult = await this.tryFallbackMode(htmlContent, resumeData, websiteUrl, error);
        if (fallbackResult) {
          return fallbackResult;
        }
      }

      throw error;
    }
  }

  /**
   * 执行视觉分析
   */
  async performVisualAnalysis(htmlContent, resumeData, websiteUrl, options) {
    const visualAnalyzer = window.visualAnalyzer;
    if (!visualAnalyzer) {
      throw new Error('视觉分析器未初始化');
    }

    return await visualAnalyzer.analyzeWithVisualMode();
  }

  /**
   * 执行传统分析
   */
  async performTraditionalAnalysis(htmlContent, resumeData, websiteUrl, options) {
    // 调用传统分析API
    const response = await this.sendMessageToBackground({
      action: 'analyzeHtml',
      data: {
        html: htmlContent,
        resume_data: resumeData,
        website_url: websiteUrl
      }
    });

    if (!response || !response.success) {
      throw new Error(response?.error || '传统分析失败');
    }

    // 转换为统一格式
    return this.convertToUnifiedFormat(response, 'traditional');
  }

  /**
   * 执行混合分析
   */
  async performHybridAnalysis(htmlContent, resumeData, websiteUrl, options) {
    console.log('[AnalysisMode] 执行混合分析...');

    try {
      // 首先尝试视觉分析
      const visualResult = await this.performVisualAnalysis(htmlContent, resumeData, websiteUrl, {
        ...options,
        autoFallback: false
      });

      // 如果视觉分析成功且结果质量良好，直接返回
      if (this.isGoodQualityResult(visualResult)) {
        console.log('[AnalysisMode] 视觉分析结果质量良好，使用视觉分析结果');
        return { ...visualResult, analysisMode: 'hybrid-visual' };
      }

      console.log('[AnalysisMode] 视觉分析结果质量一般，尝试传统分析...');

      // 并行执行传统分析
      const traditionalResult = await this.performTraditionalAnalysis(htmlContent, resumeData, websiteUrl, {
        ...options,
        autoFallback: false
      });

      // 合并两种结果
      const mergedResult = this.mergeAnalysisResults(visualResult, traditionalResult);
      return { ...mergedResult, analysisMode: 'hybrid-merged' };

    } catch (visualError) {
      console.warn('[AnalysisMode] 视觉分析失败，使用传统分析:', visualError.message);

      // 如果视觉分析失败，使用传统分析
      const traditionalResult = await this.performTraditionalAnalysis(htmlContent, resumeData, websiteUrl, options);
      return { ...traditionalResult, analysisMode: 'hybrid-traditional' };
    }
  }

  /**
   * 判断分析结果质量
   */
  isGoodQualityResult(result) {
    if (!result || !result.success) return false;

    const stats = result.statistics || {};
    const matchRate = stats.overall_success_rate || 0;
    const matchedFields = stats.successfully_matched_fields || 0;

    // 质量标准：匹配率 > 60% 且匹配字段数 > 3
    return matchRate > 0.6 && matchedFields > 3;
  }

  /**
   * 合并分析结果
   */
  mergeAnalysisResults(visualResult, traditionalResult) {
    // 以质量更好的结果为主
    const primaryResult = this.isGoodQualityResult(visualResult) ? visualResult : traditionalResult;
    const secondaryResult = primaryResult === visualResult ? traditionalResult : visualResult;

    // 合并匹配字段，去重
    const mergedFields = [...(primaryResult.matched_fields || [])];
    const primaryLabels = new Set(mergedFields.map(f => f.form_label));

    (secondaryResult.matched_fields || []).forEach(field => {
      if (!primaryLabels.has(field.form_label)) {
        mergedFields.push({ ...field, source: 'secondary' });
      }
    });

    return {
      ...primaryResult,
      matched_fields: mergedFields,
      statistics: {
        ...primaryResult.statistics,
        successfully_matched_fields: mergedFields.length,
        overall_success_rate: mergedFields.length / (primaryResult.statistics?.total_form_fields || 1)
      },
      merge_info: {
        primary_source: primaryResult === visualResult ? 'visual' : 'traditional',
        secondary_fields_added: mergedFields.filter(f => f.source === 'secondary').length,
        total_merged_fields: mergedFields.length
      }
    };
  }

  /**
   * 尝试备用模式
   */
  async tryFallbackMode(htmlContent, resumeData, websiteUrl, originalError) {
    const fallbackModes = this.getFallbackModes(this.currentMode);

    for (const fallbackMode of fallbackModes) {
      try {
        console.log(`[AnalysisMode] 尝试备用模式: ${fallbackMode}`);

        // 临时切换到备用模式
        const originalMode = this.currentMode;
        this.currentMode = fallbackMode;

        const result = await this.analyze(htmlContent, resumeData, websiteUrl, {
          autoFallback: false // 避免递归
        });

        // 恢复原模式
        this.currentMode = originalMode;

        // 记录自动切换
        await this.switchMode(fallbackMode, 'auto-fallback');

        console.log(`[AnalysisMode] 自动切换到 ${fallbackMode} 模式成功`);
        return { ...result, fallback_from: originalMode, fallback_reason: originalError.message };

      } catch (fallbackError) {
        console.warn(`[AnalysisMode] 备用模式 ${fallbackMode} 也失败:`, fallbackError.message);
        continue;
      }
    }

    console.error('[AnalysisMode] 所有备用模式都失败了');
    return null;
  }

  /**
   * 获取备用模式列表
   */
  getFallbackModes(currentMode) {
    const fallbackMap = {
      'visual': ['traditional'],
      'traditional': ['visual'],
      'hybrid': ['visual', 'traditional']
    };

    return fallbackMap[currentMode] || [];
  }

  /**
   * 转换为统一格式
   */
  convertToUnifiedFormat(result, source) {
    return {
      success: result.success,
      website_url: result.website_url || window.location.href,
      analysis_time: result.analysis_time || 0,
      matched_fields: (result.matched_fields || []).map(field => ({
        form_label: field.name || field.selector || '未知字段',
        value: field.value || '',
        match_type: 'traditional',
        confidence: 0.8,
        source: source
      })),
      statistics: {
        total_form_fields: result.total_fields || 0,
        successfully_matched_fields: (result.matched_fields || []).length,
        overall_success_rate: (result.matched_fields || []).length / Math.max(result.total_fields || 1, 1)
      },
      analysis_mode: source
    };
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
   * 记录性能数据
   */
  recordPerformance(mode, data) {
    if (!this.performanceStats[mode]) {
      this.performanceStats[mode] = {
        totalRuns: 0,
        successRuns: 0,
        totalTime: 0,
        averageMatchRate: 0,
        lastUsed: 0
      };
    }

    const stats = this.performanceStats[mode];
    stats.totalRuns++;

    if (data.result && data.result.success) {
      stats.successRuns++;
      stats.totalTime += data.duration || 0;

      const matchRate = data.result.statistics?.overall_success_rate || 0;
      stats.averageMatchRate = (stats.averageMatchRate * (stats.successRuns - 1) + matchRate) / stats.successRuns;
    }

    stats.lastUsed = Date.now();
  }

  /**
   * 记录分析成功
   */
  recordAnalysisSuccess(mode, duration, result) {
    this.recordPerformance(mode, {
      result: result,
      duration: duration
    });
  }

  /**
   * 记录分析失败
   */
  recordAnalysisFailure(mode, duration, error) {
    if (!this.performanceStats[mode]) {
      this.performanceStats[mode] = {
        totalRuns: 0,
        successRuns: 0,
        totalTime: 0,
        averageMatchRate: 0,
        lastUsed: 0,
        failures: []
      };
    }

    this.performanceStats[mode].totalRuns++;
    this.performanceStats[mode].failures = this.performanceStats[mode].failures || [];
    this.performanceStats[mode].failures.push({
      error: error.message,
      duration: duration,
      timestamp: Date.now()
    });

    // 只保留最近10次失败记录
    if (this.performanceStats[mode].failures.length > 10) {
      this.performanceStats[mode].failures = this.performanceStats[mode].failures.slice(-10);
    }
  }

  /**
   * 记录错误
   */
  recordError(mode, data) {
    this.recordAnalysisFailure(mode, data.duration || 0, new Error(data.error));
  }

  /**
   * 获取当前模式
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return { ...this.performanceStats };
  }

  /**
   * 获取模式历史
   */
  getModeHistory() {
    return [...this.modeHistory];
  }

  /**
   * 推荐最佳模式
   */
  recommendBestMode() {
    if (Object.keys(this.performanceStats).length === 0) {
      return 'visual'; // 默认推荐视觉模式
    }

    let bestMode = 'visual';
    let bestScore = 0;

    for (const [mode, stats] of Object.entries(this.performanceStats)) {
      if (stats.totalRuns === 0) continue;

      // 计算综合得分
      const successRate = stats.successRuns / stats.totalRuns;
      const averageTime = stats.totalTime / Math.max(stats.successRuns, 1);
      const matchQuality = stats.averageMatchRate || 0;

      // 综合评分：成功率40% + 匹配质量40% + 速度20%
      const timeScore = Math.max(0, 1 - averageTime / 30000); // 30秒为基准
      const score = successRate * 0.4 + matchQuality * 0.4 + timeScore * 0.2;

      if (score > bestScore) {
        bestScore = score;
        bestMode = mode;
      }
    }

    return bestMode;
  }

  /**
   * 重置统计数据
   */
  resetStats() {
    this.performanceStats = {};
    this.modeHistory = [];
    this.saveUserPreference();
    console.log('[AnalysisMode] 统计数据已重置');
  }

  /**
   * 获取模式信息
   */
  getModeInfo() {
    return {
      currentMode: this.currentMode,
      availableModes: this.availableModes,
      performanceStats: this.performanceStats,
      recommendedMode: this.recommendBestMode(),
      modeHistory: this.modeHistory.slice(-5) // 最近5次切换
    };
  }
}

// 确保在全局可用
if (typeof window !== 'undefined') {
  window.AnalysisMode = AnalysisMode;
}
