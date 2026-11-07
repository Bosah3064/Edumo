import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, AppNotification } from '../contexts/NotificationContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import {
  Bell,
  Megaphone,
  Award,
  CalendarCheck2,
  MessageSquare,
  ShieldCheck,
  CheckCheck,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Notifications: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Type filter
      if (filterType === 'unread' && item.read) return false;
      if (filterType !== 'all' && filterType !== 'unread' && item.type !== filterType) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesMsg = item.message.toLowerCase().includes(query);
        const matchesSender = (item.senderName || '').toLowerCase().includes(query);
        return matchesTitle || matchesMsg || matchesSender;
      }
      return true;
    });
  }, [notifications, filterType, searchQuery]);

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.read) {
      markAsRead(item.id);
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-purple-600" />;
      case 'academic':
        return <Award className="w-5 h-5 text-blue-600" />;
      case 'attendance':
        return <CalendarCheck2 className="w-5 h-5 text-emerald-600" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-amber-600" />;
      case 'system':
      default:
        return <ShieldCheck className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getTypeBadge = (type: AppNotification['type']) => {
    switch (type) {
      case 'announcement':
        return (
          <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-purple-100 text-purple-800">
            Announcement
          </span>
        );
      case 'academic':
        return (
          <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-blue-100 text-blue-800">
            Academics
          </span>
        );
      case 'attendance':
        return (
          <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-100 text-emerald-800">
            Attendance
          </span>
        );
      case 'message':
        return (
          <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-amber-100 text-amber-800">
            Message
          </span>
        );
      case 'system':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-indigo-100 text-indigo-800">
            System
          </span>
        );
    }
  };

  const formatTimestamp = (date: Date) => {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Inbox &amp; Activity
            </Badge>
            {unreadCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-rose-500 text-white animate-pulse">
                {unreadCount} unread
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> All caught up
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 tracking-tight">
            Notifications &amp; Activity Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Stay updated with real-time academic assessments, daily roll-calls, announcements and parent communications.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                markAllAsRead();
                toast.success('Marked all notifications as read');
              }}
              leftIcon={<CheckCheck className="w-4 h-4 text-emerald-600" />}
              className="text-xs font-bold"
            >
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card className="p-3.5 space-y-3 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Scrollable Horizontal Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#1d5f99] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              onClick={() => setFilterType('unread')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'unread'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-400" />
              )}
            </button>

            <button
              onClick={() => setFilterType('announcement')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'announcement'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Announcements
            </button>

            <button
              onClick={() => setFilterType('academic')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'academic'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Academics
            </button>

            <button
              onClick={() => setFilterType('attendance')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'attendance'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Attendance
            </button>

            <button
              onClick={() => setFilterType('message')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'message'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Messages
            </button>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-64">
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#1d5f99] mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#1d5f99]" />
            </div>
            <h3 className="font-bold text-base text-slate-800">No notifications found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No notifications matched your search term.'
                : filterType === 'unread'
                ? "You have marked all notifications as read! You're completely up to date."
                : 'No alerts in this category.'}
            </p>
            {(searchQuery || filterType !== 'all') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilterType('all');
                  setSearchQuery('');
                }}
                className="mt-4 text-xs font-bold"
              >
                Reset Filters
              </Button>
            )}
          </Card>
        ) : (
          filteredNotifications.map((item) => {
            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                  !item.read
                    ? 'bg-white border-blue-200 shadow-sm hover:border-[#1d5f99] hover:shadow-md'
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                }`}
              >
                {/* Type Icon Container */}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    !item.read
                      ? 'bg-blue-50 border-blue-200 shadow-xs'
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                >
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(item.type)}
                      {item.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-red-100 text-red-700 animate-pulse">
                          Urgent
                        </span>
                      )}
                      {!item.read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-[#1d5f99]" />
                      )}
                      <span className="text-2xs text-slate-400 font-medium">
                        {item.senderName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-2xs text-slate-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(item.timestamp)}</span>
                    </div>
                  </div>

                  <h3
                    className={`text-sm mt-1.5 transition-colors ${
                      !item.read
                        ? 'font-black text-slate-900 group-hover:text-[#1d5f99]'
                        : 'font-semibold text-slate-700'
                    }`}
                  >
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.message}
                  </p>

                  {/* Action Link & Dismiss */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100/80">
                    {item.link ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1d5f99] group-hover:underline">
                        <span>{item.actionLabel || 'View details'}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.read) {
                            // Can toggle read
                          } else {
                            markAsRead(item.id);
                            toast.success('Marked as read');
                          }
                        }}
                        className="text-2xs font-bold text-slate-500 hover:text-slate-800 hover:underline px-2 py-1 rounded cursor-pointer"
                      >
                        {item.read ? 'Read' : 'Mark as read'}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(item.id);
                          toast.success('Notification dismissed');
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Dismiss notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
