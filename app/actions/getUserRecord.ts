"use server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

async function getUserRecord(): Promise<{
  record?: number;
  daysWithRecords?: number;
  error?: string;
}> {
  const { userId } = await auth();

  if (!userId) {
    return { error: "User not found" };
  }

  try {
    const recordSumPromise = db.records.aggregate({
      where: { userId },
      _sum: {
        amount: true,
      },
    });

    // 2. Harcama yapılan benzersiz gün sayısını alma
    const distinctDaysPromise = db.records.groupBy({
      by: ["date"],
      where: {
        userId,
        amount: {
          gt: 0, // Sadece pozitif harcamaların olduğu günleri say
        },
      },
    });

    // İki sorguyu paralel olarak çalıştırır
    const [stats, distinctDaysResult] = await Promise.all([
      recordSumPromise,
      distinctDaysPromise,
    ]);

    const daysWithRecords = distinctDaysResult.length;

    return {
      record: stats._sum.amount ?? 0,
      daysWithRecords: daysWithRecords,
    };
  } catch (error) {
    console.error("Error fetching user record:", error);
    return { error: "Database error" };
  }
}

export default getUserRecord;
