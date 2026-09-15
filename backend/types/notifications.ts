export type NotificationPreferenceKey =
  | 'weekly_goals'
  | 'credits'
  | 'leaderboard'
  | 'coach'

export type NotificationPreferences =
  Record<NotificationPreferenceKey, boolean>

export interface ProductNotification {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  read_at: string | null
  created_at: string
}

export interface NotificationListResponse {
  notifications: ProductNotification[]
  unreadCount: number
}
