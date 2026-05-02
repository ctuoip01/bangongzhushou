/**
 * 统一 API 错误响应工具
 *
 * 所有 API 路由应使用此模块返回错误，保证格式一致。
 * 格式：{ error: string, detail?: string }
 */

import { NextResponse } from 'next/server';

export interface ApiErrorBody {
  error: string;
  detail?: string;
}

/**
 * 返回标准化的 API 错误响应
 */
export function apiError(message: string, status = 500, detail?: string): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: message };
  if (detail) body.detail = detail;

  return NextResponse.json(body, { status });
}

/**
 * 返回标准化的成功 JSON 响应
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}
