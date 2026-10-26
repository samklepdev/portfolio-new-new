import BaseApiService from "@/services/BaseApiService";
import type { SubmissionRowDTO } from "@/services/types";

export default class SubmissionService extends BaseApiService {
  constructor() {
    super("submissions");
  }

  list(): Promise<SubmissionRowDTO[]> {
    return this.getAll<SubmissionRowDTO>();
  }

  get(id: string): Promise<SubmissionRowDTO> {
    return this.getById<SubmissionRowDTO>(id);
  }
}
