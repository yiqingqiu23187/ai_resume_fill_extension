/**
 * AI Resume Fill - Content Script
 * 
 * [PENDING REWRITE]
 * 此文件已重置，准备进行基于 "Visual + Topology" 策略的完全重写。
 * 目标：移除所有基于文本关键词的硬编码，采用通用的 DOM 结构和视觉分析算法。
 */

// 保持基础的消息监听，防止扩展报错
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan_page") {
    console.log("🚀 AI Resume Fill: 接收到扫描请求 (逻辑待实现)");
    
    // 返回空数据，直到新逻辑实现
    sendResponse({ 
      success: false, 
      message: "Scanner logic is being rewritten",
      data: [] 
    });
  }
  return true;
});
