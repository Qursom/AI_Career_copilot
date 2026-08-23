import { redirect } from "next/navigation";

/** Legacy /about URL — contact is the company page. */
export default function AboutRedirect() {
  redirect("/contact");
}
