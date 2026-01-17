"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Home, Layout, Trophy, Package, User, Settings, MoreHorizontal, Infinity, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const sidebarItems = [
    { name: "HOME", href: "/", icon: Home, color: "text-emerald-500" },
    { name: "QUIZZES", href: "/quizzes", icon: Layout, color: "text-sky-500" },
    { name: "DAILY MIX", href: "/reels", icon: Infinity, color: "text-rose-500" },
    { name: "FLASHCARDS", href: "/flashcards", icon: Package, color: "text-purple-500" },
    { name: "REPORT", href: "/report", icon: BarChart3, color: "text-cyan-500" },
    { name: "LEADERBOARDS", href: "/leaderboards", icon: Trophy, color: "text-amber-500" },
    { name: "QUESTS", href: "/quests", icon: Package, color: "text-orange-500" },
    { name: "SETTINGS", href: "/settings", icon: Settings, color: "text-slate-400" },
]

export default function Sidebar() {
    const pathname = usePathname()

    // Collapse sidebar for immersive experiences (reels, quiz player, flashcard player)
    const isCollapsed = pathname === "/reels" || pathname.startsWith("/quiz/") || pathname.startsWith("/flashcards/")

    // Mobile Bottom Bar Logic: Only show main items
    const mobileFilteredItems = sidebarItems.filter(item => ["HOME", "QUIZZES", "DAILY MIX", "FLASHCARDS"].includes(item.name))

    return (
        <>
            {/* Desktop Sidebar (Left) */}
            <aside className={cn(
                "hidden lg:flex fixed left-0 top-0 bottom-0 bg-[#131f24] border-r-2 border-[#37464f] flex-col py-6 px-4 z-50 transition-all duration-300",
                isCollapsed ? "w-20 items-center" : "w-64"
            )}>
                {/* Logo */}
                <div className="mb-8 px-4 h-12 flex items-center justify-center w-full">
                    <Link href="/" className="group flex items-center gap-3">
                        <Image
                            src="/icon.png"
                            alt="nazo logo"
                            width={isCollapsed ? 32 : 48}
                            height={isCollapsed ? 32 : 48}
                            className="transition-all duration-300 group-hover:scale-110"
                        />
                        {!isCollapsed && (
                            <span className="font-changa text-3xl tracking-tight text-[#58cc02] group-hover:scale-105 transition-transform duration-300">
                                nazo
                            </span>
                        )}
                    </Link>
                </div>

                {/* Navigation Items - Desktop */}
                <nav className="flex-1 flex flex-col gap-2 w-full">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-4 px-4 py-3 rounded-xl border-2 transition-all duration-200",
                                    isActive
                                        ? "bg-[#2d4653] border-[#84d8ff] text-[#84d8ff]"
                                        : "bg-transparent border-transparent text-[#afafaf] hover:bg-[#37464f] hover:text-[#e5e5e5]",
                                    isCollapsed && "justify-center px-0"
                                )}
                            >
                                <div className={cn(
                                    "transition-transform duration-200 group-hover:scale-110 group-active:scale-90",
                                    isActive ? "text-[#84d8ff]" : item.color
                                )}>
                                    <Icon className="w-7 h-7 stroke-[2.5px]" />
                                </div>
                                <span className={cn(
                                    "font-extrabold text-[15px] tracking-[1px]",
                                    isCollapsed && "hidden"
                                )}>
                                    {item.name}
                                </span>
                            </Link>
                        )
                    })}

                    {/* Profile */}
                    <Link
                        href="/settings"
                        className={cn(
                            "mt-auto group flex items-center gap-4 px-4 py-3 rounded-xl border-2 transition-all duration-200",
                            pathname === "/settings" ? "bg-[#2d4653] border-[#84d8ff] text-[#84d8ff]" : "text-[#afafaf] hover:bg-[#37464f]",
                            isCollapsed && "justify-center px-0"
                        )}
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-500 overflow-hidden border-2 border-[#afafaf] group-hover:scale-110 transition-transform">
                            <User className="w-full h-full p-1 text-slate-200" />
                        </div>
                        <span className={cn("font-extrabold text-[15px] tracking-[1px]", isCollapsed && "hidden")}>PROFILE</span>
                    </Link>
                </nav>
            </aside>

            {/* Mobile Bottom Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#131f24] border-t-2 border-[#37464f] flex items-center justify-around px-2 z-50 pb-safe">
                {mobileFilteredItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all",
                                isActive ? "bg-[#2d4653]/50 text-[#84d8ff]" : "text-[#afafaf]"
                            )}
                        >
                            <Icon className={cn("w-7 h-7 stroke-[2.5px]", isActive ? "text-[#84d8ff]" : item.color)} />
                        </Link>
                    )
                })}
                <Link href="/settings" className="flex flex-col items-center justify-center gap-1 p-2 text-[#afafaf]">
                    <Settings className="w-7 h-7" />
                </Link>
            </nav>
        </>
    )
}
