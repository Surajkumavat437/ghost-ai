import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export const instant = false

export default async function Home() {
  const { userId } = await auth()
  if (userId) {
    redirect("/editor")
  } else {
    redirect("/sign-in")
  }
}
