"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { getQuizByIdAction } from "@/lib/actions/quiz.actions"
import { updateQuizPointsAction } from "@/lib/actions/points.actions"
import { cn } from "@/lib/utils"
import { X, Heart, Settings, Loader2 } from "lucide-react"
import confetti from "canvas-confetti"

export default function QuizPlayerPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const quizId = (React.use(params) as any).id;

    const [loading, setLoading] = React.useState(true)
    const [quiz, setQuiz] = React.useState<any>(null)
    const [questions, setQuestions] = React.useState<any[]>([])

    // Game State
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
    const [selectedOption, setSelectedOption] = React.useState<string | null>(null)
    const [status, setStatus] = React.useState<"idle" | "correct" | "wrong">("idle")
    const [strengthMap, setStrengthMap] = React.useState<Record<string, number>>({})
    const [hintVisible, setHintVisible] = React.useState(false)

    React.useEffect(() => {
        const fetchQuiz = async () => {
            const result = await getQuizByIdAction(quizId)
            if (result.success) {
                setQuiz(result.quiz)
                setQuestions(result.questions!)

                const initialStrength: Record<string, number> = {}
                result.questions?.forEach((q: any) => {
                    initialStrength[q.$id] = 3.0
                })
                setStrengthMap(initialStrength)
            }
            setLoading(false)
        }
        fetchQuiz()
    }, [quizId])

    const handleOptionSelect = (option: string) => {
        if (status !== "idle") return
        setSelectedOption(option)
    }

    const useHint = async () => {
        if (hintVisible || status !== "idle") return

        setHintVisible(true)
        setTimeout(() => setHintVisible(false), 5000)

        const currentQuestion = questions[currentQuestionIndex]
        await updateQuizPointsAction(currentQuestion.$id, -1)

        setStrengthMap(prev => ({
            ...prev,
            [currentQuestion.$id]: (prev[currentQuestion.$id] || 3.0) - 1
        }))
    }

    const handleCheck = async () => {
        if (!selectedOption || status !== "idle") return

        const currentQuestion = questions[currentQuestionIndex]
        const isCorrect = selectedOption === currentQuestion.correctOption

        setStatus(isCorrect ? "correct" : "wrong")

        await updateQuizPointsAction(currentQuestion.$id, isCorrect ? 1 : -1)

        setStrengthMap(prev => {
            const currentVal = prev[currentQuestion.$id] || 3.0
            return {
                ...prev,
                [currentQuestion.$id]: isCorrect ? currentVal + 1 : currentVal - 1
            }
        })

        if (isCorrect) {
            playSound('correct')
            confetti({
                origin: { y: 0.7 },
                particleCount: 100,
                spread: 70,
                colors: ['#58cc02', '#ffffff']
            })
        } else {
            playSound('wrong')
            if (navigator.vibrate) navigator.vibrate(200);
        }
    }

    // ... existing code ...

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
            setSelectedOption(null)
            setStatus("idle")
            setHintVisible(false)
        } else {
            alert("Quiz Completed!")
            router.push("/quizzes")
        }
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
            <div className="flex flex-col  items-center justify-center min-h-screen bg-[#131f24] text-[#afafaf]">
                <h1 className="text-2xl font-changa">Quiz Not Found</h1>
                <button onClick={() => router.push("/quizzes")} className="mt-4 text-[#58cc02] hover:underline">Go Back</button>
            </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex]
    const progressPercentage = ((currentQuestionIndex) / questions.length) * 100

    const getOptionStyle = (option: string) => {
        if (status === "idle") {
            return selectedOption === option
                ? "bg-[#2d4653] border-[#84d8ff] text-[#84d8ff]"
                : "bg-[#131f24] border-[#37464f] text-[#afafaf] hover:bg-[#1e2a30]"
        }
        if (status === "correct") {
            if (option === currentQuestion.correctOption) return "bg-[#58cc02]/20 border-[#58cc02] text-[#58cc02]"
            return "bg-[#131f24] border-[#37464f] text-[#afafaf] opacity-50"
        }
        if (status === "wrong") {
            if (option === selectedOption) return "bg-[#ff4b4b]/20 border-[#ff4b4b] text-[#ff4b4b]"
            if (option === currentQuestion.correctOption) return "bg-[#58cc02]/20 border-[#58cc02] text-[#58cc02]"
            return "bg-[#131f24] border-[#37464f] text-[#afafaf] opacity-50"
        }
    }

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
                    disabled={status !== "idle" || hintVisible}
                    className="flex items-center gap-2 text-amber-400 font-bold hover:text-amber-300 disabled:opacity-50 transition-colors"
                >
                    <Settings className="w-6 h-6 fill-current animate-pulse" />
                    <span>HINT</span>
                </button>
            </div>

            {/* Hint Dialog Overlay */}
            {hintVisible && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#1e2a30] border-2 border-amber-400 text-amber-400 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.2)] animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm text-center">
                    <p className="font-bold text-sm">💡 {currentQuestion.hint || "No hint available for this one!"}</p>
                </div>
            )}

            {/* Main Game Area */}
            {/* Main Game Area */}
            <div className="flex-1 w-full max-w-4xl mx-auto px-6 overflow-y-auto custom-scrollbar pt-12 pb-40">
                <div className="mb-12 text-center md:text-left">
                    <h2 className="text-xl md:text-2xl font-bold text-[#e5e5e5] mb-4 leading-normal">
                        {currentQuestion.question}
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {currentQuestion.options.map((option: string, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => handleOptionSelect(option)}
                            disabled={status !== "idle"}
                            className={cn(
                                "p-6 rounded-2xl border-2 border-b-4 transition-all duration-200 text-left font-medium text-lg relative group hover:bg-[#1e2a30]",
                                getOptionStyle(option),
                                status === "idle" && "active:border-b-2 active:translate-y-[2px]"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <span className={cn(
                                    "flex w-8 h-8 rounded-lg items-center justify-center text-sm font-bold border flex-shrink-0 transition-colors",
                                    selectedOption === option ? "border-[#84d8ff] text-[#84d8ff]" : "border-[#37464f] text-[#37464f] group-hover:border-[#506672] group-hover:text-[#506672]"
                                )}>
                                    {idx + 1}
                                </span>
                                <span className="leading-relaxed">{option}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className={cn(
                "fixed bottom-0 left-0 right-0 py-6 px-6 border-t font-balsamiq backdrop-blur-xl transition-all duration-300 z-50",
                status === "idle" ? "bg-[#131f24]/80 border-[#37464f]" :
                    status === "correct" ? "bg-[#58cc02]/10 border-[#58cc02]" :
                        "bg-[#ff4b4b]/10 border-[#ff4b4b]"
            )}>
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    {/* Feedback Text Area */}
                    <div className="flex-1">
                        {status === "correct" && (
                            <div className="flex items-center gap-3 animate-in slide-in-from-bottom-2">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                                    <Loader2 className="w-6 h-6 text-[#58cc02] animate-spin" />
                                    {/* Note: Replacing Loader with Check check icon would be better if available, but keeping Loader for now as "Processing points" vibe or just generic success icon place holder */}
                                </div>
                                <div>
                                    <p className="font-extrabold text-[#58cc02] text-xl">Nicely done!</p>
                                </div>
                            </div>
                        )}

                        {status === "wrong" && (
                            <div className="flex flex-col animate-in slide-in-from-bottom-2">
                                <p className="font-extrabold text-[#ff4b4b] text-sm uppercase tracking-wider mb-1">Correct Answer:</p>
                                <p className="text-[#ff4b4b] font-medium text-lg leading-tight">{currentQuestion.correctOption}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={status === "idle" ? handleCheck : handleNext}
                        disabled={status === "idle" && !selectedOption}
                        className={cn(
                            "px-8 py-3 rounded-2xl font-extrabold text-sm uppercase tracking-widest border-b-4 transition-all active:border-b-0 active:translate-y-1 shadow-xl shrink-0",
                            status === "idle"
                                ? (selectedOption ? "bg-[#58cc02] border-[#46a302] text-white hover:bg-[#58cc02]/90" : "bg-[#37464f] border-[#253239] text-[#506672]")
                                : status === "correct"
                                    ? "bg-[#58cc02] border-[#46a302] text-white hover:bg-[#58cc02]/90"
                                    : "bg-[#ff4b4b] border-[#ea2b2b] text-white hover:bg-[#ff4b4b]/90"
                        )}
                    >
                        {status === "idle" ? "Check" : "Continue"}
                    </button>
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
