import axios, { type AxiosInstance } from "axios";
import IBaseApiService from "@/services/interface/IBaseApiService";
import { toApiError } from "@/services/ApiError";

/**
 * Same-origin client for the admin API. The base URL is relative so the
 * httpOnly `admin_session` cookie is sent automatically; the service layer
 * never reads or attaches the token. Each subclass binds one endpoint.
 */
export default class BaseApiService implements IBaseApiService {
  protected readonly api: AxiosInstance = axios.create({
    baseURL: "/api/admin",
    headers: { Accept: "application/json" },
  });

  constructor(protected readonly endpoint: string) {}

  private async run<T>(call: () => Promise<{ data: T }>): Promise<T> {
    try {
      return (await call()).data;
    } catch (err) {
      throw toApiError(err);
    }
  }

  getAll<T>(): Promise<T[]> {
    return this.run<T[]>(() => this.api.get<T[]>(this.endpoint));
  }

  getById<T>(id: string): Promise<T> {
    return this.run<T>(() => this.api.get<T>(`${this.endpoint}/${encodeURIComponent(id)}`));
  }

  create<TIn, TOut = TIn>(data: TIn): Promise<TOut> {
    return this.run<TOut>(() => this.api.post<TOut>(this.endpoint, data));
  }

  update<TIn, TOut = TIn>(id: string, data: TIn): Promise<TOut> {
    return this.run<TOut>(() =>
      this.api.put<TOut>(`${this.endpoint}/${encodeURIComponent(id)}`, data),
    );
  }

  async delete(id: string): Promise<void> {
    await this.run(() => this.api.delete(`${this.endpoint}/${encodeURIComponent(id)}`));
  }
}
