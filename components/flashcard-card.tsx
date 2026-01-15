"use client"

import { cn } from "@/lib/utils"
import { Layers, Play } from "lucide-react"
import Link from "next/link"

interface FlashcardCardProps {
    id: string
    title: string
    description: string
}

// Function to generate deterministic colorful gradients based on text
const generateGradient = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
        ["#8EC5FC", "#E0C3FC"], // Blue to Purple
        ["#85FFBD", "#FFFB7D"], // Green to Yellow
        ["#FF9A9E", "#FECFEF"], // Pink
        ["#84FAB0", "#8FD3F4"], // Aqua
        ["#FBAB7E", "#F7CE68"], // Orange
    ];

    const index = Math.abs(hash) % colors.length;
    const angle = Math.abs(hash) % 360;

    return `linear-gradient(${angle}deg, ${colors[index][0]}, ${colors[index][1]})`;
};

// Function to generate a deterministic pattern
const generatePatternOverlay = (text: string) => {
    const hash = text.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return hash % 2 === 0
        ? "radial-gradient(circle, rgba(255,255,255,0.2) 2px, transparent 2.5px)"
        : "linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent)"
}

export function FlashcardCard({ id, title, description }: FlashcardCardProps) {
    const gradient = generateGradient(title);
    const pattern = generatePatternOverlay(title);

    return (
        <div className="group relative flex flex-col bg-[#131f24] border-2 border-[#37464f] rounded-2xl overflow-hidden hover:border-[#58cc02] hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
            {/* Dynamic Header Image */}
            <div
                className="h-40 w-full relative p-6 flex flex-col justify-end"
                style={{ background: gradient }}
            >
                <div
                    className="absolute inset-0 opacity-30"
                    style={{ backgroundImage: pattern, backgroundSize: '20px 20px' }}
                />

                {/* Badge */}
                <span className="relative z-10 self-start bg-black/30 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-2 border border-white/20">
                    Deck
                </span>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-changa text-xl text-[#e5e5e5] mb-2 leading-tight line-clamp-2 group-hover:text-[#58cc02] transition-colors">
                    {title}
                </h3>
                <p className="text-[#afafaf] text-sm leading-relaxed mb-6 line-clamp-3 flex-1 font-medium">
                    {description || "No description available for this deck."}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-[#37464f] pt-4 mt-auto">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-bold text-[#afafaf]">Stack</span>
                    </div>

                    <Link href={`/flashcards/${id}`} className="flex items-center gap-2 text-white bg-[#37464f] hover:bg-[#58cc02] hover:text-[#131f24] px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300">
                        Study <Play className="w-3 h-3 fill-current" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
