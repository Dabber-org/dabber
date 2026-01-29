
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {

    const session = await auth.api.getSession({
        headers: await headers(),
    })  

    if (session) {
        return redirect('/')
    }

  return <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">{children}</div>
}
