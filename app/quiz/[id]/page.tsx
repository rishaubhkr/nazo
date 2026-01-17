"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { getQuizByIdAction } from "@/lib/actions/quiz.actions"
import { updateQuizPointsAction } from "@/lib/actions/points.actions"
import { cn } from "@/lib/utils"
import { X, Settings, Loader2 } from "lucide-react"
import confetti from "canvas-confetti"
import { account } from "@/lib/appwrite"
import Sidebar from "@/components/sidebar"

export default function QuizPlayerPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const quizId = (React.use(params) as any).id;
    const containerRef = React.useRef<HTMLDivElement>(null)

    const [loading, setLoading] = React.useState(true)
    const [quiz, setQuiz] = React.useState<any>(null)
    const [questions, setQuestions] = React.useState<any[]>([])
    const [activeIndex, setActiveIndex] = React.useState(0)
    const [hintVisible, setHintVisible] = React.useState(false)

    React.useEffect(() => {
        const fetchQuiz = async () => {
            let jwt: string | undefined;
            try {
                const session = await account.createJWT();
                jwt = session.jwt;
            } catch (e) { }

            const result = await getQuizByIdAction(quizId, jwt)
            if (result.success) {
                setQuiz(result.quiz)
                setQuestions(result.questions!)
            }
            setLoading(false)
        }
        fetchQuiz()
    }, [quizId])

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

        const currentQuestion = questions[activeIndex]
        await updateQuizPointsAction(currentQuestion.$id, -1)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#131f24]">
                <Loader2 className="w-12 h-12 text-[#58cc02] animate-spin" />
            </div>
        )
    }

    if (!quiz || questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#131f24] text-[#afafaf]">
                <h1 className="text-2xl font-changa">Quiz Not Found</h1>
                <button onClick={() => router.push("/quizzes")} className="mt-4 text-[#58cc02] hover:underline">Go Back</button>
            </div>
        )
    }

    const progressPercentage = ((activeIndex + 1) / questions.length) * 100

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
                        <p className="font-bold text-sm">💡 {questions[activeIndex]?.hint || "No hint available for this one!"}</p>
                    </div>
                )}

                {/* Vertical Scroll Container */}
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-[#131f24] scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    {questions.map((question, idx) => (
                        <div key={question.$id} className="h-screen w-full snap-start relative">
                            {Math.abs(activeIndex - idx) <= 1 && (
                                <QuizReelItem
                                    data={question}
                                    isActive={activeIndex === idx}
                                    questionNumber={idx + 1}
                                    totalQuestions={questions.length}
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
const playSound = (type: 'correct' | 'wrong') => {
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
    }
}

function QuizReelItem({ data, isActive, questionNumber, totalQuestions }: {
    data: any,
    isActive: boolean,
    questionNumber: number,
    totalQuestions: number
}) {
    const [selected, setSelected] = React.useState<string | null>(null)
    const [status, setStatus] = React.useState<"idle" | "correct" | "wrong">("idle")

    React.useEffect(() => {
        if (!isActive) {
            setSelected(null)
            setStatus("idle")
        }
    }, [isActive])

    // Keyboard handlers
    React.useEffect(() => {
        if (!isActive || status !== "idle") return

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key
            if (key >= '1' && key <= '4') {
                const index = parseInt(key) - 1
                if (index < data.options.length) {
                    handleSelect(data.options[index])
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isActive, status, data.options])

    const handleSelect = async (opt: string) => {
        if (status !== "idle") return
        setSelected(opt)

        const isCorrect = opt === data.correctOption
        setStatus(isCorrect ? "correct" : "wrong")

        playSound(isCorrect ? 'correct' : 'wrong')
        if (navigator.vibrate) navigator.vibrate(isCorrect ? [50, 50, 50] : 200);

        if (isCorrect) {
            confetti({
                origin: { y: 0.7 },
                particleCount: 100,
                spread: 70,
                colors: ['#58cc02', '#ffffff']
            })
        }

        let jwt: string | undefined;
        try {
            const session = await account.createJWT();
            jwt = session.jwt;
        } catch (e) { }

        await updateQuizPointsAction(data.$id, isCorrect ? 1 : -1, jwt)
    }

    const getOptionStyle = (option: string) => {
        if (status === "idle") {
            return selected === option
                ? "bg-[#2d4653] border-[#84d8ff] text-[#84d8ff]"
                : "bg-[#1e2a30] border-[#37464f] text-[#afafaf] hover:bg-[#37464f]"
        }
        if (status === "correct") {
            if (option === data.correctOption) return "bg-[#58cc02] border-[#58cc02] text-white"
            return "bg-[#1e2a30] border-[#37464f] text-[#afafaf] opacity-50"
        }
        if (status === "wrong") {
            if (option === selected) return "bg-[#ff4b4b] border-[#ff4b4b] text-white"
            if (option === data.correctOption) return "bg-[#58cc02] border-[#58cc02] text-white"
            return "bg-[#1e2a30] border-[#37464f] text-[#afafaf] opacity-50"
        }
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 pt-24 relative font-balsamiq bg-[#131f24]">
            {/* Question Number Badge */}
            <div className="absolute top-20 left-6 bg-sky-500 text-[#131f24] text-xs font-bold px-3 py-1 rounded-full uppercase z-10">
                {questionNumber} / {totalQuestions}
            </div>

            <div className="w-full max-w-2xl flex flex-col gap-6">
                <h2 className="text-xl md:text-3xl text-white font-bold leading-normal md:leading-relaxed text-center mb-4">
                    {data.question}
                </h2>

                <div className="flex flex-col gap-3">
                    {data.options.map((opt: string, idx: number) => (
                        <button
                            key={opt}
                            onClick={() => handleSelect(opt)}
                            disabled={status !== "idle"}
                            className={cn(
                                "p-4 md:p-5 rounded-2xl border-2 border-b-4 text-left font-medium text-base md:text-lg transition-all relative group",
                                getOptionStyle(opt),
                                status === "idle" && "active:border-b-2 active:translate-y-[2px]"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <span className={cn(
                                    "flex w-8 h-8 rounded-lg items-center justify-center text-sm font-bold border shrink-0 transition-colors",
                                    selected === opt ? "border-[#84d8ff] text-[#84d8ff]" : "border-[#37464f] text-[#37464f] group-hover:border-[#506672] group-hover:text-[#506672]"
                                )}>
                                    {idx + 1}
                                </span>
                                <span className="leading-relaxed">{opt}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {status !== "idle" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 bg-[#1e2a30] p-5 rounded-2xl border-2 border-[#37464f] mt-2">
                        <p className={cn("font-bold text-xl mb-2", status === "correct" ? "text-[#58cc02]" : "text-[#ff4b4b]")}>
                            {status === "correct" ? "Correct! 🎉" : "Incorrect"}
                        </p>
                        <p className="text-[#afafaf] text-sm leading-relaxed">
                            {data.hint || (status === "wrong" ? `The correct answer was: ${data.correctOption}` : "Great job!")}
                        </p>
                    </div>
                )}
            </div>

            {status === "idle" && (
                <p className="absolute bottom-8 text-[#506672] text-xs font-bold uppercase animate-bounce">
                    Scroll for Next Question
                </p>
            )}
        </div>
    )
}
