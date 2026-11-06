# Feature Spec: 伟捷绑扎作业智能识别助手 (Weijie Lashing Assistant)

Status: ready-for-agent
Date: 2026-11-06

## Problem Statement

港口现场作业中，每天各绑扎队的作业数量统计依赖纸质手写流转表格（《每天各绑扎队作业数量统计表》）。表格中包含多层级复合表头（国际标准集装箱箱型代码、中文分类名称、单箱折算台数系数）、多支作业队伍的绑扎数据、合计与车装总台数以及队长手写签名。

对于“伟捷”绑扎队的管理与核算人员而言，人工肉眼查找“伟捷”所在行、逐列挑出有作业量的箱型、核对折算台数并录入系统极为繁琐费时，且极易因手写体混淆或多列对齐偏差导致计算错误。

## Solution

构建一个基于 Next.js 与 Vercel AI SDK 的现代化 AI 视觉识别与交互校对助手。用户在聊天框中上传统计表图片，系统通过 Qwen 视觉多模态大模型（`qwen3-vl-plus`）专属识别“E伟捷”行的作业数据，并通过严格的结构化 JSON 规范（Zod Schema）输出。

在聊天气泡中直接渲染紧凑的横向作业明细表格（箱型代码、箱型名称、单箱台数、绑扎箱数），并显示日期、船名航次、作业人数与队长签名。同时引入 Human-in-the-Loop（人机协同校对）机制，内置自动公式校验（$\sum \text{单箱台数} \times \text{绑扎箱数} = \text{绑扎车装台数}$），支持现场人员就地行内修改并一键确认入账。

## User Stories

1. As a 码头统计人员, I want to 在聊天输入框中上传或粘贴每日绑扎统计表图片, so that 我无需手动抄录整张复杂的纸质单据。
2. As a 伟捷绑扎队管理员, I want to 让 AI 专属定位并提取“E伟捷”队伍的数据, so that 我能直接过滤无关队伍干扰，秒级获取本队作业成果。
3. As a 统计人员, I want to 在聊天框内部直接看到横向转置的绑扎数据表格（包含箱型代码、箱型名称、单箱台数、绑扎箱数）, so that 表格结构紧凑易读，完全符合行业核算习惯。
4. As a 统计人员, I want to 在表格卡片顶部看到日期与船名航次, so that 我能清晰核实该单据对应的航次背景。
5. As a 统计人员, I want to 在表格卡片底部看到合计箱数、绑扎车装台数、作业人数以及手写队长签名, so that 责任人与总工作量一目了然。
6. As a 业务核算人员, I want to 系统能够自动计算并校验“单箱台数 × 绑扎箱数”总和是否与表格中的车装总台数一致, so that 任何算术偏差或大模型误识别都能被第一时间标出。
7. As a 业务核算人员, I want to 在发现识别微瑕时，能够直接在聊天表格中点击“编辑修正”并修改数值, so that 我无需跳转离开或重新上传即可纠偏。
8. As a 业务核算人员, I want to 在核对无误后点击“确认无误”, so that 该条作业数据被标记为终态核实，并能够一键复制为标准 JSON 格式。
9. As a 系统使用者, I want to 在顶部设置面板中配置我的 Qwen API Key，并能在 `qwen3-vl-plus`、`qwen-vl-ocr` 之间切换或指定自定义端点, so that 适配不同的模型平台账户。
10. As a 开发者与设计受众, I want to 界面所有 AI 交互元素严格遵循 shadcn AI Elements 体系, so that 用户获得一流、精致且原生的交互质感。

## Implementation Decisions

### 模块结构与划分
- **AI 视觉与结构化提取服务**：封装对 DashScope OpenAI 兼容接口（调用多模态模型如 `qwen3-vl-plus`）的流式/对象生成调用，结合 Zod Schema 强类型约束提取目标行及元数据。
- **数据一致性验证引擎**：独立纯函数模块，执行 $\sum (\text{unitCapacity} \times \text{boxCount})$ 与上报车装总台数的校验比对，输出布尔值及校验说明。
- **对话与消息控制器**：基于 Vercel AI SDK 建立流式对话流，将提取结果包装为标准结构化消息部件。
- **聊天框表格与 HITL 组件**：采用 shadcn/ui Table、Card、Button、Badge 与 Input 构建，支持只读展示态与行内编辑态切换。
- **设置管理模块**：客户端存储（LocalStorage / React Context）保存用户自备的 API Key、Base URL 及 Model Name，随请求 Headers 传递。

### 结构化数据 Schema 协议
```typescript
interface LashingItem {
  code: string;         // 箱型代码，如 "48FR", "40FM"
  type: string;         // 箱型分类名称，如 "框架箱", "斜架箱/框架"
  unitCapacity: number; // 单箱台数基准系数，如 3
  boxCount: number;     // 伟捷本队实际绑扎箱数，如 28, 26
}

interface WeijieLashingReport {
  teamName: string;            // 专属目标 "E伟捷"
  date: string;                // 日期，如 "11月2日"
  voyage: string;              // 船名航次，如 "中远海运欧亚航 V27"
  items: LashingItem[];        // 实际有绑扎作业的箱型列表
  totalBoxes: number;          // 合计箱数，如 54
  totalVehicleUnits: number;   // 绑扎车装台数，如 162
  workerCount: number;         // 各队作业人数，如 20
  leaderSignature: string;     // 队长签名识别结果，如 "李春河"
  calculatedVehicleUnits: number; // 校验算力值 = sum(unitCapacity * boxCount)
  isValid: boolean;            // calculatedVehicleUnits === totalVehicleUnits
}
```

### 交互决策
- 输入框支持拖拽、粘贴与点击上传图片，图片转换为 Data URL 随消息提交。
- 聊天卡片中横向展示 4 行数据：第 1 行代码、第 2 行名称、第 3 行台数、第 4 行绑扎数。
- 就地编辑态允许修改任意箱型的数量与系数，编辑保存时动态重算 `calculatedVehicleUnits` 并更新状态。

## Testing Decisions

### 核心测试接缝 (Highest Testing Seams)
为了保障代码健壮性且不耦合内部实现细节，本功能设计 **2 个高阶测试接缝**：

1. **Seam 1: 业务计算与校验服务接缝 (Domain Verification Seam)**
   - **测试目标**：测试数据验证纯函数。
   - **验证行为**：输入 AI 解析产生的原始 JSON 数据，验证是否能准确过滤出绑扎箱数 > 0 的项、正确计算理论车装台数总和、并在有偏差时正确触发警告标志。

2. **Seam 2: 交互式表格与人工核验组件接缝 (In-Chat Table & HITL Component Seam)**
   - **测试目标**：测试 `WeijieLashingCard` 组件在用户交互下的外部表现。
   - **验证行为**：
     - 给定初始报告数据，断言横向表格正确渲染 48FR (28箱)、40FM (26箱)、队长签名“李春河”与绿色“校验通过”徽标。
     - 模拟点击“编辑修正”按钮，将 28 修改为 30，点击“确认保存”，断言触发重新计算（$30\times 3 + 26\times 3 = 168$），并在卡片上反映更新状态。

## Out of Scope

- 识别除“伟捷”以外的其他施工队（A同兴、F杰兴、H中凌）— 本功能专属锁定“伟捷”。
- 云端第三方图片存储服务（OSS/S3/Cos）— 使用本地内存 Base64 流转即可。
- 复杂的后端数据库持久化（MySQL/PostgreSQL）— 本 Demo 以交互核验与客户端导出为主。

## Further Notes

- 当使用 `qwen3-vl-plus` 时，如果用户未填自定义 Base URL，系统默认采用阿里云 DashScope OpenAI 兼容接口地址。
- 界面风格全面采用 Shadcn 极简现代灰黑/白风格，适配深浅色模式。
