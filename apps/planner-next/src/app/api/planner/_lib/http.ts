import { NextResponse } from 'next/server';
import { apiErrorSchema, type ApiError } from '@andamanbazaar/planner-shared';

export function jsonError(status: number, code: string, message: string) {
  const payload: ApiError = { apiVersion: 'v1', error: { code, message } };
  apiErrorSchema.parse(payload);
  return NextResponse.json(payload, { status });
}

