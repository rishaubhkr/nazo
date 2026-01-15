"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { getFlashcardDeckByIdAction } from "@/lib/actions/flashcard.actions"
import { updateFlashcardPointsAction } from "@/lib/actions/points.actions"
import { cn } from "@/lib/utils"
import { X, Settings, Loader2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import { account } from "@/lib/appwrite"

export default function FlashcardPlayerPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const deckId = (React.use(params) as any).id;

    const [loading, setLoading] = React.useState(true)
    const [deck, setDeck] = React.useState<any>(null)
    const [cards, setCards] = React.useState<any[]>([])

    // Game State
    const [currentCardIndex, setCurrentCardIndex] = React.useState(0)
    const [isFlipped, setIsFlipped] = React.useState(false)
    const [hintVisible, setHintVisible] = React.useState(false)
    const [scoreMap, setScoreMap] = React.useState<Record<string, number>>({})
    const [sessionStatus, setSessionStatus] = React.useState<"viewing" | "rated">("viewing")

    React.useEffect(() => {
        const fetchDeck = async () => {
            let jwt: string | undefined;
            try {
                const session = await account.createJWT();
                jwt = session.jwt;
            } catch (e) { }

            const result = await getFlashcardDeckByIdAction(deckId, jwt)
            if (result.success) {
                setDeck(result.deck)
                setCards(result.cards!)
            }
            setLoading(false)
        }
        fetchDeck()
    }, [deckId])

    const useHint = async () => {
        if (hintVisible) return
        setHintVisible(true)
        setTimeout(() => setHintVisible(false), 5000)

        // Apply penalty in DB
        const card = cards[currentCardIndex]
        let jwt: string | undefined;
        try {
            const session = await account.createJWT();
            jwt = session.jwt;
        } catch (e) { }

        await updateFlashcardPointsAction(card.$id, -1, jwt)
    }

    const handleFlip = () => {
        setIsFlipped(!isFlipped)
    }

    const rateCard = async (isCorrect: boolean) => {
        if (sessionStatus === "rated") return

        const card = cards[currentCardIndex]
        setSessionStatus("rated")

        // Update points in DB
        let jwt: string | undefined;
        try {
            const session = await account.createJWT();
            jwt = session.jwt;
        } catch (e) { }

        await updateFlashcardPointsAction(card.$id, isCorrect ? 1 : -1, jwt)

        // Update local score map for final tally display (optional, can keep for session summary)
        setScoreMap(prev => ({
            ...prev,
            [card.$id]: (prev[card.$id] || 0) + (isCorrect ? 1 : -1)
        }))
    }

    const handleNext = () => {
        if (currentCardIndex < cards.length - 1) {
            setIsFlipped(false) // Flip back first
            setHintVisible(false)
            setSessionStatus("viewing")

            // Wait for flip to close before changing content
            setTimeout(() => {
                setCurrentCardIndex(prev => prev + 1)
            }, 300) // 300ms matches typical transition duration
        } else {
            // Calculate final score
            const totalScore = Object.values(scoreMap).reduce((a, b) => a + b, 0)
            router.push("/flashcards")
        }
    }

    const handlePrev = () => {
        if (currentCardIndex > 0) {
            setIsFlipped(false)
            setHintVisible(false)
            setSessionStatus("viewing")

            setTimeout(() => {
                setCurrentCardIndex(prev => prev - 1)
            }, 300)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#131f24]">
                <Loader2 className="w-12 h-12 text-[#58cc02] animate-spin" />
            </div>
        )
    }

    if (!deck || cards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#131f24] text-[#afafaf]">
                <h1 className="text-2xl font-changa">Deck Not Found</h1>
                <button onClick={() => router.push("/flashcards")} className="mt-4 text-[#58cc02] hover:underline">Go Back</button>
            </div>
        )
    }

    const currentCard = cards[currentCardIndex]
    const progressPercentage = ((currentCardIndex + 1) / cards.length) * 100

    return (
        <div className="min-h-screen bg-[#131f24] text-foreground flex flex-col items-center font-balsamiq">
            {/* Header */}
            <div className="w-full max-w-4xl mx-auto px-6 py-8 flex items-center justify-between gap-6">
                <button onClick={() => router.back()} className="text-[#afafaf] hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>

                <div className="flex-1 h-4 bg-[#37464f] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#58cc02] transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                {/* Hint Button */}
                <button
                    onClick={useHint}
                    disabled={hintVisible || sessionStatus === "rated"}
                    className="flex items-center gap-2 text-amber-400 font-bold hover:text-amber-300 disabled:opacity-50 transition-colors"
                >
                    <Settings className="w-6 h-6 fill-current animate-pulse" />
                    <span>HINT</span>
                </button>
            </div>

            {/* Hint Dialog Overlay */}
            {hintVisible && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#1e2a30] border-2 border-amber-400 text-amber-400 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.2)] animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm text-center">
                    <p className="font-bold text-sm">💡 {currentCard.hint || "No hint available!"}</p>
                </div>
            )}

            {/* Main Flashcard Area */}
            <div className="flex-1 w-full max-w-3xl mx-auto px-6 flex flex-col items-center justify-center -mt-20">
                <div
                    className="relative w-full aspect-[1.6/1] cursor-pointer group perspective-1000"
                    onClick={handleFlip}
                >
                    <div className={cn(
                        "w-full h-full duration-700 preserve-3d relative transition-all",
                        isFlipped ? "rotate-y-180" : ""
                    )}>
                        {/* Front Side */}
                        <div className="absolute inset-0 backface-hidden bg-[#1e2a30] border-2 border-[#37464f] rounded-3xl flex flex-col items-center justify-center p-10 text-center shadow-2xl group-hover:border-[#58cc02] transition-colors">
                            <span className="text-[#afafaf] font-bold tracking-widest text-sm uppercase mb-6 font-sans">Question</span>
                            <h2 className="text-xl md:text-3xl font-medium text-white leading-tight">
                                {currentCard.front}
                            </h2>
                            <p className="absolute bottom-6 text-[#506672] text-xs font-bold uppercase tracking-widest animate-pulse font-sans">Click to Flip</p>
                        </div>

                        {/* Back Side */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e2a30] border-2 border-[#58cc02] rounded-3xl flex flex-col items-center justify-center p-10 text-center shadow-[0_0_50px_rgba(88,204,2,0.1)]">
                            <span className="text-[#58cc02] font-bold tracking-widest text-sm uppercase mb-6 font-sans">Answer</span>
                            <h2 className="text-lg md:text-2xl font-medium text-[#e5e5e5] leading-relaxed">
                                {currentCard.back}
                            </h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Navigation or Rating */}
            <div className="fixed bottom-0 left-0 right-0 py-8 px-6 bg-[#131f24] border-t-2 border-[#37464f]">
                <div className="max-w-4xl mx-auto">
                    {isFlipped && sessionStatus === "viewing" ? (
                        // Rating Buttons
                        <div className="flex items-center justify-between gap-4 animate-in slide-in-from-bottom-4 duration-300">
                            <button
                                onClick={(e) => { e.stopPropagation(); rateCard(false); }}
                                className="flex-1 py-4 rounded-2xl font-bold text-lg uppercase tracking-widest border-b-4 border-[#ff4b4b] bg-[#ff4b4b] text-white hover:bg-[#ea2b2b] transition-all active:border-b-0 active:translate-y-1"
                            >
                                Incorrect
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); rateCard(true); }}
                                className="flex-1 py-4 rounded-2xl font-bold text-lg uppercase tracking-widest border-b-4 border-[#58cc02] bg-[#58cc02] text-white hover:bg-[#46a302] transition-all active:border-b-0 active:translate-y-1"
                            >
                                Correct
                            </button>
                        </div>
                    ) : (
                        // Navigation
                        <div className="flex items-center justify-between gap-4">
                            <button
                                onClick={handlePrev}
                                disabled={currentCardIndex === 0}
                                className="w-14 h-14 rounded-2xl flex items-center justify-center border-b-4 border-[#37464f] bg-[#1e2a30] text-[#afafaf] hover:bg-[#37464f/50] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:border-b-0 active:translate-y-1"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>

                            <button
                                onClick={handleFlip}
                                className="flex-1 py-4 rounded-2xl font-extrabold text-lg uppercase tracking-widest border-b-4 border-[#37464f] bg-[#1e2a30] text-sky-400 hover:bg-[#37464f/50] transition-all active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-5 h-5" />
                                {sessionStatus === "rated" ? "Review" : "Flip Card"}
                            </button>

                            <button
                                onClick={handleNext}
                                className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1",
                                    sessionStatus === "rated"
                                        ? "bg-[#58cc02] border-[#46a302] text-white hover:bg-[#6be010]"
                                        : "bg-[#37464f] border-[#253239] text-[#506672]"
                                )}
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    )
}
