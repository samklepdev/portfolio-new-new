import { afterEach, describe, expect, it, vi } from "vitest";
import BaseApiService from "./BaseApiService";
import { ApiError } from "./ApiError";

// Mock axios.create to return a controllable fake client.
const client = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => client),
    isAxiosError: (e: unknown): boolean =>
      typeof e === "object" && e !== null && (e as { isAxiosError?: boolean }).isAxiosError === true,
  },
}));

function axiosError(status: number, errorBody: unknown) {
  return { isAxiosError: true, message: `Request failed with status code ${status}`, response: { status, data: errorBody } };
}

describe("BaseApiService", () => {
  afterEach(() => vi.clearAllMocks());

  it("getAll resolves the response data from the bound endpoint", async () => {
    client.get.mockResolvedValue({ data: [{ id: 1 }] });
    const svc = new BaseApiService("projects");
    await expect(svc.getAll()).resolves.toEqual([{ id: 1 }]);
    expect(client.get).toHaveBeenCalledWith("projects");
  });

  it("getById fetches endpoint/id", async () => {
    client.get.mockResolvedValue({ data: { id: 7 } });
    const svc = new BaseApiService("posts");
    await expect(svc.getById("7")).resolves.toEqual({ id: 7 });
    expect(client.get).toHaveBeenCalledWith("posts/7");
  });

  it("update encodes the id", async () => {
    client.put.mockResolvedValue({ data: { ok: true } });
    const svc = new BaseApiService("tags");
    await svc.update("a b/c", { name: "x" });
    expect(client.put).toHaveBeenCalledWith("tags/a%20b%2Fc", { name: "x" });
  });

  it("delete encodes the id (consistency fix)", async () => {
    client.delete.mockResolvedValue({ data: null });
    const svc = new BaseApiService("tags");
    await svc.delete("a b/c");
    expect(client.delete).toHaveBeenCalledWith("tags/a%20b%2Fc");
  });

  it("normalizes a non-2xx response into a typed ApiError with the server message", async () => {
    client.get.mockRejectedValue(axiosError(401, { error: "Unauthorized" }));
    const svc = new BaseApiService("projects");
    await expect(svc.getAll()).rejects.toMatchObject({ status: 401, message: "Unauthorized", name: "ApiError" });
    await expect(svc.getAll()).rejects.toBeInstanceOf(ApiError);
  });

  it("falls back to the axios message when the body has no error field", async () => {
    client.get.mockRejectedValue(axiosError(500, {}));
    const svc = new BaseApiService("projects");
    await expect(svc.getById("1")).rejects.toMatchObject({ status: 500 });
  });
});
