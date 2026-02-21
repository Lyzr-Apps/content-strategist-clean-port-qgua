'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { FaInstagram, FaFacebook, FaYoutube } from 'react-icons/fa'
import { HiTrendingUp, HiSearch, HiLightBulb, HiClock, HiChartBar, HiRefresh, HiChevronDown, HiChevronUp, HiViewGrid, HiDocumentText, HiStar } from 'react-icons/hi'
import { BsStars, BsHash, BsCalendarWeek, BsArrowRight } from 'react-icons/bs'
import { IoMdClose } from 'react-icons/io'
import { MdOutlineArticle } from 'react-icons/md'

// ---- Constants ----
const MANAGER_AGENT_ID = '699a40d677fba476f42d9fbe'
const HISTORY_KEY = 'content_strategy_history'

// ---- Types ----
interface TrendingTopic {
  topic: string
  relevance_score: number
  platform: string
  description: string
  source: string
}

interface SEOKeyword {
  keyword: string
  search_volume: string
  difficulty: string
  platform_relevance: string
}

interface Hashtag {
  tag: string
  platform: string
  popularity: string
}

interface ContentIdea {
  title: string
  description: string
  hashtags: string[]
  story_angle: string
  content_format: string
}

interface ScheduleSlot {
  time: string
  platform: string
  content_type: string
  engagement_prediction: string
}

interface WeeklyScheduleDay {
  day: string
  slots: ScheduleSlot[]
}

interface PlatformTip {
  platform: string
  frequency: string
  best_times: string
  algorithm_tip: string
}

interface ContentStrategyData {
  strategy_title: string
  niche: string
  platforms: string[]
  trending_topics: TrendingTopic[]
  seo_keywords: SEOKeyword[]
  hashtags: Hashtag[]
  instagram_ideas: ContentIdea[]
  facebook_ideas: ContentIdea[]
  youtube_ideas: ContentIdea[]
  weekly_schedule: WeeklyScheduleDay[]
  platform_tips: PlatformTip[]
  summary: string
}

interface HistoryEntry {
  id: string
  timestamp: string
  niche: string
  platforms: string[]
  contentStyle: string
  data: ContentStrategyData
}

// ---- Response Parser ----
function parseAgentResponse(result: AIAgentResponse): ContentStrategyData | null {
  if (!result?.success) return null

  const responseResult = result?.response?.result
  if (!responseResult) return null

  let data: Record<string, unknown> = {}

  if (typeof responseResult === 'string') {
    try {
      data = JSON.parse(responseResult)
    } catch {
      return null
    }
  } else if (typeof responseResult === 'object') {
    data = responseResult as Record<string, unknown>
  }

  if (data?.result && typeof data.result === 'object') {
    data = data.result as Record<string, unknown>
  }

  return {
    strategy_title: (data?.strategy_title as string) ?? '',
    niche: (data?.niche as string) ?? '',
    platforms: Array.isArray(data?.platforms) ? data.platforms : [],
    trending_topics: Array.isArray(data?.trending_topics) ? data.trending_topics : [],
    seo_keywords: Array.isArray(data?.seo_keywords) ? data.seo_keywords : [],
    hashtags: Array.isArray(data?.hashtags) ? data.hashtags : [],
    instagram_ideas: Array.isArray(data?.instagram_ideas) ? data.instagram_ideas : [],
    facebook_ideas: Array.isArray(data?.facebook_ideas) ? data.facebook_ideas : [],
    youtube_ideas: Array.isArray(data?.youtube_ideas) ? data.youtube_ideas : [],
    weekly_schedule: Array.isArray(data?.weekly_schedule) ? data.weekly_schedule : [],
    platform_tips: Array.isArray(data?.platform_tips) ? data.platform_tips : [],
    summary: (data?.summary as string) ?? '',
  }
}

// ---- Markdown renderer ----
function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-serif font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-serif font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-serif font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm leading-relaxed">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm leading-relaxed">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ---- Sample Data ----
function getSampleData(): ContentStrategyData {
  return {
    strategy_title: 'Sustainable Fashion Content Strategy Q1',
    niche: 'Sustainable Fashion',
    platforms: ['Instagram', 'Facebook', 'YouTube'],
    trending_topics: [
      { topic: 'Capsule Wardrobe Challenge', relevance_score: 92, platform: 'Instagram', description: 'Minimalist fashion enthusiasts are sharing 30-day capsule wardrobe challenges, showing how to style 15 pieces into 30+ outfits.', source: 'Instagram Explore' },
      { topic: 'Thrift Flip Transformations', relevance_score: 88, platform: 'YouTube', description: 'DIY creators are transforming thrift store finds into high-fashion pieces, combining sustainability with creativity.', source: 'YouTube Trending' },
      { topic: 'Ethical Brand Spotlights', relevance_score: 85, platform: 'Facebook', description: 'Community groups are actively discussing and recommending ethical fashion brands with transparent supply chains.', source: 'Facebook Groups' },
      { topic: 'Fabric Science Explained', relevance_score: 78, platform: 'YouTube', description: 'Educational content about sustainable fabrics like organic cotton, Tencel, and recycled polyester is gaining traction.', source: 'YouTube Search' },
      { topic: 'Slow Fashion Movement', relevance_score: 95, platform: 'Instagram', description: 'The slow fashion movement continues to grow with creators advocating for mindful purchasing and wardrobe longevity.', source: 'Instagram Reels' },
    ],
    seo_keywords: [
      { keyword: 'sustainable fashion tips', search_volume: '12,400/mo', difficulty: 'Medium', platform_relevance: 'All Platforms' },
      { keyword: 'ethical clothing brands', search_volume: '8,900/mo', difficulty: 'High', platform_relevance: 'YouTube, Facebook' },
      { keyword: 'capsule wardrobe ideas', search_volume: '15,200/mo', difficulty: 'Low', platform_relevance: 'Instagram, YouTube' },
      { keyword: 'thrift store fashion haul', search_volume: '6,700/mo', difficulty: 'Low', platform_relevance: 'YouTube' },
      { keyword: 'eco-friendly fashion 2025', search_volume: '4,300/mo', difficulty: 'Medium', platform_relevance: 'All Platforms' },
    ],
    hashtags: [
      { tag: '#SustainableFashion', platform: 'Instagram', popularity: 'Very High' },
      { tag: '#SlowFashion', platform: 'Instagram', popularity: 'High' },
      { tag: '#ThriftFlip', platform: 'YouTube', popularity: 'High' },
      { tag: '#EthicalStyle', platform: 'Facebook', popularity: 'Medium' },
      { tag: '#CapsuleWardrobe', platform: 'Instagram', popularity: 'High' },
      { tag: '#EcoFashion', platform: 'Facebook', popularity: 'Medium' },
    ],
    instagram_ideas: [
      { title: '15 Pieces, 30 Outfits: My Capsule Wardrobe', description: 'Create a carousel post showcasing how to build a versatile capsule wardrobe from just 15 sustainable pieces. Include styling tips for each combination.', hashtags: ['#CapsuleWardrobe', '#SustainableFashion', '#MinimalistStyle'], story_angle: 'Personal transformation through minimalism', content_format: 'Carousel Post' },
      { title: 'Behind the Seams: How Your Clothes Are Made', description: 'Take followers on a visual journey through an ethical factory, showing the craftsmanship behind sustainable garments.', hashtags: ['#EthicalFashion', '#BehindTheScenes', '#SlowFashion'], story_angle: 'Transparency in fashion production', content_format: 'Reel' },
      { title: 'Thrift Store to Runway: Style Challenge', description: 'Document a challenge where you create a high-fashion look entirely from thrift store finds, proving sustainable can be stylish.', hashtags: ['#ThriftFlip', '#StyleChallenge', '#SecondhandFashion'], story_angle: 'Creativity meets sustainability', content_format: 'Reel' },
    ],
    facebook_ideas: [
      { title: 'The True Cost of Fast Fashion: A Deep Dive', description: 'Write a long-form article exploring the environmental and social impact of fast fashion, backed by research and data. Encourage community discussion.', hashtags: ['#FastFashionImpact', '#SustainableLiving', '#EthicalConsumer'], story_angle: 'Education and awareness through data', content_format: 'Long-form Article' },
      { title: 'Community Swap Event Guide', description: 'Create a comprehensive guide for organizing local clothing swap events, including planning templates, promotion tips, and success stories.', hashtags: ['#ClothingSwap', '#CommunityFashion', '#ZeroWaste'], story_angle: 'Building community around sustainability', content_format: 'Guide Post' },
      { title: 'Ethical Brand of the Week Spotlight', description: 'Weekly series highlighting a different ethical fashion brand, covering their mission, practices, price range, and standout pieces.', hashtags: ['#EthicalBrands', '#SustainableStyle', '#ConsciousConsumer'], story_angle: 'Curated recommendations for conscious consumers', content_format: 'Photo + Article' },
    ],
    youtube_ideas: [
      { title: 'I Built a Sustainable Wardrobe for Under $200', description: 'Full-length video documenting the process of building a complete, sustainable wardrobe on a budget using thrift stores, ethical brands on sale, and clothing swaps.', hashtags: ['#SustainableFashion', '#BudgetFashion', '#ThriftHaul'], story_angle: 'Accessibility of sustainable fashion', content_format: 'Long-form Video (15-20 min)' },
      { title: 'Fabric Guide: What to Buy and What to Avoid', description: 'Educational video breaking down common fabrics, their environmental impact, durability, and care instructions. Include a downloadable fabric guide.', hashtags: ['#FabricGuide', '#SustainableMaterials', '#FashionEducation'], story_angle: 'Empowering informed purchasing decisions', content_format: 'Educational Video (10-15 min)' },
      { title: 'Thrift Flip: Oversized Blazer to Trendy Crop Set', description: 'Step-by-step DIY transformation of a thrift store blazer into a matching crop top and skirt set, showing that style does not require new purchases.', hashtags: ['#ThriftFlip', '#DIYFashion', '#Upcycling'], story_angle: 'Creative transformation and waste reduction', content_format: 'Tutorial Video (12-18 min)' },
    ],
    weekly_schedule: [
      { day: 'Monday', slots: [{ time: '9:00 AM', platform: 'Instagram', content_type: 'Carousel Post', engagement_prediction: 'High' }, { time: '12:00 PM', platform: 'Facebook', content_type: 'Article', engagement_prediction: 'Medium' }] },
      { day: 'Tuesday', slots: [{ time: '11:00 AM', platform: 'YouTube', content_type: 'Long-form Video', engagement_prediction: 'High' }] },
      { day: 'Wednesday', slots: [{ time: '10:00 AM', platform: 'Instagram', content_type: 'Reel', engagement_prediction: 'Very High' }, { time: '3:00 PM', platform: 'Facebook', content_type: 'Community Post', engagement_prediction: 'Medium' }] },
      { day: 'Thursday', slots: [{ time: '2:00 PM', platform: 'Instagram', content_type: 'Stories', engagement_prediction: 'Medium' }] },
      { day: 'Friday', slots: [{ time: '10:00 AM', platform: 'YouTube', content_type: 'Short Video', engagement_prediction: 'High' }, { time: '4:00 PM', platform: 'Instagram', content_type: 'Carousel Post', engagement_prediction: 'High' }] },
      { day: 'Saturday', slots: [{ time: '11:00 AM', platform: 'Facebook', content_type: 'Brand Spotlight', engagement_prediction: 'Medium' }] },
      { day: 'Sunday', slots: [{ time: '6:00 PM', platform: 'Instagram', content_type: 'Reel', engagement_prediction: 'Very High' }] },
    ],
    platform_tips: [
      { platform: 'Instagram', frequency: '4-5 posts per week', best_times: '9 AM, 12 PM, 6 PM EST', algorithm_tip: 'Reels get 2x more reach than static posts. Use trending audio and keep reels under 30 seconds for maximum engagement. Carousel posts drive saves, which boost algorithmic ranking.' },
      { platform: 'Facebook', frequency: '3 posts per week', best_times: '12 PM, 3 PM EST', algorithm_tip: 'Long-form content and community engagement drive reach. Posts that spark meaningful comments are prioritized. Use Facebook Groups to build a dedicated community.' },
      { platform: 'YouTube', frequency: '2 videos per week', best_times: '11 AM, 2 PM EST', algorithm_tip: 'Watch time is the primary ranking factor. Front-load value in the first 30 seconds. Use chapters, end screens, and cards to boost session duration.' },
    ],
    summary: 'This content strategy focuses on positioning your brand as a trusted voice in sustainable fashion. By combining educational content, creative challenges, and community building across Instagram, Facebook, and YouTube, you can engage environmentally conscious consumers at every stage of their journey. The weekly schedule balances content types and platforms for consistent growth without burnout.',
  }
}

// ---- Platform helpers ----
function getPlatformIcon(platform: string) {
  const p = platform?.toLowerCase() ?? ''
  if (p.includes('instagram')) return <FaInstagram className="w-4 h-4" />
  if (p.includes('facebook')) return <FaFacebook className="w-4 h-4" />
  if (p.includes('youtube')) return <FaYoutube className="w-4 h-4" />
  return <HiViewGrid className="w-4 h-4" />
}

function getPlatformColor(platform: string): string {
  const p = platform?.toLowerCase() ?? ''
  if (p.includes('instagram')) return 'bg-rose-600 text-white'
  if (p.includes('facebook')) return 'bg-blue-600 text-white'
  if (p.includes('youtube')) return 'bg-red-600 text-white'
  return 'bg-secondary text-secondary-foreground'
}

function getPlatformBorderColor(platform: string): string {
  const p = platform?.toLowerCase() ?? ''
  if (p.includes('instagram')) return 'border-l-rose-600'
  if (p.includes('facebook')) return 'border-l-blue-600'
  if (p.includes('youtube')) return 'border-l-red-600'
  return 'border-l-border'
}

function getRelevanceColor(score: number): string {
  if (score >= 85) return 'bg-green-100 text-green-800 border-green-300'
  if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  return 'bg-red-100 text-red-800 border-red-300'
}

function getDifficultyColor(difficulty: string): string {
  const d = difficulty?.toLowerCase() ?? ''
  if (d === 'low') return 'bg-green-100 text-green-800 border-green-300'
  if (d === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  if (d === 'high') return 'bg-red-100 text-red-800 border-red-300'
  return 'bg-secondary text-secondary-foreground'
}

function getEngagementColor(prediction: string): string {
  const p = prediction?.toLowerCase() ?? ''
  if (p.includes('very high')) return 'text-green-700 font-semibold'
  if (p.includes('high')) return 'text-green-600'
  if (p.includes('medium')) return 'text-yellow-600'
  return 'text-muted-foreground'
}

// ---- ErrorBoundary ----
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-serif font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- Sub-components ----

function LoadingSkeleton() {
  return (
    <div className="space-y-8 py-6">
      <div className="flex items-center gap-3 mb-2">
        <BsStars className="w-5 h-5 text-muted-foreground animate-pulse" />
        <p className="text-sm text-muted-foreground font-sans">Crafting your strategy... This may take a moment as our agents research trends, generate ideas, and build your schedule.</p>
      </div>
      <Progress value={undefined} className="h-1" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border border-border shadow-none">
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-16 h-16 border-2 border-border flex items-center justify-center mb-6">
        <MdOutlineArticle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-serif text-xl font-semibold mb-2 tracking-tight">Enter your niche to get started</h3>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed font-sans">
        Describe your content niche above, select your target platforms, and we will generate a comprehensive strategy including trending topics, content ideas, SEO keywords, and a weekly posting schedule.
      </p>
    </div>
  )
}

function TrendingTopicsSection({ topics }: { topics: TrendingTopic[] }) {
  if (!Array.isArray(topics) || topics.length === 0) return null
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HiTrendingUp className="w-5 h-5" />
        <h3 className="font-serif text-lg font-semibold tracking-tight">Trending Topics</h3>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-2">
          {topics.map((topic, idx) => (
            <Card key={idx} className="border border-border shadow-none min-w-[300px] max-w-[340px] flex-shrink-0">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-serif text-sm font-semibold tracking-tight leading-snug">{topic?.topic ?? 'Untitled'}</CardTitle>
                  <Badge variant="outline" className={cn('text-xs border shrink-0', getRelevanceColor(topic?.relevance_score ?? 0))}>
                    {topic?.relevance_score ?? 0}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{topic?.description ?? ''}</p>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs', getPlatformColor(topic?.platform ?? ''))}>
                    <span className="flex items-center gap-1">
                      {getPlatformIcon(topic?.platform ?? '')}
                      {topic?.platform ?? ''}
                    </span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">via {topic?.source ?? 'Unknown'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function ContentIdeasSection({ instagram, facebook, youtube }: { instagram: ContentIdea[]; facebook: ContentIdea[]; youtube: ContentIdea[] }) {
  const igIdeas = Array.isArray(instagram) ? instagram : []
  const fbIdeas = Array.isArray(facebook) ? facebook : []
  const ytIdeas = Array.isArray(youtube) ? youtube : []

  if (igIdeas.length === 0 && fbIdeas.length === 0 && ytIdeas.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HiLightBulb className="w-5 h-5" />
        <h3 className="font-serif text-lg font-semibold tracking-tight">Content Ideas</h3>
      </div>
      <Tabs defaultValue="instagram" className="w-full">
        <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto">
          <TabsTrigger value="instagram" className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-rose-600 rounded-none px-4 py-2.5 data-[state=active]:shadow-none bg-transparent">
            <FaInstagram className="w-4 h-4" />
            <span className="font-sans text-sm">Instagram</span>
            <Badge variant="secondary" className="text-xs ml-1">{igIdeas.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="facebook" className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4 py-2.5 data-[state=active]:shadow-none bg-transparent">
            <FaFacebook className="w-4 h-4" />
            <span className="font-sans text-sm">Facebook</span>
            <Badge variant="secondary" className="text-xs ml-1">{fbIdeas.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-none px-4 py-2.5 data-[state=active]:shadow-none bg-transparent">
            <FaYoutube className="w-4 h-4" />
            <span className="font-sans text-sm">YouTube</span>
            <Badge variant="secondary" className="text-xs ml-1">{ytIdeas.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instagram" className="mt-4">
          <IdeaCards ideas={igIdeas} platform="Instagram" />
        </TabsContent>
        <TabsContent value="facebook" className="mt-4">
          <IdeaCards ideas={fbIdeas} platform="Facebook" />
        </TabsContent>
        <TabsContent value="youtube" className="mt-4">
          <IdeaCards ideas={ytIdeas} platform="YouTube" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function IdeaCards({ ideas, platform }: { ideas: ContentIdea[]; platform: string }) {
  const safeIdeas = Array.isArray(ideas) ? ideas : []
  if (safeIdeas.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No ideas generated for {platform}.</p>
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {safeIdeas.map((idea, idx) => (
        <Card key={idx} className={cn('border border-border shadow-none border-l-4', getPlatformBorderColor(platform))}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="font-serif text-sm font-semibold tracking-tight leading-snug">{idea?.title ?? 'Untitled'}</CardTitle>
              <Badge variant="outline" className="text-xs shrink-0 border-border">{idea?.content_format ?? 'Post'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{idea?.description ?? ''}</p>
            <div className="flex items-center gap-1.5">
              <HiStar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium">Angle:</span>
              <span className="text-xs text-muted-foreground">{idea?.story_angle ?? ''}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.isArray(idea?.hashtags) && idea.hashtags.map((tag, tIdx) => (
                <Badge key={tIdx} variant="secondary" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SEOKeywordsSection({ keywords, hashtags }: { keywords: SEOKeyword[]; hashtags: Hashtag[] }) {
  const safeKeywords = Array.isArray(keywords) ? keywords : []
  const safeHashtags = Array.isArray(hashtags) ? hashtags : []

  if (safeKeywords.length === 0 && safeHashtags.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HiSearch className="w-5 h-5" />
        <h3 className="font-serif text-lg font-semibold tracking-tight">SEO Keywords & Hashtags</h3>
      </div>

      {safeKeywords.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground font-sans">Keywords</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-serif font-semibold text-xs uppercase tracking-wider">Keyword</th>
                  <th className="text-left py-2 px-3 font-serif font-semibold text-xs uppercase tracking-wider">Volume</th>
                  <th className="text-left py-2 px-3 font-serif font-semibold text-xs uppercase tracking-wider">Difficulty</th>
                  <th className="text-left py-2 px-3 font-serif font-semibold text-xs uppercase tracking-wider">Relevance</th>
                </tr>
              </thead>
              <tbody>
                {safeKeywords.map((kw, idx) => (
                  <tr key={idx} className="border-b border-border last:border-b-0">
                    <td className="py-2.5 px-3 font-medium text-sm">{kw?.keyword ?? ''}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-sm">{kw?.search_volume ?? ''}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className={cn('text-xs border', getDifficultyColor(kw?.difficulty ?? ''))}>{kw?.difficulty ?? ''}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-sm">{kw?.platform_relevance ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {safeHashtags.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground font-sans">Hashtags</h4>
          <div className="flex flex-wrap gap-2">
            {safeHashtags.map((ht, idx) => (
              <div key={idx} className="flex items-center gap-1.5 border border-border px-3 py-1.5">
                <BsHash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{ht?.tag ?? ''}</span>
                <Badge className={cn('text-xs ml-1', getPlatformColor(ht?.platform ?? ''))}>{ht?.platform ?? ''}</Badge>
                <span className="text-xs text-muted-foreground ml-1">{ht?.popularity ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WeeklyScheduleSection({ schedule }: { schedule: WeeklyScheduleDay[] }) {
  const safeSchedule = Array.isArray(schedule) ? schedule : []
  if (safeSchedule.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BsCalendarWeek className="w-5 h-5" />
        <h3 className="font-serif text-lg font-semibold tracking-tight">Weekly Posting Schedule</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {safeSchedule.map((day, idx) => {
          const safeSlots = Array.isArray(day?.slots) ? day.slots : []
          return (
            <Card key={idx} className="border border-border shadow-none">
              <CardHeader className="py-3 px-4">
                <CardTitle className="font-serif text-sm font-semibold">{day?.day ?? `Day ${idx + 1}`}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {safeSlots.length === 0 && (
                  <p className="text-xs text-muted-foreground">No posts scheduled</p>
                )}
                {safeSlots.map((slot, sIdx) => (
                  <div key={sIdx} className={cn('border-l-2 pl-3 py-1.5', getPlatformBorderColor(slot?.platform ?? ''))}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <HiClock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{slot?.time ?? ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getPlatformIcon(slot?.platform ?? '')}
                      <span className="text-xs text-muted-foreground">{slot?.content_type ?? ''}</span>
                    </div>
                    <span className={cn('text-xs', getEngagementColor(slot?.engagement_prediction ?? ''))}>
                      {slot?.engagement_prediction ?? ''} engagement
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function PlatformTipsSection({ tips }: { tips: PlatformTip[] }) {
  const safeTips = Array.isArray(tips) ? tips : []
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (safeTips.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HiChartBar className="w-5 h-5" />
        <h3 className="font-serif text-lg font-semibold tracking-tight">Platform Tips</h3>
      </div>
      <div className="space-y-2">
        {safeTips.map((tip, idx) => (
          <Collapsible key={idx} open={openIndex === idx} onOpenChange={(open) => setOpenIndex(open ? idx : null)}>
            <Card className="border border-border shadow-none">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(tip?.platform ?? '')}
                    <span className="font-serif font-semibold text-sm">{tip?.platform ?? 'Platform'}</span>
                    <Badge variant="outline" className="text-xs border-border">{tip?.frequency ?? ''}</Badge>
                  </div>
                  {openIndex === idx ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <Label className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Best Times</Label>
                      <p className="text-sm mt-1 font-sans">{tip?.best_times ?? ''}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Posting Frequency</Label>
                      <p className="text-sm mt-1 font-sans">{tip?.frequency ?? ''}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Algorithm Tip</Label>
                    <p className="text-sm mt-1 leading-relaxed font-sans">{tip?.algorithm_tip ?? ''}</p>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}

function StrategyResults({ data }: { data: ContentStrategyData }) {
  return (
    <div className="space-y-10 py-6">
      {/* Header */}
      <div className="space-y-3">
        <h2 className="font-serif text-2xl font-bold tracking-tight">{data?.strategy_title ?? 'Content Strategy'}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-xs border-border font-sans">{data?.niche ?? ''}</Badge>
          {Array.isArray(data?.platforms) && data.platforms.map((p, i) => (
            <Badge key={i} className={cn('text-xs', getPlatformColor(p))}>
              <span className="flex items-center gap-1">{getPlatformIcon(p)} {p}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Summary */}
      {data?.summary && (
        <Card className="border border-border shadow-none bg-secondary/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <BsStars className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="font-sans text-sm leading-relaxed">{renderMarkdown(data.summary)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Trending Topics */}
      <TrendingTopicsSection topics={data?.trending_topics ?? []} />

      <Separator />

      {/* Content Ideas */}
      <ContentIdeasSection
        instagram={data?.instagram_ideas ?? []}
        facebook={data?.facebook_ideas ?? []}
        youtube={data?.youtube_ideas ?? []}
      />

      <Separator />

      {/* SEO Keywords & Hashtags */}
      <SEOKeywordsSection keywords={data?.seo_keywords ?? []} hashtags={data?.hashtags ?? []} />

      <Separator />

      {/* Weekly Schedule */}
      <WeeklyScheduleSection schedule={data?.weekly_schedule ?? []} />

      <Separator />

      {/* Platform Tips */}
      <PlatformTipsSection tips={data?.platform_tips ?? []} />
    </div>
  )
}

function HistoryScreen({ history, onSelect, onDelete, searchTerm, onSearchChange }: {
  history: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
  searchTerm: string
  onSearchChange: (val: string) => void
}) {
  const safeHistory = Array.isArray(history) ? history : []
  const filtered = safeHistory.filter((entry) => {
    if (!searchTerm) return true
    return (entry?.niche ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (entry?.data?.strategy_title ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center gap-2">
        <HiDocumentText className="w-5 h-5" />
        <h2 className="font-serif text-xl font-semibold tracking-tight">Strategy History</h2>
      </div>

      <div className="relative">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by niche or title..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 border-border shadow-none font-sans"
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <HiDocumentText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-sans">
            {safeHistory.length === 0 ? 'No strategies generated yet.' : 'No strategies match your search.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((entry) => (
          <HistoryCard key={entry.id} entry={entry} onSelect={onSelect} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

function HistoryCard({ entry, onSelect, onDelete }: {
  entry: HistoryEntry
  onSelect: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="font-serif text-sm font-semibold tracking-tight truncate">{entry?.data?.strategy_title ?? entry?.niche ?? 'Untitled Strategy'}</CardTitle>
            <CardDescription className="text-xs font-sans">
              {entry?.niche ?? ''} -- {entry?.timestamp ? new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {Array.isArray(entry?.platforms) && entry.platforms.map((p, i) => (
              <span key={i} className="text-muted-foreground">{getPlatformIcon(p)}</span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {entry?.data?.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 font-sans">{entry.data.summary}</p>
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)} className="text-xs shadow-none border-border font-sans">
            {expanded ? <><HiChevronUp className="w-3 h-3 mr-1" /> Collapse</> : <><HiChevronDown className="w-3 h-3 mr-1" /> Expand</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSelect(entry)} className="text-xs shadow-none border-border font-sans">
            <BsArrowRight className="w-3 h-3 mr-1" /> View Full
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(entry.id)} className="text-xs shadow-none border-border text-red-600 hover:text-red-700 hover:bg-red-50 font-sans">
            <IoMdClose className="w-3 h-3 mr-1" /> Remove
          </Button>
        </div>
        {expanded && entry?.data && (
          <div className="pt-3 border-t border-border">
            <StrategyResults data={entry.data} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AgentStatusPanel({ activeAgentId, loading }: { activeAgentId: string | null; loading: boolean }) {
  const agents = [
    { id: '699a40d677fba476f42d9fbe', name: 'Content Strategy Coordinator', role: 'Manager / orchestrator' },
    { id: '699a40b8482d2b477bfc4734', name: 'Trend Research Agent', role: 'Trend & keyword analysis' },
    { id: '699a40b92248bbbc86582b2d', name: 'Content Ideation Agent', role: 'Content idea generation' },
    { id: '699a40b9766eae71f9d249a9', name: 'Scheduling Advisor Agent', role: 'Schedule optimization' },
  ]

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="py-3 px-4">
        <CardTitle className="font-serif text-xs font-semibold uppercase tracking-wider">Agent Status</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {agents.map((agent) => {
          const isActive = loading && activeAgentId === agent.id
          const isManager = agent.id === MANAGER_AGENT_ID
          return (
            <div key={agent.id} className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full shrink-0', isActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
              <div className="min-w-0">
                <p className={cn('text-xs font-medium truncate font-sans', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {agent.name}{isManager ? ' (Manager)' : ''}
                </p>
                <p className="text-xs text-muted-foreground truncate font-sans">{agent.role}</p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ---- Main Page ----
export default function Page() {
  // Navigation
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'history'>('dashboard')

  // Form state
  const [niche, setNiche] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['Instagram', 'Facebook', 'YouTube'])
  const [contentStyle, setContentStyle] = useState('Inspirational Stories')
  const [audienceDescription, setAudienceDescription] = useState('')

  // Results state
  const [strategyData, setStrategyData] = useState<ContentStrategyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Sample data toggle
  const [showSampleData, setShowSampleData] = useState(false)

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historySearch, setHistorySearch] = useState('')

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Save history to localStorage
  const saveHistory = useCallback((entries: HistoryEntry[]) => {
    setHistory(entries)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
    } catch {
      // ignore
    }
  }, [])

  // Platform toggle
  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        if (prev.length === 1) return prev
        return prev.filter((p) => p !== platform)
      }
      return [...prev, platform]
    })
  }

  // Generate strategy
  const handleGenerate = async () => {
    if (!niche.trim()) {
      setErrorMessage('Please enter a niche to generate a strategy.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setStrategyData(null)
    setActiveAgentId(MANAGER_AGENT_ID)

    const message = `Generate a comprehensive content strategy for the niche: "${niche.trim()}". Target platforms: ${selectedPlatforms.join(', ')}. Content style preference: ${contentStyle}. ${audienceDescription.trim() ? `Target audience: ${audienceDescription.trim()}` : ''}`

    try {
      const result = await callAIAgent(message, MANAGER_AGENT_ID)
      const parsed = parseAgentResponse(result)

      if (parsed) {
        setStrategyData(parsed)

        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          niche: niche.trim(),
          platforms: [...selectedPlatforms],
          contentStyle,
          data: parsed,
        }
        saveHistory([entry, ...history])
      } else {
        setErrorMessage(result?.error ?? result?.response?.message ?? 'Failed to parse the agent response. Please try again.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  // Sample data toggle handler
  const handleSampleToggle = (checked: boolean) => {
    setShowSampleData(checked)
    if (checked) {
      setNiche('Sustainable Fashion')
      setSelectedPlatforms(['Instagram', 'Facebook', 'YouTube'])
      setContentStyle('Inspirational Stories')
      setAudienceDescription('Environmentally conscious millennials and Gen Z interested in ethical clothing')
      setStrategyData(getSampleData())
      setErrorMessage('')
    } else {
      setNiche('')
      setSelectedPlatforms(['Instagram', 'Facebook', 'YouTube'])
      setContentStyle('Inspirational Stories')
      setAudienceDescription('')
      setStrategyData(null)
    }
  }

  // History handlers
  const handleSelectHistory = (entry: HistoryEntry) => {
    setStrategyData(entry.data)
    setNiche(entry.niche)
    setSelectedPlatforms(Array.isArray(entry.platforms) ? entry.platforms : [])
    setContentStyle(entry.contentStyle ?? 'Inspirational Stories')
    setActiveScreen('dashboard')
  }

  const handleDeleteHistory = (id: string) => {
    const updated = history.filter((e) => e.id !== id)
    saveHistory(updated)
  }

  const displayData = strategyData

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <MdOutlineArticle className="w-6 h-6" />
              <h1 className="font-serif text-xl font-bold tracking-tight">Content Strategy Assistant</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground font-sans cursor-pointer">Sample Data</Label>
                <Switch
                  id="sample-toggle"
                  checked={showSampleData}
                  onCheckedChange={handleSampleToggle}
                />
              </div>
              <div className="w-8 h-8 bg-secondary border border-border flex items-center justify-center">
                <HiViewGrid className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="md:hidden flex border-b border-border w-full">
          <button
            onClick={() => setActiveScreen('dashboard')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-sans border-b-2', activeScreen === 'dashboard' ? 'border-foreground font-medium' : 'border-transparent text-muted-foreground')}
          >
            <HiViewGrid className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveScreen('history')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-sans border-b-2', activeScreen === 'history' ? 'border-foreground font-medium' : 'border-transparent text-muted-foreground')}
          >
            <HiDocumentText className="w-4 h-4" />
            History
          </button>
        </div>

        {/* Main Layout */}
        <div className="max-w-screen-2xl mx-auto flex">
          {/* Left Sidebar */}
          <aside className="hidden md:flex w-56 shrink-0 border-r border-border min-h-[calc(100vh-65px)] sticky top-[65px] self-start flex-col py-6 px-4">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveScreen('dashboard')}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-sans text-left transition-colors', activeScreen === 'dashboard' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-secondary')}
              >
                <HiViewGrid className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveScreen('history')}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-sans text-left transition-colors', activeScreen === 'history' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-secondary')}
              >
                <HiDocumentText className="w-4 h-4" />
                History
                {history.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-auto">{history.length}</Badge>
                )}
              </button>
            </nav>

            <div className="mt-auto">
              <AgentStatusPanel activeAgentId={activeAgentId} loading={loading} />
            </div>
          </aside>

          <main className="flex-1 min-w-0 px-6 lg:px-10 py-6">
            {activeScreen === 'dashboard' && (
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Strategy Input Card */}
                <Card className="border border-border shadow-none">
                  <CardHeader>
                    <CardTitle className="font-serif text-lg font-semibold tracking-tight">Generate Content Strategy</CardTitle>
                    <CardDescription className="font-sans text-sm">Define your niche, pick platforms, and let our AI agents create a tailored content plan.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Niche Input */}
                    <div className="space-y-2">
                      <Label htmlFor="niche" className="font-sans text-sm font-medium">Content Niche</Label>
                      <Input
                        id="niche"
                        placeholder="e.g., sustainable fashion"
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        className="border-border shadow-none font-sans"
                        disabled={loading}
                      />
                    </div>

                    {/* Platform Chips */}
                    <div className="space-y-2">
                      <Label className="font-sans text-sm font-medium">Target Platforms</Label>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { name: 'Instagram', icon: <FaInstagram className="w-4 h-4" />, activeClass: 'bg-rose-600 text-white border-rose-600' },
                          { name: 'Facebook', icon: <FaFacebook className="w-4 h-4" />, activeClass: 'bg-blue-600 text-white border-blue-600' },
                          { name: 'YouTube', icon: <FaYoutube className="w-4 h-4" />, activeClass: 'bg-red-600 text-white border-red-600' },
                        ].map((p) => {
                          const isSelected = selectedPlatforms.includes(p.name)
                          return (
                            <button
                              key={p.name}
                              onClick={() => togglePlatform(p.name)}
                              disabled={loading}
                              className={cn('flex items-center gap-2 px-4 py-2 border text-sm font-sans transition-colors', isSelected ? p.activeClass : 'border-border text-muted-foreground hover:bg-secondary')}
                            >
                              {p.icon}
                              {p.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Content Style */}
                    <div className="space-y-2">
                      <Label htmlFor="style" className="font-sans text-sm font-medium">Content Style</Label>
                      <Select value={contentStyle} onValueChange={setContentStyle} disabled={loading}>
                        <SelectTrigger className="border-border shadow-none font-sans">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inspirational Stories">Inspirational Stories</SelectItem>
                          <SelectItem value="How-To">How-To / Tutorials</SelectItem>
                          <SelectItem value="Behind-the-Scenes">Behind-the-Scenes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Audience Description */}
                    <div className="space-y-2">
                      <Label htmlFor="audience" className="font-sans text-sm font-medium">
                        Target Audience <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Textarea
                        id="audience"
                        placeholder="Describe your target audience, demographics, interests..."
                        value={audienceDescription}
                        onChange={(e) => setAudienceDescription(e.target.value)}
                        className="border-border shadow-none font-sans resize-none"
                        rows={3}
                        disabled={loading}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={handleGenerate}
                      disabled={loading || !niche.trim()}
                      className="w-full shadow-none font-sans"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <BsStars className="w-4 h-4 animate-spin" />
                          Generating Strategy...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <BsStars className="w-4 h-4" />
                          Generate Content Strategy
                        </span>
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Error state */}
                {errorMessage && !loading && (
                  <Alert variant="destructive" className="shadow-none border-border">
                    <AlertTitle className="font-serif text-sm font-semibold">Generation Failed</AlertTitle>
                    <AlertDescription className="font-sans text-sm">
                      {errorMessage}
                      <Button variant="outline" size="sm" onClick={handleGenerate} className="ml-3 shadow-none border-border font-sans text-xs">
                        <HiRefresh className="w-3 h-3 mr-1" /> Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Loading state */}
                {loading && <LoadingSkeleton />}

                {/* Results */}
                {!loading && displayData && <StrategyResults data={displayData} />}

                {/* Empty state */}
                {!loading && !displayData && !errorMessage && <EmptyState />}

                {/* Mobile agent status */}
                <div className="md:hidden">
                  <AgentStatusPanel activeAgentId={activeAgentId} loading={loading} />
                </div>
              </div>
            )}

            {activeScreen === 'history' && (
              <div className="max-w-4xl mx-auto">
                <HistoryScreen
                  history={history}
                  onSelect={handleSelectHistory}
                  onDelete={handleDeleteHistory}
                  searchTerm={historySearch}
                  onSearchChange={setHistorySearch}
                />
                {/* Mobile agent status */}
                <div className="md:hidden mt-6">
                  <AgentStatusPanel activeAgentId={activeAgentId} loading={loading} />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
