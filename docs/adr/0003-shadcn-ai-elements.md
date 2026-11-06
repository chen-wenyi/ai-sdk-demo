# 界面与 AI 交互优先采用 shadcn AI Elements 体系 (Prioritizing shadcn AI Elements)

## Context
用户明确要求：凡是涉及到 AI 交互组件（输入框、消息流、附件上传、工具调用、模型选择等），优先使用 shadcn 的 AI Elements 模式与 shadcn/ui 组件规范（参考 https://ui.shadcn.com/docs/ai-elements）。

## Decision
1. **AI Elements 模式落地**：
   - **Prompt Input & Attachment**：用于带有图片附件（支持图片预览、拖拽粘贴、移除）的提示词输入框与发送按钮；
   - **Chat & Message (with Message Scroller)**：结构化聊天气泡流，区分 User 与 Assistant 轮次；
   - **Model Selector**：顶部切换或自定义 Qwen 模型（`qwen3-vl-plus`、`qwen-vl-ocr` 等）；
   - **Tool / Structured Output Artifact**：提取结果作为嵌入式结构化表格卡片呈现；
   - **Confirmation / HITL**：用于人工校验与就地修正确认。
2. **Shadcn UI 基础组件**：`Table`, `Card`, `Badge`, `Button`, `Input`, `Dialog`, `Tooltip` 等。

## Consequences
- 代码风格与 shadcn 官方规范高度一致，具备现代感和极高的扩展性。
- 组件所有权在本地代码库，无黑盒依赖，支持完全定制。
