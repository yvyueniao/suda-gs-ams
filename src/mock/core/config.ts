export type MockConfig = {
  enabled: boolean;
  delayMs: { min: number; max: number };
  failRate: number; // 0~1：请求直接失败的概率
  emptyRate: number; // 0~1：成功但 data 为空的概率
};

export const mockConfig: MockConfig = {
  enabled: true,
  delayMs: { min: 50, max: 300 },
  failRate: 0.05,
  emptyRate: 0.03,
};

// 可选：让你在控制台/脚本里动态改（临时调试很爽）
export function setMockConfig(patch: Partial<MockConfig>) {
  Object.assign(mockConfig, patch);
}
