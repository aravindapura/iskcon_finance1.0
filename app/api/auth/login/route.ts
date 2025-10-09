export const runtime = "nodejs";

export const POST = async () => {
  const user = { id: "0001", login: "buh", role: "admin" };
  return NextResponse.json({ token: "mock-token", user });
};
