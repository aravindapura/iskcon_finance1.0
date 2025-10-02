export const apiFetch = (
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> => {
  const { credentials: _ignoredCredentials, ...rest } = init;

  return fetch(input, { ...rest, credentials: "include" });
};
