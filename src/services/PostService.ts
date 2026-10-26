import BaseApiService from "@/services/BaseApiService";
import type { PostInput, PostRowDTO } from "@/services/types";

export default class PostService extends BaseApiService {
  constructor() {
    super("posts");
  }

  list(): Promise<PostRowDTO[]> {
    return this.getAll<PostRowDTO>();
  }

  get(id: string): Promise<PostRowDTO> {
    return this.getById<PostRowDTO>(id);
  }

  save(data: PostInput): Promise<PostRowDTO> {
    return this.create<PostInput, PostRowDTO>(data);
  }

  edit(id: string, data: PostInput): Promise<PostRowDTO> {
    return this.update<PostInput, PostRowDTO>(id, data);
  }
}
