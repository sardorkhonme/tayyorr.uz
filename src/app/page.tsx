import { redirect } from "next/navigation";

/** app.tayyorr.uz bosh sahifasi — darhol kabinet (landing: tayyorr.uz, alohida loyiha). */
export default function Home() {
  redirect("/dashboard");
}
