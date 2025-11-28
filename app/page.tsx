"use client"

import { useState, FormEvent, useEffect, useRef, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, Brain, MessageCircle, BookOpen, Users, Shield, Phone, AlertTriangle, TrendingUp, List, Zap, Target } from "lucide-react"
import { MoreVertical, LayoutDashboard, LogOut } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { CrisisChatbot } from "@/components/crisis-chatbot"
import toast from "react-hot-toast"
import { Line } from "react-chartjs-2"
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js"
import { set } from "date-fns"
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

export default function MentalHealthPortal() {
  const [currentMood, setCurrentMood] = useState<string>("")
  const [assessmentProgress, setAssessmentProgress] = useState(0)

  // State for modals and forms
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [moodHistory, setMoodHistory] = useState<any[]>([])
  const [moodNote, setMoodNote] = useState("")

  const [assessmentModal, setAssessmentModal] = useState<null | "anxiety" | "depression" | "stress">(null)
  const [assessmentAnswers, setAssessmentAnswers] = useState<any>({})
  const [assessmentResult, setAssessmentResult] = useState<string | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [assessmentQuestions, setAssessmentQuestions] = useState<string[]>([])

  const [latestAssessmentResults, setLatestAssessmentResults] = useState<{
    anxiety?: string
    depression?: string
    stress?: string
  }>({})

  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [currentActivity, setCurrentActivity] = useState<{ name: string; sound: string } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const [chatHistroy,setHistroy] = useState<{role:string,content:string}[]>([])

  const moodLabelMap: { [key: string]: string } = {
    great: "Great",
    good: "Good",
    okay: "Okay",
    low: "Low",
    struggling: "Struggling",
  }

  const moodValueMap: { [key: string]: number } = {
    great: 100,
    good: 75,
    okay: 50,
    low: 25,
    struggling: 0,
  }

  // For anxiety scores, keep a history in state
  const [anxietyHistory, setAnxietyHistory] = useState<{ date: string; score: number }[]>([])
  const [depressionHistory, setDepressionHistory] = useState<{ date: string; score: number }[]>([])
  const [stressHistory, setStressHistory] = useState<{ date: string; score: number }[]>([])

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    console.log("Form Data Entries:", Array.from(formData.entries()))
    const data = Object.fromEntries(formData.entries())

    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Registration failed")

      // Automatically log the user in
      toast.success(`Welcome, ${result.user.name}! Your account has been created.`)
      setUser(result.user)
      localStorage.setItem("mindspace-user", JSON.stringify(result.user))
      setRegisterModalOpen(false)
    } catch (error: any) {
      console.log("error",error);
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Login failed")

      toast.success(`Welcome back, ${result.user.name}!`)
      setUser(result.user)
      localStorage.setItem("mindspace-user", JSON.stringify(result.user)) // Store user in localStorage
      setLoginModalOpen(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = () => {
    setUser(null)
    localStorage.removeItem("mindspace-user")
    setMoodHistory([]) // Clear mood history
    setLatestAssessmentResults({}) // Clear assessment results
    setAnxietyHistory([]) // Clear anxiety scores
    setDepressionHistory([]) // Clear depression scores
    setStressHistory([]) // Clear stress scores
    setAssessmentProgress(0) // Reset assessment progress
    toast.success("You have been signed out.")
  }

  const handleSaveMood = async () => {
    if (!user || !currentMood) return
    setIsLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
      const response = await fetch("http://localhost:5000/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          mood: currentMood,
          note: moodNote,
          entry_date: today, 
        }),
      })
  

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to save mood")
      toast.success("Your mood has been saved!")
      fetchMoodHistory(user.email)
         setCurrentMood("")
     setMoodNote("")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMoodHistory = async (email: string) => {
    const response = await fetch(`http://localhost:5000/moods/${email}`)
    if (response.ok) {
      const data = await response.json()
      setMoodHistory(data)
    }
  }

  const fetchAssessmentHistory = async (email: string) => {
    try {
      const response = await fetch(`http://localhost:5000/assessments/${email}`)
      if (response.ok) {
        const data = await response.json()
        // Assuming data is { anxiety: [...], depression: [...], stress: [...] }
        // where each array item is { date: "...", score: ... }
        if (data.anxiety) {
          setAnxietyHistory(data.anxiety.map((item: any) => ({ date: new Date(item.date).toLocaleDateString(), score: item.score })))
        }
        if (data.depression) {
          setDepressionHistory(data.depression.map((item: any) => ({ date: new Date(item.date).toLocaleDateString(), score: item.score })))
        }
        if (data.stress) {
          setStressHistory(data.stress.map((item: any) => ({ date: new Date(item.date).toLocaleDateString(), score: item.score })))
        }
      }
    } catch (error) {
      console.error("Failed to fetch assessment history:", error)
    }
  }
  // Update handleAssessmentStart to fetch questions from backend
  const handleAssessmentStart = async (type: "anxiety" | "depression" | "stress") => {
    setAssessmentModal(type)
    setAssessmentAnswers({})
    setAssessmentResult(null)
    setAssessmentQuestions([])
    setCurrentQuestionIndex(0)

    // Fetch questions from backend
    let endpoint = ""
    if (type === "anxiety") endpoint = "anxiety"
    else if (type === "depression") endpoint = "depression"
    else if (type === "stress") endpoint = "stress"
    const response = await fetch(`http://localhost:5000/assessment/questions/${endpoint}`)
    if (response.ok) {
      const data = await response.json()
      setAssessmentQuestions(data.questions)
    }
  }
  
  const handleAnswerSelect = (questionIndex: number, answerValue: string) => {
    const newAnswers = { ...assessmentAnswers, [`q${questionIndex}`]: answerValue }
    setAssessmentAnswers(newAnswers)

    // Move to the next question or submit
    if (currentQuestionIndex < assessmentQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Last question answered, submit the assessment
      handleAssessmentSubmit(assessmentModal!, newAnswers)
    }
  }


  const handleAssessmentSubmit = async (type: string, answers: any) => {
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/assessment/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email, answers }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Assessment failed")
      setAssessmentResult(result.result || "Assessment completed.")
      setAssessmentProgress((prev) => Math.min(prev + 33, 100))
      setLatestAssessmentResults((prev) => ({
        ...prev,
        [type]: result.result || "Assessment completed."
      }))
      // Assuming backend returns { result: "...", score: 12 }
      if (result.score !== undefined) {
        const newEntry = { date: new Date().toLocaleDateString(), score: result.score };
        if (type === "anxiety") {
          setAnxietyHistory(prev => [
            ...prev,
            newEntry
          ])
        } else if (type === "depression") {
          setDepressionHistory(prev => [
            ...prev, newEntry
          ])
        } else if (type === "stress") {
          setStressHistory(prev => [
            ...prev, newEntry
          ])
        } 
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivityLog = async (activity: string) => {
    setActivityLoading(true)
    try {
      await fetch("http://localhost:5000/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email, activity }),
      })
      toast.success(`${activity} activity logged!`)
    } catch (error: any) {
      toast.error("Failed to log activity.")
    } finally {
      setActivityLoading(false)
    }
  }

  const handleSendMessages = async (message:string) => {
    const newHiostroy = [...chatHistroy,{role:"user",content:message}]
    setHistroy(newHiostroy)

    const response = await fetch("http://localhost:5000/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:newHiostroy})   
  })
    const data = await response.json()
    const botText = data.response ?? data.reply ?? ""
    setHistroy([...newHiostroy,{role:"assistant",content:botText}])
  }
  // Play/Pause handlers
  const handlePlaySound = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }
  const handlePauseSound = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }
  const handleOpenActivityDialog = (activity: { name: string; sound: string }) => {
    setCurrentActivity(activity)
    setActivityDialogOpen(true)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  // Effect to check for a logged-in user on component mount
  useEffect(() => {
    setMounted(true) // Indicate that the component has mounted on the client
    const storedUser = localStorage.getItem("mindspace-user")
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        setActiveTab("dashboard") // Set dashboard as default for logged-in users
        fetchMoodHistory(parsedUser.email)
        fetchAssessmentHistory(parsedUser.email)
      } catch (error) {
        console.error("Failed to parse user from localStorage", error)
        localStorage.removeItem("mindspace-user")
      }
    }
  }, [])

  // Effect to check for a reset token in the URL
  useEffect(() => {
    // This logic is now handled by the manual code entry flow.
  }, [])

  useEffect(() => {
    // When user logs out, switch to a public tab
    if (!user) setActiveTab("mood")
  }, [user])

  const handleGuestAction = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!user) {
      toast.error("Please log in to use this feature.")
      setLoginModalOpen(true)
      return true
    }
    return false
  }

  const moodInsights = {
    daysTracked: moodHistory.length,
    averageMoodValue:
      moodHistory.length > 0
        ? moodHistory.reduce((acc, entry) => acc + (moodValueMap[entry.mood] || 50), 0) / moodHistory.length
        : 0,
  }

  const moodOptions = [
    { emoji: "😊", label: "Great", value: "great", color: "bg-green-100 text-green-800" },
    { emoji: "🙂", label: "Good", value: "good", color: "bg-blue-100 text-blue-800" },
    { emoji: "😐", label: "Okay", value: "okay", color: "bg-yellow-100 text-yellow-800" },
    { emoji: "😔", label: "Low", value: "low", color: "bg-orange-100 text-orange-800" },
    { emoji: "😢", label: "Struggling", value: "struggling", color: "bg-red-100 text-red-800" },
  ]

  const resources = [
    { title: "Understanding Anxiety", category: "Mental Health", readTime: "5 min", url: "https://www.nimh.nih.gov/health/topics/anxiety-disorders" },
    { title: "Coping with Depression", category: "Mental Health", readTime: "7 min", url: "https://www.nimh.nih.gov/health/topics/depression" },
    { title: "Stress Management Techniques", category: "Wellness", readTime: "4 min", url: "https://www.cdc.gov/mental-health/living-with/index.html" },
   
  ]

  const moodChartData = {
    labels: moodHistory.slice(-7).map(entry => new Date(entry.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: "Mood Score",
        data: moodHistory.slice(-7).map(entry => moodValueMap[entry.mood] || 50),
        fill: false,
        borderColor: "#6366f1",
        backgroundColor: "#6366f1",
        tension: 0.3,
      },
    ],
  }

  const anxietyChartData = {
    labels: anxietyHistory.map(item => item.date),
    datasets: [
      {
        label: "Anxiety Score (GAD-7)",
        data: anxietyHistory.map(item => item.score),
        fill: false,
        borderColor: "#f59e42",
        backgroundColor: "#f59e42",
        tension: 0.3,
      },
    ],
  }

  const depressionChartData = {
    labels: depressionHistory.map(item => item.date),
    datasets: [
      {
        label: "Depression Score (PHQ-9)",
        data: depressionHistory.map(item => item.score),
        fill: false,
        borderColor: "#3b82f6", // blue
        backgroundColor: "#3b82f6",
        tension: 0.3,
      },
    ],
  }

  const stressChartData = {
    labels: stressHistory.map(item => item.date),
    datasets: [
      {
        label: "Stress Score",
        data: stressHistory.map(item => item.score),
        fill: false,
        borderColor: "#ec4899", // pink
        backgroundColor: "#ec4899",
        tension: 0.3,
      },
    ],
  }

  const assessmentOptions = [
    { label: "Not at all", value: "0" },
    { label: "Several days", value: "1" },
    { label: "More than half the days", value: "2" },
    { label: "Nearly every day", value: "3" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary-foreground" style={{ color: "oklch(0.985 0.015 150)" }} />
              </div>
              <div>
                <h1 className="font-heading font-bold text-xl text-foreground" style={{ color: "oklch(0.78 0.13 13.5)" }}>MindSpace</h1>
                <p className="text-sm text-muted-foreground">Your mental wellness companion</p>
              </div>
            </div>
            {mounted && user ? (
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("dashboard")}>
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="hover:bg-transparent">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-transparent">
                      Login
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleLogin}>
                      <DialogHeader>
                        <DialogTitle>Login</DialogTitle>
                        <DialogDescription>Access your MindSpace account.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">
                            Email
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            className="col-span-3 border-2 border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[oklch(0.78_0.13_13.5)]"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="password" className="text-right">
                            Password
                          </Label>
                          <Input id="password" name="password" type="password" className="col-span-3 border-2 border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[oklch(0.78_0.13_13.5)]" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full hover:bg-primary/90" disabled={isLoading}>
                          {isLoading ? "Logging in..." : "Login"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="hover:bg-primary/90">Sign Up</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleRegister}>
                      <DialogHeader>
                        <DialogTitle>Create an account</DialogTitle>
                        <DialogDescription>
                          Join MindSpace to track your progress and connect with the community.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Name
                          </Label>
                          <Input id="name" name="name" placeholder="Your Name" className="col-span-3 border-2 border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[oklch(0.78_0.13_13.5)]" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email-register" className="text-right">
                            Email
                          </Label>
                          <Input
                            id="email-register"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            className="col-span-3 border-2 border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[oklch(0.78_0.13_13.5)]"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="password-register" className="text-right">
                            Password
                          </Label>
                          <Input
                            id="password-register"
                            name="password"
                            type="password"
                            className="col-span-3 border-2 border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[oklch(0.78_0.13_13.5)]"
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full hover:bg-primary/90" disabled={isLoading}>
                          {isLoading ? "Creating Account..." : "Create Account"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <section className="text-center mb-12">
          <h2 className="font-heading font-black text-4xl text-balance mb-4">
            {user ? `Welcome back, ${user.name}` : "Welcome to Your Safe Space"}
          </h2>
          <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto mb-8">
            {user
              ? "How are you feeling today? Let's check in on your mental wellness."
              : "Access anonymous mental health resources, track your mood, and find support when you need it most. You're not alone in this journey."}
          </p>
         
        </section>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="mood" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Mood Check
            </TabsTrigger>
            <TabsTrigger value="assessment" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Self-Assessment
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Community
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" /> Mood Timeline
                </CardTitle>
                <CardDescription>Your mood trends over the last 7 entries.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] bg-muted/50 rounded-lg flex items-center justify-center">
                  {moodHistory.length > 0 ? (
                    <Line data={moodChartData} options={{
                      scales: {
                        y: { min: 0, max: 100, title: { display: true, text: "Mood Score" } }
                      }
                    }} />
                  ) : (
                    <p className="text-sm text-muted-foreground">No mood data yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <List className="w-5 h-5" /> Recent Entries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {moodHistory.length > 0 ? (
                      moodHistory.slice(0, 3).map((entry, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                              moodOptions.find((m) => m.value === entry.mood)?.color
                            }`}
                          >
                            {moodOptions.find((m) => m.value === entry.mood)?.emoji}
                          </div>
                          <div>
                            <p className="font-semibold capitalize">{entry.mood}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {entry.note || "No note added."}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              {new Date(entry.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No mood entries yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2">
                      <Zap className="w-5 h-5" /> Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2">
                    <Button variant="outline" onClick={() => setActiveTab("mood")} className="hover:bg-transparent">
                      New Mood Entry
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("assessment")} className="hover:bg-transparent">
                      Take an Assessment
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("resources")} className="hover:bg-transparent">
                      View Resources
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2">
                      <Target className="w-5 h-5" /> Wellness Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[100px] bg-muted/50 rounded-lg flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Wellness goals will be here.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Brain className="w-5 h-5" /> Anxiety Score Timeline
                </CardTitle>
                <CardDescription>Your GAD-7 scores over time.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] bg-muted/50 rounded-lg flex items-center justify-center">
                  {anxietyHistory.length > 0 ? (
                    <Line data={anxietyChartData} options={{
                      scales: {
                        y: { min: 0, max: 21, title: { display: true, text: "GAD-7 Score" } }
                      }
                    }} />
                  ) : (
                    <p className="text-sm text-muted-foreground">No anxiety assessment data yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Brain className="w-5 h-5" /> Depression Score Timeline
                </CardTitle>
                <CardDescription>Your PHQ-9 scores over time.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] bg-muted/50 rounded-lg flex items-center justify-center">
                  {depressionHistory.length > 0 ? (
                    <Line data={depressionChartData} options={{
                      scales: {
                        y: { min: 0, max: 27, title: { display: true, text: "PHQ-9 Score" } }
                      }
                    }} />
                  ) : (
                    <p className="text-sm text-muted-foreground">No depression assessment data yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Stress Score Timeline
                </CardTitle>
                <CardDescription>Your Stress Assessment scores over time.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] bg-muted/50 rounded-lg flex items-center justify-center">
                  {stressHistory.length > 0 ? (
                    <Line data={stressChartData} options={{
                      scales: {
                        y: { min: 0, max: 40, title: { display: true, text: "Stress Score" } }
                      }
                    }} />
                  ) : (
                    <p className="text-sm text-muted-foreground">No stress assessment data yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mood Tracking Tab */}
          <TabsContent value="mood" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">How are you feeling today?</CardTitle>
                <CardDescription>
                  Track your daily mood to better understand your mental health patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => setCurrentMood(mood.value)}
                      className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        currentMood === mood.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-3xl mb-2">{mood.emoji}</div>
                      <div className="text-sm font-medium">{mood.label}</div>
                    </button>
                  ))}
                </div>
                {currentMood && (
                  <div className="space-y-4">
                    <div className="p-4  rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        Would you like to add a note about your mood?
                      </p>
                      <textarea
                        value={moodNote}
                        onChange={(e) => setMoodNote(e.target.value)}
                        className="w-full p-3 border rounded-md resize-none"
                        rows={3}
                        placeholder="Optional: What's contributing to how you feel today?"
                      />
                    </div>
                    <Button
                      disabled={isLoading}
                      className="w-full"
                      style={{ backgroundColor: "oklch(0.78 0.13 13.5)" }}
                      onClick={(e) => {
                        handleGuestAction(e) ? null : handleSaveMood()
                      }}
                    >
                      Save Mood Entry
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mood Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Your Mood Insights</CardTitle>
                <CardDescription>Based on your recent mood entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Mood Average</span>
                      <span className="font-medium">{moodInsights.averageMoodValue.toFixed(0)}%</span>
                    </div>
                    <Progress value={moodInsights.averageMoodValue} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{moodInsights.daysTracked}</div>
                      <div className="text-sm text-muted-foreground">Days tracked</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">3</div>
                      <div className="text-sm text-muted-foreground">Streak</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Self-Assessment Tab */}
          <TabsContent value="assessment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Mental Health Self-Assessment</CardTitle>
                <CardDescription>Anonymous screening tools to help you understand your mental health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {/* Assessment Buttons */}
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Anxiety Screening (GAD-7)</h3>
                        <p className="text-sm text-muted-foreground">7 questions • 3-5 minutes</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleAssessmentStart("anxiety")} className="hover:bg-transparent">
                        Start
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Depression Screening (PHQ-9)</h3>
                        <p className="text-sm text-muted-foreground">9 questions • 5-7 minutes</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleAssessmentStart("depression")} className="hover:bg-transparent">
                        Start
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Stress Assessment</h3>
                        <p className="text-sm text-muted-foreground">10 questions • 5 minutes</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleAssessmentStart("stress")} className="hover:bg-transparent">
                        Start
                      </Button>
                    </div>
                  </div>
                  {/* Wellbeing Activities */}
                  <div className="p-4 border rounded-lg" style={{ backgroundColor: "oklch(0.78 0.09 144.5)"}}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-white">Wellbeing Activities</h3>
                        <p className="text-smtext-white text-white">Try these to relax and recharge</p>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {[
                        { name: "Guided Breathing", sound: "/sounds/breathing.mp3", icon: <Brain className="w-6 h-6 text-blue-300" /> },
                        { name: "Yoga Stretch", sound: "/sounds/yoga.mp3", icon: <Zap className="w-6 h-6 text-green-300" /> },
                        { name: "Mindful Walking", sound: "/sounds/walking.mp3", icon: <Heart className="w-6 h-6 text-purple-300" /> },
                       
                      ].map((activity, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg  transition-colors">
                          <div className="w-10 h-10 bg-blue-800 flex items-center justify-center rounded-full">
                            {activity.icon}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-white">{activity.name}</div>
                            <div className="text-xs text-white">{activity.name === "Guided Breathing" ? "3 min • Deep breathing exercise" : activity.name === "Yoga Stretch" ? "5 min • Simple yoga poses" : activity.name === "Mindful Walking" ? "10 min • Focused walking activity" : "5 min • Write 3 things you're grateful for"}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-300 text-blue-300 hover:bg-transparent"
                            onClick={() => handleOpenActivityDialog(activity)}
                          >
                            Open
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {assessmentProgress > 0 && (
                  <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Assessment Progress</span>
                      <span className="text-sm">{assessmentProgress}%</span>
                    </div>
                    <Progress value={assessmentProgress} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assessment Modal */}
            <Dialog open={!!assessmentModal} onOpenChange={() => setAssessmentModal(null)}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {assessmentModal === "anxiety" && "Anxiety Screening (GAD-7)"}
                    {assessmentModal === "depression" && "Depression Screening (PHQ-9)"}
                    {assessmentModal === "stress" && "Stress Assessment"}
                  </DialogTitle>
                  {!assessmentResult && (
                    <DialogDescription>
                      Over the last 2 weeks, how often have you been bothered by the following problems?
                    </DialogDescription>
                  )}
                </DialogHeader>
                <div className="py-4">
                  {!assessmentResult ? (
                    <div className="relative min-h-[20rem] overflow-hidden">
                      {assessmentQuestions.length > 0 ? (
                        <div
                          key={currentQuestionIndex}
                          className="absolute inset-0 flex flex-col justify-between p-6 bg-card border rounded-xl shadow-lg animate-in fade-in slide-in-from-right-10 duration-500"
                        >
                          <div className="mb-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              Question {currentQuestionIndex + 1} of {assessmentQuestions.length}
                            </p>
                            <p className="font-semibold text-lg leading-tight">
                              {assessmentQuestions[currentQuestionIndex]}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 mt-auto">
                            {assessmentOptions.map((option) => (
                              <Button
                                key={option.value}
                                variant="outline"
                                className="w-full h-11 text-base hover:bg-primary/10 hover:border-primary"
                                onClick={() => handleAnswerSelect(currentQuestionIndex, option.value)}
                              >
                                {option.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">Loading questions...</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-muted rounded-lg animate-in fade-in duration-500">
                      <h3 className="font-bold text-lg mb-2">Assessment Complete!</h3>
                      <p>{assessmentResult}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Mental Health Resources</CardTitle>
                <CardDescription>Curated content to support your mental wellness journey</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {resources.map((resource, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{resource.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {resource.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{resource.readTime}</span>
                          </div>
                        </div>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm" className="hover:bg-transparent">
                            Read
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Emergency Resources</CardTitle>
                <CardDescription>Available 24/7 when you need immediate support</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-semibold">National Suicide Prevention Lifeline</div>
                      <div className="text-sm text-muted-foreground">24/7 Crisis Support</div>
                    </div>
                    <Button size="sm" className="hover:bg-primary/90">Call 988</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-semibold">Crisis Text Line</div>
                      <div className="text-sm text-muted-foreground">Text HOME to 741741</div>
                    </div>
                    <Button size="sm" variant="outline" className="hover:bg-transparent">
                      Text
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Safe Community Spaces</CardTitle>
                <CardDescription>Connect with others in moderated, supportive environments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Anxiety Support Group</h3>
                        <p className="text-sm text-muted-foreground">142 members • Moderated</p>
                      </div>
                      <Button variant="outline" size="sm" className="hover:bg-transparent">
                        Join
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Depression Recovery</h3>
                        <p className="text-sm text-muted-foreground">89 members • Moderated</p>
                      </div>
                      <Button variant="outline" size="sm" className="hover:bg-transparent">
                        Join
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Mindfulness & Meditation</h3>
                        <p className="text-sm text-muted-foreground">203 members • Moderated</p>
                      </div>
                      <Button variant="outline" size="sm" className="hover:bg-transparent">
                        Join
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Community Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Community Guidelines</CardTitle>
                <CardDescription>Creating a safe space for everyone</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Be respectful and supportive of others' experiences</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>No medical advice - share experiences and coping strategies only</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Maintain anonymity - no personal identifying information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Report concerning content to moderators immediately</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-5">
              <Heart className="w-5 h-5 text-primary" />
              <span className="font-heading font-bold">MindSpace</span>
          
          
            </div>
                 <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              <Shield className="w-3 h-3 mr-1" />
              100% Anonymous
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Heart className="w-3 h-3 mr-1" />
              Stigma-Free
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Users className="w-3 h-3 mr-1" />
              Community Support
            </Badge>
          </div>

            <p className="text-sm text-muted-foreground mb-7 mt-10">
              Your privacy and safety are our top priorities. All interactions are anonymous and secure.
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground">
                Privacy Policy
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                Terms of Service
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                Crisis Resources
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      <div
        onClickCapture={(e) => {
          if (!user) {
            e.preventDefault()
            e.stopPropagation()
            toast.error("Please log in to use the chat feature.")
            setLoginModalOpen(true)
          }
        }}
      >
        <CrisisChatbot
          onStartAssessment={handleAssessmentStart}
          onNavigateTo={(tab) => setActiveTab(tab)}
        />
      </div>

      {/* Activity Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="bg-blue-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{currentActivity?.name}</DialogTitle>
            <DialogDescription className="text-blue-200">
              Enjoy this activity with relaxing sound and animation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Sound Animation */}
            <div className="w-24 h-24 rounded-full bg-blue-800 flex items-center justify-center relative overflow-hidden">
              {/* Simple animated sound waves */}
              <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>
                <div className={`animate-pulse w-16 h-16 rounded-full bg-blue-600 opacity-50`} />
                <div className={`animate-ping w-20 h-20 rounded-full bg-blue-400 opacity-30 absolute`} />
              </div>
              <Brain className="w-12 h-12 text-blue-300 z-10" />
            </div>
            {/* Play/Pause Controls */}
            <audio
              ref={audioRef}
              src={currentActivity?.sound}
              onEnded={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0
                  audioRef.current.play()
                  setIsPlaying(true)
                }
              }}
            />
            <div className="flex gap-4">
              <Button
                variant="secondary"
                className="bg-blue-700 text-white"
                onClick={handlePlaySound}
                disabled={isPlaying}
              >
                ▶ Play
              </Button>
              <Button
                variant="secondary"
                className="bg-blue-700 text-white"
                onClick={handlePauseSound}
                disabled={!isPlaying}
              >
                ⏸ Pause
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-blue-300 text-blue-300" onClick={() => setActivityDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
