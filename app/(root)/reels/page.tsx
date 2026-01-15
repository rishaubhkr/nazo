"use client"

import * as React from "react"
import { getDailyMixAction } from "@/lib/actions/reels.actions"
import { Loader2, RotateCcw, Check, X, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { account } from "@/lib/appwrite"
// Reuse actions for updating points
import { updateFlashcardPointsAction, updateQuizPointsAction } from "@/lib/actions/points.actions"

export default function ReelsPage() {
    const contenedorRef = React.useRef<HTMLDivElement>(null)
    const [items, setItems] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [fetchingMore, setFetchingMore] = React.useState(false)
    const [activeIndex, setActiveIndex] = React.useState(0)

    const fetchMix = async (isInitial = false) => {
        if (isInitial) setLoading(true)
        else setFetchingMore(true)

        let jwt: string | undefined;
        try {
            const session = await account.createJWT();
            jwt = session.jwt;
        } catch (e) { }

        const res = await getDailyMixAction(jwt)
        if (res.success) {
            setItems(prev => isInitial ? res.data! : [...prev, ...res.data!])
        }

        if (isInitial) setLoading(false)
        else setFetchingMore(false)
    }

    React.useEffect(() => {
        fetchMix(true)
    }, [])

    const handleScroll = () => {
        if (!contenedorRef.current) return
        const scrollPosition = contenedorRef.current.scrollTop
        const itemHeight = contenedorRef.current.clientHeight
        const index = Math.round(scrollPosition / itemHeight)
        setActiveIndex(index)

        // Infinite Scroll Trigger
        if (index >= items.length - 4 && !fetchingMore && !loading) {
            console.log("Fetching more reels...")
            fetchMix(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#58cc02]" />
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-[#afafaf]">
                <h1 className="text-2xl font-bold mb-4 font-balsamiq">All Caught Up! 🎉</h1>
                <p>Come back later for more reviews.</p>
            </div>
        )
    }

    return (
        <div
            ref={contenedorRef}
            onScroll={handleScroll}
            className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
            {items.map((item, idx) => (
                <div key={`${item.$id}-${idx}`} className="h-screen w-full snap-start relative">
                    {Math.abs(activeIndex - idx) <= 1 && ( // Only render active and neighbours for performance
                        item.type === "flashcard"
                            ? <FlashcardReelItem data={item.data} isActive={activeIndex === idx} />
                            : <QuizReelItem data={item.data} isActive={activeIndex === idx} />
                    )}
                </div>
            ))}
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

function FlashcardReelItem({ data, isActive }: { data: any, isActive: boolean }) {
    const [flipped, setFlipped] = React.useState(false)
    const [rated, setRated] = React.useState(false)

    // Drag/Swipe Logic
    const touchStartX = React.useRef<number | null>(null)
    const [dragX, setDragX] = React.useState(0)
    const [swipeDir, setSwipeDir] = React.useState<"left" | "right" | null>(null)

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
                setDragX(-150) // Nudge left
                setTimeout(() => handleRate(false), 200)
            }
            if (e.key === "ArrowRight") {
                setDragX(150) // Nudge right
                setTimeout(() => handleRate(true), 200)
            }
            if (e.key === " " || e.key === "Enter") handleFlip()
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

        // Auto-flip if needed to show the answer/feedback
        if (!flipped) {
            playSound('flip')
            setFlipped(true)
            // Wait slight delay to show rating? No, user wants instant feedback.
            // But if we rate instantly, the overlay appears on the BACK side while flipping.
            // It actually looks fine: card turns and 'Mastered' stamp is there.
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

        // Threshold
        if (Math.abs(dragX) > 80) {
            if (dragX > 0) handleRate(true)
            else handleRate(false)
        }

        setDragX(0) // Always snap back to center to show result
        touchStartX.current = null
    }

    return (
        <div
            className="w-full h-full flex flex-col items-center justify-center p-6 relative font-balsamiq bg-[#131f24] overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div
                onClick={handleFlip}
                style={{ transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)` }}
                className={cn(
                    "w-full max-w-lg aspect-3/4 perspective-1000 cursor-pointer ease-out will-change-transform",
                    dragX === 0 ? "transition-transform duration-500" : "transition-none"
                    // Removed 'translate-x-[200%]' classes so card stays centered to show feedback
                )}
            >
                <div className={cn(
                    "w-full h-full relative transition-all duration-500 preserve-3d",
                    flipped ? "rotate-y-180" : ""
                )}>
                    {/* Front (Question) */}
                    <div className="absolute inset-0 backface-hidden bg-[#1e2a30] border-2 border-[#37464f] rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-xl">
                        <h2 className="text-2xl text-white font-medium">{data.front}</h2>
                        <p className="mt-8 text-[#506672] text-sm font-bold uppercase animate-pulse">Tap to Flip</p>
                    </div>

                    {/* Back (Answer) */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e2a30] border-2 border-[#58cc02] rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-[0_0_30px_rgba(88,204,2,0.15)]">
                        <h2 className="text-xl text-[#e5e5e5] leading-relaxed">{data.back}</h2>

                        {/* Status Overlay */}
                        {rated && (
                            <div className="absolute inset-0 bg-black/60 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm z-20 animate-in fade-in duration-300">
                                {swipeDir === "right"
                                    ? <Check className="w-24 h-24 text-[#58cc02] drop-shadow-[0_0_15px_rgba(88,204,2,0.5)]" />
                                    : <X className="w-24 h-24 text-[#ff4b4b] drop-shadow-[0_0_15px_rgba(255,75,75,0.5)]" />
                                }
                                <p className="mt-4 text-white font-bold tracking-widest uppercase">
                                    {swipeDir === "right" ? "Mastered" : "Needs Review"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Arrows Layout: Hidden on Mobile, Visible on Desktop */}
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
                        <X className="w-8 h-8" />
                    </button>
                    <span className="text-white text-xs font-bold shadow-black drop-shadow-md">Rate</span>
                </div>
            )}

            <style jsx>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .aspect-3\\/4 { aspect-ratio: 3/4; }
            `}</style>

            {!flipped && <p className="absolute bottom-24 text-[#506672] text-xs font-bold uppercase animate-bounce">Tap Card</p>}
        </div>
    )
}

function QuizReelItem({ data, isActive }: { data: any, isActive: boolean }) {
    const [selected, setSelected] = React.useState<string | null>(null)
    const [status, setStatus] = React.useState<"idle" | "correct" | "wrong">("idle")

    React.useEffect(() => {
        if (!isActive) {
            setSelected(null)
            setStatus("idle")
        }
    }, [isActive])

    const handleSelect = async (opt: string) => {
        if (status !== "idle") return
        setSelected(opt)

        const isCorrect = opt === data.correctOption
        setStatus(isCorrect ? "correct" : "wrong")

        let jwt: string | undefined;
        try {
            const session = await account.createJWT();
            jwt = session.jwt;
        } catch (e) { }

        await updateQuizPointsAction(data.$id, isCorrect ? 1 : -1, jwt)
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 relative font-balsamiq bg-[#131f24]">
            <div className="absolute top-4 left-4 bg-sky-500 text-[#131f24] text-xs font-bold px-3 py-1 rounded-full uppercase z-10">
                Quiz
            </div>

            <div className="w-full max-w-xl flex flex-col gap-4">
                <h2 className="text-lg md:text-2xl text-white font-bold leading-normal md:leading-relaxed max-h-[35vh] overflow-y-auto pr-2 scrollbar-none">
                    {data.question}
                </h2>

                <div className="flex flex-col gap-2 md:gap-3">
                    {data.options.map((opt: string) => (
                        <button
                            key={opt}
                            onClick={() => handleSelect(opt)}
                            disabled={status !== "idle"}
                            className={cn(
                                "p-3 md:p-4 rounded-xl border-2 text-left font-medium text-sm md:text-lg transition-all",
                                status === "idle" && selected === opt ? "bg-[#37464f] border-[#58cc02] text-white" :
                                    status === "idle" ? "bg-[#1e2a30] border-[#37464f] text-[#afafaf] hover:bg-[#37464f]" :
                                        opt === data.correctOption ? "bg-[#58cc02] border-[#58cc02] text-white" :
                                            selected === opt ? "bg-[#ff4b4b] border-[#ff4b4b] text-white" :
                                                "bg-[#1e2a30] border-[#37464f] text-[#afafaf] opacity-50"
                            )}
                        >
                            {opt}
                        </button>
                    ))}
                </div>

                {status !== "idle" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 bg-[#1e2a30] p-4 rounded-xl border border-[#37464f]">
                        <p className={cn("font-bold text-lg mb-1", status === "correct" ? "text-[#58cc02]" : "text-[#ff4b4b]")}>
                            {status === "correct" ? "Correct! 🎉" : "Incorrect"}
                        </p>
                        <p className="text-[#afafaf] text-sm">{data.hint || (status === "wrong" ? `Correct was: ${data.correctOption}` : "Good job!")}</p>
                    </div>
                )}
            </div>

        </div>
    )
}
