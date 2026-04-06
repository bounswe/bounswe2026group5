import React from 'react';
import { Modal, View, Text, Image, ScrollView, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PendingRequestCardProps } from './PendingRequestCard';

interface RequestDetailSheetProps {
  request: PendingRequestCardProps | null;
  visible: boolean;
  onClose: () => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  disabled?: boolean;
}

export function RequestDetailSheet({ request, visible, onClose, onAccept, onDecline, disabled }: Readonly<RequestDetailSheetProps>) {
  if (!request) return null;

  const slotDate = request.slot_date;
  const slotStartTime = request.slot_start_time;
  const slotEndTime = request.slot_end_time;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        {/* Backdrop — sibling to sheet so it never intercepts scroll events */}
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onClose} />

        {/* Sheet */}
        <View className="bg-white w-full rounded-t-3xl shadow-2xl max-h-[88%]">
          {/* Drag Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {/* Profile Header */}
            <View className="items-center px-6 pt-6 pb-5">
              {/* Avatar with verified badge */}
              <View className="relative mb-4">
                {request.avatarUrl ? (
                  <Image
                    source={{ uri: request.avatarUrl }}
                    className="w-28 h-28 rounded-full border-4 border-white"
                    style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
                  />
                ) : (
                  <View
                    className="w-28 h-28 rounded-full bg-surface-active items-center justify-center border-4 border-white"
                    style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
                  >
                    <Text className="text-4xl font-bold text-primary">{request.name.charAt(0)}</Text>
                  </View>
                )}
                {/* Verified badge */}
                <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-500 items-center justify-center border-2 border-white">
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                </View>
              </View>

              {/* Name */}
              <Text className="text-2xl font-extrabold text-on-surface text-center mb-1">
                {request.name}
              </Text>

              {/* Subtitle */}
              <Text className="text-[13px] text-on-surface-soft text-center mb-3">
                Seeking mentorship
              </Text>

              {/* "AS MENTEE" badge */}
              <View className="bg-indigo-100 px-3 py-1.5 rounded-lg">
                <Text className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">
                  As Mentee
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-divider mx-6 mb-5" />

            {/* Cover Letter Section */}
            <View className="px-6 mb-5">
              <Text className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest mb-3">
                Cover Letter
              </Text>
              <View className="bg-gray-50 p-5 rounded-xl">
                <Text className="text-[14px] text-on-surface-soft leading-[22px] italic">
                  &ldquo;{request.cover_letter}&rdquo;
                </Text>
              </View>
            </View>

            {/* Quick Stats */}
            <View className="px-6 mb-5">
              <Text className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest mb-3">
                Quick Info
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1 p-4 bg-gray-100 rounded-xl items-center gap-1">
                  <Ionicons name="calendar-outline" size={18} color="#434655" />
                  <Text className="text-[10px] font-bold text-on-surface-soft uppercase tracking-wide mt-0.5">
                    Date
                  </Text>
                  <Text className="text-[13px] font-bold text-on-surface text-center">
                    {slotDate ?? '—'}
                  </Text>
                </View>
                <View className="flex-1 p-4 bg-gray-100 rounded-xl items-center gap-1">
                  <Ionicons name="sparkles-outline" size={18} color="#434655" />
                  <Text className="text-[10px] font-bold text-on-surface-soft uppercase tracking-wide mt-0.5">
                    Status
                  </Text>
                  <Text className="text-[13px] font-bold text-on-surface text-center">
                    {request.isNew ? 'New Request' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Session Time */}
            {slotDate && slotStartTime && slotEndTime && (
              <>
                <View className="h-px bg-divider mx-6 mb-5" />
                <View className="px-6 mb-2">
                  <View className="flex-row items-center gap-2 mb-3">
                    <Ionicons name="time-outline" size={14} color="#737686" />
                    <Text className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest">
                      Requested Session
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between bg-surface-active px-4 py-3.5 rounded-xl">
                    <View className="flex-row items-center gap-2.5">
                      <View className="w-2 h-2 rounded-full bg-primary" />
                      <Text className="text-[13px] font-bold text-on-surface">{slotDate}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg">
                      <Ionicons name="time-outline" size={12} color="#004ac6" />
                      <Text className="text-[12px] font-bold text-primary">
                        {slotStartTime}–{slotEndTime}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View className="border-t border-divider px-6 pt-4 pb-8 flex-row gap-3">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                onDecline(request.id);
                onClose();
              }}
              disabled={disabled}
              className="flex-1 py-3.5 rounded-full border-2 border-red-400 items-center justify-center"
            >
              <Text className="font-bold text-red-500 text-sm">Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                onAccept(request.id);
                onClose();
              }}
              disabled={disabled}
              className={`flex-[2] py-3.5 rounded-full items-center justify-center flex-row gap-2 ${disabled ? 'bg-primary/50' : 'bg-primary'}`}
            >
              <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
              <Text className="font-bold text-white text-sm">Accept Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}