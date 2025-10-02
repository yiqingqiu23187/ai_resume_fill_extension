/**
 * 配置管理器 - 统一管理扩展配置
 * 支持网站特定配置和动态配置更新
 */
class ConfigManager {
  constructor() {
    this.configs = null;
    this.currentWebsite = '';
    this.mergedConfig = null;
    this.eventBus = EventBus.getInstance();
    this.loaded = false;
  }

  /**
   * 初始化配置管理器
   */
  async init() {
    try {
      await this.loadConfigs();
      this.currentWebsite = this.detectWebsite();
      this.mergedConfig = this.getMergedConfig();
      this.loaded = true;

      console.log('[ConfigManager] 配置初始化完成', {
        website: this.currentWebsite,
        config: this.mergedConfig
      });

      this.eventBus.emit('config-loaded', {
        website: this.currentWebsite,
        config: this.mergedConfig
      });

    } catch (error) {
      console.error('[ConfigManager] 配置初始化失败:', error);
      this.loaded = false;
      throw error;
    }
  }

  /**
   * 加载配置文件
   */
  async loadConfigs() {
    try {
      // 从扩展资源加载配置文件
      const response = await fetch(chrome.runtime.getURL('config/website-configs.json'));

      if (!response.ok) {
        throw new Error(`配置文件加载失败: ${response.status}`);
      }

      this.configs = await response.json();
      console.log('[ConfigManager] 配置文件加载成功');

    } catch (error) {
      console.error('[ConfigManager] 配置文件加载失败:', error);

      // 使用内置默认配置作为fallback
      this.configs = this.getBuiltinDefaultConfig();
      console.warn('[ConfigManager] 使用内置默认配置');
    }
  }

  /**
   * 检测当前网站
   */
  detectWebsite() {
    const hostname = window.location.hostname.toLowerCase();

    // 检查是否有精确匹配的配置
    if (this.configs[hostname]) {
      return hostname;
    }

    // 检查主域名匹配
    const mainDomain = this.extractMainDomain(hostname);
    if (this.configs[mainDomain]) {
      return mainDomain;
    }

    // 检查部分匹配
    for (const configKey of Object.keys(this.configs)) {
      if (configKey !== 'default' && (hostname.includes(configKey) || configKey.includes(hostname))) {
        return configKey;
      }
    }

    console.log(`[ConfigManager] 使用默认配置，当前网站: ${hostname}`);
    return 'default';
  }

  /**
   * 提取主域名
   */
  extractMainDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }

  /**
   * 获取合并后的配置
   */
  getMergedConfig() {
    const defaultConfig = this.configs.default || {};
    const siteConfig = this.configs[this.currentWebsite] || {};

    // 深度合并配置
    return this.deepMerge(defaultConfig, siteConfig);
  }

  /**
   * 深度合并对象
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(result[key])) {
          result[key] = this.deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 判断是否为对象
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 获取当前网站配置
   */
  getWebsiteConfig() {
    if (!this.loaded) {
      console.warn('[ConfigManager] 配置尚未加载完成');
      return this.getBuiltinDefaultConfig().default;
    }
    return this.mergedConfig;
  }

  /**
   * 获取特定配置项
   */
  get(configPath, defaultValue = null) {
    if (!this.loaded) {
      return defaultValue;
    }

    const keys = configPath.split('.');
    let current = this.mergedConfig;

    for (const key of keys) {
      if (current && current.hasOwnProperty(key)) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * 设置配置项（临时）
   */
  set(configPath, value) {
    const keys = configPath.split('.');
    let current = this.mergedConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;

    this.eventBus.emit('config-updated', {
      path: configPath,
      value: value
    });

    console.log(`[ConfigManager] 配置已更新: ${configPath} = ${value}`);
  }

  /**
   * 获取分析配置
   */
  getAnalysisConfig() {
    return this.get('analysis_config', {});
  }

  /**
   * 获取选择器配置
   */
  getSelectors() {
    return this.get('selectors', {});
  }

  /**
   * 获取时间配置
   */
  getTiming() {
    return this.get('timing', {});
  }

  /**
   * 获取功能开关
   */
  getFeatures() {
    return this.get('features', {});
  }

  /**
   * 检查功能是否启用
   */
  isFeatureEnabled(featureName) {
    return this.get(`features.${featureName}`, false);
  }

  /**
   * 获取内置默认配置
   */
  getBuiltinDefaultConfig() {
    return {
      default: {
        analysis_config: {
          xy_cut_threshold: 10,
          morphology_kernel_size: 20,
          min_region_size: 50,
          similarity_threshold: 0.8,
          viewport_width: 1200,
          viewport_height: 1400
        },
        selectors: {
          form_containers: ["form", ".form", "[role='form']"],
          input_elements: ["input", "textarea", "select"],
          label_elements: ["label", ".label", ".field-label"],
          submit_buttons: ["button[type='submit']", "input[type='submit']"],
          exclude_elements: [".captcha", ".verification", ".hidden"]
        },
        timing: {
          wait_after_load: 2000,
          wait_between_fills: 300,
          max_analysis_time: 30000
        },
        features: {
          enable_visual_analysis: true,
          enable_debug_overlay: false,
          enable_analytics: true,
          fallback_to_traditional: true
        }
      }
    };
  }

  /**
   * 重新加载配置
   */
  async reload() {
    console.log('[ConfigManager] 重新加载配置...');
    await this.init();
  }

  /**
   * 获取配置统计信息
   */
  getStats() {
    return {
      loaded: this.loaded,
      currentWebsite: this.currentWebsite,
      configKeys: this.configs ? Object.keys(this.configs) : [],
      mergedConfigSize: this.mergedConfig ? Object.keys(this.mergedConfig).length : 0
    };
  }

  /**
   * 导出当前配置（用于调试）
   */
  exportConfig() {
    return {
      website: this.currentWebsite,
      config: this.mergedConfig,
      timestamp: Date.now()
    };
  }
}

// 确保在全局只有一个实例
if (typeof window !== 'undefined') {
  window.ConfigManager = ConfigManager;
}
