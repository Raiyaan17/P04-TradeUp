"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Mail, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const createLinkText = (text: string, href: string, linkText: string) => 
  `${text} <a href='${href}' class='text-primary hover:underline'>${linkText}</a>.`;

const FAQ_DATA: FAQItem[] = [
  {
    category: "Trading",
    question: "How do I buy stocks?",
    answer: createLinkText("Search for a stock ticker, enter shares, and click Buy.", "/buy", "Buy Page")
  },
  {
    category: "Trading",
    question: "How do I sell stocks?",
    answer: createLinkText("Find your stock in portfolio, click it, and select Sell.", "/portfolio", "Portfolio")
  },
  {
    category: "Portfolio",
    question: "How do I view my holdings?",
    answer: createLinkText("See all holdings, values, and performance.", "/portfolio", "Portfolio")
  },
  {
    category: "Portfolio",
    question: "How is P&L calculated?",
    answer: "P&L = (Current Price - Purchase Price) × Shares. Green = gains, red = losses."
  },
  {
    category: "Charts",
    question: "How do I view charts?",
    answer: createLinkText("Search any ticker for interactive price charts.", "/charts", "Charts")
  },
  {
    category: "Charts",
    question: "What timeframes are available?",
    answer: "1 day, 5 days, 1 month, 6 months, 1 year, 5 years."
  },
  {
    category: "News",
    question: "How do I access news?",
    answer: createLinkText("Latest financial news and ticker-specific articles.", "/news", "News")
  },
  {
    category: "Settings",
    question: "How do I update my account?",
    answer: createLinkText("Update your name, email, password, and theme preferences in", "/settings/account", "Settings") + " Profile picture can be changed on the <a href='/profile' class='text-primary hover:underline'>Profile</a> page."
  }
];

const CATEGORIES = Array.from(new Set(FAQ_DATA.map(item => item.category)));

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const filteredFAQs = FAQ_DATA.filter(item => item.category === activeCategory);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <AppShell>
      <PageHeader 
        title="Help & FAQ" 
        description="Find answers to common questions and learn how to make the most of TradeUp"
      />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Category Sidebar */}
        <div className="lg:w-1/4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-md transition-colors text-sm",
                    activeCategory === category
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {category}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* FAQ Content */}
        <div className="lg:w-3/4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">{activeCategory}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredFAQs.map((faq, index) => (
                <div key={`${activeCategory}-${index}`} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(index)}
                    className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/50 transition-colors text-left"
                  >
                    <span className="font-medium">{faq.question}</span>
                    <ChevronDown 
                      className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform",
                        expandedItems.has(index) && "rotate-180"
                      )}
                    />
                  </button>
                  
                  {expandedItems.has(index) && (
                    <div className="p-4 bg-muted/30 border-t border-border">
                      <div 
                        className="text-muted-foreground leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Support Card */}
          <Card className="bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30">
            <CardContent className="pt-6">
              <h3 className="text-xl font-bold mb-2">Still need help?</h3>
              <p className="text-muted-foreground mb-4">
                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link href="#">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Contact Support
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="mailto:support@tradeup.com">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Us
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
