"use client";

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PostCard } from "@/components/post-card";
import { useAuth } from "@/components/auth-provider";
import { useNotifications } from "@/components/notifications-provider";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { formatSatsValue, formatTimeAgo } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { AvatarSelector } from "@/components/avatar-selector";
import { GroupsList } from "@/components/groups-list";
import { FamilySection } from "@/components/family-section";
import { UserQRModal } from "@/components/user-qr-modal";
import type { Post } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { AddConnectedAccountDialog } from "@/components/add-connected-account-dialog";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { Check, X, MapPin, Cat, QrCode, User, Edit, Dog, Rabbit, Squirrel, Turtle } from "lucide-react";

type ActivityItem = {
  id: string;
  type:
    | "post"
    | "fix"
    | "reward"
    | "fix_submitted"
    | "fix_review_needed"
    | "donation"
    | "withdrawal"
    | "deposit";
  postId?: string;
  postTitle?: string;
  postFixed?: boolean;
  postUnderReview?: boolean;
  postLocation?: string;
  timestamp: Date;
  amount?: number;
  submitterName?: string;
  submitterAvatar?: string;
  // Donation specific fields
  donationId?: string;
  locationName?: string;
  donorName?: string;
  message?: string;
  related_id?: string;
};

export default function ProfilePage() {
  const {
    user,
    profile,
    mainAccountProfile,
    loading,
    session,
    sessionLoaded,
    signOut,
    isConnectedAccount,
    switchToAccount,
    resetToMainAccount,
    connectedAccounts,
    fetchConnectedAccounts,
    activeUserId,
    updateProfile,
  } = useAuth();
  const { hasPendingRequests } = useNotifications();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("activity");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [postedIssues, setPostedIssues] = useState<Post[]>([]);
  const [fixedIssues, setFixedIssues] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [bitcoinPrice, setBitcoinPrice] = useState<number | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const ACTIVITIES_PER_PAGE = 10;
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showEditUsername, setShowEditUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  // New state for account management
  const [accountToManage, setAccountToManage] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Connected devices state
  const [connectedDevices, setConnectedDevices] = useState<any[]>([]);
  const [isDevicesLoading, setIsDevicesLoading] = useState(true);
  const [isRemoveMode, setIsRemoveMode] = useState(false);

  // Helper function to get pet icon
  const getPetIcon = (petType: string, size: number = 24) => {
    const iconProps = { size, className: "text-white" }
    switch (petType) {
      case 'dog': return <Dog {...iconProps} />
      case 'rabbit': return <Rabbit {...iconProps} />
      case 'squirrel': return <Squirrel {...iconProps} />
      case 'turtle': return <Turtle {...iconProps} />
      default: return <Cat {...iconProps} />
    }
  };

  // Helper function to format balance with k notation
  const formatBalanceWithK = (balance: number) => {
    if (balance > 999) {
      return (balance / 1000).toFixed(1) + 'k';
    }
    return balance.toString();
  };
  const [currentSort, setCurrentSort] = useState<
    "Recent" | "Nearby" | "Reward"
  >("Recent");

  // Cache for posts data to avoid redundant processing
  const postsCache = useRef<Post[]>([]);
  // Add a ref for activities cache to avoid redundant fetching
  const activitiesCache = useRef<ActivityItem[] | null>(null);
  // Track if initial data has been loaded
  const initialDataLoaded = useRef(false);
  // Track if Bitcoin price has been fetched
  const bitcoinPriceFetched = useRef(false);
  // Track the current active user to detect changes
  const currentActiveUser = useRef<string | null>(null);

  // Add a ref to track the current post page for activities
  const activitiesPostPage = useRef(1);

  // Add session guard with useEffect
  useEffect(() => {
    if (sessionLoaded && !session) {
      router.push("/auth/login");
    }
  }, [session, sessionLoaded, router]);

  // Detect when active user changes and reset data
  useEffect(() => {
    const newActiveUser = activeUserId || user?.id || null;

    if (currentActiveUser.current !== newActiveUser && newActiveUser) {
      setActivities([]);
      setPostedIssues([]);
      setFixedIssues([]);
      setActivitiesPage(1);
      setPostsPage(1);
      setHasMoreActivities(false);
      setHasMorePosts(false);
      postsCache.current = [];
      initialDataLoaded.current = false;
      setConnectedDevices([]); // Clear devices immediately
      setIsDevicesLoading(true); // Set loading state

      // Update the tracked user
      currentActiveUser.current = newActiveUser;
    }
  }, [activeUserId, user?.id]);

  // Fetch connected devices
  const fetchConnectedDevices = useCallback(async () => {
    if (!user) return;

    try {
      setIsDevicesLoading(true);
      const response = await fetch("/api/device/list");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConnectedDevices(data.devices || []);
        }
      }
    } catch (error) {
      console.warn("Failed to fetch connected devices:", error);
    } finally {
      setIsDevicesLoading(false);
    }
  }, [user]);

  // Fetch connected devices when user or activeUserId changes
  useEffect(() => {
    if (user) {
      fetchConnectedDevices();
    }
  }, [user, activeUserId, fetchConnectedDevices]);

  // Fetch the current Bitcoin price - memoized to prevent unnecessary re-creation
  const fetchBitcoinPrice = useCallback(async () => {
    if (bitcoinPriceFetched.current) return;

    try {
      setIsPriceLoading(true);

      const response = await fetch("/api/bitcoin-price");
      
      if (response.ok) {
        const data = await response.json();
        if (data.price && typeof data.price === 'number') {
          setBitcoinPrice(data.price);
          bitcoinPriceFetched.current = true;
        } else {
          console.warn("Bitcoin price API returned invalid price data");
          setBitcoinPrice(null);
        }
      } else {
        console.warn("Bitcoin price API request failed");
        setBitcoinPrice(null);
      }
    } catch (error) {
      console.warn("Failed to fetch Bitcoin price:", error);
      setBitcoinPrice(null);
    } finally {
      setIsPriceLoading(false);
    }
  }, []);

  // Calculate USD value from satoshis
  const calculateUsdValue = (sats: number) => {
    if (!bitcoinPrice) return null;
    const btcAmount = sats / 100000000;
    const usdValue = btcAmount * bitcoinPrice;
    return usdValue.toFixed(2);
  };

  // Fetch all posts related to the user in a single query
  const fetchUserPosts = useCallback(
    async (page = 1) => {
      if (!user || !supabase) return { posts: [], hasMore: false };

      try {
        const currentUserId = activeUserId || user.id;

        const limit = 5;
        const offset = (page - 1) * limit;

        const { data, error } = await supabase
          .from("posts")
          .select(
            `
            *,
            group:group_id(
              id,
              name,
              description
            )
          `
          )
          .or(`user_id.eq.${currentUserId},fixed_by.eq.${currentUserId}`)
          .order("created_at", { ascending: false })
          .limit(limit)
          .range(offset, offset + limit - 1);

        if (error) {
          return { posts: [], hasMore: false };
        }

        // Deduplicate posts by id in case a user both created and fixed the same post
        const uniquePosts = data
          ? data.filter(
              (post: any, index: number, self: any[]) =>
                index === self.findIndex((p: any) => p.id === post.id)
            )
          : [];

        // Check if there are more posts
        const { count } = await supabase
          .from("posts")
          .select(
            `
            *,
            group:group_id(
              id,
              name,
              description
            )
          `,
            { count: "exact", head: true }
          )
          .or(`user_id.eq.${currentUserId},fixed_by.eq.${currentUserId}`);

        return {
          posts: uniquePosts,
          hasMore: (count || 0) > page * limit,
        };
      } catch (error) {
        return { posts: [], hasMore: false };
      }
    },
    [user, supabase, session, activeUserId]
  );

  // Fetch recent donations
  const fetchDonations = useCallback(async () => {
    if (!supabase) return { donations: [] };

    try {
      const { data, error } = await supabase
        .from("donations")
        .select("*, donation_pools(location_name)")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        return { donations: [] };
      }

      return { donations: data };
    } catch (error) {
      return { donations: [] };
    }
  }, [supabase]);

  // Process posts into different categories (posted, fixed, activities)
  const processPosts = useCallback(
    (posts: Post[], append = false) => {
      if (!user || !posts) return;

      const currentUserId = activeUserId || user.id;

      // Filter posted issues
      const posted = posts.filter(
        (post) =>
          post.user_id === currentUserId || post.userId === currentUserId
      );
      // Filter fixed issues
      const fixed = posts.filter((post) => post.fixed_by === currentUserId);

      // Update state based on append flag
      if (append) {
        setPostedIssues((prev: Post[]) => [...prev, ...posted]);
        setFixedIssues((prev: Post[]) => [...prev, ...fixed]);
      } else {
        setPostedIssues(posted);
        setFixedIssues(fixed);
      }

      // Store in cache for later use
      if (!append) {
        postsCache.current = posts;
      } else {
        postsCache.current = [...postsCache.current, ...posts];
      }

      return { posted, fixed };
    },
    [user, activeUserId]
  );

  // Add a function to fetch activities from the activities table
  const fetchActivities = useCallback(
    async (page = 1) => {
      if (!user || !supabase) return { activities: [], hasMore: false };
      const pageSize = ACTIVITIES_PER_PAGE;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Fetch activities
      const { data, error, count } = await supabase
        .from("activities")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .range(from, to);
        
      if (error) {
        console.error("Error fetching activities:", error);
        return { activities: [], hasMore: false };
      }
      
      // For post-related activities, fetch the post data
      const postRelatedActivities = (data || []).filter((activity: any) => 
        ["post", "fix", "reward"].includes(activity.type) && activity.related_id
      );
      
      if (postRelatedActivities.length > 0) {
        const postIds = postRelatedActivities.map((a: any) => a.related_id);
        const { data: posts } = await supabase
          .from("posts")
          .select("id, title, fixed, under_review, location")
          .in("id", postIds);
        
        const postsMap = new Map((posts || []).map(p => [p.id, p]));
        
        // Transform activities to include post info
        const transformedActivities = (data || []).map((activity: any) => {
          const post = postsMap.get(activity.related_id);
          if (post && ["post", "fix", "reward"].includes(activity.type)) {
            return {
              ...activity,
              postTitle: post.title,
              postFixed: post.fixed,
              postUnderReview: post.under_review,
              postLocation: post.location,
            };
          }
          return activity;
        });
        
        return {
          activities: transformedActivities,
          hasMore: count ? to + 1 < count : false,
        };
      }
      
      return {
        activities: data || [],
        hasMore: count ? to + 1 < count : false,
      };
    },
    [user, supabase]
  );

  // Initial load and tab change for activity tab
  useEffect(() => {
    if (activeTab === "activity" && user) {
      if (activitiesCache.current) {
        setActivities(activitiesCache.current);
        setIsActivityLoading(false);
      } else {
        setIsActivityLoading(true);
        fetchActivities(1).then(
          ({
            activities: acts,
            hasMore,
          }: {
            activities: ActivityItem[];
            hasMore: boolean;
          }) => {
            setActivities((prev: ActivityItem[]) => {
              const all = [...prev, ...acts];
              const seen = new Set();
              return all.filter((a) => {
                if (seen.has(a.id)) return false;
                seen.add(a.id);
                return true;
              });
            });
            setHasMoreActivities(hasMore);
            setActivitiesPage(1);
            setIsActivityLoading(false);
            activitiesCache.current = acts; // cache the result
          }
        );
      }
    }
  }, [activeTab, user, fetchActivities]);

  // Load more activities (pagination)
  const handleLoadMoreActivities = useCallback(() => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = activitiesPage + 1;
    fetchActivities(nextPage).then(
      ({
        activities: acts,
        hasMore,
      }: {
        activities: ActivityItem[];
        hasMore: boolean;
      }) => {
        setActivities((prev: ActivityItem[]) => {
          const all = [...prev, ...acts];
          const seen = new Set();
          return all.filter((a) => {
            if (seen.has(a.id)) return false;
            seen.add(a.id);
            return true;
          });
        });
        setHasMoreActivities(hasMore);
        setActivitiesPage(nextPage);
        setIsLoadingMore(false);
      }
    );
  }, [isLoadingMore, activitiesPage, fetchActivities]);

  // Add Load More Posts Function
  const handleLoadMorePosts = useCallback(async () => {
    if (isLoadingMorePosts) return;

    setIsLoadingMorePosts(true);
    const nextPage = postsPage + 1;

    try {
      const { posts, hasMore } = await fetchUserPosts(nextPage);

      if (posts.length > 0) {
        processPosts(posts, true); // true = append mode
        setHasMorePosts(hasMore);
        setPostsPage(nextPage);
      }
    } catch (error) {
    } finally {
      setIsLoadingMorePosts(false);
    }
  }, [fetchUserPosts, postsPage, isLoadingMorePosts, processPosts]);

  // Initial data loading
  useEffect(() => {
    if (loading || !user || initialDataLoaded.current) return;

    const loadInitialData = async () => {
      setIsLoading(true);
      initialDataLoaded.current = true;
      setIsLoading(false);

      // Defer heavy data loading to not block navigation
      setTimeout(async () => {
        // Fetch Bitcoin price (only once)
        fetchBitcoinPrice();

        // Fetch user posts immediately regardless of active tab
        const { posts, hasMore } = await fetchUserPosts(1);

        // Fetch recent donations
        const { donations } = await fetchDonations();

        if (posts.length > 0) {
          // Process posts into different categories
          processPosts(posts);
          setHasMorePosts(hasMore);

          // Generate initial activities if on activity tab
          if (activeTab === "activity") {
            fetchActivities(1).then(
              ({
                activities: acts,
                hasMore,
              }: {
                activities: ActivityItem[];
                hasMore: boolean;
              }) => {
                setActivities((prev: ActivityItem[]) => {
                  const all = [...prev, ...acts];
                  const seen = new Set();
                  return all.filter((a) => {
                    if (seen.has(a.id)) return false;
                    seen.add(a.id);
                    return true;
                  });
                });
                setHasMoreActivities(hasMore);
                setActivitiesPage(1);
                setIsActivityLoading(false);
                activitiesCache.current = acts; // cache the result
              }
            );
          }
        }
      }, 0);
    };

    loadInitialData();
  }, [
    user,
    loading,
    activeTab,
    fetchBitcoinPrice,
    fetchUserPosts,
    processPosts,
    fetchActivities,
    activeUserId,
    fetchDonations,
  ]);

  useEffect(() => {
    if (user?.id) {
      fetchConnectedAccounts();
    }
  }, [user?.id]);

  // Refresh connected accounts when page becomes visible (after returning from withdraw page)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Profile page focused, refreshing connected accounts')
      fetchConnectedAccounts();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('Profile page visible, refreshing connected accounts')
        fetchConnectedAccounts();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchConnectedAccounts]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        !document.hidden &&
        activities.length === 0 &&
        !isLoading &&
        user &&
        initialDataLoaded.current
      ) {
        // Tab became visible and we have no activities, reload them
        const loadData = async () => {
          const { posts } = await fetchUserPosts(1);
          if (posts.length > 0) {
            processPosts(posts);
            if (activeTab === "activity") {
              fetchActivities(1).then(
                ({
                  activities: acts,
                  hasMore,
                }: {
                  activities: ActivityItem[];
                  hasMore: boolean;
                }) => {
                  setActivities((prev: ActivityItem[]) => {
                    const all = [...prev, ...acts];
                    const seen = new Set();
                    return all.filter((a) => {
                      if (seen.has(a.id)) return false;
                      seen.add(a.id);
                      return true;
                    });
                  });
                  setHasMoreActivities(hasMore);
                  setActivitiesPage(1);
                  setIsActivityLoading(false);
                }
              );
            }
          }
        };
        loadData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [
    activities.length,
    isLoading,
    user,
    activeTab,
    fetchUserPosts,
    processPosts,
    fetchActivities,
  ]);

  // Add a function to fetch all posts for the user (no limit)
  const fetchAllUserPosts = useCallback(async () => {
    if (!user || !supabase) return [];
    try {
      const currentUserId = activeUserId || user.id;
      const { data, error } = await supabase
        .from("posts")
        .select(`*, group:group_id(id, name, description)`)
        .or(`user_id.eq.${currentUserId},fixed_by.eq.${currentUserId}`)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(
          "Supabase error fetching all posts for activity feed:",
          error
        );
        return [];
      }
      const deduped = data
        ? data.filter(
            (post: any, index: number, self: any[]) =>
              index === self.findIndex((p: any) => p.id === post.id)
          )
        : [];
      console.log("Fetched all posts for activity feed:", deduped.length);
      return deduped;
    } catch (error) {
      console.error("Exception fetching all posts for activity feed:", error);
      return [];
    }
  }, [user, supabase, session, activeUserId]);

  // Update handleTabChange to fetch all posts for activity tab
  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);

      // Handle posts tab loading
      if (
        value === "posts" &&
        postedIssues.length === 0 &&
        fixedIssues.length === 0 &&
        !isLoading
      ) {
        setIsPostsLoading(true);
        fetchUserPosts(1).then(({ posts, hasMore }) => {
          if (posts.length > 0) {
            processPosts(posts);
            setHasMorePosts(hasMore);
          }
          setIsPostsLoading(false);
        });
      }

      if (value === "activity") {
        if (activitiesCache.current) {
          setActivities(activitiesCache.current);
          setIsActivityLoading(false);
        } else {
          setIsActivityLoading(true);
          fetchAllUserPosts().then((allPosts: Post[]) => {
            postsCache.current = allPosts;
            fetchActivities(1).then(
              ({
                activities: acts,
                hasMore,
              }: {
                activities: ActivityItem[];
                hasMore: boolean;
              }) => {
                setActivities((prev: ActivityItem[]) => {
                  const all = [...prev, ...acts];
                  const seen = new Set();
                  return all.filter((a) => {
                    if (seen.has(a.id)) return false;
                    seen.add(a.id);
                    return true;
                  });
                });
                setHasMoreActivities(hasMore);
                setActivitiesPage(1);
                setIsActivityLoading(false);
                activitiesCache.current = acts; // cache the result
              }
            );
          });
        }
      } else if (
        value === "activity" &&
        activities.length === 0 &&
        postsCache.current.length > 0
      ) {
        // Fallback for legacy logic
        fetchActivities(1).then(
          ({
            activities: acts,
            hasMore,
          }: {
            activities: ActivityItem[];
            hasMore: boolean;
          }) => {
            setActivities((prev: ActivityItem[]) => {
              const all = [...prev, ...acts];
              const seen = new Set();
              return all.filter((a) => {
                if (seen.has(a.id)) return false;
                seen.add(a.id);
                return true;
              });
            });
            setHasMoreActivities(hasMore);
            setActivitiesPage(1);
            setIsActivityLoading(false);
          }
        );
      }
    },
    [
      fetchActivities,
      fetchAllUserPosts,
      fetchUserPosts,
      processPosts,
      postedIssues.length,
      fixedIssues.length,
      isLoading,
    ]
  );

  // Handle sort selection
  const handleSortChange = (sortOption: "Recent" | "Nearby" | "Reward") => {
    setCurrentSort(sortOption);
    // Here you would implement the actual sorting logic
    // For now, just show a toast to confirm the selection
    toast({
      title: "Feed sort updated",
      description: `Feed is now sorted by ${sortOption}`,
    });
  };

  // Handle filter navigation
  const handleFilterNavigation = () => {
    router.push("/search");
  };

  // Handle connect pet navigation
  const handleConnectPet = () => {
    router.push("/connect-pet");
  };

  // Handle account management
  const handleAccountAction = (account: any) => {
    setAccountToManage(account);

    // Check if it's a child account (email ends with @ganamos.app)
    const isChildAccount = account.email?.endsWith("@ganamos.app");

    if (isChildAccount) {
      setShowDeleteDialog(true);
    } else {
      setShowDisconnectDialog(true);
    }
  };

  // Handle disconnect account
  const handleDisconnectAccount = async () => {
    if (!accountToManage || !user) return;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/disconnect-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectedAccountId: accountToManage.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to disconnect account");
      }

      // If currently viewing the disconnected account, switch back to main
      if (isConnectedAccount && profile?.id === accountToManage.id) {
        resetToMainAccount();
      }

      // Refresh the connected accounts list
      fetchConnectedAccounts();

      toast({
        title: "Account disconnected",
        description: `${accountToManage.name} has been disconnected from your account.`,
        duration: 2000,
      });

      setShowDisconnectDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "Failed to disconnect account. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle delete child account
  const handleDeleteChildAccount = async () => {
    if (!accountToManage || !user) return;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/delete-child-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childAccountId: accountToManage.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete child account");
      }

      // If currently viewing the deleted account, switch back to main account first
      const wasCurrentlyViewingDeletedAccount = isConnectedAccount && profile?.id === accountToManage.id;
      
      if (wasCurrentlyViewingDeletedAccount) {
        console.log("Switching back to main account after deleting currently active child account");
        await resetToMainAccount();
      }

      // Refresh the connected accounts list
      fetchConnectedAccounts();

      toast({
        title: "Account deleted",
        description: `${accountToManage.name}'s account has been permanently deleted.${
          wasCurrentlyViewingDeletedAccount ? " Switched back to main account." : ""
        }`,
        duration: 3000,
      });

      setShowDeleteDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "Failed to delete child account. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if current profile is a child account
  const isChildAccount = profile?.email?.endsWith("@ganamos.app") || false;

  // Session guard with early return
  if (sessionLoaded && !session) {
    return null; // Will redirect in useEffect
  }

  if (loading || !user || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container px-4 pt-6 mx-auto max-w-md">
      <Card className="mb-6 border dark:border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className="relative w-16 h-16 mr-4 overflow-hidden rounded-full cursor-pointer"
                onClick={() => setShowAvatarSelector(true)}
              >
                <Image
                  src={
                    profile.avatar_url || "/placeholder.svg?height=64&width=64"
                  }
                  alt={profile.name || "User"}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-opacity hover:bg-opacity-30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 transition-opacity hover:opacity-100"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Account Switcher Dropdown - Only show if there are connected accounts */}
                {connectedAccounts.length > 0 ? (
                  <DropdownMenu
                    onOpenChange={(open) => {
                      if (!open) {
                        setIsRemoveMode(false);
                      }
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 text-left focus:outline-none focus:ring-0 focus:ring-offset-0">
                        <h2 className="text-2xl font-bold">
                          {profile.name
                            ? profile.name
                                .split(" ")
                                .map((part, index, array) =>
                                  index === array.length - 1 && array.length > 1
                                    ? part.charAt(0)
                                    : part
                                )
                                .join(" ")
                            : profile.name}
                        </h2>
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
                          className="text-muted-foreground"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                        <span className="sr-only">Switch account</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64 p-2">
                      {/* Primary Account */}
                      <DropdownMenuItem
                        onClick={() =>
                          !isConnectedAccount ? null : resetToMainAccount()
                        }
                        className={`p-4 ${
                          !isConnectedAccount ? "bg-muted" : "cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <div className="w-6 h-6 mr-2 overflow-hidden rounded-full">
                              <Image
                                src={
                                  mainAccountProfile?.avatar_url ||
                                  "/placeholder.svg?height=24&width=24"
                                }
                                alt={
                                  mainAccountProfile?.name ||
                                  "Main Account"
                                }
                                width={24}
                                height={24}
                                className="object-cover"
                              />
                            </div>
                            <span>
                              {mainAccountProfile?.name?.split(' ')[0] || "Main Account"}{" "}
                              (You)
                            </span>
                          </div>
                          {!isConnectedAccount && (
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
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                      </DropdownMenuItem>

                      {/* Connected Accounts */}
                      {connectedAccounts.filter(account => account !== null).map((account) => (
                        <DropdownMenuItem
                          key={account.id}
                          onClick={() =>
                            isConnectedAccount && profile?.id === account.id
                              ? null
                              : switchToAccount(account.id)
                          }
                          className={`p-4 ${
                            isConnectedAccount && profile?.id === account.id
                              ? "bg-muted"
                              : "cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <div className="w-6 h-6 mr-2 overflow-hidden rounded-full">
                                <Image
                                  src={
                                    account.avatar_url ||
                                    "/placeholder.svg?height=24&width=24"
                                  }
                                  alt={account.name || "Account"}
                                  width={24}
                                  height={24}
                                  className="object-cover"
                                />
                              </div>
                              <span>{account.name}</span>
                            </div>
                            <div className="flex items-center">
                              {isConnectedAccount &&
                                profile?.id === account.id && (
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
                                    className="mr-2"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                )}
                              {isRemoveMode && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAccountAction(account);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => setShowAddAccountDialog(true)}
                        className="p-4"
                      >
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
                          className="mr-2"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                        Add Account
                      </DropdownMenuItem>

                      {connectedAccounts.length > 0 && (
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setIsRemoveMode(!isRemoveMode);
                          }}
                          className="p-4 cursor-pointer"
                        >
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
                            className="mr-2 text-muted-foreground"
                          >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="22" y1="11" x2="16" y2="11" />
                          </svg>
                          <span
                            className={`text-muted-foreground ${
                              isRemoveMode ? "font-bold" : ""
                            }`}
                          >
                            Remove Account
                          </span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <h2 className="text-2xl font-bold">
                    {profile.name
                      ? profile.name
                          .split(" ")
                          .map((part, index, array) =>
                            index === array.length - 1 && array.length > 1
                              ? part.charAt(0)
                              : part
                          )
                          .join(" ")
                      : profile.name}
                  </h2>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu
                onOpenChange={(open) => {
                  if (!open) {
                    setIsRemoveMode(false);
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className="h-11 w-11 rounded-md focus:outline-none focus:ring-0 focus:ring-offset-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setTheme(theme === "dark" ? "light" : "dark");
                    }}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        {theme === "light" ? (
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
                            className="mr-2"
                          >
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2" />
                            <path d="M12 20v2" />
                            <path d="m4.93 4.93 1.41 1.41" />
                            <path d="m17.66 17.66 1.41 1.41" />
                            <path d="M2 12h2" />
                            <path d="M20 12h2" />
                            <path d="m6.34 17.66-1.41 1.41" />
                            <path d="m19.07 4.93-1.41 1.41" />
                          </svg>
                        ) : (
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
                            className="mr-2"
                          >
                            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                          </svg>
                        )}
                        <span>Theme</span>
                      </div>
                      <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:bg-gray-700">
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            theme === "dark" ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </div>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onSelect={() => setShowQrDialog(true)}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-center">
                      <QrCode className="mr-2 h-4 w-4" />
                      <span>My QR Code</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={() => {
                      setNewUsername(profile?.username || "")
                      setShowEditUsername(true)
                    }}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-center">
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit Username</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="p-4">
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
                        className="mr-2"
                      >
                        <path d="M8 6L21 6" />
                        <path d="M8 12L21 12" />
                        <path d="M8 18L21 18" />
                        <path d="M3 6L3.01 6" />
                        <path d="M3 12L3.01 12" />
                        <path d="M3 18L3.01 18" />
                      </svg>
                      <span>Sort Feed</span>
                      <span className="ml-auto text-sm text-muted-foreground">
                        {currentSort}
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        onClick={() => handleSortChange("Recent")}
                        className={currentSort === "Recent" ? "bg-muted" : ""}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>Recent</span>
                          {currentSort === "Recent" && (
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
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSortChange("Nearby")}
                        className={currentSort === "Nearby" ? "bg-muted" : ""}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>Nearby</span>
                          {currentSort === "Nearby" && (
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
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSortChange("Reward")}
                        className={currentSort === "Reward" ? "bg-muted" : ""}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>Reward</span>
                          {currentSort === "Reward" && (
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
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleFilterNavigation}>
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
                          className="mr-2"
                        >
                          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                        </svg>
                        More Filters
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {connectedAccounts.length === 0 && (
                    <>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => setShowAddAccountDialog(true)}
                        className="p-4"
                      >
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
                          className="mr-2"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                        Add Account
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleConnectPet} className="p-4">
                    <Cat className="mr-2 h-4 w-4" />
                    Connect Pet
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={signOut} className="p-4">
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
                      className="mr-2"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16,17 21,12 16,7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div
              className="p-3 text-center border rounded-lg min-h-[104px] dark:border-gray-800 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push("/wallet")}
            >
              <div className="flex flex-col items-center">
                <p className="text-sm text-muted-foreground mb-2">Balance</p>
                <div className="flex items-center justify-center" style={{ height: "32px" }}>
                  <div className="w-4 h-4 mr-1.5 relative">
                    <Image
                      src="/images/bitcoin-logo.png"
                      alt="Bitcoin"
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                  </div>
                  <p className="text-xl font-bold">
                    {formatBalanceWithK(profile.balance)}
                  </p>
                </div>
                <p
                  className={`text-xs text-muted-foreground mt-0.5 transition-opacity duration-500 ${
                    isPriceLoading || !bitcoinPrice ? "opacity-0" : "opacity-100"
                  }`}
                  style={{ minHeight: "1.25rem" }} // Reserve space to prevent layout shift
                >
                  {!isPriceLoading && bitcoinPrice && calculateUsdValue(profile.balance) &&
                    `$${calculateUsdValue(profile.balance)} USD`}
                </p>
              </div>
            </div>
            <div className="p-3 text-center border rounded-lg min-h-[104px] dark:border-gray-800">
              <p className="text-sm text-muted-foreground mb-2">Fixes</p>
              <div className="flex items-center justify-center" style={{ height: "32px" }}>
                <p className="text-xl font-bold">
                  {profile.fixed_issues_count || 0}
                </p>
              </div>
              <div style={{ minHeight: "1.25rem" }}></div> {/* Spacer to align with USD value */}
            </div>
            <div 
              className="p-3 text-center border rounded-lg min-h-[104px] dark:border-gray-800 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                if (isDevicesLoading) return; // Don't allow click while loading
                if (connectedDevices.length > 0) {
                  router.push('/pet-settings')
                } else {
                  router.push('/connect-pet')
                }
              }}
            >
              <p className="text-sm text-muted-foreground mb-2">Pet</p>
              {!isDevicesLoading && connectedDevices.length > 0 ? (
                <>
                  <div className="flex items-center justify-center" style={{ height: "32px" }}>
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
                      {getPetIcon(connectedDevices[0].pet_type, 16)}
                    </div>
                  </div>
                  <p
                    className="text-xs text-muted-foreground mt-0.5"
                    style={{ minHeight: "1.25rem" }}
                  >
                    {connectedDevices[0].pet_name}
                  </p>
                </>
              ) : !isDevicesLoading ? (
                <>
                  <div className="flex items-center justify-center" style={{ height: "32px" }}>
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                      <Cat size={16} className="text-white" />
                    </div>
                  </div>
                  <p
                    className="text-xs text-muted-foreground mt-0.5"
                    style={{ minHeight: "1.25rem" }}
                  >
                    Not Connected
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center" style={{ height: "32px" }}></div>
                  <div className="mt-0.5" style={{ minHeight: "1.25rem" }}></div>
                </>
              )}
            </div>
          </div>

          {/* Family Section */}
          <FamilySection onAddAccount={() => setShowAddAccountDialog(true)} />
        </CardContent>
      </Card>

      <Tabs
        defaultValue="activity"
        className="w-full"
        onValueChange={handleTabChange}
      >
        <TabsList className="grid w-full grid-cols-3 mb-4 dark:bg-gray-800/50">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="groups" className="relative">
            Groups
            {hasPendingRequests && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {isLoading || isPostsLoading ? (
            <div className="flex flex-col space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Card
                  key={i}
                  className="overflow-hidden border dark:border-gray-800 w-full"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start">
                      <div className="p-2 bg-muted rounded-full dark:bg-gray-800">
                        <Skeleton className="w-6 h-6 rounded-full" />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <Skeleton className="h-5 w-40 mb-2" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-6 w-28 mt-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : [...postedIssues, ...fixedIssues].length > 0 ? (
            <>
              <div className="space-y-4">
                {[...postedIssues, ...fixedIssues]
                  .sort(
                    (a, b) =>
                      new Date(b.created_at || 0).getTime() -
                      new Date(a.created_at || 0).getTime()
                  )
                  .map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
              </div>

              {hasMorePosts && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMorePosts}
                    disabled={isLoadingMorePosts}
                    className="w-full"
                  >
                    {isLoadingMorePosts ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Loading...
                      </div>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No posts yet</p>
              <Button
                className="mt-4"
                onClick={() => router.push("/dashboard")}
              >
                Start exploring issues
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {isLoading || isActivityLoading ? (
            <div className="flex flex-col space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Card
                  key={i}
                  className="overflow-hidden border dark:border-gray-800 w-full"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start">
                      <div className="p-2 bg-muted rounded-full dark:bg-gray-800">
                        <Skeleton className="w-6 h-6 rounded-full" />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <Skeleton className="h-5 w-40 mb-2" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-6 w-28 mt-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>

              {hasMoreActivities && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMoreActivities}
                    disabled={isLoadingMore}
                    className="w-full"
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Loading...
                      </div>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No activity yet</p>
              <Button
                className="mt-4"
                onClick={() => router.push("/dashboard")}
              >
                Start exploring issues
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <GroupsList userId={activeUserId || user.id} />

          <div className="space-y-2 pt-4">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowCreateGroupDialog(true)}
            >
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
                className="mr-2"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Create new Group
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push("/groups/search")}
            >
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
                className="mr-2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Find Group
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <AvatarSelector
        isOpen={showAvatarSelector}
        onOpenChange={setShowAvatarSelector}
      />
      <AddConnectedAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onAccountAdded={fetchConnectedAccounts}
      />
      <CreateGroupDialog
        open={showCreateGroupDialog}
        onOpenChange={setShowCreateGroupDialog}
        userId={activeUserId || user.id}
        onSuccess={(newGroup) => {
          setShowCreateGroupDialog(false);
          toast({
            title: "Group Created",
            description: "Your new group has been created successfully.",
          });
          // Optionally refresh or navigate to the new group
          router.push(`/groups/${newGroup.id}`);
        }}
      />

      {/* Delete Child Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete Child Account
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {accountToManage?.name}'s account and
              all their data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChildAccount}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Deleting...
                </div>
              ) : (
                "Delete Account"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Account Dialog */}
      <Dialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Account</DialogTitle>
            <DialogDescription>
              This will remove {accountToManage?.name} from your connected
              accounts. They will still have their own account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleDisconnectAccount} disabled={isProcessing}>
              {isProcessing ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Disconnecting...
                </div>
              ) : (
                "Disconnect Account"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User QR Code Modal */}
      <UserQRModal 
        open={showQrDialog} 
        onOpenChange={setShowQrDialog} 
      />

      {/* Edit Username Dialog */}
      <Dialog open={showEditUsername} onOpenChange={setShowEditUsername}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Username</DialogTitle>
            <DialogDescription>
              Choose a unique username that others can use to connect with you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="your-username"
                maxLength={30}
              />
              <p className="text-xs text-gray-500">
                Only lowercase letters, numbers, and hyphens allowed. Must be unique.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowEditUsername(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newUsername.trim() || newUsername.length < 3) {
                  toast({
                    title: "Invalid Username",
                    description: "Username must be at least 3 characters long.",
                    variant: "destructive",
                  })
                  return
                }
                
                try {
                  await updateProfile({ username: newUsername.trim() })
                  toast({
                    title: "Username Updated",
                    description: `Your username is now: ${newUsername}`,
                    variant: "success",
                    duration: 2000,
                  })
                  setShowEditUsername(false)
                } catch (error: any) {
                  toast({
                    title: "Update Failed",
                    description: error.message?.includes('duplicate') ? "Username already taken. Please choose another." : "Failed to update username.",
                    variant: "destructive",
                  })
                }
              }}
              disabled={!newUsername.trim() || newUsername.length < 3}
            >
              Save Username
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
  const router = useRouter();

  const handleClick = () => {
    // Only link if we have a related_id and a known type
    if (
      ["post", "fix", "reward"].includes(activity.type) &&
      activity.related_id
    ) {
      router.push(`/post/${activity.related_id}`);
      return;
    }
    // Optionally, donations could link to a donation details page if you have one
    // For now, do nothing for donations
  };

  // Format the date safely
  const formatDate = () => {
    try {
      if (!activity.timestamp) return "Recently";
      const dateObj =
        typeof activity.timestamp === "string"
          ? new Date(activity.timestamp)
          : activity.timestamp;
      if (isNaN(dateObj.getTime())) return "Recently";
      return formatTimeAgo(dateObj);
    } catch (error) {
      return "Recently";
    }
  };

  // Extract metadata fields
  const description = activity.message || activity.postTitle || "";
  const sats = activity.amount;
  const location = activity.locationName;

  return (
    <Card
      className={`hover:bg-muted/50 border dark:border-gray-800 ${
        ["post", "fix", "reward"].includes(activity.type) && activity.related_id
          ? "cursor-pointer hover:ring-2 hover:ring-blue-400"
          : ""
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start">
          <ActivityIcon type={activity.type} />
          <div className="ml-3 flex-1 min-w-0">
            <ActivityTitle activity={activity} />
            
            {/* Metadata line: status, location, and timestamp */}
            <div className="flex items-center mt-1 text-xs text-muted-foreground min-w-0">
              <div className="flex items-center shrink-0">
                {["post", "fix", "reward"].includes(activity.type) && (
                  <>
                    <ActivityStatus activity={activity} />
                    <span className="mx-2">·</span>
                  </>
                )}
              </div>
              {(activity as any).postLocation && (
                <>
                  <span className="truncate flex-shrink min-w-0">{(activity as any).postLocation}</span>
                  <span className="mx-2 shrink-0">·</span>
                </>
              )}
              <span className="shrink-0 whitespace-nowrap">{formatDate()}</span>
            </div>
            
            {/* Additional info for different activity types */}
            <div className="mt-1">
              {activity.type === "reward" && (
                  <div className="flex items-center mt-1 text-sm text-muted-foreground">
                    {sats && (
                      <Badge
                        variant="outline"
                        className="mr-1.5 flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/30"
                      >
                        <div className="w-3 h-3 relative">
                          <Image
                            src="/images/bitcoin-logo.png"
                            alt="Bitcoin"
                            width={12}
                            height={12}
                            className="object-contain"
                          />
                        </div>
                        {formatSatsValue(sats)}
                      </Badge>
                    )}
                    <span>{description}</span>
                  </div>
                )}
                {activity.type === "donation" && (
                  <div className="flex items-center mt-1 text-sm text-muted-foreground">
                    {sats && (
                      <Badge
                        variant="outline"
                        className="mr-1.5 flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/30"
                      >
                        <div className="w-3 h-3 relative">
                          <Image
                            src="/images/bitcoin-logo.png"
                            alt="Bitcoin"
                            width={12}
                            height={12}
                            className="object-contain"
                          />
                        </div>
                        {formatSatsValue(sats)}
                      </Badge>
                    )}
                    <span className="mr-1.5">to</span>
                    <MapPin className="w-3 h-3 mr-1" />
                    <span>{location}</span>
                  </div>
                )}
                {activity.type === "withdrawal" && (
                  <div className="flex items-center mt-1 text-sm text-muted-foreground">
                    {sats && (
                      <Badge
                        variant="outline"
                        className="mr-1.5 flex items-center gap-1 bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800/30"
                      >
                        <div className="w-3 h-3 relative">
                          <Image
                            src="/images/bitcoin-logo.png"
                            alt="Bitcoin"
                            width={12}
                            height={12}
                            className="object-contain"
                          />
                        </div>
                        {formatSatsValue(sats)}
                      </Badge>
                    )}
                  </div>
                )}
                {activity.type === "deposit" && (
                  <div className="flex items-center mt-1 text-sm text-muted-foreground">
                    {sats && (
                      <Badge
                        variant="outline"
                        className="mr-1.5 flex items-center gap-1 bg-green-50 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-200 dark:border-green-800/30"
                      >
                        <div className="w-3 h-3 relative">
                          <Image
                            src="/images/bitcoin-logo.png"
                            alt="Bitcoin"
                            width={12}
                            height={12}
                            className="object-contain"
                          />
                        </div>
                        {formatSatsValue(sats)}
                      </Badge>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityTitle({ activity }: { activity: ActivityItem }) {
  const postTitle = (activity as any).postTitle;
  
  switch (activity.type) {
    case "post":
      return <p className="font-medium truncate overflow-hidden whitespace-nowrap">{postTitle || "You posted a new issue"}</p>;
    case "fix":
      return <p className="font-medium truncate overflow-hidden whitespace-nowrap">{postTitle ? `You fixed: ${postTitle}` : "You fixed an issue"}</p>;
    case "reward":
      return <p className="font-medium truncate overflow-hidden whitespace-nowrap">{postTitle ? `Reward: ${postTitle}` : "You received a reward"}</p>;
    case "fix_submitted":
      return <p className="font-medium truncate overflow-hidden whitespace-nowrap">You submitted a fix for review</p>;
    case "fix_review_needed":
      return (
        <p className="font-medium truncate overflow-hidden whitespace-nowrap">
          {activity.submitterName || "Someone"} submitted a fix
        </p>
      );
    case "donation": {
      const donorFirstName = activity.donorName
        ? activity.donorName.split(" ")[0]
        : "Someone";
      return <p className="font-medium truncate overflow-hidden whitespace-nowrap">{donorFirstName} donated Bitcoin</p>;
    }
    case "withdrawal":
      return <p className="font-medium truncate overflow-hidden whitespace-nowrap">You withdrew Bitcoin</p>;
    case "deposit":
      return <p className="font-medium truncate overflow-hidden whitespace-nowrap">You deposited Bitcoin</p>;
    default:
      return null;
  }
}

function ActivityStatus({ activity }: { activity: ActivityItem }) {
  if (!["post", "fix", "reward"].includes(activity.type)) return null;
  
  const postFixed = (activity as any).postFixed;
  const postUnderReview = (activity as any).postUnderReview;
  
  if (postUnderReview) {
    return (
      <div className="flex items-center text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5"></span>
        <span>Under Review</span>
      </div>
    );
  }
  
  if (postFixed) {
    return (
      <div className="flex items-center text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
        <span>Fixed</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center text-xs text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
      <span>Open</span>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "post":
      return (
        <div className="p-2 bg-blue-100 rounded-full dark:bg-blue-950/50">
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
            className="text-blue-600 dark:text-blue-400"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </div>
      );
    case "fix":
      return (
        <div className="p-2 bg-emerald-100 rounded-full dark:bg-emerald-950/50">
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
            className="text-emerald-600 dark:text-emerald-400"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      );
    case "reward":
      return (
        <div className="p-2 bg-amber-100 rounded-full dark:bg-amber-950/50">
          <div className="w-4 h-4 relative">
            <Image
              src="/images/bitcoin-logo.png"
              alt="Bitcoin"
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
        </div>
      );
    case "fix_submitted":
      return (
        <div className="p-2 bg-purple-100 rounded-full dark:bg-purple-950/50">
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
            className="text-purple-600 dark:text-purple-400"
          >
            <polyline points="12 2 12 6 15 4" />
            <polyline points="12 22 12 18 9 20" />
            <line x1="12" y1="6" x2="12" y2="18" />
          </svg>
        </div>
      );
    case "fix_review_needed":
      return (
        <div className="p-2 bg-orange-100 rounded-full dark:bg-orange-950/50">
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
            className="text-orange-600 dark:text-orange-400"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </div>
      );
    case "donation":
      return (
        <div className="p-2 bg-orange-100 rounded-full dark:bg-orange-950/50">
          <div className="w-4 h-4 relative">
            <Image
              src="/images/bitcoin-logo.png"
              alt="Bitcoin"
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
        </div>
      );
    case "withdrawal":
      return (
        <div className="p-2 bg-red-100 rounded-full dark:bg-red-950/50">
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
            className="text-red-600 dark:text-red-400"
          >
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        </div>
      );
    case "deposit":
      return (
        <div className="p-2 bg-green-100 rounded-full dark:bg-green-950/50">
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
            className="text-green-600 dark:text-green-400"
          >
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="p-2 bg-gray-100 rounded-full dark:bg-gray-800/50">
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
            className="text-gray-600 dark:text-gray-400"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
      );
  }
}
