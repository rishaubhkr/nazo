import React from 'react';
import { QuizGenerator } from './components/QuizGenerator';
import { View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 bg-black">
      <QuizGenerator />
    </View>
  );
}
