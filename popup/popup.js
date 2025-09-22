/**
 * AI Resume AutoFill - Popup Script
 * Vue.js应用，实现用户界面交互和业务逻辑
 */

const { createApp } = Vue;

createApp({
  data() {
    return {
      loading: true,
      isAuthenticated: false,
      activeTab: 'dashboard',
      authMode: 'login', // 'login' or 'register'

      // 用户信息
      userInfo: null,
      usageInfo: {
        totalUses: 0,
        usedCount: 0,
        remainingUses: 0
      },

      // 登录表单
      loginForm: {
        email: '',
        password: ''
      },
      loginLoading: false,

      // 注册表单
      registerForm: {
        email: '',
        password: '',
        confirmPassword: ''
      },
      registerLoading: false,

      // 简历数据
      resumeData: {
        name: '',
        gender: '',
        phone: '',
        email: '',
        birthDate: '',
        address: '',
        education: '',
        school: '',
        major: '',
        graduationDate: '',
        workYears: '',
        expectedSalary: '',
        currentCompany: '',
        position: '',
        skills: '',
        selfIntroduction: ''
      },
      saveLoading: false,

      // 激活码
      activationCode: '',
      activateLoading: false,

      // 消息提示
      message: null
    };
  },

  async mounted() {
    await this.init();
  },

  methods: {
    // 初始化应用
    async init() {
      try {
        // 检查用户认证状态
        const authResult = await this.sendMessage({ action: 'checkAuthStatus' });

        if (authResult.success && authResult.isAuthenticated) {
          this.isAuthenticated = true;
          await this.loadUserData();
        } else {
          this.isAuthenticated = false;
        }
      } catch (error) {
        console.error('初始化失败:', error);
        this.showMessage('初始化失败', 'error');
      } finally {
        this.loading = false;
      }
    },

    // 加载用户数据
    async loadUserData() {
      try {
        // 加载用户信息
        const userResult = await this.sendMessage({ action: 'getUserInfo' });
        if (userResult.success) {
          this.userInfo = userResult.data;
        }

        // 加载简历数据
        const resumeResult = await this.sendMessage({ action: 'getResume' });
        if (resumeResult.success && resumeResult.data) {
          // 将后端数据映射到表单字段
          const resume = resumeResult.data.fields || {};
          Object.keys(this.resumeData).forEach(key => {
            if (resume[key] !== undefined) {
              this.resumeData[key] = resume[key];
            }
          });
        }

        // 加载使用情况
        await this.loadUsageInfo();

      } catch (error) {
        console.error('加载用户数据失败:', error);
        this.showMessage('加载数据失败', 'error');
      }
    },

    // 加载使用情况
    async loadUsageInfo() {
      try {
        const result = await this.sendMessage({ action: 'getUsageInfo' });
        if (result.success) {
          this.usageInfo = result.data;
        }
      } catch (error) {
        console.error('加载使用情况失败:', error);
      }
    },

    // 用户登录
    async login() {
      if (!this.validateLoginForm()) {
        return;
      }

      this.loginLoading = true;

      try {
        const result = await this.sendMessage({
          action: 'login',
          email: this.loginForm.email,
          password: this.loginForm.password
        });

        if (result.success) {
          this.showMessage('登录成功！', 'success');
          this.isAuthenticated = true;
          this.resetLoginForm();
          await this.loadUserData();
        } else {
          this.showMessage(result.error || '登录失败', 'error');
        }
      } catch (error) {
        console.error('登录错误:', error);
        this.showMessage('登录失败，请重试', 'error');
      } finally {
        this.loginLoading = false;
      }
    },

    // 用户注册
    async register() {
      if (!this.validateRegisterForm()) {
        return;
      }

      this.registerLoading = true;

      try {
        const result = await this.sendMessage({
          action: 'register',
          email: this.registerForm.email,
          password: this.registerForm.password
        });

        if (result.success) {
          this.showMessage('注册成功！请登录', 'success');
          this.authMode = 'login';
          this.resetRegisterForm();
          // 自动填入邮箱
          this.loginForm.email = this.registerForm.email;
        } else {
          this.showMessage(result.error || '注册失败', 'error');
        }
      } catch (error) {
        console.error('注册错误:', error);
        this.showMessage('注册失败，请重试', 'error');
      } finally {
        this.registerLoading = false;
      }
    },

    // 用户退出
    async logout() {
      try {
        await this.sendMessage({ action: 'logout' });
        this.isAuthenticated = false;
        this.userInfo = null;
        this.resetAllForms();
        this.showMessage('已退出登录', 'info');
      } catch (error) {
        console.error('退出登录失败:', error);
      }
    },

    // 保存简历信息
    async saveResume() {
      this.saveLoading = true;

      try {
        const result = await this.sendMessage({
          action: 'updateResume',
          resumeData: {
            title: '我的简历',
            fields: this.resumeData
          }
        });

        if (result.success) {
          this.showMessage('简历信息保存成功！', 'success');
        } else {
          this.showMessage(result.error || '保存失败', 'error');
        }
      } catch (error) {
        console.error('保存简历失败:', error);
        this.showMessage('保存失败，请重试', 'error');
      } finally {
        this.saveLoading = false;
      }
    },

    // 激活码激活
    async activateCode() {
      if (!this.activationCode.trim()) {
        this.showMessage('请输入激活码', 'warning');
        return;
      }

      this.activateLoading = true;

      try {
        const result = await this.sendMessage({
          action: 'activateCode',
          code: this.activationCode.trim()
        });

        if (result.success) {
          this.showMessage('激活成功！已添加5次使用次数', 'success');
          this.activationCode = '';
          await this.loadUsageInfo(); // 重新加载使用情况
        } else {
          this.showMessage(result.error || '激活失败', 'error');
        }
      } catch (error) {
        console.error('激活失败:', error);
        this.showMessage('激活失败，请重试', 'error');
      } finally {
        this.activateLoading = false;
      }
    },

    // 表单验证
    validateLoginForm() {
      if (!this.loginForm.email) {
        this.showMessage('请输入邮箱地址', 'warning');
        return false;
      }
      if (!this.loginForm.password) {
        this.showMessage('请输入密码', 'warning');
        return false;
      }
      if (!this.isValidEmail(this.loginForm.email)) {
        this.showMessage('请输入有效的邮箱地址', 'warning');
        return false;
      }
      return true;
    },

    validateRegisterForm() {
      if (!this.registerForm.email) {
        this.showMessage('请输入邮箱地址', 'warning');
        return false;
      }
      if (!this.registerForm.password) {
        this.showMessage('请输入密码', 'warning');
        return false;
      }
      if (!this.registerForm.confirmPassword) {
        this.showMessage('请确认密码', 'warning');
        return false;
      }
      if (!this.isValidEmail(this.registerForm.email)) {
        this.showMessage('请输入有效的邮箱地址', 'warning');
        return false;
      }
      if (this.registerForm.password.length < 6) {
        this.showMessage('密码长度至少6位', 'warning');
        return false;
      }
      if (this.registerForm.password !== this.registerForm.confirmPassword) {
        this.showMessage('两次输入的密码不一致', 'warning');
        return false;
      }
      return true;
    },

    // 邮箱验证
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    // 重置表单
    resetLoginForm() {
      this.loginForm = {
        email: '',
        password: ''
      };
    },

    resetRegisterForm() {
      this.registerForm = {
        email: '',
        password: '',
        confirmPassword: ''
      };
    },

    resetAllForms() {
      this.resetLoginForm();
      this.resetRegisterForm();
      this.activationCode = '';
      this.activeTab = 'dashboard';
      this.authMode = 'login';
    },

    // 发送消息到background script
    sendMessage(message) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
          resolve(response || { success: false, error: 'No response' });
        });
      });
    },

    // 显示消息提示
    showMessage(text, type = 'info') {
      this.message = { text, type };

      // 3秒后自动消失
      setTimeout(() => {
        this.message = null;
      }, 3000);
    },

    // 切换标签页时的处理
    onTabChange(tab) {
      this.activeTab = tab;

      // 如果切换到激活码页面，重新加载使用情况
      if (tab === 'activation') {
        this.loadUsageInfo();
      }
    }
  }
}).mount('#app');
