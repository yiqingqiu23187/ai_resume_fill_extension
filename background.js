/**
 * AI Resume AutoFill - Background Script
 * 负责API通信、用户认证状态管理和数据缓存
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 存储管理
class StorageManager {
  static async setUserToken(token) {
    await chrome.storage.local.set({ userToken: token });
  }

  static async getUserToken() {
    const result = await chrome.storage.local.get(['userToken']);
    return result.userToken;
  }

  static async setUserInfo(userInfo) {
    await chrome.storage.local.set({ userInfo });
  }

  static async getUserInfo() {
    const result = await chrome.storage.local.get(['userInfo']);
    return result.userInfo;
  }

  static async setResumeData(resumeData) {
    await chrome.storage.local.set({ resumeData });
  }

  static async getResumeData() {
    const result = await chrome.storage.local.get(['resumeData']);
    return result.resumeData;
  }

  static async clearUserData() {
    await chrome.storage.local.remove(['userToken', 'userInfo', 'resumeData']);
  }
}

// API调用管理
class APIManager {
  static async makeRequest(endpoint, options = {}) {
    const token = await StorageManager.getUserToken();

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('API request error:', error);
      return { success: false, error: error.message };
    }
  }

  // 用户登录
  static async login(email, password) {
    return await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  // 用户注册
  static async register(email, password) {
    return await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  // 获取用户信息
  static async getUserProfile() {
    return await this.makeRequest('/user/profile');
  }

  // 获取简历信息
  static async getResume() {
    try {
      // 先获取简历列表，取第一个简历
      const listResult = await this.makeRequest('/resumes');

      if (listResult.success && listResult.data && listResult.data.length > 0) {
        // 如果有简历，获取第一个简历的详情
        const resumeId = listResult.data[0].id;
        const detailResult = await this.makeRequest(`/resumes/${resumeId}`);
        return detailResult;
      } else {
        // 如果没有简历，返回一个表示需要创建简历的结果
        return {
          success: true,
          data: null,
          message: 'No resume found'
        };
      }
    } catch (error) {
      console.error('APIManager.getResume: 发生错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 更新简历信息
  static async updateResume(resumeData) {
    // 先检查是否有现有简历
    const existingResult = await this.makeRequest('/resumes');

    if (existingResult.success && existingResult.data && existingResult.data.length > 0) {
      // 更新现有简历
      const resumeId = existingResult.data[0].id;
      return await this.makeRequest(`/resumes/${resumeId}`, {
        method: 'PUT',
        body: JSON.stringify(resumeData)
      });
    } else {
      // 创建新简历
      return await this.makeRequest('/resumes', {
        method: 'POST',
        body: JSON.stringify(resumeData)
      });
    }
  }

  // 字段匹配
  static async matchFields(fields, resumeId, websiteUrl) {
    return await this.makeRequest('/matching/match-fields', {
      method: 'POST',
      body: JSON.stringify({
        resume_id: resumeId,
        form_fields: fields,
        website_url: websiteUrl
      })
    });
  }

  // 🎯 新增：嵌套字段匹配
  static async matchNestedFields(formStructure, resumeId, websiteUrl) {
    return await this.makeRequest('/matching/match-nested-fields', {
      method: 'POST',
      body: JSON.stringify({
        resume_id: resumeId,
        form_structure: formStructure,
        website_url: websiteUrl
      })
    });
  }

  // 验证激活码
  static async validateActivationCode(code) {
    return await this.makeRequest('/activation/validate', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  // 激活码激活
  static async activateCode(code) {
    return await this.makeRequest('/activation/activate', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  // 获取使用次数
  static async getUsageInfo() {
    return await this.makeRequest('/activation/usage');
  }
}

// 消息处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // 保持消息通道开放
});

async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'login':
        const loginResult = await APIManager.login(request.email, request.password);
        if (loginResult.success) {
          await StorageManager.setUserToken(loginResult.data.access_token);
          await StorageManager.setUserInfo(loginResult.data.user);
        }
        sendResponse(loginResult);
        break;

      case 'register':
        const registerResult = await APIManager.register(request.email, request.password);
        sendResponse(registerResult);
        break;

      case 'logout':
        await StorageManager.clearUserData();
        sendResponse({ success: true });
        break;

      case 'getUserInfo':
        const userInfo = await StorageManager.getUserInfo();
        sendResponse({ success: true, data: userInfo });
        break;

      case 'getResume':
        let resumeData = await StorageManager.getResumeData();
        if (!resumeData) {
          const resumeResult = await APIManager.getResume();
          if (resumeResult.success) {
            resumeData = resumeResult.data;
            await StorageManager.setResumeData(resumeData);
          }
        }
        sendResponse({ success: true, data: resumeData });
        break;

      case 'updateResume':
        const updateResult = await APIManager.updateResume(request.resumeData);
        if (updateResult.success) {
          await StorageManager.setResumeData(updateResult.data);
        }
        sendResponse(updateResult);
        break;

      case 'matchFields':
        const matchResult = await APIManager.matchFields(
          request.fields,
          request.resumeId,
          request.websiteUrl
        );
        sendResponse(matchResult);
        break;

      case 'matchNestedFields':
        const nestedMatchResult = await APIManager.matchNestedFields(
          request.formStructure,
          request.resumeId,
          request.websiteUrl
        );
        sendResponse(nestedMatchResult);
        break;

      case 'activateCode':
        const activateResult = await APIManager.activateCode(request.code);
        sendResponse(activateResult);
        break;

      case 'getUsageInfo':
        const usageResult = await APIManager.getUsageInfo();
        sendResponse(usageResult);
        break;

      case 'checkAuthStatus':
        const token = await StorageManager.getUserToken();
        sendResponse({ success: true, isAuthenticated: !!token });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('AI Resume AutoFill extension installed');
});

// 标签页更新时检查是否需要激活插件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 支持所有网站，让content script自行判断是否显示按钮
    if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
      // 向内容脚本发送消息，通知页面加载完成
      try {
        chrome.tabs.sendMessage(tabId, { action: 'pageLoaded' });
      } catch (error) {
        // 忽略发送消息失败的错误（例如某些特殊页面）
        console.log('Failed to send message to tab:', error);
      }
    }
  }
});
