import BaseApiService from "@/services/BaseApiService";
import type { TagInput, TagListRowDTO, TagRowDTO } from "@/services/types";

export default class TagService extends BaseApiService {
  constructor() {
    super("tags");
  }

  list(): Promise<TagListRowDTO[]> {
    return this.getAll<TagListRowDTO>();
  }

  save(data: TagInput): Promise<TagRowDTO> {
    return this.create<TagInput, TagRowDTO>(data);
  }

  edit(id: string, data: TagInput): Promise<TagRowDTO> {
    return this.update<TagInput, TagRowDTO>(id, data);
  }
}
