import BaseApiService from "@/services/BaseApiService";
import type { ProjectInput, ProjectRowDTO } from "@/services/types";

export default class ProjectService extends BaseApiService {
  constructor() {
    super("projects");
  }

  list(): Promise<ProjectRowDTO[]> {
    return this.getAll<ProjectRowDTO>();
  }

  get(id: string): Promise<ProjectRowDTO> {
    return this.getById<ProjectRowDTO>(id);
  }

  save(data: ProjectInput): Promise<ProjectRowDTO> {
    return this.create<ProjectInput, ProjectRowDTO>(data);
  }

  edit(id: string, data: ProjectInput): Promise<ProjectRowDTO> {
    return this.update<ProjectInput, ProjectRowDTO>(id, data);
  }
}
