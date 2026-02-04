// src/shared/components/table/types.ts
/**
 * Table Domain Types (Front-end only)
 *
 * 目标：
 * - 定义“前端内部统一”的表格查询/返回模型
 * - 不掺杂任何后端字段名与后端响应壳（那些放到 shared/http/listAdapter.ts）
 *
 * 说明：
 * - filters 设计为泛型 F：不同业务页面可以定义自己的过滤条件结构
 * - sorter 设计为“字段 + 顺序”，字段类型用 string（避免和具体数据模型强耦合）
 */

/** 排序方向 */
export type TableSortOrder = "ascend" | "descend" | null;

/** 排序信息（前端内部统一表达） */
export type TableSorter = {
  /** 排序字段名（通常对齐列 dataIndex 或后端字段名；对齐逻辑放 adapter） */
  field?: string;
  /** asc/desc */
  order: TableSortOrder;
};

/** 分页状态 */
export type TablePageState = {
  page: number; // 1-based
  pageSize: number;
};

/**
 * 前端内部统一的表格查询模型
 * - F 是业务自定义 filters 类型（例如 { status?: string; deptId?: string; ... }）
 */
export type TableQuery<F extends Record<string, any> = Record<string, any>> = {
  page: number; // 1-based
  pageSize: number;

  /** 模糊搜索关键字（可选） */
  keyword?: string;

  /** 业务过滤条件（可选） */
  filters?: Partial<F>;

  /** 排序（可选） */
  sorter?: TableSorter;
};

/**
 * 前端内部统一的列表返回模型
 * 注意：这是“前端期望的最终形态”，后端返回不一致由 adapter 负责转换
 */
export type ListResult<T> = {
  list: T[];
  total: number;
};

/**
 * 表格数据获取函数（由业务侧提供）
 * - 输入：TableQuery（前端统一）
 * - 输出：ListResult（前端统一）
 */
export type TableFetcher<
  T,
  F extends Record<string, any> = Record<string, any>,
> = (query: TableQuery<F>) => Promise<ListResult<T>>;

/**
 * 对 antd columns 的“轻增强”配置（不做 DSL，只加常用能力）
 * - 这些字段不会影响 Table 组件本身渲染逻辑（未来由 SmartTable/Toolbar 使用）
 */
export type TableColumnPreset<T extends object = any> = {
  /** 列唯一 key（建议稳定） */
  key: string;

  /** 对齐 antd 的 dataIndex（可选） */
  dataIndex?: string | string[];

  /** 表头 */
  title: string;

  /** 宽度（可选，用于列设置/持久化/布局） */
  width?: number;

  /** 默认是否隐藏（可选） */
  hidden?: boolean;

  /**
   * 权限标记（可选）
   * - 例如 "activity:edit" / "rbac:user:delete"
   * - 具体权限判定由 <Can /> 或业务侧处理
   */
  perm?: string;

  /**
   * 导出字段名（可选）
   * - 后续做导出时可用（不必现在实现）
   */
  exportName?: string;

  /**
   * 渲染函数（可选）
   * - 这里先不绑定 antd Render 类型，避免引入 antd 类型依赖过深
   */
  render?: (value: any, record: T, index: number) => unknown;
};
