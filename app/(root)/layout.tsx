"use client"

import GlobalProvider from '@/lib/global-provider'
import { ReactNode } from 'react'
import Sidebar from '@/components/sidebar'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const RootLayout = ({ children }: { children: ReactNode }) => {
    const pathname = usePathname()
    const isReels = pathname === "/reels"

    return (
        <GlobalProvider>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="mobile-web-app-status-bar-style" content="black-translucent" />
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icon.png" />
            </head>
            <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
                <Sidebar />
                <main className={cn(
                    "flex-1 pb-24 lg:pb-0 pl-0 transition-all duration-300",
                    isReels ? "lg:pl-20" : "lg:pl-64"
                )}>
                    {children}
                </main>
            </div>
        </GlobalProvider>
    )
}

export default RootLayout