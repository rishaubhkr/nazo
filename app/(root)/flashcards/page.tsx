"use client"

import * as React from "react"
import { getFlashcardsAction } from "@/lib/actions/flashcard.actions"
import { FlashcardCard } from "@/components/flashcard-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { account } from "@/lib/appwrite"

export default function FlashcardsPage() {
    const [flashcards, setFlashcards] = React.useState<any[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [page, setPage] = React.useState(1)
    const [hasMore, setHasMore] = React.useState(false)

    React.useEffect(() => {
        const fetchFlashcards = async () => {
            setIsLoading(true)

            let jwt: string | undefined;
            try {
                const session = await account.createJWT();
                jwt = session.jwt;
            } catch (e) { }

            const result = await getFlashcardsAction(page, 10, jwt)

            if (result.success) {
                setFlashcards(result.data)
                setHasMore(result.hasMore!)
            } else {
                console.error(result.error)
            }
            setIsLoading(false)
        }

        fetchFlashcards()
    }, [page])

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 p-4 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="font-changa text-4xl text-foreground">
                    Explore Flashcards<span className="text-[#58cc02]">.</span>
                </h1>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="w-10 h-10 text-[#58cc02] animate-spin" />
                </div>
            ) : flashcards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {flashcards.map((card) => (
                        <FlashcardCard
                            key={card.$id}
                            id={card.$id}
                            title={card.title}
                            description={card.description}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[50vh] text-[#afafaf]">
                    <p className="text-xl font-medium">No flashcards found.</p>
                    <p className="text-sm">Generate some using the home page!</p>
                </div>
            )}

            {/* Pagination */}
            {!isLoading && flashcards.length > 0 && (
                <div className="flex items-center justify-center gap-4 py-8">
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="w-10 h-10 p-0 rounded-xl bg-[#131f24] border-[#37464f] hover:bg-[#37464f] hover:text-white"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>

                    <span className="text-[#afafaf] font-bold">Page {page}</span>

                    <Button
                        variant="outline"
                        onClick={() => setPage(p => p + 1)}
                        disabled={!hasMore}
                        className="w-10 h-10 p-0 rounded-xl bg-[#131f24] border-[#37464f] hover:bg-[#37464f] hover:text-white"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            )}
        </div>
    )
}
