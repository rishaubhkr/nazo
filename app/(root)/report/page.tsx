"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { getUserPerformanceAction } from "@/lib/actions/performance.actions"
import { account } from "@/lib/appwrite"
import { cn } from "@/lib/utils"
import {
    TrendingUp,
    TrendingDown,
    Target,
    Brain,
    Zap,
    BookOpen,
    Award,
    Calendar,
    BarChart3,
    Lightbulb,
    ArrowLeft,
    Loader2
} from "lucide-react"

export default function PerformanceReportPage() {
    const router = useRouter()
    const [loading, setLoading] = React.useState(true)
    const [performanceData, setPerformanceData] = React.useState<any>(null)

    React.useEffect(() => {
        const fetchPerformance = async () => {
            let jwt: string | undefined
            try {
                const session = await account.createJWT()
                jwt = session.jwt
            } catch (e) { }

            const result = await getUserPerformanceAction(jwt)
            if (result.success) {
                setPerformanceData(result.data)
            }
            setLoading(false)
        }
        fetchPerformance()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#131f24]">
                <Loader2 className="w-12 h-12 text-[#58cc02] animate-spin" />
            </div>
        )
    }

    if (!performanceData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#131f24] text-[#afafaf]">
                <h1 className="text-2xl font-changa">No Performance Data Available</h1>
                <button onClick={() => router.push("/")} className="mt-4 text-[#58cc02] hover:underline">Go Home</button>
            </div>
        )
    }

    const { quizStats, flashcardStats, overallStats } = performanceData

    // Calculate performance level
    const getPerformanceLevel = (avgScore: number) => {
        if (avgScore >= 3) return { label: "Excellent", color: "text-[#58cc02]", bg: "bg-[#58cc02]/10" }
        if (avgScore >= 1) return { label: "Good", color: "text-sky-400", bg: "bg-sky-400/10" }
        if (avgScore >= -1) return { label: "Fair", color: "text-amber-400", bg: "bg-amber-400/10" }
        return { label: "Needs Work", color: "text-[#ff4b4b]", bg: "bg-[#ff4b4b]/10" }
    }

    const overallLevel = getPerformanceLevel(overallStats.averagePerformance)

    // Make It Stick principles and tips
    const makeItStickTips = [
        {
            icon: Brain,
            title: "Spaced Repetition",
            description: "Review material at increasing intervals. Don't cram - spread your study sessions over time.",
            recommendation: quizStats.weakAreas.length > 0
                ? `Focus on: ${quizStats.weakAreas.join(", ")}. Review these topics tomorrow, then in 3 days, then in a week.`
                : "Keep reviewing your strong areas periodically to maintain mastery."
        },
        {
            icon: Zap,
            title: "Interleaving",
            description: "Mix different topics in a single study session instead of blocking by subject.",
            recommendation: "Try alternating between quizzes and flashcards from different categories in your next session."
        },
        {
            icon: Target,
            title: "Retrieval Practice",
            description: "Test yourself frequently. The act of recalling strengthens memory more than re-reading.",
            recommendation: flashcardStats.strugglingCards > 0
                ? `You have ${flashcardStats.strugglingCards} struggling cards. Practice retrieving these without looking at the answer first.`
                : "Great job! Keep testing yourself regularly to maintain strong recall."
        },
        {
            icon: Lightbulb,
            title: "Elaboration",
            description: "Connect new information to what you already know. Ask yourself how concepts relate.",
            recommendation: "When studying, try to explain concepts in your own words and relate them to real-world examples."
        }
    ]

    return (
        <div className="min-h-screen bg-[#131f24] text-foreground font-balsamiq">
            {/* Header */}
            <div className="bg-linear-to-br from-[#1e2a30] to-[#131f24] border-b-2 border-[#37464f]">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[#afafaf] hover:text-white transition-colors mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </button>

                    <div className="flex items-start justify-between gap-6 flex-wrap">
                        <div>
                            <h1 className="text-4xl font-changa font-bold text-white mb-3">Performance Report</h1>
                            <p className="text-[#afafaf] text-lg">Your learning journey at a glance</p>
                        </div>

                        <div className={cn(
                            "px-6 py-4 rounded-2xl border-2",
                            overallLevel.bg,
                            overallLevel.color
                        )}>
                            <div className="flex items-center gap-3">
                                <Award className="w-8 h-8" />
                                <div>
                                    <p className="text-sm opacity-80">Overall Performance</p>
                                    <p className="text-2xl font-bold">{overallLevel.label}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Overall Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        icon={BookOpen}
                        label="Total Items"
                        value={overallStats.totalItems}
                        color="text-sky-400"
                    />
                    <StatCard
                        icon={Target}
                        label="Total Points"
                        value={overallStats.totalPoints}
                        color="text-[#58cc02]"
                    />
                    <StatCard
                        icon={BarChart3}
                        label="Avg Performance"
                        value={overallStats.averagePerformance.toFixed(2)}
                        color="text-amber-400"
                    />
                    <StatCard
                        icon={Calendar}
                        label="Last Study"
                        value={overallStats.lastStudyDate
                            ? new Date(overallStats.lastStudyDate).toLocaleDateString()
                            : "N/A"}
                        color="text-purple-400"
                    />
                </div>

                {/* Quiz & Flashcard Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Quiz Stats */}
                    <div className="bg-[#1e2a30] border-2 border-[#37464f] rounded-2xl p-6">
                        <h2 className="text-2xl font-changa font-bold text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-400/20 rounded-xl flex items-center justify-center">
                                <Target className="w-6 h-6 text-amber-400" />
                            </div>
                            Quiz Performance
                        </h2>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[#afafaf]">Total Quizzes</span>
                                <span className="text-white font-bold text-lg">{quizStats.totalQuizzes}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[#afafaf]">Total Questions</span>
                                <span className="text-white font-bold text-lg">{quizStats.totalQuestions}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[#afafaf]">Average Score</span>
                                <span className={cn(
                                    "font-bold text-lg",
                                    getPerformanceLevel(quizStats.averageScore).color
                                )}>
                                    {quizStats.averageScore.toFixed(2)}
                                </span>
                            </div>

                            {quizStats.strongAreas.length > 0 && (
                                <div className="pt-4 border-t border-[#37464f]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-4 h-4 text-[#58cc02]" />
                                        <span className="text-[#58cc02] font-bold text-sm">Strong Areas</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {quizStats.strongAreas.map((area: string) => (
                                            <span key={area} className="px-3 py-1 bg-[#58cc02]/10 text-[#58cc02] rounded-full text-xs font-bold">
                                                {area}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {quizStats.weakAreas.length > 0 && (
                                <div className="pt-4 border-t border-[#37464f]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingDown className="w-4 h-4 text-[#ff4b4b]" />
                                        <span className="text-[#ff4b4b] font-bold text-sm">Needs Improvement</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {quizStats.weakAreas.map((area: string) => (
                                            <span key={area} className="px-3 py-1 bg-[#ff4b4b]/10 text-[#ff4b4b] rounded-full text-xs font-bold">
                                                {area}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Flashcard Stats */}
                    <div className="bg-[#1e2a30] border-2 border-[#37464f] rounded-2xl p-6">
                        <h2 className="text-2xl font-changa font-bold text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-sky-400/20 rounded-xl flex items-center justify-center">
                                <Brain className="w-6 h-6 text-sky-400" />
                            </div>
                            Flashcard Performance
                        </h2>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[#afafaf]">Total Decks</span>
                                <span className="text-white font-bold text-lg">{flashcardStats.totalDecks}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[#afafaf]">Total Cards</span>
                                <span className="text-white font-bold text-lg">{flashcardStats.totalCards}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[#afafaf]">Average Score</span>
                                <span className={cn(
                                    "font-bold text-lg",
                                    getPerformanceLevel(flashcardStats.averageScore).color
                                )}>
                                    {flashcardStats.averageScore.toFixed(2)}
                                </span>
                            </div>

                            <div className="pt-4 border-t border-[#37464f] space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-[#58cc02] rounded-full"></div>
                                        <span className="text-[#afafaf]">Mastered Cards</span>
                                    </div>
                                    <span className="text-[#58cc02] font-bold text-lg">{flashcardStats.masteredCards}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-[#ff4b4b] rounded-full"></div>
                                        <span className="text-[#afafaf]">Struggling Cards</span>
                                    </div>
                                    <span className="text-[#ff4b4b] font-bold text-lg">{flashcardStats.strugglingCards}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Make It Stick Tips */}
                <div className="bg-linear-to-br from-[#1e2a30] to-[#131f24] border-2 border-[#58cc02]/30 rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-[#58cc02]/20 rounded-xl flex items-center justify-center">
                            <Lightbulb className="w-7 h-7 text-[#58cc02]" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-changa font-bold text-white">Study Tips</h2>
                            <p className="text-[#afafaf]">Based on "Make It Stick" principles</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {makeItStickTips.map((tip, idx) => (
                            <div key={idx} className="bg-[#131f24] border border-[#37464f] rounded-xl p-6 hover:border-[#58cc02] transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-[#58cc02]/10 rounded-lg flex items-center justify-center shrink-0">
                                        <tip.icon className="w-6 h-6 text-[#58cc02]" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-2">{tip.title}</h3>
                                        <p className="text-[#afafaf] text-sm mb-3 leading-relaxed">{tip.description}</p>
                                        <div className="bg-[#58cc02]/5 border border-[#58cc02]/20 rounded-lg p-3">
                                            <p className="text-[#58cc02] text-sm font-medium leading-relaxed">
                                                💡 {tip.recommendation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center mt-12">
                    <button
                        onClick={() => router.push("/quizzes")}
                        className="px-8 py-4 bg-[#58cc02] hover:bg-[#6be010] text-white font-bold rounded-2xl border-b-4 border-[#46a302] active:border-b-0 active:translate-y-1 transition-all"
                    >
                        Practice Quizzes
                    </button>
                    <button
                        onClick={() => router.push("/flashcards")}
                        className="px-8 py-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl border-b-4 border-sky-700 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        Study Flashcards
                    </button>
                </div>
            </div>
        </div>
    )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
    return (
        <div className="bg-[#1e2a30] border-2 border-[#37464f] rounded-2xl p-6 hover:border-[#58cc02] transition-colors">
            <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color.replace("text-", "bg-") + "/20")}>
                    <Icon className={cn("w-6 h-6", color)} />
                </div>
                <div>
                    <p className="text-[#afafaf] text-sm mb-1">{label}</p>
                    <p className="text-white text-2xl font-bold">{value}</p>
                </div>
            </div>
        </div>
    )
}
