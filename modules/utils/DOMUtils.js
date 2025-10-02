/**
 * DOM操作工具类 - 封装常用的DOM操作方法
 * 提供安全、高效的DOM操作接口
 */
class DOMUtils {

  /**
   * 等待元素出现
   */
  static waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`等待元素超时: ${selector}`));
      }, timeout);
    });
  }

  /**
   * 等待元素消失
   */
  static waitForElementToDisappear(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (!element) {
          resolve();
          return;
        }

        const observer = new MutationObserver((mutations, obs) => {
          const element = document.querySelector(selector);
          if (!element) {
            obs.disconnect();
            resolve();
          }
        });

        observer.observe(document, {
          childList: true,
          subtree: true
        });

        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`等待元素消失超时: ${selector}`));
        }, timeout);
      };

      checkElement();
    });
  }

  /**
   * 获取元素的边界框信息
   */
  static getBoundingBox(element) {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);

    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      visible: this.isElementVisible(element),
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity
    };
  }

  /**
   * 检查元素是否可见
   */
  static isElementVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * 检查元素是否在视口内
   */
  static isElementInViewport(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * 滚动到元素位置
   */
  static scrollToElement(element, options = {}) {
    if (!element) return;

    const defaultOptions = {
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    };

    element.scrollIntoView({ ...defaultOptions, ...options });
  }

  /**
   * 查找元素的所有标签
   */
  static findAssociatedLabels(inputElement) {
    if (!inputElement) return [];

    const labels = [];

    // 1. 通过 for 属性关联的 label
    if (inputElement.id) {
      const labelsForId = document.querySelectorAll(`label[for="${inputElement.id}"]`);
      labels.push(...labelsForId);
    }

    // 2. 父级 label 元素
    let parent = inputElement.parentElement;
    while (parent) {
      if (parent.tagName.toLowerCase() === 'label') {
        labels.push(parent);
        break;
      }
      parent = parent.parentElement;
    }

    // 3. 临近的文本节点和元素
    const nearbyLabels = this.findNearbyLabels(inputElement);
    labels.push(...nearbyLabels);

    // 去重
    return [...new Set(labels)];
  }

  /**
   * 查找附近的标签元素
   */
  static findNearbyLabels(inputElement) {
    const labels = [];
    const inputRect = inputElement.getBoundingClientRect();

    // 查找附近的文本元素
    const allElements = document.querySelectorAll('*');

    for (const element of allElements) {
      if (element === inputElement || element.contains(inputElement)) continue;

      const tagName = element.tagName.toLowerCase();

      // 跳过不相关的元素
      if (['script', 'style', 'head', 'meta', 'link'].includes(tagName)) continue;

      const elementRect = element.getBoundingClientRect();
      const text = element.textContent?.trim();

      if (!text || text.length > 100) continue; // 跳过过长的文本

      // 检查是否在附近
      const distance = this.calculateDistance(inputRect, elementRect);
      if (distance < 100) { // 100px 范围内
        // 检查是否是标签性质的元素
        if (this.isLabelLikeElement(element, text)) {
          labels.push(element);
        }
      }
    }

    return labels;
  }

  /**
   * 计算两个矩形的距离
   */
  static calculateDistance(rect1, rect2) {
    const centerX1 = rect1.left + rect1.width / 2;
    const centerY1 = rect1.top + rect1.height / 2;
    const centerX2 = rect2.left + rect2.width / 2;
    const centerY2 = rect2.top + rect2.height / 2;

    return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
  }

  /**
   * 判断是否是标签性质的元素
   */
  static isLabelLikeElement(element, text) {
    const tagName = element.tagName.toLowerCase();

    // 明确的标签元素
    if (['label', 'legend'].includes(tagName)) return true;

    // 表格相关
    if (['th', 'td'].includes(tagName) && text.length < 50) return true;

    // 常见的标签容器
    if (['span', 'div', 'p'].includes(tagName)) {
      // 检查类名是否包含标签相关的词汇
      const className = element.className.toLowerCase();
      const labelKeywords = ['label', 'title', 'caption', 'name', 'field'];

      if (labelKeywords.some(keyword => className.includes(keyword))) return true;

      // 检查文本内容是否像标签
      if (text.endsWith(':') || text.endsWith('：')) return true;
      if (/^[\u4e00-\u9fa5a-zA-Z\s]{2,20}$/.test(text)) return true; // 中英文，2-20字符
    }

    return false;
  }

  /**
   * 生成元素的CSS选择器
   */
  static generateSelector(element) {
    if (!element) return '';

    // 如果有唯一的 ID
    if (element.id && document.querySelectorAll(`#${element.id}`).length === 1) {
      return `#${element.id}`;
    }

    // 如果有唯一的 name 属性
    if (element.name && document.querySelectorAll(`[name="${element.name}"]`).length === 1) {
      return `[name="${element.name}"]`;
    }

    // 构建路径选择器
    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      // 添加类名（取最具特征性的）
      if (current.className) {
        const classes = current.className.trim().split(/\s+/).filter(cls =>
          cls && !cls.startsWith('ng-') && !cls.startsWith('_') && cls.length < 30
        );

        if (classes.length > 0) {
          // 选择最短的类名，通常更稳定
          const bestClass = classes.reduce((a, b) => a.length <= b.length ? a : b);
          selector += `.${bestClass}`;
        }
      }

      // 如果有兄弟元素，添加位置信息
      const siblings = Array.from(current.parentNode?.children || [])
        .filter(sibling => sibling.tagName === current.tagName);

      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    const finalSelector = path.join(' > ');

    // 验证选择器唯一性
    try {
      if (document.querySelectorAll(finalSelector).length === 1) {
        return finalSelector;
      }
    } catch (e) {
      console.warn('生成的选择器无效:', finalSelector);
    }

    // 后备方案：使用 XPath
    return this.generateXPath(element);
  }

  /**
   * 生成元素的XPath
   */
  static generateXPath(element) {
    if (!element) return '';

    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;

      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      const tagName = current.tagName.toLowerCase();
      path.unshift(`${tagName}[${index}]`);
      current = current.parentElement;
    }

    return '//' + path.join('/');
  }

  /**
   * 通过选择器查找元素
   */
  static findElement(selector) {
    try {
      // 尝试CSS选择器
      if (!selector.startsWith('//')) {
        return document.querySelector(selector);
      }

      // XPath选择器
      const result = document.evaluate(
        selector,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );

      return result.singleNodeValue;
    } catch (error) {
      console.error('查找元素失败:', selector, error);
      return null;
    }
  }

  /**
   * 高亮显示元素
   */
  static highlightElement(element, options = {}) {
    if (!element) return null;

    const defaultOptions = {
      color: '#ff6b6b',
      duration: 2000,
      className: 'cv-highlight'
    };

    const config = { ...defaultOptions, ...options };

    // 创建高亮层
    const highlight = document.createElement('div');
    highlight.className = config.className;

    const rect = element.getBoundingClientRect();
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${config.color};
      background: ${config.color}20;
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 0 10px ${config.color}40;
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(highlight);

    // 自动移除
    if (config.duration > 0) {
      setTimeout(() => {
        if (highlight.parentNode) {
          highlight.style.opacity = '0';
          setTimeout(() => {
            highlight.remove();
          }, 300);
        }
      }, config.duration);
    }

    return highlight;
  }

  /**
   * 安全地触发事件
   */
  static triggerEvent(element, eventType, options = {}) {
    if (!element) return false;

    try {
      const event = new Event(eventType, {
        bubbles: true,
        cancelable: true,
        ...options
      });

      element.dispatchEvent(event);
      return true;
    } catch (error) {
      console.error('触发事件失败:', eventType, error);
      return false;
    }
  }

  /**
   * 安全地设置元素值
   */
  static setValue(element, value, triggerEvents = true) {
    if (!element) return false;

    try {
      const tagName = element.tagName.toLowerCase();
      const inputType = element.type?.toLowerCase();

      // 根据元素类型设置值
      if (tagName === 'input') {
        if (['radio', 'checkbox'].includes(inputType)) {
          element.checked = Boolean(value);
        } else {
          element.value = value;
        }
      } else if (tagName === 'select') {
        element.value = value;
      } else if (tagName === 'textarea') {
        element.value = value;
      } else if (element.contentEditable === 'true') {
        element.textContent = value;
      }

      // 触发相关事件
      if (triggerEvents) {
        this.triggerEvent(element, 'input');
        this.triggerEvent(element, 'change');
        this.triggerEvent(element, 'blur');
      }

      return true;
    } catch (error) {
      console.error('设置元素值失败:', error);
      return false;
    }
  }

  /**
   * 创建调试信息面板
   */
  static createDebugPanel(title, content) {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      max-height: 400px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10001;
      font-family: monospace;
      font-size: 12px;
      overflow: auto;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 10px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
      font-weight: bold;
    `;
    header.textContent = title;

    const body = document.createElement('div');
    body.style.cssText = `
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-all;
    `;
    body.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 5px;
      right: 10px;
      border: none;
      background: none;
      font-size: 16px;
      cursor: pointer;
    `;
    closeBtn.onclick = () => panel.remove();

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(closeBtn);
    document.body.appendChild(panel);

    return panel;
  }
}

// 确保在全局可用
if (typeof window !== 'undefined') {
  window.DOMUtils = DOMUtils;
}
