"use server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

interface RecordData {
  text: string;
  amount: number;
  category: string;
  date: string; // Added date field
}

interface RecordResult {
  data?: RecordData;
  error?: string;
}

const recordSchema = z.object({
  text: z
    .string({ required_error: "Text is required" })
    .trim()
    .min(1, "Text is required")
    .max(255, "Text must be 255 characters or less"),
  amount: z
    .coerce
    .number({ invalid_type_error: "Amount must be a valid number" })
    .refine((value) => Number.isFinite(value), { message: "Amount must be a valid number" })
    .refine((value) => value >= 0, { message: "Amount must be zero or greater" }),
  category: z
    .string({ required_error: "Category is required" })
    .trim()
    .min(1, "Category is required")
    .max(100, "Category must be 100 characters or less"),
  date: z
    .string({ required_error: "Date is required" })
    .trim()
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Date must follow YYYY-MM-DD format",
    })
    .refine((value) => {
      const [year, month, day] = value.split("-").map(Number);

      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return false;
      }

      const utcDate = new Date(Date.UTC(year, month - 1, day));
      return (
        utcDate.getUTCFullYear() === year &&
        utcDate.getUTCMonth() === month - 1 &&
        utcDate.getUTCDate() === day
      );
    }, { message: "Date is invalid" }),
});

async function addExpenseRecord(formData: FormData): Promise<RecordResult> {
  const validationResult = recordSchema.safeParse({
    text: formData.get("text"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    date: formData.get("date"),
  });

  if (!validationResult.success) {
    const firstIssue = validationResult.error.issues.at(0);
    return { error: firstIssue?.message ?? "Invalid input data" };
  }

  const { text, amount, category, date: rawDate } = validationResult.data;

  // Convert date to ISO-8601 format while preserving the user's input date
  const [year, month, day] = rawDate.split("-").map(Number);
  const isoDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();

  // --- YENİ KİMLİK DOĞRULAMA MANTIĞI ---

  // Önce hızlı olan `auth()` ile dene
  const authResult = await auth();
  console.log("1. auth() SONUCU:", authResult.userId);
  let userId = authResult.userId;

  // Eğer `auth()` başarısız olursa, `currentUser()` ile sunucudan doğrula
  if (!userId) {
    console.log("auth() null döndü, currentUser() ile deneniyor...");
    try {
      const user = await currentUser();
      if (user) {
        console.log("currentUser() BAŞARILI, ID:", user.id);
        userId = user.id;
      } else {
        console.log("currentUser() da null döndü.");
      }
    } catch (e) {
      console.error("currentUser() çağrılırken hata oluştu:", e);
    }
  }

  // Final kontrol: Eğer iki yöntem de başarısızsa hata döndür
  if (!userId) {
    console.error("HATA: Her iki yöntemle de userId bulunamadı!");
    return { error: "User not found. Please try refreshing the page." };
  }

  // --- YENİ KİMLİK DOĞRULAMA MANTIĞI SONU ---

  try {
    // Create a new record (allow multiple expenses per day)
    const createdRecord = await db.records.create({
      data: {
        text,
        amount,
        category,
        date: isoDate, // Save the date to the database
        userId,
      },
    });

    const recordData: RecordData = {
      text: createdRecord.text,
      amount: createdRecord.amount,
      category: createdRecord.category,
      date: createdRecord.date?.toISOString() || isoDate,
    };

    revalidatePath("/");

    return { data: recordData };
  } catch (error) {
    console.error("Error adding expense record:", error); // Log the error
    return {
      error: "An unexpected error occurred while adding the expense record.",
    };
  }
}

export default addExpenseRecord;
