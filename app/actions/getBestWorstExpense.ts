"use server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

async function getBestWorstExpense(): Promise<{
  bestExpense?: number;
  worstExpense?: number;
  error?: string;
}> {
  const { userId } = await auth();

  if (!userId) {
    return { error: "User not found" };
  }

  try {
    const stats = await db.records.aggregate({
      where: { userId },
      _max: {
        amount: true,
      },
      _min: {
        amount: true,
      },
    });

    return {
      bestExpense: stats._max.amount ?? 0,
      worstExpense: stats._min.amount ?? 0,
    };
  } catch (error) {
    console.error("Error fetching expense amounts:", error); // Log the error
    return { error: "Database error" };
  }
}

export default getBestWorstExpense;
