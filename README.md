# AI Resume AutoFill - 浏览器插件

AI驱动的智能简历自动填写浏览器插件，支持各类招聘网站表单的自动识别和填写。

## 功能特点

- 🤖 **AI智能匹配**：使用大语言模型智能理解字段含义，精准匹配简历信息
- 📝 **多类型字段支持**：支持文本框、下拉选择器、日期选择器、地区选择器等
- 🌐 **主流招聘网站兼容**：支持51Job、智联招聘、拉勾网、猎聘网等主流招聘平台
- 🔐 **用户账户系统**：安全的用户注册、登录和数据管理
- 💳 **激活码付费模式**：通过激活码管理使用次数，灵活的付费方案
- 🎨 **现代化UI**：基于Vue.js的现代化用户界面，操作简洁直观

## 支持的招聘网站

- 51Job (jobs.51job.com)
- 智联招聘 (www.zhaopin.com)
- 拉勾网 (www.lagou.com)
- 猎聘网 (www.liepin.com)
- 腾讯招聘 (careers.tencent.com)
- 阿里巴巴招聘 (job.alibaba.com)
- 百度招聘 (talent.baidu.com)
- 网易招聘 (hr.163.com)
- 百度招聘 (zhaopin.baidu.com)
- 58同城招聘 (www.58.com)

## 安装说明

### 开发者模式安装

1. **下载插件文件**
   ```bash
   git clone <repository-url>
   cd ai_resume_fill/extension
   ```

2. **创建图标文件**（临时解决方案）
   ```bash
   cd icons
   # 使用ImageMagick创建临时图标
   convert -size 16x16 xc:'#667eea' icon-16.png
   convert -size 32x32 xc:'#667eea' icon-32.png
   convert -size 48x48 xc:'#667eea' icon-48.png
   convert -size 128x128 xc:'#667eea' icon-128.png
   ```

3. **加载到Chrome浏览器**
   - 打开Chrome浏览器
   - 访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `extension` 目录

### 后端服务配置

插件需要配合后端API服务使用：

1. **启动后端服务**
   ```bash
   cd ../backend
   # 参考后端README启动服务
   ```

2. **配置API地址**
   - 确认后端服务运行在 `http://localhost:8000`
   - 如需修改地址，请编辑 `background.js` 中的 `API_BASE_URL`

## 使用说明

### 1. 用户注册和登录

1. 点击浏览器工具栏中的插件图标
2. 在弹窗中选择"注册"或"登录"
3. 填写邮箱和密码完成注册/登录

### 2. 设置简历信息

1. 登录后点击"简历管理"标签
2. 填写个人基本信息、教育背景、工作经验等
3. 点击"保存简历信息"

### 3. 激活使用次数

1. 点击"激活码"标签
2. 输入购买的激活码
3. 激活成功后将获得5次使用次数

### 4. 自动填写简历

1. 访问支持的招聘网站
2. 进入简历填写页面
3. 点击页面右下角出现的"AI填写简历"按钮
4. 在弹出的面板中点击"扫描表单"
5. 确认字段识别结果后点击"开始填写"
6. 系统将自动匹配并填写表单字段

## 项目结构

```
extension/
├── manifest.json          # 扩展程序配置文件
├── background.js          # 后台脚本，处理API通信
├── content.js             # 内容脚本，处理页面交互
├── content.css            # 内容脚本样式
├── inject.js              # 页面注入脚本
├── popup/                 # 弹窗页面
│   ├── popup.html        # 弹窗HTML结构
│   ├── popup.js          # 弹窗Vue.js应用
│   └── popup.css         # 弹窗样式
├── icons/                 # 图标文件目录
│   └── README.md         # 图标说明
└── README.md             # 项目说明文档
```

## 开发说明

### 技术栈

- **前端框架**：Vue.js 3
- **样式**：纯CSS，现代化设计
- **浏览器API**：Chrome Extension API v3
- **通信方式**：Message Passing

### 核心模块

1. **FormFieldScanner**：表单字段识别和扫描
2. **APIManager**：后端API调用管理
3. **StorageManager**：本地数据存储管理
4. **SiteAdapter**：特定网站适配逻辑

### 开发调试

1. **查看console日志**
   ```bash
   # 在招聘网站页面
   F12 -> Console -> 查看content script日志

   # 在插件popup页面
   右键插件图标 -> 检查弹出式窗口 -> Console

   # 在后台脚本
   chrome://extensions/ -> 服务工作进程 -> 检查
   ```

2. **重载扩展程序**
   - 修改代码后在 `chrome://extensions/` 页面点击重新加载

### API接口说明

插件与后端通过以下主要接口通信：

```javascript
// 用户认证
POST /api/auth/login
POST /api/auth/register

// 简历管理
GET /api/resume
PUT /api/resume

// 字段匹配（核心功能）
POST /api/match-fields

// 激活码管理
POST /api/activation/activate
GET /api/activation/usage
```

## 常见问题

### Q: 插件在某些网站无法正常工作？

A: 可能是网站使用了特殊的表单框架。可以在 `inject.js` 中添加特定网站的适配逻辑。

### Q: 字段匹配不准确怎么办？

A: AI匹配准确性依赖于：
1. 简历信息的完整性
2. 字段标签的清晰度
3. 后端AI模型的优化

### Q: 如何添加新的招聘网站支持？

A: 1. 在 `manifest.json` 中添加网站域名到 `content_scripts.matches`
2. 在 `background.js` 中的 `supportedSites` 数组添加域名
3. 如需特殊处理，在 `inject.js` 中添加适配逻辑

## 许可证

本项目采用 MIT 许可证，详情请查看 LICENSE 文件。

## 支持与反馈

如果您在使用过程中遇到问题或有改进建议，请通过以下方式联系我们：

- 提交Issue
- 发送邮件
- 在线客服

---

**注意**：本插件仅用于合法的求职活动，请遵守各招聘网站的使用条款。
