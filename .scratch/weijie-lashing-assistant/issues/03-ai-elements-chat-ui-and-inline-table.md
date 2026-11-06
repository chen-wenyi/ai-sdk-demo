# 03: Shadcn AI Elements 聊天流与内嵌横向表格呈现 (AI Elements Chat UI & Inline Table)

**What to build:** 遵循 shadcn AI Elements 规范打造专业智能助手界面，集成支持图片拖拽/粘贴/上传与缩略图预览的 Prompt Input、Message 消息流以及顶部配置抽屉/浮层；在 Assistant 消息气泡中以 Shadcn UI Table 横向转置展示作业明细表格（第1行箱型代码、第2行箱型名称、第3行单箱台数、第4行绑扎箱数），并在卡片顶部显示日期和船期，卡片底部展示总合计与手写队长签名识别结果。

**Blocked by:** 02: Qwen 视觉多模态结构化提取端点与端到端接口

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] 聊天输入框基于 shadcn AI Elements 的 Prompt Input 和 Attachment 模式，支持图片拖拽选择、剪贴板粘贴与删除
- [ ] 顶部导航栏具备 Model Selector 与配置弹窗，允许用户配置 API Key、Base URL 与 Model Name，并安全保存在浏览器本地
- [ ] 助手回复在聊天消息流内直接展示卡片化横向转置表格，表头表体紧凑整齐，支持水平横向滑动
- [ ] 卡片顶部清晰呈现“11月2日 | 中远海运欧亚航 V27”，底部呈现合计箱数（54）、绑扎车装台数（162）、作业人数（20）与队长签名（李春河）
