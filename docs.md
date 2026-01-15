# nazo. - Documentation

## 1. Project Overview
**nazo.** is a gamified AI-powered learning platform designed to help students and learners generate study materials like Quizzes and Flashcards instantly from any topic or text. The platform focuses on a premium, interactive user experience with a "cartoonish" and "playful" aesthetic.

## 2. Key Features
- **AI Quiz Generator:** Generate multiple-choice or short-answer questions from any text using Google Gemini AI.
- **AI Flashcard Generator:** Create digital flashcards for quick revision.
- **Customizable Difficulty:** Options for Easy, Medium, Hard, and Expert levels.
- **Adjustable Quantity:** Generate anywhere from 5 to 120 questions/cards at once.
- **Playful Sidebar:** Navigation inspired by Duolingo with vibrant icons and animated states.
- **Dual Input Modes:** 
    - **Topic Mode:** AI uses its vast internal knowledge to generate comprehensive quizzes/cards on any subject.
    - **Text Mode:** AI strictly analyzes user-provided notes/text to create content without adding external info.
- **Interactive Flashcards:** 3D Flip animations with a focused "Study Mode" interface.
- **Daily Mix (Reels):** A scrollable feed of mixed quizzes and flashcards tailored by an SRS algorithm based on user proficiency (Points) and Time decay.
- **Sleek UX:** Modern dropdowns with checkmarks, custom scrollbars, and premium glassmorphism effects.

## 3. Technology Stack
- **Framework:** Next.js 15+ (App Router)
- **Styling:** Tailwind CSS 4.0
- **AI Engine:** Google Gemini Pro 1.5
- **Backend/Auth:** Appwrite (Endpoint: `https://sgp.cloud.appwrite.io/v1`)
- **State Management:** React Hooks (useState, useEffect, useRef)
- **Icons:** Lucide React
- **Rich Text Rendering:** Quill (using `react-quill-new`)
- **Fonts:** Changa One (for branding), Inter (for UI text), Balsamiq Sans (for study mode).

## 4. Database Schema (Appwrite)
### Table: `quizzes` (Collection ID: `NEXT_PUBLIC_APPWRITE_QUIZZES_COLLECTION_ID`)
- **title** (string, required): Title of the quiz.
- **description** (string, optional): Short description.
- **category** (string, optional): Topic category.

### Table: `quiz_items` (Collection ID: `NEXT_PUBLIC_APPWRITE_QUIZ_ITEMS_COLLECTION_ID`)
- **question** (string, required): Question text.
- **correctOption** (string, required): The correct answer string.
- **points** (integer, required): Points per question (default: 10).
- **difficulty** (enum/string, optional): Easy, Medium, Hard, Expert.
- **hint** (string, optional): Helper text.
- **options** (string[], required): Array of possible answers.
### Table: `flashcards` (Collection ID: `NEXT_PUBLIC_APPWRITE_FLASHCARDS_COLLECTION_ID`)
- **title** (string, required): Title of the flashcard deck.
- **description** (string, required): Short description.

### Table: `flashcard_items` (Collection ID: `NEXT_PUBLIC_APPWRITE_FLASHCARD_ITEMS_COLLECTION_ID`)
- **front** (string, required): Front text (question).
- **back** (string, required): Back text (answer).
- **hint** (string, required): Subtle clue.
- **difficulty** (enum/string, required): Easy, Medium, Hard, Expert.
- **flashcard_id** (relationship): Linked to `flashcards` table.

## 5. System Architecture
### Frontend
- **Layouts:** `app/(root)/layout.tsx` manages the global structure with Sidebar.
- **Quiz Player:** `app/quiz/[id]/page.tsx` runs in a simplified, distraction-free layout.
- **Components:**
    - `Sidebar`: Navigation.
    - `QuizGenerator`: Creation interface.
    - `QuizCard` / `FlashcardCard`: Display units.
    - `QuizPlayer`: Interactive game interface with realtime score persistence.

## 6. Scoring Mechanics
- **Base Strength:** Each question starts with a default "Strength" of **3.0**.
- **Correct Answer:** +0.5 Strength.
- **Incorrect Answer:** -0.5 Strength.
- **Hint Penalty:** -0.25 Strength per usage.
- **Hint Display:** Hints appear in a temporary, auto-dismissing pop-up to assist without breaking flow.
- **Goal:** Increase the total strength of the deck/quiz.

## 7. Environment Variables
- **Model:** Google Gemini Pro 1.5
- **Input:** User-provided text or topic.
- **Output:** Structured JSON containing:
    - **Quiz:** questions, options, answer, explanation.
    - **Flashcards:** front, back, hint.
- **Prompt Engineering:** Custom system instructions to ensure high-quality educational content.

## 5. Environment Variables
To run the project, ensure you have the following in your `.env.local`:
```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_id
GEMINI_API_KEY=your_gemini_api_key
```

## 6. Layout & Design Tokens
- **Primary Green:** `#58cc02` (used for branding and buttons)
- **Deep Blue Background:** `#131f24` (dark mode surface)
- **Active State Highlight:** `#84d8ff` (text) and `#2d4653` (background)
- **Shadows:** Offset "Cartoon" shadows for buttons and containers.
