"use client"

import * as React from "react"
import { getQuizzesAction } from "@/lib/actions/quiz.actions"
import { QuizCard } from "@/components/quiz-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

export default function QuizzesPage() {
    const [quizzes, setQuizzes] = React.useState<any[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [page, setPage] = React.useState(1)
    const [hasMore, setHasMore] = React.useState(false)

    React.useEffect(() => {
        const fetchQuizzes = async () => {
            setIsLoading(true)
            const result = await getQuizzesAction(page)

            if (result.success) {
                setQuizzes(result.data)
                setHasMore(result.hasMore!)
            } else {
                console.error(result.error)
            }
            setIsLoading(false)
        }

        fetchQuizzes()
    }, [page])

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 p-4 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="font-changa text-4xl text-foreground">
                    Explore Quizzes<span className="text-[#58cc02]">.</span>
                </h1>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="w-10 h-10 text-[#58cc02] animate-spin" />
                </div>
            ) : quizzes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map((quiz) => (
                        <QuizCard
                            key={quiz.$id}
                            id={quiz.$id}
                            title={quiz.title}
                            description={quiz.description}
                            category={quiz.category}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[50vh] text-[#afafaf]">
                    <p className="text-xl font-medium">No quizzes found.</p>
                    <p className="text-sm">Generate some using the home page!</p>
                </div>
            )}

            {/* Pagination */}
            {!isLoading && quizzes.length > 0 && (
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
