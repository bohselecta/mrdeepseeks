'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, MessageSquare, Image as ImageIcon, Video, Wand2, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
  onSignIn: () => void;
  onCreateAccount: () => void;
}

export default function OnboardingModal({
  isOpen,
  onClose,
  onContinueAsGuest,
  onSignIn,
  onCreateAccount,
}: OnboardingModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay to allow for smooth entry animation
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl transition-all duration-400 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className={`relative w-full max-w-2xl bg-gray-900/95 border-2 border-purple-500/30 rounded-2xl shadow-2xl p-8 transform transition-all duration-400 ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full p-2 transition-all duration-200"
          aria-label="Close onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          {/* Logo/Icon with pulse animation */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full mb-6 animate-pulse">
            <Image
              src="/graphic-mark-logo.svg"
              alt="Mr. Deepseeks Logo"
              width={32}
              height={32}
              className="text-white"
            />
          </div>

          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
            ✨ Welcome to Mr. Deepseeks ✨
          </h1>
          <p className="text-gray-400 text-lg">
            Your AI-Powered Creative Studio
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Look at me! Create with AI — starting for free!
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Free Features Card */}
          <div className="bg-blue-600/20 border border-blue-500/50 rounded-xl p-6 hover:bg-blue-600/25 hover:border-blue-500/70 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">🚀 Chat</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Unlimited AI conversations, always free, no limits. Get instant help with your creative projects.
            </p>
          </div>

          {/* Premium Features Card */}
          <div className="bg-purple-600/20 border border-purple-500/50 rounded-xl p-6 hover:bg-purple-600/25 hover:border-purple-500/70 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mr-3">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">🎨 Premium Features</h3>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Watch short ads to unlock advanced AI tools:
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center">
                <ImageIcon className="w-4 h-4 text-purple-400 mr-2" />
                Image Analysis - Understand any image
              </li>
              <li className="flex items-center">
                <Wand2 className="w-4 h-4 text-pink-400 mr-2" />
                Image Generation - Create visuals from text
              </li>
              <li className="flex items-center">
                <Video className="w-4 h-4 text-red-400 mr-2" />
                Video Creation - Generate 5-second videos
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-4 mb-6">
          {/* Primary CTA */}
          <button
            onClick={onContinueAsGuest}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2"
          >
            Continue as Guest
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Secondary CTAs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={onCreateAccount}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-md flex items-center justify-center gap-2"
            >
              Create Account
            </button>
            <button
              onClick={onSignIn}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-md flex items-center justify-center gap-2"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Value Proposition Footer */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-sm text-gray-400 text-center mb-2">
            Why create an account?
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
            <span>✓ Save your creations</span>
            <span>✓ Unlock premium features</span>
            <span>✓ Track your usage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
