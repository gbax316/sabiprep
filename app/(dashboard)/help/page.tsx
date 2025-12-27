'use client';

import React, { useState, useMemo } from 'react';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  GraduationCap,
  User,
  Wrench,
  Mail,
  MessageCircle,
  HelpCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

// Types for FAQ
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: FAQItem[];
}

// FAQ Data
const faqSections: FAQSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'from-cyan-500 to-blue-500',
    items: [
      {
        question: 'How do I create an account?',
        answer: 'To create an account, tap the "Sign Up" button on the login screen. You can sign up using your email address or continue with Google. After signing up, you\'ll be able to track your progress and sync across devices.',
      },
      {
        question: 'Can I use SabiPrep without an account?',
        answer: 'Yes! You can use SabiPrep as a guest. However, your progress won\'t be saved when you close the app, and you won\'t have access to features like streaks, achievements, and leaderboards.',
      },
      {
        question: 'What subjects are available?',
        answer: 'SabiPrep offers JAMB-focused questions for core subjects including Mathematics, English, Physics, Chemistry, Biology, and more. We\'re constantly adding new subjects and topics.',
      },
      {
        question: 'How do I choose which subjects to study?',
        answer: 'From the home screen, tap on "Subjects" to see all available subjects. Tap any subject to view its topics, then select a topic to start practicing. You can also use Quick Practice for randomized questions.',
      },
      {
        question: 'What are the different practice modes?',
        answer: 'We offer three modes: Practice Mode (untimed, learn at your pace), Test Mode (simulates exam conditions), and Timed Mode (race against the clock). Choose the mode that fits your study goals.',
      },
      {
        question: 'How do I track my progress?',
        answer: 'Your progress is shown on the home screen and analytics page. You can see your accuracy rates, questions answered, study time, and streaks. Sign in to save your progress permanently.',
      },
    ],
  },
  {
    id: 'practice-learning',
    title: 'Practice & Learning',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'from-violet-500 to-purple-500',
    items: [
      {
        question: 'How do daily challenges work?',
        answer: 'Each day, new challenges are generated for different subjects. Complete them to earn bonus XP and maintain your streak. Daily challenges reset at midnight.',
      },
      {
        question: 'What is XP and how do I earn it?',
        answer: 'XP (Experience Points) measures your overall progress. You earn XP by answering questions correctly, completing daily challenges, and maintaining streaks. More XP unlocks achievements!',
      },
      {
        question: 'How does the streak system work?',
        answer: 'Your streak tracks consecutive days of practice. Answer at least one question each day to maintain it. Longer streaks unlock special achievements and bonus XP.',
      },
      {
        question: 'Can I review questions I got wrong?',
        answer: 'Yes! After completing a practice session, you can review all questions including explanations for correct and incorrect answers. This helps reinforce your learning.',
      },
      {
        question: 'How are questions selected for practice?',
        answer: 'Questions are selected based on the topic you choose. In Quick Practice mode, questions are randomized from your selected subjects. The system also prioritizes topics you need to improve.',
      },
      {
        question: 'What do the difficulty levels mean?',
        answer: 'Questions are tagged as Easy, Medium, or Hard based on their complexity. Start with easier questions and progress to harder ones as you build confidence.',
      },
    ],
  },
  {
    id: 'account-profile',
    title: 'Account & Profile',
    icon: <User className="w-5 h-5" />,
    color: 'from-emerald-500 to-green-500',
    items: [
      {
        question: 'How do I edit my profile?',
        answer: 'Go to your Profile page and tap the edit button. You can update your name, profile picture, and other details. Changes are saved automatically.',
      },
      {
        question: 'How do I change my password?',
        answer: 'Navigate to Profile > Settings > Change Password. Enter your current password and your new password twice to confirm. Your password will be updated immediately.',
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes, you can delete your account from Settings > Account > Delete Account. This action is permanent and will remove all your data including progress, achievements, and statistics.',
      },
      {
        question: 'How do I enable/disable notifications?',
        answer: 'Go to Settings > Notifications to customize which alerts you receive. You can toggle push notifications, daily reminders, and achievement alerts individually.',
      },
      {
        question: 'Is my data secure?',
        answer: 'Yes! We use industry-standard encryption to protect your data. Your information is stored securely and never shared with third parties without your consent.',
      },
    ],
  },
  {
    id: 'technical-issues',
    title: 'Technical Issues',
    icon: <Wrench className="w-5 h-5" />,
    color: 'from-amber-500 to-orange-500',
    items: [
      {
        question: 'The app is loading slowly. What can I do?',
        answer: 'Try refreshing the page or clearing your browser cache. If using mobile data, switch to Wi-Fi for better performance. Closing other apps may also help.',
      },
      {
        question: 'My progress isn\'t saving. What should I do?',
        answer: 'Make sure you\'re signed in to your account. Guest sessions don\'t save progress permanently. If signed in and still having issues, try logging out and back in.',
      },
      {
        question: 'Questions aren\'t loading properly.',
        answer: 'Check your internet connection and try refreshing. If the problem persists, try clearing your browser cache or using a different browser.',
      },
      {
        question: 'I found a wrong answer in a question.',
        answer: 'We appreciate your feedback! Please contact our support team with the question details and we\'ll review and correct it. Quality is our priority.',
      },
      {
        question: 'How do I report a bug?',
        answer: 'Contact our support team at support@sabiprep.com with details about the issue, including what you were doing when it happened and any error messages you saw.',
      },
    ],
  },
];

// Accordion Item Component
function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-slate-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left hover:bg-slate-800/30 transition-colors px-2 -mx-2 rounded-lg"
      >
        <span className={`font-medium ${isOpen ? 'text-cyan-400' : 'text-white'}`}>
          {item.question}
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-slate-400 pb-4 px-2 leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['getting-started']) // First section expanded by default
  );

  // Filter FAQ items based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return faqSections;

    const query = searchQuery.toLowerCase();
    return faqSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.question.toLowerCase().includes(query) ||
            item.answer.toLowerCase().includes(query)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery]);

  const toggleItem = (sectionId: string, index: number) => {
    const key = `${sectionId}-${index}`;
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(key)) {
      newOpenItems.delete(key);
    } else {
      newOpenItems.add(key);
    }
    setOpenItems(newOpenItems);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@sabiprep.com?subject=Help Request';
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Header title="Help Center" showBack />

      <div className="container-app py-6 space-y-6">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MagicCard className="overflow-hidden">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-500 py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded-xl"
              />
            </div>
          </MagicCard>
        </motion.div>

        {/* Quick Help Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MagicCard className="bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border-cyan-500/30">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">Need quick help?</h3>
                <p className="text-sm text-cyan-200">
                  Browse our FAQs or search for specific topics.
                </p>
              </div>
            </div>
          </MagicCard>
        </motion.div>

        {/* FAQ Sections */}
        {filteredSections.length > 0 ? (
          <div className="space-y-4">
            {filteredSections.map((section, sectionIndex) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + sectionIndex * 0.05 }}
              >
                <MagicCard hover={false}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors rounded-t-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}
                      >
                        {section.icon}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-white">
                          {section.title}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {section.items.length} questions
                        </p>
                      </div>
                    </div>
                    {expandedSections.has(section.id) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {/* Section Content */}
                  <AnimatePresence>
                    {expandedSections.has(section.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-0">
                          {section.items.map((item, itemIndex) => (
                            <AccordionItem
                              key={itemIndex}
                              item={item}
                              isOpen={openItems.has(`${section.id}-${itemIndex}`)}
                              onToggle={() => toggleItem(section.id, itemIndex)}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </MagicCard>
              </motion.div>
            ))}
          </div>
        ) : (
          /* No Results State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <MagicCard className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800 flex items-center justify-center">
                <Search className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No results found
              </h3>
              <p className="text-slate-400 mb-4">
                Try a different search term or browse our FAQ sections.
              </p>
              <MagicButton
                variant="secondary"
                size="sm"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </MagicButton>
            </MagicCard>
          </motion.div>
        )}

        {/* Contact Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MagicCard className="overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Still need help?
              </h3>
              <p className="text-slate-400 mb-6">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <MagicButton
                variant="primary"
                onClick={handleContactSupport}
              >
                <Mail className="w-4 h-4" />
                Contact Support
                <ExternalLink className="w-4 h-4" />
              </MagicButton>
              <p className="text-xs text-slate-500 mt-4">
                support@sabiprep.com
              </p>
            </div>
          </MagicCard>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center pt-4"
        >
          <p className="text-sm text-slate-500">SabiPrep v1.0.0</p>
          <p className="text-xs text-slate-600 mt-1">
            Made with ❤️ for Nigerian Students
          </p>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}

