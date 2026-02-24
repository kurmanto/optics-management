"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function searchCustomersForTask(
  query: string
): Promise<{ id: string; name: string }[]> {
  await verifySession();

  if (!query || query.length < 2) return [];

  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    },
    select: { id: true, firstName: true, lastName: true },
    take: 8,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return customers.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
  }));
}
