import { QuizGenerator } from "@/components/quiz-generator";

export default function Page() {
    return (
        <div className="w-full max-w-7xl mx-auto p-4 pl-2 lg:p-8 flex-1 h-full flex flex-col items-center justify-center">
            <QuizGenerator />
        </div>
    );
}