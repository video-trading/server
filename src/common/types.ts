export interface Pagination<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
