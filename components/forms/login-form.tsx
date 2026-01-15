'use client'
import Image from "next/image"
import { Button } from "../ui/button"
import { Changa_One } from "next/font/google"
import { getUser, loginWithGoogle } from "@/lib/actions/auth.actions"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

const changa_one = Changa_One({
    subsets: ["latin"],
    weight: ["400"]
})


const LoginForm = () => {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const checkUser = async () => {
            const user = await getUser()
            if (user) {
                router.push("/")
            }
        }
        checkUser()
    }, [router])

    const handleLogin = async () => {
        setIsLoading(true)
        try {
            await loginWithGoogle()
        } catch (error) {
            console.error("Login failed:", error)
        } finally {
            // Note: Since createOAuth2Session redirects the page, 
            // the button should stay in loading state until the redirect happens.
            // setIsLoading(false) // Optionally keep loading until redirect
        }
    }

    return (
        <div className="w-sm border bg-card p-5 rounded-xl flex flex-col items-center gap-5">
            <div className={`${changa_one.className} text-4xl text-center`}>
                nazo
            </div>
            <div className="text-2xl text-center text-foreground/80 font-semibold">Welcome</div>
            <Button
                className="w-full"
                size={"lg"}
                onClick={handleLogin}
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="animate-spin mr-2" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="512" height="512" x="0" y="0" viewBox="0 0 210 210" contentStyleType="enable-background:new 0 0 512 512" className="mr-2 h-5 w-5"><g><path d="M0 105C0 47.103 47.103 0 105 0c23.383 0 45.515 7.523 64.004 21.756l-24.4 31.696C133.172 44.652 119.477 40 105 40c-35.841 0-65 29.159-65 65s29.159 65 65 65c28.867 0 53.398-18.913 61.852-45H105V85h105v20c0 57.897-47.103 105-105 105S0 162.897 0 105z" fill="#000000" opacity="1" data-original="#000000" className=""></path></g></svg>
                )}
                {isLoading ? "Redirecting..." : "Continue with Google"}
            </Button>
        </div>
    )
}

export default LoginForm