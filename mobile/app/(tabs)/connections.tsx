import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth/store';
import {
  fetchMyRequestsFn,
  fetchMyMatchesFn,
  respondToRequestFn,
  MentorshipRequest as ApiRequest,
} from '@/lib/queries/mentorshipQueries';
import { MessageCard, MessageCardProps } from '@/components/connections/MessageCard';
import { MenteeCard, MenteeCardProps } from '@/components/connections/MenteeCard';
import { PendingRequestCard, PendingRequestCardProps } from '@/components/connections/PendingRequestCard';
import { MentorCard } from '@/components/connections/MentorCard';
import { RequestDetailSheet } from '@/components/connections/RequestDetailSheet';
import { DeclineConfirmModal } from '@/components/connections/DeclineConfirmModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isWithin24h(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

function mapRequestToCardProps(req: ApiRequest): PendingRequestCardProps {
  return {
    id: req.id,
    name: req.mentee.display_name,
    cover_letter: req.cover_letter,
    slot_date: req.slot_date,
    slot_start_time: req.slot_start_time,
    slot_end_time: req.slot_end_time,
    avatarUrl: req.mentee.picture_url || undefined,
    isNew: isWithin24h(req.created_at),
  };
}

// ---------------------------------------------------------------------------
// Mock data — messaging has no API yet
// ---------------------------------------------------------------------------

// TODO: API connection — GET /api/messages/recent
const MOCK_MESSAGES: MessageCardProps[] = [
  {
    id: 'msg-1',
    name: 'Sarah Chen',
    messagePreview: '"I\'ve finished the draft for the system architecture. Could we schedule a review soon?"',
    timeAgo: '2m ago',
    hasUnread: true,
  },
  {
    id: 'msg-2',
    name: 'Marcus Wright',
    messagePreview: '"The interview went really well! They asked about distributed caches and I nailed it."',
    timeAgo: '1h ago',
  },
  {
    id: 'msg-3',
    name: 'Elena Rodriguez',
    messagePreview: '"Just shared my portfolio link. Looking forward to your feedback!"',
    timeAgo: '4h ago',
  },
];

// TODO: API connection — GET /api/messages/recent (Mentee view — latest single message)
const MOCK_MENTEE_MESSAGE = {
  name: 'Elena Rodriguez',
  preview: '"I finished the wireframes we discussed — take a look when you have a moment!"',
  timeAgo: '15m ago',
  hasUnread: true,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MENTEES_PREVIEW_COUNT = 2;
const MENTORS_PREVIEW_COUNT = 2;

// ---------------------------------------------------------------------------
// Mentor View
// ---------------------------------------------------------------------------

function MentorConnections() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
  const [selectedRequest, setSelectedRequest] = useState<PendingRequestCardProps | null>(null);
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [showAllMentees, setShowAllMentees] = useState(false);

  const { data: requests = [], isLoading: requestsLoading, isError: requestsError } = useQuery({
    queryKey: ['mentorship-requests'],
    queryFn: () => {
      if (!accessToken) throw new Error('Not authenticated');
      return fetchMyRequestsFn(accessToken);
    },
    enabled: !!accessToken,
  });

  const { data: matches = [], isLoading: matchesLoading, isError: matchesError } = useQuery({
    queryKey: ['mentorship-matches'],
    queryFn: () => {
      if (!accessToken) throw new Error('Not authenticated');
      return fetchMyMatchesFn(accessToken);
    },
    enabled: !!accessToken,
  });

  const respondMutation = useMutation({
    mutationFn: (params: { requestId: string; action: 'accept' | 'reject' }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return respondToRequestFn({ ...params, accessToken });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mentorship-matches'] });
    },
    onError: (error: Error) => {
      Alert.alert('Action Failed', error.message || 'Something went wrong. Please try again.');
    },
  });

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const mentees: MenteeCardProps[] = matches.map(m => ({
    id: m.id,
    name: m.mentee.display_name,
    subtitle: m.mentee.title ?? '',
    avatarUrl: m.mentee.picture_url || undefined,
  }));

  const handleMessage = (_name: string) => {
    // TODO: API connection — navigate to messaging thread with mentee
  };

  const handleAccept = (id: string) => {
    respondMutation.mutate({ requestId: id, action: 'accept' });
  };

  const handleDeclineConfirmed = () => {
    if (declineTargetId) {
      respondMutation.mutate({ requestId: declineTargetId, action: 'reject' });
    }
    setDeclineTargetId(null);
    setSelectedRequest(null);
  };

  const displayedMentees = showAllMentees ? mentees : mentees.slice(0, MENTEES_PREVIEW_COUNT);

  return (
    <>
      <DeclineConfirmModal
        visible={declineTargetId !== null}
        onCancel={() => setDeclineTargetId(null)}
        onConfirm={handleDeclineConfirmed}
      />

      <RequestDetailSheet
        request={selectedRequest}
        visible={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
        onAccept={handleAccept}
        onDecline={(id) => setDeclineTargetId(id)}
        disabled={respondMutation.isPending}
      />

      {/* Section: Upcoming Messages */}
      <View className="mb-8">
        <View className="flex-row justify-between items-end mb-3.5">
          <View>
            <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
              Recent Updates
            </Text>
            <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
              Upcoming Messages
            </Text>
          </View>
          {/* TODO: API connection — navigate to full messages list */}
          <TouchableOpacity>
            <Text className="text-[13px] font-bold text-primary">View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {MOCK_MESSAGES.map((msg) => (
            <MessageCard
              key={msg.id}
              {...msg}
              onPress={() => handleMessage(msg.name)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Section: Active Mentees */}
      <View className="mb-8">
        <View className="flex-row justify-between items-end mb-3.5">
          <View>
            <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
              Direct Mentorship
            </Text>
            <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
              Mentees
            </Text>
          </View>
          {mentees.length > MENTEES_PREVIEW_COUNT && (
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => setShowAllMentees((prev) => !prev)}
            >
              <Text className="text-[13px] font-bold text-primary">
                {showAllMentees ? 'Show Less' : `View All (${mentees.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {matchesLoading && <ActivityIndicator className="mt-4" />}
        {matchesError && (
          <Text className="text-[13px] text-error text-center mt-2">Failed to load mentees.</Text>
        )}
        {displayedMentees.map((mentee) => (
          <MenteeCard
            key={mentee.id}
            {...mentee}
            onMessage={() => handleMessage(mentee.name)}
          />
        ))}
        {!matchesLoading && !matchesError && mentees.length === 0 && (
          <Text className="text-[13px] text-on-surface-muted text-center mt-2">No active mentees yet.</Text>
        )}
      </View>

      {/* Section: Pending Requests */}
      <View className="mb-10">
        <View className="mb-3.5">
          <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
            New Inbound
          </Text>
          <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
            Pending Requests
          </Text>
        </View>

        {requestsLoading && <ActivityIndicator className="mt-4" />}
        {requestsError && (
          <Text className="text-[13px] text-error text-center mt-2">Failed to load requests.</Text>
        )}
        {pendingRequests.map((req) => {
          const cardProps = mapRequestToCardProps(req);
          return (
            <PendingRequestCard
              key={req.id}
              {...cardProps}
              onPress={() => setSelectedRequest(cardProps)}
              onAccept={() => handleAccept(req.id)}
              onDecline={() => setDeclineTargetId(req.id)}
              disabled={respondMutation.isPending}
            />
          );
        })}
        {!requestsLoading && !requestsError && pendingRequests.length === 0 && (
          <Text className="text-[13px] text-on-surface-muted text-center mt-2">No pending requests.</Text>
        )}
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mentee View
// ---------------------------------------------------------------------------

function MenteeConnections() {
  const { accessToken } = useAuthStore();
  const [showAllMentors, setShowAllMentors] = useState(false);

  const { data: matches = [], isLoading: matchesLoading, isError: matchesError } = useQuery({
    queryKey: ['mentorship-matches'],
    queryFn: () => {
      if (!accessToken) throw new Error('Not authenticated');
      return fetchMyMatchesFn(accessToken);
    },
    enabled: !!accessToken,
  });

  const mentors = matches.map(m => ({
    id: m.id,
    name: m.mentor.display_name,
    subtitle: m.mentor.title ?? '',
    avatarUrl: m.mentor.picture_url || undefined,
  }));

  const handleMessage = (_name: string) => {
    // TODO: API connection — navigate to messaging thread with mentor
  };

  const handleMore = (_name: string) => {
    // TODO: API connection — show options sheet for mentor relationship
  };

  const displayedMentors = showAllMentors ? mentors : mentors.slice(0, MENTORS_PREVIEW_COUNT);

  return (
    <>
      {/* Section: Upcoming Messages */}
      <View className="mb-7">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-[20px] font-bold text-on-surface">Upcoming Messages</Text>
          {/* TODO: API connection — navigate to full messages list */}
          <TouchableOpacity>
            <Text className="text-[13px] font-semibold text-primary">View All</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-primary/5 border border-primary/10 rounded-[10px] p-4 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-surface-active items-center justify-center">
            <Text className="text-[15px] font-bold text-primary">
              {MOCK_MENTEE_MESSAGE.name.charAt(0)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-bold text-on-surface">
              {MOCK_MENTEE_MESSAGE.name}{' '}
              <Text className="font-normal text-on-surface-muted text-[12px]">
                • {MOCK_MENTEE_MESSAGE.timeAgo}
              </Text>
            </Text>
            <Text className="text-[12px] text-on-surface-soft mt-0.5" numberOfLines={1}>
              {MOCK_MENTEE_MESSAGE.preview}
            </Text>
          </View>
          {MOCK_MENTEE_MESSAGE.hasUnread && (
            <View className="w-2 h-2 rounded-full bg-primary" />
          )}
        </View>
      </View>

      {/* Section: Active Mentors */}
      <View className="mb-10">
        <View className="flex-row justify-between items-end mb-4">
          <View>
            <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
              Your Mentors
            </Text>
            <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
              Mentors
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            {mentors.length > MENTORS_PREVIEW_COUNT && (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => setShowAllMentors((prev) => !prev)}
              >
                <Text className="text-[13px] font-bold text-primary">
                  {showAllMentors ? 'Show Less' : `View All (${mentors.length})`}
                </Text>
              </TouchableOpacity>
            )}
            {/* TODO: API connection — navigate to mentor discovery/search */}
            <TouchableOpacity activeOpacity={0.6}>
              <Text className="text-[13px] font-semibold text-primary">Find New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {matchesLoading && <ActivityIndicator className="mt-4" />}
        {matchesError && (
          <Text className="text-[13px] text-error text-center mt-2">Failed to load mentors.</Text>
        )}
        {displayedMentors.map((mentor) => (
          <MentorCard
            key={mentor.id}
            {...mentor}
            onMessage={() => handleMessage(mentor.name)}
            onMore={() => handleMore(mentor.name)}
          />
        ))}
        {!matchesLoading && !matchesError && mentors.length === 0 && (
          <Text className="text-[13px] text-on-surface-muted text-center mt-2">No active mentors yet.</Text>
        )}
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const isMentor = user?.app_usage_mode !== 'MENTEE';

  return (
    <View className="flex-1 bg-surface">

      {/* Fixed Header — paddingTop is dynamic (safe area inset) */}
      <View
        className="bg-surface z-10 shadow-sm"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-5 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-primary">Connections</Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {isMentor ? <MentorConnections /> : <MenteeConnections />}
      </ScrollView>
    </View>
  );
}