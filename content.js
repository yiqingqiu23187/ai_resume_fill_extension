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
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <button id="scan-fields-btn" style="flex: 1; padding: 8px 16px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer;">扫描表单</button>
          <button id="auto-fill-btn" style="flex: 1; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;" disabled>开始填写</button>
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

  // 扫描表单字段
  async scanFormFields() {
    try {
      console.log('🤖 AI Resume: 开始扫描表单字段...');

      const fields = [];

      // 定义需要排除的字段类型
      const excludedInputTypes = [
        'hidden', 'button', 'submit', 'reset', 'image',
        'file', 'search', 'range', 'color'
      ];

      // 扫描输入框 - 过滤掉不需要填写的类型
      const inputs = document.querySelectorAll('input');
      inputs.forEach((input, index) => {
        const inputType = input.type ? input.type.toLowerCase() : 'text';

        // 跳过不需要AI填写的字段类型
        if (excludedInputTypes.includes(inputType)) {
          return;
        }

        const fieldInfo = this.extractFieldInfo(input, 'input', index);
        if (fieldInfo && this.isValidFieldForAI(fieldInfo)) {
          fields.push(fieldInfo);
        }
      });

      // 扫描选择框
      const selects = document.querySelectorAll('select');
      selects.forEach((select, index) => {
        const fieldInfo = this.extractFieldInfo(select, 'select', index);
        if (fieldInfo && this.isValidFieldForAI(fieldInfo)) {
          fields.push(fieldInfo);
        }
      });

      // 扫描文本域
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach((textarea, index) => {
        const fieldInfo = this.extractFieldInfo(textarea, 'textarea', index);
        if (fieldInfo && this.isValidFieldForAI(fieldInfo)) {
          fields.push(fieldInfo);
        }
      });

      this.scannedFields = fields;
      this.updateFieldsDisplay();

      console.log(`🤖 AI Resume: 扫描完成，找到 ${fields.length} 个字段`);

      // 启用填写按钮
      const autoFillBtn = document.querySelector('#auto-fill-btn');
      if (autoFillBtn && fields.length > 0) {
        autoFillBtn.disabled = false;
      }

    } catch (error) {
      console.error('🤖 AI Resume: 扫描表单字段时发生错误:', error);
    }
  }

  // 提取字段信息
  extractFieldInfo(element, type, index) {
    try {
      const label = this.getFieldLabel(element);
      const fieldType = this.getFieldType(element);

      const attributes = {
        id: element.id || `${type}_${index}`,
        name: element.name || '',
        placeholder: element.placeholder || '',
        required: element.required || false,
        value: element.value || ''
      };

      let options = [];
      if (type === 'select' && element.options) {
        options = Array.from(element.options).map(option => ({
          value: option.value,
          text: option.textContent.trim()
        })).filter(option => option.value);
      }

      return {
        name: element.name || element.id || `field_${index}`,
        type: fieldType,
        elementType: type,
        label,
        attributes,
        options,
        element: element
      };
    } catch (error) {
      console.error('🤖 AI Resume: 提取字段信息失败:', error);
      return null;
    }
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

  // 判断字段是否适合AI填写
  isValidFieldForAI(fieldInfo) {
    if (!fieldInfo) return false;

    // 检查字段是否可见 - 放宽条件，包括一些动态显示的字段
    const element = fieldInfo.element;
    if (!element) return false;

    // 检查元素是否在DOM中且不是完全隐藏的
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    // 检查字段是否被禁用 - 只过滤明确禁用的，不过滤只读
    if (element.disabled) {
      return false;
    }

    // 过滤验证码、密码等特殊字段 - 只过滤明确的敏感字段
    const excludePatterns = [
      /captcha/i, /验证码/, /^密码$/, /^password$/i, /confirm.*password/i,
      /csrf/i, /^token$/i, /api.*key/i
    ];

    const labelText = fieldInfo.label.toLowerCase();
    const nameText = (fieldInfo.attributes?.name || '').toLowerCase();
    const placeholderText = (fieldInfo.attributes?.placeholder || '').toLowerCase();

    for (const pattern of excludePatterns) {
      if (pattern.test(labelText) || pattern.test(nameText) || pattern.test(placeholderText)) {
        console.log(`🤖 AI Resume: 过滤敏感字段 ${fieldInfo.label}`);
        return false;
      }
    }

    // 输出调试信息
    console.log(`🤖 AI Resume: 字段通过验证 - ${fieldInfo.label} [${fieldInfo.type}]`);
    return true;
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

      // 检查是否有扫描到的字段
      if (this.scannedFields.length === 0) {
        this.showMessage('请先扫描表单字段', 'warning');
        return;
      }

      // 检查用户认证状态
      console.log('🤖 AI Resume: 检查用户认证状态...');
      const authResult = await this.sendMessageToBackground({ action: 'checkAuthStatus' });

      if (!authResult || !authResult.success || !authResult.isAuthenticated) {
        this.showMessage('请先在插件中登录账户', 'warning');
        return;
      }

      // 获取用户简历数据
      console.log('🤖 AI Resume: 获取用户简历数据...');
      const resumeResult = await this.sendMessageToBackground({ action: 'getResume' });

      if (!resumeResult || !resumeResult.success) {
        this.showMessage('获取简历数据失败: ' + (resumeResult?.error || '未知错误'), 'error');
        return;
      }

      if (!resumeResult.data) {
        this.showMessage('请先在插件中创建和设置简历信息', 'warning');
        return;
      }

      console.log('🤖 AI Resume: 简历数据获取成功', resumeResult.data);

      // 从简历数据中提取resumeId
      let resumeId = null;
      if (resumeResult.data && resumeResult.data.id) {
        resumeId = resumeResult.data.id;
      }

      if (!resumeId) {
        this.showMessage('简历数据格式错误，缺少ID。请重新保存简历', 'error');
        console.error('🤖 AI Resume: 简历数据缺少ID:', resumeResult.data);
        return;
      }

      // 准备字段信息用于AI匹配 - 转换为后端期望的格式
      const fieldsForMatching = this.scannedFields.map(field => ({
        name: field.name || field.attributes?.name || field.attributes?.id || `field_${Date.now()}`,
        type: field.type,
        label: field.label,
        placeholder: field.attributes?.placeholder || '',
        required: field.attributes?.required || false,
        options: field.options?.map(opt => opt.text || opt.value) || [],
        selector: null, // 可以后续添加CSS选择器生成
        xpath: null     // 可以后续添加XPath生成
      }));

      console.log('🤖 AI Resume: 发送字段信息进行AI匹配...', fieldsForMatching);
      this.showMessage('正在进行AI智能匹配...', 'info');

      // 发送字段信息到后端进行AI匹配
      const matchResult = await this.sendMessageToBackground({
        action: 'matchFields',
        fields: fieldsForMatching,
        resumeId: resumeId,
        websiteUrl: window.location.href
      });

      if (!matchResult || !matchResult.success) {
        const errorMsg = matchResult ? matchResult.error : '网络连接失败';
        this.showMessage('AI匹配失败: ' + errorMsg, 'error');
        return;
      }

      console.log('🤖 AI Resume: AI匹配成功', matchResult.data);

      // 检查匹配结果
      const matchData = matchResult.data;
      if (!matchData || !matchData.matches) {
        this.showMessage('AI匹配返回数据格式错误', 'error');
        return;
      }

      const { matches, total_fields, matched_fields } = matchData;
      this.showMessage(
        `AI匹配完成！成功匹配 ${matched_fields}/${total_fields} 个字段，开始填写...`,
        'success'
      );

      // 执行填写
      await this.fillFields(matches);

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
