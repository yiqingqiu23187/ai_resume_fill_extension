/**
 * AI Resume AutoFill - Inject Script
 * 注入脚本，用于处理特殊的DOM操作和页面级别的交互
 */

(function() {
  'use strict';

  // 防止重复注入
  if (window.aiResumeAutoFillInjected) {
    return;
  }
  window.aiResumeAutoFillInjected = true;

  /**
   * 高级表单字段检测
   * 某些网站可能使用复杂的JavaScript框架，需要特殊处理
   */
  class AdvancedFormDetector {
    constructor() {
      this.observers = [];
      this.setupObservers();
    }

    // 设置观察器监听动态内容
    setupObservers() {
      // 监听React/Vue等框架渲染的表单
      const reactObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && this.containsReactForm(node)) {
                this.notifyFormDetected('react', node);
              }
            });
          }
        });
      });

      reactObserver.observe(document.body, {
        childList: true,
        subtree: true
      });

      this.observers.push(reactObserver);
    }

    // 检测React表单
    containsReactForm(node) {
      // 检查是否包含React相关属性
      if (node.querySelector && (
        node.querySelector('[data-reactroot]') ||
        node.querySelector('[data-react-*]') ||
        node.querySelector('input[name*="react"]')
      )) {
        return true;
      }
      return false;
    }

    // 通知发现新表单
    notifyFormDetected(type, node) {
      // 发送消息给content script
      window.postMessage({
        type: 'AI_RESUME_FORM_DETECTED',
        formType: type,
        timestamp: Date.now()
      }, '*');
    }

    // 销毁观察器
    destroy() {
      this.observers.forEach(observer => observer.disconnect());
      this.observers = [];
    }
  }

  /**
   * 特殊网站适配器
   * 为特定招聘网站提供专门的处理逻辑
   */
  class SiteAdapter {
    constructor() {
      this.currentSite = this.detectCurrentSite();
      this.setupSiteSpecificLogic();
    }

    // 检测当前网站
    detectCurrentSite() {
      const hostname = window.location.hostname;

      const siteMap = {
        'jobs.51job.com': '51job',
        'www.zhaopin.com': 'zhaopin',
        'www.lagou.com': 'lagou',
        'www.liepin.com': 'liepin',
        'careers.tencent.com': 'tencent',
        'job.alibaba.com': 'alibaba',
        'talent.baidu.com': 'baidu'
      };

      return siteMap[hostname] || 'unknown';
    }

    // 设置网站特定逻辑
    setupSiteSpecificLogic() {
      switch (this.currentSite) {
        case '51job':
          this.setup51Job();
          break;
        case 'zhaopin':
          this.setupZhaopin();
          break;
        case 'lagou':
          this.setupLagou();
          break;
        // 可以继续添加其他网站的适配
      }
    }

    // 51Job特殊处理
    setup51Job() {
      // 51Job可能使用特殊的表单验证
      this.overrideFormValidation();
    }

    // 智联招聘特殊处理
    setupZhaopin() {
      // 智联可能有反自动化检测
      this.setupAntiDetection();
    }

    // 拉勾网特殊处理
    setupLagou() {
      // 拉勾可能使用异步加载表单
      this.handleAsyncForms();
    }

    // 覆盖表单验证
    overrideFormValidation() {
      // 临时禁用某些验证，让自动填写更顺利
      const originalValidate = HTMLFormElement.prototype.checkValidity;
      HTMLFormElement.prototype.checkValidity = function() {
        // 在自动填写期间暂时返回true
        if (window.aiResumeAutoFilling) {
          return true;
        }
        return originalValidate.call(this);
      };
    }

    // 设置反检测
    setupAntiDetection() {
      // 模拟人工操作的时间间隔
      this.humanizeEvents();
    }

    // 人性化事件
    humanizeEvents() {
      // 添加随机延迟和鼠标移动
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'input' || type === 'change') {
          const wrappedListener = function(event) {
            // 添加轻微延迟，模拟人工输入
            if (event.isTrusted === false) {
              setTimeout(() => listener.call(this, event), Math.random() * 50);
            } else {
              listener.call(this, event);
            }
          };
          return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    }

    // 处理异步表单
    handleAsyncForms() {
      // 监听Ajax请求完成
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
          // 检查是否是表单相关的API调用
          if (args[0] && args[0].includes('form')) {
            setTimeout(() => {
              window.postMessage({
                type: 'AI_RESUME_ASYNC_FORM_LOADED',
                timestamp: Date.now()
              }, '*');
            }, 100);
          }
          return response;
        });
      };
    }
  }

  /**
   * 智能输入模拟器
   * 提供更自然的输入方式
   */
  class SmartInputSimulator {
    // 模拟人工输入
    static simulateTyping(element, text, options = {}) {
      const {
        delay = 50,
        variation = 20
      } = options;

      return new Promise((resolve) => {
        let index = 0;

        function typeNext() {
          if (index < text.length) {
            element.value += text[index];

            // 触发输入事件
            element.dispatchEvent(new Event('input', { bubbles: true }));

            index++;
            const nextDelay = delay + (Math.random() - 0.5) * variation;
            setTimeout(typeNext, nextDelay);
          } else {
            // 输入完成，触发change事件
            element.dispatchEvent(new Event('change', { bubbles: true }));
            resolve();
          }
        }

        // 聚焦元素
        element.focus();
        setTimeout(typeNext, delay);
      });
    }

    // 模拟鼠标点击
    static simulateClick(element) {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      // 触发鼠标事件序列
      ['mousedown', 'mouseup', 'click'].forEach(eventType => {
        element.dispatchEvent(new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y
        }));
      });
    }
  }

  // 初始化
  let detector = null;
  let adapter = null;

  function initialize() {
    detector = new AdvancedFormDetector();
    adapter = new SiteAdapter();

    // 暴露工具类到全局
    window.SmartInputSimulator = SmartInputSimulator;

    console.log('[AI Resume AutoFill] Inject script loaded for:', adapter.currentSite);
  }

  // 清理函数
  function cleanup() {
    if (detector) {
      detector.destroy();
    }
  }

  // 页面卸载时清理
  window.addEventListener('beforeunload', cleanup);

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
