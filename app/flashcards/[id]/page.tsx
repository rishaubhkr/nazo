"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { getFlashcardDeckByIdAction } from "@/lib/actions/flashcard.actions"
import { updateFlashcardPointsAction } from "@/lib/actions/points.actions"
import { cn } from "@/lib/utils"
import { X, Settings, Loader2, Check, X as XIcon } from "lucide-react"
import { account } from "@/lib/appwrite"
import Sidebar from "@/components/sidebar"

export default function FlashcardPlayerPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const deckId = (React.use(params) as any).id;
    const containerRef = React.useRef<HTMLDivElement>(null)

    const [loading, setLoading] = React.useState(true)
    const [deck, setDeck] = React.useState<any>(null)
    const [cards, setCards] = React.useState<any[]>([])
    const [activeIndex, setActiveIndex] = React.useState(0)
    const [hintVisible, setHintVisible] = React.useState(false)

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

    const handleScroll = () => {
        if (!containerRef.current) return
        const scrollPosition = containerRef.current.scrollTop
        const itemHeight = containerRef.current.clientHeight
        const index = Math.round(scrollPosition / itemHeight)
        setActiveIndex(index)
    }

    const useHint = async () => {
        if (hintVisible) return

        setHintVisible(true)
        setTimeout(() => setHintVisible(false), 5000)

        const card = cards[activeIndex]
        let jwt: string | undefined;
        try {
            const session = await account.createJWT();
            jwt = session.jwt;
        } catch (e) { }

        await updateFlashcardPointsAction(card.$id, -1, jwt)
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

    const progressPercentage = ((activeIndex + 1) / cards.length) * 100

    return (
        <div className="flex min-h-screen bg-[#131f24] text-foreground">
            <Sidebar />
            <div className="flex-1 lg:pl-20">
                {/* Fixed Header */}
                <div className="fixed top-0 left-0 right-0 lg:left-20 z-50 bg-[#131f24]/95 backdrop-blur-md border-b border-[#37464f]">
                    <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
                        <button onClick={() => router.back()} className="text-[#afafaf] hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex-1 h-3 bg-[#37464f] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#58cc02] transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>

                        <button
                            onClick={useHint}
                            disabled={hintVisible}
                            className="flex items-center gap-2 text-amber-400 font-bold hover:text-amber-300 disabled:opacity-50 transition-colors"
                        >
                            <Settings className="w-6 h-6 fill-current animate-pulse" />
                            <span className="hidden sm:inline">HINT</span>
                        </button>
                    </div>
                </div>

                {/* Hint Dialog Overlay */}
                {hintVisible && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1e2a30] border-2 border-amber-400 text-amber-400 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.2)] animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm text-center">
                        <p className="font-bold text-sm">💡 {cards[activeIndex]?.hint || "No hint available!"}</p>
                    </div>
                )}

                {/* Vertical Scroll Container */}
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-[#131f24] scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    {cards.map((card, idx) => (
                        <div key={card.$id} className="h-screen w-full snap-start relative">
                            {Math.abs(activeIndex - idx) <= 1 && (
                                <FlashcardReelItem
                                    data={card}
                                    isActive={activeIndex === idx}
                                    cardNumber={idx + 1}
                                    totalCards={cards.length}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Helper for SFX
const playSound = (type: 'correct' | 'wrong' | 'flip') => {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'flip') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    }
}

function FlashcardReelItem({ data, isActive, cardNumber, totalCards }: {
    data: any,
    isActive: boolean,
    cardNumber: number,
    totalCards: number
}) {
    const [flipped, setFlipped] = React.useState(false)
    const [rated, setRated] = React.useState(false)
    const [swipeDir, setSwipeDir] = React.useState<"left" | "right" | null>(null)

    // Drag/Swipe Logic
    const touchStartX = React.useRef<number | null>(null)
    const [dragX, setDragX] = React.useState(0)

    React.useEffect(() => {
        if (!isActive) {
            setFlipped(false)
            setRated(false)
            setSwipeDir(null)
            setDragX(0)
        }
    }, [isActive])

    // Keyboard handlers
    React.useEffect(() => {
        if (!isActive || rated) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                setDragX(-150)
                setTimeout(() => handleRate(false), 200)
            }
            if (e.key === "ArrowRight") {
                setDragX(150)
                setTimeout(() => handleRate(true), 200)
            }
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault()
                handleFlip()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isActive, rated, flipped])

    const handleFlip = () => {
        playSound('flip')
        if (navigator.vibrate) navigator.vibrate(10);
        setFlipped(!flipped)
    }

    const handleRate = async (correct: boolean) => {
        if (rated) return

        if (!flipped) {
            playSound('flip')
            setFlipped(true)
        }

        setRated(true)
        setDragX(0)
        setSwipeDir(correct ? "right" : "left")

        playSound(correct ? 'correct' : 'wrong')
        if (navigator.vibrate) navigator.vibrate(correct ? [50, 50, 50] : 100);

        let jwt: string | undefined;
        try {
            const session = await account.createJWT();
            jwt = session.jwt;
        } catch (e) { }

        await updateFlashcardPointsAction(data.$id, correct ? 1 : -1, jwt)
    }

    // Touch handlers
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX
    }

    const onTouchMove = (e: React.TouchEvent) => {
        if (!touchStartX.current || rated) return
        const currentX = e.targetTouches[0].clientX
        const diff = currentX - touchStartX.current
        setDragX(diff * 0.6)
    }

    const onTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartX.current || rated) return

        if (Math.abs(dragX) > 80) {
            if (dragX > 0) handleRate(true)
            else handleRate(false)
        }

        setDragX(0)
        touchStartX.current = null
    }

    return (
        <div
            className="w-full h-full flex flex-col items-center justify-center p-6 pt-24 relative font-balsamiq bg-[#131f24] overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Card Number Badge */}
            <div className="absolute top-20 left-6 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase z-10">
                {cardNumber} / {totalCards}
            </div>

            <div
                onClick={handleFlip}
                style={{ transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)` }}
                className={cn(
                    "w-full max-w-lg aspect-3/4 perspective-1000 cursor-pointer ease-out will-change-transform",
                    dragX === 0 ? "transition-transform duration-500" : "transition-none"
                )}
            >
                <div className={cn(
                    "w-full h-full relative transition-all duration-500 preserve-3d",
                    flipped ? "rotate-y-180" : ""
                )}>
                    {/* Front (Question) */}
                    <div className="absolute inset-0 backface-hidden bg-[#1e2a30] border-2 border-[#37464f] rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-xl">
                        <span className="text-[#afafaf] font-bold tracking-widest text-sm uppercase mb-6">Question</span>
                        <h2 className="text-2xl md:text-3xl text-white font-medium leading-tight">{data.front}</h2>
                        <p className="mt-8 text-[#506672] text-sm font-bold uppercase animate-pulse">Tap to Flip</p>
                    </div>

                    {/* Back (Answer) */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e2a30] border-2 border-[#58cc02] rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-[0_0_30px_rgba(88,204,2,0.15)]">
                        <span className="text-[#58cc02] font-bold tracking-widest text-sm uppercase mb-6">Answer</span>
                        <h2 className="text-xl md:text-2xl text-[#e5e5e5] leading-relaxed">{data.back}</h2>

                        {/* Status Overlay */}
                        {rated && (
                            <div className="absolute inset-0 bg-black/60 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm z-20 animate-in fade-in duration-300">
                                {swipeDir === "right"
                                    ? <Check className="w-24 h-24 text-[#58cc02] drop-shadow-[0_0_15px_rgba(88,204,2,0.5)]" />
                                    : <XIcon className="w-24 h-24 text-[#ff4b4b] drop-shadow-[0_0_15px_rgba(255,75,75,0.5)]" />
                                }
                                <p className="mt-4 text-white font-bold tracking-widest uppercase">
                                    {swipeDir === "right" ? "Mastered" : "Needs Review"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Rating Buttons - Desktop */}
            {flipped && !rated && (
                <div className="hidden md:flex absolute bottom-32 right-6 flex-col gap-6 items-center z-20 animate-in slide-in-from-right-4 duration-500">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRate(true); }}
                        className="w-14 h-14 bg-[#1e2a30]/80 backdrop-blur-md rounded-full border-2 border-[#58cc02] flex items-center justify-center text-[#58cc02] hover:bg-[#58cc02] hover:text-white transition-all shadow-lg active:scale-95"
                    >
                        <Check className="w-8 h-8" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRate(false); }}
                        className="w-14 h-14 bg-[#1e2a30]/80 backdrop-blur-md rounded-full border-2 border-[#ff4b4b] flex items-center justify-center text-[#ff4b4b] hover:bg-[#ff4b4b] hover:text-white transition-all shadow-lg active:scale-95"
                    >
                        <XIcon className="w-8 h-8" />
                    </button>
                    <span className="text-white text-xs font-bold shadow-black drop-shadow-md">Rate</span>
                </div>
            )}

            {/* Rating Buttons - Mobile (Bottom) */}
            {flipped && !rated && (
                <div className="md:hidden absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-20 animate-in slide-in-from-bottom-4 duration-500 px-6">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRate(false); }}
                        className="flex-1 max-w-[150px] py-3 bg-[#ff4b4b] rounded-2xl border-b-4 border-[#ea2b2b] text-white font-bold uppercase text-sm active:border-b-0 active:translate-y-1 transition-all"
                    >
                        Wrong
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRate(true); }}
                        className="flex-1 max-w-[150px] py-3 bg-[#58cc02] rounded-2xl border-b-4 border-[#46a302] text-white font-bold uppercase text-sm active:border-b-0 active:translate-y-1 transition-all"
                    >
                        Correct
                    </button>
                </div>
            )}

            <style jsx>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .aspect-3\\/4 { aspect-ratio: 3/4; }
            `}</style>

            {!flipped && <p className="absolute bottom-8 text-[#506672] text-xs font-bold uppercase animate-bounce">Tap Card or Scroll</p>}
        </div>
    )
}
