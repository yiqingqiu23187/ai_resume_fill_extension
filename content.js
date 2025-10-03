/**
 * AI Resume AutoFill - Content Script
 * 负责DOM操作、表单字段识别、自动填写功能
 */

console.log('🤖 AI Resume: Content Script 开始加载');

class FormFieldScanner {
  constructor() {
    console.log('🤖 AI Resume: 插件初始化开始');
    this.isActive = false;
    this.scannedFields = [];

    // 基础初始化
    this.init();
  }

  async init() {
    try {
      // 等待DOM完全加载
      await this.waitForDOM();

      // 创建UI
      this.createFloatingButton();
      this.createStatusPanel();

      // 设置事件监听
      this.setupEventListeners();

      // 自动检测表单
      setTimeout(() => {
        this.autoDetectForms();
      }, 1000);

      console.log('🤖 AI Resume: 插件初始化完成');
    } catch (error) {
      console.error('🤖 AI Resume: 初始化失败', error);
    }
  }

  waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        resolve();
      } else {
        document.addEventListener('DOMContentLoaded', resolve);
      }
    });
  }

  // 创建悬浮按钮
  createFloatingButton() {
    // 确保不重复创建
    if (document.getElementById('ai-resume-autofill-button')) {
      return;
    }

    const button = document.createElement('div');
    button.id = 'ai-resume-autofill-button';
    // 使用更简单但更强制的样式
    button.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      z-index: 999999999 !important;
      display: none !important;
      width: 160px !important;
      height: 50px !important;
      background: #667eea !important;
      color: white !important;
      border: none !important;
      border-radius: 25px !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
      cursor: pointer !important;
      font-family: Arial, sans-serif !important;
      font-size: 14px !important;
      font-weight: bold !important;
      line-height: 50px !important;
      text-align: center !important;
      user-select: none !important;
    `;

    // 设置按钮内容（简化版本，避免复杂HTML结构）
    button.textContent = '🤖 AI填写简历';

    button.addEventListener('click', () => this.togglePanel());

    // 安全地添加到页面
    try {
      document.body.appendChild(button);
      this.floatingButton = button;
      console.log('🤖 AI Resume: 悬浮按钮已创建');
    } catch (error) {
      console.error('🤖 AI Resume: 创建悬浮按钮失败', error);
    }
  }

  // 创建状态面板
  createStatusPanel() {
    if (document.getElementById('ai-resume-status-panel')) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'ai-resume-status-panel';
    panel.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      z-index: 2147483648 !important;
      display: none !important;
      width: 400px !important;
      max-height: 600px !important;
      background: white !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      overflow: hidden !important;
    `;

    panel.innerHTML = `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 16px; font-weight: 600;">AI简历填写</span>
        <button id="panel-close" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 4px;">&times;</button>
      </div>
      <div style="padding: 20px;">
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>识别字段：</span>
            <span id="fields-count">0</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
            <span>填写进度：</span>
            <span id="fill-progress">0/0</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <button id="scan-fields-btn" style="flex: 1; padding: 8px 12px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; font-size: 12px;">传统扫描</button>
          <button id="smart-match-btn" style="flex: 1; padding: 8px 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">🚀 智能匹配</button>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <button id="analyze-html-btn" style="flex: 1; padding: 8px 12px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">🎯 AI分析(旧)</button>
        </div>
        <div style="margin-bottom: 16px;">
          <button id="auto-fill-btn" style="width: 100%; padding: 10px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;" disabled>开始智能填写</button>
        </div>
        <div id="field-list" style="max-height: 300px; overflow-y: auto;">
          <!-- 字段列表 -->
        </div>
      </div>
    `;

    try {
      document.body.appendChild(panel);
      this.statusPanel = panel;

      // 绑定事件
      panel.querySelector('#panel-close').addEventListener('click', () => this.hidePanel());
      panel.querySelector('#scan-fields-btn').addEventListener('click', () => this.scanFormFields());
      panel.querySelector('#smart-match-btn').addEventListener('click', () => this.smartMatchFields());
      panel.querySelector('#analyze-html-btn').addEventListener('click', () => this.analyzeHTMLWithLLM());
      panel.querySelector('#auto-fill-btn').addEventListener('click', () => this.startAutoFill());

      console.log('🤖 AI Resume: 状态面板已创建');
    } catch (error) {
      console.error('🤖 AI Resume: 创建状态面板失败', error);
    }
  }

  // 设置事件监听器
  setupEventListeners() {
    // 监听来自background script的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'pageLoaded') {
        setTimeout(() => this.autoDetectForms(), 500);
      }
    });

    // 监听页面变化
    const observer = new MutationObserver((mutations) => {
      if (this.isActive) {
        let hasNewForms = false;
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && this.containsFormElements(node)) {
                hasNewForms = true;
              }
            });
          }
        });

        if (hasNewForms) {
          setTimeout(() => this.scanFormFields(), 500);
        }
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // 自动检测表单
  autoDetectForms() {
    console.log('🤖 AI Resume: 开始检测表单...');

    // 宽松的表单元素检测
    const allInputs = document.querySelectorAll('input, select, textarea');
    const visibleFormElements = Array.from(allInputs).filter(element => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    console.log(`🤖 AI Resume: 页面总表单元素: ${allInputs.length}, 可见元素: ${visibleFormElements.length}`);

    // 检测页面特征
    const pageFeatures = {
      hasFormElements: visibleFormElements.length > 0,
      urlContainsForm: /resume|form|profile|register|signup|apply|job|recruit|hire|简历|表单|申请|注册|招聘/i.test(window.location.href),
      pageContainsFormKeywords: /resume|form|profile|register|signup|apply|job|recruit|hire|简历|表单|申请|注册|招聘/i.test(document.body.textContent),
      hasFormClass: document.querySelector('[class*="form"], [class*="resume"], [class*="profile"], [class*="register"], [class*="apply"]'),
      hasFormTags: document.querySelector('form'),
      pageTitle: document.title
    };

    console.log('🤖 AI Resume: 页面特征分析:', pageFeatures);

    // 更宽松的显示条件
    const shouldShowButton =
      pageFeatures.hasFormElements ||
      pageFeatures.urlContainsForm ||
      pageFeatures.hasFormClass ||
      pageFeatures.hasFormTags ||
      (pageFeatures.pageContainsFormKeywords && visibleFormElements.length >= 1);

    if (shouldShowButton) {
      console.log('🤖 AI Resume: 条件满足，显示按钮');
      this.showFloatingButton();

      // 备用方案：如果按钮仍然不可见，创建备用按钮
      setTimeout(() => {
        const button = document.getElementById('ai-resume-autofill-button');
        if (button) {
          const rect = button.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            console.log('🤖 AI Resume: 主按钮不可见，创建备用按钮');
            this.createBackupButton();
          }
        }
      }, 2000);
    } else {
      console.log('🤖 AI Resume: 未检测到表单特征，不显示按钮');
    }
  }

  // 扫描表单字段 - 多层启发式策略
  async scanFormFields() {
    try {
      console.log('🔍 AI Resume: 开始智能字段识别...');

      // 第一步：圈定目标 - 所有可能需要填写的元素
      const allCandidates = document.querySelectorAll('input, textarea, select');
      console.log(`🔍 发现 ${allCandidates.length} 个候选字段`);

      const fieldsToAnalyze = [];

      // 第二步：为每个元素建立完整档案
      allCandidates.forEach((element, index) => {
        const fieldProfile = this.buildFieldProfile(element, index);
        if (fieldProfile && this.shouldAnalyzeField(element)) {
          fieldsToAnalyze.push(fieldProfile);
          console.log(`✅ 字段 ${index + 1}: ${fieldProfile.clues.bestLabel || '未知'} [${element.tagName.toLowerCase()}]`);
        } else {
          console.log(`❌ 跳过字段 ${index + 1}: ${element.tagName.toLowerCase()}-${element.type || 'unknown'}`);
        }
      });

      this.scannedFields = fieldsToAnalyze;
      console.log(`🎯 AI Resume: 字段档案建立完成，共 ${fieldsToAnalyze.length} 个有效字段`);

      // 输出详细的字段信息用于调试
      this.logFieldProfiles(fieldsToAnalyze);

      // 更新显示
      this.updateFieldsDisplay();

      // 启用填写按钮
      const autoFillBtn = document.querySelector('#auto-fill-btn');
      if (autoFillBtn && fieldsToAnalyze.length > 0) {
        autoFillBtn.disabled = false;
      }

    } catch (error) {
      console.error('🤖 AI Resume: 扫描字段时发生错误:', error);
      this.showMessage('扫描表单字段失败: ' + error.message, 'error');
    }
  }

  // 🎯 新增：HTML分析方法 - 发送给大模型分析
  async analyzeHTMLWithLLM() {
    try {
      console.log('🤖 AI Resume: 开始HTML智能分析...');
      this.showMessage('正在使用AI分析页面结构...', 'info');

      // 🔐 首先检查用户登录状态
      const authResponse = await this.sendMessageToBackground({
        action: 'checkAuthStatus'
      });

      if (!authResponse.success || !authResponse.isAuthenticated) {
        this.showMessage('请先登录以使用AI分析功能', 'error');
        return;
      }

      // 获取当前页面的HTML
      const htmlContent = document.documentElement.outerHTML;
      console.log(`📄 页面HTML长度: ${htmlContent.length}`);

      // 获取用户简历ID（自动获取第一份简历）
      const resumeId = await this.getSelectedResumeId();
      if (!resumeId) {
        this.showMessage('未找到简历数据，请先登录并创建简历', 'error');
        return;
      }

      // 发送到后端进行分析
      const response = await this.sendMessageToBackground({
        action: 'analyzeHTML',
        data: {
          html_content: htmlContent,
          resume_id: resumeId,
          website_url: window.location.href
        }
      });

      if (response.success) {
        console.log('🎉 AI HTML分析成功:', response.data);

        // 存储分析结果
        this.analyzedFields = response.data.analyzed_fields || [];
        this.formStructure = response.data.form_structure || {};

        // 更新显示
        this.updateAnalysisDisplay(response.data);

        const fieldCount = this.analyzedFields.length;

        this.showMessage(
          `🎯 AI分析完成！识别到 ${fieldCount} 个字段，点击"开始智能填写"进行自动填写`,
          'success'
        );

        // 启用自动填写按钮
        const autoFillBtn = document.querySelector('#auto-fill-btn');
        if (autoFillBtn) {
          autoFillBtn.disabled = false;
          autoFillBtn.style.background = '#667eea';
        }

      } else {
        console.error('❌ AI HTML分析失败:', response.error);
        this.showMessage(`AI分析失败: ${response.error}`, 'error');
      }

    } catch (error) {
      console.error('🤖 AI Resume: HTML分析时发生错误:', error);
      this.showMessage('HTML分析失败: ' + error.message, 'error');
    }
  }

  // 🚀 新增：智能匹配字段（方案二）
  async smartMatchFields() {
    try {
      console.log('🚀 AI Resume: 开始智能字段匹配...');
      this.showMessage('正在智能匹配字段...', 'info');

      // 1. 先扫描字段
      await this.scanFormFields();

      if (!this.scannedFields || this.scannedFields.length === 0) {
        this.showMessage('未找到可填写的字段', 'warning');
        return;
      }

      // 2. 检查登录状态
      const authResponse = await this.sendMessageToBackground({
        action: 'checkAuthStatus'
      });

      if (!authResponse.success || !authResponse.isAuthenticated) {
        this.showMessage('请先登录以使用智能匹配功能', 'error');
        return;
      }

      // 3. 获取简历ID
      const resumeId = await this.getSelectedResumeId();
      if (!resumeId) {
        this.showMessage('未找到简历数据，请先登录并创建简历', 'error');
        return;
      }

      // 4. 准备字段数据（只保留必要字段）
      const fieldsToMatch = this.scannedFields.map(f => {
        const fieldData = {
          selector: f.selector,
          label: f.label
        };

        // 只在有值时才添加 placeholder
        if (f.attributes?.placeholder || f.clues?.placeholder) {
          fieldData.placeholder = f.attributes.placeholder || f.clues.placeholder;
        }

        // 只在有选项时才添加 options（且简化为文本数组）
        if (f.options && f.options.length > 0) {
          fieldData.options = f.options.map(opt => opt.text);
        }

        return fieldData;
      });

      console.log('📤 发送字段数据:', fieldsToMatch);

      // 5. 调用后端匹配接口
      const response = await this.sendMessageToBackground({
        action: 'matchFields',
        data: {
          fields: fieldsToMatch,
          resume_id: resumeId
        }
      });

      if (response.success) {
        console.log('🎉 AI匹配成功:', response.data);

        // 存储匹配结果
        this.matchedFields = response.data.matched_fields || [];

        this.showMessage(
          `🎉 智能匹配完成！成功匹配 ${this.matchedFields.length} 个字段`,
          'success'
        );

        // 启用填写按钮
        const autoFillBtn = document.querySelector('#auto-fill-btn');
        if (autoFillBtn) {
          autoFillBtn.disabled = false;
          autoFillBtn.style.background = '#667eea';
        }

        // 直接开始填写
        await this.fillMatchedFields(this.matchedFields);

      } else {
        console.error('❌ AI匹配失败:', response.error);
        this.showMessage(`智能匹配失败: ${response.error}`, 'error');
      }

    } catch (error) {
      console.error('🤖 AI Resume: 智能匹配时发生错误:', error);
      this.showMessage('智能匹配失败: ' + error.message, 'error');
    }
  }

  // 获取选中的简历ID
  async getSelectedResumeId() {
    // 🎯 首先尝试从localStorage获取
    let resumeId = localStorage.getItem('selected_resume_id');

    // 🚀 如果没有，则自动获取用户的第一份简历
    if (!resumeId) {
      try {
        console.log('🔍 正在获取用户的第一份简历...');

        // 调用background获取简历数据
        const response = await this.sendMessageToBackground({
          action: 'getResume'
        });

        if (response.success && response.data && response.data.id) {
          resumeId = response.data.id;
          // 缓存到localStorage，避免重复请求
          localStorage.setItem('selected_resume_id', resumeId);
          console.log('✅ 获取到简历ID:', resumeId);
        } else {
          console.warn('⚠️ 用户暂无简历数据:', response);
          return null;
        }
      } catch (error) {
        console.error('❌ 获取简历ID失败:', error);
        return null;
      }
    }

    return resumeId;
  }

  // 更新分析结果显示
  updateAnalysisDisplay(analysisData) {
    // 更新字段数量显示
    this.updateFieldsDisplay();

    // 在状态面板中显示分析结果
    const statusPanel = document.querySelector('#ai-resume-status-panel');
    if (statusPanel) {
      // 查找或创建结果显示区域
      let resultsDiv = statusPanel.querySelector('#analysis-results');
      if (!resultsDiv) {
        resultsDiv = document.createElement('div');
        resultsDiv.id = 'analysis-results';
        resultsDiv.style.cssText = `
          margin-top: 15px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #f9f9f9;
          max-height: 200px;
          overflow-y: auto;
        `;
        statusPanel.appendChild(resultsDiv);
      }

      // 按分类显示字段
      const categories = analysisData.form_structure || {};
      let html = '<div style="font-size: 12px;">';

      Object.keys(categories).forEach(category => {
        const fields = categories[category] || [];
        if (fields.length > 0) {
          html += `<div style="margin-bottom: 8px;">`;
          html += `<strong>${this.getCategoryName(category)}:</strong> `;
          html += `<span style="color: #666;">${fields.length}个字段</span>`;
          html += `</div>`;
        }
      });

      html += '</div>';
      resultsDiv.innerHTML = html;
    }
  }

  // 获取分类中文名称
  getCategoryName(category) {
    const names = {
      'basic_info': '基本信息',
      'education': '教育经历',
      'work_experience': '工作经验',
      'other': '其他'
    };
    return names[category] || category;
  }

  // 🥇 为字段建立完整档案 - 多层启发式策略核心
  buildFieldProfile(element, index) {
    try {
      // 生成唯一选择器，用于后续定位
      const uniqueSelector = this.generateUniqueCssSelector(element);

       // 搜集所有可能的线索
       const clues = {
         // 🥇 第一层：最可靠的语义链接
         labelFor: this.findLabelFor(element),
         frameworkLabel: this.findFrameworkLabel(element), // 🎯 新增：框架标签
         parentLabel: this.findParentLabel(element),

         // 🥈 第二层：元素自身的描述性属性
         placeholder: element.placeholder || '',
         ariaLabel: element.ariaLabel || element.getAttribute('aria-label') || '',
         ariaLabelledBy: element.getAttribute('aria-labelledby') || '',
         title: element.title || '',

         // 🥉 第三层：命名约定和ID/Name
         id: element.id || '',
         name: element.name || '',
         className: element.className || '',

         // 🔍 第四层：上下文线索
         siblingText: this.findSiblingText(element),
         parentText: this.findParentText(element),
         sectionHeader: this.findSectionHeader(element),

         // 综合得出最佳标签
         bestLabel: this.determineBestLabel(element)
       };

      // 字段基本信息
      const fieldProfile = {
        selector: uniqueSelector,
        tag: element.tagName.toLowerCase(),
        type: element.type || 'text',
        clues: clues,

        // 兼容旧格式的属性
        name: clues.name || clues.id || `field_${index}`,
        elementType: element.tagName.toLowerCase(),
        label: clues.bestLabel,
        attributes: {
          id: clues.id,
          name: clues.name,
          placeholder: clues.placeholder,
          required: element.required || false,
          readonly: element.readOnly || false,
          disabled: element.disabled || false
        },
        element: element
      };

      // 对于select元素，提取选项
      if (element.tagName === 'SELECT') {
        fieldProfile.options = Array.from(element.options).map(opt => ({
          value: opt.value,
          text: opt.textContent.trim()
        })).filter(opt => opt.value);

        fieldProfile.clues.options = fieldProfile.options.map(opt => opt.text);
      }

      return fieldProfile;
    } catch (error) {
      console.error('🔍 AI Resume: 建立字段档案失败:', error);
      return null;
    }
  }

  // 🏷️ 确定最佳标签
  determineBestLabel(element) {
    const candidates = [
      this.findLabelFor(element),
      this.findFrameworkLabel(element),  // 🎯 新增：框架模式识别 (高优先级)
      this.findParentLabel(element),
      element.ariaLabel || element.getAttribute('aria-label'),
      this.cleanLabelText(element.placeholder),
      this.cleanLabelText(element.title),
      this.findSiblingText(element),
      this.inferLabelFromName(element),
      `${element.tagName.toLowerCase()}_${Date.now() % 1000}`
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.trim() && candidate.length >= 2) {
        return candidate.trim();
      }
    }

    return `未知字段_${Date.now() % 1000}`;
  }

  // 🔗 查找label[for]关联
  findLabelFor(element) {
    if (!element.id) return null;
    const label = document.querySelector(`label[for="${element.id}"]`);
    return label ? this.cleanLabelText(label.textContent) : null;
  }

  // 🎯 针对UI框架的特殊识别 (新增)
  findFrameworkLabel(element) {
    // iView/View UI框架模式识别
    const formItem = element.closest('.ivu-form-item');
    if (formItem) {
      const label = formItem.querySelector('.ivu-form-item-label');
      if (label) {
        return this.cleanLabelText(label.textContent);
      }
    }

    // Element UI框架模式识别
    const elFormItem = element.closest('.el-form-item');
    if (elFormItem) {
      const label = elFormItem.querySelector('.el-form-item__label');
      if (label) {
        return this.cleanLabelText(label.textContent);
      }
    }

    // Ant Design框架模式识别
    const antFormItem = element.closest('.ant-form-item');
    if (antFormItem) {
      const label = antFormItem.querySelector('.ant-form-item-label label');
      if (label) {
        return this.cleanLabelText(label.textContent);
      }
    }

    // 通用form-item模式
    const genericFormItem = element.closest('[class*="form-item"], [class*="field"], [class*="input-group"]');
    if (genericFormItem) {
      const possibleLabels = genericFormItem.querySelectorAll('label, [class*="label"]');
      for (const label of possibleLabels) {
        if (label !== element && !label.contains(element)) {
          const labelText = this.cleanLabelText(label.textContent);
          if (labelText && labelText.length <= 20) {
            return labelText;
          }
        }
      }
    }

    return null;
  }

  // 📦 查找父级label
  findParentLabel(element) {
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // 排除input自身的文本
      const labelText = parentLabel.textContent;
      const inputText = element.value || element.placeholder || '';
      const cleanText = labelText.replace(inputText, '');
      return this.cleanLabelText(cleanText);
    }
    return null;
  }

  // 👥 查找兄弟元素文本
  findSiblingText(element) {
    const candidates = [];

    // 前面的兄弟元素
    let sibling = element.previousElementSibling;
    for (let i = 0; i < 3 && sibling; i++) {
      if (sibling.textContent && sibling.textContent.trim()) {
        candidates.push(this.cleanLabelText(sibling.textContent));
      }
      sibling = sibling.previousElementSibling;
    }

    // 父元素的前一个兄弟
    const parentSibling = element.parentElement?.previousElementSibling;
    if (parentSibling && parentSibling.textContent) {
      candidates.push(this.cleanLabelText(parentSibling.textContent));
    }

    return candidates.find(text => text && text.length >= 2 && text.length <= 20) || '';
  }

  // 📄 查找父容器文本
  findParentText(element) {
    const parent = element.parentElement;
    if (!parent) return '';

    const fullText = parent.textContent || '';
    // 截断过长的文本
    return fullText.slice(0, 100);
  }

  // 📋 查找章节标题
  findSectionHeader(element) {
    let container = element.parentElement;
    for (let i = 0; i < 5 && container; i++) {
      const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6, .title, .header, [class*="title"], [class*="header"]');
      for (const header of headers) {
        const headerText = this.cleanLabelText(header.textContent);
        if (headerText && headerText.length <= 30) {
          return headerText;
        }
      }
      container = container.parentElement;
    }
    return '';
  }

  // 🧠 从name/id推断标签
  inferLabelFromName(element) {
    const name = element.name || element.id || '';
    if (!name) return '';

    // 常见模式映射
    const patterns = [
      [/name|姓名|xingming/i, '姓名'],
      [/phone|tel|mobile|手机|电话|shouji|dianhua/i, '手机号'],
      [/email|邮箱|youxiang|mail/i, '邮箱'],
      [/age|年龄|nianling/i, '年龄'],
      [/birth|生日|birthday|shengri/i, '生日'],
      [/gender|sex|性别|xingbie/i, '性别'],
      [/address|地址|dizhi/i, '地址'],
      [/company|公司|gongsi/i, '公司'],
      [/position|title|职位|zhiwei/i, '职位'],
      [/salary|薪资|xinzi|工资|gongzi/i, '薪资'],
      [/experience|exp|经验|jingyan/i, '工作经验'],
      [/education|学历|xueli/i, '学历'],
      [/school|学校|xuexiao/i, '学校'],
      [/major|专业|zhuanye/i, '专业'],
      [/skill|技能|jineng/i, '技能']
    ];

    for (const [pattern, label] of patterns) {
      if (pattern.test(name)) {
        return label;
      }
    }

    // 转换驼峰命名
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  }

  // 获取字段标签 - 增强版
  getFieldLabel(element) {
    let label = '';

    // 方法1: 通过label标签的for属性关联
    if (element.id) {
      const labelElement = document.querySelector(`label[for="${element.id}"]`);
      if (labelElement) {
        label = this.cleanLabelText(labelElement.textContent);
        if (label) return label;
      }
    }

    // 方法2: 查找父级label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      label = this.cleanLabelText(parentLabel.textContent);
      if (label) return label;
    }

    // 方法3: 查找同级或前面的标签元素
    const candidates = [
      // 前面的兄弟元素
      element.previousElementSibling,
      // 父元素的前一个兄弟
      element.parentElement?.previousElementSibling,
      // 查找附近的文本节点
      ...this.findNearbyTextElements(element)
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.textContent) {
        label = this.cleanLabelText(candidate.textContent);
        if (label && label.length >= 2 && label.length <= 20) {
          return label;
        }
      }
    }

    // 方法4: 查找特定的DOM结构模式
    label = this.extractLabelFromCommonPatterns(element);
    if (label) return label;

    // 方法5: 使用元素属性
    const attrLabel = element.placeholder || element.title || element.name || element.getAttribute('data-label');
    if (attrLabel) {
      label = this.cleanLabelText(attrLabel);
      if (label) return label;
    }

    // 方法6: 基于元素类型生成描述性名称
    return this.generateDescriptiveName(element);
  }

  // 清理标签文本
  cleanLabelText(text) {
    if (!text) return '';

    return text
      .replace(/[*:：\s]+$/g, '') // 移除末尾的星号、冒号、空格
      .replace(/^\s*[*]\s*/, '') // 移除开头的星号
      .replace(/\s+/g, ' ')      // 合并多个空格
      .replace(/必填|选填|可选/g, '') // 移除必填提示
      .trim();
  }

  // 查找附近的文本元素
  findNearbyTextElements(element) {
    const textElements = [];

    // 查找父容器中的文本
    let parent = element.parentElement;
    for (let i = 0; i < 3 && parent; i++) { // 最多向上查找3级
      const textNodes = this.getTextNodesInElement(parent);
      textElements.push(...textNodes);
      parent = parent.parentElement;
    }

    return textElements;
  }

  // 获取元素中的文本节点
  getTextNodesInElement(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent.trim();
          return text && text.length > 1 && text.length < 30 ?
            NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    return textNodes;
  }

  // 从常见DOM模式中提取标签
  extractLabelFromCommonPatterns(element) {
    // 模式1: div > span + input 结构
    const parentDiv = element.closest('div, li, tr, .form-item, .field, .input-group');
    if (parentDiv) {
      const spans = parentDiv.querySelectorAll('span, div, p, label');
      for (const span of spans) {
        if (span !== element && !span.contains(element)) {
          const text = this.cleanLabelText(span.textContent);
          if (text && text.length >= 2 && text.length <= 15) {
            return text;
          }
        }
      }
    }

    // 模式2: table结构 - td中的标签
    const cell = element.closest('td');
    if (cell) {
      const prevCell = cell.previousElementSibling;
      if (prevCell) {
        const text = this.cleanLabelText(prevCell.textContent);
        if (text) return text;
      }
    }

    return null;
  }

  // 生成描述性名称
  generateDescriptiveName(element) {
    const type = element.type || element.tagName.toLowerCase();
    const name = element.name || element.id || '';

    // 根据name或id猜测字段用途
    const namePatterns = [
      [/name|姓名/i, '姓名'],
      [/phone|tel|手机|电话/i, '电话'],
      [/email|邮箱|mail/i, '邮箱'],
      [/age|年龄/i, '年龄'],
      [/address|地址|addr/i, '地址'],
      [/company|公司/i, '公司'],
      [/title|职位|job/i, '职位'],
      [/salary|薪资|工资/i, '薪资'],
      [/experience|经验|exp/i, '经验'],
      [/education|学历|edu/i, '学历'],
      [/skill|技能/i, '技能'],
      [/desc|description|描述|介绍/i, '描述']
    ];

    for (const [pattern, label] of namePatterns) {
      if (pattern.test(name) || pattern.test(element.placeholder || '')) {
        return label;
      }
    }

    // 默认名称
    return `${type === 'textarea' ? '文本域' : type === 'select' ? '选择框' : '输入框'}_${Date.now() % 1000}`;
  }

  // 获取字段类型
  getFieldType(element) {
    if (element.tagName.toLowerCase() === 'select') return 'select';
    if (element.tagName.toLowerCase() === 'textarea') return 'textarea';
    if (element.tagName.toLowerCase() === 'input') return element.type || 'text';
    return 'unknown';
  }

  // 🚫 判断字段是否应该分析 - 基础过滤
  shouldAnalyzeField(element) {
    // 排除明显不需要填写的字段类型
    const excludedTypes = [
      'hidden', 'button', 'submit', 'reset', 'image',
      'file', 'color', 'range'
    ];

    if (excludedTypes.includes(element.type)) {
      return false;
    }

    // 检查可见性
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    // 检查基本交互性
    if (element.disabled) {
      return false;
    }

    return true;
  }

  // 🔗 生成唯一CSS选择器
  generateUniqueCssSelector(element) {
    try {
      // 方法1: 如果有唯一的ID
      if (element.id) {
        const testSelector = `#${CSS.escape(element.id)}`;
        if (document.querySelectorAll(testSelector).length === 1) {
          return testSelector;
        }
      }

      // 方法2: 使用name属性
      if (element.name) {
        const testSelector = `${element.tagName.toLowerCase()}[name="${CSS.escape(element.name)}"]`;
        if (document.querySelectorAll(testSelector).length === 1) {
          return testSelector;
        }
      }

      // 方法3: 使用nth-child
      let selector = element.tagName.toLowerCase();
      let currentElement = element;

      while (currentElement.parentElement) {
        const parent = currentElement.parentElement;
        const siblings = Array.from(parent.children).filter(
          child => child.tagName === currentElement.tagName
        );

        if (siblings.length > 1) {
          const index = siblings.indexOf(currentElement) + 1;
          selector = `${parent.tagName.toLowerCase()} > ${selector}:nth-child(${index})`;
        } else {
          selector = `${parent.tagName.toLowerCase()} > ${selector}`;
        }

        currentElement = parent;

        // 如果到了有ID的父元素，可以停止
        if (parent.id) {
          selector = `#${CSS.escape(parent.id)} ${selector}`;
          break;
        }

        // 避免选择器过长
        if (selector.split(' ').length > 6) {
          break;
        }
      }

      return selector;
    } catch (error) {
      console.warn('🔗 生成选择器失败，使用备选方案:', error);
      // 备选方案：基于位置的选择器
      const tag = element.tagName.toLowerCase();
      const allSameTag = document.querySelectorAll(tag);
      const index = Array.from(allSameTag).indexOf(element);
      return `${tag}:nth-of-type(${index + 1})`;
    }
  }

  // 📋 输出字段档案用于调试
  logFieldProfiles(profiles) {
    if (profiles.length === 0) {
      console.log('📋 AI Resume: 没有找到有效字段');
      return;
    }

    console.group('📋 AI Resume: 字段档案详情');

    profiles.forEach((profile, index) => {
      console.group(`📝 字段 ${index + 1}: ${profile.clues.bestLabel}`);

      console.log('🎯 基本信息:', {
        tag: profile.tag,
        type: profile.type,
        selector: profile.selector
      });

       console.log('🔍 搜集到的线索:', {
         '🥇 labelFor': profile.clues.labelFor,
         '🥇 frameworkLabel': profile.clues.frameworkLabel,
         '🥇 parentLabel': profile.clues.parentLabel,
         '🥈 placeholder': profile.clues.placeholder,
         '🥈 ariaLabel': profile.clues.ariaLabel,
         '🥉 id': profile.clues.id,
         '🥉 name': profile.clues.name,
         '🔍 siblingText': profile.clues.siblingText,
         '🔍 sectionHeader': profile.clues.sectionHeader
       });

      if (profile.options && profile.options.length > 0) {
        console.log('📋 选项:', profile.options.slice(0, 5)); // 只显示前5个
      }

      console.groupEnd();
    });

     // 统计信息
     const labelSources = profiles.map(p => {
       if (p.clues.labelFor) return 'labelFor';
       if (p.clues.frameworkLabel) return 'frameworkLabel';  // 🎯 新增统计
       if (p.clues.parentLabel) return 'parentLabel';
       if (p.clues.ariaLabel) return 'ariaLabel';
       if (p.clues.placeholder) return 'placeholder';
       if (p.clues.siblingText) return 'siblingText';
       return 'inferred';
     });

    const sourceStats = labelSources.reduce((acc, source) => {
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 标签来源统计:', sourceStats);
    console.groupEnd();
  }

  // 判断字段是否适合AI填写 (保留兼容性)
  isValidFieldForAI(fieldInfo) {
    return this.shouldAnalyzeField(fieldInfo.element);
  }

  // 更新字段显示
  updateFieldsDisplay() {
    const fieldsCountEl = document.querySelector('#fields-count');
    const fieldListEl = document.querySelector('#field-list');

    if (fieldsCountEl) {
      fieldsCountEl.textContent = this.scannedFields.length;
    }

    if (fieldListEl) {
      fieldListEl.innerHTML = '';
      this.scannedFields.forEach((field, index) => {
        const fieldItem = document.createElement('div');
        fieldItem.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        `;
        fieldItem.innerHTML = `
          <div>
            <span style="font-weight: 500;">${field.label}</span>
            <span style="color: #666; font-size: 12px;">[${field.type}]</span>
          </div>
          <span id="field-status-${index}" style="font-size: 12px; color: #666;">等待填写</span>
        `;
        fieldListEl.appendChild(fieldItem);
      });
    }
  }

  // 开始自动填写
  async startAutoFill() {
    try {
      console.log('🤖 AI Resume: 开始自动填写...');

      // 检查是否有AI分析的结果
      if (!this.analyzedFields || this.analyzedFields.length === 0) {
        this.showMessage('请先点击"🎯 AI分析"分析页面表单', 'warning');
        return;
      }

      console.log('🤖 AI Resume: 开始填写AI分析的字段...', this.analyzedFields);

      // 显示开始填写的消息
      this.showMessage(
        `开始填写 ${this.analyzedFields.length} 个字段...`,
        'info'
      );

      // 执行填写
      await this.fillAnalyzedFields(this.analyzedFields);

    } catch (error) {
      console.error('🤖 AI Resume: 自动填写失败:', error);
      this.showMessage('自动填写失败: ' + error.message, 'error');
    }
  }

  // 检查节点是否包含表单元素
  containsFormElements(node) {
    if (['FORM', 'INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName)) {
      return true;
    }
    return node.querySelector && node.querySelector('form, input, select, textarea');
  }

  // 显示/隐藏按钮
  showFloatingButton() {
    if (this.floatingButton) {
      // 强制设置显示样式 - 修复display冲突
      this.floatingButton.style.setProperty('display', 'block', 'important');
      this.floatingButton.style.setProperty('visibility', 'visible', 'important');
      this.floatingButton.style.setProperty('opacity', '1', 'important');

      // 调试信息
      const rect = this.floatingButton.getBoundingClientRect();
      console.log('🤖 AI Resume: 悬浮按钮已显示');
      console.log('🤖 AI Resume: 按钮位置:', rect);
      console.log('🤖 AI Resume: 按钮样式display:', this.floatingButton.style.display);
      console.log('🤖 AI Resume: 按钮在DOM中:', document.body.contains(this.floatingButton));

      // 强制刷新按钮位置
      this.floatingButton.offsetHeight; // 触发重绘
    } else {
      console.error('🤖 AI Resume: 悬浮按钮元素不存在！');
    }
  }

  hideFloatingButton() {
    if (this.floatingButton) {
      this.floatingButton.style.display = 'none';
    }
  }

  // 创建备用按钮（更强的显示力度）
  createBackupButton() {
    // 移除已存在的备用按钮
    const existingBackup = document.getElementById('ai-resume-backup-button');
    if (existingBackup) {
      existingBackup.remove();
    }

    const backupButton = document.createElement('div');
    backupButton.id = 'ai-resume-backup-button';
    backupButton.style.cssText = `
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      z-index: 9999999999 !important;
      display: block !important;
      width: 200px !important;
      height: 60px !important;
      background: #ff4444 !important;
      color: white !important;
      border: 3px solid #ff0000 !important;
      border-radius: 8px !important;
      box-shadow: 0 8px 32px rgba(255, 68, 68, 0.6) !important;
      cursor: pointer !important;
      font-family: Arial, sans-serif !important;
      font-size: 16px !important;
      font-weight: bold !important;
      line-height: 60px !important;
      text-align: center !important;
    `;

    backupButton.textContent = '🔥 AI填写简历 (备用)';
    backupButton.addEventListener('click', () => this.togglePanel());

    try {
      document.body.appendChild(backupButton);
      console.log('🤖 AI Resume: 备用按钮已创建');
    } catch (error) {
      console.error('🤖 AI Resume: 创建备用按钮失败', error);
    }
  }

  // 切换面板
  togglePanel() {
    if (this.statusPanel.style.display === 'none' || !this.statusPanel.style.display) {
      this.showPanel();
    } else {
      this.hidePanel();
    }
  }

  showPanel() {
    if (this.statusPanel) {
      this.statusPanel.style.display = 'block';
      this.isActive = true;
      // 自动扫描表单
      this.scanFormFields();
    }
  }

  hidePanel() {
    if (this.statusPanel) {
      this.statusPanel.style.display = 'none';
      this.isActive = false;
    }
  }

  // 发送消息到background script
  sendMessageToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('🤖 AI Resume: 消息发送失败:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: '未收到响应' });
        }
      });
    });
  }

  // 填写字段
  async fillFields(matches) {
    if (!matches || matches.length === 0) {
      this.showMessage('没有匹配的字段数据', 'warning');
      return;
    }

    let successCount = 0;
    const totalCount = Math.min(matches.length, this.scannedFields.length);

    console.log('🤖 AI Resume: 开始填写字段，总数:', totalCount);

    for (let i = 0; i < totalCount; i++) {
      const match = matches[i];
      const field = this.scannedFields[i];

      if (!field || !field.element) {
        console.log(`🤖 AI Resume: 跳过无效字段 ${i}`);
        continue;
      }

      try {
        // 更新状态显示
        const statusEl = document.querySelector(`#field-status-${i}`);
        if (statusEl) {
          statusEl.textContent = '填写中...';
          statusEl.style.color = '#007bff';
        }

        // 执行填写
        const success = await this.fillSingleField(field, match);

        if (success) {
          successCount++;
          if (statusEl) {
            statusEl.textContent = '✅ 成功';
            statusEl.style.color = '#28a745';
          }
          console.log(`🤖 AI Resume: 字段 ${field.label} 填写成功`);
        } else {
          if (statusEl) {
            statusEl.textContent = '❌ 失败';
            statusEl.style.color = '#dc3545';
          }
          console.log(`🤖 AI Resume: 字段 ${field.label} 填写失败`);
        }

        // 更新进度
        const progressEl = document.querySelector('#fill-progress');
        if (progressEl) {
          progressEl.textContent = `${i + 1}/${totalCount}`;
        }

        // 延迟避免操作过快
        await this.delay(300);

      } catch (error) {
        console.error(`🤖 AI Resume: 填写字段 ${field.label} 时发生错误:`, error);
        const statusEl = document.querySelector(`#field-status-${i}`);
        if (statusEl) {
          statusEl.textContent = '⚠️ 错误';
          statusEl.style.color = '#dc3545';
        }
      }
    }

    // 显示完成结果
    const resultMessage = `填写完成！成功 ${successCount}/${totalCount} 个字段`;
    this.showMessage(resultMessage, successCount > 0 ? 'success' : 'warning');
    console.log(`🤖 AI Resume: ${resultMessage}`);
  }

  // 填写单个字段
  async fillSingleField(field, match) {
    try {
      const element = field.element;

      const matchValue = match.matched_value || match.value;
      if (!matchValue && matchValue !== 0 && matchValue !== false && matchValue !== '') {
        console.log(`🤖 AI Resume: 字段 ${field.label} 没有匹配到值`);
        return false;
      }

      // 滚动到元素位置
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.delay(200);

      // 聚焦元素
      element.focus();
      await this.delay(100);

      switch (field.elementType) {
        case 'input':
          return await this.fillInputField(element, matchValue, field.type);

        case 'select':
          return await this.fillSelectField(element, matchValue);

        case 'textarea':
          return await this.fillTextareaField(element, matchValue);

        default:
          console.log(`🤖 AI Resume: 不支持的字段类型: ${field.elementType}`);
          return false;
      }
    } catch (error) {
      console.error('🤖 AI Resume: 填写单个字段时发生错误:', error);
      return false;
    }
  }

  // 填写输入框
  async fillInputField(element, value, fieldType) {
    try {
      // 清空现有值
      element.value = '';

      // 触发focus事件
      element.dispatchEvent(new Event('focus', { bubbles: true }));

      // 根据字段类型进行特殊处理
      if (fieldType === 'date') {
        element.value = this.formatDateForInput(value);
      } else {
        element.value = String(value);
      }

      // 触发各种事件确保兼容性
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));

      // 对于某些框架，额外触发键盘事件
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

      return true;
    } catch (error) {
      console.error('🤖 AI Resume: 填写输入框失败:', error);
      return false;
    }
  }

  // 填写选择框
  async fillSelectField(element, value) {
    try {
      const options = Array.from(element.options);
      let selectedOption = null;

      // 优先精确匹配值
      selectedOption = options.find(option =>
        option.value === value || option.value === String(value)
      );

      // 如果没有值匹配，尝试文本匹配
      if (!selectedOption) {
        selectedOption = options.find(option =>
          option.textContent.trim() === String(value)
        );
      }

      // 模糊匹配
      if (!selectedOption) {
        const searchValue = String(value).toLowerCase();
        selectedOption = options.find(option =>
          option.textContent.toLowerCase().includes(searchValue) ||
          searchValue.includes(option.textContent.toLowerCase().trim())
        );
      }

      if (selectedOption) {
        element.value = selectedOption.value;
        element.selectedIndex = selectedOption.index;

        // 触发事件
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));

        return true;
      } else {
        console.log(`🤖 AI Resume: 选择框中未找到匹配的选项: ${value}`);
        return false;
      }
    } catch (error) {
      console.error('🤖 AI Resume: 填写选择框失败:', error);
      return false;
    }
  }

  // 填写文本域
  async fillTextareaField(element, value) {
    try {
      element.value = String(value);

      // 触发事件
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));

      return true;
    } catch (error) {
      console.error('🤖 AI Resume: 填写文本域失败:', error);
      return false;
    }
  }

  // 格式化日期
  formatDateForInput(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toISOString().split('T')[0]; // YYYY-MM-DD格式
    } catch (error) {
      return dateString;
    }
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 显示消息
  showMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 2147483649 !important;
      padding: 12px 16px !important;
      background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#17a2b8'} !important;
      color: ${type === 'warning' ? '#000' : 'white'} !important;
      border-radius: 6px !important;
      font-size: 14px !important;
      max-width: 300px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    `;
    messageEl.textContent = message;

    document.body.appendChild(messageEl);

    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 4000);
  }

  // 🎯 新增：填写AI分析的字段
  async fillAnalyzedFields(analyzedFields) {
    if (!analyzedFields || analyzedFields.length === 0) {
      this.showMessage('没有可填写的字段', 'warning');
      return;
    }

    let successCount = 0;
    let failedCount = 0;
    const totalCount = analyzedFields.length;

    console.log('🤖 AI Resume: 开始填写AI分析的字段，总数:', totalCount);

    for (let i = 0; i < analyzedFields.length; i++) {
      const field = analyzedFields[i];

      try {
        console.log(`🤖 AI Resume: 正在填写字段 ${i + 1}/${totalCount}:`, field);

        // 根据selector定位元素
        const element = document.querySelector(field.selector);
        if (!element) {
          console.log(`🤖 AI Resume: 无法找到元素: ${field.selector}`);
          failedCount++;
          continue;
        }

        // 跳过空值字段
        if (!field.matched_value && field.matched_value !== 0 && field.matched_value !== false) {
          console.log(`🤖 AI Resume: 字段 ${field.name} 值为空，跳过`);
          continue;
        }

        // 滚动到元素位置
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.delay(200);

        // 聚焦元素
        element.focus();
        await this.delay(100);

        // 根据字段类型进行填写
        const success = await this.fillFieldByType(element, field.type, field.matched_value);

        if (success) {
          successCount++;
          console.log(`🤖 AI Resume: 字段 ${field.name} 填写成功: ${field.matched_value}`);
        } else {
          failedCount++;
          console.log(`🤖 AI Resume: 字段 ${field.name} 填写失败`);
        }

        // 更新进度显示
        this.showMessage(
          `正在填写... ${i + 1}/${totalCount} (成功: ${successCount}, 失败: ${failedCount})`,
          'info'
        );

        // 延迟避免操作过快
        await this.delay(300);

      } catch (error) {
        console.error(`🤖 AI Resume: 填写字段 ${field.name} 时发生错误:`, error);
        failedCount++;
      }
    }

    // 显示完成结果
    const resultMessage = `填写完成！成功 ${successCount} 个，失败 ${failedCount} 个`;
    this.showMessage(resultMessage, successCount > 0 ? 'success' : 'warning');
    console.log(`🤖 AI Resume: ${resultMessage}`);
  }

  // 🚀 新增：填写匹配后的字段（方案二）
  async fillMatchedFields(matchedFields) {
    if (!matchedFields || matchedFields.length === 0) {
      this.showMessage('没有可填写的字段', 'warning');
      return;
    }

    let successCount = 0;
    let failedCount = 0;
    const totalCount = matchedFields.length;

    console.log('🚀 AI Resume: 开始填写匹配的字段，总数:', totalCount);

    for (let i = 0; i < matchedFields.length; i++) {
      const field = matchedFields[i];

      try {
        console.log(`🚀 AI Resume: 正在填写字段 ${i + 1}/${totalCount}:`, field);

        // 根据selector定位元素
        const element = document.querySelector(field.selector);
        if (!element) {
          console.log(`🚀 AI Resume: 无法找到元素: ${field.selector}`);
          failedCount++;
          continue;
        }

        // 跳过空值字段
        if (field.matched_value === null || field.matched_value === undefined) {
          console.log(`🚀 AI Resume: 字段值为空，跳过`);
          continue;
        }

        // 滚动到元素位置
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.delay(200);

        // 聚焦元素
        element.focus();
        await this.delay(100);

        // 根据元素类型填写
        const elementType = element.tagName.toLowerCase();
        let success = false;

        if (elementType === 'select') {
          success = await this.fillSelectField(element, field.matched_value);
        } else if (elementType === 'textarea') {
          success = await this.fillTextareaField(element, field.matched_value);
        } else if (elementType === 'input') {
          success = await this.fillInputField(element, field.matched_value, element.type);
        }

        if (success) {
          successCount++;
          console.log(`🚀 AI Resume: 字段填写成功: ${field.matched_value}`);
        } else {
          failedCount++;
          console.log(`🚀 AI Resume: 字段填写失败`);
        }

        // 更新进度显示
        this.showMessage(
          `正在填写... ${i + 1}/${totalCount} (成功: ${successCount}, 失败: ${failedCount})`,
          'info'
        );

        // 延迟避免操作过快
        await this.delay(300);

      } catch (error) {
        console.error(`🚀 AI Resume: 填写字段时发生错误:`, error);
        failedCount++;
      }
    }

    // 显示完成结果
    const resultMessage = `填写完成！成功 ${successCount} 个，失败 ${failedCount} 个`;
    this.showMessage(resultMessage, successCount > 0 ? 'success' : 'warning');
    console.log(`🚀 AI Resume: ${resultMessage}`);
  }

  // 🎯 新增：根据字段类型填写值
  async fillFieldByType(element, fieldType, value) {
    try {
      switch (fieldType.toLowerCase()) {
        case 'input':
          return await this.fillInputField(element, value, element.type);

        case 'select':
          return await this.fillSelectField(element, value);

        case 'textarea':
          return await this.fillTextareaField(element, value);

        case 'radio':
          return await this.fillRadioField(element, value);

        default:
          console.log(`🤖 AI Resume: 不支持的字段类型: ${fieldType}`);
          return false;
      }
    } catch (error) {
      console.error(`🤖 AI Resume: 填写字段时发生错误:`, error);
      return false;
    }
  }

  // 🎯 新增：填写单选按钮
  async fillRadioField(element, value) {
    try {
      // 如果element就是正确的radio按钮，直接选中
      if (element.type === 'radio') {
        element.checked = true;
        this.triggerInputEvent(element);
        return true;
      }

      // 否则根据name查找对应的radio按钮
      const radioName = element.name || element.getAttribute('name');
      if (radioName) {
        const radioButtons = document.querySelectorAll(`input[type="radio"][name="${radioName}"]`);
        for (const radio of radioButtons) {
          if (radio.value === value || radio.nextSibling?.textContent?.trim() === value) {
            radio.checked = true;
            this.triggerInputEvent(radio);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('填写radio字段失败:', error);
      return false;
    }
  }
}

// 初始化
console.log('🤖 AI Resume: 准备初始化扫描器');

let formScanner;

function initializeScanner() {
  if (!formScanner) {
    formScanner = new FormFieldScanner();
  }
}

// 确保DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScanner);
} else {
  // 延迟一点确保页面稳定
  setTimeout(initializeScanner, 100);
}

console.log('🤖 AI Resume: Content Script 加载完成');
