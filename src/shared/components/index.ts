// src/shared/components/index.ts
/**
 * Shared Components Public Exports
 *
 * 约定：
 * - 业务页面 / features 层 **只从这个入口引入 shared 组件**
 *   不允许直接 deep import 到具体文件（例如 shared/components/table/useTableQuery）
 * - 好处：
 *   1) 目录结构未来可调整，不影响调用方
 *   2) shared 层边界清晰，避免“到处乱引”
 *
 * 当前包含：
 * - table：通用表格体系（UI + hooks + utils）
 * - guard：权限相关基础组件
 */

// table domain
export * from "./table";
