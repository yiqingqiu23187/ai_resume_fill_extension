/**
 * 事件总线 - 模块间通信中心
 * 实现发布-订阅模式，降低模块间耦合
 */
class EventBus {
  constructor() {
    this.events = new Map();
    this.debugMode = false;
  }

  /**
   * 获取单例实例
   */
  static getInstance() {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} options - 选项 {once: boolean}
   */
  on(eventName, callback, options = {}) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const listener = {
      callback,
      once: options.once || false,
      id: Date.now() + Math.random()
    };

    this.events.get(eventName).push(listener);

    if (this.debugMode) {
      console.log(`[EventBus] 订阅事件: ${eventName}`);
    }

    // 返回取消订阅函数
    return () => this.off(eventName, listener.id);
  }

  /**
   * 一次性订阅事件
   */
  once(eventName, callback) {
    return this.on(eventName, callback, { once: true });
  }

  /**
   * 取消订阅
   * @param {string} eventName - 事件名称
   * @param {string} listenerId - 监听器ID
   */
  off(eventName, listenerId) {
    if (!this.events.has(eventName)) return;

    const listeners = this.events.get(eventName);
    const index = listeners.findIndex(listener => listener.id === listenerId);

    if (index > -1) {
      listeners.splice(index, 1);

      if (this.debugMode) {
        console.log(`[EventBus] 取消订阅: ${eventName}`);
      }
    }
  }

  /**
   * 发布事件
   * @param {string} eventName - 事件名称
   * @param {*} data - 事件数据
   */
  emit(eventName, data) {
    if (!this.events.has(eventName)) return;

    const listeners = this.events.get(eventName);
    const toRemove = [];

    listeners.forEach(listener => {
      try {
        listener.callback(data, eventName);

        if (listener.once) {
          toRemove.push(listener.id);
        }
      } catch (error) {
        console.error(`[EventBus] 事件处理错误 ${eventName}:`, error);
      }
    });

    // 移除一次性监听器
    toRemove.forEach(id => this.off(eventName, id));

    if (this.debugMode) {
      console.log(`[EventBus] 发布事件: ${eventName}`, data);
    }
  }

  /**
   * 清除所有事件监听器
   */
  clear() {
    this.events.clear();
    if (this.debugMode) {
      console.log('[EventBus] 清除所有事件监听器');
    }
  }

  /**
   * 开启/关闭调试模式
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * 获取事件统计信息
   */
  getStats() {
    const stats = {};
    this.events.forEach((listeners, eventName) => {
      stats[eventName] = {
        listenerCount: listeners.length,
        onceListeners: listeners.filter(l => l.once).length
      };
    });
    return stats;
  }
}

// 确保在全局只有一个实例
if (typeof window !== 'undefined') {
  window.EventBus = EventBus;
}
