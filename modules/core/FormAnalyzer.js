/**
 * 表单分析器 - 核心表单分析逻辑
 * 负责执行实际的表单填写和处理分析结果
 */
class FormAnalyzer {
  constructor(configManager) {
    this.configManager = configManager;
    this.eventBus = EventBus.getInstance();
    this.isFilling = false;
    this.fillProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      skipped: 0
    };
  }

  /**
   * 处理分析结果并执行填写
   */
  async processAnalysisResult(analysisResult) {
    try {
      console.log('[FormAnalyzer] 开始处理分析结果...');

      if (!analysisResult || !analysisResult.success) {
        throw new Error('分析结果无效或分析失败');
      }

      const matchedFields = analysisResult.matched_fields || [];
      if (matchedFields.length === 0) {
        console.warn('[FormAnalyzer] 没有找到匹配的字段');
        return {
          success: true,
          message: '没有找到可填写的字段',
          stats: this.fillProgress
        };
      }

      console.log(`[FormAnalyzer] 找到 ${matchedFields.length} 个匹配字段，开始填写...`);

      // 重置进度
      this.fillProgress = {
        total: matchedFields.length,
        completed: 0,
        failed: 0,
        skipped: 0
      };

      this.eventBus.emit('form-filling-start', {
        totalFields: matchedFields.length,
        analysisResult: analysisResult
      });

      // 执行填写
      const fillResults = await this.fillMatchedFields(matchedFields);

      // 统计结果
      const successCount = fillResults.filter(r => r.success).length;
      const failureCount = fillResults.filter(r => !r.success).length;

      console.log(`[FormAnalyzer] 填写完成: ${successCount}/${matchedFields.length} 成功`);

      this.eventBus.emit('form-filling-complete', {
        success: successCount > 0,
        totalFields: matchedFields.length,
        successCount: successCount,
        failureCount: failureCount,
        fillResults: fillResults,
        stats: this.fillProgress
      });

      return {
        success: true,
        message: `成功填写 ${successCount}/${matchedFields.length} 个字段`,
        stats: this.fillProgress,
        fillResults: fillResults
      };

    } catch (error) {
      console.error('[FormAnalyzer] 处理分析结果失败:', error);

      this.eventBus.emit('form-filling-error', {
        error: error.message,
        stats: this.fillProgress
      });

      throw error;
    }
  }

  /**
   * 填写匹配的字段
   */
  async fillMatchedFields(matchedFields) {
    const results = [];
    const timing = this.configManager.getTiming();
    const waitBetween = timing.wait_between_fills || 300;

    this.isFilling = true;

    try {
      for (let i = 0; i < matchedFields.length; i++) {
        const field = matchedFields[i];

        console.log(`[FormAnalyzer] 填写字段 ${i + 1}/${matchedFields.length}: ${field.form_label}`);

        // 发布进度事件
        this.eventBus.emit('form-filling-progress', {
          current: i + 1,
          total: matchedFields.length,
          field: field,
          progress: ((i + 1) / matchedFields.length * 100).toFixed(1)
        });

        try {
          const result = await this.fillSingleField(field);
          results.push(result);

          if (result.success) {
            this.fillProgress.completed++;
          } else {
            this.fillProgress.failed++;
          }

          // 等待间隔，避免过快填写
          if (i < matchedFields.length - 1) {
            await this.delay(waitBetween);
          }

        } catch (error) {
          console.error(`[FormAnalyzer] 填写字段失败: ${field.form_label}`, error);

          results.push({
            success: false,
            field: field,
            error: error.message,
            element: null
          });

          this.fillProgress.failed++;
        }
      }
    } finally {
      this.isFilling = false;
    }

    return results;
  }

  /**
   * 填写单个字段
   */
  async fillSingleField(field) {
    try {
      // 查找目标元素
      const element = await this.findTargetElement(field);
      if (!element) {
        return {
          success: false,
          field: field,
          error: '未找到目标元素',
          element: null
        };
      }

      // 检查元素是否可见和可操作
      if (!DOMUtils.isElementVisible(element)) {
        console.warn(`[FormAnalyzer] 元素不可见: ${field.form_label}`);

        // 尝试滚动到元素位置
        DOMUtils.scrollToElement(element);
        await this.delay(500); // 等待滚动完成

        if (!DOMUtils.isElementVisible(element)) {
          return {
            success: false,
            field: field,
            error: '元素不可见',
            element: element
          };
        }
      }

      // 高亮显示元素（如果启用调试）
      if (this.configManager.isFeatureEnabled('enable_debug_overlay')) {
        DOMUtils.highlightElement(element, {
          color: '#00ff00',
          duration: 1000
        });
      }

      // 执行填写
      const fillSuccess = await this.performFill(element, field.value, field);

      if (fillSuccess) {
        console.log(`✅ 成功填写: ${field.form_label} = ${field.value}`);
        return {
          success: true,
          field: field,
          element: element,
          value: field.value
        };
      } else {
        return {
          success: false,
          field: field,
          error: '填写操作失败',
          element: element
        };
      }

    } catch (error) {
      console.error(`[FormAnalyzer] 填写字段异常: ${field.form_label}`, error);
      return {
        success: false,
        field: field,
        error: error.message,
        element: null
      };
    }
  }

  /**
   * 查找目标元素
   */
  async findTargetElement(field) {
    // 方法1: 通过标签文本查找
    let element = await this.findElementByLabel(field.form_label);
    if (element) return element;

    // 方法2: 通过值匹配查找（如果已经填写过）
    if (field.value) {
      element = await this.findElementByValue(field.value);
      if (element) return element;
    }

    // 方法3: 通过选择器查找（如果有存储的选择器信息）
    if (field.selector) {
      element = DOMUtils.findElement(field.selector);
      if (element) return element;
    }

    // 方法4: 智能查找
    element = await this.smartFindElement(field);
    if (element) return element;

    return null;
  }

  /**
   * 通过标签文本查找元素
   */
  async findElementByLabel(labelText) {
    if (!labelText) return null;

    try {
      // 查找包含该文本的label元素
      const labels = Array.from(document.querySelectorAll('label, .label, .form-label, th, td, span, div'));

      for (const label of labels) {
        const text = label.textContent.trim();
        if (this.isLabelMatch(text, labelText)) {
          // 查找关联的输入元素
          const input = this.findAssociatedInput(label);
          if (input && this.isValidFormInput(input)) {
            return input;
          }
        }
      }
    } catch (error) {
      console.error('[FormAnalyzer] 通过标签查找元素失败:', error);
    }

    return null;
  }

  /**
   * 通过值查找元素
   */
  async findElementByValue(value) {
    if (!value) return null;

    try {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));

      for (const input of inputs) {
        if (input.value === value || input.textContent === value) {
          if (this.isValidFormInput(input)) {
            return input;
          }
        }
      }
    } catch (error) {
      console.error('[FormAnalyzer] 通过值查找元素失败:', error);
    }

    return null;
  }

  /**
   * 智能查找元素
   */
  async smartFindElement(field) {
    try {
      const selectors = this.configManager.getSelectors();
      const inputElements = document.querySelectorAll(selectors.input_elements.join(', '));

      for (const input of inputElements) {
        if (!this.isValidFormInput(input)) continue;

        // 收集元素的所有相关文本
        const elementTexts = this.collectElementTexts(input);

        // 检查是否有匹配
        for (const text of elementTexts) {
          if (this.isLabelMatch(text, field.form_label)) {
            return input;
          }
        }
      }
    } catch (error) {
      console.error('[FormAnalyzer] 智能查找元素失败:', error);
    }

    return null;
  }

  /**
   * 收集元素相关的所有文本
   */
  collectElementTexts(element) {
    const texts = [];

    // 元素自身的属性
    ['placeholder', 'title', 'aria-label', 'name', 'id'].forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) texts.push(value);
    });

    // 关联的标签
    const labels = DOMUtils.findAssociatedLabels(element);
    labels.forEach(label => {
      texts.push(label.textContent.trim());
    });

    // 父级容器的文本
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const text = parent.textContent?.trim();
      if (text && text.length < 100) {
        texts.push(text);
      }
      parent = parent.parentElement;
    }

    return texts.filter(text => text && text.length > 0);
  }

  /**
   * 判断标签是否匹配
   */
  isLabelMatch(labelText, targetText) {
    if (!labelText || !targetText) return false;

    // 清理文本
    const clean = (text) => text.replace(/[:\s*]/g, '').toLowerCase();
    const cleanLabel = clean(labelText);
    const cleanTarget = clean(targetText);

    // 精确匹配
    if (cleanLabel === cleanTarget) return true;

    // 包含匹配
    if (cleanLabel.includes(cleanTarget) || cleanTarget.includes(cleanLabel)) return true;

    // 相似度匹配
    return this.calculateSimilarity(cleanLabel, cleanTarget) > 0.8;
  }

  /**
   * 计算文本相似度
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 查找标签关联的输入元素
   */
  findAssociatedInput(label) {
    // 检查for属性
    if (label.getAttribute('for')) {
      const input = document.getElementById(label.getAttribute('for'));
      if (input) return input;
    }

    // 检查子元素
    const childInput = label.querySelector('input, textarea, select');
    if (childInput) return childInput;

    // 检查同级元素
    const siblings = Array.from(label.parentElement?.children || []);
    for (const sibling of siblings) {
      if (['input', 'textarea', 'select'].includes(sibling.tagName.toLowerCase())) {
        return sibling;
      }
    }

    // 检查临近元素
    const nearby = this.findNearbyInputs(label);
    return nearby.length > 0 ? nearby[0] : null;
  }

  /**
   * 查找附近的输入元素
   */
  findNearbyInputs(element) {
    const inputs = [];
    const elementRect = element.getBoundingClientRect();
    const allInputs = document.querySelectorAll('input, textarea, select');

    for (const input of allInputs) {
      if (!this.isValidFormInput(input)) continue;

      const inputRect = input.getBoundingClientRect();
      const distance = DOMUtils.calculateDistance(elementRect, inputRect);

      if (distance < 100) { // 100px 范围内
        inputs.push({ input, distance });
      }
    }

    // 按距离排序
    inputs.sort((a, b) => a.distance - b.distance);
    return inputs.map(item => item.input);
  }

  /**
   * 检查是否为有效的表单输入元素
   */
  isValidFormInput(element) {
    if (!element) return false;

    const tagName = element.tagName.toLowerCase();
    if (!['input', 'textarea', 'select'].includes(tagName)) return false;

    // 排除隐藏元素
    if (element.type === 'hidden') return false;

    // 排除只读和禁用元素
    if (element.readOnly || element.disabled) return false;

    // 排除搜索框等
    const excludeClasses = this.configManager.get('selectors.exclude_elements', []);
    for (const excludeClass of excludeClasses) {
      if (element.matches(excludeClass)) return false;
    }

    return true;
  }

  /**
   * 执行填写操作
   */
  async performFill(element, value, field) {
    try {
      const tagName = element.tagName.toLowerCase();
      const inputType = element.type?.toLowerCase();

      // 聚焦元素
      element.focus();

      switch (tagName) {
        case 'input':
          return this.fillInput(element, value, inputType);
        case 'textarea':
          return this.fillTextarea(element, value);
        case 'select':
          return this.fillSelect(element, value);
        default:
          console.warn(`[FormAnalyzer] 不支持的元素类型: ${tagName}`);
          return false;
      }
    } catch (error) {
      console.error('[FormAnalyzer] 执行填写操作失败:', error);
      return false;
    }
  }

  /**
   * 填写input元素
   */
  fillInput(element, value, inputType) {
    switch (inputType) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'password':
      case 'number':
        return DOMUtils.setValue(element, value, true);

      case 'radio':
        if (element.value === value || element.getAttribute('data-value') === value) {
          element.checked = true;
          DOMUtils.triggerEvent(element, 'change');
          return true;
        }
        return false;

      case 'checkbox':
        const shouldCheck = ['true', '1', 'yes', '是'].includes(String(value).toLowerCase());
        element.checked = shouldCheck;
        DOMUtils.triggerEvent(element, 'change');
        return true;

      default:
        return DOMUtils.setValue(element, value, true);
    }
  }

  /**
   * 填写textarea元素
   */
  fillTextarea(element, value) {
    return DOMUtils.setValue(element, value, true);
  }

  /**
   * 填写select元素
   */
  fillSelect(element, value) {
    // 尝试直接设置值
    if (DOMUtils.setValue(element, value, false)) {
      DOMUtils.triggerEvent(element, 'change');
      return true;
    }

    // 尝试通过选项文本匹配
    const options = Array.from(element.options);
    for (const option of options) {
      if (option.text.trim() === value ||
          option.value === value ||
          option.text.includes(value) ||
          value.includes(option.text.trim())) {
        element.value = option.value;
        DOMUtils.triggerEvent(element, 'change');
        return true;
      }
    }

    console.warn(`[FormAnalyzer] 未找到匹配的选项: ${value}`);
    return false;
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取填写进度
   */
  getFillProgress() {
    return { ...this.fillProgress };
  }

  /**
   * 检查是否正在填写
   */
  isCurrentlyFilling() {
    return this.isFilling;
  }

  /**
   * 停止填写
   */
  stopFilling() {
    this.isFilling = false;
    this.eventBus.emit('form-filling-stopped', {
      stats: this.fillProgress
    });
    console.log('[FormAnalyzer] 填写已停止');
  }
}

// 确保在全局可用
if (typeof window !== 'undefined') {
  window.FormAnalyzer = FormAnalyzer;
}
