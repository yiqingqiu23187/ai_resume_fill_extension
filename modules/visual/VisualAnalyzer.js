/**
 * 视觉分析器 - 基于计算机视觉的表单分析
 * 调用后端视觉分析API，处理分析结果
 */
class VisualAnalyzer {
  constructor(configManager) {
    this.configManager = configManager;
    this.eventBus = EventBus.getInstance();
    this.isAnalyzing = false;
    this.lastAnalysisResult = null;
    this.analysisStartTime = null;
  }

  /**
   * 执行视觉驱动分析
   */
  async analyzeWithVisualMode() {
    if (this.isAnalyzing) {
      console.warn('[VisualAnalyzer] 分析正在进行中，请稍候...');
      return null;
    }

    this.isAnalyzing = true;
    this.analysisStartTime = Date.now();

    try {
      console.log('🔍 开始视觉驱动分析...');

      this.eventBus.emit('visual-analysis-start', {
        timestamp: this.analysisStartTime,
        website: window.location.href
      });

      // 1. 获取当前网站配置
      const websiteConfig = this.configManager.getWebsiteConfig();
      console.log('[VisualAnalyzer] 使用配置:', websiteConfig);

      // 2. 等待页面稳定
      await this.waitForPageStable();

      // 3. 获取简历数据
      const resumeData = await this.getResumeData();
      if (!resumeData) {
        throw new Error('无法获取简历数据，请确保已登录并选择简历');
      }

      // 4. 准备分析请求数据
      const requestData = {
        html_content: document.documentElement.outerHTML,
        resume_data: resumeData,
        website_url: window.location.href,
        config: websiteConfig.analysis_config
      };

      console.log('[VisualAnalyzer] 发送分析请求到后端...');

      // 5. 调用后端视觉分析API
      const response = await this.sendAnalysisRequest(requestData);

      if (response.success) {
        console.log('✅ 视觉分析完成!', response);
        this.lastAnalysisResult = response;

        // 发布分析完成事件
        this.eventBus.emit('visual-analysis-complete', {
          result: response,
          duration: Date.now() - this.analysisStartTime,
          website: window.location.href
        });

        return response;
      } else {
        throw new Error(response.error || '视觉分析失败');
      }

    } catch (error) {
      console.error('❌ 视觉分析失败:', error);

      this.eventBus.emit('visual-analysis-error', {
        error: error.message,
        duration: Date.now() - this.analysisStartTime,
        website: window.location.href
      });

      // 检查是否启用回退到传统模式
      if (this.configManager.isFeatureEnabled('fallback_to_traditional')) {
        console.log('🔄 回退到传统分析模式...');
        return await this.fallbackToTraditionalMode();
      }

      throw error;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 等待页面稳定
   */
  async waitForPageStable() {
    const timing = this.configManager.getTiming();
    const waitTime = timing.wait_after_load || 2000;

    console.log(`[VisualAnalyzer] 等待页面稳定 ${waitTime}ms...`);

    return new Promise(resolve => {
      setTimeout(resolve, waitTime);
    });
  }

  /**
   * 获取简历数据
   */
  async getResumeData() {
    try {
      // 从 chrome.storage 获取简历数据
      const result = await chrome.storage.local.get(['currentResume', 'resumeData']);

      if (result.currentResume) {
        console.log('[VisualAnalyzer] 使用当前选中的简历');
        return result.currentResume;
      } else if (result.resumeData) {
        console.log('[VisualAnalyzer] 使用存储的简历数据');
        return result.resumeData;
      }

      // 尝试从后端获取
      console.log('[VisualAnalyzer] 尝试从后端获取简历数据...');
      const response = await this.sendMessageToBackground({
        action: 'getCurrentResume'
      });

      if (response && response.success) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('[VisualAnalyzer] 获取简历数据失败:', error);
      return null;
    }
  }

  /**
   * 发送分析请求到后端
   */
  async sendAnalysisRequest(requestData) {
    try {
      const response = await this.sendMessageToBackground({
        action: 'analyzeVisual',
        data: requestData
      });

      if (!response) {
        throw new Error('后端无响应');
      }

      return response;
    } catch (error) {
      console.error('[VisualAnalyzer] API请求失败:', error);
      throw new Error(`视觉分析API调用失败: ${error.message}`);
    }
  }

  /**
   * 发送消息到 background script
   */
  async sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Background script 响应超时'));
      }, 30000); // 30秒超时

      chrome.runtime.sendMessage(message, response => {
        clearTimeout(timeout);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(response);
      });
    });
  }

  /**
   * 回退到传统分析模式
   */
  async fallbackToTraditionalMode() {
    try {
      console.log('[VisualAnalyzer] 执行传统分析模式...');

      const resumeData = await this.getResumeData();
      if (!resumeData) {
        throw new Error('无法获取简历数据');
      }

      const response = await this.sendMessageToBackground({
        action: 'analyzeHtml', // 调用传统分析接口
        data: {
          html: document.documentElement.outerHTML,
          resume_data: resumeData,
          website_url: window.location.href
        }
      });

      if (response && response.success) {
        console.log('✅ 传统分析模式完成');

        // 转换为视觉分析格式
        const visualFormatResult = this.convertTraditionalToVisualFormat(response);

        this.eventBus.emit('visual-analysis-complete', {
          result: visualFormatResult,
          duration: Date.now() - this.analysisStartTime,
          website: window.location.href,
          fallback: true
        });

        return visualFormatResult;
      } else {
        throw new Error(response?.error || '传统分析也失败了');
      }
    } catch (error) {
      console.error('[VisualAnalyzer] 传统分析模式也失败:', error);
      throw error;
    }
  }

  /**
   * 将传统分析结果转换为视觉分析格式
   */
  convertTraditionalToVisualFormat(traditionalResult) {
    return {
      success: traditionalResult.success,
      website_url: traditionalResult.website_url || window.location.href,
      analysis_time: traditionalResult.analysis_time || 0,

      phase_status: {
        phase1_screenshot: { success: false, message: '跳过截图阶段' },
        phase2_field_extraction: { success: false, message: '跳过字段提取阶段' },
        phase3_visual_llm: { success: false, message: '跳过视觉分析阶段' },
        phase4_label_matching: { success: true, message: '传统模式匹配完成' },
        phase5_form_filling: { success: false, message: '未执行填写' }
      },

      statistics: {
        total_form_fields: traditionalResult.matched_fields?.length || 0,
        llm_recognized_fields: traditionalResult.matched_fields?.length || 0,
        successfully_matched_fields: traditionalResult.matched_fields?.length || 0,
        fill_success_rate: 0,
        overall_success_rate: traditionalResult.matched_fields?.length > 0 ? 1 : 0,
        analysis_time_seconds: traditionalResult.analysis_time || 0
      },

      matched_fields: this.convertMatchedFields(traditionalResult.matched_fields || []),

      fill_script: null,
      error: traditionalResult.error,
      failed_phase: null,
      fallback_mode: true
    };
  }

  /**
   * 转换匹配字段格式
   */
  convertMatchedFields(traditionalFields) {
    return traditionalFields.map(field => ({
      form_label: field.name || field.selector || '未知字段',
      value: field.value || '',
      match_type: 'traditional',
      confidence: 0.8
    }));
  }

  /**
   * 获取最后分析结果
   */
  getLastAnalysisResult() {
    return this.lastAnalysisResult;
  }

  /**
   * 检查是否正在分析
   */
  isCurrentlyAnalyzing() {
    return this.isAnalyzing;
  }

  /**
   * 取消正在进行的分析
   */
  cancelAnalysis() {
    if (this.isAnalyzing) {
      this.isAnalyzing = false;
      this.eventBus.emit('visual-analysis-cancelled', {
        timestamp: Date.now()
      });
      console.log('[VisualAnalyzer] 分析已取消');
    }
  }

  /**
   * 获取分析统计信息
   */
  getAnalysisStats() {
    const result = this.lastAnalysisResult;
    if (!result) return null;

    return {
      success: result.success,
      totalFields: result.statistics?.total_form_fields || 0,
      matchedFields: result.statistics?.successfully_matched_fields || 0,
      matchRate: result.statistics?.overall_success_rate || 0,
      analysisTime: result.analysis_time || 0,
      website: result.website_url,
      fallbackMode: result.fallback_mode || false,
      timestamp: this.analysisStartTime
    };
  }

  /**
   * 导出分析结果（用于调试）
   */
  exportAnalysisResult() {
    if (!this.lastAnalysisResult) {
      return null;
    }

    return {
      result: this.lastAnalysisResult,
      config: this.configManager.exportConfig(),
      timestamp: Date.now(),
      website: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  /**
   * 重试分析
   */
  async retryAnalysis() {
    console.log('[VisualAnalyzer] 重试分析...');
    this.lastAnalysisResult = null;
    return await this.analyzeWithVisualMode();
  }
}

// 确保在全局可用
if (typeof window !== 'undefined') {
  window.VisualAnalyzer = VisualAnalyzer;
}
