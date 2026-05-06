import { Text, View } from "react-native";

import { TimelineEventCard } from "@/components/timeline/TimelineEventCard";
import type { TimelineEvent } from "@/lib/queries/mentorship";

export function getPrivateJourneyEvents(events: TimelineEvent[]): TimelineEvent[] {
  return events.filter(
    (event) => event.category === "AGTE" || event.category === "MCTE",
  );
}

export function TimelineEventList({
  events,
  expandedEventIds,
  currentUsername,
  onEditEvent,
  onToggleEvent,
}: Readonly<{
  events: TimelineEvent[];
  expandedEventIds: Set<string>;
  currentUsername?: string;
  onEditEvent?: (event: TimelineEvent) => void;
  onToggleEvent: (eventId: string) => void;
}>) {
  const journeyEvents = getPrivateJourneyEvents(events);

  if (journeyEvents.length === 0) {
    return (
      <View testID="journey-empty" className="py-8">
        <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
          No journey events yet.
        </Text>
      </View>
    );
  }

  return (
    <>
      {journeyEvents.map((event, index) => (
        <TimelineEventCard
          key={event.id}
          event={event}
          expanded={expandedEventIds.has(event.id)}
          isFirst={index === 0}
          isLast={index === journeyEvents.length - 1}
          onEdit={
            event.is_editable &&
            (!event.author?.username || event.author.username === currentUsername) &&
            onEditEvent
              ? () => onEditEvent(event)
              : undefined
          }
          onToggle={() => onToggleEvent(event.id)}
        />
      ))}
    </>
  );
}
