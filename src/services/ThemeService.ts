import BaseApiService from "@/services/BaseApiService";
import { toApiError } from "@/services/ApiError";
import type { ThemeInput, ThemeRowDTO } from "@/services/types";

export default class ThemeService extends BaseApiService {
  constructor() {
    super("themes");
  }

  list(): Promise<ThemeRowDTO[]> {
    return this.getAll<ThemeRowDTO>();
  }

  get(id: string): Promise<ThemeRowDTO> {
    return this.getById<ThemeRowDTO>(id);
  }

  save(data: ThemeInput): Promise<ThemeRowDTO> {
    return this.create<ThemeInput, ThemeRowDTO>(data);
  }

  edit(id: string, data: ThemeInput): Promise<ThemeRowDTO> {
    return this.update<ThemeInput, ThemeRowDTO>(id, data);
  }

  async activate(id: string): Promise<void> {
    try {
      await this.api.post(`${this.endpoint}/${encodeURIComponent(id)}/activate`);
    } catch (err) {
      throw toApiError(err);
    }
  }

  async useDefault(): Promise<void> {
    try {
      await this.api.delete(`${this.endpoint}/active`);
    } catch (err) {
      throw toApiError(err);
    }
  }
}
