import { redirect } from "next/navigation";

export default function AuthDisabledPage() {
  redirect("/dashboard");
}
