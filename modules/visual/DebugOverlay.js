/**
 * 调试覆盖层 - 可视化显示分析结果
 * 在页面上叠加显示识别的区块、字段和匹配结果
 */
class DebugOverlay {
  constructor(configManager) {
    this.configManager = configManager;
    this.eventBus = EventBus.getInstance();
    this.overlayContainer = null;
    this.isVisible = false;
    this.currentMode = 'regions'; // regions, fields, matches
    this.regions = [];
    this.fields = [];
    this.matches = [];

    this.setupEventListeners();
    this.initializeStyles();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听分析完成事件
    this.eventBus.on('visual-analysis-complete', (data) => {
      if (this.configManager.isFeatureEnabled('enable_debug_overlay')) {
        this.showAnalysisResult(data.result);
      }
    });

    // 监听配置更新事件
    this.eventBus.on('config-updated', () => {
      this.updateVisibility();
    });

    // 监听键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case 'D':
            e.preventDefault();
            this.toggle();
            break;
          case 'R':
            e.preventDefault();
            this.setMode('regions');
            break;
          case 'F':
            e.preventDefault();
            this.setMode('fields');
            break;
          case 'M':
            e.preventDefault();
            this.setMode('matches');
            break;
        }
      }
    });
  }

  /**
   * 初始化样式
   */
  initializeStyles() {
    if (document.getElementById('cv-debug-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'cv-debug-styles';
    styles.textContent = `
      .cv-debug-overlay {
        pointer-events: none;
        z-index: 9999;
        font-family: 'Courier New', monospace;
        font-size: 11px;
      }

      .cv-debug-region {
        position: absolute;
        border: 2px solid;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(1px);
        transition: all 0.3s ease;
        box-sizing: border-box;
      }

      .cv-debug-region:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.02);
      }

      .cv-debug-label {
        position: absolute;
        top: -20px;
        left: 0;
        padding: 2px 6px;
        color: white;
        font-weight: bold;
        border-radius: 3px;
        white-space: nowrap;
        text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cv-debug-field {
        position: absolute;
        border: 1px dashed;
        background: rgba(0, 255, 0, 0.1);
        border-radius: 2px;
      }

      .cv-debug-match {
        position: absolute;
        border: 2px solid #ff6b6b;
        background: rgba(255, 107, 107, 0.2);
        border-radius: 4px;
        box-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
      }

      .cv-debug-control-panel {
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 10000;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        min-width: 300px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        backdrop-filter: blur(5px);
      }

      .cv-debug-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }

      .cv-debug-btn {
        padding: 5px 10px;
        border: 1px solid #444;
        background: #333;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.2s ease;
      }

      .cv-debug-btn:hover {
        background: #555;
        border-color: #666;
      }

      .cv-debug-btn.active {
        background: #007bff;
        border-color: #0056b3;
      }

      .cv-debug-stats {
        font-size: 10px;
        line-height: 1.4;
        opacity: 0.8;
        border-top: 1px solid #444;
        padding-top: 10px;
        margin-top: 10px;
      }

      .cv-debug-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        max-width: 250px;
        z-index: 10001;
        word-wrap: break-word;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * 显示分析结果
   */
  showAnalysisResult(result) {
    console.log('[DebugOverlay] 显示分析结果', result);

    this.clear();
    this.parseAnalysisResult(result);
    this.render();
    this.show();
  }

  /**
   * 解析分析结果
   */
  parseAnalysisResult(result) {
    try {
      // 解析视觉区块
      this.regions = this.extractRegions(result);

      // 解析表单字段
      this.fields = this.extractFields(result);

      // 解析匹配结果
      this.matches = this.extractMatches(result);

      console.log('[DebugOverlay] 解析完成:', {
        regions: this.regions.length,
        fields: this.fields.length,
        matches: this.matches.length
      });

    } catch (error) {
      console.error('[DebugOverlay] 解析分析结果失败:', error);
    }
  }

  /**
   * 提取视觉区块信息
   */
  extractRegions(result) {
    const regions = [];

    // 从phase2结果中提取字段信息作为区块
    const phase2Data = result.phase_status?.phase2_field_extraction?.data;
    if (phase2Data && phase2Data.fields_preview) {
      phase2Data.fields_preview.forEach((field, index) => {
        if (field.selector) {
          const element = DOMUtils.findElement(field.selector);
          if (element) {
            const bbox = DOMUtils.getBoundingBox(element);
            if (bbox && bbox.visible) {
              regions.push({
                id: `region-${index}`,
                bbox: bbox,
                title: field.label || `字段 ${index + 1}`,
                type: field.type || 'unknown',
                element: element,
                confidence: 0.9
              });
            }
          }
        }
      });
    }

    return regions;
  }

  /**
   * 提取表单字段信息
   */
  extractFields(result) {
    const fields = [];

    // 从debug_info中提取完整字段信息
    const debugInfo = result.debug_info;
    if (debugInfo && debugInfo.extracted_fields) {
      debugInfo.extracted_fields.forEach((field, index) => {
        if (field.selector) {
          const element = DOMUtils.findElement(field.selector);
          if (element) {
            const bbox = DOMUtils.getBoundingBox(element);
            if (bbox && bbox.visible) {
              fields.push({
                id: `field-${index}`,
                bbox: bbox,
                label: field.label || field.name || '未知字段',
                type: field.type || 'text',
                selector: field.selector,
                element: element,
                required: field.required || false,
                placeholder: field.placeholder || ''
              });
            }
          }
        }
      });
    }

    return fields;
  }

  /**
   * 提取匹配结果信息
   */
  extractMatches(result) {
    const matches = [];

    if (result.matched_fields) {
      result.matched_fields.forEach((match, index) => {
        // 尝试通过各种方式找到对应的DOM元素
        const element = this.findMatchedElement(match);
        if (element) {
          const bbox = DOMUtils.getBoundingBox(element);
          if (bbox && bbox.visible) {
            matches.push({
              id: `match-${index}`,
              bbox: bbox,
              formLabel: match.form_label,
              value: match.value,
              matchType: match.match_type,
              confidence: match.confidence || 0.8,
              element: element
            });
          }
        }
      });
    }

    return matches;
  }

  /**
   * 查找匹配的DOM元素
   */
  findMatchedElement(match) {
    // 尝试通过表单标签文本查找
    const labelText = match.form_label;
    if (labelText) {
      // 查找包含该文本的label元素
      const labels = Array.from(document.querySelectorAll('label, .label, .form-label, th, td'));
      for (const label of labels) {
        if (label.textContent.trim().includes(labelText)) {
          // 查找关联的input元素
          const input = this.findAssociatedInput(label);
          if (input) return input;
        }
      }
    }

    // 尝试通过值匹配查找
    const value = match.value;
    if (value) {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      for (const input of inputs) {
        if (input.value === value || input.textContent === value) {
          return input;
        }
      }
    }

    return null;
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

    return null;
  }

  /**
   * 渲染覆盖层
   */
  render() {
    this.createOverlayContainer();
    this.createControlPanel();
    this.renderCurrentMode();
  }

  /**
   * 创建覆盖层容器
   */
  createOverlayContainer() {
    if (this.overlayContainer) {
      this.overlayContainer.remove();
    }

    this.overlayContainer = document.createElement('div');
    this.overlayContainer.className = 'cv-debug-overlay';
    this.overlayContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999;
    `;

    document.body.appendChild(this.overlayContainer);
  }

  /**
   * 创建控制面板
   */
  createControlPanel() {
    const existingPanel = document.getElementById('cv-debug-control-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'cv-debug-control-panel';
    panel.className = 'cv-debug-control-panel';
    panel.style.pointerEvents = 'auto';

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; color: #00ff00;">🔍 CV Debug</h3>
        <button class="cv-debug-btn" onclick="window.debugOverlay?.toggle()" style="background: #dc3545;">×</button>
      </div>

      <div class="cv-debug-controls">
        <button class="cv-debug-btn ${this.currentMode === 'regions' ? 'active' : ''}"
                onclick="window.debugOverlay?.setMode('regions')">
          区块 (${this.regions.length})
        </button>
        <button class="cv-debug-btn ${this.currentMode === 'fields' ? 'active' : ''}"
                onclick="window.debugOverlay?.setMode('fields')">
          字段 (${this.fields.length})
        </button>
        <button class="cv-debug-btn ${this.currentMode === 'matches' ? 'active' : ''}"
                onclick="window.debugOverlay?.setMode('matches')">
          匹配 (${this.matches.length})
        </button>
        <button class="cv-debug-btn" onclick="window.debugOverlay?.exportData()">
          导出
        </button>
      </div>

      <div class="cv-debug-stats">
        <div><strong>快捷键:</strong></div>
        <div>Ctrl+Shift+D: 切换显示</div>
        <div>Ctrl+Shift+R: 区块模式</div>
        <div>Ctrl+Shift+F: 字段模式</div>
        <div>Ctrl+Shift+M: 匹配模式</div>
        <br>
        <div><strong>当前模式:</strong> ${this.getModeDescription()}</div>
        <div><strong>网站:</strong> ${window.location.hostname}</div>
      </div>
    `;

    document.body.appendChild(panel);
  }

  /**
   * 渲染当前模式
   */
  renderCurrentMode() {
    if (!this.overlayContainer) return;

    // 清除现有内容
    this.overlayContainer.innerHTML = '';

    switch (this.currentMode) {
      case 'regions':
        this.renderRegions();
        break;
      case 'fields':
        this.renderFields();
        break;
      case 'matches':
        this.renderMatches();
        break;
    }
  }

  /**
   * 渲染视觉区块
   */
  renderRegions() {
    this.regions.forEach((region, index) => {
      const highlight = this.createRegionHighlight(region, {
        color: this.getRegionColor(region.type),
        label: `${region.title} (${region.type})`,
        index: index + 1
      });

      this.overlayContainer.appendChild(highlight);
    });
  }

  /**
   * 渲染表单字段
   */
  renderFields() {
    this.fields.forEach((field, index) => {
      const highlight = this.createFieldHighlight(field, {
        color: this.getFieldColor(field.type),
        label: `${field.label} [${field.type}]`,
        index: index + 1
      });

      this.overlayContainer.appendChild(highlight);
    });
  }

  /**
   * 渲染匹配结果
   */
  renderMatches() {
    this.matches.forEach((match, index) => {
      const highlight = this.createMatchHighlight(match, {
        color: this.getMatchColor(match.confidence),
        label: `${match.formLabel}: ${match.value}`,
        confidence: match.confidence,
        index: index + 1
      });

      this.overlayContainer.appendChild(highlight);
    });
  }

  /**
   * 创建区块高亮
   */
  createRegionHighlight(region, options) {
    const highlight = document.createElement('div');
    highlight.className = 'cv-debug-region';

    highlight.style.cssText = `
      left: ${region.bbox.x}px;
      top: ${region.bbox.y}px;
      width: ${region.bbox.width}px;
      height: ${region.bbox.height}px;
      border-color: ${options.color};
      background: ${options.color}15;
    `;

    const label = document.createElement('div');
    label.className = 'cv-debug-label';
    label.style.background = options.color;
    label.textContent = `${options.index}. ${options.label}`;

    highlight.appendChild(label);
    this.addTooltip(highlight, region);

    return highlight;
  }

  /**
   * 创建字段高亮
   */
  createFieldHighlight(field, options) {
    const highlight = document.createElement('div');
    highlight.className = 'cv-debug-field';

    highlight.style.cssText = `
      left: ${field.bbox.x}px;
      top: ${field.bbox.y}px;
      width: ${field.bbox.width}px;
      height: ${field.bbox.height}px;
      border-color: ${options.color};
      background: ${options.color}20;
    `;

    const label = document.createElement('div');
    label.className = 'cv-debug-label';
    label.style.background = options.color;
    label.textContent = `${options.index}. ${options.label}`;

    highlight.appendChild(label);
    this.addTooltip(highlight, field);

    return highlight;
  }

  /**
   * 创建匹配高亮
   */
  createMatchHighlight(match, options) {
    const highlight = document.createElement('div');
    highlight.className = 'cv-debug-match';

    highlight.style.cssText = `
      left: ${match.bbox.x}px;
      top: ${match.bbox.y}px;
      width: ${match.bbox.width}px;
      height: ${match.bbox.height}px;
      border-color: ${options.color};
      background: ${options.color}25;
      box-shadow: 0 0 10px ${options.color}60;
    `;

    const label = document.createElement('div');
    label.className = 'cv-debug-label';
    label.style.background = options.color;
    label.textContent = `${options.index}. ${options.label} (${(options.confidence * 100).toFixed(0)}%)`;

    highlight.appendChild(label);
    this.addTooltip(highlight, match);

    return highlight;
  }

  /**
   * 添加工具提示
   */
  addTooltip(element, data) {
    element.addEventListener('mouseenter', (e) => {
      const tooltip = document.createElement('div');
      tooltip.className = 'cv-debug-tooltip';

      let content = '';
      if (data.bbox) {
        content += `位置: (${data.bbox.x}, ${data.bbox.y})\n`;
        content += `大小: ${data.bbox.width} × ${data.bbox.height}\n`;
      }

      if (data.selector) {
        content += `选择器: ${data.selector}\n`;
      }

      if (data.confidence !== undefined) {
        content += `置信度: ${(data.confidence * 100).toFixed(1)}%\n`;
      }

      content += `类型: ${data.type || data.matchType || '未知'}\n`;

      tooltip.textContent = content;
      tooltip.style.cssText = `
        left: ${e.pageX + 10}px;
        top: ${e.pageY + 10}px;
      `;

      document.body.appendChild(tooltip);

      element.addEventListener('mouseleave', () => {
        tooltip.remove();
      }, { once: true });
    });
  }

  /**
   * 获取区块颜色
   */
  getRegionColor(type) {
    const colors = {
      'form': '#007bff',
      'input': '#28a745',
      'select': '#ffc107',
      'textarea': '#17a2b8',
      'button': '#dc3545',
      'unknown': '#6c757d'
    };
    return colors[type] || colors.unknown;
  }

  /**
   * 获取字段颜色
   */
  getFieldColor(type) {
    const colors = {
      'text': '#007bff',
      'email': '#28a745',
      'tel': '#ffc107',
      'password': '#dc3545',
      'textarea': '#17a2b8',
      'select': '#fd7e14',
      'radio': '#e83e8c',
      'checkbox': '#20c997'
    };
    return colors[type] || '#6c757d';
  }

  /**
   * 获取匹配颜色
   */
  getMatchColor(confidence) {
    if (confidence >= 0.8) return '#28a745'; // 绿色 - 高置信度
    if (confidence >= 0.6) return '#ffc107'; // 黄色 - 中置信度
    return '#dc3545'; // 红色 - 低置信度
  }

  /**
   * 获取模式描述
   */
  getModeDescription() {
    const descriptions = {
      'regions': '视觉区块分割结果',
      'fields': '表单字段识别结果',
      'matches': '字段匹配结果'
    };
    return descriptions[this.currentMode] || '未知模式';
  }

  /**
   * 设置显示模式
   */
  setMode(mode) {
    if (['regions', 'fields', 'matches'].includes(mode)) {
      this.currentMode = mode;
      this.renderCurrentMode();
      this.updateControlPanel();
      console.log(`[DebugOverlay] 切换到模式: ${mode}`);
    }
  }

  /**
   * 更新控制面板
   */
  updateControlPanel() {
    const panel = document.getElementById('cv-debug-control-panel');
    if (panel) {
      panel.remove();
      this.createControlPanel();
    }
  }

  /**
   * 切换显示/隐藏
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 显示覆盖层
   */
  show() {
    if (this.overlayContainer) {
      this.overlayContainer.style.display = 'block';
    }

    const panel = document.getElementById('cv-debug-control-panel');
    if (panel) {
      panel.style.display = 'block';
    }

    this.isVisible = true;
    console.log('[DebugOverlay] 显示调试覆盖层');
  }

  /**
   * 隐藏覆盖层
   */
  hide() {
    if (this.overlayContainer) {
      this.overlayContainer.style.display = 'none';
    }

    const panel = document.getElementById('cv-debug-control-panel');
    if (panel) {
      panel.style.display = 'none';
    }

    this.isVisible = false;
    console.log('[DebugOverlay] 隐藏调试覆盖层');
  }

  /**
   * 清除所有内容
   */
  clear() {
    this.regions = [];
    this.fields = [];
    this.matches = [];

    if (this.overlayContainer) {
      this.overlayContainer.innerHTML = '';
    }
  }

  /**
   * 更新可见性
   */
  updateVisibility() {
    const enabled = this.configManager.isFeatureEnabled('enable_debug_overlay');
    if (!enabled && this.isVisible) {
      this.hide();
    }
  }

  /**
   * 导出调试数据
   */
  exportData() {
    const data = {
      timestamp: Date.now(),
      website: window.location.href,
      currentMode: this.currentMode,
      regions: this.regions,
      fields: this.fields,
      matches: this.matches,
      config: this.configManager.exportConfig()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `cv-debug-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    console.log('[DebugOverlay] 调试数据已导出');
  }

  /**
   * 销毁覆盖层
   */
  destroy() {
    this.clear();

    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }

    const panel = document.getElementById('cv-debug-control-panel');
    if (panel) {
      panel.remove();
    }

    const styles = document.getElementById('cv-debug-styles');
    if (styles) {
      styles.remove();
    }

    this.isVisible = false;
    console.log('[DebugOverlay] 调试覆盖层已销毁');
  }
}

// 确保在全局可用
if (typeof window !== 'undefined') {
  window.DebugOverlay = DebugOverlay;
}
