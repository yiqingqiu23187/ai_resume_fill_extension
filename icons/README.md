# 图标文件

请将以下尺寸的图标文件放置在此目录中：

- `icon-16.png` - 16x16px，用于扩展工具栏
- `icon-32.png` - 32x32px，用于扩展管理页面
- `icon-48.png` - 48x48px，用于扩展详情页面
- `icon-128.png` - 128x128px，用于Chrome Web Store

## 图标设计要求

- 背景透明的PNG格式
- 使用AI/机器人元素
- 颜色主题：#667eea 到 #764ba2 渐变
- 简洁现代的设计风格

## 临时解决方案

如果暂时没有图标文件，可以创建简单的纯色PNG文件作为占位符：

```bash
# 创建临时图标文件（需要ImageMagick）
convert -size 16x16 xc:'#667eea' icon-16.png
convert -size 32x32 xc:'#667eea' icon-32.png
convert -size 48x48 xc:'#667eea' icon-48.png
convert -size 128x128 xc:'#667eea' icon-128.png
