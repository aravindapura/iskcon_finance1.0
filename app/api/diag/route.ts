import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export const GET = async () => {
  const dbUrl = process.env.DATABASE_URL || "";
  const dbHost = dbUrl ? new URL(dbUrl).host : "unknown";

  // читаем пользователей и конкретно buh
  const users = await prisma.user.findMany({ select: { login: true }, take: 5 });
  const buh = await prisma.user.findFirst({
    where: { login: { equals: "buh", mode: "insensitive" } },
    select: { login: true, password: true },
  });

  let bcryptTest: null | boolean = null;
  let hashPrefix = null as null | string;

  if (buh?.password) {
    hashPrefix = buh.password.slice(0, 7); // например "$2b$10"
    if (buh.password.startsWith("$2")) {
      // проверим прямо на сервере, что пароль "12345" совпадает с хэшем
      bcryptTest = await bcrypt.compare("12345", buh.password);
    }
  }

  return NextResponse.json({
    dbHost,
    users,
    buh: { login: buh?.login ?? null, hashPrefix, bcryptTest },
  });
};
