import React, { useState, useRef } from "react"
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Modal,
    SafeAreaView,
    StatusBar,
    Alert
} from "react-native"
import { WebView } from "react-native-webview"
import {
    BrainCircuit,
    Layers,
    ChevronDown,
    Zap,
    Plus,
    Check,
    ArrowRight
} from "lucide-react-native"
import { cn } from "../lib/utils"

const modes = [
    { id: "quiz", label: "Quiz", icon: BrainCircuit, color: "text-purple-400" },
    { id: "flashcards", label: "Flashcards", icon: Layers, color: "text-blue-400" },
]

const difficulties = ["Easy", "Medium", "Hard", "Expert"]
const quantities = ["5", "10", "15", "20", "30", "45", "60", "80", "100", "120"]

const PUTER_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://js.puter.com/v2/"></script>
</head>
<body>
    <script>
        window.generateAI = async (prompt, systemPrompt) => {
            try {
                const fullPrompt = systemPrompt + "\\n\\nUser Content:\\n" + prompt;
                
                const response = await puter.ai.chat(fullPrompt, {
                    model: 'gemini-3-flash-preview'
                });
                
                let text = "";
                if (typeof response === 'string') {
                    text = response;
                } else if (response?.message?.content) {
                    text = response.message.content;
                } else if (response?.text) {
                    text = response.text;
                } else {
                    text = JSON.stringify(response);
                }

                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', data: text }));
            } catch (err) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.toString() }));
            }
        };
    </script>
</body>
</html>
`;

export function QuizGenerator() {
    const [mode, setMode] = useState("quiz")
    const [difficulty, setDifficulty] = useState("Medium")
    const [quantity, setQuantity] = useState("10")
    const [prompt, setPrompt] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [sourceType, setSourceType] = useState<"topic" | "text">("topic")

    // Dropdown Modal States
    const [diffModalVisible, setDiffModalVisible] = useState(false)
    const [qtyModalVisible, setQtyModalVisible] = useState(false)

    const webviewRef = useRef<WebView>(null)

    const handleSubmit = async () => {
        if (!prompt.trim() || isLoading) return

        setIsLoading(true)
        console.log(`Generating ${mode} from ${sourceType}...`)

        // Prepare System Prompt
        const instructionText = sourceType === "topic"
            ? `Generate a ${mode} based on the provided TOPIC.`
            : `Generate a ${mode} STRICTLY based on the provided TEXT.`;

        let systemPrompt = "";
        if (mode === "quiz") {
            systemPrompt = `
You are an expert quiz generator. ${instructionText}
Difficulty: ${difficulty}
Target Quantity: ${quantity}

Reply with valid TOON format.
Structure:
title: String
description: String
category: String
items[${quantity}]{question,optionsString,correctOption,explanation,hint,points}:
"Question text","Option A|Option B|Option C|Option D","Option A","Explanation",Hint,10

Note: The 'optionsString' field MUST be a single string containing 4 options separated by a pipe character ('|'). Do NOT use JSON arrays.
`;
        } else {
            systemPrompt = `
You are an expert flashcard generator. ${instructionText}
Difficulty: ${difficulty}
Target Quantity: ${quantity}

Reply with valid TOON format.
Structure:
title: String
description: String
items[${quantity}]{front,back,hint}
`;
        }

        // Bridge to WebView
        const script = `
            window.generateAI(
                ${JSON.stringify(prompt)}, 
                ${JSON.stringify(systemPrompt)}
            );
            true;
        `;

        webviewRef.current?.injectJavaScript(script);
    }

    const handleWebViewMessage = (event: any) => {
        try {
            const result = JSON.parse(event.nativeEvent.data);
            if (result.type === 'success') {
                console.log("AI Generation Success:", result.data.substring(0, 50) + "...");
                Alert.alert("Success", "Content generated successfully!");
                // Here you would navigate to result screen or save
            } else {
                console.error("AI Generation Error:", result.message);
                Alert.alert("Error", "Generation failed: " + result.message);
            }
        } catch (e: any) {
            console.error("Parse Error", e);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-[#131F24] h-full w-full">
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>

                    {/* Title */}
                    <View className="mb-10 items-center">
                        <Text className="text-6xl text-white font-black tracking-tighter">
                            nazo<Text className="text-[#58cc02]">.</Text>
                        </Text>
                    </View>

                    {/* Generator Box */}
                    <View className="bg-[#1e2a30] border-2 border-[#37464f] rounded-[32px] p-6 w-full shadow-lg">
                        <TextInput
                            placeholder={sourceType === "topic" ? "What topic do you want to learn today?" : "Paste your text/notes here..."}
                            placeholderTextColor="#506672"
                            multiline
                            className="text-xl text-white font-medium min-h-[120px] mb-8 text-start"
                            style={{ textAlignVertical: 'top' }}
                            value={prompt}
                            onChangeText={setPrompt}
                        />

                        {/* Controls Container */}
                        <View className="flex-col gap-4">

                            {/* Mode Selectors */}
                            <View className="bg-[#131f24] rounded-2xl p-1.5 border border-[#37464f] flex-row">
                                {modes.map((m) => {
                                    const Icon = m.icon;
                                    const isActive = mode === m.id;
                                    return (
                                        <TouchableOpacity
                                            key={m.id}
                                            onPress={() => setMode(m.id)}
                                            className={cn(
                                                "flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl transition-all",
                                                isActive ? "bg-[#2d4653]" : "bg-transparent"
                                            )}
                                        >
                                            <Icon size={16} color={isActive ? "#84d8ff" : "#afafaf"} strokeWidth={2.5} />
                                            <Text className={cn(
                                                "text-sm font-bold",
                                                isActive ? "text-[#84d8ff]" : "text-[#afafaf]"
                                            )}>{m.label}</Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>

                            {/* Source Selectors */}
                            <View className="bg-[#131f24] rounded-2xl p-1.5 border border-[#37464f] flex-row">
                                {["topic", "text"].map((s) => {
                                    const isActive = sourceType === s;
                                    return (
                                        <TouchableOpacity
                                            key={s}
                                            onPress={() => setSourceType(s as any)}
                                            className={cn(
                                                "flex-1 items-center justify-center py-3 rounded-xl transition-all",
                                                isActive ? "bg-[#2d4653]" : "bg-transparent"
                                            )}
                                        >
                                            <Text className={cn(
                                                "text-sm font-bold",
                                                isActive ? "text-[#84d8ff]" : "text-[#afafaf]"
                                            )}>{s === "topic" ? "Topic" : "Text"}</Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>

                            {/* Bottom Row: Settings & Submit */}
                            <View className="flex-row items-center gap-3 mt-1">
                                {/* Difficulty & Quantity Group */}
                                <View className="flex-1 flex-row gap-2">
                                    {/* Difficulty Button */}
                                    <TouchableOpacity
                                        onPress={() => setDiffModalVisible(true)}
                                        className="flex-1 h-14 rounded-2xl border border-[#37464f] bg-[#131f24] flex-row items-center justify-center px-3 gap-2"
                                    >
                                        <Zap size={18} color="#fbbf24" fill="#fbbf24" />
                                        <Text className="text-[#afafaf] text-xs font-bold" numberOfLines={1}>{difficulty}</Text>
                                        <ChevronDown size={12} color="#afafaf" className="ml-auto" />
                                    </TouchableOpacity>

                                    {/* Quantity Button */}
                                    <TouchableOpacity
                                        onPress={() => setQtyModalVisible(true)}
                                        className="flex-1 h-14 rounded-2xl border border-[#37464f] bg-[#131f24] flex-row items-center justify-center px-3 gap-2"
                                    >
                                        <Plus size={18} color="#38bdf8" />
                                        <View>
                                            <Text className="text-[#afafaf] text-xs font-bold leading-tight" numberOfLines={1}>
                                                {quantity}
                                            </Text>
                                            <Text className="text-[#506672] text-[10px] font-bold leading-tight">
                                                {mode === "flashcards" ? "Cards" : "Ques"}
                                            </Text>
                                        </View>
                                        <ChevronDown size={12} color="#afafaf" className="ml-auto" />
                                    </TouchableOpacity>
                                </View>

                                {/* Submit Button */}
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={isLoading || !prompt.trim()}
                                    className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-[#58cc02]/20",
                                        prompt.trim() && !isLoading ? "bg-[#58cc02]" : "bg-[#37464f]"
                                    )}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <ArrowRight size={28} color={prompt.trim() ? "white" : "#506672"} strokeWidth={3} />
                                    )}
                                </TouchableOpacity>
                            </View>

                        </View>
                    </View>

                    {/* Suggested Topics */}
                    <View className="flex-row flex-wrap justify-center gap-3 mt-12">
                        {["Organic Chemistry", "World War II", "Python Basics", "French Verbs"].map((topic) => (
                            <TouchableOpacity
                                key={topic}
                                onPress={() => setPrompt(topic)}
                                className="px-6 py-2.5 rounded-full border border-[#37464f] bg-[#1e2a30]/50 active:bg-[#37464f]"
                            >
                                <Text className="text-[#afafaf] text-sm font-bold">{topic}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Hidden WebView for Puter AI */}
                    <View style={{ height: 0, width: 0, overflow: 'hidden' }}>
                        <WebView
                            ref={webviewRef}
                            source={{ html: PUTER_HTML }}
                            onMessage={handleWebViewMessage}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                        />
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Difficulty Modal */}
            <Modal transparent visible={diffModalVisible} animationType="fade" onRequestClose={() => setDiffModalVisible(false)}>
                <TouchableOpacity
                    className="flex-1 bg-black/80 justify-center items-center p-4"
                    activeOpacity={1}
                    onPress={() => setDiffModalVisible(false)}
                >
                    <View className="bg-[#1e2a30] border-2 border-[#37464f] p-3 rounded-3xl w-64 shadow-2xl">
                        <Text className="text-white text-lg font-bold mb-3 px-2">Select Difficulty</Text>
                        {difficulties.map((d) => (
                            <TouchableOpacity
                                key={d}
                                onPress={() => { setDifficulty(d); setDiffModalVisible(false); }}
                                className={cn(
                                    "flex-row items-center justify-between px-4 py-3.5 rounded-xl mb-1",
                                    difficulty === d ? "bg-[#2d4653]" : "active:bg-[#131f24]"
                                )}
                            >
                                <Text className={cn("text-sm font-bold", difficulty === d ? "text-[#84d8ff]" : "text-[#afafaf]")}>{d}</Text>
                                {difficulty === d && <Check size={16} color="#84d8ff" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Quantity Modal */}
            <Modal transparent visible={qtyModalVisible} animationType="fade" onRequestClose={() => setQtyModalVisible(false)}>
                <TouchableOpacity
                    className="flex-1 bg-black/80 justify-center items-center p-4"
                    activeOpacity={1}
                    onPress={() => setQtyModalVisible(false)}
                >
                    <View className="bg-[#1e2a30] border-2 border-[#37464f] p-3 rounded-3xl w-64 max-h-[500px] shadow-2xl">
                        <Text className="text-white text-lg font-bold mb-3 px-2">Select Quantity</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {quantities.map((q) => (
                                <TouchableOpacity
                                    key={q}
                                    onPress={() => { setQuantity(q); setQtyModalVisible(false); }}
                                    className={cn(
                                        "flex-row items-center justify-between px-4 py-3.5 rounded-xl mb-1",
                                        quantity === q ? "bg-[#2d4653]" : "active:bg-[#131f24]"
                                    )}
                                >
                                    <Text className={cn("text-sm font-bold", quantity === q ? "text-[#84d8ff]" : "text-[#afafaf]")}>
                                        {q} {mode === "flashcards" ? "Cards" : "Ques"}
                                    </Text>
                                    {quantity === q && <Check size={16} color="#84d8ff" />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

        </SafeAreaView>
    )
}
