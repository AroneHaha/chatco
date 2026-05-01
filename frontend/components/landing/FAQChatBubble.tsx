"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { faqCategories, FAQItem } from "@/lib/faq-data";

interface ChatMessage {
  id: number;
  type: "question" | "answer";
  text: string;
  category?: string;
}

export default function FAQChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("getting-started");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showCategories, setShowCategories] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mouse wheel → horizontal scroll on category pills
  const handleCategoryWheel = useCallback((e: React.WheelEvent) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY * 2;
  }, []);

  // Drag to scroll on category pills
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
  }, []);

  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = categoryScrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    el.scrollLeft = scrollLeft.current - walk;
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Welcome message on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const timer = setTimeout(() => {
        setMessages([
          {
            id: msgIdRef.current++,
            type: "answer",
            text: "Hey there! 👋 How can I help you today? Pick a category or ask away!",
          },
        ]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuestionClick = (item: FAQItem, categoryLabel: string) => {
    const qMsg: ChatMessage = {
      id: msgIdRef.current++,
      type: "question",
      text: item.question,
      category: categoryLabel,
    };
    const aMsg: ChatMessage = {
      id: msgIdRef.current++,
      type: "answer",
      text: item.answer,
    };

    setMessages((prev) => [...prev, qMsg]);
    setShowCategories(false);

    setTimeout(() => {
      setMessages((prev) => [...prev, aMsg]);
    }, 500);
  };

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setShowCategories(true);
  };

  const handleReset = () => {
    setMessages([
      {
        id: msgIdRef.current++,
        type: "answer",
        text: "Hey there! 👋 How can I help you today? Pick a category or ask away!",
      },
    ]);
    setShowCategories(true);
    setActiveCategory("getting-started");
  };

  const currentCategory = faqCategories.find((c) => c.id === activeCategory);

  return (
    <>
      {/* Chat Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-[#1A5FB4]/40 active:scale-95 ${
          isOpen ? "rotate-0" : "animate-bounce-slow"
        }`}
        aria-label="Open FAQ chat"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 transition-all duration-300 ease-out origin-bottom-right ${
          isOpen
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        }`}
        style={{ width: "400px", maxWidth: "calc(100vw - 3rem)" }}
      >
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden flex flex-col" style={{ height: "560px", maxHeight: "calc(100vh - 8rem)" }}>

          {/* Header */}
          <div className="bg-[#1A5FB4] px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">CHATCO FAQ</p>
                <p className="text-white/60 text-xs">We're here to help!</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-white/60 hover:text-white transition-colors p-1"
              title="Reset chat"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === "question" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.type === "question"
                      ? "bg-[#1A5FB4] text-white rounded-br-md"
                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                  }`}
                >
                  {msg.type === "answer" && msg.category && (
                    <span className="inline-block text-[10px] font-semibold text-[#1A5FB4] bg-[#1A5FB4]/10 px-2 py-0.5 rounded-full mr-1 mb-1">
                      {msg.category}
                    </span>
                  )}
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Divider */}
          <div className="flex-shrink-0 h-px bg-gray-100 mx-4" />

          {/* Category Pills - scrollable by wheel + drag */}
          <div className="px-4 pt-3 pb-1 flex-shrink-0">
            <div
              ref={categoryScrollRef}
              onWheel={handleCategoryWheel}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: "pan-x" }}
            >
              {faqCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                    activeCategory === cat.id
                      ? "bg-[#1A5FB4] text-white shadow-md shadow-[#1A5FB4]/20"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Questions List */}
          {showCategories && currentCategory && (
            <div className="px-4 pb-4 space-y-1.5 flex-shrink-0 overflow-y-auto" style={{ touchAction: "pan-y" }}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                {currentCategory.emoji} {currentCategory.label}
              </p>
              {currentCategory.items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuestionClick(item, currentCategory.label)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-[#1A5FB4]/5 hover:text-[#1A5FB4] transition-all duration-200 flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A5FB4]/40 group-hover:bg-[#1A5FB4] transition-colors flex-shrink-0" />
                  {item.question}
                </button>
              ))}
            </div>
          )}

          {/* Back to questions button */}
          {!showCategories && (
            <div className="px-4 pb-4 flex-shrink-0">
              <button
                onClick={() => setShowCategories(true)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-[#1A5FB4] hover:bg-[#1A5FB4]/5 transition-all duration-200"
              >
                ← Back to questions
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}