export interface ApiResponseType<T> {
  message: string;
  data: T;
  error?: {
    message: string;
    code: number;
  };
}
