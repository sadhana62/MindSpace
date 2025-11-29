"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { MessageCircle, Send, X, User, Loader2 } from "lucide-react"

interface CrisisChatbotProps {
  chatHistory: { role: string; content: string }[]
  onSendMessage: (message: string) => void
  isBotTyping: boolean
  activeWidget: string | null
  // New props for confirmation
  pendingWidget: string | null
  onConfirm: () => void
  onDecline: () => void
}

export function CrisisChatbot({
  chatHistory,
  onSendMessage,
  isBotTyping,
  activeWidget,
  pendingWidget,
  onConfirm,
  onDecline
}: CrisisChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when history changes or widget appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory, isBotTyping, activeWidget, pendingWidget, isOpen])

  const handleSend = () => {
    if (!inputValue.trim()) return
    onSendMessage(inputValue)
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Format widget name for display (e.g. "assess_anxiety" -> "Anxiety Assessment")
  const formatWidgetName = (name: string) => {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  // 1. The Trigger Button (Still in the corner)
  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-xl z-50 animate-in zoom-in duration-300 bg-primary hover:bg-primary/90"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-8 w-8" />
      </Button>
    )
  }

  // 2. The Overlay Modal (Centered and Wide)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {/* The Chat Card - Increased width (max-w-4xl) and height (h-[80vh]) */}
      <Card className="w-full w-190 h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border-2">
        
        {/* Chat Header */}
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarImage src="/bot-avatar.png" />
              <AvatarFallback className="bg-white text-primary font-bold">AI</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">Mimi</CardTitle>
              <p className="text-sm text-primary-foreground/80">Your safe sapce</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </CardHeader>

        {/* Chat Messages Area */}
        <CardContent className="flex-1 p-0 overflow-hidden relative bg-muted/30">
          <ScrollArea className="h-full p-6" ref={scrollRef}>
            <div className="space-y-6 max-w-3xl mx-auto"> 
              {/* Centered content container for better readability on wide screens */}
              
              {/* Welcome Message */}
              <div className="flex gap-4">
                <Avatar className="h-10 w-10 mt-1">
                  <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                </Avatar>
                <div className="bg-card border p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] text-base">
                  <p>
                    Hi! I'm here to support you. We can talk about how you're feeling, or I can guide you through some relaxation exercises. How can I help today?
                  </p>
                </div>
              </div>

              {/* Chat History */}
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-10 w-10 mt-1">
                    <AvatarFallback
                      className={
                        msg.role === "user"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-primary text-primary-foreground"
                      }
                    >
                      {msg.role === "user" ? <User className="h-5 w-5" /> : "AI"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`p-4 rounded-2xl shadow-sm max-w-[85%] text-base ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-card border rounded-tl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isBotTyping && (
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-card border p-4 rounded-2xl rounded-tl-none shadow-sm w-20 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* --- CONFIRMATION WIDGET --- */}
              {pendingWidget && !isBotTyping && (
                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <Avatar className="h-10 w-10 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-card border p-6 rounded-2xl rounded-tl-none shadow-md max-w-[85%] space-y-4 border-primary/20">
                    <p className="text-base font-medium">
                      Would you like to start the <span className="text-primary font-bold">{formatWidgetName(pendingWidget)}</span>?
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        size="lg" // Larger buttons
                        onClick={onConfirm}
                        className="bg-green-600 hover:bg-green-700 text-white px-8"
                      >
                        Yes, let's do it
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={onDecline}
                        className="hover:bg-red-50 text-red-600 border-red-200 px-8"
                      >
                        No, thanks
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- ACTIVE INLINE WIDGETS --- */}
              {activeWidget === "mood_tracker" && !pendingWidget && (
                 <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <Avatar className="h-10 w-10 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                  </Avatar>
                   <div className="bg-card border p-5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] w-full">
                     <p className="text-base mb-4 font-medium">How are you feeling right now?</p>
                     <div className="grid grid-cols-5 gap-4">
                       {["😢", "😔", "😐", "🙂", "😊"].map((emoji) => (
                         <button
                           key={emoji}
                           onClick={() => onSendMessage(`I am feeling ${emoji}`)}
                           className="text-4xl hover:bg-muted p-2 rounded-lg transition-transform hover:scale-110"
                         >
                           {emoji}
                         </button>
                       ))}
                     </div>
                   </div>
                 </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input Area */}
        <CardFooter className="p-4 border-t bg-background rounded-b-lg shrink-0">
          <form
            className="flex w-full gap-3 max-w-3xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <Input
              placeholder={pendingWidget ? "Please select an option above..." : "Type a message..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isBotTyping || !!pendingWidget}
              className="flex-1 h-12 text-base focus-visible:ring-2"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-12 w-12"
              disabled={!inputValue.trim() || isBotTyping || !!pendingWidget}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}