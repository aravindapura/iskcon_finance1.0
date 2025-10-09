/*
 * Minimal subset of Zod for validation within the project. This is not a
 * full-featured implementation, but it covers the functionality required by
 * the warehouse routes (objects, strings, numbers, coercion, optionals and
 * refinements).
 */

type PathSegment = string | number;

export interface ZodIssue {
  path: PathSegment[];
  message: string;
}

export class ZodError extends Error {
  issues: ZodIssue[];

  constructor(issues: ZodIssue[]) {
    super(issues[0]?.message ?? 'Validation error');
    this.issues = issues;
    this.name = 'ZodError';
  }
}

type SafeParseSuccess<T> = { success: true; data: T };
type SafeParseFailure = { success: false; error: ZodError };
export type SafeParseReturn<T> = SafeParseSuccess<T> | SafeParseFailure;

function failure(path: PathSegment[], message: string): SafeParseFailure {
  return { success: false, error: new ZodError([{ path, message }]) };
}

function prependPath(error: ZodError, path: PathSegment[]): ZodError {
  return new ZodError(
    error.issues.map((issue) => ({ path: [...path, ...issue.path], message: issue.message }))
  );
}

interface Refinement<T> {
  check: (value: T) => boolean;
  message: string;
}

export abstract class ZodType<T> {
  private refinements: Refinement<T>[] = [];

  parse(data: unknown): T {
    const result = this.safeParse(data);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  }

  safeParse(data: unknown): SafeParseReturn<T> {
    const result = this._parse(data, []);
    if (!result.success) {
      return result;
    }

    const issues = this.refinements
      .map((refinement) => (refinement.check(result.data) ? null : refinement.message))
      .filter(Boolean) as string[];

    if (issues.length > 0) {
      return failure([], issues[0]!);
    }

    return result;
  }

  refine(check: (value: T) => boolean, message = 'Invalid value'): this {
    this.refinements.push({ check, message });
    return this;
  }

  optional(): ZodOptional<T> {
    return new ZodOptional(this);
  }

  protected abstract _parse(data: unknown, path: PathSegment[]): SafeParseReturn<T>;
}

class ZodString extends ZodType<string> {
  private minLength?: { value: number; message: string };

  min(value: number, message = `Must be at least ${value} characters long`): this {
    this.minLength = { value, message };
    return this;
  }

  protected _parse(data: unknown, path: PathSegment[]): SafeParseReturn<string> {
    if (typeof data !== 'string') {
      return failure(path, 'Expected string');
    }

    if (this.minLength && data.length < this.minLength.value) {
      return failure(path, this.minLength.message);
    }

    return { success: true, data };
  }
}

class ZodNumber extends ZodType<number> {
  private minimum?: { value: number; message: string };
  private mustBeInt?: string;
  private mustBeNonNegative?: string;
  private mustBePositive?: string;

  min(value: number, message = `Must be greater than or equal to ${value}`): this {
    this.minimum = { value, message };
    return this;
  }

  int(message = 'Expected integer'): this {
    this.mustBeInt = message;
    return this;
  }

  nonnegative(message = 'Must be greater than or equal to 0'): this {
    this.mustBeNonNegative = message;
    return this;
  }

  positive(message = 'Must be greater than 0'): this {
    this.mustBePositive = message;
    return this;
  }

  protected _parse(data: unknown, path: PathSegment[]): SafeParseReturn<number> {
    if (typeof data !== 'number' || Number.isNaN(data)) {
      return failure(path, 'Expected number');
    }

    if (this.minimum && data < this.minimum.value) {
      return failure(path, this.minimum.message);
    }

    if (this.mustBeNonNegative && data < 0) {
      return failure(path, this.mustBeNonNegative);
    }

    if (this.mustBePositive && data <= 0) {
      return failure(path, this.mustBePositive);
    }

    if (this.mustBeInt && !Number.isInteger(data)) {
      return failure(path, this.mustBeInt);
    }

    return { success: true, data };
  }
}

class ZodCoerceNumber extends ZodNumber {
  protected _parse(data: unknown, path: PathSegment[]): SafeParseReturn<number> {
    if (typeof data === 'string' && data.trim() !== '') {
      const coerced = Number(data);
      if (!Number.isNaN(coerced)) {
        data = coerced;
      }
    }

    return super._parse(data, path);
  }
}

class ZodOptional<T> extends ZodType<T | undefined> {
  constructor(private inner: ZodType<T>) {
    super();
  }

  protected _parse(data: unknown, path: PathSegment[]): SafeParseReturn<T | undefined> {
    if (data === undefined) {
      return { success: true, data: undefined };
    }

    const result = this.inner.safeParse(data);
    if (!result.success) {
      return { success: false, error: prependPath(result.error, path) };
    }

    return { success: true, data: result.data };
  }
}

class ZodObject<T extends Record<string, any>> extends ZodType<T> {
  constructor(private shape: Record<string, ZodType<any>>) {
    super();
  }

  partial(): ZodObject<Partial<T>> {
    const partialShape: Record<string, ZodType<any>> = {};
    for (const key of Object.keys(this.shape)) {
      partialShape[key] = this.shape[key].optional();
    }
    return new ZodObject(partialShape) as ZodObject<Partial<T>>;
  }

  protected _parse(data: unknown, path: PathSegment[]): SafeParseReturn<T> {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return failure(path, 'Expected object');
    }

    const result: Record<string, unknown> = {};
    const issues: ZodIssue[] = [];

    for (const key of Object.keys(this.shape)) {
      const schema = this.shape[key];
      const value = (data as Record<string, unknown>)[key];
      const parsed = schema.safeParse(value);

      if (!parsed.success) {
        issues.push(
          ...parsed.error.issues.map((issue) => ({
            path: [key, ...issue.path],
            message: issue.message,
          }))
        );
      } else if (parsed.data !== undefined) {
        result[key] = parsed.data;
      }
    }

    if (issues.length > 0) {
      return { success: false, error: new ZodError(issues) };
    }

    return { success: true, data: result as T };
  }
}

export type infer<T extends ZodType<any>> = T extends ZodType<infer U> ? U : never;

export const z = {
  object: <T extends Record<string, any>>(shape: { [K in keyof T]: ZodType<T[K]> }) =>
    new ZodObject<T>(shape as unknown as Record<string, ZodType<any>>),
  string: () => new ZodString(),
  number: () => new ZodNumber(),
  coerce: {
    number: () => new ZodCoerceNumber(),
  },
  ZodError,
};

export default z;
