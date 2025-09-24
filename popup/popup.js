/**
 * AI Resume AutoFill - Popup Script
 * 原生JavaScript实现用户界面交互和业务逻辑
 */

class PopupApp {
  constructor() {
    this.state = {
      loading: true,
      isAuthenticated: false,
      activeTab: 'dashboard',
      authMode: 'login', // 'login' or 'register'

      // 用户信息
      userInfo: null,
      usageInfo: {
        remaining_uses: 0,
        total_activations: 0
      },

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
      }
    };

    this.elements = {};
    this.bindElements();
    this.bindEvents();
    this.init();
  }

  // 绑定DOM元素
  bindElements() {
    this.elements = {
      // 页面容器
      loadingScreen: document.getElementById('loading-screen'),
      authContainer: document.getElementById('auth-container'),
      mainContainer: document.getElementById('main-container'),

      // 认证表单
      loginForm: document.getElementById('login-form'),
      registerForm: document.getElementById('register-form'),
      loginFormElement: document.getElementById('login-form-element'),
      registerFormElement: document.getElementById('register-form-element'),

      // 按钮
      showRegister: document.getElementById('show-register'),
      showLogin: document.getElementById('show-login'),
      loginBtn: document.getElementById('login-btn'),
      registerBtn: document.getElementById('register-btn'),
      logoutBtn: document.getElementById('logout-btn'),

      // 标签页
      tabs: document.querySelectorAll('.tab-btn'),
      tabContents: document.querySelectorAll('.tab-content'),

      // 快速操作按钮
      quickResume: document.getElementById('quick-resume'),
      quickActivation: document.getElementById('quick-activation'),

      // 简历表单
      resumeForm: document.getElementById('resume-form'),
      saveResumeBtn: document.getElementById('save-resume-btn'),

      // 激活码
      activationCode: document.getElementById('activation-code'),
      activateBtn: document.getElementById('activate-btn'),

      // 统计数据
      remainingUses: document.getElementById('remaining-uses'),
      totalActivations: document.getElementById('total-activations'),
      totalActivationsDetail: document.getElementById('total-activations-detail'),
      remainingUsesDetail: document.getElementById('remaining-uses-detail'),

      // 消息提示
      message: document.getElementById('message'),
      messageText: document.getElementById('message-text')
    };
  }

  // 绑定事件
  bindEvents() {
    // 认证相关事件
    this.elements.showRegister.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchAuthMode('register');
    });

    this.elements.showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchAuthMode('login');
    });

    this.elements.loginFormElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });

    this.elements.registerFormElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.register();
    });

    this.elements.logoutBtn.addEventListener('click', () => {
      this.logout();
    });

    // 标签页切换
    this.elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });

    // 快速操作按钮
    this.elements.quickResume.addEventListener('click', () => {
      this.switchTab('resume');
    });

    this.elements.quickActivation.addEventListener('click', () => {
      this.switchTab('activation');
    });

    // 简历表单
    this.elements.resumeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveResume();
    });

    // 激活码
    this.elements.activationCode.addEventListener('input', () => {
      this.updateActivateButton();
    });

    this.elements.activateBtn.addEventListener('click', () => {
      this.activateCode();
    });
  }

  // 初始化应用
  async init() {
    try {
      // 检查用户认证状态
      const authResult = await this.sendMessage({ action: 'checkAuthStatus' });

      if (authResult.success && authResult.isAuthenticated) {
        this.state.isAuthenticated = true;
        await this.loadUserData();
        this.showMainContainer();
      } else {
        this.state.isAuthenticated = false;
        this.showAuthContainer();
      }
    } catch (error) {
      console.error('初始化失败:', error);
      this.showMessage('初始化失败', 'error');
      this.showAuthContainer();
    } finally {
      this.state.loading = false;
      this.hideLoading();
    }
  }

  // 加载用户数据
  async loadUserData() {
    try {
      // 加载用户信息
      const userResult = await this.sendMessage({ action: 'getUserInfo' });
      if (userResult.success) {
        this.state.userInfo = userResult.data;
      }

      // 加载简历数据
      const resumeResult = await this.sendMessage({ action: 'getResume' });
      if (resumeResult.success && resumeResult.data) {
        // 后端返回的简历数据结构：{ id, user_id, title, fields: {...}, created_at, updated_at }
        const resume = resumeResult.data;
        if (resume.fields) {
          Object.keys(this.state.resumeData).forEach(key => {
            if (resume.fields[key] !== undefined) {
              this.state.resumeData[key] = resume.fields[key];
            }
          });
          this.populateResumeForm();
        }
      }

      // 加载使用情况
      await this.loadUsageInfo();

    } catch (error) {
      console.error('加载用户数据失败:', error);
      this.showMessage('加载数据失败', 'error');
    }
  }

  // 加载使用情况
  async loadUsageInfo() {
    try {
      const result = await this.sendMessage({ action: 'getUsageInfo' });
      if (result.success) {
        this.state.usageInfo = result.data;
        this.updateUsageDisplay();
      }
    } catch (error) {
      console.error('加载使用情况失败:', error);
    }
  }

  // 加载简历数据
  async loadResumeData() {
    try {
      const result = await this.sendMessage({ action: 'getResume' });

      if (result.success && result.data) {
        const resume = result.data;

        if (resume.fields && typeof resume.fields === 'object') {
          Object.keys(this.state.resumeData).forEach(key => {
            if (resume.fields[key] !== undefined) {
              this.state.resumeData[key] = resume.fields[key];
            }
          });
          this.populateResumeForm();
        } else {
          // 如果没有fields但有field_count，说明数据可能有问题
          if (resume.field_count && resume.field_count > 0) {
            this.showMessage(`检测到${resume.field_count}个字段，但无法获取字段数据。可能是数据同步问题，请尝试重新保存简历信息。`, 'warning');
          } else {
            this.showMessage('简历数据为空，请填写简历信息', 'info');
          }
        }
      } else {
        this.showMessage('获取简历数据失败', 'warning');
      }
    } catch (error) {
      console.error('加载简历数据失败:', error);
      this.showMessage('加载简历数据失败', 'error');
    }
  }

  // 用户登录
  async login() {
    const formData = new FormData(this.elements.loginFormElement);
    const email = formData.get('email');
    const password = formData.get('password');

    if (!this.validateLoginForm(email, password)) {
      return;
    }

    this.setButtonLoading(this.elements.loginBtn, true, '登录中...');

    try {
      const result = await this.sendMessage({
        action: 'login',
        email: email,
        password: password
      });

      if (result.success) {
        this.showMessage('登录成功！', 'success');
        this.state.isAuthenticated = true;
        this.resetLoginForm();
        await this.loadUserData();
        this.showMainContainer();
      } else {
        this.showMessage(result.error || '登录失败', 'error');
      }
    } catch (error) {
      console.error('登录错误:', error);
      this.showMessage('登录失败，请重试', 'error');
    } finally {
      this.setButtonLoading(this.elements.loginBtn, false, '登录');
    }
  }

  // 用户注册
  async register() {
    const formData = new FormData(this.elements.registerFormElement);
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (!this.validateRegisterForm(email, password, confirmPassword)) {
      return;
    }

    this.setButtonLoading(this.elements.registerBtn, true, '注册中...');

    try {
      const result = await this.sendMessage({
        action: 'register',
        email: email,
        password: password
      });

      if (result.success) {
        this.showMessage('注册成功！请登录', 'success');
        this.switchAuthMode('login');
        this.resetRegisterForm();
        // 自动填入邮箱
        this.elements.loginFormElement.email.value = email;
      } else {
        this.showMessage(result.error || '注册失败', 'error');
      }
    } catch (error) {
      console.error('注册错误:', error);
      this.showMessage('注册失败，请重试', 'error');
    } finally {
      this.setButtonLoading(this.elements.registerBtn, false, '注册');
    }
  }

  // 用户退出
  async logout() {
    try {
      await this.sendMessage({ action: 'logout' });
      this.state.isAuthenticated = false;
      this.state.userInfo = null;
      this.resetAllForms();
      this.showAuthContainer();
      this.showMessage('已退出登录', 'info');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  }

  // 保存简历信息
  async saveResume() {
    const formData = new FormData(this.elements.resumeForm);
    const resumeData = {};

    for (let [key, value] of formData.entries()) {
      resumeData[key] = value;
      this.state.resumeData[key] = value;
    }

    this.setButtonLoading(this.elements.saveResumeBtn, true, '保存中...');

    try {
      const result = await this.sendMessage({
        action: 'updateResume',
        resumeData: {
          title: '我的简历',
          fields: resumeData
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
      this.setButtonLoading(this.elements.saveResumeBtn, false, '保存简历信息');
    }
  }

  // 激活码激活
  async activateCode() {
    const code = this.elements.activationCode.value.trim();

    if (!code) {
      this.showMessage('请输入激活码', 'warning');
      return;
    }

    this.setButtonLoading(this.elements.activateBtn, true, '激活中...');

    try {
      const result = await this.sendMessage({
        action: 'activateCode',
        code: code
      });

      if (result.success) {
        this.showMessage('激活成功！已添加5次使用次数', 'success');
        this.elements.activationCode.value = '';
        this.updateActivateButton();
        await this.loadUsageInfo();
      } else {
        this.showMessage(result.error || '激活失败', 'error');
      }
    } catch (error) {
      console.error('激活失败:', error);
      this.showMessage('激活失败，请重试', 'error');
    } finally {
      this.setButtonLoading(this.elements.activateBtn, false, '激活');
    }
  }

  // 表单验证
  validateLoginForm(email, password) {
    if (!email) {
      this.showMessage('请输入邮箱地址', 'warning');
      return false;
    }
    if (!password) {
      this.showMessage('请输入密码', 'warning');
      return false;
    }
    if (!this.isValidEmail(email)) {
      this.showMessage('请输入有效的邮箱地址', 'warning');
      return false;
    }
    return true;
  }

  validateRegisterForm(email, password, confirmPassword) {
    if (!email) {
      this.showMessage('请输入邮箱地址', 'warning');
      return false;
    }
    if (!password) {
      this.showMessage('请输入密码', 'warning');
      return false;
    }
    if (!confirmPassword) {
      this.showMessage('请确认密码', 'warning');
      return false;
    }
    if (!this.isValidEmail(email)) {
      this.showMessage('请输入有效的邮箱地址', 'warning');
      return false;
    }
    if (password.length < 6) {
      this.showMessage('密码长度至少6位', 'warning');
      return false;
    }
    if (password !== confirmPassword) {
      this.showMessage('两次输入的密码不一致', 'warning');
      return false;
    }
    return true;
  }

  // 邮箱验证
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // UI 控制方法
  hideLoading() {
    this.elements.loadingScreen.classList.add('hidden');
  }

  showAuthContainer() {
    this.elements.authContainer.classList.remove('hidden');
    this.elements.mainContainer.classList.add('hidden');
  }

  showMainContainer() {
    this.elements.authContainer.classList.add('hidden');
    this.elements.mainContainer.classList.remove('hidden');
  }

  switchAuthMode(mode) {
    this.state.authMode = mode;
    if (mode === 'login') {
      this.elements.loginForm.classList.remove('hidden');
      this.elements.registerForm.classList.add('hidden');
    } else {
      this.elements.loginForm.classList.add('hidden');
      this.elements.registerForm.classList.remove('hidden');
    }
  }

  switchTab(tabName) {
    this.state.activeTab = tabName;

    // 更新标签按钮状态
    this.elements.tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // 显示对应的内容
    this.elements.tabContents.forEach(content => {
      content.classList.add('hidden');
    });

    const activeContent = document.getElementById(`${tabName}-content`);
    if (activeContent) {
      activeContent.classList.remove('hidden');
    }

    // 切换页面时的特殊处理
    if (tabName === 'activation') {
      this.loadUsageInfo();
    } else if (tabName === 'resume') {
      this.loadResumeData();
    }
  }

  setButtonLoading(button, isLoading, text) {
    if (isLoading) {
      button.disabled = true;
      button.querySelector('span').textContent = text;
    } else {
      button.disabled = false;
      button.querySelector('span').textContent = text;
    }
  }

  updateActivateButton() {
    const hasCode = this.elements.activationCode.value.trim().length > 0;
    this.elements.activateBtn.disabled = !hasCode;
  }

  updateUsageDisplay() {
    const { remaining_uses, total_activations } = this.state.usageInfo;

    if (this.elements.remainingUses) {
      this.elements.remainingUses.textContent = remaining_uses || 0;
    }
    if (this.elements.totalActivations) {
      this.elements.totalActivations.textContent = total_activations || 0;
    }
    if (this.elements.totalActivationsDetail) {
      this.elements.totalActivationsDetail.textContent = total_activations || 0;
    }
    if (this.elements.remainingUsesDetail) {
      this.elements.remainingUsesDetail.textContent = remaining_uses || 0;
    }
  }

  populateResumeForm() {
    Object.keys(this.state.resumeData).forEach(key => {
      const element = this.elements.resumeForm.querySelector(`[name="${key}"]`);
      if (element) {
        element.value = this.state.resumeData[key] || '';
      }
    });
  }

  resetLoginForm() {
    this.elements.loginFormElement.reset();
  }

  resetRegisterForm() {
    this.elements.registerFormElement.reset();
  }

  resetAllForms() {
    this.resetLoginForm();
    this.resetRegisterForm();
    this.elements.activationCode.value = '';
    this.state.activeTab = 'dashboard';
    this.state.authMode = 'login';
    this.switchAuthMode('login');
    this.switchTab('dashboard');
  }

  // 发送消息到background script
  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
  }

  // 显示消息提示
  showMessage(text, type = 'info') {
    this.elements.messageText.textContent = text;
    this.elements.message.className = `message ${type}`;
    this.elements.message.classList.remove('hidden');

    // 3秒后自动消失
    setTimeout(() => {
      this.elements.message.classList.add('hidden');
    }, 3000);
  }
}

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new PopupApp();
});
