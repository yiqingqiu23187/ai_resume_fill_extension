/**
 * AI Resume AutoFill - Content Script
 * 负责DOM操作、表单字段识别、自动填写功能
 */

class FormFieldScanner {
  constructor() {
    this.isActive = false;
    this.scannedFields = [];
    this.initializeUI();
    this.setupEventListeners();
  }

  // 初始化UI元素
  initializeUI() {
    this.createFloatingButton();
    this.createStatusPanel();
  }

  // 创建悬浮按钮
  createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'ai-resume-autofill-button';
    button.innerHTML = `
      <div class="button-icon">🤖</div>
      <div class="button-text">AI填写简历</div>
    `;
    button.addEventListener('click', () => this.toggleAutoFill());
    document.body.appendChild(button);
    this.floatingButton = button;
  }

  // 创建状态面板
  createStatusPanel() {
    const panel = document.createElement('div');
    panel.id = 'ai-resume-status-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">AI简历填写</span>
        <button class="panel-close">&times;</button>
      </div>
      <div class="panel-content">
        <div class="status-info">
          <div class="status-item">
            <span class="status-label">识别字段：</span>
            <span class="status-value" id="fields-count">0</span>
          </div>
          <div class="status-item">
            <span class="status-label">填写进度：</span>
            <span class="status-value" id="fill-progress">0/0</span>
          </div>
        </div>
        <div class="action-buttons">
          <button id="scan-fields-btn">扫描表单</button>
          <button id="auto-fill-btn" disabled>开始填写</button>
        </div>
        <div class="field-list" id="field-list">
          <!-- 字段列表将在这里显示 -->
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.statusPanel = panel;

    // 绑定面板事件
    panel.querySelector('.panel-close').addEventListener('click', () => {
      this.hideStatusPanel();
    });

    panel.querySelector('#scan-fields-btn').addEventListener('click', () => {
      this.scanFormFields();
    });

    panel.querySelector('#auto-fill-btn').addEventListener('click', () => {
      this.startAutoFill();
    });
  }

  // 设置事件监听器
  setupEventListeners() {
    // 监听来自background script的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'onSupportedSite') {
        this.showFloatingButton();
      }
    });

    // 监听页面变化，处理动态加载的表单
    const observer = new MutationObserver((mutations) => {
      if (this.isActive) {
        // 检查是否有新的表单元素加载
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && this.containsFormElements(node)) {
                // 重新扫描字段
                setTimeout(() => this.scanFormFields(), 500);
              }
            });
          }
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 检查节点是否包含表单元素
  containsFormElements(node) {
    if (node.tagName === 'FORM' || node.tagName === 'INPUT' || node.tagName === 'SELECT' || node.tagName === 'TEXTAREA') {
      return true;
    }
    return node.querySelector && node.querySelector('form, input, select, textarea');
  }

  // 显示/隐藏悬浮按钮
  showFloatingButton() {
    if (this.floatingButton) {
      this.floatingButton.style.display = 'flex';
    }
  }

  hideFloatingButton() {
    if (this.floatingButton) {
      this.floatingButton.style.display = 'none';
    }
  }

  // 显示/隐藏状态面板
  showStatusPanel() {
    if (this.statusPanel) {
      this.statusPanel.style.display = 'block';
    }
  }

  hideStatusPanel() {
    if (this.statusPanel) {
      this.statusPanel.style.display = 'none';
    }
    this.isActive = false;
  }

  // 切换自动填写功能
  toggleAutoFill() {
    this.isActive = !this.isActive;

    if (this.isActive) {
      this.showStatusPanel();
      this.scanFormFields();
    } else {
      this.hideStatusPanel();
    }
  }

  // 扫描表单字段
  async scanFormFields() {
    try {
      console.log('开始扫描表单字段...');

      const fields = [];

      // 扫描所有输入框
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"])');
      inputs.forEach((input, index) => {
        const fieldInfo = this.extractFieldInfo(input, 'input', index);
        if (fieldInfo) {
          fields.push(fieldInfo);
        }
      });

      // 扫描所有选择框
      const selects = document.querySelectorAll('select');
      selects.forEach((select, index) => {
        const fieldInfo = this.extractFieldInfo(select, 'select', index);
        if (fieldInfo) {
          fields.push(fieldInfo);
        }
      });

      // 扫描所有文本域
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach((textarea, index) => {
        const fieldInfo = this.extractFieldInfo(textarea, 'textarea', index);
        if (fieldInfo) {
          fields.push(fieldInfo);
        }
      });

      this.scannedFields = fields;
      this.updateFieldsDisplay();

      console.log(`扫描完成，找到 ${fields.length} 个字段:`, fields);

      // 启用填写按钮
      const autoFillBtn = document.querySelector('#auto-fill-btn');
      if (autoFillBtn && fields.length > 0) {
        autoFillBtn.disabled = false;
      }

    } catch (error) {
      console.error('扫描表单字段时发生错误:', error);
    }
  }

  // 提取字段信息
  extractFieldInfo(element, type, index) {
    try {
      // 获取字段标签
      const label = this.getFieldLabel(element);

      // 获取字段类型
      const fieldType = this.getFieldType(element);

      // 获取字段属性
      const attributes = {
        id: element.id || `${type}_${index}`,
        name: element.name || '',
        placeholder: element.placeholder || '',
        required: element.required || false,
        value: element.value || ''
      };

      // 获取选择项（如果是选择框）
      let options = [];
      if (type === 'select' && element.options) {
        options = Array.from(element.options).map(option => ({
          value: option.value,
          text: option.textContent.trim()
        })).filter(option => option.value); // 过滤掉空值选项
      }

      // 生成唯一选择器
      const selector = this.generateUniqueSelector(element);

      return {
        type: fieldType,
        elementType: type,
        label,
        selector,
        attributes,
        options,
        element: element // 保存元素引用，便于后续填写
      };
    } catch (error) {
      console.error('提取字段信息时发生错误:', error);
      return null;
    }
  }

  // 获取字段标签
  getFieldLabel(element) {
    // 方法1: 通过label标签关联
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        return label.textContent.trim();
      }
    }

    // 方法2: 查找父级label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      return parentLabel.textContent.replace(element.value || '', '').trim();
    }

    // 方法3: 查找前面的文本节点或标签
    const previousElement = element.previousElementSibling;
    if (previousElement) {
      const text = previousElement.textContent.trim();
      if (text && text.length < 50) { // 避免获取到过长的文本
        return text;
      }
    }

    // 方法4: 查找父容器中的文本
    const parent = element.parentElement;
    if (parent) {
      const textNodes = [];
      const walker = document.createTreeWalker(
        parent,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text && text.length < 50) {
          textNodes.push(text);
        }
      }

      if (textNodes.length > 0) {
        return textNodes[0];
      }
    }

    // 方法5: 使用placeholder或name属性
    return element.placeholder || element.name || `未知字段_${Date.now()}`;
  }

  // 获取字段类型
  getFieldType(element) {
    if (element.tagName.toLowerCase() === 'select') {
      return 'select';
    }

    if (element.tagName.toLowerCase() === 'textarea') {
      return 'textarea';
    }

    if (element.tagName.toLowerCase() === 'input') {
      return element.type || 'text';
    }

    return 'unknown';
  }

  // 生成唯一选择器
  generateUniqueSelector(element) {
    // 优先使用ID
    if (element.id) {
      return `#${element.id}`;
    }

    // 使用name属性
    if (element.name) {
      return `${element.tagName.toLowerCase()}[name="${element.name}"]`;
    }

    // 生成基于位置的选择器
    const tagName = element.tagName.toLowerCase();
    const siblings = Array.from(element.parentElement.children).filter(
      child => child.tagName.toLowerCase() === tagName
    );
    const index = siblings.indexOf(element);

    return `${tagName}:nth-child(${index + 1})`;
  }

  // 获取元素XPath
  getElementXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const parts = [];
    let currentElement = element;

    while (currentElement && currentElement.nodeType === 1) {
      let tagName = currentElement.tagName.toLowerCase();
      let index = 1;

      // 计算同级元素中的索引
      let sibling = currentElement.previousElementSibling;
      while (sibling) {
        if (sibling.tagName.toLowerCase() === tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }

      // 构建路径部分
      const pathPart = `${tagName}[${index}]`;
      parts.unshift(pathPart);

      currentElement = currentElement.parentElement;
    }

    return '/' + parts.join('/');
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
        fieldItem.className = 'field-item';
        fieldItem.innerHTML = `
          <div class="field-info">
            <span class="field-label">${field.label}</span>
            <span class="field-type">[${field.type}]</span>
          </div>
          <div class="field-status" id="field-status-${index}">等待填写</div>
        `;
        fieldListEl.appendChild(fieldItem);
      });
    }
  }

  // 开始自动填写
  async startAutoFill() {
    try {
      console.log('开始自动填写...');

      // 检查用户认证状态
      const authResult = await this.sendMessageToBackground({ action: 'checkAuthStatus' });

      if (!authResult.success || !authResult.isAuthenticated) {
        this.showMessage('请先登录后再使用自动填写功能', 'warning');
        return;
      }

      // 获取用户简历数据
      const resumeResult = await this.sendMessageToBackground({ action: 'getResume' });

      if (!resumeResult.success || !resumeResult.data) {
        this.showMessage('请先在插件中设置简历信息', 'warning');
        return;
      }

      // 发送字段信息到后端进行匹配
      const fieldsForMatching = this.scannedFields.map(field => ({
        label: field.label,
        type: field.type,
        options: field.options,
        attributes: field.attributes
      }));

      const matchResult = await this.sendMessageToBackground({
        action: 'matchFields',
        fields: fieldsForMatching
      });

      if (!matchResult.success) {
        this.showMessage('字段匹配失败: ' + matchResult.error, 'error');
        return;
      }

      // 执行填写
      await this.fillFields(matchResult.data.matches);

    } catch (error) {
      console.error('自动填写时发生错误:', error);
      this.showMessage('自动填写失败: ' + error.message, 'error');
    }
  }

  // 填写字段
  async fillFields(matches) {
    let successCount = 0;
    const totalCount = matches.length;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const field = this.scannedFields[i];

      if (!field || !field.element) {
        continue;
      }

      try {
        const statusEl = document.querySelector(`#field-status-${i}`);

        if (statusEl) {
          statusEl.textContent = '填写中...';
          statusEl.className = 'field-status filling';
        }

        const success = await this.fillSingleField(field, match);

        if (success) {
          successCount++;
          if (statusEl) {
            statusEl.textContent = '填写成功';
            statusEl.className = 'field-status success';
          }
        } else {
          if (statusEl) {
            statusEl.textContent = '填写失败';
            statusEl.className = 'field-status error';
          }
        }

        // 更新进度
        const progressEl = document.querySelector('#fill-progress');
        if (progressEl) {
          progressEl.textContent = `${i + 1}/${totalCount}`;
        }

        // 延迟一下，避免操作过快
        await this.delay(300);

      } catch (error) {
        console.error(`填写字段 ${field.label} 时发生错误:`, error);
      }
    }

    this.showMessage(`填写完成！成功 ${successCount}/${totalCount} 个字段`, 'success');
  }

  // 填写单个字段
  async fillSingleField(field, match) {
    try {
      const element = field.element;

      if (!match.value) {
        console.log(`字段 ${field.label} 没有匹配到值`);
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
          return await this.fillInputField(element, match.value, field.type);

        case 'select':
          return await this.fillSelectField(element, match.value);

        case 'textarea':
          return await this.fillTextareaField(element, match.value);

        default:
          console.log(`不支持的字段类型: ${field.elementType}`);
          return false;
      }
    } catch (error) {
      console.error('填写单个字段时发生错误:', error);
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
        // 日期字段处理
        element.value = this.formatDateForInput(value);
      } else {
        // 普通文本字段
        element.value = value;
      }

      // 触发input事件
      element.dispatchEvent(new Event('input', { bubbles: true }));

      // 触发change事件
      element.dispatchEvent(new Event('change', { bubbles: true }));

      // 触发blur事件
      element.dispatchEvent(new Event('blur', { bubbles: true }));

      return true;
    } catch (error) {
      console.error('填写输入框失败:', error);
      return false;
    }
  }

  // 填写选择框
  async fillSelectField(element, value) {
    try {
      // 查找最匹配的选项
      const options = Array.from(element.options);
      let selectedOption = null;

      // 优先精确匹配
      selectedOption = options.find(option =>
        option.value === value || option.textContent.trim() === value
      );

      // 如果没有精确匹配，尝试模糊匹配
      if (!selectedOption) {
        selectedOption = options.find(option =>
          option.textContent.includes(value) || value.includes(option.textContent.trim())
        );
      }

      if (selectedOption) {
        element.value = selectedOption.value;

        // 触发事件
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));

        return true;
      } else {
        console.log(`选择框中未找到匹配的选项: ${value}`);
        return false;
      }
    } catch (error) {
      console.error('填写选择框失败:', error);
      return false;
    }
  }

  // 填写文本域
  async fillTextareaField(element, value) {
    try {
      element.value = value;

      // 触发事件
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));

      return true;
    } catch (error) {
      console.error('填写文本域失败:', error);
      return false;
    }
  }

  // 格式化日期
  formatDateForInput(dateString) {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD格式
    } catch (error) {
      return dateString;
    }
  }

  // 发送消息到background script
  sendMessageToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    });
  }

  // 显示消息提示
  showMessage(message, type = 'info') {
    // 创建消息提示框
    const messageEl = document.createElement('div');
    messageEl.className = `ai-resume-message ${type}`;
    messageEl.textContent = message;

    document.body.appendChild(messageEl);

    // 3秒后自动消失
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 3000);
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 初始化表单扫描器
const formScanner = new FormFieldScanner();

console.log('AI Resume AutoFill content script loaded');
