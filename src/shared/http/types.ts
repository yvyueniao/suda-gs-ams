export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
}
