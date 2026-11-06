# 01: 项目基础骨架与核心领域校验接缝 (Project Foundation & Domain Verification Seam)

**What to build:** 初始化可运行的 Next.js 15 (App Router) + TypeScript + Tailwind CSS + Shadcn UI 项目工程，配置 Vitest 单元测试运行环境；实现核心业务领域的第一测试接缝（Domain Verification Seam）纯函数，用于处理“E伟捷”的绑扎数据计算与逻辑校验（包含过滤实际有作业量的箱型、计算 $\sum \text{单箱台数} \times \text{绑扎箱数}$、比对车装总台数一致性）。

**Blocked by:** None (can start immediately)

**Status:** resolved

## Acceptance Criteria

- [x] Next.js 15 工程能够成功执行构建和测试（`pnpm build` / `npm run test`）
- [x] Tailwind CSS 与 Shadcn UI 基础配置就绪
- [x] 实现 `verifyLashingData` 纯函数模块，根据领域模型校验数据并输出结构化校验报告
- [x] 针对伟捷典型作业数据（48FR: 28箱 × 3台, 40FM: 26箱 × 3台，总计 162 台）的自动化单元测试完全通过
- [x] 针对不一致数据（如计算总和与表头车台数不匹配）的断言测试能够正确返回异常标记
