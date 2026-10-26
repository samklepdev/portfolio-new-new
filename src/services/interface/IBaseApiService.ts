export default interface IBaseApiService {
  getAll<T>(): Promise<T[]>;
  getById<T>(id: string): Promise<T>;
  create<TIn, TOut = TIn>(data: TIn): Promise<TOut>;
  update<TIn, TOut = TIn>(id: string, data: TIn): Promise<TOut>;
  delete(id: string): Promise<void>;
}
