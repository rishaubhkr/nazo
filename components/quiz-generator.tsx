"use client"

import * as React from "react"
import {
    Plus,
    Search,
    BrainCircuit,
    Layers,
    ChevronDown,
    ArrowRight,
    Globe,
    Cpu,
    Paperclip,
    Mic,
    Zap,
    Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const modes = [
    { id: "quiz", label: "Quiz", icon: BrainCircuit, color: "text-purple-400" },
    { id: "flashcards", label: "Flashcards", icon: Layers, color: "text-blue-400" },
]

const difficulties = ["Easy", "Medium", "Hard", "Expert"]
const quantities = ["5", "10", "15", "20", "30", "45", "60", "80", "100", "120"]

import {
    generateQuizAction,
    generateFlashcardsAction
} from "@/lib/actions/ai.actions"
import { account } from "@/lib/appwrite"

export function QuizGenerator() {
    const [mode, setMode] = React.useState("quiz")
    const [difficulty, setDifficulty] = React.useState("Medium")
    const [quantity, setQuantity] = React.useState("10")
    const [prompt, setPrompt] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [sourceType, setSourceType] = React.useState<"topic" | "text">("topic")
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea height
    React.useEffect(() => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = "0px"
            const scrollHeight = textarea.scrollHeight
            textarea.style.height = Math.max(100, Math.min(scrollHeight, 400)) + "px"
        }
    }, [prompt])

    const handleSubmit = async () => {
        if (!prompt.trim() || isLoading) return

        setIsLoading(true)
        console.log(`Generating ${mode} from ${sourceType}... Prompt: ${prompt.slice(0, 50)}...`)

        try {
            // Generate a JWT to pass to the server action
            let jwt: string | undefined;
            try {
                const session = await account.createJWT();
                jwt = session.jwt;
                console.log("JWT generated successfully");
            } catch (jwtError) {
                console.warn("Could not generate JWT:", jwtError);
                // Fallback to cookie-only if JWT fails (might happen if truly logged out)
            }

            const result = mode === "quiz"
                ? await generateQuizAction(prompt, difficulty, quantity, sourceType, jwt)
                : await generateFlashcardsAction(prompt, difficulty, quantity, sourceType, jwt)

            if (result.success) {
                console.log("Generation Successful! Result:", result)
            } else {
                console.error("Generation Failed:", result.error)
            }
        } catch (error) {
            console.error("Submission Error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] w-full mx-auto px-4 transition-all duration-500 ease-in-out">
            {/* Title */}
            <h1 className="font-changa text-5xl text-foreground mb-8 tracking-tight">
                nazo<span className="text-[#58cc02] ">.</span>
            </h1>

            {/* Generator Box */}
            {/* Generator Box */}
            <div
                className={cn(
                    "bg-[#1e2a30]/50 border-2 border-[#37464f] rounded-3xl p-5 shadow-2xl focus-within:border-[#58cc02]/40 transition-all duration-500 backdrop-blur-sm ease-in-out",
                    prompt.length > 50 ? "w-full max-w-4xl" : "w-full max-w-3xl"
                )}
            >
                <textarea
                    ref={textareaRef}
                    placeholder={sourceType === "topic" ? "What topic do you want to learn today?" : "Paste your text/notes here..."}
                    className="w-full bg-transparent border-none outline-none resize-none text-lg placeholder:text-[#506672] text-foreground font-medium overflow-y-auto"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    style={{ minHeight: '100px' }}
                />

                <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4 w-full">

                    {/* Top Row: Types (Mode + Source) */}
                    <div className="flex items-center justify-center gap-2 md:gap-3 w-full md:w-auto">
                        {/* Mode Selector */}
                        <div className="flex items-center bg-[#131f24] rounded-2xl p-1 border border-[#37464f] shrink-0">
                            {modes.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setMode(m.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
                                        mode === m.id
                                            ? "bg-[#2d4653] text-[#84d8ff]"
                                            : "text-[#afafaf] hover:text-foreground"
                                    )}
                                >
                                    <m.icon className={cn("w-3.5 h-3.5", mode === m.id ? "text-[#84d8ff]" : m.color)} />
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        {/* Source Type Selector */}
                        <div className="flex items-center bg-[#131f24] rounded-2xl p-1 border border-[#37464f] shrink-0">
                            <button
                                onClick={() => setSourceType("topic")}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
                                    sourceType === "topic" ? "bg-[#2d4653] text-[#84d8ff]" : "text-[#afafaf] hover:text-foreground"
                                )}
                            >
                                Topic
                            </button>
                            <button
                                onClick={() => setSourceType("text")}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
                                    sourceType === "text" ? "bg-[#2d4653] text-[#84d8ff]" : "text-[#afafaf] hover:text-foreground"
                                )}
                            >
                                Text
                            </button>
                        </div>
                    </div>


                    {/* Bottom Row: Settings (Diff + Qty + Go) */}
                    <div className="flex items-center justify-center gap-2 w-full md:w-auto">
                        {/* Difficulty Selector */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 px-3 rounded-xl border-[#37464f] bg-[#131f24] text-[#afafaf] text-xs font-bold hover:bg-[#37464f] hover:text-foreground gap-2">
                                    <Zap className="w-4 h-4 text-amber-400" />
                                    {difficulty}
                                    <ChevronDown className="w-3 h-3 hidden md:block" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#131f24] border-[#37464f] p-1.5 w-32">
                                {difficulties.map((d) => (
                                    <DropdownMenuItem
                                        key={d}
                                        onClick={() => setDifficulty(d)}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors",
                                            difficulty === d
                                                ? "bg-[#2d4653] text-[#84d8ff]"
                                                : "text-[#afafaf] hover:bg-[#37464f] hover:text-foreground"
                                        )}
                                    >
                                        {d}
                                        {difficulty === d && <Check className="w-3.5 h-3.5" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Quantity Selector */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 px-3 rounded-xl border-[#37464f] bg-[#131f24] text-[#afafaf] text-xs font-bold hover:bg-[#37464f] hover:text-foreground gap-2">
                                    <Plus className="w-4 h-4 text-sky-400" />
                                    {quantity} {mode === "flashcards" ? "Cards" : "Ques"}
                                    <ChevronDown className="w-3 h-3 hidden md:block" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#131f24] border-[#37464f] p-1.5 w-40 max-h-[300px] overflow-y-auto">
                                {quantities.map((q) => (
                                    <DropdownMenuItem
                                        key={q}
                                        onClick={() => setQuantity(q)}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors",
                                            quantity === q
                                                ? "bg-[#2d4653] text-[#84d8ff]"
                                                : "text-[#afafaf] hover:bg-[#37464f] hover:text-foreground"
                                        )}
                                    >
                                        <span>{q} {mode === "flashcards" ? "Cards" : "Ques"}</span>
                                        {quantity === q && <Check className="w-3.5 h-3.5" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !prompt.trim()}
                            className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ml-1 md:ml-2 shrink-0",
                                prompt.trim() && !isLoading
                                    ? "bg-[#58cc02] text-white shadow-[0_0_15px_rgba(88,204,2,0.3)] scale-105 active:scale-95"
                                    : "bg-[#37464f] text-[#506672] cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <ArrowRight className="w-5 h-5 stroke-[3px]" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Suggested Topics */}
            <div className="flex flex-wrap justify-center gap-3 mt-10">
                {["Organic Chemistry", "World War II", "Python Basics", "French Verbs"].map((topic) => (
                    <button key={topic} className="px-5 py-2 rounded-full border border-[#37464f] text-[#afafaf] text-sm font-bold hover:bg-[#37464f] hover:text-foreground transition-all">
                        {topic}
                    </button>
                ))}
            </div>
        </div>
    )
}
