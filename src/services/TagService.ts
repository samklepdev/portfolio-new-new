import BaseApiService from "@/services/BaseApiService";
import type { TagInput, TagRowDTO } from "@/services/types";

export default class TagService extends BaseApiService {
  constructor() {
    super("tags");
  }

  list(): Promise<TagRowDTO[]> {
    return this.getAll<TagRowDTO>();
  }

  save(data: TagInput): Promise<TagRowDTO> {
    return this.create<TagInput, TagRowDTO>(data);
  }

  edit(id: string, data: TagInput): Promise<TagRowDTO> {
    return this.update<TagInput, TagRowDTO>(id, data);
  }
}
