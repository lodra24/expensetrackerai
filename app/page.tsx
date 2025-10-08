import Guest from "@/components/Guest";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();

  if (!user) {
    return <Guest />;
  }

  return <div className="text-red-500 dark:text-red-300">Homepage</div>;
}
