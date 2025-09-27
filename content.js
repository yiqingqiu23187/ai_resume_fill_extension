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
      (pageFeatures.pageContainsFormKeywords && visibleFormElements.length >= 1) ||
      // 🎯 新增：强制在常见招聘网站显示
      /zhaopin|51job|lagou|boss|liepin|jobui|智联|前程无忧|拉勾|boss直聘|猎聘/i.test(window.location.href) ||
      // 🎯 新增：如果页面有任何input元素就显示（最宽松条件）
      visibleFormElements.length > 0;

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

      // 🎯 显示嵌套模式按钮
      this.updateNestedFieldsDisplay();

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

  // 🎯 全新方案：基于视觉聚类的嵌套表单识别
  async scanNestedFormStructure() {
    try {
      console.log('🔍 AI Resume: 开始基于视觉聚类的嵌套表单识别...');

      // 第一步：识别所有"信息原子"
      const formAtoms = this.extractFormAtoms();
      console.log(`🔬 发现 ${formAtoms.length} 个信息原子`);

      // 第二步：标签-输入框配对
      const pairedAtoms = this.pairLabelsWithInputs(formAtoms);
      console.log(`🔗 完成标签配对，得到 ${pairedAtoms.length} 个配对原子`);

      // 第三步：二维聚类识别对象结构
      const objectGroups = this.clusterIntoObjects(pairedAtoms);
      console.log(`📦 识别出 ${objectGroups.length} 个对象组`);

      // 第四步：结构对比识别列表
      const listGroups = this.identifyLists(objectGroups);
      console.log(`📋 识别出 ${listGroups.length} 个列表结构`);

      // 第五步：递归构建JSON树
      const nestedStructure = this.buildNestedJSON(listGroups, pairedAtoms);

      console.log('🎯 AI Resume: 视觉聚类识别完成:', nestedStructure);

      // 存储识别结果
      this.nestedFormStructure = nestedStructure;

      // 更新显示
      this.updateNestedFieldsDisplay();

      // 显示扫描结果消息
      const fieldCount = this.countNestedFields(nestedStructure);
      if (fieldCount > 0) {
        this.showMessage(`🎉 视觉聚类完成！识别到 ${fieldCount} 个字段，点击"嵌套填写"开始填写`, 'success');
      } else {
        this.showMessage('未发现明显的嵌套结构，建议使用常规填写模式', 'warning');
      }

    } catch (error) {
      console.error('🤖 AI Resume: 视觉聚类识别失败:', error);
      this.showMessage('视觉聚类识别失败: ' + error.message, 'error');
    }
  }

  // 🔬 第一步：提取所有"信息原子"
  extractFormAtoms() {
    const atoms = [];

    // 找出所有可输入元素
    const allInputs = document.querySelectorAll('input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select');

    allInputs.forEach((element, index) => {
      if (!this.shouldAnalyzeField(element)) return;

      // 获取视觉位置信息（关键！）
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);

      // 跳过不可见元素
      if (rect.width === 0 || rect.height === 0 ||
          computedStyle.display === 'none' ||
          computedStyle.visibility === 'hidden') {
        return;
      }

      // 建立完整的字段档案
      const fieldProfile = this.buildFieldProfile(element, index);

      const atom = {
        id: `atom_${index}`,
        element: element,

        // 🎯 核心：视觉位置和尺寸
        bounds: {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2
        },

        // 复用成熟的字段分析逻辑
        profile: fieldProfile,

        // CSS选择器
        selector: this.generateUniqueSelector(element),

        // 初始化分组信息
        group: null,
        paired: false
      };

      atoms.push(atom);
    });

    return atoms;
  }

  // 🔗 第二步：标签-输入框配对
  pairLabelsWithInputs(atoms) {
    const pairedAtoms = [...atoms]; // 复制数组

    // 找出所有可能的标签元素
    const labelElements = this.findAllLabels();

    atoms.forEach(atom => {
      if (atom.paired) return;

      // 方法1: 通过for属性或包裹关系查找关联标签
      let associatedLabel = this.findAssociatedLabel(atom.element);

      // 方法2: 通过视觉位置查找最近的标签
      if (!associatedLabel) {
        associatedLabel = this.findNearestLabelByPosition(atom, labelElements);
      }

      if (associatedLabel) {
        atom.label = {
          text: associatedLabel.textContent.trim(),
          element: associatedLabel,
          bounds: associatedLabel.getBoundingClientRect()
        };
        atom.paired = true;
      }
    });

    return pairedAtoms;
  }

  // 📦 第三步：基于LCA和视觉邻近性的对象聚类
  clusterIntoObjects(atoms) {
    const objectGroups = [];
    const processed = new Set();

    atoms.forEach(atomA => {
      if (processed.has(atomA.id)) return;

      // 以当前原子为起点，寻找邻居
      const cluster = [atomA];
      processed.add(atomA.id);

      // 寻找视觉上邻近的原子
      let hasNewNeighbors = true;
      while (hasNewNeighbors) {
        hasNewNeighbors = false;

        const currentBounds = this.calculateClusterBounds(cluster);

        atoms.forEach(atomB => {
          if (processed.has(atomB.id)) return;

          // 计算视觉邻近度
          const proximity = this.calculateVisualProximity(currentBounds, atomB.bounds);

          // 如果足够近，计算LCA质量
          if (proximity < 200) { // 200px阈值，可调整
            const lcaQuality = this.evaluateLCAQuality([...cluster, atomB]);

            // 如果LCA质量良好，加入集群
            if (lcaQuality > 0.6) { // 质量阈值，可调整
              cluster.push(atomB);
              processed.add(atomB.id);
              hasNewNeighbors = true;
            }
          }
        });
      }

      // 只有包含多个原子的cluster才认为是有效对象
      if (cluster.length > 1) {
        objectGroups.push({
          id: `object_${objectGroups.length}`,
          atoms: cluster,
          bounds: this.calculateClusterBounds(cluster),
          signature: this.generateStructureSignature(cluster)
        });
      }
    });

    return objectGroups;
  }

  // 📋 第四步：通过结构签名识别列表
  identifyLists(objectGroups) {
    const listGroups = [];
    const processedGroups = new Set();

    objectGroups.forEach(groupA => {
      if (processedGroups.has(groupA.id)) return;

      const similarGroups = [groupA];
      processedGroups.add(groupA.id);

      // 寻找具有相似结构签名的组
      objectGroups.forEach(groupB => {
        if (processedGroups.has(groupB.id)) return;

        const similarity = this.compareStructureSignatures(groupA.signature, groupB.signature);

        if (similarity > 0.8) { // 相似度阈值
          // 检查是否在视觉上连续排列
          if (this.areGroupsContinuous(groupA, groupB)) {
            similarGroups.push(groupB);
            processedGroups.add(groupB.id);
          }
        }
      });

      // 如果找到多个相似组，认为是列表
      if (similarGroups.length > 1) {
        listGroups.push({
          id: `list_${listGroups.length}`,
          type: 'list',
          items: similarGroups,
          signature: groupA.signature
        });
      }
    });

    return listGroups;
  }

  // 🏗️ 第五步：递归构建JSON树
  buildNestedJSON(listGroups, pairedAtoms) {
    const structure = {
      fields: {}
    };

    // 处理列表结构
    listGroups.forEach(list => {
      const listName = this.inferListName(list);

      structure.fields[listName] = {
        type: "array",
        items: list.items.length,
        item_structure: {
          type: "object",
          fields: {}
        }
      };

      // 分析列表项的结构（使用第一项作为模板）
      if (list.items.length > 0) {
        const firstItem = list.items[0];
        firstItem.atoms.forEach(atom => {
          const fieldName = this.extractAtomFieldName(atom);
          structure.fields[listName].item_structure.fields[fieldName] = {
            type: atom.profile.type,
            selector: atom.selector,
            label: atom.profile.clues.bestLabel,
            context_clues: this.buildAtomContextClues(atom)
          };
        });
      }
    });

    // 处理独立的字段（未被聚类的原子）
    pairedAtoms.forEach(atom => {
      if (atom.group === null) {
        const fieldName = this.extractAtomFieldName(atom);
        structure.fields[fieldName] = {
          type: atom.profile.type,
          selector: atom.selector,
          label: atom.profile.clues.bestLabel,
          context_clues: this.buildAtomContextClues(atom)
        };
      }
    });

    return structure;
  }

  // 🔍 查找所有可能的标签元素
  findAllLabels() {
    const labels = [];

    // 查找正式的label元素
    document.querySelectorAll('label').forEach(label => {
      if (label.textContent.trim()) {
        labels.push({
          element: label,
          text: label.textContent.trim(),
          bounds: label.getBoundingClientRect(),
          type: 'label'
        });
      }
    });

    // 查找可能作为标签的文本元素
    const textSelectors = 'span, div, p, td, th, legend, h1, h2, h3, h4, h5, h6';
    document.querySelectorAll(textSelectors).forEach(element => {
      const text = element.textContent.trim();

      // 过滤掉明显不是标签的文本
      if (text && text.length < 50 && text.length > 1 &&
          !text.includes('\n') && // 排除多行文本
          !/^\d+$/.test(text)) { // 排除纯数字

        labels.push({
          element: element,
          text: text,
          bounds: element.getBoundingClientRect(),
          type: 'text'
        });
      }
    });

    return labels;
  }

  // 🔗 查找元素的关联标签（传统方法）
  findAssociatedLabel(element) {
    // 方法1: 通过for属性
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label;
    }

    // 方法2: 查找包裹的label
    let current = element.parentElement;
    while (current && current !== document.body) {
      if (current.tagName === 'LABEL') {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  // 📍 通过视觉位置查找最近的标签
  findNearestLabelByPosition(atom, labelElements) {
    let nearestLabel = null;
    let minDistance = Infinity;

    labelElements.forEach(labelInfo => {
      const distance = this.calculateDistance(atom.bounds, labelInfo.bounds);

      // 标签应该在输入框的左侧或上方
      const isLeftOf = labelInfo.bounds.x + labelInfo.bounds.width <= atom.bounds.x + 50;
      const isAbove = labelInfo.bounds.y + labelInfo.bounds.height <= atom.bounds.centerY;
      const isAligned = Math.abs(labelInfo.bounds.centerY - atom.bounds.centerY) < 30;

      if ((isLeftOf || isAbove) && (isLeftOf ? isAligned : true) && distance < minDistance && distance < 150) {
        minDistance = distance;
        nearestLabel = labelInfo.element;
      }
    });

    return nearestLabel;
  }

  // 📐 计算两个矩形区域的距离
  calculateDistance(bounds1, bounds2) {
    const dx = Math.max(0, Math.max(bounds1.x - (bounds2.x + bounds2.width), bounds2.x - (bounds1.x + bounds1.width)));
    const dy = Math.max(0, Math.max(bounds1.y - (bounds2.y + bounds2.height), bounds2.y - (bounds1.y + bounds1.height)));
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 📦 计算集群的边界框
  calculateClusterBounds(cluster) {
    if (cluster.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    cluster.forEach(atom => {
      const bounds = atom.bounds;
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  // 🎯 计算视觉邻近度
  calculateVisualProximity(bounds1, bounds2) {
    return this.calculateDistance(bounds1, bounds2);
  }

  // 🌳 评估最低公共祖先(LCA)的质量
  evaluateLCAQuality(atoms) {
    if (atoms.length < 2) return 0;

    try {
      // 找到所有原子的LCA
      const lca = this.findLCA(atoms.map(atom => atom.element));
      if (!lca) return 0;

      const lcaBounds = lca.getBoundingClientRect();
      const clusterBounds = this.calculateClusterBounds(atoms);

      // 计算紧凑性：LCA面积 vs 原子总面积
      const lcaArea = lcaBounds.width * lcaBounds.height;
      const atomsTotalArea = atoms.reduce((sum, atom) => sum + (atom.bounds.width * atom.bounds.height), 0);
      const compactness = atomsTotalArea / Math.max(lcaArea, 1);

      // 计算排他性：LCA内表单元素的比例
      const allChildren = lca.querySelectorAll('*');
      const formChildren = lca.querySelectorAll('input, select, textarea');
      const exclusivity = formChildren.length / Math.max(allChildren.length, 1);

      // 综合评分
      return Math.min(compactness * 0.6 + exclusivity * 0.4, 1.0);
    } catch (error) {
      console.warn('LCA质量评估失败:', error);
      return 0.5; // 返回中等质量作为后备
    }
  }

  // 🌳 查找多个元素的最低公共祖先
  findLCA(elements) {
    if (elements.length === 0) return null;
    if (elements.length === 1) return elements[0].parentElement;

    // 获取第一个元素的所有祖先
    const firstAncestors = [];
    let current = elements[0];
    while (current && current !== document.body) {
      firstAncestors.push(current);
      current = current.parentElement;
    }

    // 找到包含所有元素的最低祖先
    for (const ancestor of firstAncestors) {
      const containsAll = elements.every(element =>
        ancestor === element || ancestor.contains(element)
      );

      if (containsAll) {
        return ancestor;
      }
    }

    return document.body;
  }

  // 🔤 生成结构签名
  generateStructureSignature(atoms) {
    const types = atoms.map(atom => atom.profile.type).sort();
    const labels = atoms
      .filter(atom => atom.label)
      .map(atom => atom.label.text.substring(0, 10))
      .sort();

    return {
      types: types.join('_'),
      labels: labels.join('_'),
      count: atoms.length
    };
  }

  // 🔍 比较结构签名的相似度
  compareStructureSignatures(sig1, sig2) {
    if (sig1.count !== sig2.count) return 0;

    const typeSimilarity = sig1.types === sig2.types ? 1 : 0;
    const labelSimilarity = this.calculateStringSimilarity(sig1.labels, sig2.labels);

    return (typeSimilarity * 0.7 + labelSimilarity * 0.3);
  }

  // ↔️ 检查两个组是否在视觉上连续
  areGroupsContinuous(groupA, groupB) {
    const boundsA = groupA.bounds;
    const boundsB = groupB.bounds;

    // 检查垂直连续性
    const verticalGap = Math.min(
      Math.abs(boundsA.y - (boundsB.y + boundsB.height)),
      Math.abs(boundsB.y - (boundsA.y + boundsA.height))
    );

    // 检查水平对齐
    const horizontalOverlap = Math.max(0,
      Math.min(boundsA.x + boundsA.width, boundsB.x + boundsB.width) -
      Math.max(boundsA.x, boundsB.x)
    );

    return verticalGap < 100 && horizontalOverlap > Math.min(boundsA.width, boundsB.width) * 0.5;
  }

  // 📝 提取原子的字段名
  extractAtomFieldName(atom) {
    // 优先使用配对的标签
    if (atom.label) {
      const labelText = atom.label.text;
      if (this.isValidFieldName(labelText)) {
        return this.cleanFieldName(labelText);
      }
    }

    // 使用已有的字段分析逻辑
    return this.extractBestFieldName(atom.profile);
  }

  // 🏷️ 推断列表名称
  inferListName(list) {
    // 查找列表周围的标题元素
    const listBounds = this.calculateClusterBounds(
      list.items.flatMap(item => item.atoms)
    );

    // 向上查找标题
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, legend, .title, .header');
    let nearestHeading = null;
    let minDistance = Infinity;

    headings.forEach(heading => {
      const headingBounds = heading.getBoundingClientRect();

      // 标题应该在列表上方
      if (headingBounds.y < listBounds.y) {
        const distance = listBounds.y - (headingBounds.y + headingBounds.height);
        if (distance < minDistance && distance < 200) {
          minDistance = distance;
          nearestHeading = heading;
        }
      }
    });

    if (nearestHeading) {
      return this.cleanFieldName(nearestHeading.textContent.trim()) || "列表";
    }

    return `列表_${Date.now() % 1000}`;
  }

  // 🧩 构建原子的上下文线索
  buildAtomContextClues(atom) {
    return {
      label_text: atom.label ? atom.label.text : '',
      element_id: atom.profile.clues.id,
      element_name: atom.profile.clues.name,
      sibling_text: atom.profile.clues.siblingText,
      section_header: atom.profile.clues.sectionHeader,
      visual_position: {
        x: atom.bounds.x,
        y: atom.bounds.y
      }
    };
  }

  // 📊 计算字符串相似度（简单版本）
  calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    // 计算编辑距离（简化版）
    const editDistance = this.levenshteinDistance(str1, str2);
    return (longer.length - editDistance) / longer.length;
  }

  // 📏 计算编辑距离
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // 🎯 新增：更智能的字段名提取逻辑
  extractBestFieldName(fieldProfile) {
    // 优先级顺序：最可信的标签 -> 元素属性 -> 上下文线索 -> 后备选项
    const candidates = [
      fieldProfile.clues.bestLabel,
      fieldProfile.clues.labelFor,
      fieldProfile.clues.frameworkLabel,
      fieldProfile.clues.parentLabel,
      fieldProfile.clues.ariaLabel,
      fieldProfile.clues.sectionHeader,
      fieldProfile.clues.siblingText,
      fieldProfile.clues.name,
      fieldProfile.clues.id,
      fieldProfile.clues.placeholder
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.trim()) {
        // 清理和验证候选名称
        const cleanName = this.cleanFieldName(candidate.trim());
        if (this.isValidFieldName(cleanName)) {
          return cleanName;
        }
      }
    }

    // 如果都没有合适的，使用后备名称
    return `字段_${Date.now() % 10000}`;
  }

  // 清理字段名
  cleanFieldName(name) {
    return name
      .replace(/[:\*\(\)（）]/g, '') // 移除特殊符号
      .replace(/\s+/g, '') // 移除空格
      .substring(0, 20); // 限制长度
  }

  // 验证字段名是否有效
  isValidFieldName(name) {
    if (!name || name.length < 2) return false;
    if (name.length > 20) return false;

    // 排除无意义的文本
    const invalidPatterns = [
      /^\d+[\d_]*$/, // 纯数字或数字+下划线
      /^[_\-\.]+$/, // 纯符号
      /请选择|请输入|请填写|如未找到/i, // 提示性文本
      /^(div|span|input|select|textarea)$/i // HTML标签名
    ];

    return !invalidPatterns.some(pattern => pattern.test(name));
  }


  // 查找添加按钮
  findAddButtons(container) {
    const buttons = [];

    // 查找各种可能的添加按钮
    const buttonSelectors = [
      'button[class*="add"], button[class*="新增"], button[class*="添加"]',
      'a[class*="add"], a[class*="新增"], a[class*="添加"]',
      '[role="button"][class*="add"]',
      'button:contains("添加"), button:contains("新增"), button:contains("Add")',
      '.add-btn, .add-button, .btn-add'
    ];

    buttonSelectors.forEach(selector => {
      try {
        const found = container.querySelectorAll(selector);
        buttons.push(...found);
      } catch (e) {
        // 忽略无效的CSS选择器
      }
    });

    // 通过文本内容查找
    const allButtons = container.querySelectorAll('button, a[role="button"], [class*="btn"]');
    allButtons.forEach(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      if (text.includes('添加') || text.includes('新增') || text.includes('add') || text.includes('+')) {
        buttons.push(btn);
      }
    });

    // 去重
    return [...new Set(buttons)];
  }

  // 查找与添加按钮关联的列表容器
  findAssociatedListContainer(button) {
    // 1. 查找同级或父级的列表容器
    let current = button.parentElement;

    while (current && current !== document.body) {
      // 查找列表容器特征
      const listContainer = current.querySelector('.list, .items, [class*="list"], [class*="item"]');
      if (listContainer) {
        return listContainer;
      }

      // 检查当前元素本身是否是列表容器
      if (this.isListContainer(current)) {
        return current;
      }

      current = current.parentElement;
    }

    // 2. 通过data属性或ID关联查找
    const targetId = button.getAttribute('data-target') || button.getAttribute('data-list');
    if (targetId) {
      return document.querySelector(targetId) || document.getElementById(targetId.replace('#', ''));
    }

    return null;
  }

  // 判断是否为列表容器
  isListContainer(element) {
    const classList = element.className?.toLowerCase() || '';
    const tagName = element.tagName?.toLowerCase();

    return (
      classList.includes('list') ||
      classList.includes('items') ||
      classList.includes('container') ||
      tagName === 'ul' ||
      tagName === 'ol' ||
      element.children.length > 1 // 有多个子元素可能是列表
    );
  }

  // 查找列表项
  findListItems(container) {
    const items = [];

    // 常见的列表项选择器
    const itemSelectors = [
      '.item, .list-item',
      '[class*="item"]',
      'li',
      '> div, > section', // 直接子元素
      '.row'
    ];

    itemSelectors.forEach(selector => {
      try {
        const found = container.querySelectorAll(selector);
        items.push(...found);
      } catch (e) {
        // 忽略无效选择器
      }
    });

    // 去重并过滤
    const uniqueItems = [...new Set(items)].filter(item => {
      // 确保包含表单元素
      return item.querySelector('input, textarea, select');
    });

    return uniqueItems;
  }

  // 分析列表项结构
  analyzeListItemStructure(listItem) {
    const structure = this.identifyNestedFormStructure(listItem);

    // 如果只有简单字段，返回object结构
    if (Object.keys(structure.fields).length > 0) {
      return {
        type: "object",
        fields: structure.fields
      };
    }

    // 如果是单一输入框，返回简单结构（保持更多信息）
    const singleInput = listItem.querySelector('input, textarea, select');
    if (singleInput && listItem.querySelectorAll('input, textarea, select').length === 1) {
      const fieldProfile = this.buildFieldProfile(singleInput, 0);
      if (fieldProfile) {
        return {
          type: singleInput.type || 'text',
          selector: this.generateUniqueSelector(singleInput),
          // 🎯 改进：为单一输入框也保留上下文信息
          label: fieldProfile.clues.bestLabel,
          placeholder: fieldProfile.clues.placeholder,
          context_clues: {
            sibling_text: fieldProfile.clues.siblingText,
            section_header: fieldProfile.clues.sectionHeader,
            element_name: fieldProfile.clues.name,
            element_id: fieldProfile.clues.id
          }
        };
      }
    }

    return structure;
  }

  // 辅助方法：判断是否在列表项内
  isInListItem(element) {
    let current = element.parentElement;

    while (current && current !== document.body) {
      if (this.isListItemElement(current)) {
        return true;
      }
      current = current.parentElement;
    }

    return false;
  }

  // 判断是否为列表项元素
  isListItemElement(element) {
    const classList = element.className?.toLowerCase() || '';
    const tagName = element.tagName?.toLowerCase();

    return (
      tagName === 'li' ||
      classList.includes('item') ||
      classList.includes('list-item') ||
      classList.includes('row')
    );
  }


  // 提取列表名
  extractListName(button, container) {
    // 从按钮文本推断
    const buttonText = button.textContent?.trim();
    if (buttonText) {
      const match = buttonText.match(/添加(.+)|新增(.+)|Add\s+(.+)/i);
      if (match) {
        return match[1] || match[2] || match[3];
      }
    }

    // 从容器属性推断
    const containerClass = container.className;
    const containerText = this.findNearestLabel(container);

    return containerText || this.extractMeaningfulName(containerClass) || '列表项';
  }

  // 提取组名
  extractGroupName(group, index) {
    // 从legend或标题推断
    const legend = group.querySelector('legend');
    if (legend) {
      return legend.textContent.trim();
    }

    // 从标题元素推断
    const heading = group.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      return heading.textContent.trim();
    }

    // 从class名推断
    const className = group.className;
    const meaningfulName = this.extractMeaningfulName(className);

    return meaningfulName || `字段组${index + 1}`;
  }

  // 提取有意义的名称
  extractMeaningfulName(className) {
    if (!className) return null;

    const meaningfulParts = className.split(/[\s\-_]/).filter(part => {
      return part.length > 2 && !['form', 'group', 'section', 'container', 'wrapper'].includes(part.toLowerCase());
    });

    return meaningfulParts.length > 0 ? meaningfulParts[0] : null;
  }

  // 查找保存按钮
  findSaveButton(container) {
    const saveButtons = container.querySelectorAll('button, input[type="submit"], [role="button"]');

    for (const btn of saveButtons) {
      const text = btn.textContent?.toLowerCase() || btn.value?.toLowerCase() || '';
      if (text.includes('保存') || text.includes('save') || text.includes('确定') || text.includes('submit')) {
        return this.generateUniqueSelector(btn);
      }
    }

    return null;
  }

  // 查找最近的标签
  findNearestLabel(element) {
    // 向上查找包含文本的父元素
    let current = element.parentElement;

    while (current && current !== document.body) {
      const text = current.textContent;
      if (text && text.length < 50 && text.length > 2) {
        // 排除包含过多文本的元素
        const childrenText = Array.from(current.children).map(child => child.textContent).join('');
        const ownText = text.replace(childrenText, '').trim();

        if (ownText && ownText.length > 0) {
          return ownText;
        }
      }
      current = current.parentElement;
    }

    return null;
  }

  // 更新嵌套字段显示
  updateNestedFieldsDisplay() {
    const statusPanel = document.querySelector('#ai-resume-status-panel');
    if (!statusPanel) {
      console.warn('🤖 AI Resume: 找不到状态面板，无法显示嵌套按钮');
      return;
    }

    // 添加嵌套模式切换按钮
    let nestedModeBtn = statusPanel.querySelector('#nested-mode-btn');
    if (!nestedModeBtn) {
      nestedModeBtn = document.createElement('button');
      nestedModeBtn.id = 'nested-mode-btn';
      nestedModeBtn.style.cssText = `
        background: #28a745;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
        width: 100%;
        font-size: 14px;
      `;

      nestedModeBtn.addEventListener('click', () => this.toggleNestedMode());

      const autoFillBtn = statusPanel.querySelector('#auto-fill-btn');
      if (autoFillBtn) {
        autoFillBtn.parentNode.insertBefore(nestedModeBtn, autoFillBtn.nextSibling);
        console.log('🤖 AI Resume: 嵌套模式按钮已添加到页面');
      } else {
        // 如果找不到自动填写按钮，就添加到状态面板的末尾
        statusPanel.appendChild(nestedModeBtn);
        console.log('🤖 AI Resume: 嵌套模式按钮已添加到状态面板末尾');
      }
    }

    // 根据扫描状态更新按钮文本和样式
    if (this.nestedFormStructure && Object.keys(this.nestedFormStructure.fields || {}).length > 0) {
      const fieldCount = this.countNestedFields(this.nestedFormStructure);
      nestedModeBtn.textContent = `🎯 嵌套填写 (${fieldCount}个字段)`;
      nestedModeBtn.style.background = '#007bff';
    } else {
      nestedModeBtn.textContent = '🔍 扫描嵌套结构';
      nestedModeBtn.style.background = '#28a745';
    }
  }

  // 🔢 统计视觉聚类识别的字段数量（适配新结构）
  countNestedFields(structure) {
    let count = 0;

    if (!structure || !structure.fields) {
      return count;
    }

    Object.values(structure.fields).forEach(field => {
      if (field.type === 'array') {
        // 数组字段：计算所有项的字段数
        if (field.item_structure && field.item_structure.fields) {
          const itemFieldsCount = Object.keys(field.item_structure.fields).length;
          count += itemFieldsCount * (field.items || 1);
        }
      } else {
        // 独立字段
        count++;
      }
    });

    return count;
  }

  // 切换嵌套模式
  toggleNestedMode() {
    if (!this.nestedFormStructure || Object.keys(this.nestedFormStructure.fields || {}).length === 0) {
      this.scanNestedFormStructure();
    } else {
      this.startNestedAutoFill();
    }
  }

  // 🎯 新增：开始嵌套自动填写
  async startNestedAutoFill() {
    try {
      console.log('🤖 AI Resume: 开始嵌套自动填写...');

      if (!this.nestedFormStructure || Object.keys(this.nestedFormStructure.fields || {}).length === 0) {
        this.showMessage('请先扫描嵌套表单结构', 'warning');
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

      const resumeId = resumeResult.data.id;
      if (!resumeId) {
        this.showMessage('简历数据格式错误，缺少ID', 'error');
        return;
      }

      console.log('🤖 AI Resume: 发送嵌套表单结构进行AI匹配...', this.nestedFormStructure);
      this.showMessage('正在进行嵌套结构AI智能匹配...', 'info');

      // 发送嵌套表单结构到后端进行AI匹配
      const matchResult = await this.sendMessageToBackground({
        action: 'matchNestedFields',
        formStructure: this.nestedFormStructure,
        resumeId: resumeId,
        websiteUrl: window.location.href
      });

      if (!matchResult || !matchResult.success) {
        const errorMsg = matchResult ? matchResult.error : '网络连接失败';
        this.showMessage('嵌套AI匹配失败: ' + errorMsg, 'error');
        return;
      }

      console.log('🤖 AI Resume: 嵌套AI匹配成功', matchResult.data);

      const { matched_data, total_fields, matched_fields } = matchResult.data;
      this.showMessage(
        `嵌套AI匹配完成！成功匹配 ${matched_fields}/${total_fields} 个字段，开始填写...`,
        'success'
      );

      // 执行嵌套填写
      await this.fillNestedStructure(matched_data, this.nestedFormStructure.fields);

    } catch (error) {
      console.error('🤖 AI Resume: 嵌套自动填写失败:', error);
      this.showMessage('嵌套自动填写失败: ' + error.message, 'error');
    }
  }

  // 递归填写嵌套结构
  async fillNestedStructure(data, structure, containerSelector = 'body') {
    console.log('🔄 AI Resume: 开始递归填写嵌套结构', { data, structure });

    for (const [fieldName, fieldData] of Object.entries(data)) {
      const fieldConfig = structure[fieldName];

      if (!fieldConfig) {
        console.warn(`🤖 AI Resume: 未找到字段配置: ${fieldName}`);
        continue;
      }

      try {
        if (fieldConfig.type === 'object') {
          // 递归填写嵌套对象
          console.log(`📂 AI Resume: 填写对象字段: ${fieldName}`);
          await this.fillNestedStructure(fieldData, fieldConfig.fields, containerSelector);

        } else if (fieldConfig.type === 'array') {
          // 填写数组字段
          console.log(`📋 AI Resume: 填写数组字段: ${fieldName}，项目数: ${fieldData?.length || 0}`);
          await this.fillArrayField(fieldData, fieldConfig, containerSelector);

        } else {
          // 填写简单字段
          console.log(`📝 AI Resume: 填写简单字段: ${fieldName} = ${fieldData}`);
          await this.fillSimpleField(fieldData, fieldConfig, containerSelector);
        }

        // 添加延迟，避免操作过快
        await this.sleep(200);

      } catch (error) {
        console.error(`🤖 AI Resume: 填写字段 ${fieldName} 失败:`, error);
        // 继续填写其他字段，不中断整个流程
      }
    }

    console.log('✅ AI Resume: 嵌套结构填写完成');
  }

  // 填写数组字段
  async fillArrayField(items, fieldConfig, parentContainer) {
    if (!Array.isArray(items) || items.length === 0) {
      console.log('📋 AI Resume: 数组字段为空，跳过');
      return;
    }

    console.log(`📋 AI Resume: 开始填写数组字段，需要 ${items.length} 项`);

    const container = document.querySelector(fieldConfig.container);
    if (!container) {
      console.error(`🤖 AI Resume: 找不到数组容器: ${fieldConfig.container}`);
      return;
    }

    // 获取现有项目数
    const existingItemsCount = fieldConfig.existing_items_count || 0;

    for (let i = 0; i < items.length; i++) {
      console.log(`📋 AI Resume: 填写数组项 ${i + 1}/${items.length}`);

      // 如果需要添加新项，点击添加按钮
      if (i >= existingItemsCount) {
        console.log('➕ AI Resume: 点击添加按钮创建新项');
        const success = await this.clickAddButton(fieldConfig.add_button);
        if (!success) {
          console.error('🤖 AI Resume: 点击添加按钮失败');
          break;
        }

        // 等待DOM更新
        await this.waitForDOMUpdate();
      }

      // 获取当前项的容器
      const currentItemContainer = this.getCurrentItemContainer(container, i);
      if (!currentItemContainer) {
        console.error(`🤖 AI Resume: 找不到第 ${i + 1} 项的容器`);
        continue;
      }

      const currentItemSelector = this.generateUniqueSelector(currentItemContainer);

      if (fieldConfig.item_structure.type === 'object') {
        // 递归填写对象类型的数组项
        await this.fillNestedStructure(
          items[i],
          fieldConfig.item_structure.fields,
          currentItemSelector
        );
      } else {
        // 填写简单类型的数组项
        await this.fillSimpleField(
          items[i],
          fieldConfig.item_structure,
          currentItemSelector
        );
      }

      // 如果有保存按钮，点击保存
      if (fieldConfig.save_button) {
        console.log('💾 AI Resume: 点击保存按钮');
        await this.clickSaveButton(fieldConfig.save_button, i);
        await this.waitForSave();
      }

      // 添加延迟
      await this.sleep(300);
    }

    console.log('✅ AI Resume: 数组字段填写完成');
  }

  // 点击添加按钮
  async clickAddButton(buttonSelector) {
    try {
      const button = document.querySelector(buttonSelector);
      if (!button) {
        console.error(`🤖 AI Resume: 找不到添加按钮: ${buttonSelector}`);
        return false;
      }

      // 检查按钮是否可点击
      if (button.disabled || button.style.display === 'none') {
        console.warn('🤖 AI Resume: 添加按钮不可用');
        return false;
      }

      // 滚动到按钮位置
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.sleep(500);

      // 点击按钮
      button.click();

      // 触发各种事件确保兼容性
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      console.log('✅ AI Resume: 成功点击添加按钮');
      return true;

    } catch (error) {
      console.error('🤖 AI Resume: 点击添加按钮失败:', error);
      return false;
    }
  }

  // 等待DOM更新
  async waitForDOMUpdate() {
    return new Promise(resolve => {
      // 使用MutationObserver监听DOM变化
      const observer = new MutationObserver((mutations) => {
        if (mutations.length > 0) {
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // 最多等待3秒
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 3000);
    });
  }

  // 获取当前项的容器
  getCurrentItemContainer(container, index) {
    const items = this.findListItems(container);

    if (index < items.length) {
      return items[index];
    }

    // 如果找不到对应索引的项，返回最后一项（可能是刚添加的）
    return items.length > 0 ? items[items.length - 1] : null;
  }

  // 点击保存按钮
  async clickSaveButton(buttonSelector, itemIndex) {
    try {
      const button = document.querySelector(buttonSelector);
      if (!button) {
        console.warn(`🤖 AI Resume: 找不到保存按钮: ${buttonSelector}`);
        return false;
      }

      button.click();
      console.log(`💾 AI Resume: 成功点击保存按钮 (项目 ${itemIndex + 1})`);
      return true;

    } catch (error) {
      console.error('🤖 AI Resume: 点击保存按钮失败:', error);
      return false;
    }
  }

  // 等待保存完成
  async waitForSave() {
    // 简单的延迟等待，实际项目中可以监听网络请求或UI变化
    await this.sleep(1000);
  }

  // 填写简单字段（带容器范围限制）
  async fillSimpleField(value, fieldConfig, containerSelector = 'body') {
    if (!value || !fieldConfig.selector) {
      return;
    }

    try {
      // 构建限定范围的选择器
      let fullSelector = fieldConfig.selector;
      if (containerSelector !== 'body') {
        fullSelector = `${containerSelector} ${fieldConfig.selector}`;
      }

      const element = document.querySelector(fullSelector);
      if (!element) {
        console.warn(`🤖 AI Resume: 找不到字段元素: ${fullSelector}`);
        return;
      }

      // 滚动到元素位置
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.sleep(200);

      // 根据元素类型填写
      if (element.tagName === 'SELECT') {
        await this.fillSelectField(element, value);
      } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        await this.fillInputField(element, value);
      }

      console.log(`✅ AI Resume: 成功填写字段: ${fieldConfig.label || fieldConfig.selector} = ${value}`);

    } catch (error) {
      console.error(`🤖 AI Resume: 填写字段失败: ${fieldConfig.selector}`, error);
    }
  }

  // 填写输入框
  async fillInputField(element, value) {
    // 聚焦元素
    element.focus();
    await this.sleep(100);

    // 清空现有内容
    element.value = '';

    // 设置新值
    element.value = value;

    // 触发各种事件确保兼容性
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // 填写选择框
  async fillSelectField(element, value) {
    // 查找匹配的选项
    const options = Array.from(element.options);
    let targetOption = null;

    // 精确匹配
    targetOption = options.find(opt => opt.text.trim() === value || opt.value === value);

    // 如果没有精确匹配，尝试模糊匹配
    if (!targetOption) {
      targetOption = options.find(opt =>
        opt.text.includes(value) || value.includes(opt.text.trim())
      );
    }

    if (targetOption) {
      element.value = targetOption.value;
      element.selectedIndex = targetOption.index;

      // 触发change事件
      element.dispatchEvent(new Event('change', { bubbles: true }));

      console.log(`✅ AI Resume: 选择了选项: ${targetOption.text}`);
    } else {
      console.warn(`🤖 AI Resume: 在选择框中找不到匹配选项: ${value}`);
    }
  }

  // 睡眠函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 生成唯一选择器（调用现有的方法）
  generateUniqueSelector(element) {
    return this.generateUniqueCssSelector(element);
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

      // 准备字段信息用于AI匹配 - 新的多层启发式数据格式
      const fieldsForMatching = this.scannedFields.map((field, index) => ({
        // 基本字段信息
        name: field.clues.name || field.clues.id || `field_${index}`,
        type: field.type,
        label: field.clues.bestLabel,
        placeholder: field.clues.placeholder,
        required: field.attributes?.required || false,

        // 选项 (对于select元素)
        options: field.options?.map(opt => opt.text || opt.value) || [],

        // 定位信息
        selector: field.selector,
        xpath: null,

         // 🔍 丰富的上下文线索 - 这是关键改进！
         context_clues: {
           // 🥇 最可靠的语义链接
           label_for: field.clues.labelFor,
           framework_label: field.clues.frameworkLabel, // 🎯 新增：框架标签
           parent_label: field.clues.parentLabel,

           // 🥈 元素自身描述
           aria_label: field.clues.ariaLabel,
           title: field.clues.title,

           // 🥉 命名约定
           element_id: field.clues.id,
           element_name: field.clues.name,
           class_name: field.clues.className,

           // 🔍 上下文线索
           sibling_text: field.clues.siblingText,
           parent_text: field.clues.parentText?.substring(0, 100), // 限制长度
           section_header: field.clues.sectionHeader,

           // 元素标签和类型
           tag_name: field.tag,
           input_type: field.type
         }
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
