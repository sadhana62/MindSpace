"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { MessageCircle, Send, X, User, Loader2 } from "lucide-react"

interface CrisisChatbotProps {
  chatHistory: { role: string; content: string }[]
  onSendMessage: (message: string) => void
  isBotTyping: boolean
  activeWidget: string | null
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
  
  // Ref for the empty div at the end of the messages list
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    // A small timeout ensures that the DOM has updated with the new message
    // before we try to scroll, making the behavior more reliable.
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50); // A 50ms delay is usually sufficient and unnoticeable.
  }

  // Trigger scroll whenever the chat content changes or the chat opens.
  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [chatHistory, isBotTyping, activeWidget, pendingWidget, isOpen]) // Dependencies are correct

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

  const formatWidgetName = (name: string) => {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      <Card className="w-full max-w-3xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border-2">
        
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarImage src="/Logo1.png" alt="MindSpace Bot" />
              <AvatarFallback className="bg-white text-primary font-bold">AI</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">Mimi</CardTitle>
              <p className="text-sm text-primary-foreground/80">Your safe space</p>
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

        {/* Messages Area */}
        <CardContent className="flex-1 p-0 overflow-hidden relative bg-muted/30">
          
          {/* THE SCROLL CONTAINER */}
          <div className="h-full overflow-y-auto p-6 scroll-smooth">
            <div className="space-y-6 max-w-4xl mx-auto min-h-full pb-4"> 
              
              {/* Welcome Message */}
              <div className="flex gap-4">
                <Avatar className="h-10 w-10 mt-1">
                  <AvatarImage src="/Logo1.png" alt="MindSpace Bot" />
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
                    {msg.role !== 'user' && (
                      <AvatarImage src="/Logo1.png" alt="MindSpace Bot" />
                    )}
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
                    <AvatarImage src="/Logo1.png" alt="MindSpace Bot" />
                    <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-card border p-4 rounded-2xl rounded-tl-none shadow-sm w-20 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Confirmation Widget */}
              {pendingWidget && !isBotTyping && (
                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <Avatar className="h-10 w-10 mt-1">
                    <AvatarImage src="/Logo1.png" alt="MindSpace Bot" />
                    <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-card border p-6 rounded-2xl rounded-tl-none shadow-md max-w-[85%] space-y-4 border-primary/20">
                    <p className="text-base font-medium">
                      Would you like to start the <span className="text-primary font-bold">{formatWidgetName(pendingWidget)}</span>?
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        size="lg" 
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

              {/* Active Inline Widgets */}
              {activeWidget === "mood_tracker" && !pendingWidget && (
                 <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <Avatar className="h-10 w-10 mt-1">
                    <AvatarImage src="/Logo1.png" alt="MindSpace Bot" />
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

              {/* This empty div is the target for our auto-scroll */}
              <div ref={messagesEndRef} />

            </div>
          </div>
        </CardContent>

        {/* Input Area */}
        <CardFooter className="p-4 border-t bg-background rounded-b-lg shrink-0">
          <form
            className="flex w-full gap-3 max-w-4xl mx-auto"
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