import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { getVaccineAssistantResponse } from '../services/gemini';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FALLBACK_RESPONSES = {
  "What vaccines does my 2-year-old need?": 
    "For a 2-year-old child, recommended vaccines typically include: DTaP (diphtheria, tetanus, pertussis), IPV (polio), MMR (measles, mumps, rubella), Varicella (chickenpox), and annual flu shots. Please consult with your pediatrician for specific recommendations based on your child's health history.",
  
  "How do vaccines work?": 
    "Vaccines work by imitating an infection without causing illness. This prompts your immune system to produce antibodies and memory cells against the pathogen. When you encounter the real disease-causing organism later, your immune system recognizes it and quickly produces antibodies to fight it off, preventing illness.",
  
  "Are vaccines safe?": 
    "Yes, vaccines are generally very safe. They undergo extensive testing and monitoring. While side effects can occur, they're typically mild and temporary. The benefits of preventing serious diseases far outweigh the potential risks. Vaccines have successfully reduced or eliminated many dangerous diseases worldwide.",
  
  "Common vaccine side effects?": 
    "Common vaccine side effects include: mild fever, soreness or redness at the injection site, fatigue, headache, and mild muscle aches. These typically resolve within a few days. Serious side effects are very rare. If you experience severe reactions, contact your healthcare provider immediately.",
  
  "When should I get a flu shot?": 
    "The best time to get a flu shot is before flu season begins, ideally by the end of October. However, getting vaccinated later is still beneficial. Flu season can last into spring, so getting the vaccine even in January can provide protection. Annual vaccination is recommended as flu viruses evolve each year."
};

const VaccineAssistantScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm VaxBot, your vaccine assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef();
  
  // Sample suggested queries that might be helpful for users
  const suggestedQueries = [
    "What vaccines does my 2-year-old need?",
    "How do vaccines work?",
    "Are vaccines safe?",
    "Common vaccine side effects?",
    "When should I get a flu shot?"
  ];

  // Function for getting fallback responses when API fails
  const getFallbackResponse = (query) => {
    // Try to match query exactly first
    if (FALLBACK_RESPONSES[query]) {
      return FALLBACK_RESPONSES[query];
    }
    
    // Try to find keywords
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes("2-year") || lowerQuery.includes("2 year") || lowerQuery.includes("toddler")) {
      return FALLBACK_RESPONSES["What vaccines does my 2-year-old need?"];
    }
    
    if (lowerQuery.includes("how") && (lowerQuery.includes("work") || lowerQuery.includes("function"))) {
      return FALLBACK_RESPONSES["How do vaccines work?"];
    }
    
    if (lowerQuery.includes("safe")) {
      return FALLBACK_RESPONSES["Are vaccines safe?"];
    }
    
    if (lowerQuery.includes("side effect") || lowerQuery.includes("reaction")) {
      return FALLBACK_RESPONSES["Common vaccine side effects?"];
    }
    
    if (lowerQuery.includes("flu") || lowerQuery.includes("influenza")) {
      return FALLBACK_RESPONSES["When should I get a flu shot?"];
    }
    
    // Default fallback response
    return "I'm sorry, I don't have specific information about that. For accurate vaccine information, please consult with a healthcare professional or visit reputable sources like the CDC or WHO websites.";
  };

  // Function to handle sending a message
  const sendMessage = async (text = inputText) => {
    if (!text.trim()) return;
    
    // Add user message to the chat
    const userMessage = {
      id: messages.length + 1,
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      // First try to get response from Gemini API
      let response;
      try {
        response = await getVaccineAssistantResponse(text.trim());
      } catch (apiError) {
        console.error("API Error:", apiError);
        // If API fails, use fallback response
        console.log("Using fallback response system");
        response = getFallbackResponse(text.trim());
      }
      
      // Add assistant's response to the chat
      const assistantMessage = {
        id: messages.length + 2,
        text: response,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error("Error getting assistant response:", error);
      
      // Add error message
      const errorMessage = {
        id: messages.length + 2,
        text: "I'm sorry, I encountered an error processing your request. Please try again later.",
        isUser: false,
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Format timestamp
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>VaxBot Assistant</Text>
          <Text style={styles.headerSubtitle}>AI-powered vaccine information</Text>
        </View>
      </View>

      {/* Chat Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View 
            key={message.id} 
            style={[
              styles.messageBubble, 
              message.isUser ? styles.userMessage : styles.assistantMessage,
              message.isError && styles.errorMessage
            ]}
          >
            {!message.isUser && (
              <View style={styles.assistantIconContainer}>
                <Image 
                  source={require('../assets/icons/robot.png')} 
                  style={styles.assistantIcon} 
                />
              </View>
            )}
            <View style={styles.messageContent}>
              <Text style={[
                styles.messageText, 
                message.isUser ? styles.userMessageText : styles.assistantMessageText
              ]}>
                {message.text}
              </Text>
              <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
            </View>
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.loadingText}>VaxBot is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Suggested Queries */}
      {messages.length < 3 && (
        <View style={styles.suggestedQueriesContainer}>
          {suggestedQueries.map((query, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestedQuery}
              onPress={() => sendMessage(query)}
            >
              <Text style={styles.suggestedQueryText} numberOfLines={1} ellipsizeMode="tail">
                {query}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask about vaccines..."
          placeholderTextColor="#1E3A8A"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={300}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity 
          onPress={() => sendMessage()}
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled
          ]}
          disabled={!inputText.trim()}
        >
          <Image 
            source={require('../assets/icons/send.png')} 
            style={styles.sendIcon} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 5,
  },
  headerContent: {
    marginLeft: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#E0EEFF',
    fontSize: 12,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
  },
  messageBubble: {
    marginBottom: 15,
    maxWidth: '85%',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
  },
  userMessage: {
    backgroundColor: '#E3EFFD',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  assistantMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  errorMessage: {
    backgroundColor: '#FFF2F2',
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  assistantIconContainer: {
    marginRight: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E3EFFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantIcon: {
    width: 20,
    height: 20,
    tintColor: '#4A90E2',
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#2E4057',
  },
  assistantMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0F7FF',
    padding: 10,
    borderRadius: 18,
    marginBottom: 15,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#4A90E2',
  },
  suggestedQueriesContainer: {
    padding: 10,
    backgroundColor: '#F0F7FF',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  suggestedQuery: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D0E1F9',
    minWidth: 80,
    maxWidth: 150,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  suggestedQueryText: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '500',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F7FF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#1E3A8A',
  },
  sendButton: {
    backgroundColor: '#1E3A8A',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  sendIcon: {
    width: 24,
    height: 24,
    tintColor: 'white',
  },
});

export default VaccineAssistantScreen; 