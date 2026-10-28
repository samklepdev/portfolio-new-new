---
title: Base API Service Singleton
excerpt: A singleton service for making API calls to a base URL with optional authentication.
publishedAt: '2021-10-25'
tags:
  - Typescript
  - API
  - Singleton
status: 'draft'
---

## Calling APIs With a Singleton Service

Back a many of full-moons ago, I was working early in my professional career, with a team, and on a project that had a lot of API calls to a base URL. The project was a React/Redux application with a DotNET/MongoDB backend.

Admittedly, I was a junior developer at the time, and I was still learning the ropes of professional software development. One of the things I learned was that it was important to avoid repeating code, especially when it came to making API calls and working with other developers.

In a modern TypeScript/React project, you often need to make API calls to a base URL, sometimes with authentication tokens. To avoid repeating the same code for each API call, you can create a singleton service that handles the base URL and optional authentication and then extend it for specific API endpoints and services.

This was a common piece of code to implement. To start the process, first create an interface for the API service that defines the methods you want to expose. For example:

```typescript
interface IBaseApiService {
    get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
    post<T>(endpoint: string, data: unknown): Promise<T>;
    put<T>(endpoint: string, data: unknown): Promise<T>;
    delete<T>(endpoint: string): Promise<T>;
}
```

From here, you can create a singleton class that implements this interface. The class will have a private constructor and a static method to get the instance of the service. It will also handle the base URL and optional authentication token.

> **Singleton Pattern**: A singleton is a design pattern that restricts the instantiation of a class to one "single" instance. This is useful when exactly one object is needed to coordinate actions across the system.

```typescript
import axios, {
    type AxiosInstance,
    type AxiosRequestConfig,
} from 'axios';

class BaseApiService implements IBaseApiService {
    private static instance: BaseApiService | undefined;
    private readonly api: AxiosInstance;

    private constructor(baseUrl: string, authToken?: string) {
        this.api = axios.create({
            baseURL: baseUrl,
            headers: {
                Accept: 'application/json',
                ...(authToken
                    ? { Authorization: `Bearer ${authToken}` }
                    : {}),
            },
        });
    }

    static getInstance(baseUrl: string, authToken?: string): BaseApiService {
        if (!BaseApiService.instance) {
            BaseApiService.instance = new BaseApiService(baseUrl, authToken);
        }
        return BaseApiService.instance;
    }

    private buildConfig(
        endpoint: string,
        method: NonNullable<AxiosRequestConfig['method']>,
        data?: unknown,
        params?: Record<string, unknown>,
    ): AxiosRequestConfig {
        return {
            url: endpoint,
            method,
            ...(data !== undefined ? { data } : {}),
            ...(params !== undefined ? { params } : {}),
        };
    }

    private async request<T>(config: AxiosRequestConfig): Promise<T> {
        const response = await this.api.request<T>(config);
        return response.data;
    }

    get<T>(
        endpoint: string,
        params?: Record<string, unknown>,
    ): Promise<T> {
        return this.request<T>(
            this.buildConfig(endpoint, 'get', undefined, params),
        );
    }

    post<T>(endpoint: string, data: unknown): Promise<T> {
        return this.request<T>(this.buildConfig(endpoint, 'post', data));
    }

    put<T>(endpoint: string, data: unknown): Promise<T> {
        return this.request<T>(this.buildConfig(endpoint, 'put', data));
    }

    delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(this.buildConfig(endpoint, 'delete'));
    }
}
```

Axios serializes JSON request bodies and parses JSON responses automatically. It also rejects responses with non-2xx status codes, so request errors can be handled by the caller.

This `BaseApiService` class can now be used throughout your application to make API calls in a consistent way. You can extend this class for specific API endpoints and services, and you can also add additional methods as needed. You can instantiate the singleton like this:

```typescript
const apiService = BaseApiService.getInstance('https://api.example.com');
```

This initial setup provides a solid foundation for making API calls in a TypeScript/React project, ensuring that your code is clean, maintainable, and consistent.