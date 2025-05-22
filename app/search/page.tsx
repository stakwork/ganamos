"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { mockPosts } from "@/lib/mock-data"
import { formatSatsValue } from "@/lib/utils"

export default function SearchPage() {
  // Group posts by reward range for the bar chart
  const rewardRanges = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]
  const postsByReward = rewardRanges.map((min, index) => {
    const max = rewardRanges[index + 1] || Number.POSITIVE_INFINITY
    const count = mockPosts.filter((post) => post.reward >= min && post.reward < max).length
    return { min, max, count }
  })

  const maxCount = Math.max(...postsByReward.map((range) => range.count))
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("any")
  const [rewardRange, setRewardRange] = useState<[number, number]>([0, 10000])

  return (
    <div className="container px-4 py-6 mx-auto max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Search</h1>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium">Search</label>
          <div className="relative mt-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search issues..."
              className="w-full pl-10 pr-4 py-2 border rounded-md dark:border-gray-800 bg-background"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Location</label>
          <select className="w-full mt-1 p-2 border rounded-md dark:border-gray-800 bg-background">
            <option>Downtown</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Reward Range</label>
          <div className="mt-4">
            <div className="flex h-24 items-end space-x-1 mb-2">
              {postsByReward.map((range, i) => (
                <div
                  key={i}
                  className="flex-1 bg-emerald-200 dark:bg-emerald-900/50 rounded-t"
                  style={{
                    height: `${range.count ? (range.count / maxCount) * 100 : 0}%`,
                    opacity: rewardRange[0] <= range.min && range.max <= rewardRange[1] ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              step="1000"
              value={rewardRange[1]}
              onChange={(e) => setRewardRange([rewardRange[0], Number.parseInt(e.target.value)])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatSatsValue(rewardRange[0])}</span>
              <span>{formatSatsValue(rewardRange[1])}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Date</label>
          <div className="flex gap-2">
            <Button
              variant={selectedDateFilter === "any" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setSelectedDateFilter("any")}
            >
              Any Time
            </Button>
            <Button
              variant={selectedDateFilter === "today" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setSelectedDateFilter("today")}
            >
              Today
            </Button>
            <Button
              variant={selectedDateFilter === "week" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setSelectedDateFilter("week")}
            >
              This Week
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="w-full">Apply Filters</Button>
        </div>
      </div>
    </div>
  )
}
