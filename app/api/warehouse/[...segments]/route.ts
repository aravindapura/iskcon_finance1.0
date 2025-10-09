import { NextRequest } from 'next/server';

import { handleWarehouseRequest } from '@/src/server/routes/warehouse';

type Context = { params: { segments?: string[] } };

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

function getSegments(context: Context) {
  return context.params.segments ?? [];
}

async function route(method: Method, request: NextRequest, context: Context) {
  return handleWarehouseRequest(method, request, getSegments(context));
}

export async function GET(request: NextRequest, context: Context) {
  return route('GET', request, context);
}

export async function POST(request: NextRequest, context: Context) {
  return route('POST', request, context);
}

export async function PUT(request: NextRequest, context: Context) {
  return route('PUT', request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return route('DELETE', request, context);
}
