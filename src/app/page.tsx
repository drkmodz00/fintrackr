import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/auth");
  }
}