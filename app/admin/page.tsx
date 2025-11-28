"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  AlertTriangle,
  Users,
  TrendingUp,
  Heart,
  Shield,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ImageIcon,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// Mock data for demonstration
const moodTrendsData = [
  { date: "2024-01-01", happy: 65, neutral: 25, sad: 10 },
  { date: "2024-01-02", happy: 70, neutral: 20, sad: 10 },
  { date: "2024-01-03", happy: 60, neutral: 30, sad: 10 },
  { date: "2024-01-04", happy: 75, neutral: 15, sad: 10 },
  { date: "2024-01-05", happy: 68, neutral: 22, sad: 10 },
  { date: "2024-01-06", happy: 72, neutral: 18, sad: 10 },
  { date: "2024-01-07", happy: 78, neutral: 15, sad: 7 },
]

const assessmentData = [
  { category: "Low Risk", count: 145, color: "#10b981" },
  { category: "Moderate Risk", count: 67, color: "#f59e0b" },
  { category: "High Risk", count: 23, color: "#ef4444" },
]

const crisisAlerts = [
  { id: 1, timestamp: "2024-01-07 14:30", severity: "High", keywords: ["suicide", "hopeless"], status: "Active" },
  { id: 2, timestamp: "2024-01-07 12:15", severity: "Medium", keywords: ["anxiety", "panic"], status: "Resolved" },
  { id: 3, timestamp: "2024-01-07 09:45", severity: "High", keywords: ["self-harm", "worthless"], status: "Active" },
]

const resources = [
  {
    id: 1,
    title: "Understanding Depression",
    category: "Mental Health",
    status: "Published",
    views: 1234,
    author: "Dr. Smith",
    lastModified: "2024-01-07",
    scheduled: null,
    featured: true,
  },
  {
    id: 2,
    title: "Anxiety Coping Strategies",
    category: "Self-Help",
    status: "Draft",
    views: 0,
    author: "Sarah Johnson",
    lastModified: "2024-01-06",
    scheduled: "2024-01-10",
    featured: false,
  },
  {
    id: 3,
    title: "Crisis Hotline Numbers",
    category: "Emergency",
    status: "Published",
    views: 2156,
    author: "Admin",
    lastModified: "2024-01-05",
    scheduled: null,
    featured: true,
  },
  {
    id: 4,
    title: "Mindfulness Meditation Guide",
    category: "Wellness",
    status: "Under Review",
    views: 0,
    author: "Dr. Chen",
    lastModified: "2024-01-04",
    scheduled: null,
    featured: false,
  },
  {
    id: 5,
    title: "Supporting a Friend in Crisis",
    category: "Social",
    status: "Published",
    views: 892,
    author: "Lisa Brown",
    lastModified: "2024-01-03",
    scheduled: null,
    featured: false,
  },
]

const contentTemplates = [
  {
    id: 1,
    name: "Mental Health Article",
    description: "Standard template for educational articles",
    fields: ["title", "summary", "content", "resources", "tags"],
  },
  {
    id: 2,
    name: "Crisis Resource",
    description: "Template for emergency resources and hotlines",
    fields: ["title", "urgency", "contact", "description", "availability"],
  },
  {
    id: 3,
    name: "Self-Help Guide",
    description: "Step-by-step guides and exercises",
    fields: ["title", "difficulty", "duration", "steps", "tips"],
  },
  {
    id: 4,
    name: "Community Guidelines",
    description: "Rules and guidelines for community spaces",
    fields: ["title", "rules", "consequences", "examples"],
  },
]

export default function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [newResource, setNewResource] = useState({
    title: "",
    category: "",
    content: "",
    template: "",
    scheduled: "",
    featured: false,
    tags: "",
    author: "Current User",
  })
  const [editingResource, setEditingResource] = useState<number | null>(null)
  const [contentFilter, setContentFilter] = useState("all")

  const filteredResources = resources.filter((resource) => {
    if (contentFilter === "all") return true
    return resource.status.toLowerCase().replace(" ", "-") === contentFilter
  })

  const handleApproveContent = (id: number) => {
    console.log(`[v0] Approving content with ID: ${id}`)
    // In a real app, this would update the resource status
  }

  const handleRejectContent = (id: number) => {
    console.log(`[v0] Rejecting content with ID: ${id}`)
    // In a real app, this would update the resource status
  }

  const handleScheduleContent = (id: number, date: string) => {
    console.log(`[v0] Scheduling content ${id} for ${date}`)
    // In a real app, this would update the scheduled date
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">MindSpace Admin Dashboard</h1>
          <p className="text-emerald-700">
            Monitor user engagement, track mental health trends, and manage crisis interventions
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-100">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-100">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="crisis" className="data-[state=active]:bg-emerald-100">
              Crisis Detection
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-emerald-100">
              Content Management
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-emerald-100">
              User Management
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-800">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900">2,847</div>
                  <p className="text-xs text-emerald-600">+12% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-800">Mood Check-ins</CardTitle>
                  <Heart className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900">1,234</div>
                  <p className="text-xs text-emerald-600">This week</p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-800">Assessments</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900">567</div>
                  <p className="text-xs text-emerald-600">Completed this month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-red-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-800">Crisis Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-900">3</div>
                  <p className="text-xs text-red-600">Active alerts</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
              <CardHeader>
                <CardTitle className="text-emerald-900">Recent Activity</CardTitle>
                <CardDescription>Latest user interactions and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-emerald-800">New user completed anxiety assessment</p>
                      <p className="text-xs text-emerald-600">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-emerald-800">Crisis keyword detected in chat</p>
                      <p className="text-xs text-emerald-600">15 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-emerald-800">Resource "Coping with Stress" viewed 50 times</p>
                      <p className="text-xs text-emerald-600">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
                <CardHeader>
                  <CardTitle className="text-emerald-900">Mood Trends</CardTitle>
                  <CardDescription>Weekly mood check-in patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={moodTrendsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="happy" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="neutral" stroke="#f59e0b" strokeWidth={2} />
                      <Line type="monotone" dataKey="sad" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
                <CardHeader>
                  <CardTitle className="text-emerald-900">Risk Assessment Distribution</CardTitle>
                  <CardDescription>Current user risk levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={assessmentData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ category, count }) => `${category}: ${count}`}
                      >
                        {assessmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Crisis Detection Tab */}
          <TabsContent value="crisis" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-red-200">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Crisis Alerts
                </CardTitle>
                <CardDescription>Real-time monitoring of crisis indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {crisisAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={alert.severity === "High" ? "destructive" : "secondary"}>
                            {alert.severity} Risk
                          </Badge>
                          <Badge variant={alert.status === "Active" ? "destructive" : "secondary"}>
                            {alert.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">Keywords detected: {alert.keywords.join(", ")}</p>
                        <p className="text-xs text-gray-500">{alert.timestamp}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                        <Button size="sm" variant="outline">
                          Contact
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Content Management Tab */}
          <TabsContent value="content" className="space-y-6">
            {/* Content Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="text-2xl font-bold text-emerald-900">24</div>
                      <p className="text-xs text-emerald-600">Total Articles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/70 backdrop-blur-sm border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <div>
                      <div className="text-2xl font-bold text-yellow-900">3</div>
                      <p className="text-xs text-yellow-600">Pending Review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/70 backdrop-blur-sm border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-blue-900">2</div>
                      <p className="text-xs text-blue-600">Scheduled</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/70 backdrop-blur-sm border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-green-900">19</div>
                      <p className="text-xs text-green-600">Published</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Content Library */}
              <Card className="lg:col-span-2 bg-white/70 backdrop-blur-sm border-emerald-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-emerald-900">Content Library</CardTitle>
                      <CardDescription>Manage all mental health resources and content</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={contentFilter} onValueChange={setContentFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Content</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Drafts</SelectItem>
                          <SelectItem value="under-review">Under Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredResources.map((resource) => (
                      <div
                        key={resource.id}
                        className="p-4 border border-emerald-200 rounded-lg hover:bg-emerald-50/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-emerald-900">{resource.title}</h4>
                              {resource.featured && (
                                <Badge variant="secondary" className="text-xs">
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{resource.category}</Badge>
                              <Badge
                                variant={
                                  resource.status === "Published"
                                    ? "default"
                                    : resource.status === "Draft"
                                      ? "secondary"
                                      : resource.status === "Under Review"
                                        ? "outline"
                                        : "secondary"
                                }
                              >
                                {resource.status}
                              </Badge>
                              {resource.scheduled && (
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Scheduled: {resource.scheduled}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-emerald-600">
                              <span>By {resource.author}</span>
                              <span>Modified: {resource.lastModified}</span>
                              <span>{resource.views} views</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {resource.status === "Under Review" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveContent(resource.id)}
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectContent(resource.id)}
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingResource(resource.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 bg-transparent">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Content Creation */}
              <div className="space-y-6">
                <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
                  <CardHeader>
                    <CardTitle className="text-emerald-900">Create New Content</CardTitle>
                    <CardDescription>Add new mental health resources</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="template">Content Template</Label>
                      <Select
                        value={newResource.template}
                        onValueChange={(value) => setNewResource({ ...newResource, template: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose template" />
                        </SelectTrigger>
                        <SelectContent>
                          {contentTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.name}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newResource.title}
                        onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                        placeholder="Content title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newResource.category}
                        onValueChange={(value) => setNewResource({ ...newResource, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mental-health">Mental Health</SelectItem>
                          <SelectItem value="self-help">Self-Help</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="therapy">Therapy</SelectItem>
                          <SelectItem value="wellness">Wellness</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={newResource.tags}
                        onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                        placeholder="anxiety, depression, coping"
                      />
                    </div>
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={newResource.content}
                        onChange={(e) => setNewResource({ ...newResource, content: e.target.value })}
                        placeholder="Write your content here..."
                        rows={6}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="featured"
                        checked={newResource.featured}
                        onCheckedChange={(checked) => setNewResource({ ...newResource, featured: checked })}
                      />
                      <Label htmlFor="featured">Featured content</Label>
                    </div>
                    <div>
                      <Label htmlFor="scheduled">Schedule Publication</Label>
                      <Input
                        id="scheduled"
                        type="datetime-local"
                        value={newResource.scheduled}
                        onChange={(e) => setNewResource({ ...newResource, scheduled: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Publish Now
                      </Button>
                      <Button variant="outline" className="flex-1 bg-transparent">
                        Save Draft
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Content Templates */}
                <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
                  <CardHeader>
                    <CardTitle className="text-emerald-900">Content Templates</CardTitle>
                    <CardDescription>Pre-built templates for different content types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contentTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="p-3 border border-emerald-200 rounded-lg hover:bg-emerald-50/50 transition-colors cursor-pointer"
                        >
                          <h4 className="font-medium text-emerald-900 text-sm">{template.name}</h4>
                          <p className="text-xs text-emerald-600 mb-2">{template.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {template.fields.slice(0, 3).map((field) => (
                              <Badge key={field} variant="outline" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                            {template.fields.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.fields.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
              <CardHeader>
                <CardTitle className="text-emerald-900 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy-Protected User Overview
                </CardTitle>
                <CardDescription>Anonymized user engagement metrics (no personal data)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border border-emerald-200 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-900">2,847</div>
                    <p className="text-sm text-emerald-600">Total Anonymous Users</p>
                  </div>
                  <div className="text-center p-4 border border-emerald-200 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-900">1,234</div>
                    <p className="text-sm text-emerald-600">Active This Week</p>
                  </div>
                  <div className="text-center p-4 border border-emerald-200 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-900">89%</div>
                    <p className="text-sm text-emerald-600">Engagement Rate</p>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-medium text-emerald-900">Privacy Protection</h4>
                  </div>
                  <p className="text-sm text-emerald-700">
                    All user data is anonymized and aggregated. No personal information is displayed or stored in
                    identifiable formats. Crisis detection alerts are handled through secure, encrypted channels with
                    immediate professional intervention protocols.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
