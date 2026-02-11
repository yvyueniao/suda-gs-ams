// src/shared/actions/types.ts

type Key = string | number;

/**
 * 单个异步动作配置
 *
 * T = 成功时返回的数据类型
 */
export type AsyncActionOptions<T> = {
  /**
   * 成功提示
   * - string：固定文案
   * - function：根据返回值生成文案
   * - 不传：不自动提示
   */
  successMessage?: string | ((res: T) => string | void);

  /**
   * 失败兜底提示
   * - ApiError 优先使用 err.message
   */
  errorMessage?: string;

  /**
   * 成功回调
   * - 返回 false 可阻止默认 successMessage
   */
  onSuccess?: (res: T) => void | boolean | Promise<void | boolean>;

  /**
   * 错误回调
   * - 返回 true 表示“已处理”，不再自动 message
   */
  onError?: (err: unknown) => void | boolean | Promise<void | boolean>;

  /**
   * 是否防止并发（默认 true）
   * - true：按钮连点只触发一次
   */
  preventConcurrent?: boolean;

  /**
   * 是否对 UNAUTHORIZED（401）静默（默认 true）
   * - 因为 http 层已经处理 401（清会话 + 跳登录）
   */
  silentUnauthorized?: boolean;
};

/**
 * Map（按 key）动作配置
 *
 * K = key 类型（rowKey）
 * T = 成功时返回的数据类型
 */
export type AsyncMapActionOptions<K extends Key, T> = {
  /**
   * 成功提示（可选）
   * - 固定字符串
   * - 或根据 key/result 动态生成
   */
  successMessage?: string | ((key: K, result: T) => string | void);

  /**
   * 失败兜底提示（可选）
   * - 不传：默认 "操作失败，请重试"
   * - 也可根据 key 动态生成
   */
  errorMessage?: string | ((key: K) => string);

  /**
   * 自定义错误处理：
   * - 返回 true 代表“错误已处理”，不再自动 toast
   */
  onError?: (key: K, err: unknown) => boolean | void | Promise<boolean | void>;

  /**
   * 成功回调（可选）
   */
  onSuccess?: (key: K, result: T) => void | Promise<void>;

  /**
   * 是否在“同一个 key”运行中忽略重复触发（默认 true）
   */
  preventConcurrentPerKey?: boolean;

  /**
   * 是否对 UNAUTHORIZED（401）错误静默（默认 true）
   */
  silentUnauthorized?: boolean;
};

/**
 * Map 动作返回结构
 */
export type AsyncMapActionReturn<K extends Key = Key, T = unknown> = {
  anyLoading: boolean;
  isLoading: (key: K) => boolean;
  run: (key: K, fn: () => Promise<T>) => Promise<T | undefined>;
  clear: (key: K) => void;
  clearAll: () => void;
};

/**
 * 批量动作配置
 *
 * Item = 批量 items 的单项类型（例如 number / string）
 * Result = 接口成功返回类型
 */
export type AsyncBatchActionOptions<Item, Result> = {
  /**
   * 空选校验（默认 true）
   */
  requireSelection?: boolean;

  /**
   * 空选提示文案（默认 "请先选择要操作的数据"）
   */
  emptySelectionMessage?: string;

  /**
   * 成功提示（可选）
   */
  successMessage?:
    | string
    | ((items: readonly Item[], result: Result) => string | void);

  /**
   * 失败兜底提示（可选）
   */
  errorMessage?: string;

  /**
   * 自定义错误处理
   * - 返回 true：错误已处理，不再自动 toast
   */
  onError?: (err: unknown) => boolean | void | Promise<boolean | void>;

  /**
   * 成功回调（可选）
   */
  onSuccess?: (items: readonly Item[], result: Result) => void | Promise<void>;

  /**
   * 是否忽略运行中重复触发（默认 true）
   */
  preventConcurrent?: boolean;

  /**
   * 是否对 UNAUTHORIZED（401）错误静默（默认 true）
   */
  silentUnauthorized?: boolean;
};

/**
 * 批量动作返回结构
 */
export type AsyncBatchActionResult<Item, Result> = {
  loading: boolean;
  runBatch: (
    items: readonly Item[],
    fn: (items: readonly Item[]) => Promise<Result>,
  ) => Promise<Result | undefined>;
};

/**
 * 批量操作结果（用于你们业务侧统计）
 */
export type BatchResult = {
  successCount: number;
  failCount: number;
  errors: unknown[];
};
