# 02: Qwen 视觉多模态结构化提取端点与端到端接口 (Qwen Vision Structured Extraction API)

**What to build:** 建立服务端 `/api/chat` 处理端点，接入 Vercel AI SDK 与 OpenAI 兼容协议（对齐阿里云百炼 / Qwen 模型网关）；通过严格定义的 Zod Schema 与 Prompt，实现传入图片时专属提取“E伟捷”的作业明细（日期、船名航次、箱型代码、箱型名称、单箱台数、绑扎箱数、合计台数、各队人数及队长签名），并支持前端传递动态 API Key、Base URL 及模型名称（默认 `qwen3-vl-plus`，可选 `qwen-vl-ocr` 等）。

**Blocked by:** 01: 项目基础骨架与核心领域校验接缝

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] `/api/chat` 接口支持接收包含图片（Base64 Data URL）的消息负载及用户自定义请求头配置（API Key、Base URL、Model）
- [ ] 使用 Zod Schema 强类型约束输出结果，过滤非伟捷队伍，只保留伟捷参与绑扎的有效箱型
- [ ] 对接用户上传的真实测试图片样例（`ca7321cf10ff8408bf7937f243e78cad.jpg`）能够成功解析出完整结构化数据
- [ ] 解析结果自动透传至 `verifyLashingData` 完成一致性校验并附带校验结果字段返回
