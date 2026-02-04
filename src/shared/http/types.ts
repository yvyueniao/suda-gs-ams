// src/shared/http/types.ts
/**
 * HTTP Common Types
 *
 * 说明：
 * - ApiResponse<T>：与你们后端约定的“统一返回壳”
 * - ListResult<T>：前端内部统一使用的“列表结果模型”
 *
 * 设计原则：
 * - ApiResponse<T> 只描述“后端长什么样”
 * - ListResult<T> 只描述“前端最终想要什么样”
 * - 两者之间的转换，**只允许**发生在 listAdapter.ts
 */

/** 后端统一响应壳 */
export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
}

/**
 * 前端统一的列表返回结构
 * - table 体系 / hooks / pages 全部只认这个结构
 * - 不关心后端字段叫 list / records / rows
 */
export type ListResult<T> = {
  list: T[];
  total: number;
};
